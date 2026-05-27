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
    """Constant-time comparison of Base64-encoded HMAC-SHA256."""
    import base64

    expected = base64.b64encode(
        hmac.new(secret.encode(), body, hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)


@router.post("/zendesk")
async def zendesk_webhook(
    request: Request,
    workspace_id: uuid.UUID = Query(...),
    x_zendesk_webhook_signature: str = Header(default=""),
) -> dict[str, str]:
    """
    Receive Zendesk ticket events.
    Verified via HMAC-SHA256 of the raw body signed with WEBHOOK_SECRET.
    Returns 200 immediately; processing is async via Celery.
    """
    body = await request.body()

    if settings.WEBHOOK_SECRET and not _verify_hmac_sha256(
        settings.WEBHOOK_SECRET, body, x_zendesk_webhook_signature
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )

    payload: dict[str, Any] = await request.json()
    handle_support_ticket.delay(
        payload=payload,
        workspace_id=str(workspace_id),
    )
    return {"status": "accepted"}


@router.post("/hubspot")
async def hubspot_webhook(
    request: Request,
    workspace_id: uuid.UUID = Query(...),
    x_hubspot_signature_v3: str = Header(default=""),
    x_hubspot_request_timestamp: str = Header(default=""),
) -> dict[str, str]:
    """
    Receive HubSpot CRM events.
    Verified via HMAC-SHA256 of (method+uri+body+timestamp) signed with WEBHOOK_SECRET.
    Returns 200 immediately; processing is async via Celery.
    """
    body = await request.body()

    if settings.WEBHOOK_SECRET:
        signing_input = (
            request.method
            + str(request.url)
            + body.decode()
            + x_hubspot_request_timestamp
        )
        if not _verify_hmac_sha256(
            settings.WEBHOOK_SECRET,
            signing_input.encode(),
            x_hubspot_signature_v3,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid webhook signature",
            )

    events: list[dict[str, Any]] = await request.json()
    if not isinstance(events, list):
        events = [events]

    for event in events:
        subscription_type: str = event.get("subscriptionType", "")
        event_type = _HUBSPOT_EVENT_MAP.get(subscription_type)
        if event_type is None:
            continue
        handle_crm_event.delay(
            payload=event,
            workspace_id=str(workspace_id),
            event_type=event_type,
        )

    return {"status": "accepted"}


@router.post(
    "/content/approve/{content_queue_id}",
    response_model=ContentQueueItem,
)
async def approve_and_publish(
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

    publish_content.delay(content_queue_id=str(content_queue_id))
    return item
