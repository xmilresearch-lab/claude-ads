"""
Unit tests for the Celery worker layer.

No live Celery broker, Redis, or Postgres needed.  All external I/O is mocked.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.scheduler_tasks import _is_due


# ── _is_due() helper ─────────────────────────────────────────────────────────


class TestIsDue:
    def test_returns_true_when_cron_fired_this_minute(self) -> None:
        # 09:15:05 — the "every minute" cron fired 5 seconds ago
        now = datetime(2025, 1, 1, 9, 15, 5, tzinfo=timezone.utc)
        assert _is_due("* * * * *", now) is True

    def test_returns_true_at_second_zero(self) -> None:
        now = datetime(2025, 1, 1, 9, 15, 0, tzinfo=timezone.utc)
        assert _is_due("* * * * *", now) is True

    def test_returns_false_for_hourly_cron_mid_hour(self) -> None:
        # "0 * * * *" only fires at xx:00 — should be False at xx:30
        now = datetime(2025, 1, 1, 9, 30, 0, tzinfo=timezone.utc)
        assert _is_due("0 * * * *", now) is False

    def test_returns_true_for_hourly_cron_at_top_of_hour(self) -> None:
        now = datetime(2025, 1, 1, 9, 0, 30, tzinfo=timezone.utc)
        assert _is_due("0 * * * *", now) is True

    def test_returns_false_for_invalid_cron(self) -> None:
        now = datetime(2025, 1, 1, 9, 0, 0, tzinfo=timezone.utc)
        assert _is_due("not-a-cron", now) is False

    def test_handles_naive_datetime(self) -> None:
        now = datetime(2025, 1, 1, 9, 15, 10)  # no tz
        assert _is_due("* * * * *", now) is True


# ── run_automation_task ──────────────────────────────────────────────────────


class TestRunAutomationTask:
    @patch("app.workers.automation_tasks.asyncio.run")
    @patch("app.workers.automation_tasks.AsyncSessionLocal")
    def test_happy_path_returns_result_dict(
        self, _mock_session: MagicMock, mock_asyncio_run: MagicMock
    ) -> None:
        from app.workers.automation_tasks import run_automation_task

        run_id = uuid.uuid4()
        mock_asyncio_run.return_value = {
            "run_id": str(run_id),
            "status": "success",
            "error": None,
            "ai_tokens_used": 200,
        }

        result = run_automation_task(str(uuid.uuid4()), {"topic": "test"})

        assert result["status"] == "success"
        assert result["run_id"] == str(run_id)
        assert result["ai_tokens_used"] == 200

    @patch("app.workers.automation_tasks.asyncio.run")
    @patch("app.workers.automation_tasks.AsyncSessionLocal")
    def test_automation_not_found_propagates(
        self, _mock_session: MagicMock, mock_asyncio_run: MagicMock
    ) -> None:
        from app.services.orchestration import AutomationNotFoundError
        from app.workers.automation_tasks import run_automation_task

        mock_asyncio_run.side_effect = AutomationNotFoundError("not found")

        with pytest.raises(AutomationNotFoundError):
            run_automation_task(str(uuid.uuid4()), {})

    @patch("app.workers.automation_tasks.asyncio.run")
    @patch("app.workers.automation_tasks.AsyncSessionLocal")
    def test_rate_limit_propagates_without_retry(
        self, _mock_session: MagicMock, mock_asyncio_run: MagicMock
    ) -> None:
        from app.services.orchestration import RateLimitError
        from app.workers.automation_tasks import run_automation_task

        mock_asyncio_run.side_effect = RateLimitError("limit reached")

        with pytest.raises(RateLimitError):
            run_automation_task(str(uuid.uuid4()), {})


# ── dispatch_scheduled_automations ──────────────────────────────────────────


class TestDispatchScheduledAutomations:
    @patch("app.workers.scheduler_tasks.run_automation_task")
    @patch("app.workers.scheduler_tasks.asyncio.run")
    def test_dispatches_due_automations(
        self, mock_asyncio_run: MagicMock, mock_task: MagicMock
    ) -> None:
        from app.workers.scheduler_tasks import dispatch_scheduled_automations

        mock_asyncio_run.return_value = 2

        result = dispatch_scheduled_automations()

        assert result == {"dispatched": 2}

    @patch("app.workers.scheduler_tasks.run_automation_task")
    @patch("app.workers.scheduler_tasks.asyncio.run")
    def test_zero_when_no_automations_due(
        self, mock_asyncio_run: MagicMock, mock_task: MagicMock
    ) -> None:
        from app.workers.scheduler_tasks import dispatch_scheduled_automations

        mock_asyncio_run.return_value = 0

        result = dispatch_scheduled_automations()

        assert result == {"dispatched": 0}
        mock_task.delay.assert_not_called()

    def test_is_due_filters_correctly_for_mixed_crons(self) -> None:
        """Verify the cron filter used inside dispatch selects only due automations."""
        from app.workers.scheduler_tasks import _is_due

        now = datetime(2025, 1, 1, 9, 15, 5, tzinfo=timezone.utc)
        # every-minute cron is due at 9:15:05
        assert _is_due("* * * * *", now) is True
        # hourly cron is NOT due at 9:15 (only at 9:00, 10:00, …)
        assert _is_due("0 * * * *", now) is False
