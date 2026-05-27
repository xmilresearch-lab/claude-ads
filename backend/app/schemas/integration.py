from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ConnectIntegrationRequest(BaseModel):
    provider: str
    type: str
    credentials: dict[str, Any]  # encrypted before storage


class IntegrationResponse(BaseModel):
    id: str
    workspace_id: str
    type: str
    provider: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
