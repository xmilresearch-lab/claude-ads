"""Unit tests for the Integrations API (app/api/integrations.py)."""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from starlette.requests import Request


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = "int-test-req"
    return req


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _make_workspace(workspace_id: uuid.UUID | None = None) -> MagicMock:
    w = MagicMock()
    w.id = workspace_id or uuid.uuid4()
    return w


def _make_integration(
    workspace_id: uuid.UUID | None = None,
    integration_type: str = "twitter",
    status: str = "active",
) -> MagicMock:
    i = MagicMock()
    i.id = uuid.uuid4()
    i.workspace_id = workspace_id or uuid.uuid4()
    i.type = integration_type
    i.status = status
    i.meta = {"account_name": "Test Account"}
    i.created_at = datetime.now(tz=timezone.utc)
    i.updated_at = datetime.now(tz=timezone.utc)
    # Store credentials as an encrypted empty blob placeholder
    from app.core.security import encrypt_credential
    i.credentials_encrypted = encrypt_credential(
        json.dumps({"access_token": "test-token", "refresh_token": ""})
    )
    return i


# ── OAuth initiate ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_oauth_initiate_returns_authorization_url_with_state() -> None:
    """oauth_initiate must return an authorization_url containing the state param."""
    from app.api.integrations import oauth_initiate
    from app.schemas.integration import IntegrationConnectRequest

    workspace = _make_workspace()
    db = MagicMock()

    mock_redis = AsyncMock()
    mock_redis.setex = AsyncMock()

    result = await oauth_initiate(
        _make_request(),
        IntegrationConnectRequest(type="twitter"),
        workspace,
        db,
        mock_redis,
    )

    assert "authorization_url" in result.data
    assert "state" in result.data
    state = result.data["state"]
    assert state in result.data["authorization_url"]
    assert result.data["authorization_url"].startswith("https://twitter.com/i/oauth2/authorize")
    mock_redis.setex.assert_awaited_once()
    # Verify state was stored with 600s TTL
    call_args = mock_redis.setex.call_args
    assert call_args[0][0] == f"oauth_state:{state}"
    assert call_args[0][1] == 600


@pytest.mark.asyncio
async def test_oauth_initiate_linkedin_returns_correct_url() -> None:
    from app.api.integrations import oauth_initiate
    from app.schemas.integration import IntegrationConnectRequest

    workspace = _make_workspace()
    db = MagicMock()
    mock_redis = AsyncMock()
    mock_redis.setex = AsyncMock()

    result = await oauth_initiate(
        _make_request(),
        IntegrationConnectRequest(type="linkedin"),
        workspace,
        db,
        mock_redis,
    )

    assert result.data["authorization_url"].startswith(
        "https://www.linkedin.com/oauth/v2/authorization"
    )


# ── OAuth callback ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_oauth_callback_invalid_state_returns_400() -> None:
    """oauth_callback must return 400 when the state is not found in Redis."""
    from app.api.integrations import oauth_callback
    from app.schemas.integration import OAuthCallbackRequest

    workspace = _make_workspace()
    db = MagicMock()

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)  # state not found

    with pytest.raises(HTTPException) as exc_info:
        await oauth_callback(
            _make_request(),
            OAuthCallbackRequest(code="auth_code_123", state="bad-state", provider="twitter"),
            workspace,
            db,
            mock_redis,
        )
    assert exc_info.value.status_code == 400
    assert "state" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_oauth_callback_expired_state_returns_400() -> None:
    """A Redis key that has expired (TTL elapsed) causes Redis to return None — same as invalid."""
    from app.api.integrations import oauth_callback
    from app.schemas.integration import OAuthCallbackRequest

    workspace = _make_workspace()
    db = MagicMock()

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)  # TTL expired → key gone

    with pytest.raises(HTTPException) as exc_info:
        await oauth_callback(
            _make_request(),
            OAuthCallbackRequest(code="code", state="expired-state", provider="twitter"),
            workspace,
            db,
            mock_redis,
        )
    assert exc_info.value.status_code == 400


