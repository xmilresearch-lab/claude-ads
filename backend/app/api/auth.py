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
from app.models.audit_log import AuditLog
from app.models.automation import Automation
from app.models.integration import Integration
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import (
    ChangePasswordRequest,
    DeleteAccountRequest,
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


@router.post(
    "/change-password",
    summary="Change Password",
    description=(
        "Change the authenticated user's password. "
        "Requires the current password for verification. "
        "New password must meet the same complexity rules as registration."
    ),
    response_description="Confirmation message",
    responses={**COMMON_ERROR_RESPONSES, 400: {"description": "Current password is incorrect"}},
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return ok({"message": "Password updated successfully"}, request)


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


@router.delete(
    "/account",
    summary="Delete Account",
    description=(
        "Permanently delete the authenticated user's account and all associated data. "
        "Requires the current password for confirmation. "
        "The account is soft-deleted: email is anonymized, automations are deactivated, "
        "and integrations are revoked. This action cannot be undone."
    ),
    response_description="Confirmation message",
    responses={**COMMON_ERROR_RESPONSES, 400: {"description": "Password is incorrect"}},
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def delete_account(
    request: Request,
    payload: DeleteAccountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect",
        )

    result = await db.execute(select(Workspace).where(Workspace.user_id == current_user.id))
    workspace = result.scalar_one_or_none()

    if workspace:
        # Audit log must be written before any data changes (FK must still be valid)
        db.add(
            AuditLog(
                id=uuid.uuid4(),
                workspace_id=workspace.id,
                action="account.deleted",
                actor=str(current_user.id),
                log_metadata={"plan": current_user.plan},
            )
        )
        await db.flush()

        auto_result = await db.execute(
            select(Automation).where(Automation.workspace_id == workspace.id)
        )
        for automation in auto_result.scalars().all():
            automation.active = False

        int_result = await db.execute(
            select(Integration).where(Integration.workspace_id == workspace.id)
        )
        for integration in int_result.scalars().all():
            integration.status = "revoked"

    current_user.email = f"deleted_{current_user.id}@deleted.invalid"
    current_user.is_active = False
    await db.commit()
    return ok({"message": "Account deleted"}, request)
