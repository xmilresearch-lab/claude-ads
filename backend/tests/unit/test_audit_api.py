"""Unit tests for the audit log API endpoints."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.schemas.audit_log import AuditLogResponse, AuditLogSummary


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    return Request(scope)


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _make_workspace(workspace_id: uuid.UUID | None = None) -> MagicMock:
    w = MagicMock()
    w.id = workspace_id or uuid.uuid4()
    return w


def _make_log(workspace_id: uuid.UUID, action: str = "automation_run") -> MagicMock:
    log = MagicMock()
    log.id = uuid.uuid4()
    log.workspace_id = workspace_id
    log.action = action
    log.actor = "system"
    log.log_metadata = {"tokens_used": 100, "dlp_violations": []}
    log.created_at = datetime.now(tz=timezone.utc)
    return log


# ── list_logs ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_logs_returns_workspace_logs() -> None:
    """list_logs returns logs matching the caller's workspace_id."""
    from app.api.audit_logs import list_logs

    workspace = _make_workspace()
    log = _make_log(workspace.id)

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [log]
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_mock

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    result = await list_logs(_make_request(), workspace, db, limit=50, offset=0)
    assert result == [log]
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_logs_empty_workspace_returns_empty() -> None:
    from app.api.audit_logs import list_logs

    workspace = _make_workspace()

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_mock

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    result = await list_logs(_make_request(), workspace, db, limit=50, offset=0)
    assert result == []


# ── get_log ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_log_returns_own_workspace_log() -> None:
    from app.api.audit_logs import get_log

    workspace = _make_workspace()
    log = _make_log(workspace.id)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = log

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    result = await get_log(_make_request(), log.id, workspace, db)
    assert result is log


@pytest.mark.asyncio
async def test_get_log_not_found_raises_404() -> None:
    from app.api.audit_logs import get_log

    workspace = _make_workspace()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with pytest.raises(HTTPException) as exc_info:
        await get_log(_make_request(), uuid.uuid4(), workspace, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_log_other_workspace_raises_403() -> None:
    """Attempting to access another workspace's log returns 403."""
    from app.api.audit_logs import get_log

    workspace = _make_workspace()
    other_workspace_id = uuid.uuid4()
    log = _make_log(other_workspace_id)  # belongs to a different workspace

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = log

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with pytest.raises(HTTPException) as exc_info:
        await get_log(_make_request(), log.id, workspace, db)
    assert exc_info.value.status_code == 403


# ── get_summary ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_summary_stats_calculated_correctly() -> None:
    """Summary aggregates run counts, DLP violations, tokens, and published content."""
    from app.api.audit_logs import get_summary

    workspace = _make_workspace()

    # Mock 1: run counts by status → [("success", 3), ("failed", 1), ("blocked", 2)]
    run_counts_result = MagicMock()
    run_counts_result.all.return_value = [("success", 3), ("failed", 1), ("blocked", 2)]

    # Mock 2: automation_run audit logs — one with DLP, one without
    log_with_dlp = MagicMock()
    log_with_dlp.log_metadata = {"tokens_used": 100, "dlp_violations": ["email"]}
    log_without_dlp = MagicMock()
    log_without_dlp.log_metadata = {"tokens_used": 50, "dlp_violations": []}

    run_logs_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [log_with_dlp, log_without_dlp]
    run_logs_result.scalars.return_value = scalars_mock

    # Mock 3: content published count
    published_result = MagicMock()
    published_result.scalar_one.return_value = 5

    db = MagicMock()
    db.execute = AsyncMock(
        side_effect=[run_counts_result, run_logs_result, published_result]
    )

    result = await get_summary(_make_request(), workspace, db)

    assert result.total_runs == 6
    assert result.successful_runs == 3
    assert result.failed_runs == 1
    assert result.blocked_injections == 2
    assert result.dlp_violations == 1  # only log_with_dlp has non-empty list
    assert result.tokens_used == 150   # 100 + 50
    assert result.content_published == 5


@pytest.mark.asyncio
async def test_summary_with_no_runs_returns_zeros() -> None:
    from app.api.audit_logs import get_summary

    workspace = _make_workspace()

    run_counts_result = MagicMock()
    run_counts_result.all.return_value = []

    run_logs_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    run_logs_result.scalars.return_value = scalars_mock

    published_result = MagicMock()
    published_result.scalar_one.return_value = 0

    db = MagicMock()
    db.execute = AsyncMock(
        side_effect=[run_counts_result, run_logs_result, published_result]
    )

    result = await get_summary(_make_request(), workspace, db)

    assert result.total_runs == 0
    assert result.successful_runs == 0
    assert result.tokens_used == 0
    assert result.content_published == 0


# ── AuditLogResponse sanitization ─────────────────────────────────────────────


def test_audit_log_response_sanitizes_sensitive_keys() -> None:
    """AuditLogResponse removes metadata keys that look like credential data."""
    log_data = {
        "id": uuid.uuid4(),
        "workspace_id": uuid.uuid4(),
        "action": "credential_rotated",
        "actor": "system",
        "log_metadata": {
            "integration_id": "abc-123",
            "access_token": "should-be-removed",
            "refresh_token": "also-removed",
            "integration_type": "twitter",
        },
        "created_at": datetime.now(tz=timezone.utc),
    }
    response = AuditLogResponse(**log_data)
    assert "access_token" not in response.log_metadata  # type: ignore[operator]
    assert "refresh_token" not in response.log_metadata  # type: ignore[operator]
    assert response.log_metadata["integration_id"] == "abc-123"
    assert response.log_metadata["integration_type"] == "twitter"


def test_audit_log_response_none_metadata_stays_none() -> None:
    log_data = {
        "id": uuid.uuid4(),
        "workspace_id": uuid.uuid4(),
        "action": "automation_run",
        "actor": "system",
        "log_metadata": None,
        "created_at": datetime.now(tz=timezone.utc),
    }
    response = AuditLogResponse(**log_data)
    assert response.log_metadata is None
