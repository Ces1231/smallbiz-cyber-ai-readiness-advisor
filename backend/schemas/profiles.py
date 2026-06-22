"""Pydantic schemas for user profile endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class ProfileResponse(BaseModel):
    tier: str
    business_name: Optional[str] = None
    assessments_this_month: int
    assessments_limit: Optional[int]
    month_reset_at: datetime
    has_active_subscription: bool


class ProfileUpdateRequest(BaseModel):
    business_name: Optional[str] = None

    @field_validator("business_name")
    @classmethod
    def strip_name(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > 120:
                raise ValueError("Business name must be 120 characters or fewer.")
        return v
