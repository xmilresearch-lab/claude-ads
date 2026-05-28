import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.middleware.rate_limiter import LIMIT_AUTH, LIMIT_READ, limiter
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.base import COMMON_ERROR_RESPONSES, DataResponse, ok
from app.schemas.user import UserResponse

router = APIRouter()

_AUTH_ERRORS = {**COMMON_ERROR_RESPONSES, 409: {"description": "Email already registered"}}


def _tokens_for_user(user: User) -> TokenResponse:
    data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


@router.post(
    "/register",
    summary="Register New User",
    description=(
        "Create a new user account and workspace. "
        "Returns access and refresh tokens immediately upon success. "
        "Passwords must be at least 8 characters and include uppercase, lowercase, digit, and special character."
    ),
    response_description="JWT access token, refresh token, and token type",
    responses={**_AUTH_ERRORS, 201: {"description": "User registered successfully"}},
    response_model=DataResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(LIMIT_AUTH)
async def register(
    request: Request,
    payload: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[TokenResponse]:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(
        id=uuid.uuid4(),
        user_id=user.id,
        name=payload.workspace_name,
    )
    db.add(workspace)
    return ok(_tokens_for_user(user), request)


@router.post(
    "/login",
    summary="Login",
    description=(
        "Authenticate with email and password. "
        "Returns short-lived access token (30 min) and long-lived refresh token (30 days). "
        "Rate-limited to 10 requests/minute per IP."
    ),
    response_description="JWT access token and refresh token",
    responses={**_AUTH_ERRORS, 401: {"description": "Invalid credentials or inactive account"}},
    response_model=DataResponse[TokenResponse],
)
@limiter.limit(LIMIT_AUTH)
async def login(
    request: Request,
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[TokenResponse]:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return ok(_tokens_for_user(user), request)


@router.post(
    "/refresh",
    summary="Refresh Access Token",
    description=(
        "Exchange a valid refresh token for a new access + refresh token pair. "
        "Use this when the access token has expired. "
        "Both the old and new token pairs are returned."
    ),
    response_description="New JWT access token and refresh token",
    responses=_AUTH_ERRORS,
    response_model=DataResponse[TokenResponse],
)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    payload: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[TokenResponse]:
    claims = decode_token(payload.refresh_token)
    user_id: str | None = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return ok(_tokens_for_user(user), request)


@router.get(
    "/me",
    summary="Get Current User",
    description=(
        "Return the authenticated user's profile. "
        "Requires a valid Bearer token in the Authorization header."
    ),
    response_description="Authenticated user profile",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[UserResponse],
)
@limiter.limit(LIMIT_READ)
async def me(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> DataResponse[UserResponse]:
    return ok(UserResponse.model_validate(current_user), request)
