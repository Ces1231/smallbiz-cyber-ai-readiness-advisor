"""
Champ Compass — Assessment Pydantic Schemas
Request and response models for assessment endpoints.
"""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AssessmentInputs(BaseModel):
    mfa: int = Field(ge=0, le=2)
    backups: int = Field(ge=0, le=2)
    training: int = Field(ge=0, le=2)
    digital_tools: int = Field(ge=0, le=2)
    automation: int = Field(ge=0, le=2)
    ai_usage: int = Field(ge=0, le=2)
    documents: int = Field(ge=0, le=2)
    online_presence: int = Field(ge=0, le=2)
    growth_plan: int = Field(ge=0, le=2)


class AssessmentScores(BaseModel):
    cyber_score: int = Field(ge=0, le=100)
    ai_score: int = Field(ge=0, le=100)
    funding_score: int = Field(ge=0, le=100)
    overall_score: int = Field(ge=0, le=100)


class AssessmentCreate(BaseModel):
    business_name: str = Field(min_length=1, max_length=120)
    industry: Literal[
        "restaurant", "barber", "nonprofit", "contractor",
        "online", "consultant", "retail"
    ]
    challenge: str | None = Field(default=None, max_length=1000)
    inputs: AssessmentInputs
    scores: AssessmentScores


class AssessmentResponse(BaseModel):
    id: UUID
    created_at: datetime
    overall_score: int
    message: str


class AssessmentSummary(BaseModel):
    id: UUID
    business_name: str
    industry: str
    cyber_score: int
    ai_score: int
    funding_score: int
    overall_score: int
    created_at: datetime


class AssessmentListMeta(BaseModel):
    total: int
    limit: int
    offset: int
    has_more: bool


class AssessmentListResponse(BaseModel):
    data: list[AssessmentSummary]
    meta: AssessmentListMeta


class AssessmentDetail(BaseModel):
    id: UUID
    user_id: UUID
    business_name: str
    industry: str
    challenge: str | None
    # inputs
    mfa: int
    backups: int
    training: int
    digital_tools: int
    automation: int
    ai_usage: int
    documents: int
    online_presence: int
    growth_plan: int
    # scores
    cyber_score: int
    ai_score: int
    funding_score: int
    overall_score: int
    created_at: datetime
    updated_at: datetime
