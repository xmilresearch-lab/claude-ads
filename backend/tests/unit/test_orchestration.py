import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.middleware.dlp_scanner import DLPCategory, DLPResult
from app.middleware.injection_scanner import SecurityError
from app.services.orchestration import (
    DAILY_LIMITS,
    AutomationNotFoundError,
    InactiveAutomationError,
    OrchestrationError,
    RateLimitError,
    call_claude_with_mcp,
    check_rate_limit,
    queue_or_publish,
    run_automation,
)


@pytest.fixture(autouse=True)
def _mock_publish_content():
    with (
        patch("app.workers.publish_worker.publish_content"),
        patch("app.workers.publish_worker.notify_pending_review"),
    ):
        yield


# ── helpers ────────────────────────────────────────────────────────────────


def _exec_result(value: object) -> MagicMock:
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    r.scalar_one.return_value = value
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
    for k, v in kwargs.items():
        setattr(a, k, v)
    return a


def _make_workspace(**kwargs: object) -> MagicMock:
    w = MagicMock()
    w.id = uuid.uuid4()
    w.name = "Test Workspace"
    w.brand_voice = None
    for k, v in kwargs.items():
        setattr(w, k, v)
    return w


_CLAUDE_RESULT = {
    "content": '{"platform": "twitter", "text": "Hello!", "hashtags": []}',
    "input_tokens": 100,
    "output_tokens": 50,
    "total_tokens": 150,
    "stop_reason": "end_turn",
    "mcp_tool_calls": [],
}

_CLEAN_DLP = DLPResult(
    has_violations=False,
    violations=[],
    redacted_content='{"platform": "twitter", "text": "Hello!", "hashtags": []}',
)

_DIRTY_DLP = DLPResult(
    has_violations=True,
    violations=[DLPCategory.EMAIL],
    redacted_content='{"platform": "twitter", "text": "Contact j***@x.com", "hashtags": []}',
)


# ── DAILY_LIMITS ───────────────────────────────────────────────────────────


def test_daily_limits_social_post() -> None:
    assert DAILY_LIMITS["social_post"] == 50


def test_daily_limits_email_campaign() -> None:
    assert DAILY_LIMITS["email_campaign"] == 1000


def test_daily_limits_support_reply() -> None:
    assert DAILY_LIMITS["support_reply"] == 500


def test_daily_limits_crm_update() -> None:
    assert DAILY_LIMITS["crm_update"] == 2000


# ── exception hierarchy ────────────────────────────────────────────────────


def test_rate_limit_error_is_orchestration_error() -> None:
    assert issubclass(RateLimitError, OrchestrationError)


def test_automation_not_found_is_orchestration_error() -> None:
    assert issubclass(AutomationNotFoundError, OrchestrationError)


def test_inactive_automation_is_orchestration_error() -> None:
    assert issubclass(InactiveAutomationError, OrchestrationError)


def test_orchestration_error_is_exception() -> None:
    assert issubclass(OrchestrationError, Exception)


# ── check_rate_limit ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_check_rate_limit_under_limit_no_exception() -> None:
    db = _make_db(3)  # 3 runs today, limit is 50
    await check_rate_limit(uuid.uuid4(), "social_post", db)


@pytest.mark.asyncio
async def test_check_rate_limit_at_limit_raises() -> None:
    db = _make_db(50)  # exactly at limit
    with pytest.raises(RateLimitError, match="50"):
        await check_rate_limit(uuid.uuid4(), "social_post", db)


@pytest.mark.asyncio
async def test_check_rate_limit_over_limit_raises() -> None:
    db = _make_db(1001)
    with pytest.raises(RateLimitError, match="1000"):
        await check_rate_limit(uuid.uuid4(), "email_campaign", db)


@pytest.mark.asyncio
async def test_check_rate_limit_unknown_type_uses_default() -> None:
    db = _make_db(99)  # default limit is 100
    await check_rate_limit(uuid.uuid4(), "unknown_type", db)


@pytest.mark.asyncio
async def test_check_rate_limit_unknown_type_at_default_raises() -> None:
    db = _make_db(100)
    with pytest.raises(RateLimitError):
        await check_rate_limit(uuid.uuid4(), "unknown_type", db)


@pytest.mark.asyncio
async def test_check_rate_limit_error_mentions_type() -> None:
    db = _make_db(50)
    with pytest.raises(RateLimitError, match="social_post"):
        await check_rate_limit(uuid.uuid4(), "social_post", db)


