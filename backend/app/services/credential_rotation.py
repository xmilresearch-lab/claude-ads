import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decrypt_credential, encrypt_credential
from app.models.audit_log import AuditLog
from app.models.integration import Integration


async def rotate_integration_credential(
    integration_id: str,
    new_token_data: dict[str, Any],
    db: AsyncSession,
) -> None:
    """
    Called after a successful OAuth token refresh.

    Merges new_token_data into the existing credential dict, preserving the
    refresh_token unless the new data provides one. Re-encrypts and commits.
    Never logs token values — only integration_id and type.
    """
    result = await db.execute(
        select(Integration).where(Integration.id == uuid.UUID(integration_id))
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        raise ValueError(f"Integration {integration_id} not found")

    existing: dict[str, Any] = json.loads(
        decrypt_credential(integration.credentials_encrypted)
    )
    # Preserve existing refresh_token if the rotation didn't provide a new one
    if "refresh_token" not in new_token_data and "refresh_token" in existing:
        new_token_data = {**new_token_data, "refresh_token": existing["refresh_token"]}
    merged = {**existing, **new_token_data}

    integration.credentials_encrypted = encrypt_credential(json.dumps(merged))
    integration.updated_at = datetime.now(tz=UTC)

    db.add(
        AuditLog(
            workspace_id=integration.workspace_id,
            action="credential_rotated",
            actor="system",
            log_metadata={
                "integration_id": integration_id,
                "integration_type": integration.type,
            },
        )
    )
    await db.commit()


async def check_expiring_credentials(db: AsyncSession) -> list[str]:
    """
    Returns list of integration_ids whose OAuth tokens expire within 24 hours.

    Decrypts each active integration's credentials and checks the expires_at field.
    Skips integrations whose credentials cannot be decrypted or have no expires_at.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.status == "active",
            Integration.credentials_encrypted.isnot(None),
        )
    )
    integrations = result.scalars().all()

    threshold = datetime.now(tz=UTC) + timedelta(hours=24)
    expiring: list[str] = []

    for integration in integrations:
        try:
            creds: dict[str, Any] = json.loads(
                decrypt_credential(integration.credentials_encrypted)
            )
            expires_at = creds.get("expires_at")
            if expires_at is None:
                continue
            if isinstance(expires_at, (int, float)):
                exp_dt = datetime.fromtimestamp(float(expires_at), tz=UTC)
            else:
                exp_dt = datetime.fromisoformat(str(expires_at))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=UTC)
            if exp_dt <= threshold:
                expiring.append(str(integration.id))
        except Exception:
            continue

    return expiring


async def mark_integration_error(
    integration_id: str,
    error: str,
    db: AsyncSession,
) -> None:
    """Sets integration.status = 'error' and writes an audit log entry."""
    result = await db.execute(
        select(Integration).where(Integration.id == uuid.UUID(integration_id))
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        return
    integration.status = "error"
    db.add(
        AuditLog(
            workspace_id=integration.workspace_id,
            action="integration_error",
            actor="system",
            log_metadata={
                "integration_id": integration_id,
                "integration_type": integration.type,
                "error": error,
            },
        )
    )
    await db.commit()


async def refresh_tiktok_token(refresh_token: str) -> dict[str, Any]:
    """
    Exchange a TikTok refresh token for a new access token + refresh token.
    New access_token valid 24h; new refresh_token valid 365 days.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data={
                "client_key": settings.TIKTOK_CLIENT_KEY,
                "client_secret": settings.TIKTOK_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            return r.json()  # type: ignore[no-any-return]
        except Exception:
            return {}


async def refresh_threads_token(access_token: str) -> dict[str, Any]:
    """
    Refresh a Threads long-lived token. Only valid when token is >= 24h old.
    New token valid ~60 days.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            "https://graph.threads.net/refresh_access_token",
            params={
                "grant_type": "th_refresh_token",
                "access_token": access_token,
            },
        )
        try:
            return r.json()  # type: ignore[no-any-return]
        except Exception:
            return {}
