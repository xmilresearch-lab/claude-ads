import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

import stripe
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.plans import PLAN_LIMITS
from app.models.automation import Automation
from app.models.content_queue import ContentQueue
from app.models.integration import Integration
from app.models.user import User
from app.models.workspace import Workspace

stripe.api_key = settings.STRIPE_SECRET_KEY


async def _stripe(fn: Any, *args: Any, **kwargs: Any) -> Any:
    """Run a synchronous Stripe call in a thread pool."""
    return await asyncio.to_thread(fn, *args, **kwargs)


async def get_or_create_stripe_customer(user: User, db: AsyncSession) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = await _stripe(
        stripe.Customer.create,
        email=user.email,
        metadata={"user_id": str(user.id)},
    )
    user.stripe_customer_id = customer.id
    await db.commit()
    return customer.id


async def create_checkout_session(
    user: User,
    price_id: str,
    success_url: str,
    cancel_url: str,
    db: AsyncSession,
) -> Any:
    customer_id = await get_or_create_stripe_customer(user, db)
    return await _stripe(
        stripe.checkout.Session.create,
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user.id)},
    )


async def create_portal_session(
    user: User,
    return_url: str,
    db: AsyncSession,
) -> Any:
    customer_id = await get_or_create_stripe_customer(user, db)
    return await _stripe(
        stripe.billing_portal.Session.create,
        customer=customer_id,
        return_url=return_url,
    )


async def get_usage(user: User, db: AsyncSession) -> dict:
    ws_result = await db.execute(
        select(Workspace).where(Workspace.user_id == user.id).limit(1)
    )
    workspace = ws_result.scalar_one_or_none()
    plan = user.plan or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    if workspace:
        automations_used = await db.scalar(
            select(func.count()).where(
                Automation.workspace_id == workspace.id,
                Automation.active.is_(True),
            )
        ) or 0
        integrations_used = await db.scalar(
            select(func.count()).where(Integration.workspace_id == workspace.id)
        ) or 0
        content_queue_used = await db.scalar(
            select(func.count()).where(
                ContentQueue.automation_id.in_(
                    select(Automation.id).where(
                        Automation.workspace_id == workspace.id
                    )
                )
            )
        ) or 0
        tokens_used = workspace.monthly_token_usage
        period_reset_date = workspace.monthly_token_reset_date
    else:
        automations_used = integrations_used = content_queue_used = tokens_used = 0
        period_reset_date = None

    return {
        "plan": plan,
        "automations_used": automations_used,
        "automations_limit": limits.get("max_automations"),
        "integrations_used": integrations_used,
        "integrations_limit": limits.get("max_integrations"),
        "content_queue_used": content_queue_used,
        "content_queue_limit": limits.get("max_content_queues"),
        "tokens_used": tokens_used,
        "tokens_limit": limits.get("monthly_ai_tokens"),
        "period_reset_date": period_reset_date,
    }


async def handle_checkout_completed(session: dict, db: AsyncSession) -> None:
    user_id = (session.get("metadata") or {}).get("user_id")
    if not user_id:
        return
    subscription = await _stripe(stripe.Subscription.retrieve, session["subscription"])
    plan = _price_to_plan(subscription["items"]["data"][0]["price"]["id"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return
    user.stripe_subscription_id = subscription.id
    user.plan = plan
    user.subscription_status = "active"
    user.current_period_end = datetime.fromtimestamp(
        subscription["current_period_end"], tz=timezone.utc
    )
    await db.commit()


async def handle_subscription_updated(subscription: dict, db: AsyncSession) -> None:
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription["id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        return
    plan = _price_to_plan(subscription["items"]["data"][0]["price"]["id"])
    user.plan = plan
    user.subscription_status = subscription["status"]
    user.current_period_end = datetime.fromtimestamp(
        subscription["current_period_end"], tz=timezone.utc
    )
    await db.commit()


async def handle_subscription_deleted(subscription: dict, db: AsyncSession) -> None:
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription["id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        return
    user.plan = "free"
    user.subscription_status = "canceled"
    user.stripe_subscription_id = None
    user.current_period_end = None
    await db.commit()


async def handle_payment_failed(invoice: dict, db: AsyncSession) -> None:
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return
    user.subscription_status = "past_due"
    await db.commit()


async def track_token_usage(
    workspace_id: uuid.UUID, tokens_used: int, db: AsyncSession
) -> None:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if workspace:
        workspace.monthly_token_usage = (workspace.monthly_token_usage or 0) + tokens_used
        await db.commit()


def _price_to_plan(price_id: str) -> str:
    mapping = {
        settings.STRIPE_PRICE_STARTER_MONTHLY: "starter",
        settings.STRIPE_PRICE_PRO_MONTHLY: "pro",
    }
    return mapping.get(price_id, "free")
