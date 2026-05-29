"""Unit tests for the Redis client dependency."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_get_redis_yields_client_and_closes() -> None:
    """get_redis yields a Redis client and calls aclose() on exit."""
    from app.core.redis_client import get_redis

    mock_client = MagicMock()
    mock_client.aclose = AsyncMock()

    with patch("app.core.redis_client.aioredis.from_url", return_value=mock_client):
        gen = get_redis()
        client = await gen.__anext__()

        assert client is mock_client

        with pytest.raises(StopAsyncIteration):
            await gen.__anext__()

    mock_client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_get_redis_closes_on_exception() -> None:
    """get_redis calls aclose() even when the consumer raises an exception."""
    from app.core.redis_client import get_redis

    mock_client = MagicMock()
    mock_client.aclose = AsyncMock()

    with patch("app.core.redis_client.aioredis.from_url", return_value=mock_client):
        gen = get_redis()
        await gen.__anext__()

        try:
            await gen.athrow(RuntimeError("consumer error"))
        except RuntimeError:
            pass

    mock_client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_get_redis_uses_settings_redis_url() -> None:
    """get_redis passes settings.REDIS_URL to the Redis client factory."""
    from app.core.redis_client import get_redis

    mock_client = MagicMock()
    mock_client.aclose = AsyncMock()

    with patch("app.core.redis_client.aioredis.from_url", return_value=mock_client) as mock_from_url, \
         patch("app.core.redis_client.settings") as mock_settings:
        mock_settings.REDIS_URL = "redis://testhost:6379/1"

        gen = get_redis()
        await gen.__anext__()
        try:
            await gen.__anext__()
        except StopAsyncIteration:
            pass

    mock_from_url.assert_called_once_with("redis://testhost:6379/1", decode_responses=True)
