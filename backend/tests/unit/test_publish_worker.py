"""Unit tests for publish_worker — no live DB, MCP servers, or Celery broker."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.workers.publish_worker import MCPCallError


# ── MCPCallError ──────────────────────────────────────────────────────────────


class TestMCPCallError:
    def test_is_exception(self) -> None:
        exc = MCPCallError("social_create_post", {"code": -1, "message": "err"})
        assert isinstance(exc, Exception)

    def test_stores_tool_name_and_error(self) -> None:
        err = {"code": -32000, "message": "rate limited"}
        exc = MCPCallError("social_create_post", err)
        assert exc.tool_name == "social_create_post"
        assert exc.error == err

    def test_str_includes_tool_name(self) -> None:
        exc = MCPCallError("email_send", {"code": -1, "message": "bad"})
        assert "email_send" in str(exc)


# ── build_mcp_tool_call ───────────────────────────────────────────────────────


class TestBuildMcpToolCall:
    @pytest.mark.asyncio
    async def test_sends_jsonrpc_payload(self) -> None:
        from app.workers.publish_worker import build_mcp_tool_call

        mock_response = MagicMock()
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": "1", "result": {"ok": True}}
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch("app.workers.publish_worker.httpx.AsyncClient", return_value=mock_client):
            result = await build_mcp_tool_call(
                "http://localhost:3001",
                "social_create_post",
                {"platform": "twitter", "content": "Hello!"},
            )

        assert result == {"ok": True}
        call_kwargs = mock_client.post.call_args
        posted_json = call_kwargs.kwargs.get("json") or call_kwargs.args[1]
        assert posted_json["method"] == "tools/call"
        assert posted_json["params"]["name"] == "social_create_post"
        assert posted_json["params"]["arguments"]["platform"] == "twitter"

    @pytest.mark.asyncio
    async def test_adds_auth_header(self) -> None:
        from app.workers.publish_worker import build_mcp_tool_call

        mock_response = MagicMock()
        mock_response.json.return_value = {"result": {}}
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch("app.workers.publish_worker.httpx.AsyncClient", return_value=mock_client), patch(
            "app.workers.publish_worker.settings"
        ) as mock_settings:
            mock_settings.MCP_AUTH_TOKEN = "secret-token"
            await build_mcp_tool_call("http://localhost:3001", "social_create_post", {})

        headers = mock_client.post.call_args.kwargs.get("headers") or {}
        assert headers.get("Authorization") == "Bearer secret-token"

    @pytest.mark.asyncio
    async def test_raises_mcp_call_error_on_jsonrpc_error(self) -> None:
        from app.workers.publish_worker import build_mcp_tool_call

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": "1",
            "error": {"code": -32000, "message": "tool failed"},
        }
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch("app.workers.publish_worker.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(MCPCallError) as exc_info:
                await build_mcp_tool_call("http://localhost:3001", "social_create_post", {})

        assert exc_info.value.tool_name == "social_create_post"

    @pytest.mark.asyncio
    async def test_appends_mcp_path_to_server_url(self) -> None:
        from app.workers.publish_worker import build_mcp_tool_call

        mock_response = MagicMock()
        mock_response.json.return_value = {"result": {}}
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch("app.workers.publish_worker.httpx.AsyncClient", return_value=mock_client):
            await build_mcp_tool_call("http://localhost:3001", "social_create_post", {})

        posted_url = mock_client.post.call_args.args[0]
        assert posted_url == "http://localhost:3001/mcp"


# ── publish_content task ──────────────────────────────────────────────────────


class TestPublishContent:
    @patch("app.workers.publish_worker.asyncio.run")
    def test_happy_path_returns_published(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.publish_worker import publish_content

        cid = str(uuid.uuid4())
        mock_asyncio_run.return_value = {
            "content_queue_id": cid,
            "platform": "twitter",
            "status": "published",
        }

        result = publish_content(cid)

        assert result["status"] == "published"
        assert result["platform"] == "twitter"

    @patch("app.workers.publish_worker.asyncio.run")
    def test_not_approved_returns_skipped(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.publish_worker import publish_content

        mock_asyncio_run.return_value = {"skipped": True, "reason": "not_approved"}
        result = publish_content(str(uuid.uuid4()))
        assert result["skipped"] is True

    @patch("app.workers.publish_worker.asyncio.run")
    def test_connect_error_triggers_retry(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.publish_worker import publish_content

        mock_asyncio_run.side_effect = httpx.ConnectError("connection refused")

        with pytest.raises(Exception):
            publish_content(str(uuid.uuid4()))

    @patch("app.workers.publish_worker.asyncio.run")
    def test_timeout_triggers_retry(self, mock_asyncio_run: MagicMock) -> None:
        from app.workers.publish_worker import publish_content

        mock_asyncio_run.side_effect = httpx.TimeoutException("timed out")

        with pytest.raises(Exception):
            publish_content(str(uuid.uuid4()))


# ── _publish (async inner function) ──────────────────────────────────────────


class TestPublishInternal:
    def _make_item(self, status: str = "approved", platform: str = "twitter") -> MagicMock:
        item = MagicMock(spec=["id", "status", "content", "platform", "automation_id", "published_at"])
        item.id = uuid.uuid4()
        item.status = status
        item.platform = platform
        item.content = {"text": "Hello world!", "platform": platform}
        item.automation_id = uuid.uuid4()
        item.published_at = None
        return item

    def _make_automation(self, item: MagicMock) -> MagicMock:
        auto = MagicMock()
        auto.id = item.automation_id
        auto.workspace_id = uuid.uuid4()
        return auto

    @pytest.mark.asyncio
    async def test_sets_published_on_success(self) -> None:
        from app.workers.publish_worker import _publish

        item = self._make_item("approved", "twitter")
        automation = self._make_automation(item)

        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        db.add = MagicMock()

        item_result = MagicMock()
        item_result.scalar_one_or_none.return_value = item
        auto_result = MagicMock()
        auto_result.scalar_one.return_value = automation
        db.execute = AsyncMock(side_effect=[item_result, auto_result])

        with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
            "app.workers.publish_worker._call_mcp_for_platform", new_callable=AsyncMock
        ) as mock_mcp:
            mock_mcp.return_value = {"post_id": "123"}
            result = await _publish(item.id)

        assert result["status"] == "published"
        assert item.status == "published"
        assert item.published_at is not None

    @pytest.mark.asyncio
    async def test_skips_when_not_approved(self) -> None:
        from app.workers.publish_worker import _publish

        item = self._make_item("pending_approval", "twitter")

        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        item_result = MagicMock()
        item_result.scalar_one_or_none.return_value = item
        db.execute = AsyncMock(return_value=item_result)

        with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db):
            result = await _publish(item.id)

        assert result["skipped"] is True
        assert result["reason"] == "not_approved"

    @pytest.mark.asyncio
    async def test_sets_failed_on_mcp_error(self) -> None:
        from app.workers.publish_worker import _publish

        item = self._make_item("approved", "twitter")
        automation = self._make_automation(item)

        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        db.add = MagicMock()

        item_result = MagicMock()
        item_result.scalar_one_or_none.return_value = item
        auto_result = MagicMock()
        auto_result.scalar_one.return_value = automation
        db.execute = AsyncMock(side_effect=[item_result, auto_result])

        with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
            "app.workers.publish_worker._call_mcp_for_platform", new_callable=AsyncMock
        ) as mock_mcp:
            mock_mcp.side_effect = MCPCallError("social_create_post", {"code": -1, "message": "fail"})
            result = await _publish(item.id)

        assert result["status"] == "failed"
        assert item.status == "failed"

    @pytest.mark.asyncio
    async def test_writes_audit_log(self) -> None:
        from app.models.audit_log import AuditLog
        from app.workers.publish_worker import _publish

        item = self._make_item("approved", "email")
        automation = self._make_automation(item)

        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        db.add = MagicMock()

        item_result = MagicMock()
        item_result.scalar_one_or_none.return_value = item
        auto_result = MagicMock()
        auto_result.scalar_one.return_value = automation
        db.execute = AsyncMock(side_effect=[item_result, auto_result])

        with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db), patch(
            "app.workers.publish_worker._call_mcp_for_platform", new_callable=AsyncMock
        ):
            await _publish(item.id)

        added_objects = [c.args[0] for c in db.add.call_args_list]
        audit_logs = [o for o in added_objects if isinstance(o, AuditLog)]
        assert len(audit_logs) == 1
        assert audit_logs[0].action == "content_published"
        assert audit_logs[0].log_metadata["platform"] == "email"

    @pytest.mark.asyncio
    async def test_skips_when_item_not_found(self) -> None:
        from app.workers.publish_worker import _publish

        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        not_found_result = MagicMock()
        not_found_result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=not_found_result)

        with patch("app.workers.publish_worker.AsyncSessionLocal", return_value=db):
            result = await _publish(uuid.uuid4())

        assert result["skipped"] is True
        assert result["reason"] == "not_found"
