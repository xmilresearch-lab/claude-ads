import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.models.workspace import Workspace
from app.schemas.automation import (
    AutomationCreate,
    AutomationResponse,
    AutomationUpdate,
    TriggerRequest,
)
from app.schemas.automation_run import AutomationRunResponse, RunsListResponse
from app.services import automation_service
from app.services.orchestration import (
    AutomationNotFoundError,
    InactiveAutomationError,
    RateLimitError,
)

router = APIRouter(prefix="/api/automations", tags=["automations"])


@router.post("/", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
async def create(
    payload: AutomationCreate,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Automation:
    return await automation_service.create_automation(
        workspace_id=workspace.id,
        name=payload.name,
        automation_type=payload.type,
        config=payload.config,
        db=db,
        schedule=payload.schedule,
        trigger=payload.trigger,
    )


@router.get("/", response_model=list[AutomationResponse])
async def list_all(
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
) -> list[Automation]:
    return await automation_service.list_automations(
        workspace.id, db, offset=offset, limit=limit
    )


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get(
    automation_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Automation:
    automation = await automation_service.get_automation(automation_id, workspace.id, db)
    if automation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )
    return automation


@router.patch("/{automation_id}", response_model=AutomationResponse)
async def update(
    automation_id: uuid.UUID,
    payload: AutomationUpdate,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Automation:
    updates = payload.model_dump(exclude_none=True)
    automation = await automation_service.update_automation(
        automation_id, workspace.id, updates, db
    )
    if automation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )
    return automation


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    automation_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await automation_service.delete_automation(automation_id, workspace.id, db)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )


@router.post("/{automation_id}/run", response_model=AutomationRunResponse)
async def run(
    automation_id: uuid.UUID,
    payload: TriggerRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AutomationRun:
    try:
        return await automation_service.trigger_automation(
            automation_id=automation_id,
            workspace_id=workspace.id,
            trigger_payload=payload.payload,
            db=db,
        )
    except AutomationNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )
    except InactiveAutomationError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Automation is not active",
        )
    except RateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)
        )


@router.get("/{automation_id}/runs", response_model=RunsListResponse)
async def list_runs(
    automation_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=50),
) -> RunsListResponse:
    automation = await automation_service.get_automation(automation_id, workspace.id, db)
    if automation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )

    total_result = await db.execute(
        select(func.count(AutomationRun.id)).where(
            AutomationRun.automation_id == automation_id
        )
    )
    total: int = total_result.scalar_one()

    runs_result = await db.execute(
        select(AutomationRun)
        .where(AutomationRun.automation_id == automation_id)
        .order_by(AutomationRun.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    runs = list(runs_result.scalars().all())

    next_off = offset + limit
    return RunsListResponse(
        items=runs,
        has_more=next_off < total,
        next_offset=next_off if next_off < total else None,
        total_count=total,
    )
