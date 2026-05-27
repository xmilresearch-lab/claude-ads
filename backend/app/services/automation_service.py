import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.services.orchestration import AutomationNotFoundError, run_automation


async def create_automation(
    workspace_id: uuid.UUID,
    name: str,
    automation_type: str,
    config: dict[str, Any],
    db: AsyncSession,
    schedule: str | None = None,
    trigger: str | None = None,
) -> Automation:
    automation = Automation(
        workspace_id=workspace_id,
        name=name,
        type=automation_type,
        config=config,
        schedule=schedule,
        trigger=trigger,
    )
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return automation


async def get_automation(
    automation_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> Automation | None:
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == workspace_id,
        )
    )
    return result.scalar_one_or_none()


async def list_automations(
    workspace_id: uuid.UUID,
    db: AsyncSession,
    offset: int = 0,
    limit: int = 50,
) -> list[Automation]:
    result = await db.execute(
        select(Automation)
        .where(Automation.workspace_id == workspace_id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_automation(
    automation_id: uuid.UUID,
    workspace_id: uuid.UUID,
    updates: dict[str, Any],
    db: AsyncSession,
) -> Automation | None:
    automation = await get_automation(automation_id, workspace_id, db)
    if automation is None:
        return None
    for key, value in updates.items():
        if hasattr(automation, key):
            setattr(automation, key, value)
    await db.commit()
    await db.refresh(automation)
    return automation


async def delete_automation(
    automation_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> bool:
    automation = await get_automation(automation_id, workspace_id, db)
    if automation is None:
        return False
    await db.delete(automation)
    await db.commit()
    return True


async def trigger_automation(
    automation_id: uuid.UUID,
    workspace_id: uuid.UUID,
    trigger_payload: dict[str, Any],
    db: AsyncSession,
) -> AutomationRun:
    """Verify workspace ownership then dispatch to the orchestration engine."""
    automation = await get_automation(automation_id, workspace_id, db)
    if automation is None:
        raise AutomationNotFoundError(
            f"Automation {automation_id} not found in workspace {workspace_id}"
        )
    return await run_automation(automation_id, trigger_payload, db)
