import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import (
    LIMIT_READ,
    LIMIT_TRIGGER,
    LIMIT_WRITE,
    get_workspace_id,
    limiter,
)
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
from app.workers.scheduled_worker import run_scheduled_automation

router = APIRouter(prefix="/api/automations", tags=["automations"])


@router.post("/", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(LIMIT_WRITE)
async def create(
    request: Request,
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
@limiter.limit(LIMIT_READ)
async def list_all(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
) -> list[Automation]:
    return await automation_service.list_automations(
        workspace.id, db, offset=offset, limit=limit
    )


@router.get("/{automation_id}", response_model=AutomationResponse)
@limiter.limit(LIMIT_READ)
async def get(
    request: Request,
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
@limiter.limit(LIMIT_WRITE)
async def update(
    request: Request,
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
@limiter.limit(LIMIT_WRITE)
async def delete(
    request: Request,
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
@limiter.limit(LIMIT_TRIGGER)
@limiter.limit(LIMIT_TRIGGER, key_func=get_workspace_id)
async def run(
    request: Request,
    automation_id: uuid.UUID,
    payload: TriggerRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AutomationRun:
    """Enqueue an automation run and return a pending AutomationRun immediately.

    Clients should poll GET /{automation_id}/runs to check for the completed run.
    """
    automation = await automation_service.get_automation(automation_id, workspace.id, db)
    if automation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found"
        )
    if not automation.active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Automation is not active",
        )

    pending_run = await automation_service.create_pending_run(
        automation_id, payload.payload, db
    )
    run_scheduled_automation.delay(
        automation_id=str(automation_id),
        trigger_payload=payload.payload,
        request_id=getattr(request.state, "request_id", None),
    )
    return pending_run


@router.get("/{automation_id}/runs", response_model=RunsListResponse)
@limiter.limit(LIMIT_READ)
async def list_runs(
    request: Request,
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
