"""Pydantic schemas for the Dream-to-Launch Builder endpoints."""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Quiz ──────────────────────────────────────────────────────────────────────

SKILLS_OPTIONS = [
    "computers_tech", "sales_marketing", "writing_content", "design_creative",
    "teaching_coaching", "cooking_food", "trades_repair", "healthcare_wellness",
    "finance_accounting", "management_leadership", "customer_service", "languages",
    "music_arts", "sports_fitness", "childcare_education",
]

PROBLEMS_OPTIONS = [
    "save_time", "save_money", "reduce_stress", "learn_something",
    "improve_health", "find_community", "get_entertainment", "solve_tech_problem",
    "improve_home", "grow_business", "get_professional_services", "get_local_services",
]

BUSINESS_TYPE_OPTIONS = Literal["service", "product", "online", "local"]
CAPITAL_OPTIONS = Literal["<500", "500-2k", "2k-10k", "10k+"]
HOURS_OPTIONS = Literal["<5", "5-15", "15-30", "30+"]


class QuizSubmitRequest(BaseModel):
    skills: list[str] = Field(..., min_length=1, max_length=15)
    problems: list[str] = Field(..., min_length=1, max_length=12)
    business_type: BUSINESS_TYPE_OPTIONS
    starting_capital: CAPITAL_OPTIONS
    weekly_hours: HOURS_OPTIONS


class IdeaSuggestion(BaseModel):
    name: str
    description: str
    business_fit_pct: int = Field(..., ge=0, le=100)
    startup_cost_tier: Literal["Low", "Medium", "High"]
    difficulty_tier: Literal["Easy", "Medium", "Hard"]
    revenue_potential: str


class QuizSubmitResponse(BaseModel):
    business_idea_id: UUID
    suggestions: list[IdeaSuggestion]
    mission_preview: str


# ── Ideas ─────────────────────────────────────────────────────────────────────

class BusinessIdeaListItem(BaseModel):
    id: UUID
    selected_idea_index: Optional[int] = None
    business_fit_pct: Optional[int] = None
    startup_cost_tier: Optional[str] = None
    difficulty_tier: Optional[str] = None
    revenue_potential: Optional[str] = None
    status: str
    created_at: datetime
    idea_name: Optional[str] = None
    idea_description: Optional[str] = None


class BusinessIdeaListResponse(BaseModel):
    data: list[BusinessIdeaListItem]


class SaveIdeaRequest(BaseModel):
    idea_index: int = Field(..., ge=0, le=2)


class SaveIdeaResponse(BaseModel):
    business_idea_id: UUID
    idea_name: str
    idea_description: str
    business_fit_pct: int
    startup_cost_tier: str
    difficulty_tier: str
    revenue_potential: str
    mission_preview: str


# ── Plans ─────────────────────────────────────────────────────────────────────

class LaunchPlanResponse(BaseModel):
    business_idea_id: UUID
    tier: str
    checklist: Optional[list[dict[str, Any]]] = None
    cost_calculator: Optional[list[dict[str, Any]]] = None
    pricing_packages: Optional[list[dict[str, Any]]] = None
    thirty_day_plan: Optional[list[dict[str, Any]]] = None
    business_plan_text: Optional[str] = None
    mission_vision: Optional[str] = None
    customer_persona: Optional[dict[str, Any]] = None
    funding_checklist: Optional[list[dict[str, Any]]] = None
    cyber_ai_checklist: Optional[list[dict[str, Any]]] = None
    ninety_day_roadmap: Optional[list[dict[str, Any]]] = None
    pdf_url: Optional[str] = None
    created_at: datetime


class GeneratePdfResponse(BaseModel):
    pdf_url: str
    generated_at: datetime


# ── Advisor Request ───────────────────────────────────────────────────────────

class AdvisorRequestBody(BaseModel):
    business_idea_id: Optional[UUID] = None


class AdvisorRequestResponse(BaseModel):
    advisor_request_id: UUID
    status: str
    message: str
