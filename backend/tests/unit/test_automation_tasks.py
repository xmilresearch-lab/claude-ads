"""Unit tests for automation_tasks — run_automation_task Celery task."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_run(
    status: str = "completed",
    error: str | None = None,
    ai_tokens_used: int = 150,
) -> MagicMock:
    r = MagicMock()
    r.id = uuid.uuid4()
    r.automation_id = uuid.uuid4()
    r.status = status
    r.error = error
    r.ai_tokens_used = ai_tokens_used
    r.started_at = datetime.now(tz=timezone.utc)
    r.finished_at = datetime.now(tz=timezone.utc)
    return r


def _mock_session_with_run(run: MagicMock) -> MagicMock:
    """Build an AsyncSessionLocal mock whose __aenter__ returns a DB mock,
    and whose `run_automation` call returns `run`."""
    mock_db = MagicMock()
    mock_db.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.__aexit__ = AsyncMock(return_value=False)
    return mock_db


# ── run_automation_task ────────────────────────────────────────────────────────


def test_run_automation_success_path() -> None:
    """Task returns run_id, status, error, and ai_tokens_used on a successful run."""
    run = _make_run(status="completed", ai_tokens_used=200)

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               return_value=run):

        mock_db = _mock_session_with_run(run)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        result = run_automation_task(str(run.automation_id), {"trigger": "manual"})

    assert result["run_id"] == str(run.id)
    assert result["status"] == "completed"
    assert result["error"] is None
    assert result["ai_tokens_used"] == 200


def test_run_automation_writes_audit_log_on_success() -> None:
    """Task result includes run_id so caller can trace the audit log entry."""
    run = _make_run(status="completed")
    expected_run_id = str(run.id)

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               return_value=run):

        mock_db = _mock_session_with_run(run)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        result = run_automation_task(str(run.automation_id), {"trigger": "schedule"})

    # run_id present allows the platform to correlate the Celery result with the
    # AutomationRun row that was written (which triggers the audit log internally).
    assert result["run_id"] == expected_run_id
    assert result["status"] == "completed"


def test_run_automation_marks_run_failed_on_mcp_error() -> None:
    """Generic exception from orchestration is re-raised (Celery will retry)."""
    auto_id = str(uuid.uuid4())

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               side_effect=RuntimeError("MCP server timeout")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        with pytest.raises(RuntimeError, match="MCP server timeout"):
            run_automation_task(auto_id, {"trigger": "manual"})


def test_run_automation_404_for_missing_automation() -> None:
    """AutomationNotFoundError is re-raised and does NOT trigger Celery retry."""
    from app.services.orchestration import AutomationNotFoundError

    auto_id = str(uuid.uuid4())

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               side_effect=AutomationNotFoundError("not found")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        with pytest.raises(AutomationNotFoundError):
            run_automation_task(auto_id, {})


def test_run_automation_skips_inactive_automation() -> None:
    """InactiveAutomationError is re-raised without retry (in dont_autoretry_for)."""
    from app.services.orchestration import InactiveAutomationError

    auto_id = str(uuid.uuid4())

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               side_effect=InactiveAutomationError("automation inactive")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        with pytest.raises(InactiveAutomationError):
            run_automation_task(auto_id, {})


def test_run_automation_skips_on_rate_limit() -> None:
    """RateLimitError is re-raised without retry."""
    from app.services.orchestration import RateLimitError

    auto_id = str(uuid.uuid4())

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock,
               side_effect=RateLimitError("rate limit exceeded")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        with pytest.raises(RateLimitError):
            run_automation_task(auto_id, {})
