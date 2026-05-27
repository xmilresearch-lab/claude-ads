import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


class MCPCallError(Exception):
    def __init__(self, tool_name: str, error: dict[str, Any]) -> None:
        self.tool_name = tool_name
        self.error = error
        super().__init__(f"MCP tool {tool_name!r} returned error: {error}")


async def build_mcp_tool_call(
    server_url: str,
    tool_name: str,
    args: dict[str, Any],
) -> dict[str, Any]:
    """Send a JSON-RPC 2.0 tools/call to an MCP server and return the result dict."""
    payload = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": args},
    }
    headers = {
        "Authorization": f"Bearer {settings.MCP_AUTH_TOKEN}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{server_url}/mcp", json=payload, headers=headers)
        response.raise_for_status()
        data: dict[str, Any] = response.json()

    if "error" in data:
        raise MCPCallError(tool_name, data["error"])

    result: dict[str, Any] = data.get("result", {})
    return result


async def _call_mcp_for_platform(
    platform: str,
    item: ContentQueue,
) -> dict[str, Any]:
    """Dispatch to the correct MCP server based on content platform."""
    match platform:
        case "twitter" | "linkedin":
            return await build_mcp_tool_call(
                settings.SOCIAL_MCP_URL,
                "social_create_post",
                {
                    "platform": platform,
                    "content": item.content.get("text", ""),
                    "media_urls": item.content.get("media_urls"),
                },
            )
        case "email":
            return await build_mcp_tool_call(
                settings.EMAIL_MCP_URL,
                "email_send",
                {
                    "provider": "sendgrid",
                    "to": item.content.get("to", ""),
                    "subject": item.content.get("subject", ""),
                    "body": item.content.get("text", ""),
                },
            )
        case "zendesk_reply":
            return await build_mcp_tool_call(
                settings.EMAIL_MCP_URL,
                "support_auto_reply",
                {
                    "ticket_id": item.content.get("ticket_id", ""),
                    "reply_body": item.content.get("text", ""),
                },
            )
        case _:
            raise MCPCallError(
                "unknown",
                {"code": -1, "message": f"Unsupported platform: {platform!r}"},
            )


async def _publish(
    content_queue_id: uuid.UUID,
    request_id: str | None = None,
) -> dict[str, Any]:
    async with AsyncSessionLocal() as db:
        # 1. Fetch the content queue item
        result = await db.execute(
            select(ContentQueue).where(ContentQueue.id == content_queue_id)
        )
        item = result.scalar_one_or_none()
        if item is None:
            logger.warning("content item %s not found", content_queue_id)
            return {"skipped": True, "reason": "not_found"}

        # 2. Race-condition guard
        if item.status != "approved":
            logger.info(
                "content item %s has status %r, expected 'approved' — skipping",
                content_queue_id,
                item.status,
            )
            return {"skipped": True, "reason": "not_approved"}

        # 3. Set status = publishing (optimistic lock marker)
        item.status = "publishing"
        await db.flush()

        # 4. Look up workspace_id via automation for audit log
        auto_result = await db.execute(
            select(Automation).where(Automation.id == item.automation_id)
        )
        automation = auto_result.scalar_one()
        workspace_id = automation.workspace_id
        platform = item.platform

        # 5. Call the appropriate MCP tool
        try:
            await _call_mcp_for_platform(platform, item)
            item.status = "published"
            item.published_at = datetime.now(tz=timezone.utc)
        except MCPCallError as exc:
            item.status = "failed"
            logger.error(
                "MCP call failed for content %s (platform=%s): %s",
                content_queue_id,
                platform,
                exc.error,
            )
        except httpx.HTTPStatusError as exc:
            item.status = "failed"
            logger.error(
                "HTTP error publishing content %s: status=%d",
                content_queue_id,
                exc.response.status_code,
            )

        # 6. Write audit log
        pub_meta: dict[str, Any] = {
            "content_queue_id": str(content_queue_id),
            "platform": platform,
            "status": item.status,
        }
        if request_id:
            pub_meta["request_id"] = request_id
        db.add(
            AuditLog(
                workspace_id=workspace_id,
                action="content_published",
                actor="publish_worker",
                log_metadata=pub_meta,
            )
        )

        await db.commit()
        return {
            "content_queue_id": str(content_queue_id),
            "platform": platform,
            "status": item.status,
        }


@celery_app.task(
    bind=True,
    name="app.workers.publish_worker.publish_content",
    max_retries=2,
    default_retry_delay=30,
    queue="medium_priority",
)
def publish_content(
    self: Any,
    content_queue_id: str,
    request_id: str | None = None,
) -> dict[str, Any]:
    """Pick up an approved ContentQueue item and publish it via the appropriate MCP tool."""
    cid = uuid.UUID(content_queue_id)
    try:
        return asyncio.run(_publish(cid, request_id=request_id))
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        logger.warning(
            "MCP connection error for content %s — will retry: %s",
            content_queue_id,
            exc,
        )
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.error("publish_content failed for %s: %s", content_queue_id, exc)
        raise
