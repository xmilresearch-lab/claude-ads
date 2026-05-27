from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AutomationCreate(BaseModel):
    name: str
    type: str
    config: dict[str, Any] = {}
    schedule: str | None = None
    active: bool = True


class AutomationUpdate(BaseModel):
    name: str | None = None
    config: dict[str, Any] | None = None
    schedule: str | None = None
    active: bool | None = None


class AutomationResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    type: str
    config: dict[str, Any]
    schedule: str | None
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AutomationRunResponse(BaseModel):
    id: str
    automation_id: str
    status: str
    result: dict[str, Any] | None
    error: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}
