"""Unit tests for rate_limiter middleware — covers uncovered paths."""

import uuid
from unittest.mock import MagicMock

import pytest
from starlette.requests import Request
from starlette.datastructures import Headers

from app.core.security import create_access_token


def _make_request(auth_header: str = "") -> Request:
    headers = [("host", "testserver")]
    if auth_header:
        headers.append(("authorization", auth_header))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [(k.encode(), v.encode()) for k, v in headers],
        "client": ("127.0.0.1", 12345),
    }
    return Request(scope)


# ── get_workspace_id ───────────────────────────────────────────────────────────


def test_get_workspace_id_returns_workspace_key_for_valid_jwt() -> None:
    """Returns 'workspace:{sub}' when a valid JWT is present in Authorization."""
    from app.middleware.rate_limiter import get_workspace_id

    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id})
    request = _make_request(f"Bearer {token}")

    key = get_workspace_id(request)

    assert key == f"workspace:{user_id}"


def test_get_workspace_id_falls_back_to_ip_for_invalid_jwt() -> None:
    """Falls back to remote IP when the JWT is malformed or unsigned."""
    from app.middleware.rate_limiter import get_workspace_id

    request = _make_request("Bearer this.is.not.a.valid.jwt")
    key = get_workspace_id(request)

    # Should fall back to the IP address, not raise
    assert key is not None
    assert "workspace:" not in key


def test_get_workspace_id_falls_back_to_ip_with_no_auth() -> None:
    """Falls back to remote IP when no Authorization header is present."""
    from app.middleware.rate_limiter import get_workspace_id

    request = _make_request()
    key = get_workspace_id(request)

    assert key is not None
    assert "workspace:" not in key


# ── rate_limit_exceeded_handler ───────────────────────────────────────────────


def test_rate_limit_exceeded_handler_returns_429() -> None:
    """Handler returns 429 JSON with retry_after when rate limit is exceeded."""
    from slowapi.errors import RateLimitExceeded

    from app.middleware.rate_limiter import rate_limit_exceeded_handler

    request = _make_request()
    exc = MagicMock(spec=RateLimitExceeded)

    response = rate_limit_exceeded_handler(request, exc)

    assert response.status_code == 429
    import json
    body = json.loads(response.body)
    assert body["error"] == "rate_limit_exceeded"
    assert "retry_after" in body
    assert response.headers.get("retry-after") is not None
