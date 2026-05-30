import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

_CONFIG_BLOCKED_SUBSTRINGS = frozenset({"prompt", "system", "instruction"})


class TriggerRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"payload": {"topic": "AI trends in 2025", "tone": "professional"}}
        }
    }

    payload: dict = {}


class AutomationCreate(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Daily LinkedIn Post",
                "type": "social_post",
                "config": {
                    "platforms": ["linkedin"],
                    "topic": "AI industry trends",
                    "tone": "professional",
                    "require_approval": True,
                },
                "trigger": "schedule",
                "schedule": "0 9 * * MON-FRI",
                "active": True,
            }
        }
    }

    name: str
    type: str
    config: dict[str, Any] = {}
    schedule: str | None = None
    trigger: str | None = None
    active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 255:
            raise ValueError("name must be at most 255 characters")
        try:
            from app.middleware.injection_scanner import (  # noqa: PLC0415
                SecurityError,
                require_clean,
            )
            try:
                require_clean(v)
            except SecurityError as exc:
                raise ValueError(f"name contains disallowed content: {exc}") from exc
        except ImportError:
            pass
        return v

    @field_validator("schedule")
    @classmethod
    def validate_schedule(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            from croniter import croniter  # noqa: PLC0415

            if not croniter.is_valid(v):
                raise ValueError(f"Invalid cron expression: {v!r}")
        except ImportError:
            pass
        return v

    @field_validator("config")
    @classmethod
    def validate_config(cls, v: dict[str, Any]) -> dict[str, Any]:
        for key in v:
            if key.startswith("__"):
                raise ValueError(
                    f"Config key {key!r} is not allowed (starts with '__')"
                )
            key_lower = key.lower()
            for blocked in _CONFIG_BLOCKED_SUBSTRINGS:
                if blocked in key_lower:
                    raise ValueError(
                        f"Config key {key!r} is not allowed (contains {blocked!r})"
                    )
        return v


class AutomationUpdate(BaseModel):
    name: str | None = None
    config: dict[str, Any] | None = None
    schedule: str | None = None
    trigger: str | None = None
    active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 255:
            raise ValueError("name must be at most 255 characters")
        return v

    @field_validator("schedule")
    @classmethod
    def validate_schedule(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            from croniter import croniter  # noqa: PLC0415

            if not croniter.is_valid(v):
                raise ValueError(f"Invalid cron expression: {v!r}")
        except ImportError:
            pass
        return v

    @field_validator("config")
    @classmethod
    def validate_config(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is None:
            return v
        for key in v:
            if key.startswith("__"):
                raise ValueError(
                    f"Config key {key!r} is not allowed (starts with '__')"
                )
            key_lower = key.lower()
            for blocked in _CONFIG_BLOCKED_SUBSTRINGS:
                if blocked in key_lower:
                    raise ValueError(
                        f"Config key {key!r} is not allowed (contains {blocked!r})"
                    )
        return v


class AutomationResponse(BaseModel):
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "workspace_id": "3fa85f64-5717-4562-b3fc-2c963f66afa7",
                "name": "Daily LinkedIn Post",
                "type": "social_post",
                "config": {"platforms": ["linkedin"], "topic": "AI trends"},
                "schedule": "0 9 * * MON-FRI",
                "trigger": "schedule",
                "active": True,
                "created_at": "2025-01-15T09:00:00+00:00",
            }
        },
    }

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    type: str
    config: dict
    schedule: str | None
    trigger: str | None
    active: bool
    created_at: datetime
