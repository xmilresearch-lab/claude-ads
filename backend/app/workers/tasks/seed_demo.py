"""
Demo data seeder for new workspaces.

Runs automatically on new workspace creation. Also usable as CLI:
    python -m app.workers.tasks.seed_demo --workspace-id <uuid>

Used in CI smoke tests to validate the full user journey.
"""
from __future__ import annotations

import argparse
import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace

_DEMO_AUTOMATIONS = [
    {
        "name": "Post to Twitter every morning",
        "type": "scheduled",
        "config": {
            "platform": "twitter",
            "prompt": "Write an engaging morning tweet about AI and productivity.",
        },
        "schedule": "0 9 * * *",
        "active": True,
    },
    {
        "name": "Reply to support emails",
        "type": "webhook",
        "config": {
            "platform": "gmail",
            "prompt": "Draft a helpful, professional reply to this support email.",
        },
        "schedule": None,
        "active": True,
    },
]

_DEMO_CONTENT = [
    {
        "content": {
            "text": "Excited to share how AI is transforming our workflows today! ✨",
            "platform": "twitter",
        },
        "platform": "twitter",
        "status": "pending_review",
    },
    {
        "content": {
            "text": "5 ways automation saves us 10 hours a week — a thread...",
            "platform": "twitter",
        },
        "platform": "twitter",
        "status": "pending_review",
    },
    {
        "content": {
            "subject": "Thanks for reaching out!",
            "body": "Hi there, thanks for your message. Let me help you with that…",
            "platform": "gmail",
        },
        "platform": "gmail",
        "status": "pending_review",
    },
]


async def seed_demo_data(workspace_id: uuid.UUID, db: AsyncSession) -> None:
    """Create demo automations + content queue items for a new workspace."""
    automation_ids: list[uuid.UUID] = []

    for template in _DEMO_AUTOMATIONS:
        automation = Automation(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            name=template["name"],
            type=template["type"],
            config=template["config"],
            schedule=template["schedule"],
            active=template["active"],
        )
        db.add(automation)
        automation_ids.append(automation.id)

    await db.flush()

    for i, item in enumerate(_DEMO_CONTENT):
        automation_id = automation_ids[min(i, len(automation_ids) - 1)]
        db.add(
            ContentQueue(
                id=uuid.uuid4(),
                automation_id=automation_id,
                content=item["content"],
                platform=item["platform"],
                status=item["status"],
                scheduled_at=None,
            )
        )

    await db.commit()


async def _run_cli(workspace_id: uuid.UUID) -> None:
    async with AsyncSession(engine) as db:
        result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        if not result.scalar_one_or_none():
            raise ValueError(f"Workspace {workspace_id} not found")
        await seed_demo_data(workspace_id, db)
        print(f"Demo data seeded for workspace {workspace_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo data for a workspace")
    parser.add_argument("--workspace-id", required=True, type=uuid.UUID)
    args = parser.parse_args()
    asyncio.run(_run_cli(args.workspace_id))
