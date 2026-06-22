"""
SmallBiz Advisor — Business / Dream-to-Launch Builder Router
Endpoints: POST /business/quiz, GET /business/ideas,
           POST /business/ideas/{id}/save, GET /business/ideas/{id}/plan,
           POST /business/ideas/{id}/generate-pdf, POST /business/advisor-request
"""
import structlog
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from backend.config import settings
from backend.dependencies import get_current_user, get_supabase_client, require_purchase
from backend.schemas.business import (
    AdvisorRequestBody,
    AdvisorRequestResponse,
    BusinessIdeaListResponse,
    BusinessIdeaListItem,
    GeneratePdfResponse,
    LaunchPlanResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    SaveIdeaRequest,
    SaveIdeaResponse,
    SKILLS_OPTIONS,
    PROBLEMS_OPTIONS,
)

router = APIRouter()
log = structlog.get_logger()


def _purchase_required(product_key: str):
    """Closure that returns a FastAPI dependency checking purchase for the given product_key."""
    async def _check(
        current_user: dict = Depends(get_current_user),
        supabase: Client = Depends(get_supabase_client),
    ) -> dict:
        return await require_purchase(product_key, current_user, supabase)
    return _check


_FALLBACK_BY_TYPE = {
    "service": [
        {"name": "Mobile Tech Setup Service", "description": "Help small businesses set up computers, networks, and software on-site.", "business_fit_pct": 82, "startup_cost_tier": "Low", "difficulty_tier": "Medium", "revenue_potential": "Medium to High"},
        {"name": "Virtual Assistant Agency", "description": "Provide remote admin, scheduling, and communications support to busy professionals.", "business_fit_pct": 75, "startup_cost_tier": "Low", "difficulty_tier": "Easy", "revenue_potential": "Medium"},
        {"name": "Home & Business Cleaning Service", "description": "Offer professional cleaning services for homes and small commercial spaces.", "business_fit_pct": 70, "startup_cost_tier": "Low", "difficulty_tier": "Easy", "revenue_potential": "Medium"},
    ],
    "product": [
        {"name": "Handmade Craft & Goods Shop", "description": "Sell handmade or curated physical products online and at local markets.", "business_fit_pct": 74, "startup_cost_tier": "Low", "difficulty_tier": "Medium", "revenue_potential": "Medium"},
        {"name": "Digital Product Store", "description": "Create and sell downloadable templates, guides, or digital tools in your area of expertise.", "business_fit_pct": 80, "startup_cost_tier": "Low", "difficulty_tier": "Medium", "revenue_potential": "Medium to High"},
        {"name": "Specialty Food & Beverage Brand", "description": "Package and sell a specialty food or beverage product at farmers markets and online.", "business_fit_pct": 68, "startup_cost_tier": "Medium", "difficulty_tier": "Hard", "revenue_potential": "Medium"},
    ],
    "online": [
        {"name": "Freelance Content & Copywriting", "description": "Write blog posts, social media content, and marketing copy for businesses online.", "business_fit_pct": 79, "startup_cost_tier": "Low", "difficulty_tier": "Easy", "revenue_potential": "Medium to High"},
        {"name": "Online Coaching or Consulting", "description": "Offer one-on-one or group coaching sessions in your area of expertise via video call.", "business_fit_pct": 83, "startup_cost_tier": "Low", "difficulty_tier": "Medium", "revenue_potential": "High"},
        {"name": "Social Media Management Agency", "description": "Manage social media accounts and content calendars for small business clients.", "business_fit_pct": 76, "startup_cost_tier": "Low", "difficulty_tier": "Medium", "revenue_potential": "Medium to High"},
    ],
    "local": [
        {"name": "Mobile Pet Grooming Service", "description": "Provide professional pet grooming at customers' homes with a mobile setup.", "business_fit_pct": 72, "startup_cost_tier": "Medium", "difficulty_tier": "Medium", "revenue_potential": "Medium to High"},
        {"name": "Lawn & Landscape Care", "description": "Offer lawn mowing, trimming, and basic landscaping services in your neighborhood.", "business_fit_pct": 78, "startup_cost_tier": "Low", "difficulty_tier": "Easy", "revenue_potential": "Medium"},
        {"name": "Local Delivery & Errand Service", "description": "Run errands, deliver packages, and handle tasks for busy local residents and businesses.", "business_fit_pct": 69, "startup_cost_tier": "Low", "difficulty_tier": "Easy", "revenue_potential": "Medium"},
    ],
}


