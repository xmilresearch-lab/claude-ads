"""Unit tests for the require_permission dependency factory (Sprint 12 RBAC)."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    m.scalar_one.return_value = value
    return m


def _make_db(*side_effects: object) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(side_effects))
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


def _make_user(role_id: uuid.UUID | None = None) -> MagicMock:
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role_id = role_id
    return user


def _make_workspace() -> MagicMock:
    workspace = MagicMock()
    workspace.id = uuid.uuid4()
    return workspace


def _make_role(permissions: list[str]) -> MagicMock:
    role = MagicMock()
    role.id = uuid.uuid4()
    role.permissions = permissions
    return role


# ── allows when scope present ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_require_permission_allows_when_scope_present() -> None:
    from app.api.deps import require_permission

    role = _make_role(["forms:create", "forms:edit"])
    user = _make_user(role_id=role.id)
    workspace = _make_workspace()
    db = _make_db(_scalar(role))

    checker = require_permission("forms:create")
    result = await checker(user, workspace, db)

    assert result is user
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


# ── denies + audit-logs when scope missing ───────────────────────────────────


@pytest.mark.asyncio
async def test_require_permission_denies_and_audit_logs_when_scope_missing() -> None:
    from app.api.deps import require_permission
    from app.models.audit_log import AuditLog

    role = _make_role(["forms:view_own"])
    user = _make_user(role_id=role.id)
    workspace = _make_workspace()
    db = _make_db(_scalar(role))

    checker = require_permission("forms:delete")

    with pytest.raises(HTTPException) as exc_info:
        await checker(user, workspace, db)

    assert exc_info.value.status_code == 403

    db.commit.assert_awaited_once()
    added = [call.args[0] for call in db.add.call_args_list]
    audit_logs = [obj for obj in added if isinstance(obj, AuditLog)]
    assert len(audit_logs) == 1
    assert audit_logs[0].action == "permission_denied"
    assert audit_logs[0].workspace_id == workspace.id
    assert audit_logs[0].actor == str(user.id)
    assert audit_logs[0].log_metadata == {"scope": "forms:delete"}


# ── backward-compat: user without role_id is treated as admin ───────────────


@pytest.mark.asyncio
async def test_user_without_role_id_treated_as_admin() -> None:
    from app.api.deps import require_permission
    from app.models.role import PERMISSION_SCOPES

    user = _make_user(role_id=None)
    workspace = _make_workspace()
    db = _make_db()

    for scope in PERMISSION_SCOPES:
        checker = require_permission(scope)
        result = await checker(user, workspace, db)
        assert result is user

    # No role lookup should be needed for legacy users
    db.execute.assert_not_called()
    db.add.assert_not_called()
