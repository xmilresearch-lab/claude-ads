"""Admin-only SaaS telemetry and operations endpoints.

All endpoints in this router require is_admin=True on the authenticated user.
Routed under /api/v1/admin/saas by main.py.
"""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.base import COMMON_ERROR_RESPONSES, DataResponse, PaginatedResponse, ok, paginated

router = APIRouter()

_PLAN_PRICES: dict[str, float] = {"starter": 29.0, "pro": 79.0, "enterprise": 0.0}


async def _require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ── Stats overview ───────────────────────────────────────────────────────────


@router.get(
    "/stats",
    summary="SaaS Revenue & Growth Stats",
    description="MRR, total subscribers, new signups (30d), and churned users (30d). Admin only.",
    responses={**COMMON_ERROR_RESPONSES, 403: {"description": "Admin access required"}},
    response_model=DataResponse[dict],
)
async def saas_stats(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(_require_admin)],
) -> DataResponse[dict]:
    now = datetime.now(UTC)
    thirty_days_ago = now - timedelta(days=30)

    # Total active users by plan
    plan_res = await db.execute(
        select(User.subscription_status, func.count(User.id))
        .where(User.is_active == True)  # noqa: E712
        .group_by(User.subscription_status)
    )
    plan_counts: dict[str, int] = dict(plan_res.all())

    # MRR
    mrr = sum(
        count * _PLAN_PRICES.get(plan, 0.0)
        for plan, count in plan_counts.items()
    )

    # New signups (30d)
    signups_res = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= thirty_days_ago,
            User.is_active == True,  # noqa: E712
        )
    )
    new_signups: int = signups_res.scalar_one()

    # Churned (subscription_status moved to free within 30d, approximated by
    # users whose current_period_end fell within the window)
    churned_res = await db.execute(
        select(func.count(User.id)).where(
            User.subscription_status == "free",
            User.current_period_end.isnot(None),
            User.current_period_end >= thirty_days_ago,
            User.current_period_end <= now,
        )
    )
    churned: int = churned_res.scalar_one()

    total_users: int = sum(plan_counts.values())
    paid_users: int = total_users - plan_counts.get("free", 0)

    return ok(
        {
            "mrr_usd": round(mrr, 2),
            "total_active_users": total_users,
            "paid_users": paid_users,
            "free_users": plan_counts.get("free", 0),
            "users_by_plan": plan_counts,
            "new_signups_30d": new_signups,
            "churned_30d": churned,
            "as_of": now.isoformat(),
        },
        request,
    )


# ── Token spend by workspace ───────────────────────────────────────────────────


@router.get(
    "/token-usage",
    summary="Token Usage by Workspace",
    description="Platform-wide monthly token usage sorted by highest consumers. Admin only.",
    responses={**COMMON_ERROR_RESPONSES, 403: {"description": "Admin access required"}},
    response_model=PaginatedResponse[dict],
)
async def token_usage_by_workspace(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(_require_admin)],
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PaginatedResponse[dict]:
    total_res = await db.execute(select(func.count(Workspace.id)))
    total: int = total_res.scalar_one()

    rows = (
        await db.execute(
            select(
                Workspace.id,
                Workspace.name,
                Workspace.monthly_token_usage,
                Workspace.monthly_token_reset_date,
                User.email,
                User.subscription_status,
            )
            .join(User, Workspace.user_id == User.id)
            .order_by(Workspace.monthly_token_usage.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    data = [
        {
            "workspace_id": str(r.id),
            "workspace_name": r.name,
            "owner_email": r.email,
            "plan": r.subscription_status,
            "monthly_token_usage": r.monthly_token_usage,
            "reset_date": r.monthly_token_reset_date.isoformat() if r.monthly_token_reset_date else None,
        }
        for r in rows
    ]
    return paginated(data=data, total_count=total, limit=limit, offset=offset, request=request)


# ── Impersonation ──────────────────────────────────────────────────────────────


@router.post(
    "/impersonate/{user_id}",
    summary="Impersonate User",
    description=(
        "Generate a short-lived (1h) access token for a specific user. "
        "Used by support engineers to reproduce issues in a user's account. "
        "Action is written to audit_logs with the admin's identity. Admin only."
    ),
    responses={**COMMON_ERROR_RESPONSES, 403: {"description": "Admin access required"}, 404: {"description": "User not found"}},
    response_model=DataResponse[dict],
)
async def impersonate_user(
    request: Request,
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(_require_admin)],
) -> DataResponse[dict]:
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Generate 1-hour access token with impersonation marker
    token = create_access_token(
        data={"sub": str(target.id), "impersonated_by": str(admin.id)},
        expires_delta=timedelta(hours=1),
    )

    # Look up workspace for audit log
    ws_res = await db.execute(select(Workspace).where(Workspace.user_id == target.id))
    workspace = ws_res.scalar_one_or_none()

    if workspace:
        db.add(
            AuditLog(
                id=uuid.uuid4(),
                workspace_id=workspace.id,
                action="admin.impersonate",
                actor=str(admin.id),
                log_metadata={
                    "target_user_id": str(target.id),
                    "target_email": target.email,
                    "admin_email": admin.email,
                },
            )
        )
        await db.commit()

    return ok(
        {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 3600,
            "target_user_id": str(target.id),
            "target_email": target.email,
        },
        request,
    )