def _fallback_suggestions(business_type: str, skills: list[str]) -> list[dict]:
    return _FALLBACK_BY_TYPE.get(business_type, _FALLBACK_BY_TYPE["service"])


def _sentences(text: str, n: int = 2) -> str:
    """Return the first n sentences of a text block."""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return " ".join(sentences[:n])


# ── POST /business/quiz ───────────────────────────────────────────────────────

@router.post("/quiz", response_model=QuizSubmitResponse, status_code=201)
async def submit_quiz(
    body: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> QuizSubmitResponse:
    """Submit quiz answers → AI generates 3 idea suggestions → persist to business_ideas."""
    user_id = current_user["id"]

    # Validate skills and problems are known values
    unknown_skills = [s for s in body.skills if s not in SKILLS_OPTIONS]
    if unknown_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_quiz_input", "message": f"Unknown skill values: {unknown_skills}", "details": {}},
        )
    unknown_problems = [p for p in body.problems if p not in PROBLEMS_OPTIONS]
    if unknown_problems:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_quiz_input", "message": f"Unknown problem values: {unknown_problems}", "details": {}},
        )

    # Call AI to generate suggestions
    try:
        from backend.prompts_dream import generate_idea_suggestions, generate_mission_preview
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "ai_unavailable", "message": "AI service not yet configured.", "details": {}},
        )

    quiz_data = {
        "skills": body.skills,
        "problems": body.problems,
        "business_type": body.business_type,
        "industry_category": body.industry_category,
        "business_concept": body.business_concept,
        "starting_capital": body.starting_capital,
        "weekly_hours": body.weekly_hours,
    }

    try:
        suggestions = await generate_idea_suggestions(quiz_data)
    except RuntimeError as exc:
        log.warning("quiz_ai_fallback", user_id=user_id, reason=str(exc))
        suggestions = _fallback_suggestions(body.business_type, body.skills)

    # Generate mission statement from first suggestion
    try:
        mission_full = await generate_mission_preview(suggestions[0])
    except Exception as exc:
        log.error("mission_ai_error", user_id=user_id, error=str(exc))
        mission_full = f"We help {body.business_type} businesses grow and succeed."

    mission_preview = _sentences(mission_full, 2)

    # Persist to DB
    try:
        result = supabase.table("business_ideas").insert({
            "user_id": user_id,
            "skills": body.skills,
            "problems": body.problems,
            "business_type": body.business_type,
            "starting_capital": body.starting_capital,
            "weekly_hours": body.weekly_hours,
            "ai_suggestions": suggestions,
            "mission_statement": mission_full,
            "status": "draft",
        }).execute()
        idea_id = result.data[0]["id"]
    except Exception as exc:
        log.error("quiz_db_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "service_unavailable", "message": "Failed to save quiz results.", "details": {}},
        )

    log.info("quiz_submitted", user_id=user_id, idea_id=idea_id)
    return QuizSubmitResponse(
        business_idea_id=idea_id,
        suggestions=suggestions,
        mission_preview=mission_preview,
    )


# ── GET /business/ideas ───────────────────────────────────────────────────────

