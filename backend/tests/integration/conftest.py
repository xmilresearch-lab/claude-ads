"""
Shared fixtures for integration tests.

Swaps the SlowAPI rate limiter to in-memory storage so integration tests
run without a live Redis connection.
"""

import pytest
from slowapi import Limiter
from slowapi.util import get_remote_address

from main import app


@pytest.fixture(autouse=True)
def memory_rate_limiter():
    """Replace the app's Redis-backed limiter with an in-memory one for tests."""
    original = app.state.limiter

    mem_limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
    app.state.limiter = mem_limiter

    # Also patch the limiter object's storage so @limiter.limit() decorators
    # use the same in-memory storage instead of connecting to Redis.
    import app.middleware.rate_limiter as rl_module
    original_limiter = rl_module.limiter

    rl_module.limiter._storage = mem_limiter._storage
    rl_module.limiter._limiter = mem_limiter._limiter  # type: ignore[attr-defined]

    yield

    app.state.limiter = original
    rl_module.limiter._storage = original_limiter._storage
    rl_module.limiter._limiter = original_limiter._limiter  # type: ignore[attr-defined]
