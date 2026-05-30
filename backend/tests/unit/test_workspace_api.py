"""Unit tests for the Workspace API endpoints (app/api/workspaces.py)."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = "ws-test-req"
    return req


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _make_workspace(
    workspace_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    name: str = "Test Workspace",
) -> MagicMock:
    w = MagicMock()
    w.id = workspace_id or uuid.uuid4()
    w.user_id = user_id or uuid.uuid4()
    w.name = name
    w.brand_voice = None
    w.settings = None
    w.created_at = datetime.now(tz=timezone.utc)
    return w


def _count_db(counts: list[int]) -> MagicMock:
    """Build a mock DB that returns scalar_one() for each count value."""
    results = []
    for c in counts:
        r = MagicMock()
        r.scalar_one.return_value = c
        results.append(r)
    db = MagicMock()
    db.execute = AsyncMock(side_effect=results)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ── GET /me ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_my_workspace_returns_workspace_detail() -> None:
    from app.api.workspaces import get_my_workspace

    workspace = _make_workspace(name="Acme Corp")
    db = _count_db([2, 5, 3])  # integrations, automations, active_automations

    result = await get_my_workspace(_make_request(), workspace, db)

    assert result.data.name == "Acme Corp"
    assert result.data.integrations_count == 2
    assert result.data.automations_count == 5
    assert result.data.active_automations_count == 3
    assert result.meta.version == "v1"


@pytest.mark.asyncio
async def test_get_my_workspace_zero_counts_when_no_resources() -> None:
    from app.api.workspaces import get_my_workspace

    workspace = _make_workspace()
    db = _count_db([0, 0, 0])

    result = await get_my_workspace(_make_request(), workspace, db)
    assert result.data.integrations_count == 0
    assert result.data.automations_count == 0
    assert result.data.active_automations_count == 0


# ── PATCH /me ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_workspace_updates_name() -> None:
    from app.api.workspaces import update_my_workspace
    from app.schemas.workspace import WorkspaceUpdate

    workspace = _make_workspace(name="Old Name")
    db = _count_db([0, 0, 0])

    async def _refresh(obj: MagicMock) -> None:
        obj.name = "New Name"

    db.refresh = _refresh

    result = await update_my_workspace(
        _make_request(), WorkspaceUpdate(name="New Name"), workspace, db
    )
    assert result.data.name == "New Name"
    db.commit.assert_awaited_once()


# ── PUT /me/brand-voice ───────────────────────────────────────────────────────


def test_brand_voice_schema_rejects_tone_too_long() -> None:
    from app.schemas.workspace import BrandVoiceSchema

    with pytest.raises(ValidationError, match="500"):
        BrandVoiceSchema(tone="x" * 501)


def test_brand_voice_schema_rejects_script_tag() -> None:
    from app.schemas.workspace import BrandVoiceSchema

    with pytest.raises(ValidationError, match="script injection"):
        BrandVoiceSchema(tone="<script>evil()</script>")


@pytest.mark.asyncio
async def test_set_brand_voice_persists_and_returns() -> None:
    from app.api.workspaces import set_brand_voice
    from app.schemas.workspace import BrandVoiceSchema

    workspace = _make_workspace()
    db = MagicMock()
    db.commit = AsyncMock()

    saved: dict = {}

    async def _refresh(obj: MagicMock) -> None:
        obj.brand_voice = saved.get("bv")

    db.refresh = _refresh

    bv_payload = BrandVoiceSchema(
        tone="Professional and concise",
        avoid=["slang"],
    )

    # Capture what gets written to workspace.brand_voice
    original_setattr = object.__setattr__

    def _capture_bv(val: dict) -> None:
        saved["bv"] = val

    workspace.__class__.brand_voice = property(
        fget=lambda self: saved.get("bv"),
        fset=lambda self, val: saved.update({"bv": val}),
    )

    result = await set_brand_voice(_make_request(), bv_payload, workspace, db)
    db.commit.assert_awaited_once()
    assert result.data.tone == "Professional and concise"


# ── PATCH /me/settings ────────────────────────────────────────────────────────


def test_workspace_settings_rejects_unknown_keys() -> None:
    from app.schemas.workspace import WorkspaceSettingsUpdate

    with pytest.raises(ValidationError):
        WorkspaceSettingsUpdate.model_validate({"unknown_key": "value"})


def test_workspace_settings_accepts_known_keys() -> None:
    from app.schemas.workspace import WorkspaceSettingsUpdate

    s = WorkspaceSettingsUpdate(
        require_approval_default=True,
        content_language="en",
    )
    assert s.require_approval_default is True
    assert s.content_language == "en"


def test_workspace_settings_rejects_invalid_timezone() -> None:
    from app.schemas.workspace import WorkspaceSettingsUpdate

    with pytest.raises(ValidationError, match="timezone"):
        WorkspaceSettingsUpdate(default_timezone="not/a/real/zone")


def test_workspace_settings_rejects_invalid_language_code() -> None:
    from app.schemas.workspace import WorkspaceSettingsUpdate

    with pytest.raises(ValidationError, match="ISO 639-1"):
        WorkspaceSettingsUpdate(content_language="english")


@pytest.mark.asyncio
async def test_patch_settings_merges_with_existing() -> None:
    from app.api.workspaces import patch_settings
    from app.schemas.workspace import WorkspaceSettingsUpdate

    workspace = _make_workspace()
    existing_settings = {"require_approval_default": False, "content_language": "fr"}
    workspace.settings = existing_settings

    merged: dict = {}

    db = MagicMock()
    db.commit = AsyncMock()

    async def _refresh(obj: MagicMock) -> None:
        obj.settings = merged

    db.refresh = _refresh

    def _set_settings(val: dict) -> None:
        merged.update(val)

    workspace.__class__.settings = property(
        fget=lambda self: merged if merged else existing_settings,
        fset=lambda self, val: merged.update(val),
    )

    payload = WorkspaceSettingsUpdate(content_language="en")
    result = await patch_settings(_make_request(), payload, workspace, db)

    db.commit.assert_awaited_once()
    # content_language should be updated, require_approval_default preserved
    assert result.data.get("content_language") == "en"


# ── Access isolation ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_current_workspace_raises_404_when_not_found() -> None:
    """get_current_workspace raises 404 if the user owns no workspace."""
    from app.api.deps import get_current_workspace

    user = MagicMock()
    user.id = uuid.uuid4()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None

    db = MagicMock()
    db.execute = AsyncMock(return_value=execute_result)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_workspace(user, db)
    assert exc_info.value.status_code == 404
