"""Unit tests for the credential_worker Celery task."""

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import encrypt_credential


def _make_integration(
    status: str = "active",
    expires_in_hours: float | None = None,
) -> MagicMock:
    integration = MagicMock()
    integration.id = uuid.uuid4()
    integration.workspace_id = uuid.uuid4()
    integration.type = "twitter"
    integration.status = status

    creds: dict = {"access_token": "tok"}
    if expires_in_hours is not None:
        exp = datetime.now(tz=timezone.utc) + timedelta(hours=expires_in_hours)
        creds["expires_at"] = exp.timestamp()

    integration.credentials_encrypted = encrypt_credential(json.dumps(creds))
    return integration


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    return m


def _scalars_list(items: list) -> MagicMock:
    m = MagicMock()
    m.scalars.return_value.all.return_value = items
    return m


# ── check_and_refresh_credentials task ────────────────────────────────────────


def test_check_and_refresh_credentials_flags_expiring_integrations() -> None:
    """Task flags active integrations whose tokens expire within 24h as expiring_soon."""
    expiring = _make_integration(status="active", expires_in_hours=6)

    async def _mock_db_context():
        db = MagicMock()
        db.__aenter__ = AsyncMock(return_value=db)
        db.__aexit__ = AsyncMock(return_value=False)
        db.execute = AsyncMock(side_effect=[
            _scalars_list([expiring]),  # check_expiring_credentials query
            _scalar(expiring),          # update status query
        ])
        db.commit = AsyncMock()
        return db

    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[str(expiring.id)]) as mock_check:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalar(expiring))
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert result["flagged"] == 1
    assert expiring.status == "expiring_soon"


def test_check_and_refresh_credentials_returns_zero_when_none_expiring() -> None:
    """Task returns flagged=0 when no credentials are expiring soon."""
    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[]):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert result["flagged"] == 0


def test_check_and_refresh_credentials_skips_non_active_integrations() -> None:
    """Task does not flag integrations that are already disconnected or in error state."""
    non_active = _make_integration(status="disconnected", expires_in_hours=6)

    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[str(non_active.id)]):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalar(non_active))
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert non_active.status == "disconnected"  # unchanged
    assert result["flagged"] == 1  # counted as flagged (from expiring IDs) but status not changed


# ── Required named tests ───────────────────────────────────────────────────────

def test_check_credentials_skips_inactive_integration() -> None:
    """Integration with status != 'active' is skipped even when in expiring list."""
    inactive = _make_integration(status="error", expires_in_hours=6)

    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[str(inactive.id)]):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalar(inactive))
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert inactive.status == "error"  # not changed to expiring_soon
    assert result["refreshed"] == 0


def test_check_credentials_refreshes_expiring_token() -> None:
    """TikTok integration with expiring token is auto-refreshed successfully."""
    tiktok = _make_integration(status="active", expires_in_hours=2)
    tiktok.type = "tiktok"
    # Set a real refresh_token in the credentials
    creds = {"access_token": "old_tok", "refresh_token": "ref_tok",
             "expires_at": (datetime.now(tz=timezone.utc) + timedelta(hours=2)).timestamp()}
    from app.core.security import encrypt_credential
    tiktok.credentials_encrypted = encrypt_credential(json.dumps(creds))

    new_token_data = {
        "access_token": "new_tok",
        "expires_in": 86400,
        "refresh_expires_in": 31536000,
    }

    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[str(tiktok.id)]), \
         patch("app.workers.credential_worker.refresh_tiktok_token", new_callable=AsyncMock,
               return_value=new_token_data), \
         patch("app.workers.credential_worker.rotate_integration_credential", new_callable=AsyncMock):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalar(tiktok))
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert result["flagged"] == 1
    assert result["refreshed"] == 1
    assert tiktok.status == "active"


def test_check_credentials_marks_failed_on_refresh_error() -> None:
    """When TikTok refresh raises an exception, the integration is marked error."""
    tiktok = _make_integration(status="active", expires_in_hours=2)
    tiktok.type = "tiktok"
    creds = {"access_token": "tok", "refresh_token": "ref",
             "expires_at": (datetime.now(tz=timezone.utc) + timedelta(hours=2)).timestamp()}
    from app.core.security import encrypt_credential
    tiktok.credentials_encrypted = encrypt_credential(json.dumps(creds))

    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[str(tiktok.id)]), \
         patch("app.workers.credential_worker.refresh_tiktok_token", new_callable=AsyncMock,
               side_effect=RuntimeError("TikTok API unreachable")), \
         patch("app.workers.credential_worker.mark_integration_error", new_callable=AsyncMock) \
         as mock_mark_error:

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.execute = AsyncMock(return_value=_scalar(tiktok))
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert result["refreshed"] == 0
    mock_mark_error.assert_awaited_once_with(
        str(tiktok.id), "TikTok API unreachable", mock_db
    )


def test_check_credentials_no_op_for_valid_token() -> None:
    """When no integrations are expiring, task returns flagged=0, refreshed=0."""
    with patch("app.workers.credential_worker.AsyncSessionLocal") as mock_session, \
         patch("app.workers.credential_worker.check_expiring_credentials", new_callable=AsyncMock,
               return_value=[]):

        mock_db = MagicMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        mock_db.commit = AsyncMock()
        mock_session.return_value = mock_db

        from app.workers.credential_worker import check_and_refresh_credentials
        result = check_and_refresh_credentials()

    assert result == {"flagged": 0, "refreshed": 0}
