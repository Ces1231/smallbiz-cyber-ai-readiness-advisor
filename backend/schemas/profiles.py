"""Pydantic schemas for user profile endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProfileResponse(BaseModel):
    tier: str
    business_name: Optional[str] = None
    assessments_this_month: int
    assessments_limit: Optional[int]
    month_reset_at: datetime
    has_active_subscription: bool
