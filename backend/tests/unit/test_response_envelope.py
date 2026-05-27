"""Unit tests for the response envelope helpers (app/schemas/base.py)."""

from starlette.requests import Request

from app.schemas.base import DataResponse, ErrorDetail, ErrorResponse, Meta, ok, paginated


def _make_request(request_id: str = "req-test") -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    req = Request(scope)
    req.state.request_id = request_id
    return req


# ── ok() ──────────────────────────────────────────────────────────────────────


def test_ok_returns_data_with_correct_meta() -> None:
    from pydantic import BaseModel

    class Payload(BaseModel):
        value: int

    result = ok(Payload(value=42), _make_request("r-123"))

    assert result.data.value == 42
    assert result.meta.request_id == "r-123"
    assert result.meta.version == "v1"
    # ISO 8601 timestamps contain 'T'
    assert "T" in result.meta.timestamp


def test_ok_works_with_plain_dict() -> None:
    result = ok({"key": "val"}, _make_request())
    assert result.data == {"key": "val"}


def test_ok_meta_has_utc_timestamp() -> None:
    from datetime import datetime, timezone

    result = ok("anything", _make_request())
    # Should parse as a valid ISO datetime
    dt = datetime.fromisoformat(result.meta.timestamp)
    assert dt.tzinfo is not None


# ── paginated() ───────────────────────────────────────────────────────────────


def test_paginated_has_more_true_when_items_remain() -> None:
    result = paginated(
        data=["a", "b"],
        total_count=10,
        limit=2,
        offset=0,
        request=_make_request(),
    )

    assert result.meta.has_more is True
    assert result.meta.total_count == 10
    assert result.meta.limit == 2
    assert result.meta.offset == 0
    assert len(result.data) == 2


def test_paginated_has_more_false_at_last_page() -> None:
    result = paginated(
        data=["a", "b"],
        total_count=5,
        limit=3,
        offset=3,
        request=_make_request(),
    )

    assert result.meta.has_more is False  # offset(3) + limit(3) >= total(5)


def test_paginated_has_more_false_when_exact_fit() -> None:
    result = paginated(
        data=list(range(5)),
        total_count=5,
        limit=5,
        offset=0,
        request=_make_request(),
    )

    assert result.meta.has_more is False


def test_paginated_meta_request_id_propagated() -> None:
    result = paginated(data=[], total_count=0, limit=10, offset=0, request=_make_request("pg-id"))
    assert result.meta.request_id == "pg-id"


# ── ErrorResponse ─────────────────────────────────────────────────────────────


def test_error_response_includes_field_name() -> None:
    err = ErrorDetail(code="validation_error", message="too long", field="name")
    meta = Meta(request_id="r1", timestamp="2025-01-01T00:00:00+00:00")
    resp = ErrorResponse(errors=[err], meta=meta)

    assert resp.errors[0].field == "name"
    assert resp.errors[0].code == "validation_error"
    assert resp.errors[0].message == "too long"


def test_error_response_field_is_optional() -> None:
    err = ErrorDetail(code="internal_error", message="something went wrong")
    assert err.field is None


def test_error_response_multiple_errors() -> None:
    meta = Meta(request_id="r1", timestamp="2025-01-01T00:00:00+00:00")
    resp = ErrorResponse(
        errors=[
            ErrorDetail(code="validation_error", message="required", field="email"),
            ErrorDetail(code="validation_error", message="too short", field="password"),
        ],
        meta=meta,
    )
    assert len(resp.errors) == 2
    fields = [e.field for e in resp.errors]
    assert "email" in fields
    assert "password" in fields
