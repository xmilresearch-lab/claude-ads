from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    portal_url: str


class UsageResponse(BaseModel):
    plan: str
    automations_used: int
    automations_limit: Optional[int]
    integrations_used: int
    integrations_limit: Optional[int]
    content_queue_used: int
    content_queue_limit: Optional[int]
    tokens_used: int
    tokens_limit: Optional[int]
    period_reset_date: Optional[datetime]


class SubscriptionResponse(BaseModel):
    plan: str
    subscription_status: str
    current_period_end: Optional[datetime]
    stripe_subscription_id: Optional[str]
