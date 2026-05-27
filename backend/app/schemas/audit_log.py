import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

_SENSITIVE_KEYS = frozenset(
    {"credential", "token", "access_token", "refresh_token", "password", "secret"}
)


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    workspace_id: uuid.UUID
    action: str
    actor: str
    log_metadata: dict | None
    created_at: datetime

    @field_validator("log_metadata", mode="after")
    @classmethod
    def sanitize_metadata(cls, v: dict | None) -> dict | None:
        if v is None:
            return v
        return {
            k: val
            for k, val in v.items()
            if not any(s in k.lower() for s in _SENSITIVE_KEYS)
        }


class AuditLogSummary(BaseModel):
    total_runs: int
    successful_runs: int
    failed_runs: int
    blocked_injections: int
    dlp_violations: int
    content_published: int
    tokens_used: int
