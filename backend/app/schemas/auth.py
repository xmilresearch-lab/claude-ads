import re

from pydantic import BaseModel, EmailStr, field_validator

_SPECIAL_CHARS = re.compile(r"[!@#$%^&*()\-_=+\[\]{}|;:',.<>?/`~\\\"@]")


class RegisterRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "alice@acme.com",
                "password": "Str0ng!Pass",
                "workspace_name": "Acme Corp",
            }
        }
    }

    email: EmailStr
    password: str
    workspace_name: str = "My Workspace"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not _SPECIAL_CHARS.search(v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"email": "alice@acme.com", "password": "Str0ng!Pass"}
        }
    }

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    }

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
        }
    }

    refresh_token: str


class ChangePasswordRequest(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "current_password": "OldStr0ng!Pass",
                "new_password": "NewStr0ng!Pass",
            }
        }
    }

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not _SPECIAL_CHARS.search(v):
            raise ValueError("Password must contain at least one special character")
        return v
