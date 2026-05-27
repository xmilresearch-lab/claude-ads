from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_workspace
from app.core.database import get_db
from app.models.automation import Automation
from app.models.content import ContentQueue, ContentStatus
from app.models.workspace import Workspace
from app.schemas.content import ContentResponse

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/queue", response_model=list[ContentResponse])
async def get_queue(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentQueue)
        .join(Automation)
        .where(Automation.workspace_id == workspace.id)
        .order_by(ContentQueue.scheduled_at.asc())
    )
    return result.scalars().all()


@router.patch("/{content_id}/approve", response_model=ContentResponse)
async def approve_content(
    content_id: str,
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentQueue)
        .join(Automation)
        .where(
            ContentQueue.id == content_id,
            Automation.workspace_id == workspace.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    item.status = ContentStatus.approved
    return item


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: str,
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentQueue)
        .join(Automation)
        .where(
            ContentQueue.id == content_id,
            Automation.workspace_id == workspace.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    await db.delete(item)
