"""Unit tests for app/core/startup.py — configuration and connectivity validation."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── Valid environment fixture ──────────────────────────────────────────────────
#
# ALLOWED_ORIGINS must be a JSON array string — pydantic_settings decodes
# list fields as JSON before calling field_validators.

_VALID_ENV: dict[str, str] = {
    "DATABASE_URL":      "postgresql+asyncpg://user:pass@localhost:5432/db",
    "REDIS_URL":         "redis://localhost:6379/0",
    "ANTHROPIC_API_KEY": "sk-ant-" + "x" * 40,
    "SECRET_KEY":        "a" * 32,
    "ENCRYPTION_KEY":    "b" * 32,
    "MCP_AUTH_TOKEN":    "shared-token-abc",
    "SOCIAL_MCP_URL":    "http://localhost:3001",
    "EMAIL_MCP_URL":     "http://localhost:3002",
    "CRM_MCP_URL":       "http://localhost:3003",
    "ALLOWED_ORIGINS":   '["http://localhost:3000","https://app.example.com"]',
    "WEBHOOK_SECRET":    "whsec_test_value",
}


# ── validate_startup_config ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_validate_startup_config_passes_with_all_valid_vars() -> None:
    """All required vars present and well-formed → no exception."""
    with patch.dict(os.environ, _VALID_ENV):
        from app.core.startup import validate_startup_config
        await validate_startup_config()  # must not raise


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_missing_api_key() -> None:
    """Missing ANTHROPIC_API_KEY → RuntimeError mentioning the var name."""
    env = {**_VALID_ENV, "ANTHROPIC_API_KEY": ""}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_wrong_api_key_prefix() -> None:
    """ANTHROPIC_API_KEY not starting with 'sk-ant-' → RuntimeError."""
    env = {**_VALID_ENV, "ANTHROPIC_API_KEY": "sk-openai-wrong-prefix"}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="sk-ant-"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_short_secret_key() -> None:
    """SECRET_KEY shorter than 32 chars → RuntimeError mentioning length."""
    env = {**_VALID_ENV, "SECRET_KEY": "tooshort"}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="32"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_short_encryption_key() -> None:
    """ENCRYPTION_KEY shorter than 32 chars → RuntimeError."""
    env = {**_VALID_ENV, "ENCRYPTION_KEY": "x" * 16}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="32"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_invalid_database_url() -> None:
    """DATABASE_URL not starting with 'postgresql' → RuntimeError."""
    env = {**_VALID_ENV, "DATABASE_URL": "mysql://user:pass@localhost/db"}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="postgresql"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_on_invalid_redis_url() -> None:
    """REDIS_URL not starting with 'redis://' → RuntimeError."""
    env = {**_VALID_ENV, "REDIS_URL": "amqp://localhost"}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="redis://"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_raises_when_mcp_url_invalid() -> None:
    """MCP URL that is not an HTTP/HTTPS URL → RuntimeError."""
    env = {**_VALID_ENV, "SOCIAL_MCP_URL": "not-a-url"}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError, match="SOCIAL_MCP_URL"):
            await validate_startup_config()


@pytest.mark.asyncio
async def test_validate_startup_config_error_lists_all_missing_vars() -> None:
    """Multiple missing vars → single RuntimeError that names all of them."""
    env = {**_VALID_ENV, "SECRET_KEY": "", "ENCRYPTION_KEY": "", "WEBHOOK_SECRET": ""}
    with patch.dict(os.environ, env):
        from app.core.startup import validate_startup_config
        with pytest.raises(RuntimeError) as exc_info:
            await validate_startup_config()
        msg = str(exc_info.value)
        assert "SECRET_KEY" in msg
        assert "ENCRYPTION_KEY" in msg
        assert "WEBHOOK_SECRET" in msg


# ── validate_connectivity ─────────────────────────────────────────────────────
#
# engine is imported lazily inside _check_postgres_connectivity, so we patch
# it at the source module (app.core.database) rather than app.core.startup.


@pytest.mark.asyncio
async def test_validate_connectivity_raises_when_postgres_unreachable() -> None:
    """PostgreSQL connection failure → RuntimeError (fatal)."""
    mock_engine = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock(side_effect=Exception("connection refused"))
    mock_engine.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.database.engine", mock_engine), \
         patch.dict(os.environ, _VALID_ENV):
        from app.core.startup import validate_connectivity
        with pytest.raises(RuntimeError, match="PostgreSQL unreachable"):
            await validate_connectivity()


@pytest.mark.asyncio
async def test_validate_connectivity_raises_when_redis_unreachable() -> None:
    """Redis connection failure → RuntimeError (fatal)."""
    mock_engine = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock(return_value=None)
    mock_engine.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aexit__ = AsyncMock(return_value=False)

    mock_client = AsyncMock()
    mock_client.ping = AsyncMock(side_effect=Exception("ECONNREFUSED"))
    mock_client.aclose = AsyncMock()

    with patch("app.core.database.engine", mock_engine), \
         patch("app.core.startup.aioredis.from_url", return_value=mock_client), \
         patch.dict(os.environ, _VALID_ENV):
        from app.core.startup import validate_connectivity
        with pytest.raises(RuntimeError, match="Redis unreachable"):
            await validate_connectivity()


@pytest.mark.asyncio
async def test_validate_connectivity_warns_but_does_not_raise_when_mcp_unreachable() -> None:
    """MCP servers unreachable → logs WARNING, does NOT raise (non-fatal)."""
    mock_engine = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock(return_value=None)
    mock_engine.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aexit__ = AsyncMock(return_value=False)

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.aclose = AsyncMock()

    mock_http_client = AsyncMock()
    mock_http_client.get = AsyncMock(side_effect=Exception("connection refused"))
    mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_http_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.database.engine", mock_engine), \
         patch("app.core.startup.aioredis.from_url", return_value=mock_redis), \
         patch("app.core.startup.httpx.AsyncClient", return_value=mock_http_client), \
         patch("app.core.startup.logger") as mock_logger, \
         patch.dict(os.environ, _VALID_ENV):
        from app.core.startup import validate_connectivity
        await validate_connectivity()  # must not raise

        warning_calls = mock_logger.warning.call_args_list
        assert len(warning_calls) == 3, (
            f"Expected 3 MCP warnings, got {len(warning_calls)}: {warning_calls}"
        )
