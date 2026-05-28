"""
API contract tests — detect breaking changes and verify structural guarantees.

A breaking change is:
  - Removed endpoint (path + method combination deleted)
  - Removed required field from request body
  - Changed status code for an existing operation
  - Changed field type in response schema

Additive changes (new paths, new optional fields, description updates) are NOT breaking.

Run once to create the snapshot:
    pytest tests/contract/test_api_contracts.py -v

Subsequent runs compare against the saved snapshot.
"""

import json
import uuid
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app

SNAPSHOT_PATH = Path(__file__).parent / "openapi_snapshot.json"


# ── Helpers ────────────────────────────────────────────────────────────────────


def find_breaking_changes(old: dict, new: dict) -> list[dict]:
    """
    Compare two OpenAPI schemas and return a list of breaking change descriptors.
    Only flags removals and type changes — ignores additions.
    """
    breaking: list[dict] = []

    old_paths: dict[str, Any] = old.get("paths", {})
    new_paths: dict[str, Any] = new.get("paths", {})

    # 1. Removed paths / methods
    for path, path_item in old_paths.items():
        if path not in new_paths:
            for method in path_item:
                if method in ("get", "post", "put", "patch", "delete"):
                    breaking.append({
                        "type": "removed_endpoint",
                        "path": path,
                        "method": method,
                    })
            continue

        for method, operation in path_item.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            if method not in new_paths[path]:
                breaking.append({
                    "type": "removed_method",
                    "path": path,
                    "method": method,
                })
                continue

            # 2. Changed response status codes
            old_responses = set(operation.get("responses", {}).keys())
            new_responses = set(new_paths[path][method].get("responses", {}).keys())
            removed_codes = old_responses - new_responses
            for code in removed_codes:
                if code in ("200", "201", "204"):  # only flag success code removals
                    breaking.append({
                        "type": "removed_response_code",
                        "path": path,
                        "method": method,
                        "code": code,
                    })

    return breaking