@router.get("/ideas", response_model=BusinessIdeaListResponse, status_code=200)
async def list_ideas(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> BusinessIdeaListResponse:
    """List all business ideas for the current user."""
    user_id = current_user["id"]

    try:
        result = (
            supabase.table("business_ideas")
            .select("id, selected_idea_index, business_fit_pct, startup_cost_tier, difficulty_tier, revenue_potential, status, created_at, ai_suggestions")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        log.error("ideas_list_error", user_id=user_id, error=str(exc))
        return BusinessIdeaListResponse(data=[])

    items = []
    for row in result.data:
        idea_name = None
        idea_description = None
        idx = row.get("selected_idea_index")
        suggestions = row.get("ai_suggestions") or []
        if idx is not None and isinstance(suggestions, list) and len(suggestions) > idx:
            idea_name = suggestions[idx].get("name")
            idea_description = suggestions[idx].get("description")
        items.append(BusinessIdeaListItem(
            id=row["id"],
            selected_idea_index=idx,
            business_fit_pct=row.get("business_fit_pct"),
            startup_cost_tier=row.get("startup_cost_tier"),
            difficulty_tier=row.get("difficulty_tier"),
            revenue_potential=row.get("revenue_potential"),
            status=row["status"],
            created_at=row["created_at"],
            idea_name=idea_name,
            idea_description=idea_description,
        ))

    return BusinessIdeaListResponse(data=items)


# ── POST /business/ideas/{idea_id}/save ─────────────────────────────────────

@router.post("/ideas/{idea_id}/save", response_model=SaveIdeaResponse, status_code=200)
async def save_idea(
    idea_id: UUID,
    body: SaveIdeaRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> SaveIdeaResponse:
    """Save a selected idea (set selected_idea_index, derive scores, update status)."""
    user_id = current_user["id"]

    # Fetch the row
    try:
        result = (
            supabase.table("business_ideas")
            .select("*")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "idea_not_found", "message": "Business idea not found.", "details": {}},
            )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("save_idea_fetch_error", idea_id=str(idea_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "idea_not_found", "message": "Business idea not found.", "details": {}},
        )

    row = result.data
    suggestions = row.get("ai_suggestions") or []

    if row.get("status") == "saved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "idea_already_saved", "message": "This idea has already been saved.", "details": {}},
        )

    if body.idea_index >= len(suggestions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "idea_index_out_of_range", "message": f"idea_index {body.idea_index} is out of range.", "details": {}},
        )

    chosen = suggestions[body.idea_index]

    # Update the row
    try:
        supabase.table("business_ideas").update({
            "selected_idea_index": body.idea_index,
            "status": "saved",
            "business_fit_pct": chosen.get("business_fit_pct"),
            "startup_cost_tier": chosen.get("startup_cost_tier"),
            "difficulty_tier": chosen.get("difficulty_tier"),
            "revenue_potential": chosen.get("revenue_potential"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", str(idea_id)).execute()
    except Exception as exc:
        log.error("save_idea_update_error", idea_id=str(idea_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "service_unavailable", "message": "Failed to save idea.", "details": {}},
        )

    mission = row.get("mission_statement") or ""
    mission_preview = _sentences(mission, 2)

    log.info("idea_saved", user_id=user_id, idea_id=str(idea_id), idea_index=body.idea_index)
    return SaveIdeaResponse(
        business_idea_id=idea_id,
        idea_name=chosen["name"],
        idea_description=chosen["description"],
        business_fit_pct=chosen["business_fit_pct"],
        startup_cost_tier=chosen["startup_cost_tier"],
        difficulty_tier=chosen["difficulty_tier"],
        revenue_potential=chosen["revenue_potential"],
        mission_preview=mission_preview,
    )


# ── GET /business/ideas/{idea_id}/plan ──────────────────────────────────────

@router.get("/ideas/{idea_id}/plan", response_model=LaunchPlanResponse, status_code=200)
async def get_plan(
    idea_id: UUID,
    tier: str = Query(..., pattern="^(launch_builder|launch_packet_pro)$"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> LaunchPlanResponse:
    """Get the full launch plan — purchase-gated, AI-generated and cached."""
    user_id = current_user["id"]

    # Purchase check (superset: launch_packet_pro satisfies launch_builder)
    await require_purchase(tier, current_user, supabase)

    # Fetch the idea row
    try:
        idea_result = (
            supabase.table("business_ideas")
            .select("*")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not idea_result.data:
            raise HTTPException(status_code=404, detail={"error": "idea_not_found", "message": "Business idea not found.", "details": {}})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail={"error": "idea_not_found", "message": "Business idea not found.", "details": {}})

    idea_row = idea_result.data
    if idea_row.get("status") != "saved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "idea_not_saved", "message": "Please save an idea before generating a plan.", "details": {}},
        )

    # Check cache
    try:
        plan_result = (
            supabase.table("launch_plans")
            .select("*")
            .eq("business_idea_id", str(idea_id))
            .eq("tier", tier)
            .single()
            .execute()
        )
        if plan_result.data:
            p = plan_result.data
            return LaunchPlanResponse(
                business_idea_id=idea_id,
                tier=p["tier"],
                checklist=p.get("checklist"),
                cost_calculator=p.get("cost_calculator"),
                pricing_packages=p.get("pricing_packages"),
                thirty_day_plan=p.get("thirty_day_plan"),
                business_plan_text=p.get("business_plan_text"),
                mission_vision=p.get("mission_vision"),
                customer_persona=p.get("customer_persona"),
                funding_checklist=p.get("funding_checklist"),
                cyber_ai_checklist=p.get("cyber_ai_checklist"),
                ninety_day_roadmap=p.get("ninety_day_roadmap"),
                pdf_url=p.get("pdf_url"),
                created_at=p["created_at"],
            )
    except Exception:
        pass  # No cached plan — generate

    # Generate via AI
    try:
        from backend.prompts_dream import generate_launch_plan
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "service_unavailable", "message": "AI service not configured.", "details": {}},
        )

    idx = idea_row.get("selected_idea_index", 0) or 0
    suggestions = idea_row.get("ai_suggestions") or []
    idea_data = suggestions[idx] if suggestions and len(suggestions) > idx else {}
    idea_data.update({
        "business_type": idea_row.get("business_type"),
        "starting_capital": idea_row.get("starting_capital"),
        "weekly_hours": idea_row.get("weekly_hours"),
        "mission_statement": idea_row.get("mission_statement", ""),
    })

    try:
        plan_content = await generate_launch_plan(idea_data, tier)
    except Exception as exc:
        log.error("plan_ai_error", idea_id=str(idea_id), tier=tier, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "service_unavailable", "message": "Failed to generate plan.", "details": {}},
        )

    # Persist plan
    now_iso = datetime.now(timezone.utc).isoformat()
    plan_row = {
        "user_id": user_id,
        "business_idea_id": str(idea_id),
        "tier": tier,
        "checklist": plan_content.get("checklist"),
        "cost_calculator": plan_content.get("cost_calculator"),
        "pricing_packages": plan_content.get("pricing_packages"),
        "thirty_day_plan": plan_content.get("thirty_day_plan"),
        "business_plan_text": plan_content.get("business_plan_text"),
        "mission_vision": plan_content.get("mission_vision"),
        "customer_persona": plan_content.get("customer_persona"),
        "funding_checklist": plan_content.get("funding_checklist"),
        "cyber_ai_checklist": plan_content.get("cyber_ai_checklist"),
        "ninety_day_roadmap": plan_content.get("ninety_day_roadmap"),
    }
    try:
        saved = supabase.table("launch_plans").insert(plan_row).execute()
        created_at = saved.data[0]["created_at"]
    except Exception as exc:
        log.error("plan_db_error", idea_id=str(idea_id), error=str(exc))
        created_at = now_iso

    log.info("plan_generated", user_id=user_id, idea_id=str(idea_id), tier=tier)
    return LaunchPlanResponse(
        business_idea_id=idea_id,
        tier=tier,
        checklist=plan_content.get("checklist"),
        cost_calculator=plan_content.get("cost_calculator"),
        pricing_packages=plan_content.get("pricing_packages"),
        thirty_day_plan=plan_content.get("thirty_day_plan"),
        business_plan_text=plan_content.get("business_plan_text"),
        mission_vision=plan_content.get("mission_vision"),
        customer_persona=plan_content.get("customer_persona"),
        funding_checklist=plan_content.get("funding_checklist"),
        cyber_ai_checklist=plan_content.get("cyber_ai_checklist"),
        ninety_day_roadmap=plan_content.get("ninety_day_roadmap"),
        created_at=created_at,
    )


# ── POST /business/ideas/{idea_id}/generate-pdf ──────────────────────────────

@router.post("/ideas/{idea_id}/generate-pdf", response_model=GeneratePdfResponse, status_code=200)
async def generate_pdf_endpoint(
    idea_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    _: dict = Depends(_purchase_required("launch_packet_pro")),
) -> GeneratePdfResponse:
    """Generate a business plan PDF and store URL in launch_plans."""
    user_id = current_user["id"]

    # Fetch the pro plan
    try:
        plan_result = (
            supabase.table("launch_plans")
            .select("*")
            .eq("business_idea_id", str(idea_id))
            .eq("tier", "launch_packet_pro")
            .single()
            .execute()
        )
        if not plan_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "plan_not_found", "message": "Generate a launch plan first.", "details": {}},
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "plan_not_found", "message": "Generate a launch plan first.", "details": {}},
        )

    plan = plan_result.data

    # Fetch idea
    try:
        idea_result = (
            supabase.table("business_ideas")
            .select("ai_suggestions, selected_idea_index, mission_statement")
            .eq("id", str(idea_id))
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        idea_row = idea_result.data or {}
    except Exception:
        idea_row = {}

    idx = idea_row.get("selected_idea_index", 0) or 0
    suggestions = idea_row.get("ai_suggestions") or []
    idea_data = suggestions[idx] if suggestions and len(suggestions) > idx else {}

    try:
        from backend.pdf_generator import generate_pdf
        pdf_bytes = await generate_pdf(
            business_plan_text=plan.get("business_plan_text") or "",
            idea=idea_data,
            mission_vision=plan.get("mission_vision") or "",
            customer_persona=plan.get("customer_persona") or {},
        )
    except Exception as exc:
        log.error("pdf_generate_error", idea_id=str(idea_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "pdf_generation_failed", "message": "PDF generation failed. Please try again.", "details": {}},
        )

    # Upload to Supabase Storage
    path = f"{user_id}/{str(idea_id)}/business-plan.pdf"
    try:
        bucket = supabase.storage.from_("business-plans")
        bucket.upload(path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"})
        public_url = bucket.get_public_url(path)
    except Exception as exc:
        log.error("pdf_upload_error", idea_id=str(idea_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "pdf_generation_failed", "message": "Failed to store PDF.", "details": {}},
        )

    now = datetime.now(timezone.utc)
    # Update plan row
    try:
        supabase.table("launch_plans").update({
            "pdf_url": public_url,
            "pdf_generated_at": now.isoformat(),
        }).eq("id", plan["id"]).execute()
    except Exception as exc:
        log.error("pdf_url_update_error", idea_id=str(idea_id), error=str(exc))

    log.info("pdf_generated", user_id=user_id, idea_id=str(idea_id))
    return GeneratePdfResponse(pdf_url=public_url, generated_at=now)


# ── POST /business/advisor-request ───────────────────────────────────────────

@router.post("/advisor-request", response_model=AdvisorRequestResponse, status_code=201)
async def create_advisor_request(
    body: AdvisorRequestBody,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    _: dict = Depends(_purchase_required("advisor_review")),
) -> AdvisorRequestResponse:
    """Create advisor_request row + send admin notification email."""
    user_id = current_user["id"]
    user_email = current_user.get("email", "")

    # Check for existing pending/scheduled request
    try:
        existing = (
            supabase.table("advisor_requests")
            .select("id")
            .eq("user_id", user_id)
            .in_("status", ["pending", "scheduled"])
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "request_already_exists", "message": "You already have an open advisor request.", "details": {}},
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # Insert advisor_requests row
    insert_data: dict = {
        "user_id": user_id,
        "user_email": user_email,
        "status": "pending",
    }
    if body.business_idea_id is not None:
        insert_data["business_idea_id"] = str(body.business_idea_id)

    try:
        result = supabase.table("advisor_requests").insert(insert_data).execute()
        request_id = result.data[0]["id"]
    except Exception as exc:
        log.error("advisor_request_insert_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "service_unavailable", "message": "Failed to create advisor request.", "details": {}},
        )

    # Send email notification
    try:
        from backend.email_helper import send_advisor_notification_email
        await send_advisor_notification_email(user_email=user_email, request_id=request_id)
    except Exception as exc:
        log.warning("advisor_email_error", user_id=user_id, error=str(exc))
        # Don't fail the request if email fails — just log it

    log.info("advisor_request_created", user_id=user_id, request_id=request_id)
    return AdvisorRequestResponse(
        advisor_request_id=request_id,
        status="pending",
        message="Your Advisor Review request has been received. You will receive a scheduling link at your email address within 1 business day.",
    )
