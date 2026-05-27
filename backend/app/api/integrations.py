import json
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Annotated

import httpx
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.security import decrypt_credential, encrypt_credential
from app.middleware.rate_limiter import LIMIT_READ, LIMIT_WRITE, limiter
from app.models.audit_log import AuditLog
from app.models.integration import Integration
from app.models.workspace import Workspace
from app.schemas.base import DataResponse, PaginatedResponse, ok, paginated
from app.schemas.integration import (
    APIKeyConnectRequest,
    IntegrationConnectRequest,
    IntegrationResponse,
    IntegrationStatusResponse,
    OAuthCallbackRequest,
)

router = APIRouter()

# ── OAuth provider configuration ──────────────────────────────────────────────

_OAUTH_CONFIG: dict[str, dict[str, str]] = {
    "twitter": {
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "scopes": "tweet.read tweet.write users.read",
        "client_id_key": "TWITTER_CLIENT_ID",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "client_secret_key": "TWITTER_CLIENT_SECRET",
    },
    "linkedin": {
        "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
        "scopes": "r_liteprofile r_emailaddress w_member_social",
        "client_id_key": "LINKEDIN_CLIENT_ID",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "client_secret_key": "LINKEDIN_CLIENT_SECRET",
    },
    "gmail": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scopes": "https://www.googleapis.com/auth/gmail.send https://mail.google.com/",
        "client_id_key": "GOOGLE_CLIENT_ID",
        "token_url": "https://oauth2.googleapis.com/token",
        "client_secret_key": "GOOGLE_CLIENT_SECRET",
    },
    "hubspot": {
        "auth_url": "https://app.hubspot.com/oauth/authorize",
        "scopes": "contacts content",
        "client_id_key": "HUBSPOT_CLIENT_ID",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "client_secret_key": "HUBSPOT_CLIENT_SECRET",
    },
}

_HEALTH_CHECK_URLS: dict[str, str] = {
    "twitter": "https://api.twitter.com/2/users/me",
    "gmail": "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    "hubspot": "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
    "zendesk": "https://{subdomain}.zendesk.com/api/v2/users/me.json",
    "linkedin": "https://api.linkedin.com/v2/me",
    "sendgrid": "https://api.sendgrid.com/v3/user/account",
    "salesforce": "https://{instance_url}/services/data/v57.0/",
}

# ── Internal helpers ───────────────────────────────────────────────────────────


async def _get_owned_integration(
    integration_id: uuid.UUID,
    workspace: Workspace,
    db: AsyncSession,
) -> Integration:
    res = await db.execute(select(Integration).where(Integration.id == integration_id))
    integration = res.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    if integration.workspace_id != workspace.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
    return integration


def _build_health_check_request(
    integration_type: str,
    creds: dict,
    meta: dict | None,
) -> tuple[str, dict[str, str]]:
    url_template = _HEALTH_CHECK_URLS.get(integration_type, "")
    if not url_template:
        return ("", {})
    meta = meta or {}
    url = url_template.format(
        subdomain=meta.get("subdomain", ""),
        instance_url=meta.get("instance_url", ""),
    )
    access_token = creds.get("access_token") or creds.get("api_key", "")
    return url, {"Authorization": f"Bearer {access_token}"}


async def _call_provider_api(url: str, headers: dict[str, str]) -> tuple[int, dict]:
    if not url:
        return (503, {})
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(url, headers=headers)
        try:
            body: dict = r.json()
        except Exception:
            body = {}
        return r.status_code, body


async def _exchange_oauth_code(provider: str, code: str, redirect_uri: str) -> dict:
    cfg = _OAUTH_CONFIG.get(provider, {})
    token_url = cfg.get("token_url", "")
    if not token_url:
        return {}
    client_id = getattr(settings, cfg.get("client_id_key", ""), "")
    client_secret = getattr(settings, cfg.get("client_secret_key", ""), "")
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        try:
            return r.json()  # type: ignore[no-any-return]
        except Exception:
            return {}


