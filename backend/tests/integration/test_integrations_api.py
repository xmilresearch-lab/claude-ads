"""
Integration tests for the Integrations API (app/api/integrations.py).

Uses httpx.AsyncClient with ASGITransport so routing, middleware, and response
envelopes all run for real.  External deps (DB, Redis, OAuth providers) are mocked
via FastAPI dependency overrides and unittest.mock patches.
"""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.core.security import decrypt_credential, encrypt_credential, hash_password
from app.models.integration import Integration
from app.models.user import User
from app.models.workspace import Workspace
from main import app

_NOW = datetime.now(timezone.utc)

# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_user() -> MagicMock:
    u = MagicMock(spec=User)
    u.id = uuid.uuid4()
    u.email = "test@xmilresearch.com"
    u.hashed_password = hash_password("Test1234!")
    u.is_active = True
    u.plan = "pro"
    u.created_at = _NOW
    return u


def _make_workspace(user_id: uuid.UUID | None = None) -> MagicMock:
    w = MagicMock(spec=Workspace)
    w.id = uuid.uuid4()
    w.user_id = user_id or uuid.uuid4()
    w.name = "Test Workspace"
    w.brand_voice = None
    w.settings = {}
    w.created_at = _NOW
    return w


def _make_integration(
    workspace_id: uuid.UUID | None = None,
    integration_type: str = "twitter",
    status: str = "active",
) -> MagicMock:
    i = MagicMock(spec=Integration)
    i.id = uuid.uuid4()
    i.workspace_id = workspace_id or uuid.uuid4()
    i.type = integration_type
    i.status = status
    i.meta = {"account_name": "Test Account"}
    i.credentials_encrypted = encrypt_credential(
        json.dumps({"access_token": "test-token", "refresh_token": ""})
    )
    i.created_at = _NOW
    i.updated_at = _NOW
    return i


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one.return_value = value
    m.scalar_one_or_none.return_value = value
    m.scalars.return_value.all.return_value = []
    m.all.return_value = []
    return m


def _scalars(items: list, count: int | None = None) -> MagicMock:
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    m.scalar_one.return_value = count if count is not None else len(items)
    m.all.return_value = items
    return m


def _mock_db(*execute_returns: object) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(execute_returns))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()
    db.delete = AsyncMock()
    return db


def _auth_headers(user: MagicMock | None = None) -> dict[str, str]:
    from app.core.security import create_access_token
    u = user or _make_user()
    token = create_access_token({"sub": str(u.id)})
    return {"Authorization": f"Bearer {token}"}


