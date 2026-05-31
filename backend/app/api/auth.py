import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
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
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.base import COMMON_ERROR_RESPONSES, DataResponse, ok
from app.schemas.user import UserResponse
from app.services.email import send_password_reset, send_verify_email

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
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[TokenResponse]:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    verify_token = secrets.token_urlsafe(32)
    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        email_verify_token=verify_token,
        email_verify_expires=datetime.now(UTC) + timedelta(hours=24),
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(
        id=uuid.uuid4(),
        user_id=user.id,
        name=payload.workspace_name,
    )
    db.add(workspace)
    await db.commit()

    background_tasks.add_task(send_verify_email, payload.email, verify_token)
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


# ── SaaS: email verification ──────────────────────────────────────────────────


@router.post(
    "/verify-email",
    summary="Verify Email Address",
    description="Verify a user's email address using the token sent at registration.",
    response_description="Confirmation message",
    responses={**COMMON_ERROR_RESPONSES, 400: {"description": "Invalid or expired token"}},
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def verify_email(
    request: Request,
    payload: VerifyEmailRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    result = await db.execute(
        select(User).where(User.email_verify_token == payload.token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )
    if user.email_verify_expires and user.email_verify_expires < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired",
        )
    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_expires = None
    await db.commit()
    return ok({"message": "Email verified successfully"}, request)


@router.post(
    "/resend-verification",
    summary="Resend Verification Email",
    description="Resend the email verification link to the authenticated user.",
    response_description="Confirmation message",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def resend_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    if current_user.email_verified:
        return ok({"message": "Email already verified"}, request)
    verify_token = secrets.token_urlsafe(32)
    current_user.email_verify_token = verify_token
    current_user.email_verify_expires = datetime.now(UTC) + timedelta(hours=24)
    await db.commit()
    background_tasks.add_task(send_verify_email, current_user.email, verify_token)
    return ok({"message": "Verification email sent"}, request)


# ── SaaS: password reset ──────────────────────────────────────────────────────


@router.post(
    "/forgot-password",
    summary="Request Password Reset",
    description=(
        "Send a password reset email. Always returns 200 to prevent email enumeration. "
        "The reset link expires in 1 hour."
    ),
    response_description="Confirmation message (always 200)",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    # Always return 200 to prevent email enumeration
    if user and user.is_active:
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(UTC) + timedelta(hours=1)
        await db.commit()
        background_tasks.add_task(send_password_reset, user.email, reset_token)
    return ok({"message": "If that email exists, a reset link has been sent"}, request)


@router.post(
    "/reset-password",
    summary="Reset Password",
    description="Reset a user's password using the token from the reset email.",
    response_description="Confirmation message",
    responses={**COMMON_ERROR_RESPONSES, 400: {"description": "Invalid or expired token"}},
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_AUTH)
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, str]]:
    result = await db.execute(
        select(User).where(User.password_reset_token == payload.token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token",
        )
    if user.password_reset_expires and user.password_reset_expires < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired",
        )
    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()
    return ok({"message": "Password reset successfully"}, request)
