"""Unit tests for scheduled_worker — covers run_scheduled_automation and poll_due_automations."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_run_result(status: str = "success") -> MagicMock:
    r = MagicMock()
    r.id = uuid.uuid4()
    r.status = status
    r.error = None
    r.ai_tokens_used = 300
    return r


def _make_automation(schedule: str | None = "0 9 * * *") -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.name = "Scheduled Post"
    a.schedule = schedule
    a.active = True
    return a


def _scalars_list(items: list) -> MagicMock:
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    return m


# ── run_scheduled_automation ───────────────────────────────────────────────────


def test_run_scheduled_automation_success_returns_run_info() -> None:
    """Task returns run metadata on successful orchestration."""
    run = _make_run_result("success")

    with patch("app.workers.scheduled_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduled_worker.run_automation",
               new_callable=AsyncMock,
               return_value=run):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.scheduled_worker import run_scheduled_automation
        result = run_scheduled_automation(
            str(uuid.uuid4()),
            {"trigger": "schedule"},
            request_id="req-abc",
        )

    assert result["status"] == "success"
    assert result["run_id"] == str(run.id)
    assert result["ai_tokens_used"] == 300


def test_run_scheduled_automation_re_raises_generic_exception() -> None:
    """Task re-raises unexpected exceptions (for Celery retry logic)."""
    with patch("app.workers.scheduled_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduled_worker.run_automation",
               new_callable=AsyncMock,
               side_effect=RuntimeError("db gone")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.scheduled_worker import run_scheduled_automation

        with pytest.raises(RuntimeError, match="db gone"):
            run_scheduled_automation(str(uuid.uuid4()), {})


# ── poll_due_automations ───────────────────────────────────────────────────────


def test_poll_due_automations_skips_empty_schedule_string() -> None:
    """poll_due_automations skips automations whose schedule is an empty string."""
    # The DB filter returns automation with schedule.isnot(None), but the
    # schedule field could still be an empty string "". The `if not automation.schedule`
    # guard handles this case (line 126 — the continue branch).
    automation_empty = _make_automation(schedule="")

    with patch("app.workers.scheduled_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduled_worker.run_scheduled_automation.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation_empty]))
        mock_session.return_value = mock_db

        from app.workers.scheduled_worker import poll_due_automations
        result = poll_due_automations()

    assert result["dispatched"] == 0
    mock_delay.assert_not_called()


def test_poll_due_automations_returns_dispatched_count() -> None:
    """poll_due_automations returns dispatched=0 when no automations are due."""
    with patch("app.workers.scheduled_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduled_worker.run_scheduled_automation.delay") as mock_delay, \
         patch("app.workers.scheduled_worker._is_due", return_value=False):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        automation = _make_automation(schedule="0 9 * * MON-FRI")
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduled_worker import poll_due_automations
        result = poll_due_automations()

    assert result["dispatched"] == 0
    mock_delay.assert_not_called()
