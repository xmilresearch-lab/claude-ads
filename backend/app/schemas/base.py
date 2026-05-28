from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from fastapi import Request
from pydantic import BaseModel

T = TypeVar("T")

# ── Shared OpenAPI error response definitions ─────────────────────────────────

COMMON_ERROR_RESPONSES: dict[int, dict[str, str]] = {
    401: {"description": "Not authenticated — Bearer token missing or expired"},
    403: {"description": "Forbidden — you do not own this resource"},
    404: {"description": "Not found"},
    422: {"description": "Validation error — request body or query parameter invalid"},
    429: {"description": "Rate limit exceeded — slow down and retry"},
    500: {"description": "Internal server error"},
}


# ── Envelope schemas ──────────────────────────────────────────────────────────


class Meta(BaseModel):
    request_id: str
    timestamp: str  # ISO 8601
    version: str = "v1"


class PaginationMeta(Meta):
    total_count: int
    limit: int
    offset: int
    has_more: bool


class DataResponse(BaseModel, Generic[T]):
    data: T
    meta: Meta


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta


class ErrorDetail(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"code": "validation_error", "message": "field is required", "field": "email"}
        }
    }

    code: str          # machine-readable e.g. "validation_error"
    message: str       # human-readable
    field: str | None = None  # which field caused the error (if applicable)


class ErrorResponse(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "errors": [{"code": "validation_error", "message": "field is required", "field": "email"}],
                "meta": {
                    "request_id": "a1b2c3d4",
                    "timestamp": "2025-01-15T09:00:00+00:00",
                    "version": "v1",
                },
            }
        }
    }

    errors: list[ErrorDetail]
    meta: Meta


# ── Response helpers ──────────────────────────────────────────────────────────


def _meta(request: Request) -> Meta:
    return Meta(
        request_id=getattr(request.state, "request_id", ""),
        timestamp=datetime.now(UTC).isoformat(),
    )


def ok(data: Any, request: Request) -> DataResponse[Any]:
    return DataResponse(data=data, meta=_meta(request))


def paginated(
    data: list[Any],
    total_count: int,
    limit: int,
    offset: int,
    request: Request,
) -> PaginatedResponse[Any]:
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(
            request_id=getattr(request.state, "request_id", ""),
            timestamp=datetime.now(UTC).isoformat(),
            total_count=total_count,
            limit=limit,
            offset=offset,
            has_more=(offset + limit) < total_count,
        ),
    )
