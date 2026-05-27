from fastapi import Request, Response
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=["1000/hour", "100/minute"],
)

LIMIT_AUTH = "10/minute"
LIMIT_TRIGGER = "30/minute"
LIMIT_WEBHOOKS = "200/minute"
LIMIT_READ = "300/minute"
LIMIT_WRITE = "60/minute"


def get_workspace_id(request: Request) -> str:
    """
    Extract user sub from the authenticated JWT as workspace rate limit key.
    Falls back to IP address if not authenticated.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            claims = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            sub: str = claims.get("sub", "")
            if sub:
                return f"workspace:{sub}"
        except JWTError:
            pass
    return get_remote_address(request)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    # slowapi's RateLimitExceeded does not expose retry_after in all versions;
    # use 60 s as a safe default so the handler never crashes.
    retry_secs = 60
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": retry_secs,
        },
        headers={"Retry-After": str(retry_secs)},
    )
