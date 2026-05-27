from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_READ, LIMIT_WRITE, limiter
from app.models.automation import Automation
from app.models.integration import Integration
from app.models.workspace import Workspace
from app.schemas.base import DataResponse, ok
from app.schemas.workspace import (
    BrandVoiceSchema,
    WorkspaceDetailResponse,
    WorkspaceSettingsUpdate,
    WorkspaceUpdate,
)

router = APIRouter()


async def _compute_detail(
    workspace: Workspace,
    db: AsyncSession,
) -> WorkspaceDetailResponse:
    int_res = await db.execute(
        select(func.count(Integration.id)).where(Integration.workspace_id == workspace.id)
    )
    auto_res = await db.execute(
        select(func.count(Automation.id)).where(Automation.workspace_id == workspace.id)
    )
    active_res = await db.execute(
        select(func.count(Automation.id)).where(
            Automation.workspace_id == workspace.id,
            Automation.active.is_(True),
        )
    )
    return WorkspaceDetailResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        name=workspace.name,
        brand_voice=workspace.brand_voice,
        settings=workspace.settings,
        created_at=workspace.created_at,
        integrations_count=int_res.scalar_one(),
        automations_count=auto_res.scalar_one(),
        active_automations_count=active_res.scalar_one(),
    )


@router.get("/me", response_model=DataResponse[WorkspaceDetailResponse])
@limiter.limit(LIMIT_READ)
async def get_my_workspace(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[WorkspaceDetailResponse]:
    return ok(await _compute_detail(workspace, db), request)


@router.patch("/me", response_model=DataResponse[WorkspaceDetailResponse])
@limiter.limit(LIMIT_WRITE)
async def update_my_workspace(
    request: Request,
    payload: WorkspaceUpdate,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[WorkspaceDetailResponse]:
    if payload.name is not None:
        workspace.name = payload.name
    if payload.settings is not None:
        workspace.settings = payload.settings
    await db.commit()
    await db.refresh(workspace)
    return ok(await _compute_detail(workspace, db), request)


@router.get("/me/brand-voice", response_model=DataResponse[BrandVoiceSchema | None])
@limiter.limit(LIMIT_READ)
async def get_brand_voice(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[BrandVoiceSchema | None]:
    bv = BrandVoiceSchema.model_validate(workspace.brand_voice) if workspace.brand_voice else None
    return ok(bv, request)


@router.put("/me/brand-voice", response_model=DataResponse[BrandVoiceSchema])
@limiter.limit(LIMIT_WRITE)
async def set_brand_voice(
    request: Request,
    payload: BrandVoiceSchema,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[BrandVoiceSchema]:
    workspace.brand_voice = payload.model_dump(exclude_none=True)
    await db.commit()
    await db.refresh(workspace)
    return ok(BrandVoiceSchema.model_validate(workspace.brand_voice), request)


@router.delete("/me/brand-voice", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(LIMIT_WRITE)
async def delete_brand_voice(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    workspace.brand_voice = None
    await db.commit()


@router.get("/me/settings", response_model=DataResponse[dict])
@limiter.limit(LIMIT_READ)
async def get_settings(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict]:
    return ok(workspace.settings or {}, request)


@router.patch("/me/settings", response_model=DataResponse[dict])
@limiter.limit(LIMIT_WRITE)
async def patch_settings(
    request: Request,
    payload: WorkspaceSettingsUpdate,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict]:
    updates = payload.model_dump(exclude_none=True)
    merged = {**(workspace.settings or {}), **updates}
    workspace.settings = merged
    await db.commit()
    await db.refresh(workspace)
    return ok(workspace.settings or {}, request)
