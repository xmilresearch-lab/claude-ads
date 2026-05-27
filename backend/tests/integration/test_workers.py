"""
Integration tests for the worker layer.

Like tests/integration/test_orchestration.py, these use:
  - Real worker code (no mocks of worker internals)
  - Mocked Claude API / MCP HTTP calls (no live network)
  - Mocked DB session (no live Postgres)

Test 1: Scheduled automation dispatch via poll_due_automations
Test 2: Webhook → publish pipeline via publish_content
Test 3: Content approval webhook (approve_and_publish endpoint)
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.audit_log import AuditLog
from app.models.content_queue import ContentQueue
from app.workers.publish_worker import MCPCallError


# ── shared helpers ────────────────────────────────────────────────────────────


def _make_automation(
    auto_type: str = "social_post",
    schedule: str | None = "* * * * *",
    active: bool = True,
) -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.workspace_id = uuid.uuid4()
    a.name = "Integration Test Auto"
    a.type = auto_type
    a.schedule = schedule
    a.active = active
    a.config = {}
    return a


def _make_content_item(
    status: str = "approved",
    platform: str = "twitter",
) -> MagicMock:
    item = MagicMock()
    item.id = uuid.uuid4()
    item.automation_id = uuid.uuid4()
    item.status = status
    item.platform = platform
    item.content = {"text": "Hello from integration test!", "platform": platform}
    item.published_at = None
    item.scheduled_at = None
    item.created_at = datetime.now(tz=timezone.utc)
    item.updated_at = datetime.now(tz=timezone.utc)
    return item


def _make_db_for_automations(*automations: MagicMock) -> MagicMock:
    """DB mock that returns the given automations from scalars().all()."""
    db = MagicMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=False)
    result = MagicMock()
    result.scalars.return_value.all.return_value = list(automations)
    db.execute = AsyncMock(return_value=result)
    return db


# ── Test 1: Scheduled automation dispatch ─────────────────────────────────────


def test_poll_due_automations_dispatches_run_for_due_cron() -> None:
    """
    poll_due_automations() scans active automations and dispatches
    run_scheduled_automation.delay() for each cron that is currently due.

    Uses "* * * * *" (always due) and "0 0 1 1 *" (Jan-1 midnight only, never
    due in a test run), so no time-pinning is needed.
    """
    from app.workers.scheduled_worker import poll_due_automations

    auto_due = _make_automation(auto_type="social_post", schedule="* * * * *")
    auto_not_due = _make_automation(auto_type="crm_update", schedule="0 0 1 1 *")
    db = _make_db_for_automations(auto_due, auto_not_due)

    with patch("app.workers.scheduled_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.scheduled_worker.run_scheduled_automation"
    ) as mock_task:
        result = poll_due_automations()

    assert result == {"dispatched": 1}
    mock_task.delay.assert_called_once_with(
        str(auto_due.id),
        {"trigger": "schedule", "cron": "* * * * *"},
    )


def test_poll_due_automations_only_dispatches_when_cron_is_due() -> None:
    """Automations whose cron is NOT currently due are skipped."""
    from app.workers.scheduled_worker import poll_due_automations

    # "0 0 1 1 *" = Jan 1st midnight — statistically never due during test runs
    auto_not_due = _make_automation(schedule="0 0 1 1 *")
    db = _make_db_for_automations(auto_not_due)

    with patch("app.workers.scheduled_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.scheduled_worker.run_scheduled_automation"
    ) as mock_task:
        result = poll_due_automations()

    assert result == {"dispatched": 0}
    mock_task.delay.assert_not_called()


def test_poll_due_automations_returns_zero_when_no_automations() -> None:
    """When the DB returns no automations, dispatched=0."""
    from app.workers.scheduled_worker import poll_due_automations

    db = _make_db_for_automations()  # empty list

    with patch("app.workers.scheduled_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.scheduled_worker.run_scheduled_automation"
    ) as mock_task:
        result = poll_due_automations()

    assert result == {"dispatched": 0}
    mock_task.delay.assert_not_called()


# ── Test 2: Webhook → publish pipeline ───────────────────────────────────────


@pytest.mark.asyncio
async def test_publish_content_happy_path_sets_published_and_writes_audit_log() -> None:
    """
    publish_content() picks up an approved ContentQueue item, calls the MCP tool,
    sets status='published', and writes an AuditLog record.
    """
    from app.workers.publish_worker import _publish

    item = _make_content_item(status="approved", platform="twitter")
    auto = MagicMock()
    auto.id = item.automation_id
    auto.workspace_id = uuid.uuid4()

    db = MagicMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=False)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.add = MagicMock()

    item_result = MagicMock()
    item_result.scalar_one_or_none.return_value = item
    auto_result = MagicMock()
    auto_result.scalar_one.return_value = auto
    db.execute = AsyncMock(side_effect=[item_result, auto_result])

    with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.publish_worker.build_mcp_tool_call", new_callable=AsyncMock
    ) as mock_mcp:
        mock_mcp.return_value = {"post_id": "tw_123", "url": "https://x.com/status/123"}
        result = await _publish(item.id)

    # Status and published_at set
    assert result["status"] == "published"
    assert item.status == "published"
    assert item.published_at is not None

    # AuditLog written
    added = [c.args[0] for c in db.add.call_args_list]
    audit_logs = [o for o in added if isinstance(o, AuditLog)]
    assert len(audit_logs) == 1
    assert audit_logs[0].action == "content_published"
    assert audit_logs[0].log_metadata["platform"] == "twitter"
    assert audit_logs[0].log_metadata["status"] == "published"

    # MCP called with correct args
    mock_mcp.assert_awaited_once()
    call_args = mock_mcp.call_args
    assert call_args.args[1] == "social_create_post"
    assert call_args.args[2]["platform"] == "twitter"


@pytest.mark.asyncio
async def test_publish_content_mcp_failure_sets_failed_still_writes_audit() -> None:
    """A MCPCallError must set status='failed' but still commit and write audit log."""
    from app.workers.publish_worker import _publish

    item = _make_content_item(status="approved", platform="linkedin")
    auto = MagicMock()
    auto.id = item.automation_id
    auto.workspace_id = uuid.uuid4()

    db = MagicMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=False)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.add = MagicMock()

    item_result = MagicMock()
    item_result.scalar_one_or_none.return_value = item
    auto_result = MagicMock()
    auto_result.scalar_one.return_value = auto
    db.execute = AsyncMock(side_effect=[item_result, auto_result])

    with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.publish_worker.build_mcp_tool_call", new_callable=AsyncMock
    ) as mock_mcp:
        mock_mcp.side_effect = MCPCallError(
            "social_create_post", {"code": -32000, "message": "rate limited by Twitter"}
        )
        result = await _publish(item.id)

    assert result["status"] == "failed"
    assert item.status == "failed"

    # Audit log is STILL written (for observability)
    added = [c.args[0] for c in db.add.call_args_list]
    audit_logs = [o for o in added if isinstance(o, AuditLog)]
    assert len(audit_logs) == 1
    assert audit_logs[0].log_metadata["status"] == "failed"

    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_publish_content_race_guard_skips_non_approved_item() -> None:
    """If the item was already processed by another worker, skip silently."""
    from app.workers.publish_worker import _publish

    item = _make_content_item(status="published", platform="twitter")

    db = MagicMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=False)
    item_result = MagicMock()
    item_result.scalar_one_or_none.return_value = item
    db.execute = AsyncMock(return_value=item_result)

    with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
        "app.workers.publish_worker.build_mcp_tool_call", new_callable=AsyncMock
    ) as mock_mcp:
        result = await _publish(item.id)

    assert result["skipped"] is True
    mock_mcp.assert_not_awaited()


# ── Test 3: Content approval webhook ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_approve_and_publish_sets_approved_and_dispatches_task() -> None:
    """
    The approve_and_publish endpoint must:
    1. Set ContentQueue status to 'approved'
    2. Call publish_content.delay() with the correct content_queue_id
    3. Return the updated ContentQueue item
    """
    from app.api.webhooks import approve_and_publish

    item = _make_content_item(status="pending_approval", platform="twitter")
    item_id = item.id

    workspace = MagicMock()
    workspace.id = uuid.uuid4()

    db = MagicMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = item
    db.execute = AsyncMock(return_value=execute_result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.api.webhooks.publish_content") as mock_publish_task:
        returned_item = await approve_and_publish(item_id, workspace, db)

    # Status updated
    assert item.status == "approved"

    # Task dispatched with correct ID
    mock_publish_task.delay.assert_called_once_with(
        content_queue_id=str(item_id)
    )

    # DB committed
    db.commit.assert_awaited_once()

    # Endpoint returns the item
    assert returned_item is item


@pytest.mark.asyncio
async def test_approve_and_publish_raises_404_for_wrong_workspace() -> None:
    """A content item that belongs to a different workspace returns 404."""
    from fastapi import HTTPException

    from app.api.webhooks import approve_and_publish

    db = MagicMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None  # scoped query found nothing
    db.execute = AsyncMock(return_value=execute_result)

    workspace = MagicMock()
    workspace.id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await approve_and_publish(uuid.uuid4(), workspace, db)

    assert exc_info.value.status_code == 404
