"""Per-workspace daily rate limiting using SlowAPI + Redis."""
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()


def _workspace_key(request: Request) -> str:
    workspace_id = request.path_params.get("workspace_id") or get_remote_address(request)
    return f"workspace:{workspace_id}"


limiter = Limiter(key_func=_workspace_key, default_limits=[])

SOCIAL_LIMIT = f"{settings.rate_limit_social_posts}/day"
EMAIL_LIMIT = f"{settings.rate_limit_emails_sent}/day"
AI_LIMIT = f"{settings.rate_limit_ai_calls}/day"
CRM_LIMIT = f"{settings.rate_limit_crm_updates}/day"


def setup_rate_limiter(app: FastAPI) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
