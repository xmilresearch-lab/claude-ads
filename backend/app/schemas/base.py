from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from fastapi import Request
from pydantic import BaseModel

T = TypeVar("T")


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
    code: str          # machine-readable e.g. "validation_error"
    message: str       # human-readable
    field: str | None = None  # which field caused the error (if applicable)


class ErrorResponse(BaseModel):
    errors: list[ErrorDetail]
    meta: Meta


def _meta(request: Request) -> Meta:
    return Meta(
        request_id=getattr(request.state, "request_id", ""),
        timestamp=datetime.now(timezone.utc).isoformat(),
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
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_count=total_count,
            limit=limit,
            offset=offset,
            has_more=(offset + limit) < total_count,
        ),
    )
