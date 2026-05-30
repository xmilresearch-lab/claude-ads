from typing import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.plans import PLAN_LIMITS
from app.core.security import get_current_user
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.integration import Integration
from app.models.user import User
from app.models.workspace import Workspace


def require_quota(resource: str) -> Callable:
    """
    FastAPI dependency factory for plan quota enforcement.

    Inject at the router level:
        @router.post("/", dependencies=[Depends(require_quota("automation"))])

    Supported resources: "automation", "integration", "content_queue"
    """

    async def _check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        plan = current_user.plan or "free"
        limit_key = f"max_{resource}s"
        limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]).get(limit_key)

        if limit is None:
            return  # unlimited for this plan

        ws_result = await db.execute(
            select(Workspace).where(Workspace.user_id == current_user.id).limit(1)
        )
        workspace = ws_result.scalar_one_or_none()
        if workspace is None:
            return

        if resource == "automation":
            count = await db.scalar(
                select(func.count()).where(
                    Automation.workspace_id == workspace.id,
                    Automation.active.is_(True),
                )
            ) or 0
        elif resource == "integration":
            count = await db.scalar(
                select(func.count()).where(Integration.workspace_id == workspace.id)
            ) or 0
        elif resource == "content_queue":
            count = await db.scalar(
                select(func.count()).where(
                    ContentQueue.automation_id.in_(
                        select(Automation.id).where(
                            Automation.workspace_id == workspace.id
                        )
                    )
                )
            ) or 0
        else:
            return

        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "code": "quota_exceeded",
                    "resource": resource,
                    "limit": limit,
                    "current": count,
                    "upgrade_url": "/billing/plans",
                },
            )

    return _check
