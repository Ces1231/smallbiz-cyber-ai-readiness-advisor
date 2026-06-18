"""
SmallBiz Advisor — Baseline Pydantic Schemas
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BaselineSaveRequest(BaseModel):
    assessment_id: UUID


class BaselineResponse(BaseModel):
    id: UUID
    assessment_id: UUID
    business_name: str
    cyber_score: int
    ai_score: int
    funding_score: int
    overall_score: int
    saved_at: datetime


class BaselineSaveResponse(BaseModel):
    id: UUID
    overall_score: int
    saved_at: datetime
    message: str


class MessageResponse(BaseModel):
    message: str
