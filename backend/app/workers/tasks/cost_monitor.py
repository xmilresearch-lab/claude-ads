"""Daily budget monitoring task.

Runs via Celery beat (configure in celery_app.py beat_schedule).
Checks total monthly token spend across all active workspaces.
Logs a WARNING and optionally fires a webhook if spend exceeds
MONTHLY_BUDGET_THRESHOLD.
"""
import asyncio
import logging
from datetime import UTC, datetime

from celery import shared_task

log = logging.getLogger(__name__)


async def _check_budget() -> None:
    from sqlalchemy import func, select

    from app.core.config import settings
    from app.core.database import get_db_context
    from app.models.workspace import Workspace

    threshold: float = getattr(settings, "MONTHLY_BUDGET_THRESHOLD", 500.0)
    cost_per_token: float = 0.000003  # Sonnet input rate

    async with get_db_context() as db:
        result = await db.execute(
            select(func.sum(Workspace.monthly_token_usage))
        )
        total_tokens: int = result.scalar_one() or 0

    total_cost = total_tokens * cost_per_token

    log.info(
        "[cost_monitor] total_monthly_tokens=%d estimated_cost_usd=%.4f threshold_usd=%.2f",
        total_tokens,
        total_cost,
        threshold,
    )

    if total_cost >= threshold:
        log.warning(
            "[cost_monitor] BUDGET_EXCEEDED: estimated_cost_usd=%.4f >= threshold_usd=%.2f",
            total_cost,
            threshold,
        )
        await _fire_budget_alert(total_tokens, total_cost, threshold)


async def _fire_budget_alert(tokens: int, cost: float, threshold: float) -> None:
    """Send alert to configured webhook (Slack/PagerDuty) or log only."""
    from app.core.config import settings

    webhook_url: str = getattr(settings, "BUDGET_ALERT_WEBHOOK", "")
    if not webhook_url:
        log.warning(
            "[cost_monitor] BUDGET_ALERT: No BUDGET_ALERT_WEBHOOK configured. "
            "Set it to receive Slack/webhook alerts."
        )
        return

    import httpx

    payload = {
        "text": (
            f":warning: *Monthly AI budget exceeded*\n"
            f"Tokens used: `{tokens:,}`\n"
            f"Estimated cost: `${cost:.2f}`\n"
            f"Threshold: `${threshold:.2f}`\n"
            f"Time: `{datetime.now(UTC).isoformat()}`"
        )
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(webhook_url, json=payload)
        except Exception as exc:
            log.error("[cost_monitor] Failed to fire webhook: %s", exc)


@shared_task(name="app.workers.tasks.cost_monitor.run_cost_monitor", bind=True)
def run_cost_monitor(self) -> dict:  # type: ignore[no-untyped-def]
    """Celery task entry point. Runs the async budget check synchronously."""
    asyncio.run(_check_budget())
    return {"status": "ok", "ran_at": datetime.now(UTC).isoformat()}
