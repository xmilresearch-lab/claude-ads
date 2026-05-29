import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ALL_PROVIDER_TYPES = Literal[
    "twitter", "linkedin", "gmail", "hubspot", "salesforce", "sendgrid", "zendesk"
]


class IntegrationResponse(BaseModel):
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "workspace_id": "3fa85f64-5717-4562-b3fc-2c963f66afa7",
                "type": "linkedin",
                "status": "active",
                "meta": {"account_name": "Alice Smith", "account_id": "urn:li:person:abc123"},
                "created_at": "2025-01-15T09:00:00+00:00",
                "updated_at": "2025-01-15T09:00:00+00:00",
            }
        },
    }

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
    model_config = {
        "json_schema_extra": {"example": {"type": "linkedin"}}
    }

    type: ALL_PROVIDER_TYPES


class OAuthCallbackRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "code": "AQW3...",
                "state": "abc123xyz",
                "provider": "linkedin",
            }
        }
    }

    code: str
    state: str
    provider: str


class APIKeyConnectRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "sendgrid",
                "api_key": "SG.xxxxx",
                "extra_config": None,
            }
        }
    }

    type: str
    api_key: str
    extra_config: dict | None = None


class IntegrationStatusResponse(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"status": "healthy", "latency_ms": 142.5, "last_checked": "2025-01-15T09:00:00+00:00"}
        }
    }

    status: str
    latency_ms: float
    last_checked: str  # ISO 8601
