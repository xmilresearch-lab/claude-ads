import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.core.validators import reject_script_tags, reject_sql_injection

_MAX_TONE = 500
_MAX_AVOID_ITEMS = 50
_MAX_AVOID_ITEM_LEN = 200
_MAX_EXAMPLES = 20
_MAX_EXAMPLE_LEN = 1000
_MAX_SHORT_FIELD = 500


def _clean_str(v: str) -> str:
    v = v.strip()
    reject_script_tags(v)
    reject_sql_injection(v)
    return v


class BrandVoiceSchema(BaseModel):
    tone: str | None = None
    avoid: list[str] | None = None
    examples: list[str] | None = None
    industry: str | None = None
    target_audience: str | None = None

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = _clean_str(v)
        if len(v) > _MAX_TONE:
            raise ValueError(f"tone must be at most {_MAX_TONE} characters")
        return v

    @field_validator("avoid")
    @classmethod
    def validate_avoid(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if len(v) > _MAX_AVOID_ITEMS:
            raise ValueError(f"avoid list cannot exceed {_MAX_AVOID_ITEMS} items")
        result: list[str] = []
        for item in v:
            item = _clean_str(item)
            if len(item) > _MAX_AVOID_ITEM_LEN:
                raise ValueError(
                    f"each avoid item must be at most {_MAX_AVOID_ITEM_LEN} characters"
                )
            result.append(item)
        return result

    @field_validator("examples")
    @classmethod
    def validate_examples(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if len(v) > _MAX_EXAMPLES:
            raise ValueError(f"examples list cannot exceed {_MAX_EXAMPLES} items")
        result: list[str] = []
        for item in v:
            item = _clean_str(item)
            if len(item) > _MAX_EXAMPLE_LEN:
                raise ValueError(
                    f"each example must be at most {_MAX_EXAMPLE_LEN} characters"
                )
            result.append(item)
        return result

    @field_validator("industry", "target_audience")
    @classmethod
    def validate_short_strings(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = _clean_str(v)
        if len(v) > _MAX_SHORT_FIELD:
            raise ValueError(f"field must be at most {_MAX_SHORT_FIELD} characters")
        return v


class WorkspaceCreate(BaseModel):
    name: str
    brand_voice: BrandVoiceSchema | None = None
    settings: dict | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    settings: dict | None = None


class WorkspaceSettingsUpdate(BaseModel):
    """Typed patch for workspace settings — rejects unknown keys."""
    model_config = {"extra": "forbid"}

    require_approval_default: bool | None = None
    default_timezone: str | None = None      # IANA e.g. "America/New_York"
    notification_email: EmailStr | None = None
    content_language: str | None = None      # ISO 639-1 e.g. "en"

    @field_validator("default_timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            from zoneinfo import ZoneInfo  # noqa: PLC0415
            ZoneInfo(v)
        except Exception:
            raise ValueError(f"Invalid IANA timezone: {v!r}")
        return v

    @field_validator("content_language")
    @classmethod
    def validate_language(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-z]{2}$", v):
            raise ValueError("content_language must be a 2-letter ISO 639-1 code (e.g. 'en')")
        return v


class WorkspaceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    brand_voice: dict | None
    settings: dict | None
    created_at: datetime


class WorkspaceDetailResponse(WorkspaceResponse):
    """WorkspaceResponse extended with computed counts."""
    integrations_count: int = 0
    automations_count: int = 0
    active_automations_count: int = 0
