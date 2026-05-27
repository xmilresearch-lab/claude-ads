"""
Consolidated scheduled-automation worker.

Two tasks:
  run_scheduled_automation  — execute one automation run (used by API + beat)
  poll_due_automations      — beat task; scans for cron-due automations each minute
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from celery.utils.log import get_task_logger
from croniter import croniter
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.automation import Automation
from app.services.orchestration import (
    AutomationNotFoundError,
    InactiveAutomationError,
    RateLimitError,
    run_automation,
)
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────


def _is_due(cron_expr: str, now: datetime) -> bool:
    """Return True when the cron fired in the last 60 seconds ending at *now*.

    croniter is exclusive at start_time, so a +1 s offset ensures the
    boundary tick (second=0) is included.
    """
    try:
        naive = now.replace(tzinfo=None) if now.tzinfo else now
        itr = croniter(cron_expr, naive + timedelta(seconds=1))
        prev = itr.get_prev(datetime)
        return 0 <= (naive - prev).total_seconds() < 60
    except Exception:
        return False


# ── tasks ─────────────────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    name="app.workers.scheduled_worker.run_scheduled_automation",
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
def run_scheduled_automation(
    self: Any,
    automation_id: str,
    trigger_payload: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    """Execute one automation run via the orchestration engine."""
    auto_uuid = uuid.UUID(automation_id)
    payload = trigger_payload or {}

    async def _run() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            run = await run_automation(auto_uuid, payload, db, request_id=request_id)
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
        logger.error(
            "automation run failed: automation_id=%s error=%s", automation_id, exc
        )
        raise


@celery_app.task(
    name="app.workers.scheduled_worker.poll_due_automations",
)
def poll_due_automations() -> dict[str, int]:
    """Beat task (every minute): dispatch run_scheduled_automation for due automations."""

    async def _scan() -> int:
        now = datetime.now(tz=timezone.utc)
        dispatched = 0

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Automation).where(
                    Automation.active.is_(True),
                    Automation.schedule.isnot(None),
                )
            )
            automations = result.scalars().all()

        for automation in automations:
            if not automation.schedule:
                continue
            if _is_due(automation.schedule, now):
                run_scheduled_automation.delay(
                    str(automation.id),
                    {"trigger": "schedule", "cron": automation.schedule},
                )
                logger.info(
                    "dispatched scheduled automation: id=%s name=%s cron=%s",
                    automation.id,
                    automation.name,
                    automation.schedule,
                )
                dispatched += 1

        return dispatched

    count = asyncio.run(_scan())
    logger.info("poll_due_automations: dispatched %d tasks", count)
    return {"dispatched": count}
