import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ALL_PROVIDER_TYPES = Literal[
    "twitter", "linkedin", "gmail", "hubspot", "salesforce", "sendgrid", "zendesk"
]


class IntegrationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    workspace_id: uuid.UUID
    type: str
    status: str
    meta: dict | None = None
    created_at: datetime
    updated_at: datetime


class IntegrationCreate(BaseModel):
    type: str
    credentials: dict  # raw — encrypted before DB write
    meta: dict | None = None


class IntegrationConnectRequest(BaseModel):
    type: ALL_PROVIDER_TYPES


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str
    provider: str


class APIKeyConnectRequest(BaseModel):
    type: str
    api_key: str
    extra_config: dict | None = None


class IntegrationStatusResponse(BaseModel):
    status: str
    latency_ms: float
    last_checked: str  # ISO 8601
