import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

_CONFIG_BLOCKED_SUBSTRINGS = frozenset({"prompt", "system", "instruction"})


class TriggerRequest(BaseModel):
    payload: dict = {}


class AutomationCreate(BaseModel):
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
    model_config = {"from_attributes": True}

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    type: str
    config: dict
    schedule: str | None
    trigger: str | None
    active: bool
    created_at: datetime
