import asyncio
import uuid
from typing import Any

from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.automation import Automation
from app.services.orchestration import RateLimitError, run_automation
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)

_EVENT_TYPE_PAYLOADS: dict[str, str] = {
    "new_contact": "contact",
    "deal_stage_changed": "deal",
    "form_submitted": "data",
}


async def _run_automation_for_workspace(
    workspace_id: uuid.UUID,
    automation_type: str,
    trigger_payload: dict[str, Any],
) -> dict[str, Any]:
    """Find the active automation of the given type and run it."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Automation)
            .where(
                Automation.workspace_id == workspace_id,
                Automation.type == automation_type,
                Automation.active.is_(True),
            )
            .limit(1)
        )
        automation = result.scalar_one_or_none()
        if automation is None:
            return {"skipped": True, "reason": "no_active_automation"}
        run = await run_automation(automation.id, trigger_payload, db)
        return {"run_id": str(run.id), "status": run.status}


@celery_app.task(
    bind=True,
    name="app.workers.webhook_worker.handle_support_ticket",
    max_retries=3,
    default_retry_delay=30,
    queue="high_priority",
)
def handle_support_ticket(
    self: Any,
    payload: dict[str, Any],
    workspace_id: str,
) -> dict[str, Any]:
    """Process an inbound support-ticket webhook (SLA-sensitive, high_priority queue)."""
    wid = uuid.UUID(workspace_id)
    trigger_payload: dict[str, Any] = {
        "ticket_id": payload.get("id"),
        "subject": payload.get("subject"),
        "body": payload.get("description"),
        "customer_email": payload.get("requester", {}).get("email"),
        "priority": payload.get("priority", "normal"),
    }
    try:
        result = asyncio.run(
            _run_automation_for_workspace(wid, "support_reply", trigger_payload)
        )
        if result.get("skipped"):
            logger.info(
                "no active support_reply automation for workspace %s — skipping",
                workspace_id,
            )
            return result
        logger.info(
            "support ticket processed: ticket_id=%s run_id=%s",
            trigger_payload.get("ticket_id"),
            result["run_id"],
        )
        return result
    except RateLimitError as exc:
        logger.warning(
            "rate limit reached for workspace %s, dropping ticket: %s",
            workspace_id,
            exc,
        )
        return {"skipped": True, "reason": "rate_limit"}
    except Exception as exc:
        logger.error(
            "support ticket task failed for workspace %s: %s", workspace_id, exc
        )
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.workers.webhook_worker.handle_crm_event",
    max_retries=3,
    default_retry_delay=60,
    queue="medium_priority",
)
def handle_crm_event(
    self: Any,
    payload: dict[str, Any],
    workspace_id: str,
    event_type: str,
) -> dict[str, Any]:
    """Process an inbound CRM event webhook (medium_priority queue)."""
    wid = uuid.UUID(workspace_id)

    match event_type:
        case "new_contact":
            trigger_payload: dict[str, Any] = {
                "action": "log_activity",
                "contact": payload.get("contact"),
            }
        case "deal_stage_changed":
            trigger_payload = {
                "action": "move_deal_stage",
                "deal": payload.get("deal"),
            }
        case "form_submitted":
            trigger_payload = {
                "action": "create_contact",
                "form_data": payload.get("data"),
            }
        case _:
            logger.warning(
                "unknown crm event_type %r for workspace %s — skipping",
                event_type,
                workspace_id,
            )
            return {"skipped": True, "reason": "unknown_event_type"}

    try:
        result = asyncio.run(
            _run_automation_for_workspace(wid, "crm_update", trigger_payload)
        )
        if result.get("skipped"):
            logger.info(
                "no active crm_update automation for workspace %s — skipping",
                workspace_id,
            )
        return result
    except Exception as exc:
        logger.error(
            "crm event task failed for workspace %s event %s: %s",
            workspace_id,
            event_type,
            exc,
        )
        raise self.retry(exc=exc)