# ── queue_or_publish ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_queue_or_publish_no_approval_no_dlp_is_approved() -> None:
    auto = _make_automation(config={})
    db = _make_db()
    entry = await queue_or_publish(auto, {"platform": "twitter"}, _CLEAN_DLP, db)
    assert entry.status == "approved"


@pytest.mark.asyncio
async def test_queue_or_publish_require_approval_is_pending() -> None:
    auto = _make_automation(config={"require_approval": True})
    db = _make_db()
    entry = await queue_or_publish(auto, {"platform": "twitter"}, _CLEAN_DLP, db)
    assert entry.status == "pending_approval"


@pytest.mark.asyncio
async def test_queue_or_publish_dlp_violations_is_pending() -> None:
    auto = _make_automation(config={})
    db = _make_db()
    entry = await queue_or_publish(auto, {"platform": "twitter"}, _DIRTY_DLP, db)
    assert entry.status == "pending_approval"


@pytest.mark.asyncio
async def test_queue_or_publish_platform_from_content() -> None:
    auto = _make_automation()
    db = _make_db()
    entry = await queue_or_publish(
        auto, {"platform": "linkedin"}, _CLEAN_DLP, db
    )
    assert entry.platform == "linkedin"


@pytest.mark.asyncio
async def test_queue_or_publish_platform_fallback_to_type() -> None:
    auto = _make_automation(type="email_campaign")
    db = _make_db()
    entry = await queue_or_publish(auto, {}, _CLEAN_DLP, db)
    assert entry.platform == "email_campaign"


@pytest.mark.asyncio
async def test_queue_or_publish_flushes_db() -> None:
    auto = _make_automation()
    db = _make_db()
    await queue_or_publish(auto, {"platform": "twitter"}, _CLEAN_DLP, db)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_queue_or_publish_adds_to_db() -> None:
    auto = _make_automation()
    db = _make_db()
    await queue_or_publish(auto, {"platform": "twitter"}, _CLEAN_DLP, db)
    db.add.assert_called_once()


