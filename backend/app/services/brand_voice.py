"""Retrieve and format the brand voice context for a workspace."""
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import Workspace

DEFAULT_BRAND_VOICE: dict[str, Any] = {
    "tone": "professional but approachable",
    "avoid": ["jargon", "passive voice"],
    "examples": [],
    "industry": "general",
    "target_audience": "general audience",
}


async def get_brand_voice(workspace_id: str, db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        return DEFAULT_BRAND_VOICE
    return workspace.settings.get("brand_voice", DEFAULT_BRAND_VOICE)


def build_brand_voice_prompt(brand_voice: dict[str, Any]) -> str:
    avoid_list = ", ".join(brand_voice.get("avoid", []))
    examples = brand_voice.get("examples", [])
    examples_text = "\n".join(f"- {ex}" for ex in examples[:3]) if examples else "None provided"
    return (
        f"Brand voice: {brand_voice.get('tone', 'professional')}\n"
        f"Industry: {brand_voice.get('industry', 'general')}\n"
        f"Target audience: {brand_voice.get('target_audience', 'general')}\n"
        f"Avoid: {avoid_list}\n"
        f"Style examples:\n{examples_text}"
    )
