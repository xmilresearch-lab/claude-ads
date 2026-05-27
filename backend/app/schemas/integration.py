import uuid
from datetime import datetime

from pydantic import BaseModel


class IntegrationCreate(BaseModel):
    type: str
    credentials: dict  # raw — encrypted before DB write
    meta: dict | None = None


class IntegrationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    workspace_id: uuid.UUID
    type: str
    status: str
    meta: dict | None
    created_at: datetime
