import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.automation_service import (
    create_automation,
    delete_automation,
    get_automation,
    list_automations,
    trigger_automation,
    update_automation,
)
from app.services.orchestration import AutomationNotFoundError


# ── helpers ────────────────────────────────────────────────────────────────


def _exec_result(value: object) -> MagicMock:
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    r.scalars.return_value.all.return_value = value if isinstance(value, list) else []
    return r


def _make_db(*execute_returns: object) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[_exec_result(v) for v in execute_returns])
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


def _make_automation(**kwargs: object) -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.workspace_id = uuid.uuid4()
    a.name = "Test Automation"
    a.type = "social_post"
    a.config = {}
    a.active = True
    a.schedule = None
    a.trigger = None
    for k, v in kwargs.items():
        setattr(a, k, v)
    return a


# ── create_automation ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_automation_adds_to_db() -> None:
    db = _make_db()
    await create_automation(uuid.uuid4(), "My Auto", "social_post", {}, db)
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_create_automation_commits() -> None:
    db = _make_db()
    await create_automation(uuid.uuid4(), "My Auto", "social_post", {}, db)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_automation_refreshes() -> None:
    db = _make_db()
    await create_automation(uuid.uuid4(), "My Auto", "social_post", {}, db)
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_automation_returns_automation() -> None:
    db = _make_db()
    # refresh updates the instance in-place; the returned object is what was added
    result = await create_automation(uuid.uuid4(), "My Auto", "social_post", {}, db)
    assert result is not None


@pytest.mark.asyncio
async def test_create_automation_sets_schedule() -> None:
    db = _make_db()
    # Verify the added object has the right schedule by inspecting add() call
    await create_automation(
        uuid.uuid4(), "Scheduled", "social_post", {}, db, schedule="0 9 * * *"
    )
    added = db.add.call_args[0][0]
    assert added.schedule == "0 9 * * *"


@pytest.mark.asyncio
async def test_create_automation_sets_trigger() -> None:
    db = _make_db()
    await create_automation(
        uuid.uuid4(), "Triggered", "social_post", {}, db, trigger="webhook"
    )
    added = db.add.call_args[0][0]
    assert added.trigger == "webhook"


# ── get_automation ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_automation_returns_automation() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    result = await get_automation(auto.id, auto.workspace_id, db)
    assert result is auto


@pytest.mark.asyncio
async def test_get_automation_returns_none_when_missing() -> None:
    db = _make_db(None)
    result = await get_automation(uuid.uuid4(), uuid.uuid4(), db)
    assert result is None


@pytest.mark.asyncio
async def test_get_automation_executes_query() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    await get_automation(auto.id, auto.workspace_id, db)
    db.execute.assert_awaited_once()


# ── list_automations ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_automations_returns_list() -> None:
    automations = [_make_automation(), _make_automation()]
    db = _make_db(automations)
    result = await list_automations(uuid.uuid4(), db)
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_list_automations_empty_returns_empty_list() -> None:
    db = _make_db([])
    result = await list_automations(uuid.uuid4(), db)
    assert result == []


@pytest.mark.asyncio
async def test_list_automations_executes_query() -> None:
    db = _make_db([])
    await list_automations(uuid.uuid4(), db)
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_automations_accepts_offset_and_limit() -> None:
    db = _make_db([])
    await list_automations(uuid.uuid4(), db, offset=10, limit=5)
    db.execute.assert_awaited_once()


# ── update_automation ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_automation_returns_none_when_not_found() -> None:
    db = _make_db(None)
    result = await update_automation(uuid.uuid4(), uuid.uuid4(), {"name": "X"}, db)
    assert result is None


@pytest.mark.asyncio
async def test_update_automation_applies_updates() -> None:
    auto = _make_automation(name="Old Name")
    db = _make_db(auto)
    await update_automation(auto.id, auto.workspace_id, {"name": "New Name"}, db)
    assert auto.name == "New Name"


@pytest.mark.asyncio
async def test_update_automation_commits() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    await update_automation(auto.id, auto.workspace_id, {"active": False}, db)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_automation_refreshes() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    await update_automation(auto.id, auto.workspace_id, {"active": False}, db)
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_automation_ignores_unknown_keys() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    # Should not raise even if key doesn't exist on model
    await update_automation(
        auto.id, auto.workspace_id, {"nonexistent_field": "value"}, db
    )
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_automation_no_commit_when_not_found() -> None:
    db = _make_db(None)
    await update_automation(uuid.uuid4(), uuid.uuid4(), {"name": "X"}, db)
    db.commit.assert_not_awaited()


# ── delete_automation ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_automation_returns_true_when_found() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    result = await delete_automation(auto.id, auto.workspace_id, db)
    assert result is True


@pytest.mark.asyncio
async def test_delete_automation_returns_false_when_not_found() -> None:
    db = _make_db(None)
    result = await delete_automation(uuid.uuid4(), uuid.uuid4(), db)
    assert result is False


@pytest.mark.asyncio
async def test_delete_automation_calls_db_delete() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    await delete_automation(auto.id, auto.workspace_id, db)
    db.delete.assert_awaited_once_with(auto)


@pytest.mark.asyncio
async def test_delete_automation_commits() -> None:
    auto = _make_automation()
    db = _make_db(auto)
    await delete_automation(auto.id, auto.workspace_id, db)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_automation_no_commit_when_not_found() -> None:
    db = _make_db(None)
    await delete_automation(uuid.uuid4(), uuid.uuid4(), db)
    db.commit.assert_not_awaited()


# ── trigger_automation ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_trigger_automation_raises_when_not_found() -> None:
    db = _make_db(None)
    with pytest.raises(AutomationNotFoundError):
        await trigger_automation(uuid.uuid4(), uuid.uuid4(), {}, db)


@pytest.mark.asyncio
@patch("app.services.automation_service.run_automation", new_callable=AsyncMock)
async def test_trigger_automation_calls_run_automation(
    mock_run: AsyncMock,
) -> None:
    auto = _make_automation()
    db = _make_db(auto)
    mock_run.return_value = MagicMock(status="success")
    payload = {"topic": "product launch"}

    await trigger_automation(auto.id, auto.workspace_id, payload, db)

    mock_run.assert_awaited_once_with(auto.id, payload, db)


@pytest.mark.asyncio
@patch("app.services.automation_service.run_automation", new_callable=AsyncMock)
async def test_trigger_automation_returns_run_result(
    mock_run: AsyncMock,
) -> None:
    auto = _make_automation()
    db = _make_db(auto)
    expected_run = MagicMock(status="success")
    mock_run.return_value = expected_run

    result = await trigger_automation(auto.id, auto.workspace_id, {}, db)

    assert result is expected_run


@pytest.mark.asyncio
@patch("app.services.automation_service.run_automation", new_callable=AsyncMock)
async def test_trigger_automation_verifies_workspace_ownership(
    mock_run: AsyncMock,
) -> None:
    auto = _make_automation()
    wrong_workspace = uuid.uuid4()
    # get_automation will return None because workspace_id doesn't match
    db = _make_db(None)
    mock_run.return_value = MagicMock()

    with pytest.raises(AutomationNotFoundError):
        await trigger_automation(auto.id, wrong_workspace, {}, db)

    mock_run.assert_not_called()
