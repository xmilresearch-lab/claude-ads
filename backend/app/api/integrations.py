import base64
import hashlib
import json
import secrets
import time
import urllib.parse
import uuid
from datetime import UTC, datetime
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
from app.schemas.base import (
    COMMON_ERROR_RESPONSES,
    DataResponse,
    PaginatedResponse,
    ok,
    paginated,
)
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
    "facebook": {
        "auth_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "scopes": "pages_manage_posts pages_read_engagement pages_show_list instagram_basic instagram_content_publish instagram_manage_insights",
        "client_id_key": "FACEBOOK_CLIENT_ID",
        "token_url": "https://graph.facebook.com/v19.0/oauth/access_token",
        "client_secret_key": "FACEBOOK_CLIENT_SECRET",
    },
    "instagram": {
        "auth_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "scopes": "instagram_basic instagram_content_publish instagram_manage_insights pages_show_list",
        "client_id_key": "FACEBOOK_CLIENT_ID",
        "token_url": "https://graph.facebook.com/v19.0/oauth/access_token",
        "client_secret_key": "FACEBOOK_CLIENT_SECRET",
    },
    "tiktok": {
        "auth_url": "https://www.tiktok.com/v2/auth/authorize/",
        "scopes": "user.info.basic,video.upload,video.publish",
        "client_id_key": "TIKTOK_CLIENT_KEY",
        "token_url": "https://open.tiktokapis.com/v2/oauth/token/",
        "client_secret_key": "TIKTOK_CLIENT_SECRET",
    },
    "threads": {
        "auth_url": "https://threads.net/oauth/authorize",
        "scopes": "threads_basic threads_content_publish threads_read_replies threads_manage_replies threads_manage_insights",
        "client_id_key": "THREADS_CLIENT_ID",
        "token_url": "https://graph.threads.net/oauth/access_token",
        "client_secret_key": "THREADS_CLIENT_SECRET",
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
    # New platforms handled by _check_provider_health directly
    "facebook": "",
    "instagram": "",
    "tiktok": "",
    "threads": "",
}

# ── PKCE helpers ───────────────────────────────────────────────────────────────


def _generate_pkce_pair() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge) for PKCE (S256 method)."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


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
    return integration  # type: ignore[no-any-return]


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


async def _check_provider_health(
    integration_type: str,
    creds: dict,
    meta: dict | None,
) -> tuple[int, dict]:
    """Provider-specific health check returning (http_status_code, body)."""
    match integration_type:
        case "facebook":
            token = creds.get("access_token", "")
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    "https://graph.facebook.com/v19.0/me/accounts",
                    params={"access_token": token, "fields": "id,name"},
                )
                try:
                    return r.status_code, r.json()
                except Exception:
                    return r.status_code, {}

        case "instagram":
            token = creds.get("page_access_token") or creds.get("access_token", "")
            ig_user_id = creds.get("ig_user_id", "")
            if not ig_user_id:
                return 503, {}
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"https://graph.facebook.com/v19.0/{ig_user_id}",
                    params={"fields": "id", "access_token": token},
                )
                try:
                    return r.status_code, r.json()
                except Exception:
                    return r.status_code, {}

        case "tiktok":
            token = creds.get("access_token", "")
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    "https://open.tiktokapis.com/v2/user/info/",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                    json={"fields": ["open_id", "display_name"]},
                )
                try:
                    body = r.json()
                    err = body.get("error", {})
                    if err.get("code") and err.get("code") != "ok":
                        return 401, body
                    return r.status_code, body
                except Exception:
                    return r.status_code, {}

        case "threads":
            token = creds.get("access_token", "")
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    "https://graph.threads.net/v1.0/me",
                    params={"fields": "id", "access_token": token},
                )
                try:
                    return r.status_code, r.json()
                except Exception:
                    return r.status_code, {}

        case _:
            url, headers = _build_health_check_request(integration_type, creds, meta)
            return await _call_provider_api(url, headers)


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


async def _exchange_facebook_long_lived_token(short_token: str) -> dict:
    """Exchange a short-lived FB user token for a ~60-day long-lived token."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FACEBOOK_CLIENT_ID,
                "client_secret": settings.FACEBOOK_CLIENT_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        try:
            return r.json()  # type: ignore[no-any-return]
        except Exception:
            return {}


async def _fetch_facebook_pages(user_token: str) -> list[dict]:
    """Fetch all Pages (with page-level tokens) the user manages."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            "https://graph.facebook.com/v19.0/me/accounts",
            params={
                "fields": "id,name,access_token,instagram_business_account",
                "access_token": user_token,
            },
        )
        try:
            data = r.json()
            return data.get("data", [])  # type: ignore[no-any-return]
        except Exception:
            return []


