import uuid
from datetime import datetime

from pydantic import BaseModel


class BrandVoiceSchema(BaseModel):
    tone: str | None = None
    avoid: list[str] | None = None
    examples: list[str] | None = None
    industry: str | None = None
    target_audience: str | None = None


class WorkspaceCreate(BaseModel):
    name: str
    brand_voice: BrandVoiceSchema | None = None
    settings: dict | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    brand_voice: BrandVoiceSchema | None = None
    settings: dict | None = None


class WorkspaceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    brand_voice: dict | None
    settings: dict | None
    created_at: datetime
