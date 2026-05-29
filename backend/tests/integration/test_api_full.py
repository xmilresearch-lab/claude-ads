"""
Integration tests: full API flows at the HTTP layer.

Uses httpx.AsyncClient with the FastAPI ASGI app so that routing, middleware,
exception handlers, and response envelopes all run for real.
External dependencies (DB, Redis, MCP servers) are mocked via FastAPI dependency
overrides and unittest.mock patches.

Flow 1 — Happy path:
    workspace fetch → brand-voice set → create automation → trigger run → list runs

Flow 2 — Response envelope validation:
    DataResponse, PaginatedResponse, and ErrorResponse all conform to {data,meta} /
    {errors,meta} shape across multiple endpoints.

Flow 3 — Readiness probe states:
    /health/ready returns "ready" (200) when all deps are healthy and
    "not_ready" (503) when Postgres is unreachable.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.models.workspace import Workspace
from main import app


# ── Test fixtures and helpers ──────────────────────────────────────────────────

_NOW = datetime.now(timezone.utc)


def _scalar(value):
    """DB result mock for queries that call .scalar_one() or .scalar_one_or_none()."""
    m = MagicMock()
    m.scalar_one.return_value = value
    m.scalar_one_or_none.return_value = value
    m.scalars.return_value.all.return_value = []
    m.all.return_value = []
    return m


def _scalars(items: list):
    """DB result mock for queries that call .scalars().all()."""
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    m.scalar_one.return_value = len(items)
    m.all.return_value = items
    return m


def _make_workspace() -> MagicMock:
    w = MagicMock(spec=Workspace)
    w.id = uuid.uuid4()
    w.user_id = str(uuid.uuid4())
    w.name = "Test Workspace"
    w.brand_voice = None
    w.settings = {}
    w.created_at = _NOW
    return w


def _make_automation(workspace_id=None) -> MagicMock:
    a = MagicMock(spec=Automation)
    a.id = uuid.uuid4()
    a.workspace_id = workspace_id or uuid.uuid4()
    a.name = "Daily LinkedIn Post"
    a.type = "social_post"
    a.config = {"platforms": ["linkedin"]}
    a.schedule = "0 9 * * MON-FRI"
    a.trigger = "schedule"
    a.active = True
    a.created_at = _NOW
    a.updated_at = _NOW
    return a


def _make_run(automation_id=None) -> MagicMock:
    r = MagicMock(spec=AutomationRun)
    r.id = uuid.uuid4()
    r.automation_id = automation_id or uuid.uuid4()
    r.status = "pending"
    r.result = None
    r.error = None
    r.started_at = _NOW
    r.finished_at = None
    r.ai_tokens_used = 0
    r.created_at = _NOW
    return r


def _mock_db(*execute_returns) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(execute_returns))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()
    db.delete = AsyncMock()
    return db


# ── Flow 1: Happy path ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_flow1_workspace_brandvoice_automation_run():
    """
    Happy path exercising multiple endpoints in sequence:
    GET /workspaces/me → PUT brand-voice → POST automation → GET automations list
    → POST automation run → GET runs list.

    Each step asserts a 2xx status and that the data field is non-empty.
    """
    workspace = _make_workspace()
    automation = _make_automation(workspace_id=workspace.id)
    run = _make_run(automation_id=automation.id)

    # DB queries across all steps:
    #   GET /workspaces/me: 3 count queries (integrations, automations, active)
    #   GET /automations/: 1 count query
    #   GET /{id}/runs: 1 count + 1 scalars query
    db = _mock_db(
        _scalar(0), _scalar(1), _scalar(1),   # workspace me counts
        _scalar(1),                             # list automations count
        _scalar(1), _scalars([run]),            # list runs count + rows
    )

    from app.api.deps import get_current_workspace
    from app.core.database import get_db

    async def _workspace():
        return workspace

    async def _db():
        yield db

    app.dependency_overrides[get_current_workspace] = _workspace
    app.dependency_overrides[get_db] = _db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            auth = {"Authorization": "Bearer test-token"}

            # Step 1: GET /workspaces/me
            r = await ac.get("/api/v1/workspaces/me", headers=auth)
            assert r.status_code == 200
            assert r.json()["data"]["name"] == "Test Workspace"

            # Step 2: PUT /workspaces/me/brand-voice
            bv = {
                "tone": "professional",
                "writing_style": "concise",
                "target_audience": "B2B tech professionals",
                "examples": [],
            }
            workspace.brand_voice = bv
            r = await ac.put("/api/v1/workspaces/me/brand-voice", headers=auth, json=bv)
            assert r.status_code == 200
            assert r.json()["data"]["tone"] == "professional"

            # Step 3: POST /automations/
            with patch(
                "app.services.automation_service.create_automation",
                new_callable=AsyncMock,
                return_value=automation,
            ):
                r = await ac.post("/api/v1/automations/", headers=auth, json={
                    "name": "Daily LinkedIn Post",
                    "type": "social_post",
                    "config": {"platforms": ["linkedin"]},
                    "trigger": "schedule",
                    "schedule": "0 9 * * MON-FRI",
                })
                assert r.status_code == 201
                assert r.json()["data"]["name"] == "Daily LinkedIn Post"

            # Step 4: GET /automations/
            with patch(
                "app.services.automation_service.list_automations",
                new_callable=AsyncMock,
                return_value=[automation],
            ):
                r = await ac.get("/api/v1/automations/", headers=auth)
                assert r.status_code == 200
                body = r.json()
                assert isinstance(body["data"], list)
                assert len(body["data"]) == 1
                assert body["meta"]["total_count"] == 1

            # Step 5: POST /automations/{id}/run
            with (
                patch(
                    "app.services.automation_service.get_automation",
                    new_callable=AsyncMock,
                    return_value=automation,
                ),
                patch(
                    "app.services.automation_service.create_pending_run",
                    new_callable=AsyncMock,
                    return_value=run,
                ),
                patch("app.workers.scheduled_worker.run_scheduled_automation.delay"),
            ):
                r = await ac.post(
                    f"/api/v1/automations/{automation.id}/run",
                    headers=auth,
                    json={"payload": {}},
                )
                assert r.status_code == 200
                assert r.json()["data"]["status"] == "pending"

            # Step 6: GET /automations/{id}/runs
            with patch(
                "app.services.automation_service.get_automation",
                new_callable=AsyncMock,
                return_value=automation,
            ):
                r = await ac.get(f"/api/v1/automations/{automation.id}/runs", headers=auth)
                assert r.status_code == 200
                body = r.json()
                assert isinstance(body["data"], list)
                assert body["meta"]["total_count"] == 1

    finally:
        app.dependency_overrides.clear()


# ── Flow 2: Envelope format validation ────────────────────────────────────────


@pytest.mark.asyncio
async def test_flow2_data_response_envelope_shape():
    """
    Every 2xx response from a DataResponse endpoint must have:
      - top-level "data" key (object or null)
      - top-level "meta" key with "request_id" and "timestamp"
    """
    workspace = _make_workspace()
    workspace.brand_voice = {"tone": "casual", "writing_style": "friendly",
                              "target_audience": "consumers", "examples": []}

    from app.api.deps import get_current_workspace

    async def _workspace():
        return workspace

    app.dependency_overrides[get_current_workspace] = _workspace

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            auth = {"Authorization": "Bearer test-token"}

            # GET /workspaces/me/brand-voice → DataResponse[BrandVoiceSchema]
            db = _mock_db()  # brand-voice get does no execute queries
            from app.core.database import get_db
            async def _db():
                yield db
            app.dependency_overrides[get_db] = _db

            r = await ac.get("/api/v1/workspaces/me/brand-voice", headers=auth)
            assert r.status_code == 200
            body = r.json()
            assert "data" in body, f"Missing 'data' key: {body}"
            assert "meta" in body, f"Missing 'meta' key: {body}"
            assert "request_id" in body["meta"]
            assert "timestamp" in body["meta"]

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_flow2_paginated_response_envelope_shape():
    """
    Every 2xx response from a PaginatedResponse endpoint must have:
      - top-level "data" key (list)
      - top-level "meta" key with total_count, limit, offset, has_more
    """
    workspace = _make_workspace()

    from app.api.deps import get_current_workspace
    from app.core.database import get_db

    async def _workspace():
        return workspace

    db = _mock_db(_scalar(0))  # list automations: 1 count query returns 0

    async def _db():
        yield db

    app.dependency_overrides[get_current_workspace] = _workspace
    app.dependency_overrides[get_db] = _db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            with patch(
                "app.services.automation_service.list_automations",
                new_callable=AsyncMock,
                return_value=[],
            ):
                r = await ac.get(
                    "/api/v1/automations/",
                    headers={"Authorization": "Bearer test-token"},
                )
            assert r.status_code == 200
            body = r.json()
            assert "data" in body
            assert isinstance(body["data"], list)
            assert "meta" in body
            meta = body["meta"]
            assert "total_count" in meta
            assert "limit" in meta
            assert "offset" in meta
            assert "has_more" in meta

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_flow2_error_response_envelope_shape():
    """
    4xx errors must return:
      - top-level "errors" key (list of {code, message, field})
      - top-level "meta" key with request_id and timestamp
      - no "data" key
    """
    workspace = _make_workspace()

    from app.api.deps import get_current_workspace
    from app.core.database import get_db

    async def _workspace():
        return workspace

    db = _mock_db()

    async def _db():
        yield db

    app.dependency_overrides[get_current_workspace] = _workspace
    app.dependency_overrides[get_db] = _db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            auth = {"Authorization": "Bearer test-token"}

            # GET a nonexistent automation → 404 via service returning None
            non_existent = uuid.uuid4()
            with patch(
                "app.services.automation_service.get_automation",
                new_callable=AsyncMock,
                return_value=None,
            ):
                r = await ac.get(f"/api/v1/automations/{non_existent}", headers=auth)

            assert r.status_code == 404
            body = r.json()
            assert "errors" in body, f"Missing 'errors' key: {body}"
            assert "meta" in body
            assert "data" not in body
            assert isinstance(body["errors"], list)
            assert len(body["errors"]) > 0
            err = body["errors"][0]
            assert "code" in err
            assert "message" in err

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_flow2_validation_error_envelope_shape():
    """POST with invalid body returns 422 with errors list (not FastAPI default format)."""
    workspace = _make_workspace()

    from app.api.deps import get_current_workspace

    async def _workspace():
        return workspace

    app.dependency_overrides[get_current_workspace] = _workspace

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # POST /automations/ with missing required fields
            r = await ac.post(
                "/api/v1/automations/",
                headers={"Authorization": "Bearer test-token"},
                json={"name": "Missing fields"},  # missing type and config
            )
            assert r.status_code == 422
            body = r.json()
            assert "errors" in body
            assert "meta" in body
            assert "data" not in body

    finally:
        app.dependency_overrides.clear()


# ── Flow 3: Readiness probe states ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_flow3_readiness_all_healthy():
    """/health/ready returns 200 + 'ready' when postgres, redis, and MCP are all up."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with (
            patch("main._check_postgres", new_callable=AsyncMock, return_value=(True, "ok")),
            patch("main._check_redis", new_callable=AsyncMock, return_value=(True, "ok")),
            patch("main._check_http", new_callable=AsyncMock, return_value={"status": "ok"}),
        ):
            r = await ac.get("/health/ready")

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready"
    assert "checks" in body
    assert body["checks"]["postgres"]["status"] == "ok"
    assert body["checks"]["redis"]["status"] == "ok"


