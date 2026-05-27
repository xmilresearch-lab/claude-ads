import asyncio
import uuid

from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.integration import Integration
from app.services.credential_rotation import check_expiring_credentials
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    name="app.workers.credential_worker.check_and_refresh_credentials",
    queue="low_priority",
)
def check_and_refresh_credentials() -> dict:
    """
    Finds expiring integrations and sets status='expiring_soon'.
    Actual refresh requires an OAuth flow initiated by the workspace owner.
    """

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            expiring_ids = await check_expiring_credentials(db)
            if not expiring_ids:
                logger.info("check_and_refresh_credentials: no expiring credentials found")
                return {"flagged": 0}

            for integration_id in expiring_ids:
                result = await db.execute(
                    select(Integration).where(
                        Integration.id == uuid.UUID(integration_id)
                    )
                )
                integration = result.scalar_one_or_none()
                if integration and integration.status == "active":
                    integration.status = "expiring_soon"
                    logger.warning(
                        "credential expiring soon: integration_id=%s type=%s",
                        integration_id,
                        integration.type,
                    )

            await db.commit()
            return {"flagged": len(expiring_ids)}

    result = asyncio.run(_run())
    logger.info(
        "check_and_refresh_credentials: flagged %d integrations", result["flagged"]
    )
    return result
