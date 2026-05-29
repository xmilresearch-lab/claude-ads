"""Unit tests for the Analytics API (app/api/analytics.py)."""

import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
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
    req.state.request_id = "analytics-test-req"
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


def _mock_overview_db(
    run_counts: list[tuple[str, int]],
    total_tokens: int,
    content_counts: list[tuple[str, int]],
    dlp_count: int,
) -> MagicMock:
    """Build a mock DB that returns the 4 overview queries in order."""
    rc = MagicMock()
    rc.all.return_value = run_counts

    tr = MagicMock()
    tr.scalar_one.return_value = total_tokens

    cc = MagicMock()
    cc.all.return_value = content_counts

    dc = MagicMock()
    dc.scalar_one.return_value = dlp_count

    db = MagicMock()
    db.execute = AsyncMock(side_effect=[rc, tr, cc, dc])
    return db


# ── get_overview ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_overview_returns_correct_counts() -> None:
    """get_overview aggregates run counts, tokens, content counts, and DLP violations."""
    from app.api.analytics import get_overview

    workspace = _make_workspace()
    db = _mock_overview_db(
        run_counts=[("success", 8), ("failed", 2), ("blocked", 1)],
        total_tokens=5000,
        content_counts=[("published", 3), ("pending_approval", 2), ("rejected", 1)],
        dlp_count=2,
    )

    result = await get_overview(_make_request(), workspace, db, days=30)

    assert result.data.period_days == 30
    assert result.data.total_runs == 11
    assert result.data.successful_runs == 8
    assert result.data.failed_runs == 2
    assert result.data.blocked_injection_attempts == 1
    assert result.data.total_tokens_used == 5000
    assert result.data.content_published == 3
    assert result.data.content_pending_approval == 2
    assert result.data.dlp_violations_caught == 2
    assert abs(result.data.success_rate - 8 / 11) < 0.001
    assert result.data.estimated_cost_usd == pytest.approx(5000 * 0.000003, rel=1e-4)


@pytest.mark.asyncio
async def test_overview_success_rate_is_zero_when_no_runs() -> None:
    """success_rate must be 0.0 (not a division error) when total_runs is 0."""
    from app.api.analytics import get_overview

    workspace = _make_workspace()
    db = _mock_overview_db(
        run_counts=[],
        total_tokens=0,
        content_counts=[],
        dlp_count=0,
    )

    result = await get_overview(_make_request(), workspace, db, days=30)

    assert result.data.success_rate == 0.0
    assert result.data.total_runs == 0
    assert result.data.successful_runs == 0
    assert result.data.estimated_cost_usd == 0.0


@pytest.mark.asyncio
async def test_overview_all_runs_successful_rate_is_one() -> None:
    from app.api.analytics import get_overview

    workspace = _make_workspace()
    db = _mock_overview_db(
        run_counts=[("success", 10)],
        total_tokens=1000,
        content_counts=[],
        dlp_count=0,
    )

    result = await get_overview(_make_request(), workspace, db, days=7)
    assert result.data.success_rate == pytest.approx(1.0)


# ── _fill_date_gaps ───────────────────────────────────────────────────────────


def test_token_series_fills_zero_usage_days() -> None:
    """_fill_date_gaps must produce an entry for every day, with 0 for days with no data."""
    from app.api.analytics import _fill_date_gaps

    start = date(2025, 1, 1)
    end = date(2025, 1, 7)
    # Only days 3 and 6 have token data
    series_data = [(date(2025, 1, 3), 1000), (date(2025, 1, 6), 2000)]

    result = _fill_date_gaps(series_data, start, end)

    assert len(result) == 7
    assert result[0].date == "2025-01-01"
    assert result[0].total_tokens == 0
    assert result[2].date == "2025-01-03"
    assert result[2].total_tokens == 1000
    assert result[5].date == "2025-01-06"
    assert result[5].total_tokens == 2000
    # All zero days have zero cost
    for entry in result:
        assert entry.estimated_cost_usd == pytest.approx(entry.total_tokens * 0.000003)


def test_token_series_empty_input_produces_all_zeros() -> None:
    from app.api.analytics import _fill_date_gaps

    start = date(2025, 3, 1)
    end = date(2025, 3, 3)
    result = _fill_date_gaps([], start, end)

    assert len(result) == 3
    assert all(e.total_tokens == 0 for e in result)
    assert all(e.estimated_cost_usd == 0.0 for e in result)


