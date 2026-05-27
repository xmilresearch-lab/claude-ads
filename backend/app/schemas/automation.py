import uuid
from datetime import datetime

from pydantic import BaseModel


class TriggerRequest(BaseModel):
    payload: dict = {}


class AutomationCreate(BaseModel):
    name: str
    type: str
    config: dict = {}
    schedule: str | None = None
    trigger: str | None = None
    active: bool = True


class AutomationUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    schedule: str | None = None
    trigger: str | None = None
    active: bool | None = None


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
