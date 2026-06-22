"""
Champ Compass — Assessments Router
Endpoints: POST /assessments, GET /assessments, GET /assessments/{id}
Persists assessment scores and inputs to Supabase PostgreSQL.
"""
import time
from collections import defaultdict
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from backend.dependencies import get_current_user, get_supabase_client
from backend.middleware.tier import check_assessment_quota, increment_assessment_count
from backend.schemas.assessments import (
    AssessmentCreate,
    AssessmentDetail,
    AssessmentListResponse,
    AssessmentListMeta,
    AssessmentResponse,
    AssessmentSummary,
)

router = APIRouter()
log = structlog.get_logger()

# In-memory rate limiter: {user_id: [timestamps]}
# Resets on service restart. Sufficient for pre-production.
_rate_limit: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    timestamps = _rate_limit[user_id]
    # Purge old entries
    _rate_limit[user_id] = [t for t in timestamps if t > window_start]
    if len(_rate_limit[user_id]) >= RATE_LIMIT_MAX:
        log.warning("rate_limit_exceeded", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many saves. Please wait before saving again.",
                "details": {},
            },
        )
    _rate_limit[user_id].append(now)


@router.post("", response_model=AssessmentResponse, status_code=201)
async def create_assessment(
    body: AssessmentCreate,
    current_user: dict = Depends(get_current_user),
    profile: dict = Depends(check_assessment_quota),
    supabase: Client = Depends(get_supabase_client),
) -> AssessmentResponse:
    """Save a completed assessment for the authenticated user."""
    user_id = current_user["id"]
    _check_rate_limit(user_id)

    record = {
        "user_id": user_id,
        "business_name": body.business_name,
        "industry": body.industry,
        "challenge": body.challenge,
        # inputs
        "mfa": body.inputs.mfa,
        "backups": body.inputs.backups,
        "training": body.inputs.training,
        "digital_tools": body.inputs.digital_tools,
        "automation": body.inputs.automation,
        "ai_usage": body.inputs.ai_usage,
        "documents": body.inputs.documents,
        "online_presence": body.inputs.online_presence,
        "growth_plan": body.inputs.growth_plan,
        # scores
        "cyber_score": body.scores.cyber_score,
        "ai_score": body.scores.ai_score,
        "funding_score": body.scores.funding_score,
        "overall_score": body.scores.overall_score,
    }

    try:
        result = supabase.table("assessments").insert(record).execute()
    except Exception as exc:
        log.error("assessments_create_db_error", error=str(exc), user_id=user_id)
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
    log.info("assessment_saved", user_id=user_id, assessment_id=row["id"])

    # Increment monthly counter for free-tier users (non-fatal if it fails)
    if profile.get("tier") == "free":
        await increment_assessment_count(profile, supabase)

    return AssessmentResponse(
        id=row["id"],
        created_at=row["created_at"],
        overall_score=row["overall_score"],
        message="Assessment saved.",
    )


@router.get("", response_model=AssessmentListResponse, status_code=200)
async def list_assessments(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> AssessmentListResponse:
    """Return paginated assessment history for the authenticated user, most recent first."""
    user_id = current_user["id"]

    try:
        # Count total
        count_result = (
            supabase.table("assessments")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        total = count_result.count or 0

        # Fetch page
        result = (
            supabase.table("assessments")
            .select("id,business_name,industry,cyber_score,ai_score,funding_score,overall_score,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    except Exception as exc:
        log.error("assessments_list_db_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    data = [AssessmentSummary(**row) for row in (result.data or [])]
    return AssessmentListResponse(
        data=data,
        meta=AssessmentListMeta(
            total=total,
            limit=limit,
            offset=offset,
            has_more=(offset + limit) < total,
        ),
    )


@router.get("/{assessment_id}", response_model=AssessmentDetail, status_code=200)
async def get_assessment(
    assessment_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> AssessmentDetail:
    """Return a single assessment by ID — 404 if not owned by current user."""
    user_id = current_user["id"]

    try:
        result = (
            supabase.table("assessments")
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
                    "message": "Assessment not found.",
                    "details": {},
                },
            )
        log.error("assessments_get_db_error", error=str(exc), user_id=user_id)
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
                "message": "Assessment not found.",
                "details": {},
            },
        )

    return AssessmentDetail(**result.data)
