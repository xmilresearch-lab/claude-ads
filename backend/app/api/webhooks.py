import hashlib
import hmac
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.config import settings
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_WEBHOOKS, limiter
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace
from app.schemas.content_queue import ContentQueueItem
from app.workers.publish_worker import publish_content
from app.workers.webhook_worker import handle_crm_event, handle_support_ticket

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# HubSpot subscriptionType → internal event_type
_HUBSPOT_EVENT_MAP: dict[str, str] = {
    "contact.creation": "new_contact",
    "deal.propertyChange": "deal_stage_changed",
    "contact.propertyChange": "form_submitted",
}


def _verify_hmac_sha256(secret: str, body: bytes, signature: str) -> bool:
    """Legacy helper: constant-time comparison of Base64-encoded HMAC-SHA256."""
    import base64

    expected = base64.b64encode(
        hmac.new(secret.encode(), body, hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)


def verify_zendesk_signature(
    payload_body: bytes,
    signature_header: str,
    webhook_secret: str,
) -> bool:
    """
    Zendesk HMAC-SHA256 verification.
    Computes hmac(secret, body, sha256).hexdigest() and compares using
    constant-time comparison. Returns False on any mismatch or error.
    """
    try:
        expected = hmac.new(
            webhook_secret.encode(), payload_body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header)
    except Exception:
        return False


def verify_hubspot_signature(
    payload_body: bytes,
    signature_header: str,
    client_secret: str,
    request_uri: str,
    http_method: str,
) -> bool:
    """
    HubSpot v3 signature: HMAC-SHA256 of (http_method + uri + body),
    keyed with client_secret. Constant-time comparison.
    Returns False on any mismatch or error.
    """
    try:
        message = (http_method + request_uri + payload_body.decode()).encode()
        expected = hmac.new(
            client_secret.encode(), message, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header)
    except Exception:
        return False


async def _log_signature_failure(
    action: str,
    actor: str,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Write a webhook_signature_failed audit log entry. Swallows DB errors."""
    try:
        db.add(
            AuditLog(
                workspace_id=workspace_id,
                action="webhook_signature_failed",
                actor=actor,
                log_metadata={"workspace_id": str(workspace_id)},
            )
        )
        await db.commit()
    except Exception:
        pass


@router.post("/zendesk")
@limiter.limit(LIMIT_WEBHOOKS)
async def zendesk_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    workspace_id: uuid.UUID = Query(...),
    x_zendesk_webhook_signature: str = Header(default=""),
) -> dict[str, str]:
    """
    Receive Zendesk ticket events.
    Verified via HMAC-SHA256 (hexdigest) of the raw body signed with WEBHOOK_SECRET.
    Returns 200 immediately; processing is async via Celery.
    """
    body = await request.body()

    if settings.WEBHOOK_SECRET and not verify_zendesk_signature(
        body, x_zendesk_webhook_signature, settings.WEBHOOK_SECRET
    ):
        await _log_signature_failure("webhook_signature_failed", "zendesk", workspace_id, db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    payload: dict[str, Any] = await request.json()
    handle_support_ticket.delay(
        payload=payload,
        workspace_id=str(workspace_id),
        request_id=getattr(request.state, "request_id", None),
    )
    return {"status": "accepted"}


@router.post("/hubspot")
@limiter.limit(LIMIT_WEBHOOKS)
async def hubspot_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    workspace_id: uuid.UUID = Query(...),
    x_hubspot_signature_v3: str = Header(default=""),
    x_hubspot_request_timestamp: str = Header(default=""),
) -> dict[str, str]:
    """
    Receive HubSpot CRM events.
    Verified via HMAC-SHA256 of (method + uri + body) keyed with HUBSPOT_CLIENT_SECRET.
    Returns 200 immediately; processing is async via Celery.
    """
    body = await request.body()

    if settings.HUBSPOT_CLIENT_SECRET and not verify_hubspot_signature(
        body,
        x_hubspot_signature_v3,
        settings.HUBSPOT_CLIENT_SECRET,
        str(request.url),
        request.method,
    ):
        await _log_signature_failure("webhook_signature_failed", "hubspot", workspace_id, db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    events: list[dict[str, Any]] = await request.json()
    if not isinstance(events, list):
        events = [events]

    req_id = getattr(request.state, "request_id", None)
    for event in events:
        subscription_type: str = event.get("subscriptionType", "")
        event_type = _HUBSPOT_EVENT_MAP.get(subscription_type)
        if event_type is None:
            continue
        handle_crm_event.delay(
            payload=event,
            workspace_id=str(workspace_id),
            event_type=event_type,
            request_id=req_id,
        )

    return {"status": "accepted"}


@router.post(
    "/content/approve/{content_queue_id}",
    response_model=ContentQueueItem,
)
@limiter.limit(LIMIT_WEBHOOKS)
async def approve_and_publish(
    request: Request,
    content_queue_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContentQueue:
    """
    Internal webhook: approve a ContentQueue item and enqueue it for publishing.
    Requires standard Bearer auth.
    """
    result = await db.execute(
        select(ContentQueue)
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(
            ContentQueue.id == content_queue_id,
            Automation.workspace_id == workspace.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    item.status = "approved"
    await db.commit()
    await db.refresh(item)

    publish_content.delay(
        content_queue_id=str(content_queue_id),
        request_id=getattr(request.state, "request_id", None),
    )
    return item
