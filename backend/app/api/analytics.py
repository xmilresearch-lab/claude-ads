import csv
import io
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_workspace
from app.core.database import get_db
from app.middleware.rate_limiter import LIMIT_READ, limiter
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.automation_run import AutomationRun
from app.models.content_queue import ContentQueue
from app.models.workspace import Workspace
from app.schemas.analytics import (
    AnalyticsOverview,
    AutomationBreakdown,
    PlatformStats,
    TokenUsageSeries,
)
from app.schemas.base import DataResponse, PaginatedResponse, ok, paginated

router = APIRouter()

_COST_PER_TOKEN = 0.000003  # Sonnet input rate


def _fill_date_gaps(
    series_data: list[tuple[Any, int]],
    start: date,
    end: date,
) -> list[TokenUsageSeries]:
    """Build a complete daily series between start and end, filling gaps with zeros."""
    lookup: dict[date, int] = {}
    for row in series_data:
        d = row[0]
        if hasattr(d, "date"):
            d = d.date()
        lookup[d] = int(row[1] or 0)

    result: list[TokenUsageSeries] = []
    current = start
    while current <= end:
        tokens = lookup.get(current, 0)
        result.append(
            TokenUsageSeries(
                date=current.isoformat(),
                input_tokens=0,
                output_tokens=0,
                total_tokens=tokens,
                estimated_cost_usd=round(tokens * _COST_PER_TOKEN, 8),
            )
        )
        current += timedelta(days=1)
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/overview", response_model=DataResponse[AnalyticsOverview])
@limiter.limit(LIMIT_READ)
async def get_overview(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, le=90, ge=1),
) -> DataResponse[AnalyticsOverview]:
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days)

    # 1. Run counts by status (scoped to workspace via Automation join)
    runs_res = await db.execute(
        select(AutomationRun.status, func.count(AutomationRun.id))
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.created_at >= start_date,
        )
        .group_by(AutomationRun.status)
    )
    run_counts: dict[str, int] = dict(runs_res.all())

    # 2. Total tokens
    tokens_res = await db.execute(
        select(func.coalesce(func.sum(AutomationRun.ai_tokens_used), 0))
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.created_at >= start_date,
        )
    )
    total_tokens: int = tokens_res.scalar_one()

    # 3. Content queue counts by status
    content_res = await db.execute(
        select(ContentQueue.status, func.count(ContentQueue.id))
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            ContentQueue.created_at >= start_date,
        )
        .group_by(ContentQueue.status)
    )
    content_counts: dict[str, int] = dict(content_res.all())

    # 4. DLP violations — count automation_run audit logs with non-empty dlp_violations
    dlp_res = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            AuditLog.workspace_id == workspace.id,
            AuditLog.action == "automation_run",
            AuditLog.created_at >= start_date,
            AuditLog.log_metadata.isnot(None),
            func.coalesce(
                func.jsonb_array_length(AuditLog.log_metadata["dlp_violations"]),
                0,
            )
            > 0,
        )
    )
    dlp_violations: int = dlp_res.scalar_one()

    total_runs = sum(run_counts.values())
    successful_runs = run_counts.get("success", 0)
    failed_runs = run_counts.get("failed", 0)
    blocked = run_counts.get("blocked", 0)
    success_rate = successful_runs / total_runs if total_runs > 0 else 0.0

    return ok(
        AnalyticsOverview(
            period_days=days,
            total_runs=total_runs,
            successful_runs=successful_runs,
            failed_runs=failed_runs,
            success_rate=round(success_rate, 4),
            total_tokens_used=total_tokens,
            estimated_cost_usd=round(total_tokens * _COST_PER_TOKEN, 6),
            content_published=content_counts.get("published", 0),
            content_pending_approval=content_counts.get("pending_approval", 0),
            blocked_injection_attempts=blocked,
            dlp_violations_caught=dlp_violations,
        ),
        request,
    )


