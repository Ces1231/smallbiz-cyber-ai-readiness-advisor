"""
SmallBiz Advisor — Admin Router
Endpoints: metrics, user list, user detail, user update, password reset.
All endpoints require admin tier.
"""
import secrets
import string
from collections import Counter
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from backend.dependencies import get_supabase_client
from backend.email_helper import send_temp_password_email
from backend.middleware.tier import require_admin_tier

router = APIRouter()
log = structlog.get_logger()

VALID_TIERS = {"free", "pro", "pro_annual", "admin"}


class AdminUpdateUserRequest(BaseModel):
    tier: str | None = None
    business_name: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_email_map(supabase: Client) -> dict[str, str]:
    """Fetch all GoTrue users and return {user_id: email} map."""
    try:
        auth_users = supabase.auth.admin.list_users()
        users_list = auth_users if isinstance(auth_users, list) else getattr(auth_users, "users", [])
        return {str(u.id): (u.email or "") for u in users_list}
    except Exception as exc:
        log.warning("admin_email_map_error", error=str(exc))
        return {}


def _generate_temp_password() -> str:
    """Generate a 14-char password that satisfies common complexity requirements."""
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$")
    rest = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    chars = list(upper + lower + digit + special + rest)
    # Deterministic shuffle using secrets
    for i in range(len(chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        chars[i], chars[j] = chars[j], chars[i]
    return "".join(chars)


# ── GET /admin/metrics ─────────────────────────────────────────────────────────

@router.get("/metrics", status_code=200)
async def get_metrics(
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return aggregate platform statistics. Admin tier required."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_users = free_users = pro_users = 0
    try:
        total_result = supabase.table("user_profiles").select("*", count="exact").execute()
        total_users = total_result.count or 0
        free_result = (
            supabase.table("user_profiles").select("*", count="exact").eq("tier", "free").execute()
        )
        free_users = free_result.count or 0
        pro_users = total_users - free_users
    except Exception as exc:
        log.error("admin_metrics_user_count_error", error=str(exc))

    total_assessments = assessments_this_month = 0
    most_common_industry = "unknown"
    average_overall_score = 0
    try:
        total_a = supabase.table("assessments").select("*", count="exact").execute()
        total_assessments = total_a.count or 0
        month_a = (
            supabase.table("assessments")
            .select("*", count="exact")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        assessments_this_month = month_a.count or 0
        agg = (
            supabase.table("assessments")
            .select("industry, overall_score")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        if agg.data:
            industries = [r["industry"] for r in agg.data if r.get("industry")]
            scores = [r["overall_score"] for r in agg.data if r.get("overall_score") is not None]
            if industries:
                most_common_industry = Counter(industries).most_common(1)[0][0]
            if scores:
                average_overall_score = round(sum(scores) / len(scores))
    except Exception as exc:
        log.error("admin_metrics_assessment_error", error=str(exc))

    ai_advice_requests_this_month = 0
    try:
        ai_result = (
            supabase.table("advice_cache")
            .select("*", count="exact")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        ai_advice_requests_this_month = ai_result.count or 0
    except Exception as exc:
        log.error("admin_metrics_ai_count_error", error=str(exc))

    log.info("admin_metrics_fetched")
    return {
        "total_users": total_users,
        "free_users": free_users,
        "pro_users": pro_users,
        "total_assessments": total_assessments,
        "assessments_this_month": assessments_this_month,
        "most_common_industry": most_common_industry,
        "average_overall_score": average_overall_score,
        "ai_advice_requests_this_month": ai_advice_requests_this_month,
    }


# ── GET /admin/users ───────────────────────────────────────────────────────────

@router.get("/users", status_code=200)
async def list_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tier: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return paginated user list with email, tier, and assessment count."""
    email_map = _build_email_map(supabase)

    # If search contains @, narrow down to matching user IDs by email
    email_search_ids: set[str] | None = None
    if search and "@" in search:
        email_search_ids = {
            uid for uid, em in email_map.items()
            if search.lower() in em.lower()
        }

    try:
        base_query = supabase.table("user_profiles").select(
            "id, business_name, tier, assessments_this_month, created_at", count="exact"
        )
        if tier:
            base_query = base_query.eq("tier", tier)
        if search and "@" not in search:
            base_query = base_query.ilike("business_name", f"%{search}%")
        if email_search_ids is not None:
            if not email_search_ids:
                return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset, "has_more": False}}
            base_query = base_query.in_("id", list(email_search_ids))

        total_result = base_query.execute()
        total = total_result.count or 0

        page_query = supabase.table("user_profiles").select(
            "id, business_name, tier, assessments_this_month, created_at"
        )
        if tier:
            page_query = page_query.eq("tier", tier)
        if search and "@" not in search:
            page_query = page_query.ilike("business_name", f"%{search}%")
        if email_search_ids is not None:
            page_query = page_query.in_("id", list(email_search_ids))

        result = page_query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    except Exception as exc:
        log.error("admin_users_error", error=str(exc))
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset, "has_more": False}}

    data = result.data or []
    for row in data:
        row["email"] = email_map.get(row["id"], "")

    log.info("admin_users_fetched", count=len(data))
    return {
        "data": data,
        "meta": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        },
    }


# ── GET /admin/users/{user_id} ─────────────────────────────────────────────────

@router.get("/users/{user_id}", status_code=200)
async def get_user(
    user_id: str,
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return full user profile including email. Admin tier required."""
    # Fetch profile
    try:
        profile_result = (
            supabase.table("user_profiles")
            .select("id, business_name, tier, assessments_this_month, created_at")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = profile_result.data or {}
    except Exception as exc:
        log.error("admin_get_user_profile_error", user_id=user_id, error=str(exc))
        profile = {"id": user_id}

    # Fetch email from GoTrue
    email = ""
    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        email = auth_user.user.email or ""
    except Exception as exc:
        log.warning("admin_get_user_email_error", user_id=user_id, error=str(exc))

    return {**profile, "email": email}


# ── PATCH /admin/users/{user_id} ───────────────────────────────────────────────

@router.patch("/users/{user_id}", status_code=200)
async def update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Update a user's tier and/or business name. Admin tier required."""
    if body.tier and body.tier not in VALID_TIERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "invalid_tier", "message": f"Tier must be one of: {', '.join(VALID_TIERS)}", "details": {}},
        )

    updates: dict = {}
    if body.tier is not None:
        updates["tier"] = body.tier
    if body.business_name is not None:
        updates["business_name"] = body.business_name

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "no_changes", "message": "No fields provided to update.", "details": {}},
        )

    try:
        supabase.table("user_profiles").update(updates).eq("id", user_id).execute()
    except Exception as exc:
        log.error("admin_update_user_error", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail={"error": "update_failed", "message": "Failed to update user.", "details": {}})

    # Sync business_name into GoTrue user metadata if changed
    if body.business_name is not None:
        try:
            supabase.auth.admin.update_user_by_id(
                user_id, {"user_metadata": {"business_name": body.business_name}}
            )
        except Exception as exc:
            log.warning("admin_update_gotrue_metadata_error", user_id=user_id, error=str(exc))

    log.info("admin_user_updated", user_id=user_id, fields=list(updates.keys()))
    return {"message": "User updated.", "updated": updates}


# ── POST /admin/users/{user_id}/reset-password ─────────────────────────────────

@router.post("/users/{user_id}/reset-password", status_code=200)
async def reset_user_password(
    user_id: str,
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Generate a temporary password and email it to the user. Admin tier required."""
    # Get user email
    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        user_email = auth_user.user.email
    except Exception as exc:
        log.error("admin_reset_pw_get_user_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "user_not_found", "message": "User not found.", "details": {}},
        )

    temp_password = _generate_temp_password()

    # Set new password via GoTrue admin
    try:
        supabase.auth.admin.update_user_by_id(user_id, {"password": temp_password})
    except Exception as exc:
        log.error("admin_reset_pw_set_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=500,
            detail={"error": "reset_failed", "message": "Failed to reset password.", "details": {}},
        )

    # Email the temp password to the user (non-blocking)
    import asyncio
    asyncio.create_task(send_temp_password_email(user_email, temp_password))

    log.info("admin_password_reset", user_id=user_id, email=user_email)
    return {"message": f"Temporary password sent to {user_email}."}
