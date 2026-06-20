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