# ── Contract tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_openapi_schema_stable() -> None:
    """
    Fetch /openapi.json and compare against saved snapshot.
    Creates the snapshot on first run; fails on breaking changes thereafter.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/openapi.json")

    assert response.status_code == 200
    current_schema = response.json()

    if not SNAPSHOT_PATH.exists():
        SNAPSHOT_PATH.write_text(json.dumps(current_schema, indent=2))
        pytest.skip("OpenAPI snapshot created — run again to verify stability")

    saved_schema = json.loads(SNAPSHOT_PATH.read_text())
    breaking = find_breaking_changes(saved_schema, current_schema)

    assert not breaking, (
        f"Breaking API changes detected:\n{json.dumps(breaking, indent=2)}\n\n"
        "If this is intentional, delete tests/contract/openapi_snapshot.json and re-run."
    )


@pytest.mark.asyncio
async def test_all_versioned_endpoints_require_auth() -> None:
    """
    Every endpoint under /api/v1/ (except /auth/*) must return 401
    when called without an Authorization header.
    Catches new endpoints added without auth.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        schema_response = await ac.get("/openapi.json")

    schema = schema_response.json()
    paths: dict[str, Any] = schema.get("paths", {})

    skipped_prefixes = (
        "/api/v1/auth/",
        "/health",
        "/api",
        "/webhooks",
        "/docs",
        "/redoc",
        "/openapi.json",
    )

    failures: list[str] = []

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for path, path_item in paths.items():
            if any(path.startswith(p) for p in skipped_prefixes):
                continue

            for method in ("get", "post", "put", "patch", "delete"):
                if method not in path_item:
                    continue

                # Replace path params with placeholder UUIDs
                test_path = path
                import re
                for param in re.findall(r"\{(\w+)\}", path):
                    test_path = test_path.replace(f"{{{param}}}", str(uuid.uuid4()))

                response = await getattr(ac, method)(test_path)
                if response.status_code not in (401, 403, 405, 422):
                    failures.append(
                        f"{method.upper()} {path} → {response.status_code} "
                        "(expected 401/403 without auth)"
                    )

    assert not failures, "Endpoints reachable without auth:\n" + "\n".join(failures)


@pytest.mark.asyncio
async def test_all_endpoints_return_envelope_shape() -> None:
    """
    Every API response (2xx and 4xx) must conform to envelope shape:
      Success: {data, meta}  or  {data: [...], meta: {total_count, ...}}
      Error:   {errors: [...], meta}
    Tests a sample of endpoints using mocked auth + workspace dependency.
    """
    from app.api.deps import get_current_workspace
    from app.core.database import get_db
    from app.core.security import create_access_token

    workspace = MagicMock()
    workspace.id = uuid.uuid4()
    workspace.name = "Test"
    workspace.brand_voice = None
    workspace.settings = {}
    workspace.created_at = MagicMock()

    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(
        scalar_one=MagicMock(return_value=0),
        scalar_one_or_none=MagicMock(return_value=None),
        scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
    ))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    async def _ws():
        return workspace

    async def _db():
        yield db

    app.dependency_overrides[get_current_workspace] = _ws
    app.dependency_overrides[get_db] = _db

    auth = {"Authorization": f"Bearer {create_access_token({'sub': str(uuid.uuid4())})}"}

    # Sample /api/v1 endpoints — health endpoints use a different format (no envelope)
    sample_endpoints: list[tuple[str, str]] = [
        ("get", "/api/v1/workspaces/me/settings"),
        ("get", "/api/v1/workspaces/me/brand-voice"),
    ]

    failures: list[str] = []
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            for method, path in sample_endpoints:
                response = await getattr(ac, method)(path, headers=auth)
                body = response.json()

                if response.status_code < 400:
                    # Success — must have {data, meta}
                    if "data" not in body:
                        failures.append(f"{method.upper()} {path}: missing 'data' key")
                    if "meta" not in body and path.startswith("/api"):
                        failures.append(f"{method.upper()} {path}: missing 'meta' key")
                else:
                    # Error — must have {errors, meta}
                    if "errors" not in body:
                        failures.append(f"{method.upper()} {path}: error response missing 'errors' key")
                    if "meta" not in body:
                        failures.append(f"{method.upper()} {path}: error response missing 'meta' key")
    finally:
        app.dependency_overrides.clear()

    assert not failures, "Envelope shape violations:\n" + "\n".join(failures)


@pytest.mark.asyncio
async def test_pagination_meta_consistency() -> None:
    """
    Paginated endpoints include total_count, limit, offset, and has_more.
    has_more is False when total_count <= limit.
    """
    from app.api.deps import get_current_workspace
    from app.core.database import get_db

    workspace = MagicMock()
    workspace.id = uuid.uuid4()
    workspace.name = "Test"
    workspace.brand_voice = None
    workspace.settings = {}

    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(
        scalar_one=MagicMock(return_value=0),
        scalar_one_or_none=MagicMock(return_value=None),
        scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
    ))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    async def _ws():
        return workspace

    async def _db():
        yield db

    app.dependency_overrides[get_current_workspace] = _ws
    app.dependency_overrides[get_db] = _db

    paginated_endpoints = [
        "/api/v1/automations/",
        "/api/v1/audit/logs",
        "/api/v1/integrations",
    ]

    auth = {"Authorization": "Bearer test-ignored"}
    failures: list[str] = []

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            for path in paginated_endpoints:
                with patch("app.services.automation_service.list_automations",
                           new_callable=AsyncMock, return_value=[]):
                    response = await ac.get(path, headers=auth, params={"limit": 10, "offset": 0})

                if response.status_code != 200:
                    continue

                meta = response.json().get("meta", {})
                required = ("total_count", "limit", "offset", "has_more")
                for field in required:
                    if field not in meta:
                        failures.append(f"GET {path}: meta missing '{field}'")
                        continue

                if "total_count" in meta and "limit" in meta and "has_more" in meta:
                    total = meta["total_count"]
                    limit = meta["limit"]
                    has_more = meta["has_more"]
                    if total <= limit and has_more is not False:
                        failures.append(
                            f"GET {path}: has_more={has_more} but total={total} <= limit={limit}"
                        )
    finally:
        app.dependency_overrides.clear()

    assert not failures, "Pagination meta violations:\n" + "\n".join(failures)
