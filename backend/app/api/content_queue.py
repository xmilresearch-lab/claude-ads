import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_READ, LIMIT_WRITE, limiter
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace
from app.schemas.base import (
    COMMON_ERROR_RESPONSES,
    DataResponse,
    PaginatedResponse,
    ok,
    paginated,
)
from app.schemas.content_queue import ContentQueueItem, ContentQueueReject

router = APIRouter()

_WITH_404 = {**COMMON_ERROR_RESPONSES, 404: {"description": "Content item not found"}}


async def _get_item_for_workspace(
    item_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> ContentQueue | None:
    result = await db.execute(
        select(ContentQueue)
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(ContentQueue.id == item_id, Automation.workspace_id == workspace_id)
    )
    return result.scalar_one_or_none()  # type: ignore[no-any-return]


@router.get(
    "/queue",
    summary="List Pending Content",
    description=(
        "Return all content items currently awaiting human approval, ordered oldest-first. "
        "Items remain here until approved (dispatched for publishing) or rejected. "
        "Only items belonging to this workspace are returned."
    ),
    response_description="Paginated list of pending content queue items",
    responses=COMMON_ERROR_RESPONSES,
    response_model=PaginatedResponse[ContentQueueItem],
)
@limiter.limit(LIMIT_READ)
async def list_pending(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
) -> PaginatedResponse[ContentQueueItem]:
    total_res = await db.execute(
        select(func.count(ContentQueue.id))
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            ContentQueue.status == "pending_approval",
        )
    )
    total: int = total_res.scalar_one()

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
    items = list(result.scalars().all())
    return paginated(
        data=[ContentQueueItem.model_validate(i) for i in items],
        total_count=total,
        limit=limit,
        offset=offset,
        request=request,
    )


@router.get(
    "/{item_id}",
    summary="Get Content Item",
    description="Fetch a single content queue item by ID. Returns 404 if not found or not owned by the workspace.",
    response_description="The requested content queue item",
    responses=_WITH_404,
    response_model=DataResponse[ContentQueueItem],
)
@limiter.limit(LIMIT_READ)
async def get_item(
    request: Request,
    item_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[ContentQueueItem]:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    return ok(ContentQueueItem.model_validate(item), request)


@router.patch(
    "/{item_id}/approve",
    summary="Approve Content",
    description=(
        "Approve a pending content item for publishing. "
        "This immediately dispatches a Celery task to post the content via the appropriate MCP server. "
        "Status changes from `pending_approval` to `approved`."
    ),
    response_description="The approved content queue item",
    responses=_WITH_404,
    response_model=DataResponse[ContentQueueItem],
)
@limiter.limit(LIMIT_WRITE)
async def approve_item(
    request: Request,
    item_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[ContentQueueItem]:
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
    return ok(ContentQueueItem.model_validate(item), request)


@router.patch(
    "/{item_id}/reject",
    summary="Reject Content",
    description=(
        "Reject a pending content item with an optional reason. "
        "Status changes to `rejected` and the reason is stored in the content metadata. "
        "Rejected items are not published and remain in the queue for auditing."
    ),
    response_description="The rejected content queue item",
    responses=_WITH_404,
    response_model=DataResponse[ContentQueueItem],
)
@limiter.limit(LIMIT_WRITE)
async def reject_item(
    request: Request,
    item_id: uuid.UUID,
    payload: ContentQueueReject,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[ContentQueueItem]:
    item = await _get_item_for_workspace(item_id, workspace.id, db)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )
    item.status = "rejected"
    item.content = {**item.content, "_rejection_reason": payload.reason}
    await db.commit()
    await db.refresh(item)
    return ok(ContentQueueItem.model_validate(item), request)


@router.delete(
    "/{item_id}",
    summary="Delete Content Item",
    description=(
        "Permanently delete a content queue item. "
        "Use this only for items that should not appear in the audit trail. "
        "For most cases, prefer rejecting rather than deleting."
    ),
    response_description="No content — item deleted",
    responses=_WITH_404,
    status_code=status.HTTP_204_NO_CONTENT,
)
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
