import re

from pydantic import BaseModel, EmailStr, field_validator

_SPECIAL_CHARS = re.compile(r"[!@#$%^&*()\-_=+\[\]{}|;:',.<>?/`~\\\"@]")


class RegisterRequest(BaseModel):
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
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
