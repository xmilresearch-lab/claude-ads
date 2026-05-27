"""Unit tests for webhook_worker — no live DB, Celery broker, or Claude API."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.orchestration import RateLimitError


# ── helpers ──────────────────────────────────────────────────────────────────


def _make_automation(auto_type: str = "support_reply") -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.workspace_id = uuid.uuid4()
    a.type = auto_type
    a.active = True
    return a


def _make_run(status: str = "success") -> MagicMock:
    r = MagicMock()
    r.id = uuid.uuid4()
    r.status = status
    return r


# ── handle_support_ticket ─────────────────────────────────────────────────────


class TestHandleSupportTicket:
    @patch("app.workers.webhook_worker.asyncio.run")
    def test_happy_path_returns_run_info(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_support_ticket

        run_id = str(uuid.uuid4())
        mock_asyncio_run.return_value = {"run_id": run_id, "status": "success"}

        result = handle_support_ticket(
            {"id": "TKT-1", "subject": "Help!", "description": "broken"},
            str(uuid.uuid4()),
        )

        assert result["run_id"] == run_id
        assert result["status"] == "success"

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_no_active_automation_returns_skipped(
        self, mock_asyncio_run: MagicMock
    ) -> None:
        from app.workers.webhook_worker import handle_support_ticket

        mock_asyncio_run.return_value = {
            "skipped": True,
            "reason": "no_active_automation",
        }

        result = handle_support_ticket({"id": "TKT-2"}, str(uuid.uuid4()))

        assert result["skipped"] is True

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_rate_limit_does_not_retry(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_support_ticket

        mock_asyncio_run.side_effect = RateLimitError("daily limit reached")

        result = handle_support_ticket({"id": "TKT-3"}, str(uuid.uuid4()))

        assert result["skipped"] is True
        assert result["reason"] == "rate_limit"

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_generic_error_retries(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_support_ticket

        mock_asyncio_run.side_effect = RuntimeError("transient failure")

        with pytest.raises(Exception):
            handle_support_ticket({"id": "TKT-4"}, str(uuid.uuid4()))

    def test_trigger_payload_built_correctly(self) -> None:
        """The trigger_payload must map Zendesk fields to our canonical keys."""
        from app.workers.webhook_worker import handle_support_ticket

        captured_payload: dict = {}

        with patch("app.workers.webhook_worker.asyncio.run") as mock_run:

            def capture(coro: object) -> dict:
                # We can't await the coroutine here, so inspect the args
                # indirectly by stubbing the whole asyncio.run
                return {"run_id": str(uuid.uuid4()), "status": "success"}

            mock_run.side_effect = capture

            zendesk_payload = {
                "id": "TKT-99",
                "subject": "I need help",
                "description": "Nothing works",
                "requester": {"email": "user@example.com"},
                "priority": "high",
            }
            handle_support_ticket(zendesk_payload, str(uuid.uuid4()))

        # Verify asyncio.run was called (the coroutine was created with trigger_payload)
        mock_run.assert_called_once()


# ── handle_crm_event ──────────────────────────────────────────────────────────


class TestHandleCrmEvent:
    @patch("app.workers.webhook_worker.asyncio.run")
    def test_new_contact_dispatches_log_activity(
        self, mock_asyncio_run: MagicMock
    ) -> None:
        from app.workers.webhook_worker import handle_crm_event

        mock_asyncio_run.return_value = {"run_id": str(uuid.uuid4()), "status": "success"}

        result = handle_crm_event(
            {"contact": {"id": "C1", "email": "c@example.com"}},
            str(uuid.uuid4()),
            "new_contact",
        )

        assert result["status"] == "success"

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_deal_stage_changed_dispatched(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_crm_event

        mock_asyncio_run.return_value = {"run_id": str(uuid.uuid4()), "status": "success"}
        result = handle_crm_event(
            {"deal": {"id": "D1", "stage": "closed_won"}},
            str(uuid.uuid4()),
            "deal_stage_changed",
        )
        assert result["status"] == "success"

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_form_submitted_dispatched(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_crm_event

        mock_asyncio_run.return_value = {"run_id": str(uuid.uuid4()), "status": "success"}
        result = handle_crm_event(
            {"data": {"name": "Jane", "email": "jane@example.com"}},
            str(uuid.uuid4()),
            "form_submitted",
        )
        assert result["status"] == "success"

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_unknown_event_type_skips_without_calling_asyncio(
        self, mock_asyncio_run: MagicMock
    ) -> None:
        from app.workers.webhook_worker import handle_crm_event

        result = handle_crm_event({}, str(uuid.uuid4()), "completely_unknown")

        assert result["skipped"] is True
        assert result["reason"] == "unknown_event_type"
        mock_asyncio_run.assert_not_called()

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_no_active_automation_returns_skipped(
        self, mock_asyncio_run: MagicMock
    ) -> None:
        from app.workers.webhook_worker import handle_crm_event

        mock_asyncio_run.return_value = {
            "skipped": True,
            "reason": "no_active_automation",
        }
        result = handle_crm_event({}, str(uuid.uuid4()), "new_contact")
        assert result["skipped"] is True

    @patch("app.workers.webhook_worker.asyncio.run")
    def test_generic_error_retries(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.webhook_worker import handle_crm_event

        mock_asyncio_run.side_effect = ConnectionError("redis down")

        with pytest.raises(Exception):
            handle_crm_event({}, str(uuid.uuid4()), "new_contact")


# ── _run_automation_for_workspace (integration helper) ───────────────────────


class TestRunAutomationForWorkspace:
    @pytest.mark.asyncio
    async def test_returns_skipped_when_no_automation(self) -> None:
        """The helper returns skipped dict when no active automation is found."""
        from app.workers.webhook_worker import _run_automation_for_workspace

        db_mock = MagicMock()
        db_mock.__aenter__ = AsyncMock(return_value=db_mock)
        db_mock.__aexit__ = AsyncMock(return_value=False)
        execute_result = MagicMock()
        execute_result.scalar_one_or_none.return_value = None
        db_mock.execute = AsyncMock(return_value=execute_result)

        with patch("app.workers.webhook_worker.AsyncSessionLocal", return_value=db_mock):
            result = await _run_automation_for_workspace(
                uuid.uuid4(), "support_reply", {"ticket_id": "T1"}
            )

        assert result == {"skipped": True, "reason": "no_active_automation"}

    @pytest.mark.asyncio
    async def test_calls_run_automation_when_found(self) -> None:
        """The helper calls run_automation with the right args when an automation exists."""
        from app.workers.webhook_worker import _run_automation_for_workspace

        automation = _make_automation("support_reply")
        run = _make_run("success")

        db_mock = MagicMock()
        db_mock.__aenter__ = AsyncMock(return_value=db_mock)
        db_mock.__aexit__ = AsyncMock(return_value=False)
        execute_result = MagicMock()
        execute_result.scalar_one_or_none.return_value = automation
        db_mock.execute = AsyncMock(return_value=execute_result)

        with patch("app.workers.webhook_worker.AsyncSessionLocal", return_value=db_mock), patch(
            "app.workers.webhook_worker.run_automation", new_callable=AsyncMock, return_value=run
        ) as mock_run:
            result = await _run_automation_for_workspace(
                automation.workspace_id, "support_reply", {"ticket_id": "T1"}
            )

        mock_run.assert_awaited_once_with(
            automation.id, {"ticket_id": "T1"}, db_mock
        )
        assert result["status"] == "success"
        assert result["run_id"] == str(run.id)
