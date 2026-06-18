"""
SmallBiz Advisor — Startup Assessment Pydantic Schemas
Request and response models for the startup assessment endpoints.
"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class StartupAssessmentRequest(BaseModel):
    # Step 1: Business Idea
    business_idea: Optional[str] = Field(default=None, max_length=2000)
    target_customer: Optional[str] = Field(default=None, max_length=1000)
    # Step 2: Budget & Finance
    startup_budget: Optional[int] = Field(default=None, ge=0)
    monthly_expenses: Optional[int] = Field(default=None, ge=0)
    has_funding_source: bool = False
    # Step 3: Business Formation
    formation_type: Optional[Literal["LLC", "Sole Prop", "Corporation", "Partnership"]] = None
    state_of_formation: Optional[str] = Field(default=None, max_length=60)
    # Step 4: Licenses & Permits
    has_business_license: bool = False
    has_industry_permit: bool = False
    industry_type: Optional[str] = Field(default=None, max_length=120)
    # Step 5: Documentation
    has_ein: bool = False
    has_business_plan: bool = False
    has_bank_account: bool = False
    # Step 6: Online Presence
    has_domain: bool = False
    has_social_media: bool = False
    has_website: bool = False
    # Step 7: Tech & AI Readiness
    digital_tools_planned: int = Field(default=0, ge=0, le=2)
    automation_planned: int = Field(default=0, ge=0, le=2)
    ai_usage_planned: int = Field(default=0, ge=0, le=2)
    # Step 8: Cybersecurity Basics
    password_manager_planned: bool = False
    backup_plan_exists: bool = False
    # Step 9: Growth Plan
    has_growth_goals: bool = False
    revenue_target_year1: Optional[int] = Field(default=None, ge=0)


class StartupAssessmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    # Step 1
    business_idea: Optional[str]
    target_customer: Optional[str]
    # Step 2
    startup_budget: Optional[int]
    monthly_expenses: Optional[int]
    has_funding_source: bool
    # Step 3
    formation_type: Optional[str]
    state_of_formation: Optional[str]
    # Step 4
    has_business_license: bool
    has_industry_permit: bool
    industry_type: Optional[str]
    # Step 5
    has_ein: bool
    has_business_plan: bool
    has_bank_account: bool
    # Step 6
    has_domain: bool
    has_social_media: bool
    has_website: bool
    # Step 7
    digital_tools_planned: int
    automation_planned: int
    ai_usage_planned: int
    # Step 8
    password_manager_planned: bool
    backup_plan_exists: bool
    # Step 9
    has_growth_goals: bool
    revenue_target_year1: Optional[int]
    # Scores
    formation_score: int
    finance_score: int
    digital_score: int
    launch_readiness: int
    # Metadata
    created_at: datetime
    updated_at: datetime


class StartupAssessmentListItem(BaseModel):
    id: UUID
    business_idea: Optional[str]
    launch_readiness: int
    formation_score: int
    finance_score: int
    digital_score: int
    created_at: datetime


class StartupAssessmentListResponse(BaseModel):
    data: list[StartupAssessmentListItem]
