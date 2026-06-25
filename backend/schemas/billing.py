"""Pydantic schemas for billing endpoints."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    price_id: Literal["price_monthly", "price_yearly"]


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionResponse(BaseModel):
    has_active_subscription: bool
    tier: str
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None
    price_id: Optional[str] = None


class OneTimeCheckoutRequest(BaseModel):
    product_key: Literal["launch_builder", "launch_packet_pro", "advisor_review"]


class OneTimeCheckoutResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount_cents: int
    product_key: str


class PurchasesStatusResponse(BaseModel):
    launch_builder: bool = False
    launch_packet_pro: bool = False
    advisor_review: bool = False
