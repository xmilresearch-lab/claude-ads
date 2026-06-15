from collections.abc import Callable, Coroutine
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.audit_log import AuditLog
from app.models.role import PERMISSION_SCOPES, Role
from app.models.user import User
from app.models.workspace import Workspace


async def get_current_workspace(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Workspace:
    """Return the first workspace owned by the authenticated user."""
    result = await db.execute(
        select(Workspace).where(Workspace.user_id == current_user.id).limit(1)
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found"
        )
    return workspace  # type: ignore[no-any-return]


def require_permission(scope: str) -> Callable[..., Coroutine[None, None, User]]:
    """Build a dependency that allows access only if the current user's role has `scope`.

    Users without a `role_id` are treated as admins of their own workspace
    (backward compatible with users created before RBAC was introduced).
    On denial, writes an `AuditLog` entry with action="permission_denied".
    """

    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
        workspace: Annotated[Workspace, Depends(get_current_workspace)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> User:
        if current_user.role_id is None:
            permissions: list[str] = list(PERMISSION_SCOPES)
        else:
            result = await db.execute(select(Role).where(Role.id == current_user.role_id))
            role = result.scalar_one_or_none()
            permissions = role.permissions if role is not None else []

        if scope not in permissions:
            db.add(
                AuditLog(
                    workspace_id=workspace.id,
                    action="permission_denied",
                    actor=str(current_user.id),
                    log_metadata={"scope": scope},
                )
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

        return current_user

    return checker
