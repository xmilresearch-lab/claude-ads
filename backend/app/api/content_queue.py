import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_READ, LIMIT_WRITE, limiter
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace
from app.schemas.content_queue import ContentQueueItem, ContentQueueReject

router = APIRouter(prefix="/api/content", tags=["content-queue"])


async def _get_item_for_workspace(
    item_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> ContentQueue | None:
    """Fetch a content queue item scoped to the workspace via the automation FK."""
    result = await db.execute(
        select(ContentQueue)
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(ContentQueue.id == item_id, Automation.workspace_id == workspace_id)
    )
    return result.scalar_one_or_none()


@router.get("/queue", response_model=list[ContentQueueItem])
@limiter.limit(LIMIT_READ)
async def list_pending(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
) -> list[ContentQueue]:
    result = await db.execute(
        select(ContentQueue)
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            ContentQueue.status == "pending_approval",
        )
        .order_by(ContentQueue.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/{item_id}", response_model=ContentQueueItem)
@limiter.limit(LIMIT_READ)
async def get_item(
    request: Request,
    item_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContentQueue:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    return item


@router.patch("/{item_id}/approve", response_model=ContentQueueItem)
@limiter.limit(LIMIT_WRITE)
async def approve_item(
    request: Request,
    item_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContentQueue:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    item.status = "approved"
    await db.commit()
    await db.refresh(item)

    from app.workers.publish_worker import publish_content  # noqa: PLC0415

    publish_content.delay(
        content_queue_id=str(item_id),
        request_id=getattr(request.state, "request_id", None),
    )
    return item


@router.patch("/{item_id}/reject", response_model=ContentQueueItem)
@limiter.limit(LIMIT_WRITE)
async def reject_item(
    request: Request,
    item_id: uuid.UUID,
    payload: ContentQueueReject,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContentQueue:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    item.status = "rejected"
    item.content = {**item.content, "_rejection_reason": payload.reason}
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(LIMIT_WRITE)
async def delete_item(
    request: Request,
    item_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    await db.delete(item)
    await db.commit()
