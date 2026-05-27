import asyncio
from datetime import datetime, timezone

from celery.utils.log import get_task_logger
from croniter import croniter
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.automation import Automation
from app.workers.automation_tasks import run_automation_task
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


def _is_due(cron_expr: str, now: datetime) -> bool:
    """Return True if the cron expression was triggered in the last minute.

    croniter treats its start_time as exclusive, so at exact second-0 we offset
    by +1 s to ensure the boundary tick is captured.
    """
    from datetime import timedelta

    try:
        naive_now = now.replace(tzinfo=None) if now.tzinfo else now
        # +1 s makes get_prev() inclusive of the current minute boundary
        itr = croniter(cron_expr, naive_now + timedelta(seconds=1))
        prev = itr.get_prev(datetime)
        delta = (naive_now - prev).total_seconds()
        return 0 <= delta < 60
    except Exception:
        return False


@celery_app.task(
    name="app.workers.scheduler_tasks.dispatch_scheduled_automations",
)
def dispatch_scheduled_automations() -> dict[str, int]:
    """
    Periodic beat task (runs every minute).
    Scans all active automations with a cron schedule and dispatches
    run_automation_task for each one that is currently due.
    """

    async def _fetch_and_dispatch() -> int:
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
                run_automation_task.delay(
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

    count = asyncio.run(_fetch_and_dispatch())
    logger.info("dispatch_scheduled_automations: dispatched %d tasks", count)
    return {"dispatched": count}
