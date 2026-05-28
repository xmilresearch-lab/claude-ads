"""Additional unit tests for the run_automation_task Celery task."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_run_result(status: str = "success") -> MagicMock:
    r = MagicMock()
    r.id = uuid.uuid4()
    r.status = status
    r.error = None
    r.ai_tokens_used = 450
    return r


# ── run_automation_task ────────────────────────────────────────────────────────


def test_run_automation_task_success_returns_run_info() -> None:
    """Task returns run metadata dict on successful orchestration."""
    run = _make_run_result("success")

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation", new_callable=AsyncMock, return_value=run):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task
        result = run_automation_task(str(uuid.uuid4()), {"trigger": "manual"})

    assert result["status"] == "success"
    assert result["run_id"] == str(run.id)
    assert result["ai_tokens_used"] == 450


def test_run_automation_task_re_raises_not_found_error() -> None:
    """Task re-raises AutomationNotFoundError without auto-retry."""
    from app.services.orchestration import AutomationNotFoundError

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation",
               new_callable=AsyncMock,
               side_effect=AutomationNotFoundError("not found")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task

        with pytest.raises(AutomationNotFoundError):
            run_automation_task(str(uuid.uuid4()), {})


def test_run_automation_task_re_raises_rate_limit_error() -> None:
    """Task re-raises RateLimitError without auto-retry."""
    from app.services.orchestration import RateLimitError

    with patch("app.workers.automation_tasks.AsyncSessionLocal") as mock_session, \
         patch("app.workers.automation_tasks.run_automation",
               new_callable=AsyncMock,
               side_effect=RateLimitError("too many runs")):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_session.return_value = mock_db

        from app.workers.automation_tasks import run_automation_task

        with pytest.raises(RateLimitError):
            run_automation_task(str(uuid.uuid4()), {})
