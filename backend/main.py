from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.analytics import router as analytics_router
from app.api.audit_logs import router as audit_logs_router
from app.api.auth import router as auth_router
from app.api.automations import router as automations_router
from app.api.content_queue import router as content_queue_router
from app.api.integrations import router as integrations_router
from app.api.webhooks import router as webhooks_router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.middleware.injection_scanner import SecurityError
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.middleware.request_id import add_request_id
from app.middleware.security_headers import add_security_headers
from app.schemas.base import ErrorDetail, ErrorResponse, Meta
from app.services.orchestration import OrchestrationError, RateLimitError

app = FastAPI(
    title="AI Automation Platform",
    description="Multi-tenant AI automation backend powered by Claude",
    version="1.0.0",
)

# ── Middleware stack (order matters) ──────────────────────────────────────────

# 1. Request ID (first — sets request_id for all downstream middleware/handlers)
app.middleware("http")(add_request_id)

# 2. CORS (before auth checks)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,
)

# 3. Security headers
app.middleware("http")(add_security_headers)

# 4. SlowAPI rate limiter state
app.state.limiter = limiter

# 5. Rate limit exceeded exception handler (SlowAPI raises RateLimitExceeded)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]


# ── Exception handlers (ErrorResponse envelope) ───────────────────────────────

def _meta(request: Request) -> Meta:
    return Meta(
        request_id=getattr(request.state, "request_id", ""),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _json_error(
    status_code: int,
    code: str,
    message: str,
    request: Request,
    field: str | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            errors=[ErrorDetail(code=code, message=message, field=field)],
            meta=_meta(request),
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
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
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "unprocessable",
        429: "rate_limited",
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
async def orchestration_error_handler(
    request: Request, exc: OrchestrationError
) -> JSONResponse:
    return _json_error(500, "orchestration_failed", "Automation orchestration failed", request)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return _json_error(500, "internal_error", "An internal error occurred", request)


# ── Versioned API router ───────────────────────────────────────────────────────

api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(auth_router,          prefix="/auth",         tags=["Auth"])
api_v1.include_router(automations_router,   prefix="/automations",  tags=["Automations"])
api_v1.include_router(content_queue_router, prefix="/content",      tags=["Content Queue"])
api_v1.include_router(audit_logs_router,    prefix="/audit",        tags=["Audit Logs"])
api_v1.include_router(workspace_router,     prefix="/workspaces",   tags=["Workspaces"])
api_v1.include_router(integrations_router,  prefix="/integrations", tags=["Integrations"])
api_v1.include_router(analytics_router,     prefix="/analytics",    tags=["Analytics"])

app.include_router(api_v1)
app.include_router(webhooks_router)  # webhooks stay at root — no /api/v1 prefix


# ── Utility endpoints ──────────────────────────────────────────────────────────

@app.get("/api", include_in_schema=False)
async def api_index() -> dict[str, str]:
    return {"version": "v1", "docs": "/docs", "health": "/health"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