async def _fetch_oauth_userinfo(provider: str, access_token: str) -> dict:
    _USERINFO_URLS: dict[str, str] = {
        "twitter": "https://api.twitter.com/2/users/me",
        "linkedin": "https://api.linkedin.com/v2/me",
        "gmail": "https://www.googleapis.com/oauth2/v2/userinfo",
        "hubspot": f"https://api.hubapi.com/oauth/v1/access-tokens/{access_token}",
    }
    url = _USERINFO_URLS.get(provider, "")
    if not url:
        return {}
    _, body = await _call_provider_api(url, {"Authorization": f"Bearer {access_token}"})
    normalized: dict[str, str] = {}
    if provider == "twitter":
        normalized["account_id"] = str(body.get("data", {}).get("id", ""))
        normalized["account_name"] = body.get("data", {}).get("name", "")
    elif provider == "linkedin":
        normalized["account_id"] = body.get("id", "")
        first = body.get("localizedFirstName", "")
        last = body.get("localizedLastName", "")
        normalized["account_name"] = f"{first} {last}".strip()
    elif provider == "gmail":
        normalized["account_id"] = body.get("id", "")
        normalized["email"] = body.get("email", "")
        normalized["account_name"] = body.get("name", "")
    elif provider == "hubspot":
        normalized["account_id"] = str(body.get("hub_id", ""))
        normalized["account_name"] = body.get("hub_domain", "")
    return normalized


async def _validate_apikey(
    provider_type: str,
    api_key: str,
    extra_config: dict | None,
) -> dict:
    extra = extra_config or {}
    if provider_type == "sendgrid":
        url = "https://api.sendgrid.com/v3/user/account"
        status_code, body = await _call_provider_api(url, {"Authorization": f"Bearer {api_key}"})
    elif provider_type == "zendesk":
        subdomain = extra.get("subdomain", "")
        if not subdomain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zendesk requires 'subdomain' in extra_config",
            )
        url = f"https://{subdomain}.zendesk.com/api/v2/users/me.json"
        status_code, body = await _call_provider_api(url, {"Authorization": f"Bearer {api_key}"})
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider {provider_type!r} does not support API key authentication",
        )
    if status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key — provider returned 401 Unauthorized",
        )
    if status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"API key validation failed — provider returned {status_code}",
        )
    return body


