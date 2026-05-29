import asyncio
import json
import uuid
from datetime import UTC, datetime

from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import decrypt_credential
from app.models.integration import Integration
from app.services.credential_rotation import (
    check_expiring_credentials,
    mark_integration_error,
    refresh_threads_token,
    refresh_tiktok_token,
    rotate_integration_credential,
)
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    name="app.workers.credential_worker.check_and_refresh_credentials",
    queue="low_priority",
)
def check_and_refresh_credentials() -> dict:
    """
    Finds expiring integrations, flags them as expiring_soon, and auto-refreshes
    TikTok tokens (expire in 24h) and Threads tokens (expire in 60 days).
    """

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            expiring_ids = await check_expiring_credentials(db)
            if not expiring_ids:
                logger.info("check_and_refresh_credentials: no expiring credentials found")
                return {"flagged": 0, "refreshed": 0}

            refreshed = 0
            for integration_id in expiring_ids:
                result = await db.execute(
                    select(Integration).where(
                        Integration.id == uuid.UUID(integration_id)
                    )
                )
                integration = result.scalar_one_or_none()
                if integration is None or integration.status != "active":
                    continue

                integration.status = "expiring_soon"
                logger.warning(
                    "credential expiring soon: integration_id=%s type=%s",
                    integration_id,
                    integration.type,
                )

                # Auto-refresh TikTok tokens (short-lived, 24h)
                if integration.type == "tiktok":
                    try:
                        creds = json.loads(decrypt_credential(integration.credentials_encrypted))
                        refresh_tok = creds.get("refresh_token", "")
                        if refresh_tok:
                            new_data = await refresh_tiktok_token(refresh_tok)
                            if "access_token" in new_data:
                                now = datetime.now(tz=UTC).timestamp()
                                new_data["expires_at"] = now + float(
                                    new_data.get("expires_in", 86400)
                                )
                                new_data["refresh_expires_at"] = now + float(
                                    new_data.get("refresh_expires_in", 31536000)
                                )
                                await rotate_integration_credential(
                                    integration_id, new_data, db
                                )
                                integration.status = "active"
                                refreshed += 1
                                logger.info(
                                    "tiktok token auto-refreshed: integration_id=%s",
                                    integration_id,
                                )
                    except Exception as exc:
                        logger.error(
                            "tiktok token refresh failed: integration_id=%s err=%s",
                            integration_id,
                            exc,
                        )
                        await mark_integration_error(integration_id, str(exc), db)

                # Auto-refresh Threads tokens (long-lived, 60 days)
                elif integration.type == "threads":
                    try:
                        creds = json.loads(decrypt_credential(integration.credentials_encrypted))
                        tok = creds.get("access_token", "")
                        if tok:
                            new_data = await refresh_threads_token(tok)
                            if "access_token" in new_data:
                                now = datetime.now(tz=UTC).timestamp()
                                new_data["expires_at"] = now + float(
                                    new_data.get("expires_in", 5183944)
                                )
                                await rotate_integration_credential(
                                    integration_id, new_data, db
                                )
                                integration.status = "active"
                                refreshed += 1
                                logger.info(
                                    "threads token auto-refreshed: integration_id=%s",
                                    integration_id,
                                )
                    except Exception as exc:
                        logger.error(
                            "threads token refresh failed: integration_id=%s err=%s",
                            integration_id,
                            exc,
                        )
                        await mark_integration_error(integration_id, str(exc), db)

            await db.commit()
            return {"flagged": len(expiring_ids), "refreshed": refreshed}

    result = asyncio.run(_run())
    logger.info(
        "check_and_refresh_credentials: flagged=%d refreshed=%d",
        result["flagged"],
        result["refreshed"],
    )
    return result
