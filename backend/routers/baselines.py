"""
Champ Compass — Baselines Router
Endpoints: GET /baselines/me, POST /baselines, DELETE /baselines/me
One baseline per user (upsert). Saved as a snapshot of an assessment.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from backend.dependencies import get_current_user, get_supabase_client
from backend.schemas.baselines import (
    BaselineSaveRequest,
    BaselineResponse,
    BaselineSaveResponse,
    MessageResponse,
)

router = APIRouter()
log = structlog.get_logger()


@router.get("/me", response_model=BaselineResponse, status_code=200)
async def get_my_baseline(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> BaselineResponse:
    """Get the current user's saved baseline, or 404 if none."""
    user_id = current_user["id"]

    try:
        result = (
            supabase.table("baselines")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        log.error("baselines_get_db_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "baseline_not_found",
                "message": "No baseline saved yet.",
                "details": {},
            },
        )

    return BaselineResponse(**result.data[0])


@router.post("", response_model=BaselineSaveResponse, status_code=200)
async def save_baseline(
    body: BaselineSaveRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> BaselineSaveResponse:
    """Save or overwrite the user's baseline from a specific assessment."""
    user_id = current_user["id"]
    assessment_id = str(body.assessment_id)

    # Verify the assessment belongs to this user
    try:
        asmnt_result = (
            supabase.table("assessments")
            .select("id,business_name,cyber_score,ai_score,funding_score,overall_score")
            .eq("id", assessment_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        log.error("baselines_save_lookup_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    if not asmnt_result or not asmnt_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "assessment_not_found",
                "message": "Assessment not found.",
                "details": {},
            },
        )

    asmnt = asmnt_result.data[0]

    # Upsert — one baseline per user (UNIQUE constraint on user_id)
    record = {
        "user_id": user_id,
        "assessment_id": assessment_id,
        "business_name": asmnt["business_name"],
        "cyber_score": asmnt["cyber_score"],
        "ai_score": asmnt["ai_score"],
        "funding_score": asmnt["funding_score"],
        "overall_score": asmnt["overall_score"],
    }

    try:
        result = (
            supabase.table("baselines")
            .upsert(record, on_conflict="user_id")
            .execute()
        )
    except Exception as exc:
        log.error("baselines_upsert_error", error=str(exc), user_id=user_id)
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
    log.info("baseline_saved", user_id=user_id, assessment_id=assessment_id)
    return BaselineSaveResponse(
        id=row["id"],
        overall_score=row["overall_score"],
        saved_at=row["saved_at"],
        message="Baseline saved.",
    )


@router.delete("/me", response_model=MessageResponse, status_code=200)
async def delete_my_baseline(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Remove the user's saved baseline."""
    user_id = current_user["id"]

    try:
        supabase.table("baselines").delete().eq("user_id", user_id).execute()
    except Exception as exc:
        log.error("baselines_delete_error", error=str(exc), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    log.info("baseline_deleted", user_id=user_id)
    return MessageResponse(message="Baseline removed.")
