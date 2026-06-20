"""
SmallBiz Advisor — Admin Router
Endpoints: GET /admin/metrics, GET /admin/users
Read-only platform analytics — admin tier required.
"""
from collections import Counter
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from backend.dependencies import get_supabase_client
from backend.middleware.tier import require_admin_tier

router = APIRouter()
log = structlog.get_logger()


@router.get("/metrics", status_code=200)
async def get_metrics(
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return aggregate platform statistics. Admin tier required."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # User counts
    total_users = 0
    free_users = 0
    pro_users = 0
    try:
        total_result = (
            supabase.table("user_profiles").select("*", count="exact").execute()
        )
        total_users = total_result.count or 0

        free_result = (
            supabase.table("user_profiles")
            .select("*", count="exact")
            .eq("tier", "free")
            .execute()
        )
        free_users = free_result.count or 0
        pro_users = total_users - free_users
    except Exception as exc:
        log.error("admin_metrics_user_count_error", error=str(exc))

    # Assessment counts
    total_assessments = 0
    assessments_this_month = 0
    most_common_industry = "unknown"
    average_overall_score = 0
    try:
        total_a_result = (
            supabase.table("assessments").select("*", count="exact").execute()
        )
        total_assessments = total_a_result.count or 0

        month_a_result = (
            supabase.table("assessments")
            .select("*", count="exact")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        assessments_this_month = month_a_result.count or 0

        # Industry and score aggregation — fetch up to 500 recent rows
        agg_result = (
            supabase.table("assessments")
            .select("industry, overall_score")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        if agg_result.data:
            industries = [r["industry"] for r in agg_result.data if r.get("industry")]
            scores = [r["overall_score"] for r in agg_result.data if r.get("overall_score") is not None]
            if industries:
                most_common_industry = Counter(industries).most_common(1)[0][0]
            if scores:
                average_overall_score = round(sum(scores) / len(scores))
    except Exception as exc:
        log.error("admin_metrics_assessment_error", error=str(exc))

    # AI advice requests this month
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


@router.get("/users", status_code=200)
async def list_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tier: str | None = Query(default=None),
    _profile: dict = Depends(require_admin_tier),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return paginated user list with tier and assessment count. Admin tier required."""
    try:
        query = (
            supabase.table("user_profiles")
            .select("id, business_name, tier, assessments_this_month, created_at", count="exact")
        )
        if tier:
            query = query.eq("tier", tier)
        total_result = query.execute()
        total = total_result.count or 0

        page_query = (
            supabase.table("user_profiles")
            .select("id, business_name, tier, assessments_this_month, created_at")
        )
        if tier:
            page_query = page_query.eq("tier", tier)
        result = (
            page_query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    except Exception as exc:
        log.error("admin_users_error", error=str(exc))
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset, "has_more": False}}

    data = result.data or []
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
