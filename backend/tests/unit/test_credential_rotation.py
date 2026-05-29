"""Unit tests for credential_rotation service."""

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import decrypt_credential, encrypt_credential


def _make_db(*side_effects) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(side_effects))
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    m.scalars.return_value.all.return_value = [value] if value else []
    return m


def _scalars_list(items: list) -> MagicMock:
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    return m


def _make_integration(
    status: str = "active",
    creds: dict | None = None,
) -> MagicMock:
    if creds is None:
        creds = {"access_token": "old_token", "refresh_token": "old_refresh"}
    integration = MagicMock()
    integration.id = uuid.uuid4()
    integration.workspace_id = uuid.uuid4()
    integration.type = "twitter"
    integration.status = status
    integration.credentials_encrypted = encrypt_credential(json.dumps(creds))
    integration.updated_at = datetime.now(tz=timezone.utc)
    return integration


# ── rotate_integration_credential ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_rotate_merges_new_tokens_into_existing() -> None:
    """rotate_integration_credential merges new token data and re-encrypts."""
    from app.services.credential_rotation import rotate_integration_credential

    integration = _make_integration(creds={"access_token": "old", "refresh_token": "keep_me"})
    db = _make_db(_scalar(integration))

    await rotate_integration_credential(
        str(integration.id),
        {"access_token": "new_access"},
        db,
    )

    new_creds = json.loads(decrypt_credential(integration.credentials_encrypted))
    assert new_creds["access_token"] == "new_access"
    assert new_creds["refresh_token"] == "keep_me"
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_rotate_replaces_refresh_token_when_provided() -> None:
    """rotate uses new refresh_token when provided, overwriting old one."""
    from app.services.credential_rotation import rotate_integration_credential

    integration = _make_integration(creds={"access_token": "old", "refresh_token": "old_refresh"})
    db = _make_db(_scalar(integration))

    await rotate_integration_credential(
        str(integration.id),
        {"access_token": "new_access", "refresh_token": "new_refresh"},
        db,
    )

    new_creds = json.loads(decrypt_credential(integration.credentials_encrypted))
    assert new_creds["refresh_token"] == "new_refresh"


@pytest.mark.asyncio
async def test_rotate_raises_when_integration_not_found() -> None:
    """rotate_integration_credential raises ValueError when integration ID not found."""
    from app.services.credential_rotation import rotate_integration_credential

    db = _make_db(_scalar(None))

    with pytest.raises(ValueError, match="not found"):
        await rotate_integration_credential(
            str(uuid.uuid4()),
            {"access_token": "new"},
            db,
        )


@pytest.mark.asyncio
async def test_rotate_writes_audit_log() -> None:
    """rotate_integration_credential writes a credential_rotated audit log."""
    from app.services.credential_rotation import rotate_integration_credential

    integration = _make_integration()
    db = _make_db(_scalar(integration))

    await rotate_integration_credential(
        str(integration.id),
        {"access_token": "new"},
        db,
    )

    db.add.assert_called_once()
    audit_log = db.add.call_args[0][0]
    assert audit_log.action == "credential_rotated"
    assert audit_log.actor == "system"


# ── check_expiring_credentials ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_check_expiring_returns_ids_expiring_soon() -> None:
    """check_expiring_credentials returns IDs for tokens expiring within 24 hours."""
    from app.services.credential_rotation import check_expiring_credentials

    soon = datetime.now(tz=timezone.utc) + timedelta(hours=12)
    integration = _make_integration(
        creds={"access_token": "token", "expires_at": soon.timestamp()}
    )
    db = _make_db(_scalars_list([integration]))

    result = await check_expiring_credentials(db)

    assert str(integration.id) in result


@pytest.mark.asyncio
async def test_check_expiring_excludes_non_expiring_tokens() -> None:
    """check_expiring_credentials excludes tokens that expire in more than 24 hours."""
    from app.services.credential_rotation import check_expiring_credentials

    future = datetime.now(tz=timezone.utc) + timedelta(days=7)
    integration = _make_integration(
        creds={"access_token": "token", "expires_at": future.timestamp()}
    )
    db = _make_db(_scalars_list([integration]))

    result = await check_expiring_credentials(db)

    assert result == []


@pytest.mark.asyncio
async def test_check_expiring_skips_tokens_with_no_expiry() -> None:
    """check_expiring_credentials skips integrations that have no expires_at."""
    from app.services.credential_rotation import check_expiring_credentials

    integration = _make_integration(creds={"access_token": "token"})
    db = _make_db(_scalars_list([integration]))

    result = await check_expiring_credentials(db)

    assert result == []


@pytest.mark.asyncio
async def test_check_expiring_skips_unreadable_credentials() -> None:
    """check_expiring_credentials skips integrations with unreadable creds."""
    from app.services.credential_rotation import check_expiring_credentials

    integration = MagicMock()
    integration.id = uuid.uuid4()
    integration.credentials_encrypted = "invalid_base64_garbage"
    db = _make_db(_scalars_list([integration]))

    result = await check_expiring_credentials(db)

    assert result == []


@pytest.mark.asyncio
async def test_check_expiring_handles_iso_format_expires_at() -> None:
    """check_expiring_credentials handles ISO string expires_at."""
    from app.services.credential_rotation import check_expiring_credentials

    soon = (datetime.now(tz=timezone.utc) + timedelta(hours=6)).isoformat()
    integration = _make_integration(
        creds={"access_token": "token", "expires_at": soon}
    )
    db = _make_db(_scalars_list([integration]))

    result = await check_expiring_credentials(db)

    assert str(integration.id) in result


# ── mark_integration_error ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_integration_error_sets_status_and_audit_log() -> None:
    """mark_integration_error sets status=error and writes audit log."""
    from app.services.credential_rotation import mark_integration_error

    integration = _make_integration()
    db = _make_db(_scalar(integration))

    await mark_integration_error(str(integration.id), "token_expired", db)

    assert integration.status == "error"
    db.add.assert_called_once()
    audit_log = db.add.call_args[0][0]
    assert audit_log.action == "integration_error"
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_mark_integration_error_is_noop_when_not_found() -> None:
    """mark_integration_error silently returns when integration not found."""
    from app.services.credential_rotation import mark_integration_error

    db = _make_db(_scalar(None))

    await mark_integration_error(str(uuid.uuid4()), "error", db)

    db.add.assert_not_called()
    db.commit.assert_not_called()
