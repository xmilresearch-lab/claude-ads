"""Additional unit tests for automations API — covers gaps in existing tests."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.schemas.automation import AutomationResponse


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
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


def _make_workspace() -> MagicMock:
    w = MagicMock()
    w.id = uuid.uuid4()
    return w


def _make_automation(active: bool = True) -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.workspace_id = uuid.uuid4()
    a.name = "Test Automation"
    a.type = "social_post"
    a.config = {"platforms": ["linkedin"]}
    a.schedule = None
    a.trigger = "manual"
    a.active = active
    a.created_at = datetime.now(tz=timezone.utc)
    a.updated_at = datetime.now(tz=timezone.utc)
    return a


def _make_run() -> MagicMock:
    r = MagicMock()
    r.id = uuid.uuid4()
    r.automation_id = uuid.uuid4()
    r.status = "pending"
    r.result = None
    r.error = None
    r.ai_tokens_used = 0
    r.started_at = datetime.now(tz=timezone.utc)
    r.finished_at = None
    r.created_at = datetime.now(tz=timezone.utc)
    return r


# ── get (404 path) ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_automation_raises_404_when_missing() -> None:
    """get raises 404 when automation not found for workspace."""
    from app.api.automations import get

    workspace = _make_workspace()

    with patch(
        "app.services.automation_service.get_automation",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get(_make_request(), uuid.uuid4(), workspace, MagicMock())

    assert exc_info.value.status_code == 404


# ── update (success + 404) ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_automation_returns_updated() -> None:
    """update returns the updated automation when found."""
    from app.api.automations import update
    from app.schemas.automation import AutomationUpdate

    workspace = _make_workspace()
    automation = _make_automation()

    with patch(
        "app.services.automation_service.update_automation",
        new_callable=AsyncMock,
        return_value=automation,
    ), patch("app.schemas.automation.AutomationResponse.model_validate") as mv:
        mv.return_value = MagicMock(id=automation.id, name=automation.name)
        payload = AutomationUpdate(name="Updated Name")
        response = await update(_make_request(), automation.id, payload, workspace, MagicMock())

    assert response.data is not None


@pytest.mark.asyncio
async def test_update_automation_raises_404_when_missing() -> None:
    """update raises 404 when automation not found."""
    from app.api.automations import update
    from app.schemas.automation import AutomationUpdate

    workspace = _make_workspace()

    with patch(
        "app.services.automation_service.update_automation",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await update(
                _make_request(),
                uuid.uuid4(),
                AutomationUpdate(active=False),
                workspace,
                MagicMock(),
            )

    assert exc_info.value.status_code == 404


# ── delete (success + 404) ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_automation_succeeds() -> None:
    """delete returns None (204) when automation is found and deleted."""
    from app.api.automations import delete

    workspace = _make_workspace()

    with patch(
        "app.services.automation_service.delete_automation",
        new_callable=AsyncMock,
        return_value=True,
    ):
        result = await delete(_make_request(), uuid.uuid4(), workspace, MagicMock())

    assert result is None


@pytest.mark.asyncio
async def test_delete_automation_raises_404_when_missing() -> None:
    """delete raises 404 when automation not found."""
    from app.api.automations import delete

    workspace = _make_workspace()

    with patch(
        "app.services.automation_service.delete_automation",
        new_callable=AsyncMock,
        return_value=False,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await delete(_make_request(), uuid.uuid4(), workspace, MagicMock())

    assert exc_info.value.status_code == 404


# ── run (inactive automation) ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_raises_422_when_automation_inactive() -> None:
    """run raises 422 when automation is not active."""
    from app.api.automations import run
    from app.schemas.automation import TriggerRequest

    workspace = _make_workspace()
    automation = _make_automation(active=False)

    with patch(
        "app.services.automation_service.get_automation",
        new_callable=AsyncMock,
        return_value=automation,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await run(
                _make_request(),
                automation.id,
                TriggerRequest(payload={}),
                workspace,
                MagicMock(),
            )

    assert exc_info.value.status_code == 422


# ── list_runs (automation not found) ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_runs_raises_404_when_automation_missing() -> None:
    """list_runs raises 404 when automation not found."""
    from app.api.automations import list_runs

    workspace = _make_workspace()

    with patch(
        "app.services.automation_service.get_automation",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await list_runs(
                _make_request(), uuid.uuid4(), workspace, MagicMock(), offset=0, limit=50
            )

    assert exc_info.value.status_code == 404