def test_token_series_single_day_range() -> None:
    from app.api.analytics import _fill_date_gaps

    d = date(2025, 6, 15)
    result = _fill_date_gaps([(d, 500)], d, d)

    assert len(result) == 1
    assert result[0].date == "2025-06-15"
    assert result[0].total_tokens == 500


def test_token_series_accepts_datetime_objects() -> None:
    """_fill_date_gaps must convert datetime objects (from SQL date_trunc) to date."""
    from app.api.analytics import _fill_date_gaps

    # date_trunc returns datetime, not date
    dt = datetime(2025, 2, 10, 0, 0, 0, tzinfo=timezone.utc)
    start = date(2025, 2, 10)
    end = date(2025, 2, 10)
    result = _fill_date_gaps([(dt, 300)], start, end)

    assert len(result) == 1
    assert result[0].total_tokens == 300


# ── CSV export ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_csv_export_has_content_disposition_attachment() -> None:
    """export_analytics with format='csv' must return StreamingResponse with attachment header."""
    from app.api.analytics import export_analytics

    workspace = _make_workspace()

    # 5 queries: 4 for overview + 1 for token series
    runs_res = MagicMock(); runs_res.all.return_value = []
    tokens_res = MagicMock(); tokens_res.scalar_one.return_value = 0
    content_res = MagicMock(); content_res.all.return_value = []
    dlp_res = MagicMock(); dlp_res.scalar_one.return_value = 0
    series_res = MagicMock(); series_res.all.return_value = []

    db = MagicMock()
    db.execute = AsyncMock(side_effect=[runs_res, tokens_res, content_res, dlp_res, series_res])

    response = await export_analytics(_make_request(), workspace, db, days=7, format="csv")

    assert isinstance(response, StreamingResponse)
    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition.lower()
    assert "analytics-7d.csv" in content_disposition


@pytest.mark.asyncio
async def test_csv_export_media_type_is_text_csv() -> None:
    from app.api.analytics import export_analytics

    workspace = _make_workspace()

    runs_res = MagicMock(); runs_res.all.return_value = [("success", 5)]
    tokens_res = MagicMock(); tokens_res.scalar_one.return_value = 1000
    content_res = MagicMock(); content_res.all.return_value = [("published", 2)]
    dlp_res = MagicMock(); dlp_res.scalar_one.return_value = 0
    series_res = MagicMock(); series_res.all.return_value = []

    db = MagicMock()
    db.execute = AsyncMock(side_effect=[runs_res, tokens_res, content_res, dlp_res, series_res])

    response = await export_analytics(_make_request(), workspace, db, days=30, format="csv")

    assert isinstance(response, StreamingResponse)
    assert "text/csv" in response.media_type


@pytest.mark.asyncio
async def test_json_export_returns_data_response() -> None:
    from app.api.analytics import export_analytics
    from app.schemas.base import DataResponse

    workspace = _make_workspace()

    runs_res = MagicMock(); runs_res.all.return_value = [("success", 3)]
    tokens_res = MagicMock(); tokens_res.scalar_one.return_value = 900
    content_res = MagicMock(); content_res.all.return_value = []
    dlp_res = MagicMock(); dlp_res.scalar_one.return_value = 0
    series_res = MagicMock(); series_res.all.return_value = []

    db = MagicMock()
    db.execute = AsyncMock(side_effect=[runs_res, tokens_res, content_res, dlp_res, series_res])

    response = await export_analytics(_make_request(), workspace, db, days=30, format="json")

    assert isinstance(response, DataResponse)
    assert response.data["total_runs"] == 3
    assert response.data["total_tokens_used"] == 900


# ── Workspace isolation ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_analytics_returns_404_when_user_has_no_workspace() -> None:
    """get_current_workspace raises 404 when the user owns no workspace — analytics is blocked."""
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


@pytest.mark.asyncio
async def test_overview_only_queries_current_workspace() -> None:
    """get_overview queries must be scoped to the provided workspace — different workspaces
    get different results from identical underlying data."""
    from app.api.analytics import get_overview

    ws_a = _make_workspace()
    ws_b = _make_workspace()

    # Workspace A has runs; workspace B has none
    db_a = _mock_overview_db(
        run_counts=[("success", 5)],
        total_tokens=2000,
        content_counts=[],
        dlp_count=0,
    )
    db_b = _mock_overview_db(
        run_counts=[],
        total_tokens=0,
        content_counts=[],
        dlp_count=0,
    )

    result_a = await get_overview(_make_request(), ws_a, db_a, days=30)
    result_b = await get_overview(_make_request(), ws_b, db_b, days=30)

    assert result_a.data.total_runs == 5
    assert result_b.data.total_runs == 0
