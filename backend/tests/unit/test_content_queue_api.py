"""Unit tests for the content queue API endpoints."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.schemas.content_queue import ContentQueueItem


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = "test-req-id"
    return req


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from app.middleware.rate_limiter import limiter

    limiter.enabled = False
    yield
    limiter.enabled = True


def _make_workspace(workspace_id: uuid.UUID | None = None) -> MagicMock:
    w = MagicMock()
    w.id = workspace_id or uuid.uuid4()
    return w


def _make_item(workspace_id: uuid.UUID | None = None, status: str = "pending_approval") -> MagicMock:
    item = MagicMock()
    item.id = uuid.uuid4()
    item.automation_id = uuid.uuid4()
    item.content = {"text": "Test post content"}
    item.platform = "linkedin"
    item.status = status
    item.scheduled_at = None
    item.published_at = None
    item.created_at = datetime.now(tz=timezone.utc)
    return item


def _scalar(value: object) -> MagicMock:
    m = MagicMock()
    m.scalar_one_or_none.return_value = value
    m.scalar_one.return_value = value
    m.scalars.return_value.all.return_value = [value] if value else []
    return m


def _scalars(items: list) -> MagicMock:
    m = MagicMock()
    m.scalar_one.return_value = len(items)
    m.scalars.return_value.all.return_value = items
    return m


def _make_db(*side_effects) -> MagicMock:
    db = MagicMock()
    db.execute = AsyncMock(side_effect=list(side_effects))
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


# ── _get_item_for_workspace ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_item_for_workspace_returns_item() -> None:
    """_get_item_for_workspace returns the item when found."""
    from app.api.content_queue import _get_item_for_workspace

    workspace_id = uuid.uuid4()
    item = _make_item(workspace_id)
    db = _make_db(_scalar(item))

    result = await _get_item_for_workspace(item.id, workspace_id, db)
    assert result is item


@pytest.mark.asyncio
async def test_get_item_for_workspace_returns_none_when_missing() -> None:
    """_get_item_for_workspace returns None when item not found."""
    from app.api.content_queue import _get_item_for_workspace

    db = _make_db(_scalar(None))
    result = await _get_item_for_workspace(uuid.uuid4(), uuid.uuid4(), db)
    assert result is None


# ── list_pending ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_pending_returns_paginated_items() -> None:
    """list_pending returns pending items for the workspace."""
    from app.api.content_queue import list_pending

    workspace = _make_workspace()
    items = [_make_item(workspace.id), _make_item(workspace.id)]
    db = _make_db(_scalar(2), _scalars(items))

    with patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate:
        mock_validate.side_effect = lambda x: MagicMock(id=x.id, status=x.status,
                                                         platform=x.platform,
                                                         automation_id=x.automation_id,
                                                         content=x.content,
                                                         scheduled_at=None,
                                                         published_at=None,
                                                         created_at=x.created_at)
        response = await list_pending(_make_request(), workspace, db, offset=0, limit=50)

    assert response.meta.total_count == 2
    assert response.meta.has_more is False


@pytest.mark.asyncio
async def test_list_pending_empty_queue() -> None:
    """list_pending returns empty list when no pending items."""
    from app.api.content_queue import list_pending

    workspace = _make_workspace()
    db = _make_db(_scalar(0), _scalars([]))

    response = await list_pending(_make_request(), workspace, db, offset=0, limit=50)

    assert response.meta.total_count == 0
    assert response.data == []


@pytest.mark.asyncio
async def test_list_pending_has_more_when_truncated() -> None:
    """list_pending sets has_more=True when total > limit."""
    from app.api.content_queue import list_pending

    workspace = _make_workspace()
    items = [_make_item(workspace.id)]
    db = _make_db(_scalar(5), _scalars(items))

    with patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate:
        mock_validate.side_effect = lambda x: MagicMock(id=x.id, status=x.status,
                                                         platform=x.platform,
                                                         automation_id=x.automation_id,
                                                         content=x.content,
                                                         scheduled_at=None,
                                                         published_at=None,
                                                         created_at=x.created_at)
        response = await list_pending(_make_request(), workspace, db, offset=0, limit=1)

    assert response.meta.total_count == 5
    assert response.meta.has_more is True


# ── get_item ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_item_returns_item() -> None:
    """get_item returns the content queue item."""
    from app.api.content_queue import get_item

    workspace = _make_workspace()
    item = _make_item(workspace.id)

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=item), \
         patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate:
        mock_validate.return_value = MagicMock(id=item.id)
        response = await get_item(_make_request(), item.id, workspace, MagicMock())

    assert response.data is not None


@pytest.mark.asyncio
async def test_get_item_raises_404_when_not_found() -> None:
    """get_item raises 404 when item not found."""
    from app.api.content_queue import get_item

    workspace = _make_workspace()

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            await get_item(_make_request(), uuid.uuid4(), workspace, MagicMock())

    assert exc_info.value.status_code == 404


# ── approve_item ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_approve_item_sets_approved_status() -> None:
    """approve_item sets status to approved and dispatches Celery task."""
    from app.api.content_queue import approve_item

    workspace = _make_workspace()
    item = _make_item(workspace.id)
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=item), \
         patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate, \
         patch("app.workers.publish_worker.publish_content.delay") as mock_delay:
        mock_validate.return_value = MagicMock(id=item.id, status="approved")
        response = await approve_item(_make_request(), item.id, workspace, db)

    assert item.status == "approved"
    mock_delay.assert_called_once()


@pytest.mark.asyncio
async def test_approve_item_raises_404_when_not_found() -> None:
    """approve_item raises 404 when item not found."""
    from app.api.content_queue import approve_item

    workspace = _make_workspace()
    db = MagicMock()

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            await approve_item(_make_request(), uuid.uuid4(), workspace, db)

    assert exc_info.value.status_code == 404


# ── reject_item ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_reject_item_sets_rejected_status_and_reason() -> None:
    """reject_item sets status to rejected and stores rejection reason."""
    from app.api.content_queue import reject_item
    from app.schemas.content_queue import ContentQueueReject

    workspace = _make_workspace()
    item = _make_item(workspace.id)
    item.content = {"text": "Test post"}
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    payload = ContentQueueReject(reason="Off-brand messaging")

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=item), \
         patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate:
        mock_validate.return_value = MagicMock(id=item.id, status="rejected")
        response = await reject_item(_make_request(), item.id, payload, workspace, db)

    assert item.status == "rejected"
    assert item.content["_rejection_reason"] == "Off-brand messaging"


@pytest.mark.asyncio
async def test_reject_item_raises_404_when_not_found() -> None:
    """reject_item raises 404 when item not found."""
    from app.api.content_queue import reject_item
    from app.schemas.content_queue import ContentQueueReject

    workspace = _make_workspace()
    payload = ContentQueueReject(reason="Off-brand")

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            await reject_item(_make_request(), uuid.uuid4(), payload, workspace, MagicMock())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_reject_item_empty_reason() -> None:
    """reject_item works with an empty reason string (default)."""
    from app.api.content_queue import reject_item
    from app.schemas.content_queue import ContentQueueReject

    workspace = _make_workspace()
    item = _make_item(workspace.id)
    item.content = {"text": "Test post"}
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    payload = ContentQueueReject(reason="")

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=item), \
         patch("app.api.content_queue.ContentQueueItem.model_validate") as mock_validate:
        mock_validate.return_value = MagicMock(id=item.id, status="rejected")
        await reject_item(_make_request(), item.id, payload, workspace, db)

    assert item.status == "rejected"
    assert item.content["_rejection_reason"] == ""


# ── delete_item ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_item_removes_from_db() -> None:
    """delete_item calls db.delete and db.commit."""
    from app.api.content_queue import delete_item

    workspace = _make_workspace()
    item = _make_item(workspace.id)
    db = MagicMock()
    db.delete = AsyncMock()
    db.commit = AsyncMock()

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=item):
        await delete_item(_make_request(), item.id, workspace, db)

    db.delete.assert_called_once_with(item)
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_item_raises_404_when_not_found() -> None:
    """delete_item raises 404 when item not found."""
    from app.api.content_queue import delete_item

    workspace = _make_workspace()

    with patch("app.api.content_queue._get_item_for_workspace", new_callable=AsyncMock, return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            await delete_item(_make_request(), uuid.uuid4(), workspace, MagicMock())

    assert exc_info.value.status_code == 404
