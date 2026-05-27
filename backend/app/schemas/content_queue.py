import uuid
from datetime import datetime

from pydantic import BaseModel


class ContentQueueItem(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    automation_id: uuid.UUID
    platform: str
    content: dict
    status: str
    scheduled_at: datetime | None
    published_at: datetime | None
    created_at: datetime


class ContentQueueApprove(BaseModel):
    approved: bool
    scheduled_at: datetime | None = None
