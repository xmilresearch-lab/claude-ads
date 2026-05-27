from datetime import datetime
from typing import Any

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    settings: dict[str, Any] = {}


class WorkspaceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    settings: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}
