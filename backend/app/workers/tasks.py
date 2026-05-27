"""Celery task definitions for all automation types."""
import asyncio

from app.workers.celery_app import celery_app


def _run_async(coro):
    """Run an async coroutine from within a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _execute_automation(automation_id: str, run_id: str) -> None:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.automation import Automation, AutomationRun
    from app.services.ai_engine import run_automation

    async with AsyncSessionLocal() as db:
        automation_result = await db.execute(
            select(Automation).where(Automation.id == automation_id)
        )
        automation = automation_result.scalar_one()

        run_result = await db.execute(
            select(AutomationRun).where(AutomationRun.id == run_id)
        )
        run = run_result.scalar_one()

        await run_automation(automation, run, db)
        await db.commit()


@celery_app.task(name="app.workers.tasks.run_automation", bind=True, max_retries=3)
def run_automation(self, automation_id: str, run_id: str):
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)


@celery_app.task(name="app.workers.tasks.scheduled_social_post", bind=True, max_retries=3)
def scheduled_social_post(self, automation_id: str, run_id: str):
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)


@celery_app.task(name="app.workers.tasks.handle_support_ticket", bind=True, max_retries=5)
def handle_support_ticket(self, automation_id: str, run_id: str):
    """High-priority queue — SLA-sensitive support auto-replies."""
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 5)


@celery_app.task(name="app.workers.tasks.run_email_campaign", bind=True, max_retries=3)
def run_email_campaign(self, automation_id: str, run_id: str):
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)


@celery_app.task(name="app.workers.tasks.run_crm_update", bind=True, max_retries=3)
def run_crm_update(self, automation_id: str, run_id: str):
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)


@celery_app.task(name="app.workers.tasks.process_content_repurposing", bind=True, max_retries=3)
def process_content_repurposing(self, automation_id: str, run_id: str):
    try:
        _run_async(_execute_automation(automation_id, run_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)