@pytest.mark.asyncio
async def test_flow3_readiness_postgres_down():
    """/health/ready returns 503 + 'not_ready' when Postgres is unreachable."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with (
            patch(
                "main._check_postgres",
                new_callable=AsyncMock,
                return_value=(False, "connection refused"),
            ),
            patch("main._check_redis", new_callable=AsyncMock, return_value=(True, "ok")),
            patch("main._check_http", new_callable=AsyncMock, return_value={"status": "ok"}),
        ):
            r = await ac.get("/health/ready")

    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["postgres"]["status"] == "error"


@pytest.mark.asyncio
async def test_flow3_readiness_mcp_down_is_degraded():
    """/health/ready returns 200 + 'degraded' when only MCP servers are unreachable."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with (
            patch("main._check_postgres", new_callable=AsyncMock, return_value=(True, "ok")),
            patch("main._check_redis", new_callable=AsyncMock, return_value=(True, "ok")),
            patch(
                "main._check_http",
                new_callable=AsyncMock,
                return_value={"status": "error", "detail": "connection refused"},
            ),
        ):
            r = await ac.get("/health/ready")

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "degraded"


@pytest.mark.asyncio
async def test_flow3_liveness_always_200():
    """GET /health and GET /health/live always return 200 regardless of dependencies."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r_health = await ac.get("/health")
        r_live = await ac.get("/health/live")

    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"
    assert r_live.status_code == 200
    assert r_live.json()["status"] == "ok"
