from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ContentResponse(BaseModel):
    id: str
    automation_id: str
    content: dict[str, Any]
    platform: str
    status: str
    scheduled_at: datetime | None
    published_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
