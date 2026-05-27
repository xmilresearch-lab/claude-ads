import uuid
from datetime import datetime

from pydantic import BaseModel


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
