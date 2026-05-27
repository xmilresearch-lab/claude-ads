"""Core AI orchestration engine: runs automations using Claude + MCP tools."""
import json
from datetime import datetime, timezone
from typing import Any

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.automation import Automation, AutomationRun, AutomationRunStatus, AutomationType
from app.models.content import ContentQueue
from app.services.brand_voice import build_brand_voice_prompt, get_brand_voice

settings = get_settings()

SYSTEM_PROMPTS: dict[AutomationType, str] = {
    AutomationType.social_posting: (
        "You are an expert social media manager. Generate platform-appropriate content "
        "that drives engagement. Follow the brand voice exactly. Output JSON with keys: "
        "platform, text, hashtags, call_to_action."
    ),
    AutomationType.email_campaign: (
        "You are an expert email marketer. Write compelling, personalized email copy that "
        "converts. Follow the brand voice. Output JSON with keys: subject, body_html, preview_text."
    ),
    AutomationType.support_reply: (
        "You are a helpful customer support specialist. Write empathetic, accurate, and "
        "solution-focused replies. Output JSON with keys: reply_text, suggested_resolution, escalate."
    ),
    AutomationType.crm_update: (
        "You are a CRM automation specialist. Extract structured contact and deal information "
        "from the trigger payload. Output JSON with keys: contact_fields, deal_fields, activity_note."
    ),
    AutomationType.content_repurposing: (
        "You are a content strategist. Transform the source content into platform-specific formats. "
        "Output JSON with keys: formats (list of {platform, content, notes})."
    ),
}

MCP_SERVERS: dict[AutomationType, list[dict]] = {
    AutomationType.social_posting: [
        {"type": "url", "url": settings.social_mcp_url, "authorization_token": settings.social_mcp_token},
    ],
    AutomationType.email_campaign: [
        {"type": "url", "url": settings.email_mcp_url, "authorization_token": settings.email_mcp_token},
    ],
    AutomationType.support_reply: [
        {"type": "url", "url": settings.email_mcp_url, "authorization_token": settings.email_mcp_token},
    ],
    AutomationType.crm_update: [
        {"type": "url", "url": settings.crm_mcp_url, "authorization_token": settings.crm_mcp_token},
    ],
    AutomationType.content_repurposing: [
        {"type": "url", "url": settings.social_mcp_url, "authorization_token": settings.social_mcp_token},
    ],
}


async def run_automation(automation: Automation, run: AutomationRun, db: AsyncSession) -> None:
    run.status = AutomationRunStatus.running
    await db.flush()

    try:
        brand_voice = await get_brand_voice(automation.workspace_id, db)
        brand_prompt = build_brand_voice_prompt(brand_voice)

        system_prompt = (
            f"{SYSTEM_PROMPTS[automation.type]}\n\n"
            f"=== BRAND VOICE ===\n{brand_prompt}\n"
            f"=== AUTOMATION CONFIG ===\n{json.dumps(automation.config)}"
        )

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        trigger_payload = automation.config.get("trigger_payload", "Execute this automation.")

        mcp_servers = MCP_SERVERS.get(automation.type, [])
        active_servers = [s for s in mcp_servers if s.get("url")]

        response = client.beta.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": str(trigger_payload)}],
            mcp_servers=active_servers if active_servers else [],
            betas=["mcp-client-2025-04-04"],
        )

        result_text = "".join(
            block.text for block in response.content if hasattr(block, "text")
        )

        result_data: dict[str, Any] = {"raw": result_text}
        try:
            result_data = json.loads(result_text)
        except json.JSONDecodeError:
            pass

        await _enqueue_content(automation, result_data, db)

        run.status = AutomationRunStatus.completed
        run.result = result_data
        run.finished_at = datetime.now(timezone.utc)

    except Exception as exc:
        run.status = AutomationRunStatus.failed
        run.error = str(exc)
        run.finished_at = datetime.now(timezone.utc)
        raise
    finally:
        await db.flush()


async def _enqueue_content(
    automation: Automation, result: dict[str, Any], db: AsyncSession
) -> None:
    if automation.type == AutomationType.social_posting:
        platform = result.get("platform", automation.config.get("platform", "unknown"))
        item = ContentQueue(
            automation_id=automation.id,
            content=result,
            platform=platform,
        )
        db.add(item)
    elif automation.type == AutomationType.content_repurposing:
        for fmt in result.get("formats", []):
            item = ContentQueue(
                automation_id=automation.id,
                content=fmt,
                platform=fmt.get("platform", "unknown"),
            )
            db.add(item)
