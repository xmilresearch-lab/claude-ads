"""Shared fixtures for security / pentest tests.

Security tests use TestClient as a context manager, which triggers the FastAPI
lifespan. The lifespan calls validate_startup_config / validate_connectivity /
run_pending_migrations — all of which require live services. These fixtures patch
those startup functions so TestClient can start without real Postgres/Redis.
"""

from unittest.mock import AsyncMock, patch

import pytest
from slowapi import Limiter
from slowapi.util import get_remote_address

from main import app


@pytest.fixture(autouse=True)
def _bypass_startup_validation():
    """No-op the three lifespan startup functions for the duration of each test."""
    with (
        patch("main.validate_startup_config", new=AsyncMock(return_value=None)),
        patch("main.validate_connectivity", new=AsyncMock(return_value=None)),
        patch("main.run_pending_migrations", new=AsyncMock(return_value=None)),
    ):
        yield


@pytest.fixture(autouse=True)
def _memory_rate_limiter():
    """Replace Redis-backed limiter with in-memory storage (no Redis required)."""
    original = app.state.limiter
    mem_limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
    app.state.limiter = mem_limiter

    import app.middleware.rate_limiter as rl_module
    orig_storage = rl_module.limiter._storage
    orig_inner = rl_module.limiter._limiter  # type: ignore[attr-defined]

    rl_module.limiter._storage = mem_limiter._storage
    rl_module.limiter._limiter = mem_limiter._limiter  # type: ignore[attr-defined]

    yield

    app.state.limiter = original
    rl_module.limiter._storage = orig_storage
    rl_module.limiter._limiter = orig_inner  # type: ignore[attr-defined]