async def _upsert_integration(
    workspace: Workspace,
    integration_type: str,
    credentials_encrypted: str,
    safe_meta: dict,
    db: AsyncSession,
) -> Integration:
    res = await db.execute(
        select(Integration).where(
            Integration.workspace_id == workspace.id,
            Integration.type == integration_type,
        )
    )
    integration = res.scalar_one_or_none()
    if integration is None:
        integration = Integration(
            workspace_id=workspace.id,
            type=integration_type,
            credentials_encrypted=credentials_encrypted,
            status="active",
            meta=safe_meta,
        )
        db.add(integration)
    else:
        integration.credentials_encrypted = credentials_encrypted
        integration.status = "active"
        integration.meta = safe_meta
    return integration


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse[IntegrationResponse])
@limiter.limit(LIMIT_READ)
async def list_integrations(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, le=200, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PaginatedResponse[IntegrationResponse]:
    count_res = await db.execute(
        select(func.count(Integration.id)).where(Integration.workspace_id == workspace.id)
    )
    total: int = count_res.scalar_one()
    rows = list(
        (
            await db.execute(
                select(Integration)
                .where(Integration.workspace_id == workspace.id)
                .order_by(Integration.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
        ).scalars().all()
    )
    return paginated(
        data=[IntegrationResponse.model_validate(r) for r in rows],
        total_count=total,
        limit=limit,
        offset=offset,
        request=request,
    )


@router.get("/{integration_id}", response_model=DataResponse[IntegrationResponse])
@limiter.limit(LIMIT_READ)
async def get_integration(
    request: Request,
    integration_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[IntegrationResponse]:
    integration = await _get_owned_integration(integration_id, workspace, db)
    return ok(IntegrationResponse.model_validate(integration), request)


@router.get("/{integration_id}/status", response_model=DataResponse[IntegrationStatusResponse])
@limiter.limit(LIMIT_READ)
async def get_integration_status(
    request: Request,
    integration_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[IntegrationStatusResponse]:
    integration = await _get_owned_integration(integration_id, workspace, db)
    try:
        creds: dict = json.loads(decrypt_credential(integration.credentials_encrypted))
    except Exception:
        return ok(
            IntegrationStatusResponse(
                status="error",
                latency_ms=0.0,
                last_checked=datetime.now(timezone.utc).isoformat(),
            ),
            request,
        )
    url, headers = _build_health_check_request(integration.type, creds, integration.meta)
    start = time.monotonic()
    status_code, _ = await _call_provider_api(url, headers)
    latency_ms = round((time.monotonic() - start) * 1000, 2)
    health_status = "healthy" if status_code < 400 else "unhealthy"
    return ok(
        IntegrationStatusResponse(
            status=health_status,
            latency_ms=latency_ms,
            last_checked=datetime.now(timezone.utc).isoformat(),
        ),
        request,
    )


@router.post("/oauth/initiate", response_model=DataResponse[dict])
@limiter.limit(LIMIT_WRITE)
async def oauth_initiate(
    request: Request,
    payload: IntegrationConnectRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> DataResponse[dict]:
    provider = payload.type
    if provider not in _OAUTH_CONFIG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider {provider!r} does not use OAuth. Use the /apikey endpoint.",
        )
    state = secrets.token_urlsafe(32)
    await redis.setex(
        f"oauth_state:{state}",
        600,
        json.dumps({"workspace_id": str(workspace.id), "provider": provider}),
    )
    cfg = _OAUTH_CONFIG[provider]
    client_id = getattr(settings, cfg["client_id_key"])
    params = "&".join([
        f"client_id={client_id}",
        f"redirect_uri={settings.OAUTH_REDIRECT_URI}",
        "response_type=code",
        f"scope={cfg['scopes'].replace(' ', '%20')}",
        f"state={state}",
    ])
    auth_url = f"{cfg['auth_url']}?{params}"
    return ok({"authorization_url": auth_url, "state": state}, request)


@router.post("/oauth/callback", response_model=DataResponse[IntegrationResponse])
@limiter.limit(LIMIT_WRITE)
async def oauth_callback(
    request: Request,
    payload: OAuthCallbackRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> DataResponse[IntegrationResponse]:
    # 1. Verify state (one-time use)
    state_key = f"oauth_state:{payload.state}"
    stored = await redis.get(state_key)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )
    await redis.delete(state_key)

    # 2. Exchange code for tokens
    tokens = await _exchange_oauth_code(
        payload.provider, payload.code, settings.OAUTH_REDIRECT_URI
    )
    if "access_token" not in tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth token exchange failed",
        )

    # 3. Fetch provider user info
    user_info = await _fetch_oauth_userinfo(payload.provider, tokens["access_token"])

    # 4. Encrypt — never store token in plain text
    cred_data = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
    }
    encrypted = encrypt_credential(json.dumps(cred_data))
    safe_meta = {k: v for k, v in user_info.items()}

    # 5. Upsert integration
    integration = await _upsert_integration(
        workspace, payload.provider, encrypted, safe_meta, db
    )

    # 6. Audit log
    db.add(
        AuditLog(
            workspace_id=workspace.id,
            action="integration_connected",
            actor="user",
            log_metadata={"integration_type": payload.provider, "account": safe_meta},
        )
    )
    await db.commit()
    await db.refresh(integration)
    return ok(IntegrationResponse.model_validate(integration), request)


@router.post("/apikey", response_model=DataResponse[IntegrationResponse])
@limiter.limit(LIMIT_WRITE)
async def connect_apikey(
    request: Request,
    payload: APIKeyConnectRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[IntegrationResponse]:
    # 1. Validate API key against provider
    user_info = await _validate_apikey(payload.type, payload.api_key, payload.extra_config)

    # 2. Encrypt credentials
    cred_data: dict = {"api_key": payload.api_key}
    if payload.extra_config:
        cred_data["extra_config"] = payload.extra_config
    encrypted = encrypt_credential(json.dumps(cred_data))

    safe_meta: dict = {k: v for k, v in user_info.items() if k != "api_key"}
    if payload.extra_config:
        safe_meta["extra_config"] = payload.extra_config

    # 3. Upsert integration
    integration = await _upsert_integration(
        workspace, payload.type, encrypted, safe_meta, db
    )

    # 4. Audit log
    db.add(
        AuditLog(
            workspace_id=workspace.id,
            action="integration_connected",
            actor="user",
            log_metadata={"integration_type": payload.type},
        )
    )
    await db.commit()
    await db.refresh(integration)
    return ok(IntegrationResponse.model_validate(integration), request)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(LIMIT_WRITE)
async def disconnect_integration(
    request: Request,
    integration_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    integration = await _get_owned_integration(integration_id, workspace, db)
    integration.status = "disconnected"
    # Overwrite credentials with an empty encrypted blob — never delete the record
    integration.credentials_encrypted = encrypt_credential("{}")
    db.add(
        AuditLog(
            workspace_id=workspace.id,
            action="integration_disconnected",
            actor="user",
            log_metadata={
                "integration_id": str(integration_id),
                "integration_type": integration.type,
            },
        )
    )
    await db.commit()
