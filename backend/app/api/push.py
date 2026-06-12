from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.middleware.rate_limiter import LIMIT_WRITE, limiter
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.base import COMMON_ERROR_RESPONSES, DataResponse, ok

router = APIRouter()


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict[str, str]


class PushSubscribeResponse(BaseModel):
    subscribed: bool
    vapid_public_key: str


@router.post(
    "/subscribe",
    summary="Subscribe to Push Notifications",
    description=(
        "Store or refresh a Web Push subscription for the authenticated user. "
        "The client must first call `Notification.requestPermission()` and "
        "`PushManager.subscribe()` in the browser before calling this endpoint. "
        "Subscribing a second time with the same endpoint is idempotent."
    ),
    response_description="Subscription confirmed with VAPID public key",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[PushSubscribeResponse],
)
@limiter.limit(LIMIT_WRITE)
async def subscribe(
    request: Request,
    payload: PushSubscribeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[PushSubscribeResponse]:
    p256dh = payload.keys.get("p256dh", "")
    auth = payload.keys.get("auth", "")

    if not p256dh or not auth:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="keys.p256dh and keys.auth are required",
        )

    # Upsert: if endpoint exists update keys, otherwise insert
    existing = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    sub = existing.scalar_one_or_none()
    if sub:
        sub.p256dh = p256dh
        sub.auth = auth
    else:
        db.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=payload.endpoint,
                p256dh=p256dh,
                auth=auth,
            )
        )

    await db.commit()
    return ok(
        PushSubscribeResponse(
            subscribed=True,
            vapid_public_key=settings.VAPID_PUBLIC_KEY,
        ),
        request,
    )


@router.delete(
    "/subscribe",
    summary="Unsubscribe from Push Notifications",
    description="Remove a specific push subscription endpoint for the authenticated user.",
    response_description="Subscription removed",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[dict[str, bool]],
)
@limiter.limit(LIMIT_WRITE)
async def unsubscribe(
    request: Request,
    payload: PushSubscribeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[dict[str, bool]]:
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    await db.commit()
    return ok({"unsubscribed": True}, request)


@router.get(
    "/vapid-public-key",
    summary="Get VAPID Public Key",
    description="Return the server's VAPID public key needed to create a push subscription in the browser.",
    response_description="VAPID public key (base64url, uncompressed P-256 point)",
    responses=COMMON_ERROR_RESPONSES,
    response_model=DataResponse[dict[str, str]],
)
@limiter.limit(LIMIT_WRITE)
async def vapid_public_key(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> DataResponse[dict[str, str]]:
    return ok({"vapid_public_key": settings.VAPID_PUBLIC_KEY}, request)
