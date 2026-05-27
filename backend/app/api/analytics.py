from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_workspace
from app.core.database import get_db
from app.models.automation import Automation, AutomationRun, AutomationRunStatus, AutomationType
from app.models.content import ContentQueue, ContentStatus
from app.models.workspace import Workspace

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    total_automations = await db.scalar(
        select(func.count()).select_from(Automation).where(Automation.workspace_id == workspace.id)
    )
    total_runs = await db.scalar(
        select(func.count())
        .select_from(AutomationRun)
        .join(Automation)
        .where(Automation.workspace_id == workspace.id)
    )
    successful_runs = await db.scalar(
        select(func.count())
        .select_from(AutomationRun)
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.status == AutomationRunStatus.completed,
        )
    )
    published_content = await db.scalar(
        select(func.count())
        .select_from(ContentQueue)
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            ContentQueue.status == ContentStatus.published,
        )
    )

    return {
        "total_automations": total_automations,
        "total_runs": total_runs,
        "successful_runs": successful_runs,
        "success_rate": round(successful_runs / total_runs * 100, 1) if total_runs else 0,
        "published_content": published_content,
    }


@router.get("/social")
async def social_analytics(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentQueue.platform, func.count().label("count"))
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            Automation.type == AutomationType.social_posting,
        )
        .group_by(ContentQueue.platform)
    )
    return {"posts_by_platform": {row.platform: row.count for row in result}}


@router.get("/email")
async def email_analytics(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    runs = await db.scalar(
        select(func.count())
        .select_from(AutomationRun)
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            Automation.type == AutomationType.email_campaign,
        )
    )
    return {"campaigns_run": runs}


@router.get("/support")
async def support_analytics(
    workspace_id: str,
    workspace: Workspace = Depends(get_workspace),
    db: AsyncSession = Depends(get_db),
):
    total = await db.scalar(
        select(func.count())
        .select_from(AutomationRun)
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            Automation.type == AutomationType.support_reply,
        )
    )
    completed = await db.scalar(
        select(func.count())
        .select_from(AutomationRun)
        .join(Automation)
        .where(
            Automation.workspace_id == workspace.id,
            Automation.type == AutomationType.support_reply,
            AutomationRun.status == AutomationRunStatus.completed,
        )
    )
    return {"total_tickets_handled": total, "auto_resolved": completed}
