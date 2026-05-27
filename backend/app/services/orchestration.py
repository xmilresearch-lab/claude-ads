import json
import uuid
from datetime import datetime, timezone
from typing import Any

from anthropic import AsyncAnthropic
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.middleware.dlp_scanner import DLPResult, scan_output
from app.middleware.injection_scanner import SecurityError, require_clean
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace
from app.services.mcp_registry import McpServerConfig, get_mcp_servers_for_automation
from app.services.prompt_builder import build_system_prompt


class OrchestrationError(Exception):
    """Base class for orchestration errors."""


class RateLimitError(OrchestrationError):
    """Raised when a workspace has exceeded its daily automation run limit."""


class AutomationNotFoundError(OrchestrationError):
    """Raised when the requested automation does not exist."""


class InactiveAutomationError(OrchestrationError):
    """Raised when attempting to run an automation that is not active."""


DAILY_LIMITS: dict[str, int] = {
    "social_post": 50,
    "email_campaign": 1000,
    "support_reply": 500,
    "crm_update": 2000,
}


async def check_rate_limit(
    workspace_id: uuid.UUID,
    automation_type: str,
    db: AsyncSession,
) -> None:
    """Raise RateLimitError if the workspace has reached its daily run cap."""
    limit = DAILY_LIMITS.get(automation_type, 100)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    count_result = await db.execute(
        select(func.count(AutomationRun.id))
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace_id,
            Automation.type == automation_type,
            AutomationRun.created_at >= today_start,
            AutomationRun.status != "blocked",
        )
    )
    count: int = count_result.scalar_one()
    if count >= limit:
        raise RateLimitError(
            f"Daily limit of {limit} runs reached for automation type '{automation_type}'"
        )


async def call_claude_with_mcp(
    system_prompt: str,
    user_message: str,
    mcp_servers: list[McpServerConfig],
) -> dict[str, Any]:
    """Call the Claude API via the MCP client beta and return a structured result."""
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.beta.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4096,
        betas=["mcp-client-2025-11-20"],
        mcp_servers=mcp_servers,  # type: ignore[arg-type]
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    text_parts: list[str] = []
    mcp_tool_calls: list[dict[str, Any]] = []
    for block in response.content:
        block_type = getattr(block, "type", "")
        if block_type == "text":
            text_parts.append(block.text)
        elif "tool_use" in block_type:
            mcp_tool_calls.append(
                {
                    "name": getattr(block, "name", "unknown"),
                    "input": getattr(block, "input", {}),
                }
            )

    input_tokens: int = response.usage.input_tokens
    output_tokens: int = response.usage.output_tokens
    return {
        "content": "\n".join(text_parts),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "stop_reason": response.stop_reason or "end_turn",
        "mcp_tool_calls": mcp_tool_calls,
    }


async def queue_or_publish(
    automation: Automation,
    content: dict[str, Any],
    dlp_result: DLPResult,
    db: AsyncSession,
) -> ContentQueue:
    """Insert a ContentQueue row; status is determined by approval settings and DLP."""
    require_approval = bool(automation.config.get("require_approval", False))
    status = (
        "pending_approval"
        if (require_approval or dlp_result.has_violations)
        else "approved"
    )
    platform = str(content.get("platform", automation.type))
    entry = ContentQueue(
        automation_id=automation.id,
        platform=platform,
        content=content,
        status=status,
    )
    db.add(entry)
    await db.flush()
    return entry


async def run_automation(
    automation_id: uuid.UUID,
    trigger_payload: dict[str, Any],
    db: AsyncSession,
) -> AutomationRun:
    """Execute the 13-step AI automation orchestration flow."""
    # 1. Fetch automation + workspace
    auto_result = await db.execute(
        select(Automation).where(Automation.id == automation_id)
    )
    automation: Automation | None = auto_result.scalar_one_or_none()
    if automation is None:
        raise AutomationNotFoundError(f"Automation {automation_id} not found")

    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == automation.workspace_id)
    )
    workspace: Workspace = ws_result.scalar_one()

    # 2. Validate active
    if not automation.active:
        raise InactiveAutomationError(f"Automation {automation_id} is inactive")

    # 3. Check rate limit
    await check_rate_limit(workspace.id, automation.type, db)

    # 4. Scan trigger payload for injection attempts
    payload_str = json.dumps(trigger_payload)
    try:
        scanned_payload = require_clean(payload_str)
    except SecurityError as exc:
        blocked_run = AutomationRun(
            automation_id=automation_id,
            status="blocked",
            error=str(exc),
            started_at=datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
        )
        db.add(blocked_run)
        await db.commit()
        return blocked_run

    # 5. Build system prompt with brand voice
    system_prompt = build_system_prompt(
        automation.type,
        workspace.brand_voice,
        workspace.name,
    )

    # 6. Get MCP servers for this automation type
    try:
        mcp_servers = get_mcp_servers_for_automation(automation.type)
    except ValueError:
        mcp_servers = []

    # 7. Insert AutomationRun with status="running"
    run = AutomationRun(
        automation_id=automation_id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.flush()

    try:
        # 8. Call Claude API with MCP servers
        claude_result = await call_claude_with_mcp(
            system_prompt=system_prompt,
            user_message=scanned_payload,
            mcp_servers=mcp_servers,
        )

        # 9. Scan Claude output through DLP scanner
        dlp_result = scan_output(claude_result["content"])

        # 10. Write to content_queue
        try:
            content_dict: dict[str, Any] = json.loads(dlp_result.redacted_content)
        except json.JSONDecodeError:
            content_dict = {"raw": dlp_result.redacted_content}
        await queue_or_publish(automation, content_dict, dlp_result, db)

        # 11. Update AutomationRun to success
        run.status = "success"
        run.result = {
            "content": content_dict,
            "tokens": {
                "input": claude_result["input_tokens"],
                "output": claude_result["output_tokens"],
                "total": claude_result["total_tokens"],
            },
            "stop_reason": claude_result["stop_reason"],
            "dlp_violations": [v.value for v in dlp_result.violations],
        }
        run.ai_tokens_used = claude_result["total_tokens"]
        run.finished_at = datetime.now(timezone.utc)

        # 12. Write audit log
        db.add(
            AuditLog(
                workspace_id=workspace.id,
                action="automation_run",
                actor=str(automation_id),
                log_metadata={
                    "automation_id": str(automation_id),
                    "tokens_used": claude_result["total_tokens"],
                    "mcp_tools_called": claude_result["mcp_tool_calls"],
                    "dlp_violations": [v.value for v in dlp_result.violations],
                    "run_id": str(run.id),
                },
            )
        )

    except Exception as exc:
        run.status = "failed"
        run.error = str(exc)
        run.finished_at = datetime.now(timezone.utc)

    await db.commit()

    # 13. Return AutomationRun
    return run
