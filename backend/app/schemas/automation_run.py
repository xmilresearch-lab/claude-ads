import uuid
from datetime import datetime

from pydantic import BaseModel


class RunsListResponse(BaseModel):
    items: list["AutomationRunResponse"]
    has_more: bool
    next_offset: int | None
    total_count: int


class AutomationRunResponse(BaseModel):
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "automation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa7",
                "status": "success",
                "result": {"content": "AI is transforming industries...", "platform": "linkedin"},
                "error": None,
                "ai_tokens_used": 850,
                "started_at": "2025-01-15T09:00:01+00:00",
                "finished_at": "2025-01-15T09:00:04+00:00",
                "created_at": "2025-01-15T09:00:00+00:00",
            }
        },
    }

    id: uuid.UUID
    automation_id: uuid.UUID
    status: str
    result: dict | None
    error: str | None
    ai_tokens_used: int | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