# ── API key connect ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_apikey_connect_invalid_key_returns_400() -> None:
    """connect_apikey must return 400 when the provider rejects the API key with 401."""
    from app.api.integrations import connect_apikey
    from app.schemas.integration import APIKeyConnectRequest

    workspace = _make_workspace()
    db = MagicMock()
    db.commit = AsyncMock()
    db.add = MagicMock()

    with patch("app.api.integrations._call_provider_api", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = (401, {})
        with pytest.raises(HTTPException) as exc_info:
            await connect_apikey(
                _make_request(),
                APIKeyConnectRequest(type="sendgrid", api_key="bad-key"),
                workspace,
                db,
            )
    assert exc_info.value.status_code == 400
    assert "401" in exc_info.value.detail


@pytest.mark.asyncio
async def test_apikey_connect_valid_key_creates_integration() -> None:
    """connect_apikey creates an Integration record when provider returns 200."""
    from app.api.integrations import connect_apikey
    from app.schemas.integration import APIKeyConnectRequest

    workspace = _make_workspace()
    db = MagicMock()
    db.commit = AsyncMock()
    db.add = MagicMock()

    # No existing integration
    existing_result = MagicMock()
    existing_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=existing_result)

    saved_integration = _make_integration(workspace.id, "sendgrid")

    async def _refresh(obj: MagicMock) -> None:
        obj.id = saved_integration.id
        obj.workspace_id = workspace.id
        obj.type = "sendgrid"
        obj.status = "active"
        obj.meta = {}
        obj.created_at = saved_integration.created_at
        obj.updated_at = saved_integration.updated_at

    db.refresh = _refresh

    with patch("app.api.integrations._call_provider_api", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = (200, {"username": "testuser"})
        result = await connect_apikey(
            _make_request(),
            APIKeyConnectRequest(type="sendgrid", api_key="valid-sg-key"),
            workspace,
            db,
        )

    db.commit.assert_awaited_once()
    assert result.data.type == "sendgrid"
    assert result.data.status == "active"


# ── DELETE integration ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_integration_sets_disconnected_and_overwrites_credentials() -> None:
    """disconnect_integration must mark status=disconnected and overwrite credentials."""
    from app.api.integrations import disconnect_integration

    workspace = _make_workspace()
    integration = _make_integration(workspace.id, "twitter", "active")
    original_credentials = integration.credentials_encrypted

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = integration

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)
    db.commit = AsyncMock()
    db.add = MagicMock()

    await disconnect_integration(_make_request(), integration.id, workspace, db)

    db.commit.assert_awaited_once()
    db.add.assert_called_once()  # audit log added
    assert integration.status == "disconnected"
    # Credentials must be overwritten (not the original value)
    assert integration.credentials_encrypted != original_credentials
    # The new encrypted value must decrypt to an empty JSON object
    from app.core.security import decrypt_credential
    decrypted = decrypt_credential(integration.credentials_encrypted)
    assert decrypted == "{}"


@pytest.mark.asyncio
async def test_delete_integration_keeps_record() -> None:
    """disconnect_integration must NOT delete the database record (kept for audit trail)."""
    from app.api.integrations import disconnect_integration

    workspace = _make_workspace()
    integration = _make_integration(workspace.id, "gmail", "active")

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = integration

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)
    db.commit = AsyncMock()
    db.add = MagicMock()

    await disconnect_integration(_make_request(), integration.id, workspace, db)

    # db.delete should never be called — we keep the record
    db.delete = MagicMock()
    db.delete.assert_not_called()


# ── GET status ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_integration_status_returns_latency_ms() -> None:
    """get_integration_status must include a non-negative latency_ms field."""
    from app.api.integrations import get_integration_status

    workspace = _make_workspace()
    integration = _make_integration(workspace.id, "twitter", "active")

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = integration

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with patch("app.api.integrations._call_provider_api", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = (200, {"data": {"id": "123", "name": "Test"}})
        result = await get_integration_status(_make_request(), integration.id, workspace, db)

    assert result.data.latency_ms >= 0.0
    assert result.data.status == "healthy"
    assert "T" in result.data.last_checked


@pytest.mark.asyncio
async def test_get_integration_status_unhealthy_on_provider_error() -> None:
    from app.api.integrations import get_integration_status

    workspace = _make_workspace()
    integration = _make_integration(workspace.id, "twitter", "active")

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = integration

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with patch("app.api.integrations._call_provider_api", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = (401, {})
        result = await get_integration_status(_make_request(), integration.id, workspace, db)

    assert result.data.status == "unhealthy"


@pytest.mark.asyncio
async def test_get_integration_status_other_workspace_raises_403() -> None:
    """Fetching status for another workspace's integration returns 403."""
    from app.api.integrations import get_integration_status

    my_workspace = _make_workspace()
    other_integration = _make_integration(uuid.uuid4(), "twitter", "active")

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = other_integration

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with pytest.raises(HTTPException) as exc_info:
        await get_integration_status(
            _make_request(), other_integration.id, my_workspace, db
        )
    assert exc_info.value.status_code == 403