@router.get("/automations", response_model=PaginatedResponse[AutomationBreakdown])
@limiter.limit(LIMIT_READ)
async def get_automations_breakdown(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, le=90, ge=1),
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PaginatedResponse[AutomationBreakdown]:
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days)

    count_res = await db.execute(
        select(func.count(Automation.id)).where(Automation.workspace_id == workspace.id)
    )
    total: int = count_res.scalar_one()

    rows = (
        await db.execute(
            select(
                Automation.id,
                Automation.name,
                Automation.type,
                func.count(AutomationRun.id).label("runs_total"),
                func.count(AutomationRun.id)
                .filter(AutomationRun.status == "success")
                .label("runs_successful"),
                func.count(AutomationRun.id)
                .filter(AutomationRun.status == "failed")
                .label("runs_failed"),
                func.coalesce(func.avg(AutomationRun.ai_tokens_used), 0.0).label("avg_tokens"),
                func.max(AutomationRun.started_at).label("last_run_at"),
            )
            .outerjoin(
                AutomationRun,
                and_(
                    AutomationRun.automation_id == Automation.id,
                    AutomationRun.created_at >= start_date,
                ),
            )
            .where(Automation.workspace_id == workspace.id)
            .group_by(Automation.id, Automation.name, Automation.type)
            .order_by(func.count(AutomationRun.id).desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    breakdowns = [
        AutomationBreakdown(
            automation_id=str(r.id),
            automation_name=r.name,
            type=r.type,
            runs_total=r.runs_total,
            runs_successful=r.runs_successful,
            runs_failed=r.runs_failed,
            avg_tokens_per_run=round(float(r.avg_tokens), 2),
            last_run_at=r.last_run_at.isoformat() if r.last_run_at else None,
        )
        for r in rows
    ]
    return paginated(data=breakdowns, total_count=total, limit=limit, offset=offset, request=request)


@router.get("/platforms", response_model=DataResponse[list[PlatformStats]])
@limiter.limit(LIMIT_READ)
async def get_platform_stats(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, le=90, ge=1),
) -> DataResponse[list[PlatformStats]]:
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days)

    rows = (
        await db.execute(
            select(ContentQueue.platform, ContentQueue.status, func.count(ContentQueue.id))
            .join(Automation, ContentQueue.automation_id == Automation.id)
            .where(
                Automation.workspace_id == workspace.id,
                ContentQueue.created_at >= start_date,
            )
            .group_by(ContentQueue.platform, ContentQueue.status)
        )
    ).all()

    platform_data: dict[str, dict[str, int]] = defaultdict(
        lambda: {"published": 0, "pending": 0, "rejected": 0}
    )
    for platform, status_val, count in rows:
        if status_val == "published":
            platform_data[platform]["published"] += count
        elif status_val == "pending_approval":
            platform_data[platform]["pending"] += count
        elif status_val == "rejected":
            platform_data[platform]["rejected"] += count

    stats = [
        PlatformStats(
            platform=p,
            content_published=d["published"],
            content_pending=d["pending"],
            content_rejected=d["rejected"],
        )
        for p, d in sorted(platform_data.items())
    ]
    return ok(stats, request)


@router.get("/tokens", response_model=DataResponse[list[TokenUsageSeries]])
@limiter.limit(LIMIT_READ)
async def get_token_series(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, le=90, ge=1),
) -> DataResponse[list[TokenUsageSeries]]:
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days)

    rows = (
        await db.execute(
            select(
                func.date_trunc("day", AutomationRun.created_at).label("day"),
                func.coalesce(func.sum(AutomationRun.ai_tokens_used), 0).label("total_tokens"),
            )
            .join(Automation, AutomationRun.automation_id == Automation.id)
            .where(
                Automation.workspace_id == workspace.id,
                AutomationRun.created_at >= start_date,
            )
            .group_by("day")
            .order_by("day")
        )
    ).all()

    end = datetime.now(tz=timezone.utc).date()
    start = (datetime.now(tz=timezone.utc) - timedelta(days=days - 1)).date()
    series = _fill_date_gaps([(r.day, r.total_tokens) for r in rows], start, end)
    return ok(series, request)


@router.get("/export")
@limiter.limit("10/hour")
async def export_analytics(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, le=90, ge=1),
    format: str = Query(default="json"),
) -> Response:
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days)

    # Overview queries (same as get_overview)
    runs_res = await db.execute(
        select(AutomationRun.status, func.count(AutomationRun.id))
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.created_at >= start_date,
        )
        .group_by(AutomationRun.status)
    )
    run_counts: dict[str, int] = dict(runs_res.all())

    tokens_res = await db.execute(
        select(func.coalesce(func.sum(AutomationRun.ai_tokens_used), 0))
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            AutomationRun.created_at >= start_date,
        )
    )
    total_tokens: int = tokens_res.scalar_one()

    content_res = await db.execute(
        select(ContentQueue.status, func.count(ContentQueue.id))
        .join(Automation, ContentQueue.automation_id == Automation.id)
        .where(
            Automation.workspace_id == workspace.id,
            ContentQueue.created_at >= start_date,
        )
        .group_by(ContentQueue.status)
    )
    content_counts: dict[str, int] = dict(content_res.all())

    dlp_res = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            AuditLog.workspace_id == workspace.id,
            AuditLog.action == "automation_run",
            AuditLog.created_at >= start_date,
            AuditLog.log_metadata.isnot(None),
            func.coalesce(
                func.jsonb_array_length(AuditLog.log_metadata["dlp_violations"]),
                0,
            )
            > 0,
        )
    )
    dlp_violations: int = dlp_res.scalar_one()

    # Token series
    series_rows = (
        await db.execute(
            select(
                func.date_trunc("day", AutomationRun.created_at).label("day"),
                func.coalesce(func.sum(AutomationRun.ai_tokens_used), 0).label("total_tokens"),
            )
            .join(Automation, AutomationRun.automation_id == Automation.id)
            .where(
                Automation.workspace_id == workspace.id,
                AutomationRun.created_at >= start_date,
            )
            .group_by("day")
            .order_by("day")
        )
    ).all()
    end = datetime.now(tz=timezone.utc).date()
    start_day = (datetime.now(tz=timezone.utc) - timedelta(days=days - 1)).date()
    series = _fill_date_gaps([(r.day, r.total_tokens) for r in series_rows], start_day, end)

    total_runs = sum(run_counts.values())
    successful_runs = run_counts.get("success", 0)

    combined: dict[str, Any] = {
        "period_days": days,
        "total_runs": total_runs,
        "successful_runs": successful_runs,
        "failed_runs": run_counts.get("failed", 0),
        "blocked_injection_attempts": run_counts.get("blocked", 0),
        "success_rate": round(successful_runs / total_runs, 4) if total_runs else 0.0,
        "total_tokens_used": total_tokens,
        "estimated_cost_usd": round(total_tokens * _COST_PER_TOKEN, 6),
        "content_published": content_counts.get("published", 0),
        "content_pending_approval": content_counts.get("pending_approval", 0),
        "dlp_violations_caught": dlp_violations,
        "token_series": [s.model_dump() for s in series],
    }

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        # Overview section
        writer.writerow(["metric", "value"])
        for key, value in combined.items():
            if key != "token_series":
                writer.writerow([key, value])
        writer.writerow([])
        # Token series section
        writer.writerow(["date", "total_tokens", "estimated_cost_usd"])
        for entry in series:
            writer.writerow([entry.date, entry.total_tokens, entry.estimated_cost_usd])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=analytics-{days}d.csv"
            },
        )

    return ok(combined, request)
