"""Unit tests for the Role model and default-role seeding (Sprint 12 RBAC)."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from starlette.requests import Request


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = "role-test-req"
    return req


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    m.scalar_one.return_value = value
    return m


def _make_db(*side_effects: object) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(side_effects))
    db.add = MagicMock()
    db.add_all = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ── build_default_roles ──────────────────────────────────────────────────────


def test_build_default_roles_creates_four_roles() -> None:
    from app.models.role import DEFAULT_ROLE_PERMISSIONS
    from app.services.role_service import build_default_roles

    workspace_id = uuid.uuid4()
    roles = build_default_roles(workspace_id)

    assert {role.name for role in roles} == {"admin", "staff", "caregiver", "patient"}
    for role in roles:
        assert role.workspace_id == workspace_id
        assert role.permissions == DEFAULT_ROLE_PERMISSIONS[role.name]


def test_admin_role_has_all_permission_scopes() -> None:
    from app.models.role import PERMISSION_SCOPES
    from app.services.role_service import build_default_roles

    roles = build_default_roles(uuid.uuid4())
    admin = next(role for role in roles if role.name == "admin")

    assert set(admin.permissions) == set(PERMISSION_SCOPES)


def test_staff_caregiver_patient_have_restricted_scopes() -> None:
    from app.models.role import PERMISSION_SCOPES
    from app.services.role_service import build_default_roles

    roles = {role.name: role for role in build_default_roles(uuid.uuid4())}

    assert "roles:manage" not in roles["staff"].permissions
    assert "roles:manage" not in roles["caregiver"].permissions
    assert "roles:manage" not in roles["patient"].permissions

    assert "forms:create" in roles["staff"].permissions
    assert "forms:create" not in roles["caregiver"].permissions
    assert "forms:create" not in roles["patient"].permissions

    for role in roles.values():
        assert set(role.permissions).issubset(set(PERMISSION_SCOPES))


# ── register() seeds default roles for new workspaces ───────────────────────


@pytest.mark.asyncio
async def test_register_creates_default_roles_and_assigns_admin() -> None:
    from app.api.auth import register
    from app.models.role import Role
    from app.schemas.auth import RegisterRequest

    db = _make_db(_scalar(None))  # no existing user with this email
    payload = RegisterRequest(
        email="new@example.com",
        password="Test1234!",
        workspace_name="My Company",
    )

    response = await register(_make_request(), payload, db)

    assert response.data.access_token is not None

    # db.add_all should have been called with the 4 default roles
    role_batches = [
        call.args[0] for call in db.add_all.call_args_list if call.args
    ]
    assert len(role_batches) == 1
    roles = list(role_batches[0])
    assert len(roles) == 4
    assert all(isinstance(role, Role) for role in roles)
    assert {role.name for role in roles} == {"admin", "staff", "caregiver", "patient"}

    # The new user (added via db.add) should be assigned the admin role's id
    added_users = [
        call.args[0]
        for call in db.add.call_args_list
        if call.args and call.args[0].__class__.__name__ == "User"
    ]
    assert len(added_users) == 1
    user = added_users[0]
    admin_role = next(role for role in roles if role.name == "admin")
    assert user.role_id == admin_role.id
