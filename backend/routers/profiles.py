"""
Champ Compass — Profiles Router
Endpoints: GET /profiles/me
"""
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from backend.dependencies import get_current_user, get_supabase_client
from backend.middleware.tier import _get_or_create_profile
from backend.schemas.profiles import ProfileResponse, ProfileUpdateRequest

router = APIRouter()
log = structlog.get_logger()


@router.get("/me", response_model=ProfileResponse, status_code=200)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """Return the current user's profile — tier, quota usage, and subscription status."""
    user_id = current_user["id"]
    profile = await _get_or_create_profile(user_id, supabase)

    tier = profile.get("tier", "free")

    # Cross-check assessment count against the assessments table for accuracy
    now = datetime.now(timezone.utc)
    if now.month == 1:
        month_start = now.replace(year=now.year - 1, month=12, day=1,
                                   hour=0, minute=0, second=0, microsecond=0)
    else:
        month_start = now.replace(month=now.month, day=1,
                                   hour=0, minute=0, second=0, microsecond=0)
    try:
        count_result = (
            supabase.table("assessments")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        actual_count = count_result.count or 0
    except Exception:
        actual_count = profile.get("assessments_this_month", 0)

    # Check for an active subscription
    has_active_sub = False
    try:
        sub_result = (
            supabase.table("subscriptions")
            .select("status")
            .eq("user_id", user_id)
            .in_("status", ["active", "trialing"])
            .limit(1)
            .execute()
        )
        has_active_sub = bool(sub_result.data)
    except Exception:
        pass

    raw_reset = profile.get("month_reset_at", now.isoformat())
    if isinstance(raw_reset, str):
        reset_dt = datetime.fromisoformat(raw_reset.replace("Z", "+00:00"))
    else:
        reset_dt = raw_reset

    log.info("profile_fetched", user_id=user_id, tier=tier)
    return ProfileResponse(
        tier=tier,
        business_name=profile.get("business_name"),
        assessments_this_month=actual_count,
        assessments_limit=3 if tier == "free" else None,
        month_reset_at=reset_dt,
        has_active_subscription=has_active_sub,
    )


@router.patch("/me", response_model=ProfileResponse, status_code=200)
async def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """Update the current user's editable profile fields (business name)."""
    user_id = current_user["id"]
    updates = {}
    if body.business_name is not None:
        updates["business_name"] = body.business_name
    if not updates:
        raise HTTPException(status_code=400, detail={"error": "no_fields", "message": "No fields to update.", "details": {}})
    try:
        supabase.table("user_profiles").update(updates).eq("id", user_id).execute()
        # Sync to GoTrue metadata so business_name stays consistent
        supabase.auth.admin.update_user_by_id(user_id, {"data": {"business_name": body.business_name}})
        log.info("profile_updated", user_id=user_id, fields=list(updates.keys()))
    except Exception as exc:
        log.error("profile_update_error", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail={"error": "update_failed", "message": "Failed to update profile.", "details": {}})
    return await get_my_profile(current_user=current_user, supabase=supabase)
