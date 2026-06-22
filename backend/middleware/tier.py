"""
SmallBiz Advisor — Tier Enforcement
FastAPI Depends functions for free/pro quota and admin checks.
"""
from datetime import datetime, timezone

import structlog
from fastapi import Depends, HTTPException, status
from supabase import Client

from backend.dependencies import get_current_user, get_supabase_client

log = structlog.get_logger()

FREE_ASSESSMENT_LIMIT = 3


async def _get_or_create_profile(user_id: str, supabase: Client) -> dict:
    """Fetch the user profile row, creating a free-tier one if it doesn't exist."""
    try:
        result = (
            supabase.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if result.data:
            return result.data
    except Exception:
        pass

    # Pre-trigger users (signed up before SPRINT-003 migration) won't have a row.
    try:
        upsert = (
            supabase.table("user_profiles")
            .upsert({"id": user_id, "tier": "free"}, on_conflict="id")
            .execute()
        )
        if upsert.data:
            return upsert.data[0]
    except Exception as exc:
        log.error("tier_profile_upsert_error", user_id=user_id, error=str(exc))

    # Fallback — treat as free with no recorded assessments
    return {"id": user_id, "tier": "free", "assessments_this_month": 0}


async def require_pro_tier(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Raises HTTP 403 if user tier is not 'pro', 'pro_annual', or 'admin'."""
    user_id = current_user["id"]
    profile = await _get_or_create_profile(user_id, supabase)
    if profile.get("tier") not in ("pro", "pro_annual", "admin"):
        log.info("tier_required_denied", user_id=user_id, tier=profile.get("tier"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "tier_required",
                "message": "This feature requires a Pro subscription.",
                "upgrade_url": "/billing/checkout",
            },
        )
    return profile


async def require_admin_tier(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Raises HTTP 403 if user is not admin tier."""
    user_id = current_user["id"]
    profile = await _get_or_create_profile(user_id, supabase)
    if profile.get("tier") != "admin":
        log.info("admin_required_denied", user_id=user_id, tier=profile.get("tier"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "admin_required",
                "message": "Admin access required.",
            },
        )
    return profile


async def check_assessment_quota(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Raises HTTP 403 if a free-tier user has reached 3 assessments this month.
    Auto-resets the counter if month_reset_at has passed.
    Returns the profile dict (needed by create_assessment to call increment_assessment_count).
    """
    user_id = current_user["id"]
    profile = await _get_or_create_profile(user_id, supabase)

    # Pro/pro_annual/admin: no limit
    if profile.get("tier") in ("pro", "pro_annual", "admin"):
        return profile

    # Check if the monthly counter has rolled over
    now = datetime.now(timezone.utc)
    raw_reset = profile.get("month_reset_at")
    if raw_reset:
        if isinstance(raw_reset, str):
            reset_dt = datetime.fromisoformat(raw_reset.replace("Z", "+00:00"))
        else:
            reset_dt = raw_reset
        if reset_dt.tzinfo is None:
            reset_dt = reset_dt.replace(tzinfo=timezone.utc)
        if now > reset_dt:
            # Advance to the start of next calendar month
            if now.month == 12:
                next_reset = now.replace(year=now.year + 1, month=1, day=1,
                                         hour=0, minute=0, second=0, microsecond=0)
            else:
                next_reset = now.replace(month=now.month + 1, day=1,
                                         hour=0, minute=0, second=0, microsecond=0)
            try:
                update = (
                    supabase.table("user_profiles")
                    .update({
                        "assessments_this_month": 0,
                        "month_reset_at": next_reset.isoformat(),
                    })
                    .eq("id", user_id)
                    .execute()
                )
                if update.data:
                    profile = update.data[0]
                    log.info("quota_counter_reset", user_id=user_id)
            except Exception as exc:
                log.error("quota_reset_error", user_id=user_id, error=str(exc))

    count = profile.get("assessments_this_month", 0)
    if count >= FREE_ASSESSMENT_LIMIT:
        reset_at = profile.get("month_reset_at", "next month")
        log.info("quota_exceeded", user_id=user_id, count=count)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "quota_exceeded",
                "message": "Free tier limit: 3 assessments per month. Upgrade for unlimited.",
                "resets_at": str(reset_at),
                "upgrade_url": "/billing/checkout",
            },
        )
    return profile


async def increment_assessment_count(profile: dict, supabase: Client) -> None:
    """Increment assessments_this_month for free-tier users after a successful save."""
    user_id = profile.get("id")
    if not user_id or profile.get("tier") in ("pro", "pro_annual", "admin"):
        return
    new_count = profile.get("assessments_this_month", 0) + 1
    try:
        supabase.table("user_profiles").update(
            {"assessments_this_month": new_count}
        ).eq("id", user_id).execute()
    except Exception as exc:
        # Non-fatal: counter is advisory. Log and continue.
        log.error("quota_increment_error", user_id=user_id, error=str(exc))
