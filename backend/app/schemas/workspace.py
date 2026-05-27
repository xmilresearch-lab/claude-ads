import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

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