# ── call_claude_with_mcp ───────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_returns_required_keys(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    text_block = MagicMock(type="text", text="Hello!")
    mock_response = MagicMock(
        content=[text_block],
        stop_reason="end_turn",
    )
    mock_response.usage.input_tokens = 10
    mock_response.usage.output_tokens = 5
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    result = await call_claude_with_mcp("sys", "user", [])

    assert "content" in result
    assert "input_tokens" in result
    assert "output_tokens" in result
    assert "total_tokens" in result
    assert "stop_reason" in result
    assert "mcp_tool_calls" in result


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_extracts_text_content(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    text_block = MagicMock(type="text", text="Generated content")
    mock_response = MagicMock(content=[text_block], stop_reason="end_turn")
    mock_response.usage.input_tokens = 10
    mock_response.usage.output_tokens = 5
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    result = await call_claude_with_mcp("sys", "user", [])
    assert result["content"] == "Generated content"


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_sums_tokens(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    mock_response = MagicMock(content=[], stop_reason="end_turn")
    mock_response.usage.input_tokens = 100
    mock_response.usage.output_tokens = 50
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    result = await call_claude_with_mcp("sys", "user", [])
    assert result["total_tokens"] == 150
    assert result["input_tokens"] == 100
    assert result["output_tokens"] == 50


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_extracts_tool_use_blocks(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    tool_block = SimpleNamespace(type="mcp_tool_use", name="twitter_create_tweet", input={"text": "hi"})
    text_block = SimpleNamespace(type="text", text="Done")
    mock_response = MagicMock(content=[tool_block, text_block], stop_reason="end_turn")
    mock_response.usage.input_tokens = 10
    mock_response.usage.output_tokens = 5
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    result = await call_claude_with_mcp("sys", "user", [])
    assert len(result["mcp_tool_calls"]) == 1
    assert result["mcp_tool_calls"][0]["name"] == "twitter_create_tweet"


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_stop_reason_preserved(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    mock_response = MagicMock(content=[], stop_reason="max_tokens")
    mock_response.usage.input_tokens = 0
    mock_response.usage.output_tokens = 0
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    result = await call_claude_with_mcp("sys", "user", [])
    assert result["stop_reason"] == "max_tokens"


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_uses_configured_model(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    mock_response = MagicMock(content=[], stop_reason="end_turn")
    mock_response.usage.input_tokens = 0
    mock_response.usage.output_tokens = 0
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    await call_claude_with_mcp("sys", "user", [])
    call_kwargs = mock_client.beta.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-sonnet-4-20250514"


@pytest.mark.asyncio
@patch("app.services.orchestration.AsyncAnthropic")
async def test_call_claude_uses_mcp_beta(mock_cls: MagicMock) -> None:
    mock_client = MagicMock()
    mock_cls.return_value = mock_client
    mock_response = MagicMock(content=[], stop_reason="end_turn")
    mock_response.usage.input_tokens = 0
    mock_response.usage.output_tokens = 0
    mock_client.beta.messages.create = AsyncMock(return_value=mock_response)

    await call_claude_with_mcp("sys", "user", [])
    call_kwargs = mock_client.beta.messages.create.call_args.kwargs
    assert "mcp-client-2025-11-20" in call_kwargs["betas"]


# ── run_automation ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_automation_not_found_raises() -> None:
    db = _make_db(None)  # automation not found
    with pytest.raises(AutomationNotFoundError):
        await run_automation(uuid.uuid4(), {}, db)


@pytest.mark.asyncio
async def test_run_automation_inactive_raises() -> None:
    auto = _make_automation(active=False)
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    db = _make_db(auto, workspace)
    with pytest.raises(InactiveAutomationError):
        await run_automation(auto.id, {}, db)


@pytest.mark.asyncio
async def test_run_automation_rate_limit_raises() -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    db = _make_db(auto, workspace, 50)  # at limit
    with pytest.raises(RateLimitError):
        await run_automation(auto.id, {}, db)


@pytest.mark.asyncio
@patch("app.services.orchestration.require_clean")
async def test_run_automation_blocked_payload_returns_blocked_run(
    mock_require_clean: MagicMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.side_effect = SecurityError(
        "blocked", matched_patterns=["role_override"]
    )
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {"bad": "payload"}, db)

    assert result.status == "blocked"
    assert result.error is not None
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.orchestration.require_clean")
async def test_run_automation_blocked_does_not_call_claude(
    mock_require_clean: MagicMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.side_effect = SecurityError("blocked", matched_patterns=["dan"])
    db = _make_db(auto, workspace, 0)

    with patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock) as mock_claude:
        await run_automation(auto.id, {}, db)
        mock_claude.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_success_returns_success_status(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = '{"topic": "test"}'
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {"topic": "test"}, db)

    assert result.status == "success"


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_success_records_tokens(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {}, db)

    assert result.ai_tokens_used == 150


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_success_sets_finished_at(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {}, db)

    assert result.finished_at is not None


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_commits_once(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    await run_automation(auto.id, {}, db)

    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_dlp_violations_still_succeeds(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = {**_CLAUDE_RESULT, "content": '{"text": "j***@x.com"}'}
    mock_scan_output.return_value = _DIRTY_DLP
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {}, db)
    assert result.status == "success"
    assert "email" in result.result["dlp_violations"]


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.require_clean")
async def test_run_automation_claude_failure_returns_failed_run(
    mock_require_clean: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.side_effect = RuntimeError("API unavailable")
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {}, db)

    assert result.status == "failed"
    assert "API unavailable" in result.error


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.require_clean")
async def test_run_automation_claude_failure_still_commits(
    mock_require_clean: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.side_effect = RuntimeError("oops")
    db = _make_db(auto, workspace, 0)

    await run_automation(auto.id, {}, db)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_writes_audit_log(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    await run_automation(auto.id, {}, db)

    # db.add is called for: run + content_queue entry + audit_log
    assert db.add.call_count == 3


@pytest.mark.asyncio
@patch("app.services.orchestration.call_claude_with_mcp", new_callable=AsyncMock)
@patch("app.services.orchestration.scan_output")
@patch("app.services.orchestration.require_clean")
async def test_run_automation_result_contains_tokens(
    mock_require_clean: MagicMock,
    mock_scan_output: MagicMock,
    mock_call_claude: AsyncMock,
) -> None:
    auto = _make_automation()
    workspace = _make_workspace()
    workspace.id = auto.workspace_id
    mock_require_clean.return_value = "{}"
    mock_call_claude.return_value = _CLAUDE_RESULT
    mock_scan_output.return_value = _CLEAN_DLP
    db = _make_db(auto, workspace, 0)

    result = await run_automation(auto.id, {}, db)

    assert result.result["tokens"]["total"] == 150
    assert result.result["tokens"]["input"] == 100
    assert result.result["tokens"]["output"] == 50