# ── OAuth initiate ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_oauth_initiate_returns_redirect_url() -> None:
    """POST /integrations/oauth/initiate returns an authorization_url and state token."""
    user = _make_user()
    workspace = _make_workspace(user.id)

    db = _mock_db(
        _scalar(user),       # get_current_user
        _scalar(workspace),  # get_current_workspace
    )

    mock_redis = AsyncMock()
    mock_redis.setex = AsyncMock()

    async def _override_db():
        yield db

    from app.core.redis_client import get_redis
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/integrations/oauth/initiate",
                json={"type": "twitter"},
                headers=_auth_headers(user),
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "authorization_url" in body["data"]
        assert "state" in body["data"]
        assert "twitter.com" in body["data"]["authorization_url"]
        mock_redis.setex.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_oauth_initiate_missing_provider_returns_400() -> None:
    """POST /integrations/oauth/initiate returns 400 for a non-OAuth provider like sendgrid."""
    user = _make_user()
    workspace = _make_workspace(user.id)

    db = _mock_db(
        _scalar(user),
        _scalar(workspace),
    )

    mock_redis = AsyncMock()
    mock_redis.setex = AsyncMock()

    async def _override_db():
        yield db

    from app.core.redis_client import get_redis
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/integrations/oauth/initiate",
                json={"type": "sendgrid"},
                headers=_auth_headers(user),
            )

        assert resp.status_code == 400
        assert "oauth" in resp.json()["errors"][0]["message"].lower() or \
               "apikey" in resp.json()["errors"][0]["message"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_oauth_callback_success_stores_encrypted_credentials() -> None:
    """POST /integrations/oauth/callback stores encrypted credentials for twitter."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    integration = _make_integration(workspace.id, "twitter")

    state = f"twitter:{uuid.uuid4().hex}"
    state_data = json.dumps({"workspace_id": str(workspace.id), "provider": "twitter"})

    db = _mock_db(
        _scalar(user),        # get_current_user
        _scalar(workspace),   # get_current_workspace
        _scalar(None),        # upsert: no existing integration
        _scalar(integration), # db.refresh
    )
    db.refresh = AsyncMock(side_effect=lambda obj: None)

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=state_data.encode())
    mock_redis.delete = AsyncMock()

    async def _override_db():
        yield db

    from app.core.redis_client import get_redis
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    # Mock the OAuth token exchange and userinfo calls
    fake_tokens = {"access_token": "tok123", "refresh_token": "ref456"}
    fake_userinfo = {"account_id": "123", "account_name": "Test User"}

    try:
        with patch("app.api.integrations._exchange_oauth_code", new_callable=AsyncMock,
                   return_value=fake_tokens), \
             patch("app.api.integrations._fetch_oauth_userinfo", new_callable=AsyncMock,
                   return_value=fake_userinfo), \
             patch("app.api.integrations._upsert_integration", new_callable=AsyncMock,
                   return_value=integration):

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/v1/integrations/oauth/callback",
                    json={"code": "auth_code_123", "state": state, "provider": "twitter"},
                    headers=_auth_headers(user),
                )

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["type"] == "twitter"
        assert body["data"]["status"] == "active"
        db.commit.assert_awaited()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_oauth_callback_invalid_state_returns_400() -> None:
    """POST /integrations/oauth/callback returns 400 when state is missing from Redis."""
    user = _make_user()
    workspace = _make_workspace(user.id)

    db = _mock_db(
        _scalar(user),
        _scalar(workspace),
    )

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)  # state expired/not found

    async def _override_db():
        yield db

    from app.core.redis_client import get_redis
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/integrations/oauth/callback",
                json={"code": "code", "state": "bad-state", "provider": "twitter"},
                headers=_auth_headers(user),
            )

        assert resp.status_code == 400
        assert "state" in resp.json()["errors"][0]["message"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_oauth_callback_provider_error_returns_400() -> None:
    """POST /integrations/oauth/callback returns 400 when token exchange fails."""
    user = _make_user()
    workspace = _make_workspace(user.id)

    state = f"twitter:{uuid.uuid4().hex}"
    state_data = json.dumps({"workspace_id": str(workspace.id), "provider": "twitter"})

    db = _mock_db(
        _scalar(user),
        _scalar(workspace),
    )

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=state_data.encode())
    mock_redis.delete = AsyncMock()

    async def _override_db():
        yield db

    from app.core.redis_client import get_redis
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        # Provider returns no access_token → exchange failed
        with patch("app.api.integrations._exchange_oauth_code", new_callable=AsyncMock,
                   return_value={"error": "invalid_grant"}):

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/v1/integrations/oauth/callback",
                    json={"code": "bad_code", "state": state, "provider": "twitter"},
                    headers=_auth_headers(user),
                )

        assert resp.status_code == 400
    finally:
        app.dependency_overrides.clear()


# ── List / get integrations ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_integrations_returns_workspace_integrations_only() -> None:
    """GET /integrations returns only integrations belonging to the authenticated workspace."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    integration = _make_integration(workspace.id, "twitter")

    db = _mock_db(
        _scalar(user),           # get_current_user
        _scalar(workspace),      # get_current_workspace
        _scalar(1),              # COUNT query
        _scalars([integration]), # SELECT query
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/integrations",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["total_count"] == 1
        assert body["data"][0]["type"] == "twitter"
        assert body["data"][0]["workspace_id"] == str(workspace.id)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_integration_returns_correct_item() -> None:
    """GET /integrations/{id} returns the integration when workspace matches."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    integration = _make_integration(workspace.id, "linkedin")

    db = _mock_db(
        _scalar(user),        # get_current_user
        _scalar(workspace),   # get_current_workspace
        _scalar(integration), # get_owned_integration lookup
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                f"/api/v1/integrations/{integration.id}",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 200
        assert resp.json()["data"]["type"] == "linkedin"
        assert resp.json()["data"]["id"] == str(integration.id)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_integration_wrong_workspace_returns_403() -> None:
    """GET /integrations/{id} returns 403 when the integration belongs to another workspace."""
    user = _make_user()
    my_workspace = _make_workspace(user.id)
    other_integration = _make_integration(uuid.uuid4(), "twitter")  # different workspace

    db = _mock_db(
        _scalar(user),            # get_current_user
        _scalar(my_workspace),    # get_current_workspace
        _scalar(other_integration), # get_owned_integration (workspace_id mismatch)
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                f"/api/v1/integrations/{other_integration.id}",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_integration_revokes_and_removes() -> None:
    """DELETE /integrations/{id} sets status=disconnected and overwrites credentials."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    integration = _make_integration(workspace.id, "gmail", "active")
    original_creds = integration.credentials_encrypted

    db = _mock_db(
        _scalar(user),        # get_current_user
        _scalar(workspace),   # get_current_workspace
        _scalar(integration), # get_owned_integration
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete(
                f"/api/v1/integrations/{integration.id}",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 204
        assert integration.status == "disconnected"
        assert integration.credentials_encrypted != original_creds
        assert decrypt_credential(integration.credentials_encrypted) == "{}"
        db.commit.assert_awaited()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_integration_wrong_workspace_returns_403() -> None:
    """DELETE /integrations/{id} returns 403 when the integration belongs to another workspace."""
    user = _make_user()
    my_workspace = _make_workspace(user.id)
    other_integration = _make_integration(uuid.uuid4(), "twitter")

    db = _mock_db(
        _scalar(user),
        _scalar(my_workspace),
        _scalar(other_integration),
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete(
                f"/api/v1/integrations/{other_integration.id}",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


# ── Credential security tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_credentials_are_encrypted_at_rest() -> None:
    """Verify that stored credentials are encrypted (AES-256-GCM) and not plain text."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    integration = _make_integration(workspace.id, "twitter")

    # Encrypt and check round-trip
    plain_creds = {"access_token": "super_secret_token", "refresh_token": "secret_refresh"}
    encrypted = encrypt_credential(json.dumps(plain_creds))

    # Encrypted value must not contain the plain text token
    assert "super_secret_token" not in encrypted
    assert "secret_refresh" not in encrypted

    # But it must decrypt back to the original
    decrypted = json.loads(decrypt_credential(encrypted))
    assert decrypted["access_token"] == "super_secret_token"
    assert decrypted["refresh_token"] == "secret_refresh"

    # Integration in DB should store encrypted form
    integration.credentials_encrypted = encrypted
    assert "super_secret_token" not in integration.credentials_encrypted


@pytest.mark.asyncio
async def test_credential_values_never_appear_in_api_response() -> None:
    """GET /integrations response must never expose credentials_encrypted or plain text tokens."""
    user = _make_user()
    workspace = _make_workspace(user.id)
    plain_creds = {"access_token": "VERY_SECRET_TOKEN", "refresh_token": "SECRET_REFRESH"}
    integration = _make_integration(workspace.id, "twitter")
    integration.credentials_encrypted = encrypt_credential(json.dumps(plain_creds))

    db = _mock_db(
        _scalar(user),
        _scalar(workspace),
        _scalar(1),
        _scalars([integration]),
    )

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/integrations",
                headers=_auth_headers(user),
            )

        assert resp.status_code == 200
        response_text = resp.text

        # Credentials must never appear in the API response
        assert "VERY_SECRET_TOKEN" not in response_text
        assert "SECRET_REFRESH" not in response_text
        assert "credentials_encrypted" not in response_text

        # Status and type are safe to expose
        assert "twitter" in response_text
        assert "active" in response_text
    finally:
        app.dependency_overrides.clear()
