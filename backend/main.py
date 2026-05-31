import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator

import httpx
import redis.asyncio as aioredis
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.api.admin_saas import router as admin_saas_router
from app.api.analytics import router as analytics_router
from app.api.assistant import router as assistant_router
from app.api.audit_logs import router as audit_logs_router
from app.api.auth import router as auth_router
from app.api.automations import router as automations_router
from app.api.billing import router as billing_router
from app.api.content_queue import router as content_queue_router
from app.api.integrations import router as integrations_router
from app.api.openapi_extras import add_openapi_extras
from app.api.push import router as push_router
from app.api.webhooks import router as webhooks_router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.core.database import engine
from app.middleware.injection_scanner import SecurityError
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.middleware.request_id import add_request_id
from app.middleware.security_headers import add_security_headers
from app.schemas.base import ErrorDetail, ErrorResponse, Meta
from app.core.startup import (
    run_pending_migrations,
    validate_connectivity,
    validate_startup_config,
)
from app.services.orchestration import OrchestrationError, RateLimitError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    await validate_startup_config()
    await validate_connectivity()
    await run_pending_migrations()
    logger.info("AI Automation Platform started")
    yield
    logger.info("Shutting down gracefully")


app = FastAPI(
    title="AI Automation Platform API",
    description="""## Overview

Automate social media posting, email campaigns, customer support replies, and CRM updates
using Claude AI as the engine. Multi-tenant, workspace-scoped, with human-in-the-loop
approval for all generated content.

## Authentication

All endpoints except `POST /api/v1/auth/register` and `POST /api/v1/auth/login` require a
Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are issued by `POST /api/v1/auth/login` and expire after **30 minutes**.
Use `POST /api/v1/auth/refresh` to obtain a new access token without re-authenticating.

## Rate Limits

| Scope | Limit |
|---|---|
| Read endpoints (GET) | 300 / minute |
| Write endpoints (POST, PUT, PATCH, DELETE) | 60 / minute |
| Auth endpoints | 10 / minute |
| Automation trigger | 30 / minute |
| Assistant chat | 30 / minute per workspace |
| Analytics export | 10 / hour |
| Webhooks | 200 / minute |

Exceeded limits return `429 Too Many Requests`.

## Response Envelope

All responses wrap their payload in a consistent envelope:

```json
{
  "data": { "...": "..." },
  "meta": { "request_id": "uuid", "timestamp": "2024-01-01T00:00:00Z" }
}
```

Paginated responses include `total_count`, `limit`, `offset`, and `has_more` inside `meta`.

## Error Format

```json
{
  "errors": [{ "code": "not_found", "message": "Automation not found", "field": null }],
  "meta": { "request_id": "uuid", "timestamp": "2024-01-01T00:00:00Z" }
}
```
""",
    version="1.0.0",
    contact={"name": "API Support", "email": "support@yourplatform.com"},
    license_info={"name": "Private"},
    openapi_tags=[
        {"name": "Auth", "description": "Registration, login, token refresh, and current user info."},
        {"name": "Workspaces", "description": "Workspace settings, brand voice configuration, and per-workspace preferences."},
        {"name": "Automations", "description": "Create and manage automations; trigger manual runs; view run history."},
        {"name": "Content Queue", "description": "Review, approve, or reject AI-generated content before it is published."},
        {"name": "Audit Logs", "description": "Immutable, workspace-scoped log of every action taken on the platform."},
        {"name": "Integrations", "description": "Connect external services via OAuth or API key. Includes live health checks per integration."},
        {"name": "Analytics", "description": "Run metrics, token usage, platform stats, and data export (CSV / JSON)."},
        {"name": "Billing", "description": "Stripe checkout, customer portal, plan usage, and subscription management."},
        {"name": "Assistant", "description": "Streaming Claude-powered in-app assistant with page context and brand voice."},
        {"name": "Admin SaaS", "description": "Admin-only: MRR, growth stats, token spend, impersonation. Requires is_admin=true."},
        {"name": "Health", "description": "Liveness and readiness probes for orchestration and monitoring."},
        {"name": "Push", "description": "Web Push subscription management and VAPID public key endpoint."},
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware stack ───────────────────────────────────────────────────────────

app.middleware("http")(add_request_id)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,
)
app.middleware("http")(add_security_headers)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]


# ── Exception handlers ─────────────────────────────────────────────────────────


