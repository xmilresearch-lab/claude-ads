"""Unit tests for scheduler_tasks — cron dispatch and _is_due logic."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from freezegun import freeze_time


def _make_automation(schedule: str | None = "0 9 * * MON-FRI", active: bool = True) -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.name = "Daily Post"
    a.schedule = schedule
    a.active = active
    return a


def _scalars_list(items: list) -> MagicMock:
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    return m


# ── _is_due ────────────────────────────────────────────────────────────────────


def test_is_due_returns_true_when_cron_matches_current_minute() -> None:
    """_is_due returns True when now is within the current cron minute window."""
    from app.workers.scheduler_tasks import _is_due

    # 09:00:00 on a Monday — cron "0 9 * * MON-FRI" should be due
    now = datetime(2024, 1, 8, 9, 0, 0, tzinfo=timezone.utc)
    assert _is_due("0 9 * * MON-FRI", now) is True


def test_is_due_returns_false_when_outside_cron_window() -> None:
    """_is_due returns False when current minute does not match cron."""
    from app.workers.scheduler_tasks import _is_due

    # 09:01:00 is outside the "0 9 * * MON-FRI" window
    now = datetime(2024, 1, 8, 9, 1, 30, tzinfo=timezone.utc)
    assert _is_due("0 9 * * MON-FRI", now) is False


def test_is_due_returns_false_for_invalid_cron() -> None:
    """_is_due returns False (safe default) for invalid cron expressions."""
    from app.workers.scheduler_tasks import _is_due

    now = datetime(2024, 1, 8, 9, 0, 0, tzinfo=timezone.utc)
    assert _is_due("not a valid cron", now) is False


def test_is_due_works_with_every_minute_cron() -> None:
    """_is_due returns True for '* * * * *' (always due)."""
    from app.workers.scheduler_tasks import _is_due

    now = datetime(2024, 1, 8, 14, 23, 5, tzinfo=timezone.utc)
    assert _is_due("* * * * *", now) is True


def test_is_due_at_exact_minute_boundary() -> None:
    """_is_due captures the exact second-0 boundary of a cron minute."""
    from app.workers.scheduler_tasks import _is_due

    # Exactly at the trigger second
    now = datetime(2024, 1, 8, 9, 0, 0, tzinfo=timezone.utc)
    assert _is_due("0 9 * * *", now) is True

    # 59 seconds later — still within the same minute window
    now_59 = datetime(2024, 1, 8, 9, 0, 59, tzinfo=timezone.utc)
    assert _is_due("0 9 * * *", now_59) is True


# ── dispatch_scheduled_automations ────────────────────────────────────────────


@freeze_time("2024-01-08 09:00:00")
def test_dispatch_runs_due_automations() -> None:
    """dispatch_scheduled_automations dispatches tasks for due automations."""
    automation = _make_automation(schedule="0 9 * * *")

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 1
    mock_delay.assert_called_once_with(
        str(automation.id),
        {"trigger": "schedule", "cron": "0 9 * * *"},
    )


@freeze_time("2024-01-08 09:01:00")
def test_dispatch_skips_automations_not_due() -> None:
    """dispatch_scheduled_automations skips automations not due in current minute."""
    automation = _make_automation(schedule="0 9 * * *")  # due at 09:00, not 09:01

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 0
    mock_delay.assert_not_called()


@freeze_time("2024-01-08 09:00:00")
def test_dispatch_skips_automations_with_no_schedule() -> None:
    """dispatch_scheduled_automations skips automations with no cron schedule."""
    webhook_automation = _make_automation(schedule=None)

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([webhook_automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 0
    mock_delay.assert_not_called()


@freeze_time("2024-01-08 09:00:00")
def test_dispatch_returns_zero_when_no_automations() -> None:
    """dispatch_scheduled_automations returns dispatched=0 when DB is empty."""
    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 0


# ── Required named tests ───────────────────────────────────────────────────────


@freeze_time("2024-01-08 09:01:00")
def test_scheduler_skips_inactive_automation() -> None:
    """Automation whose cron is not due in this minute is not dispatched."""
    # Active automation but cron fires at 09:00, not 09:01
    automation = _make_automation(schedule="0 9 * * *")

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 0
    mock_delay.assert_not_called()


@freeze_time("2024-01-08 09:00:00")
def test_scheduler_dispatches_active_automation() -> None:
    """Active automation with a due cron schedule is dispatched exactly once."""
    automation = _make_automation(schedule="0 9 * * *")

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 1
    mock_delay.assert_called_once_with(
        str(automation.id),
        {"trigger": "schedule", "cron": "0 9 * * *"},
    )


@freeze_time("2024-01-08 09:00:00")
def test_scheduler_handles_dispatch_error_gracefully() -> None:
    """When run_automation_task.delay raises, exception propagates (Celery retries)."""
    automation = _make_automation(schedule="0 9 * * *")

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay",
               side_effect=RuntimeError("broker unavailable")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalars_list([automation]))
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        with pytest.raises(RuntimeError, match="broker unavailable"):
            dispatch_scheduled_automations()


@freeze_time("2024-01-08 09:00:00")
def test_scheduler_respects_workspace_rate_limit() -> None:
    """Only automations that are due in this minute are dispatched; others are skipped."""
    due_automation = _make_automation(schedule="0 9 * * *")       # due at 09:00 ✓
    not_due_automation = _make_automation(schedule="0 10 * * *")   # due at 10:00 ✗

    with patch("app.workers.scheduler_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.scheduler_tasks.run_automation_task.delay") as mock_delay:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(
            return_value=_scalars_list([due_automation, not_due_automation])
        )
        mock_session.return_value = mock_db

        from app.workers.scheduler_tasks import dispatch_scheduled_automations
        result = dispatch_scheduled_automations()

    assert result["dispatched"] == 1
    mock_delay.assert_called_once_with(
        str(due_automation.id),
        {"trigger": "schedule", "cron": "0 9 * * *"},
    )