async def _fetch_tiktok_user_info(access_token: str) -> dict:
    """Fetch TikTok user display info."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            "https://open.tiktokapis.com/v2/user/info/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json={"fields": ["open_id", "display_name", "avatar_url"]},
        )
        try:
            data = r.json()
            return data.get("data", {}).get("user", {})  # type: ignore[no-any-return]
        except Exception:
            return {}


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
    return integration  # type: ignore[no-any-return]


# ── Endpoints ─────────────────────────────────────────────────────────────────


_WITH_404 = {**COMMON_ERROR_RESPONSES, 404: {"description": "Integration not found"}}


@router.get(
    "",
    summary="List Integrations",
    description=(
        "Return all integrations connected to the current workspace, newest first. "
        "Credentials are never included in list responses — only metadata and status."
    ),
    response_description="Paginated list of integrations",
    responses=COMMON_ERROR_RESPONSES,
    response_model=PaginatedResponse[IntegrationResponse],
)
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


@router.get(
    "/{integration_id}",
    summary="Get Integration",
    description="Fetch a single integration by ID. Returns 403 if it belongs to a different workspace (IDOR protection).",
    response_description="The requested integration",
    responses=_WITH_404,
    response_model=DataResponse[IntegrationResponse],
)
@limiter.limit(LIMIT_READ)
async def get_integration(
    request: Request,
    integration_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[IntegrationResponse]:
    integration = await _get_owned_integration(integration_id, workspace, db)
    return ok(IntegrationResponse.model_validate(integration), request)


@router.get(
    "/{integration_id}/status",
    summary="Get Integration Health",
    description=(
        "Perform a live health check against the external provider API using the stored credentials. "
        "Returns latency in milliseconds and `healthy`, `unhealthy`, `expiring`, or `error` status. "
        "Returns `error` if credentials cannot be decrypted."
    ),
    response_description="Live health status and latency",
    responses=_WITH_404,
    response_model=DataResponse[IntegrationStatusResponse],
)
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
                last_checked=datetime.now(UTC).isoformat(),
            ),
            request,
        )

    # Short-lived token expiry check (TikTok: 24h, Threads: 60 days)
    now_ts = datetime.now(UTC).timestamp()
    expires_at = creds.get("expires_at")
    if expires_at is not None:
        secs_until_expiry = float(expires_at) - now_ts
        if secs_until_expiry <= 0:
            return ok(
                IntegrationStatusResponse(
                    status="unhealthy",
                    latency_ms=0.0,
                    last_checked=datetime.now(UTC).isoformat(),
                ),
                request,
            )
        if integration.type == "tiktok" and secs_until_expiry < 3600:
            return ok(
                IntegrationStatusResponse(
                    status="expiring",
                    latency_ms=0.0,
                    last_checked=datetime.now(UTC).isoformat(),
                ),
                request,
            )
        if integration.type == "threads" and secs_until_expiry < 7 * 86400:
            return ok(
                IntegrationStatusResponse(
                    status="expiring",
                    latency_ms=0.0,
                    last_checked=datetime.now(UTC).isoformat(),
                ),
                request,
            )

    start = time.monotonic()
    status_code, _ = await _check_provider_health(integration.type, creds, integration.meta)
    latency_ms = round((time.monotonic() - start) * 1000, 2)
    health_status = "healthy" if status_code < 400 else "unhealthy"
    return ok(
        IntegrationStatusResponse(
            status=health_status,
            latency_ms=latency_ms,
            last_checked=datetime.now(UTC).isoformat(),
        ),
        request,
    )


@router.post(
    "/oauth/initiate",
    summary="Initiate OAuth Flow",
    description=(
        "Generate an OAuth 2.0 authorization URL for a supported provider. "
        "A one-time `state` token is stored in Redis for 10 minutes to prevent CSRF. "
        "TikTok flows also store a PKCE code_verifier. "
        "Redirect the user to `authorization_url` to begin the OAuth flow."
    ),
    response_description="Authorization URL and state token",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[dict],
)
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
    # State embeds provider name so callback can verify it matches the request
    state = f"{provider}:{secrets.token_urlsafe(16)}"
    await redis.setex(
        f"oauth_state:{state}",
        600,
        json.dumps({"workspace_id": str(workspace.id), "provider": provider}),
    )
    cfg = _OAUTH_CONFIG[provider]
    client_id = getattr(settings, cfg["client_id_key"], "")
    redirect_uri = settings.OAUTH_REDIRECT_URI

    params: dict[str, str] = {
        "response_type": "code",
        "state": state,
    }

    if provider == "tiktok":
        code_verifier, code_challenge = _generate_pkce_pair()
        await redis.setex(f"pkce:{state}", 600, code_verifier)
        params["client_key"] = client_id
        params["scope"] = cfg["scopes"]  # comma-separated for TikTok
        params["redirect_uri"] = redirect_uri
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"
    elif provider in ("facebook", "instagram"):
        params["client_id"] = client_id
        params["redirect_uri"] = redirect_uri
        params["scope"] = cfg["scopes"].replace(" ", ",")
        params["display"] = "page"
    else:
        params["client_id"] = client_id
        params["redirect_uri"] = redirect_uri
        params["scope"] = cfg["scopes"]

    auth_url = cfg["auth_url"] + "?" + urllib.parse.urlencode(params)
    return ok({"authorization_url": auth_url, "state": state}, request)


@router.post(
    "/oauth/callback",
    summary="Complete OAuth Callback",
    description=(
        "Exchange the OAuth authorization code for tokens. "
        "Verifies the one-time `state` token (CSRF protection), performs provider-specific "
        "token exchange, encrypts credentials with AES-256-GCM, and upserts the integration. "
        "Writes an `integration_connected` audit log entry."
    ),
    response_description="The connected integration record",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[IntegrationResponse],
)
@limiter.limit(LIMIT_WRITE)
async def oauth_callback(
    request: Request,
    payload: OAuthCallbackRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> DataResponse[IntegrationResponse]:
    # 1. Verify state (one-time use, CSRF protection)
    state_key = f"oauth_state:{payload.state}"
    stored = await redis.get(state_key)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )
    await redis.delete(state_key)
    state_data = json.loads(stored)
    provider = payload.provider
    if state_data.get("provider") != provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state provider mismatch",
        )

    now_ts = datetime.now(UTC).timestamp()
    credentials: dict = {}
    safe_meta: dict = {}

    # ── Facebook ──────────────────────────────────────────────────────────────
    if provider == "facebook":
        token_resp = await _exchange_oauth_code(
            "facebook", payload.code, settings.OAUTH_REDIRECT_URI
        )
        if "access_token" not in token_resp:
            raise HTTPException(status_code=400, detail="Facebook token exchange failed")
        long_lived = await _exchange_facebook_long_lived_token(token_resp["access_token"])
        if "access_token" not in long_lived:
            raise HTTPException(status_code=400, detail="Failed to exchange long-lived Facebook token")
        pages = await _fetch_facebook_pages(long_lived["access_token"])
        expires_in = long_lived.get("expires_in", 5183944)
        credentials = {
            "access_token": long_lived["access_token"],
            "expires_in": expires_in,
            "expires_at": now_ts + float(expires_in),
            "pages": [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "access_token": p["access_token"],
                    "instagram_business_account_id": (
                        p.get("instagram_business_account", {}).get("id")
                    ),
                }
                for p in pages
            ],
        }
        display_name = pages[0]["name"] if pages else "Facebook"
        safe_meta = {"account_name": display_name, "page_count": len(pages)}

    # ── Instagram ─────────────────────────────────────────────────────────────
    elif provider == "instagram":
        token_resp = await _exchange_oauth_code(
            "facebook", payload.code, settings.OAUTH_REDIRECT_URI
        )
        if "access_token" not in token_resp:
            raise HTTPException(status_code=400, detail="Instagram token exchange failed")
        long_lived = await _exchange_facebook_long_lived_token(token_resp["access_token"])
        if "access_token" not in long_lived:
            raise HTTPException(status_code=400, detail="Failed to exchange long-lived Instagram token")
        pages = await _fetch_facebook_pages(long_lived["access_token"])
        ig_account: dict | None = None
        for page in pages:
            if page.get("instagram_business_account"):
                ig_account = {
                    "id": page["instagram_business_account"]["id"],
                    "page_id": page["id"],
                    "page_access_token": page["access_token"],
                    "page_name": page["name"],
                }
                break
        if not ig_account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "No Instagram Business account found linked to your Facebook Pages. "
                    "Connect your Instagram account to a Facebook Page in Meta Business Suite first."
                ),
            )
        expires_in = long_lived.get("expires_in", 5183944)
        credentials = {
            "access_token": long_lived["access_token"],
            "ig_user_id": ig_account["id"],
            "page_id": ig_account["page_id"],
            "page_access_token": ig_account["page_access_token"],
            "expires_in": expires_in,
            "expires_at": now_ts + float(expires_in),
        }
        safe_meta = {
            "account_name": f"Instagram ({ig_account['page_name']})",
            "ig_user_id": ig_account["id"],
        }

    # ── TikTok ────────────────────────────────────────────────────────────────
    elif provider == "tiktok":
        pkce_key = f"pkce:{payload.state}"
        code_verifier_raw = await redis.get(pkce_key)
        if not code_verifier_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PKCE state expired or invalid. Please try connecting again.",
            )
        await redis.delete(pkce_key)
        code_verifier = (
            code_verifier_raw.decode()
            if isinstance(code_verifier_raw, bytes)
            else str(code_verifier_raw)
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                data={
                    "client_key": settings.TIKTOK_CLIENT_KEY,
                    "client_secret": settings.TIKTOK_CLIENT_SECRET,
                    "code": payload.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.OAUTH_REDIRECT_URI,
                    "code_verifier": code_verifier,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_data = r.json()
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail="TikTok token exchange failed")
        user_info = await _fetch_tiktok_user_info(token_data["access_token"])
        tt_expires_in = int(token_data.get("expires_in", 86400))
        tt_refresh_expires_in = int(token_data.get("refresh_expires_in", 31536000))
        credentials = {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "open_id": token_data.get("open_id", ""),
            "expires_in": tt_expires_in,
            "expires_at": now_ts + float(tt_expires_in),
            "refresh_expires_in": tt_refresh_expires_in,
            "refresh_expires_at": now_ts + float(tt_refresh_expires_in),
        }
        tt_display = user_info.get("display_name", token_data.get("open_id", "TikTok"))
        safe_meta = {
            "account_name": f"TikTok ({tt_display})",
            "open_id": token_data.get("open_id", ""),
        }

    # ── Threads ───────────────────────────────────────────────────────────────
    elif provider == "threads":
        async with httpx.AsyncClient(timeout=15.0) as client:
            short_r = await client.post(
                "https://graph.threads.net/oauth/access_token",
                data={
                    "client_id": settings.THREADS_CLIENT_ID,
                    "client_secret": settings.THREADS_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.OAUTH_REDIRECT_URI,
                    "code": payload.code,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            short_token = short_r.json()
        if "access_token" not in short_token:
            raise HTTPException(status_code=400, detail="Threads token exchange failed")
        async with httpx.AsyncClient(timeout=15.0) as client:
            long_r = await client.get(
                "https://graph.threads.net/access_token",
                params={
                    "grant_type": "th_exchange_token",
                    "client_secret": settings.THREADS_CLIENT_SECRET,
                    "access_token": short_token["access_token"],
                },
            )
            long_token = long_r.json()
        if "access_token" not in long_token:
            raise HTTPException(status_code=400, detail="Failed to exchange Threads long-lived token")
        async with httpx.AsyncClient(timeout=10.0) as client:
            me_r = await client.get(
                "https://graph.threads.net/v1.0/me",
                params={
                    "fields": "id,username,name",
                    "access_token": long_token["access_token"],
                },
            )
            me = me_r.json()
        th_expires_in = int(long_token.get("expires_in", 5183944))
        credentials = {
            "access_token": long_token["access_token"],
            "threads_user_id": me.get("id", ""),
            "username": me.get("username", ""),
            "expires_in": th_expires_in,
            "expires_at": now_ts + float(th_expires_in),
        }
        th_username = me.get("username", me.get("id", "threads"))
        safe_meta = {
            "account_name": f"Threads (@{th_username})",
            "threads_user_id": me.get("id", ""),
            "username": me.get("username", ""),
        }

    # ── Standard OAuth (twitter, linkedin, gmail, hubspot) ───────────────────
    else:
        tokens = await _exchange_oauth_code(
            provider, payload.code, settings.OAUTH_REDIRECT_URI
        )
        if "access_token" not in tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth token exchange failed",
            )
        user_info = await _fetch_oauth_userinfo(provider, tokens["access_token"])
        credentials = {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
        }
        safe_meta = {k: v for k, v in user_info.items()}

    # ── Encrypt & store ───────────────────────────────────────────────────────
    encrypted = encrypt_credential(json.dumps(credentials))
    integration = await _upsert_integration(workspace, provider, encrypted, safe_meta, db)
    db.add(
        AuditLog(
            workspace_id=workspace.id,
            action="integration_connected",
            actor="user",
            log_metadata={"integration_type": provider, "account": safe_meta},
        )
    )
    await db.commit()
    await db.refresh(integration)
    return ok(IntegrationResponse.model_validate(integration), request)


@router.post(
    "/apikey",
    summary="Connect via API Key",
    description=(
        "Connect an integration using an API key (supported: SendGrid, Zendesk). "
        "The key is validated against the provider before being stored. "
        "Keys are encrypted with AES-256-GCM — never stored in plain text. "
        "Returns 400 if the provider does not support API key auth or if the key is invalid."
    ),
    response_description="The connected integration record",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[IntegrationResponse],
)
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


@router.delete(
    "/{integration_id}",
    summary="Disconnect Integration",
    description=(
        "Disconnect an integration by overwriting its credentials with an empty encrypted blob "
        "and setting status to `disconnected`. "
        "The record is retained for audit trail purposes — use this instead of deleting. "
        "Writes an `integration_disconnected` audit log entry."
    ),
    response_description="No content — integration disconnected",
    responses=_WITH_404,
    status_code=status.HTTP_204_NO_CONTENT,
)
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
