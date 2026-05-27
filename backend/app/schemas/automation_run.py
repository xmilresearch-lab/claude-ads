import uuid
from datetime import datetime

from pydantic import BaseModel


class RunsListResponse(BaseModel):
    items: list["AutomationRunResponse"]
    has_more: bool
    next_offset: int | None
    total_count: int


class AutomationRunResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    automation_id: uuid.UUID
    status: str
    result: dict | None
    error: str | None
    ai_tokens_used: int | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
