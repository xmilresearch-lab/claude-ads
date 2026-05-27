from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_workspace
from app.core.database import get_db
from app.models.automation import Automation, AutomationRun, AutomationRunStatus, AutomationType
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.automation import (
    AutomationCreate,
    AutomationResponse,
    AutomationRunResponse,
    AutomationUpdate,
)
from app.workers import tasks

router = APIRouter(prefix="/automations", tags=["automations"])


@router.post("", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
async def create_automation(
    workspace_id: str,
    body: AutomationCreate,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        atype = AutomationType(body.type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown automation type: {body.type}")

    automation = Automation(
        workspace_id=workspace.id,
        name=body.name,
        type=atype,
        config=body.config,
        schedule=body.schedule,
        active=body.active,
    )
    db.add(automation)
    await db.flush()
    return automation


@router.get("", response_model=list[AutomationResponse])
async def list_automations(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(Automation.workspace_id == workspace.id)
    )
    return result.scalars().all()


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_automation(
    automation_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == workspace.id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    return automation


@router.patch("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: str,
    body: AutomationUpdate,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == workspace.id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(automation, field, value)
    return automation


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == workspace.id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    await db.delete(automation)


@router.post("/{automation_id}/run", response_model=AutomationRunResponse)
async def trigger_run(
    automation_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.workspace_id == workspace.id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")

    run = AutomationRun(automation_id=automation.id)
    db.add(run)
    await db.flush()

    tasks.run_automation.delay(automation.id, run.id)
    return run


@router.get("/{automation_id}/runs", response_model=list[AutomationRunResponse])
async def list_runs(
    automation_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutomationRun)
        .join(Automation)
        .where(
            AutomationRun.automation_id == automation_id,
            Automation.workspace_id == workspace.id,
        )
        .order_by(AutomationRun.started_at.desc())
    )
    return result.scalars().all()
