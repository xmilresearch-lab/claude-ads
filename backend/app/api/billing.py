from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.middleware.rate_limiter import LIMIT_READ, limiter
from app.models.user import User
from app.schemas.base import COMMON_ERROR_RESPONSES, DataResponse, ok
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PortalResponse,
    SubscriptionResponse,
    UsageResponse,
)
from app.services import billing as billing_svc

router = APIRouter(tags=["billing"])


@router.post(
    "/checkout",
    summary="Create Stripe Checkout Session",
    response_model=DataResponse[CheckoutResponse],
    responses=COMMON_ERROR_RESPONSES,
)
@limiter.limit("10/minute")
async def create_checkout(
    request: Request,
    body: CheckoutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[CheckoutResponse]:
    try:
        session = await billing_svc.create_checkout_session(
            user=current_user,
            price_id=body.price_id,
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            db=db,
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ok(CheckoutResponse(checkout_url=session.url, session_id=session.id), request)


@router.post(
    "/portal",
    summary="Create Stripe Customer Portal Session",
    response_model=DataResponse[PortalResponse],
    responses=COMMON_ERROR_RESPONSES,
)
@limiter.limit("10/minute")
async def create_portal(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[PortalResponse]:
    return_url = f"{settings.APP_URL}/settings"
    try:
        portal = await billing_svc.create_portal_session(
            user=current_user, return_url=return_url, db=db
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ok(PortalResponse(portal_url=portal.url), request)


@router.get(
    "/usage",
    summary="Get Current Period Usage vs Plan Limits",
    response_model=DataResponse[UsageResponse],
    responses=COMMON_ERROR_RESPONSES,
)
@limiter.limit(LIMIT_READ)
async def get_usage(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[UsageResponse]:
    usage = await billing_svc.get_usage(current_user, db)
    return ok(UsageResponse(**usage), request)


@router.get(
    "/subscription",
    summary="Get Current Subscription Details",
    response_model=DataResponse[SubscriptionResponse],
    responses=COMMON_ERROR_RESPONSES,
)
@limiter.limit(LIMIT_READ)
async def get_subscription(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> DataResponse[SubscriptionResponse]:
    return ok(
        SubscriptionResponse(
            plan=current_user.plan,
            subscription_status=current_user.subscription_status,
            current_period_end=current_user.current_period_end,
            stripe_subscription_id=current_user.stripe_subscription_id,
        ),
        request,
    )


@router.post("/stripe-webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    event_type: str = event["type"]
    data: dict = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await billing_svc.handle_checkout_completed(data, db)
    elif event_type == "customer.subscription.updated":
        await billing_svc.handle_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        await billing_svc.handle_subscription_deleted(data, db)
    elif event_type == "invoice.payment_failed":
        await billing_svc.handle_payment_failed(data, db)

    return {"received": True}
