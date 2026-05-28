"""Unit tests for the auth API endpoints — covering gaps in existing coverage."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.security import create_access_token, create_refresh_token, hash_password


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = "test-req-id"
    return req


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _make_user(active: bool = True) -> MagicMock:
    u = MagicMock()
    u.id = uuid.uuid4()
    u.email = "test@example.com"
    u.hashed_password = hash_password("Test1234!")
    u.is_active = active
    u.plan = "free"
    u.created_at = datetime.now(tz=timezone.utc)
    return u


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    m.scalar_one.return_value = value
    return m


def _make_db(*side_effects) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(side_effects))
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ── register ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_success_creates_user_and_workspace() -> None:
    """register creates user and workspace when email is not taken."""
    from app.api.auth import register
    from app.schemas.auth import RegisterRequest

    db = _make_db(_scalar(None))  # no existing user
    payload = RegisterRequest(
        email="new@example.com",
        password="Test1234!",
        workspace_name="My Company",
    )

    # Don't patch User/Workspace — let them construct normally.
    # The mock DB intercepts all execute/flush/commit calls.
    response = await register(_make_request(), payload, db)

    assert response.data.access_token is not None
    assert response.data.refresh_token is not None
    db.add.assert_called()
    db.flush.assert_called_once()


@pytest.mark.asyncio
async def test_register_raises_409_when_email_taken() -> None:
    """register raises 409 Conflict when email already exists."""
    from app.api.auth import register
    from app.schemas.auth import RegisterRequest

    existing_user = _make_user()
    db = _make_db(_scalar(existing_user))

    payload = RegisterRequest(
        email="existing@example.com",
        password="Test1234!",
        workspace_name="My Company",
    )

    with pytest.raises(HTTPException) as exc_info:
        await register(_make_request(), payload, db)

    assert exc_info.value.status_code == 409
    assert "already registered" in exc_info.value.detail.lower()


# ── login ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_raises_401_when_user_not_found() -> None:
    """login raises 401 when email is not in DB."""
    from app.api.auth import login
    from app.schemas.auth import LoginRequest

    db = _make_db(_scalar(None))
    payload = LoginRequest(email="ghost@example.com", password="anything")

    with pytest.raises(HTTPException) as exc_info:
        await login(_make_request(), payload, db)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_login_raises_401_when_wrong_password() -> None:
    """login raises 401 when password does not match the stored hash."""
    from app.api.auth import login
    from app.schemas.auth import LoginRequest

    user = _make_user()
    db = _make_db(_scalar(user))
    payload = LoginRequest(email="test@example.com", password="WrongPassword!")

    with pytest.raises(HTTPException) as exc_info:
        await login(_make_request(), payload, db)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_login_raises_403_when_account_disabled() -> None:
    """login raises 403 when the account is inactive."""
    from app.api.auth import login
    from app.schemas.auth import LoginRequest

    user = _make_user(active=False)
    db = _make_db(_scalar(user))
    payload = LoginRequest(email="test@example.com", password="Test1234!")

    with pytest.raises(HTTPException) as exc_info:
        await login(_make_request(), payload, db)

    assert exc_info.value.status_code == 403


# ── refresh ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_returns_new_tokens_for_valid_refresh_token() -> None:
    """refresh issues new token pair when refresh token is valid."""
    from app.api.auth import refresh
    from app.schemas.auth import RefreshRequest

    user = _make_user()
    valid_refresh = create_refresh_token({"sub": str(user.id)})
    db = _make_db(_scalar(user))

    payload = RefreshRequest(refresh_token=valid_refresh)
    response = await refresh(_make_request(), payload, db)

    assert response.data.access_token is not None
    assert response.data.refresh_token is not None


@pytest.mark.asyncio
async def test_refresh_raises_401_when_user_not_found() -> None:
    """refresh raises 401 when token's user_id has no matching DB record."""
    from app.api.auth import refresh
    from app.schemas.auth import RefreshRequest

    ghost_id = str(uuid.uuid4())
    valid_refresh = create_refresh_token({"sub": ghost_id})
    db = _make_db(_scalar(None))

    payload = RefreshRequest(refresh_token=valid_refresh)

    with pytest.raises(HTTPException) as exc_info:
        await refresh(_make_request(), payload, db)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_raises_401_for_inactive_user() -> None:
    """refresh raises 401 when the refreshed user's account is inactive."""
    from app.api.auth import refresh
    from app.schemas.auth import RefreshRequest

    user = _make_user(active=False)
    valid_refresh = create_refresh_token({"sub": str(user.id)})
    db = _make_db(_scalar(user))

    payload = RefreshRequest(refresh_token=valid_refresh)

    with pytest.raises(HTTPException) as exc_info:
        await refresh(_make_request(), payload, db)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_raises_401_for_invalid_token() -> None:
    """refresh raises 401 when the token is invalid or tampered."""
    from app.api.auth import refresh
    from app.schemas.auth import RefreshRequest

    payload = RefreshRequest(refresh_token="not.a.valid.token")

    with pytest.raises(HTTPException) as exc_info:
        await refresh(_make_request(), payload, MagicMock())

    assert exc_info.value.status_code == 401


# ── me ─────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_returns_current_user_info() -> None:
    """GET /me returns the authenticated user's profile."""
    from app.api.auth import me

    user = _make_user()
    user.plan = "pro"

    with patch("app.schemas.user.UserResponse.model_validate") as mock_validate:
        mock_resp = MagicMock()
        mock_resp.id = user.id
        mock_resp.email = user.email
        mock_validate.return_value = mock_resp
        response = await me(_make_request(), user)

    assert response.data.id == user.id
    assert response.data.email == user.email
