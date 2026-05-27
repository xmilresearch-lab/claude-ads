from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.auth import router as auth_router
from app.api.automations import router as automations_router
from app.api.content_queue import router as content_queue_router
from app.api.webhooks import router as webhooks_router
from app.core.config import settings
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.middleware.request_id import add_request_id
from app.middleware.security_headers import add_security_headers

app = FastAPI(
    title="AI Automation Platform",
    description="Multi-tenant AI automation backend powered by Claude",
    version="0.1.0",
)

# 1. Request ID (first — sets request_id for all downstream middleware and handlers)
app.middleware("http")(add_request_id)

# 2. CORS (before auth checks)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,
)

# 3. Security headers
app.middleware("http")(add_security_headers)

# 4. SlowAPI rate limiter state
app.state.limiter = limiter

# 5. Rate limit exceeded exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.include_router(auth_router)
app.include_router(automations_router)
app.include_router(content_queue_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
