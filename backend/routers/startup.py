"""
SmallBiz Advisor — Startup Assessments Router
Endpoints: POST /startup/assessments, GET /startup/assessments, GET /startup/assessments/{id}
Computes startup scores server-side before persisting.
"""
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from backend.dependencies import get_current_user, get_supabase_client
from backend.schemas.startup import (
    StartupAssessmentListItem,
    StartupAssessmentListResponse,
    StartupAssessmentRequest,
    StartupAssessmentResponse,
)

router = APIRouter()
log = structlog.get_logger()


def compute_startup_scores(data: dict) -> dict:
    """Compute formation_score, finance_score, digital_score, and launch_readiness."""
    # formation_score: has_ein + has_business_plan + has_bank_account + (formation_type set) + (state_of_formation set)
    formation_pts = sum([
        bool(data.get("has_ein")),
        bool(data.get("has_business_plan")),
        bool(data.get("has_bank_account")),
        bool(data.get("formation_type")),
        bool(data.get("state_of_formation")),
    ])
    formation_score = round((formation_pts / 5) * 100)

    # finance_score: startup_budget set + has_funding_source
    finance_pts = sum([
        bool(data.get("startup_budget")),
        bool(data.get("has_funding_source")),
    ])
    finance_score = round((finance_pts / 2) * 100)

    # digital_score: avg of digital_tools_planned, automation_planned, ai_usage_planned (0-2 each)
    digital_vals = [
        data.get("digital_tools_planned", 0),
        data.get("automation_planned", 0),
        data.get("ai_usage_planned", 0),
    ]
    digital_score = round((sum(digital_vals) / (len(digital_vals) * 2)) * 100)

    # launch_readiness: weighted average
    launch_readiness = round(formation_score * 0.40 + finance_score * 0.30 + digital_score * 0.30)

    return {
        "formation_score": formation_score,
        "finance_score": finance_score,
        "digital_score": digital_score,
        "launch_readiness": launch_readiness,
    }


@router.post("/assessments", response_model=StartupAssessmentResponse, status_code=201)
async def create_startup_assessment(
    body: StartupAssessmentRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> StartupAssessmentResponse:
    """Save a startup assessment, compute scores, return the full record."""
    user_id = current_user["id"]
    data = body.model_dump()
    scores = compute_startup_scores(data)

    record = {
        "user_id": user_id,
        **data,
        **scores,
    }

    try:
        result = supabase.table("startup_assessments").insert(record).execute()
    except Exception as exc:
        log.error("startup_assessment_create_db_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    row = result.data[0]
    log.info("startup_assessment_saved", user_id=user_id, assessment_id=row["id"])
    return StartupAssessmentResponse(**row)


@router.get("/assessments", response_model=StartupAssessmentListResponse, status_code=200)
async def list_startup_assessments(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> StartupAssessmentListResponse:
    """Return all startup assessments for the authenticated user, newest first."""
    user_id = current_user["id"]

    try:
        result = (
            supabase.table("startup_assessments")
            .select(
                "id,business_idea,launch_readiness,formation_score,finance_score,digital_score,created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        log.error("startup_assessment_list_db_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    data = [StartupAssessmentListItem(**row) for row in (result.data or [])]
    return StartupAssessmentListResponse(data=data)


@router.get("/assessments/{assessment_id}", response_model=StartupAssessmentResponse, status_code=200)
async def get_startup_assessment(
    assessment_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> StartupAssessmentResponse:
    """Return a single startup assessment by ID — 404 if not owned by current user."""
    user_id = current_user["id"]

    try:
        result = (
            supabase.table("startup_assessments")
            .select("*")
            .eq("id", str(assessment_id))
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "no rows" in err_str or "not found" in err_str or "multiple" in err_str:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "assessment_not_found",
                    "message": "Startup assessment not found.",
                    "details": {},
                },
            )
        log.error("startup_assessment_get_db_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "assessment_not_found",
                "message": "Startup assessment not found.",
                "details": {},
            },
        )

    return StartupAssessmentResponse(**result.data)