def _meta(request: Request) -> Meta:
    return Meta(
        request_id=getattr(request.state, "request_id", ""),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _json_error(
    status_code: int, code: str, message: str, request: Request, field: str | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            errors=[ErrorDetail(code=code, message=message, field=field)],
            meta=_meta(request),
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors: list[ErrorDetail] = []
    for e in exc.errors():
        loc = e.get("loc", ())
        field = ".".join(str(p) for p in loc[1:]) if len(loc) > 1 else None
        errors.append(ErrorDetail(code="validation_error", message=e["msg"], field=field))
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(errors=errors, meta=_meta(request)).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    _CODE_MAP: dict[int, str] = {
        400: "bad_request", 401: "unauthorized", 402: "payment_required",
        403: "forbidden", 404: "not_found", 409: "conflict",
        422: "unprocessable", 429: "rate_limited",
    }
    code = _CODE_MAP.get(exc.status_code, "http_error")
    return _json_error(exc.status_code, code, str(exc.detail), request)


@app.exception_handler(SecurityError)
async def security_error_handler(request: Request, exc: SecurityError) -> JSONResponse:
    return _json_error(400, "injection_blocked", "Content contains disallowed patterns", request)


@app.exception_handler(RateLimitError)
async def rate_limit_error_handler(request: Request, exc: RateLimitError) -> JSONResponse:
    return _json_error(429, "workspace_rate_limit", str(exc), request)


@app.exception_handler(OrchestrationError)
async def orchestration_error_handler(request: Request, exc: OrchestrationError) -> JSONResponse:
    return _json_error(500, "orchestration_failed", "Automation orchestration failed", request)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return _json_error(500, "internal_error", "An internal error occurred", request)


# ── Versioned API router ─────────────────────────────────────────────────────────

api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(auth_router,          prefix="/auth",        tags=["Auth"])
api_v1.include_router(automations_router,   prefix="/automations", tags=["Automations"])
api_v1.include_router(content_queue_router, prefix="/content",     tags=["Content Queue"])
api_v1.include_router(audit_logs_router,    prefix="/audit",       tags=["Audit Logs"])
api_v1.include_router(workspace_router,     prefix="/workspaces",  tags=["Workspaces"])
api_v1.include_router(integrations_router,  prefix="/integrations",tags=["Integrations"])
api_v1.include_router(analytics_router,     prefix="/analytics",   tags=["Analytics"])
api_v1.include_router(push_router,          prefix="/push",        tags=["Push"])
api_v1.include_router(billing_router,       prefix="/billing",     tags=["Billing"])
api_v1.include_router(assistant_router,     prefix="/assistant",   tags=["Assistant"])
api_v1.include_router(admin_saas_router,    prefix="/admin/saas",  tags=["Admin SaaS"])

app.include_router(api_v1)
app.include_router(webhooks_router)  # webhooks stay at root — no /api/v1 prefix


# ── Health endpoints ─────────────────────────────────────────────────────────────


async def _check_postgres() -> tuple[bool, str]:
    try:
        async def _q() -> None:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        await asyncio.wait_for(_q(), timeout=2.0)
        return True, "ok"
    except Exception as exc:
        return False, str(exc)[:120]


async def _check_redis() -> tuple[bool, str]:
    try:
        async def _p() -> None:
            client: aioredis.Redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            try:
                await client.ping()
            finally:
                await client.aclose()
        await asyncio.wait_for(_p(), timeout=2.0)
        return True, "ok"
    except Exception as exc:
        return False, str(exc)[:120]


async def _check_http(name: str, url: str) -> dict[str, str]:
    try:
        async def _g() -> int:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(url, headers={"Authorization": f"Bearer {settings.MCP_AUTH_TOKEN}"})
                return r.status_code
        status_code = await asyncio.wait_for(_g(), timeout=3.0)
        return {"status": "ok" if status_code < 500 else "error"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:80]}


@app.get("/api", include_in_schema=False)
async def api_index() -> dict[str, str]:
    return {"version": "v1", "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["Health"], summary="Liveness Check")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/health/live", tags=["Health"], summary="Liveness Probe")
async def health_live() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/health/ready", tags=["Health"], summary="Readiness Probe")
async def health_ready() -> JSONResponse:
    pg_ok, pg_detail = await _check_postgres()
    redis_ok, redis_detail = await _check_redis()
    mcp_results = await asyncio.gather(
        _check_http("social_mcp", f"{settings.SOCIAL_MCP_URL}/health"),
        _check_http("email_mcp", f"{settings.EMAIL_MCP_URL}/health"),
        _check_http("crm_mcp", f"{settings.CRM_MCP_URL}/health"),
    )
    checks: dict = {
        "postgres": {"status": "ok" if pg_ok else "error", "detail": pg_detail},
        "redis": {"status": "ok" if redis_ok else "error", "detail": redis_detail},
        "social_mcp": mcp_results[0],
        "email_mcp": mcp_results[1],
        "crm_mcp": mcp_results[2],
    }
    core_ok = pg_ok and redis_ok
    mcp_ok = all(r["status"] == "ok" for r in mcp_results)
    if not core_ok:
        overall, http_status = "not_ready", 503
    elif not mcp_ok:
        overall, http_status = "degraded", 200
    else:
        overall, http_status = "ready", 200
    return JSONResponse(
        status_code=http_status,
        content={"status": overall, "version": "1.0.0",
                 "timestamp": datetime.now(timezone.utc).isoformat(), "checks": checks},
    )


add_openapi_extras(app)
