import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_READ, limiter
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.models.workspace import Workspace
from app.schemas.audit_log import AuditLogResponse, AuditLogSummary

router = APIRouter(prefix="/api/audit", tags=["audit-logs"])


@router.get("/logs", response_model=list[AuditLogResponse])
@limiter.limit(LIMIT_READ)
async def list_logs(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    action: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200, ge=1),
    offset: int = Query(default=0, ge=0),
) -> list[AuditLog]:
    query = select(AuditLog).where(AuditLog.workspace_id == workspace.id)
    if action is not None:
        query = query.where(AuditLog.action == action)
    if from_date is not None:
        query = query.where(AuditLog.created_at >= from_date)
    if to_date is not None:
        query = query.where(AuditLog.created_at <= to_date)
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
@limiter.limit(LIMIT_READ)
async def get_log(
    request: Request,
    log_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuditLog:
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found"
        )
    if log.workspace_id != workspace.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this audit log is forbidden",
        )
    return log


@router.get("/summary", response_model=AuditLogSummary)
@limiter.limit(LIMIT_READ)
async def get_summary(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuditLogSummary:
    thirty_days_ago = datetime.now(tz=timezone.utc) - timedelta(days=30)

    # Run counts by status (joins through Automation for workspace scoping)
    runs_result = await db.execute(
        select(AutomationRun.status, func.count())
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.created_at >= thirty_days_ago,
        )
        .group_by(AutomationRun.status)
    )
    run_counts: dict[str, int] = dict(runs_result.all())

    # Automation run audit logs — used for DLP violations and token usage
    logs_result = await db.execute(
        select(AuditLog).where(
            AuditLog.workspace_id == workspace.id,
            AuditLog.action == "automation_run",
            AuditLog.created_at >= thirty_days_ago,
        )
    )
    run_logs = list(logs_result.scalars().all())

    dlp_violations = sum(
        1
        for log in run_logs
        if log.log_metadata and log.log_metadata.get("dlp_violations")
    )
    tokens_used = sum(
        log.log_metadata.get("tokens_used", 0)
        for log in run_logs
        if log.log_metadata
    )

    # Content published count
    published_result = await db.execute(
        select(func.count()).where(
            AuditLog.workspace_id == workspace.id,
            AuditLog.action == "content_published",
            AuditLog.created_at >= thirty_days_ago,
        )
    )
    content_published: int = published_result.scalar_one()

    return AuditLogSummary(
        total_runs=sum(run_counts.values()),
        successful_runs=run_counts.get("success", 0),
        failed_runs=run_counts.get("failed", 0),
        blocked_injections=run_counts.get("blocked", 0),
        dlp_violations=dlp_violations,
        content_published=content_published,
        tokens_used=tokens_used,
    )
