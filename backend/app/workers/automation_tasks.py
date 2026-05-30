import asyncio
import uuid
from typing import Any

from celery.utils.log import get_task_logger

from app.core.database import AsyncSessionLocal
from app.services.orchestration import (
    AutomationNotFoundError,
    InactiveAutomationError,
    RateLimitError,
    run_automation,
)
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.automation_tasks.run_automation_task",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    dont_autoretry_for=(
        AutomationNotFoundError,
        InactiveAutomationError,
        RateLimitError,
    ),
)
def run_automation_task(
    self: Any,
    automation_id: str,
    trigger_payload: dict[str, Any],
) -> dict[str, Any]:
    """Celery task that executes one automation run via the orchestration engine."""
    auto_uuid = uuid.UUID(automation_id)

    async def _run() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            run = await run_automation(auto_uuid, trigger_payload, db)
            return {
                "run_id": str(run.id),
                "status": run.status,
                "error": run.error,
                "ai_tokens_used": run.ai_tokens_used,
            }

    try:
        result = asyncio.run(_run())
        logger.info(
            "automation run completed: automation_id=%s run_id=%s status=%s",
            automation_id,
            result["run_id"],
            result["status"],
        )
        return result
    except (AutomationNotFoundError, InactiveAutomationError, RateLimitError) as exc:
        logger.warning("automation run skipped: %s", exc)
        raise
    except Exception as exc:
        logger.error("automation run failed: automation_id=%s error=%s", automation_id, exc)
        raise
