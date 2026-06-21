"""
SmallBiz Advisor — Dream-to-Launch Builder AI Prompts
Provides AI prompt functions for the Dream Builder endpoints.
Three async functions: generate_idea_suggestions, generate_mission_preview, generate_launch_plan.
"""
import json
import re
import structlog
from typing import Any

log = structlog.get_logger()


# ── Internal AI call helper ────────────────────────────────────────────────────

async def _ai_complete(prompt: str, system: str, max_tokens: int = 2048) -> str:
    """
    Call the configured AI provider and return the response text.
    Reuses the same provider factory as the rest of the backend.
    """
    from backend.ai.factory import get_ai_provider

    provider = get_ai_provider()
    # Collect streamed chunks into a single string
    chunks = []
    async for chunk in provider.stream_completion(
        system_prompt=system,
        user_message=prompt,
        max_tokens=max_tokens,
        temperature=0.7,
    ):
        chunks.append(chunk)
    return "".join(chunks)


def _parse_json_array(text: str) -> list:
    """Extract a JSON array from the AI response, stripping markdown fences."""
    # Strip ```json ... ``` fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    # Find first [ ... ]
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


def _parse_json_object(text: str) -> dict:
    """Extract a JSON object from the AI response."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


# ── 1. generate_idea_suggestions ──────────────────────────────────────────────

async def generate_idea_suggestions(quiz_data: dict) -> list[dict]:
    """
    Given quiz answers, generate 3 business idea suggestions via the AI provider.
    Returns a list of 3 dicts matching the IdeaSuggestion schema.
    Raises RuntimeError if the AI response cannot be parsed after 2 attempts.
    """
    system = (
        "You are a business advisor helping small business owners discover their best business idea. "
        "Return ONLY a JSON array. No markdown, no explanation, no extra text."
    )

    def _build_prompt(strict: bool = False) -> str:
        extra = " IMPORTANT: your entire response must be a valid JSON array and nothing else." if strict else ""
        return (
            f"Generate exactly 3 business ideas for someone with these characteristics.\n\n"
            f"Skills: {', '.join(quiz_data.get('skills', []))}\n"
            f"Problems they want to solve: {', '.join(quiz_data.get('problems', []))}\n"
            f"Business type preference: {quiz_data.get('business_type', '')}\n"
            f"Starting capital: {quiz_data.get('starting_capital', '')}\n"
            f"Weekly hours available: {quiz_data.get('weekly_hours', '')}\n\n"
            f"Return a JSON array of exactly 3 objects with these exact keys:\n"
            f'- "name": short business name (max 60 chars)\n'
            f'- "description": one sentence (max 120 chars)\n'
            f'- "business_fit_pct": integer 0-100\n'
            f'- "startup_cost_tier": exactly one of "Low", "Medium", "High"\n'
            f'- "difficulty_tier": exactly one of "Easy", "Medium", "Hard"\n'
            f'- "revenue_potential": exactly one of "Low", "Medium", "Medium to High", "High"\n'
            f"{extra}"
        )

    for attempt in range(2):
        try:
            raw = await _ai_complete(_build_prompt(strict=attempt > 0), system, max_tokens=1024)
            suggestions = _parse_json_array(raw)
            if not isinstance(suggestions, list) or len(suggestions) == 0:
                raise ValueError("Empty or non-list response")
            # Validate and coerce required fields
            result = []
            for item in suggestions[:3]:
                result.append({
                    "name": str(item.get("name", "Business Idea"))[:60],
                    "description": str(item.get("description", ""))[:120],
                    "business_fit_pct": max(0, min(100, int(item.get("business_fit_pct", 70)))),
                    "startup_cost_tier": item.get("startup_cost_tier", "Low") if item.get("startup_cost_tier") in ("Low", "Medium", "High") else "Low",
                    "difficulty_tier": item.get("difficulty_tier", "Medium") if item.get("difficulty_tier") in ("Easy", "Medium", "Hard") else "Medium",
                    "revenue_potential": item.get("revenue_potential", "Medium") if item.get("revenue_potential") in ("Low", "Medium", "Medium to High", "High") else "Medium",
                })
            log.info("idea_suggestions_generated", count=len(result))
            return result
        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            log.warning("idea_suggestions_parse_error", attempt=attempt, error=str(exc))
            if attempt == 1:
                raise RuntimeError("ai_parse_failed") from exc

    raise RuntimeError("ai_parse_failed")


# ── 2. generate_mission_preview ────────────────────────────────────────────────

async def generate_mission_preview(idea: dict) -> str:
    """
    Generate a mission statement for the business idea.
    Returns the full statement (stored in DB). Caller slices to 2 sentences for preview.
    """
    system = "You are a professional business writer. Write only what is asked — no headers, no bullets, no labels."
    prompt = (
        f"Write a professional mission statement for this small business idea. "
        f"Be specific, motivating, and 3-4 sentences long.\n\n"
        f"Business: {idea.get('name', 'Small Business')}\n"
        f"Description: {idea.get('description', '')}\n\n"
        f"Return ONLY the mission statement text. No headers, no bullets, no labels."
    )
    try:
        result = await _ai_complete(prompt, system, max_tokens=300)
        return result.strip()
    except Exception as exc:
        log.error("mission_preview_error", error=str(exc))
        return f"We help customers through {idea.get('name', 'our business')} by delivering exceptional value and reliable service."


# ── 3. generate_launch_plan ────────────────────────────────────────────────────

async def generate_launch_plan(idea: dict, tier: str) -> dict[str, Any]:
    """
    Generate a full launch plan for the given tier.
    tier: 'launch_builder' | 'launch_packet_pro'
    Returns a dict with keys matching the launch_plans table columns.
    """
    idea_name = idea.get("name", "Your Business")
    idea_desc = idea.get("description", "")
    business_type = idea.get("business_type", "service")
    capital = idea.get("starting_capital", "<500")

    plan: dict[str, Any] = {}

    # ── Part 1: Launch Builder content (both tiers) ──────────────────────────

    # Checklist
    try:
        checklist_raw = await _ai_complete(
            f"Generate a startup checklist for: {idea_name} — {idea_desc}\n"
            f"Business type: {business_type}\n"
            f"Return a JSON array of objects with keys: item (string), category (string: one of 'Legal', 'Finance', 'Marketing', 'Operations', 'Tech'), required (boolean).\n"
            f"Include 15-20 items covering: business registration, licenses, banking, insurance, marketing, website, operations setup.\n"
            f"Return ONLY the JSON array.",
            "You are a startup advisor. Return only JSON arrays.",
            max_tokens=1024,
        )
        plan["checklist"] = _parse_json_array(checklist_raw)
    except Exception as exc:
        log.warning("checklist_gen_error", error=str(exc))
        plan["checklist"] = [
            {"item": "Register your business name", "category": "Legal", "required": True},
            {"item": "Get an EIN from the IRS", "category": "Legal", "required": True},
            {"item": "Open a business bank account", "category": "Finance", "required": True},
            {"item": "Set up basic accounting software", "category": "Finance", "required": True},
            {"item": "Create a simple website", "category": "Marketing", "required": True},
        ]

    # Cost Calculator
    try:
        cost_raw = await _ai_complete(
            f"Generate a startup cost estimate for: {idea_name}\n"
            f"Starting capital available: {capital}\n"
            f"Return a JSON array of objects with keys: item (string), estimated_cost_low (integer), estimated_cost_high (integer), category (string).\n"
            f"Include 8-12 realistic cost items. Return ONLY the JSON array.",
            "You are a startup financial advisor. Return only JSON arrays.",
            max_tokens=800,
        )
        plan["cost_calculator"] = _parse_json_array(cost_raw)
    except Exception as exc:
        log.warning("cost_calc_gen_error", error=str(exc))
        plan["cost_calculator"] = [
            {"item": "Business registration", "estimated_cost_low": 50, "estimated_cost_high": 200, "category": "Legal"},
            {"item": "Website & domain", "estimated_cost_low": 100, "estimated_cost_high": 500, "category": "Tech"},
            {"item": "Marketing materials", "estimated_cost_low": 100, "estimated_cost_high": 400, "category": "Marketing"},
        ]

    # Pricing Packages
    try:
        pricing_raw = await _ai_complete(
            f"Create 3 pricing packages for: {idea_name}\n"
            f"Return a JSON array of 3 objects with keys: name (string), description (string), price_suggestion (string, e.g. '$99/month'), included_services (array of strings).\n"
            f"Return ONLY the JSON array.",
            "You are a pricing strategist. Return only JSON arrays.",
            max_tokens=600,
        )
        plan["pricing_packages"] = _parse_json_array(pricing_raw)
    except Exception as exc:
        log.warning("pricing_gen_error", error=str(exc))
        plan["pricing_packages"] = [
            {"name": "Starter", "description": "Basic service package", "price_suggestion": "$99/month", "included_services": ["Core service", "Email support"]},
            {"name": "Professional", "description": "Full service package", "price_suggestion": "$199/month", "included_services": ["Core service", "Priority support", "Monthly check-in"]},
            {"name": "Premium", "description": "Complete managed service", "price_suggestion": "$349/month", "included_services": ["Full service", "Dedicated support", "Weekly check-in", "Custom reports"]},
        ]

    # 30-Day Plan
    try:
        plan30_raw = await _ai_complete(
            f"Create a 30-day launch plan for: {idea_name}\n"
            f"Return a JSON array of 4 objects (one per week) with keys: week (integer 1-4), title (string), milestones (array of 3-5 strings).\n"
            f"Return ONLY the JSON array.",
            "You are a startup launch coach. Return only JSON arrays.",
            max_tokens=800,
        )
        plan["thirty_day_plan"] = _parse_json_array(plan30_raw)
    except Exception as exc:
        log.warning("plan30_gen_error", error=str(exc))
        plan["thirty_day_plan"] = [
            {"week": 1, "title": "Foundation", "milestones": ["Register business", "Set up bank account", "Create social media profiles"]},
            {"week": 2, "title": "Setup", "milestones": ["Build basic website", "Define services/products", "Set pricing"]},
            {"week": 3, "title": "Launch Prep", "milestones": ["Create marketing materials", "Reach out to first prospects", "Set up payment processing"]},
            {"week": 4, "title": "First Sales", "milestones": ["Contact 20 potential customers", "Close first sale", "Request first review"]},
        ]

    if tier == "launch_packet_pro":
        # ── Part 2: Pro-only content (3 additional AI calls) ─────────────────

        # Business Plan Text
        try:
            plan["business_plan_text"] = await _ai_complete(
                f"Write a comprehensive business plan for: {idea_name}\n"
                f"Description: {idea_desc}\n"
                f"Business type: {business_type}\n\n"
                f"Include these sections separated by headers: Executive Summary, Business Description, Market Analysis, "
                f"Products & Services, Marketing Strategy, Operations Plan, Financial Projections, Risk Analysis.\n"
                f"Write 8-12 paragraphs total. Be specific and actionable.",
                "You are a professional business plan writer. Write clear, professional business plans.",
                max_tokens=2000,
            )
        except Exception as exc:
            log.warning("business_plan_gen_error", error=str(exc))
            plan["business_plan_text"] = f"Business Plan for {idea_name}\n\n{idea_desc}\n\nThis business plan outlines the strategy and operations for launching and growing {idea_name}."

        # Mission & Vision
        try:
            plan["mission_vision"] = await _ai_complete(
                f"Write a mission statement and vision statement for: {idea_name}\n"
                f"Description: {idea_desc}\n\n"
                f"Format: First write 'MISSION:' followed by 2-3 sentences. Then write 'VISION:' followed by 2-3 sentences.\n"
                f"Be inspiring and specific to this business.",
                "You are a brand strategist. Write clear, inspiring mission and vision statements.",
                max_tokens=400,
            )
        except Exception as exc:
            log.warning("mission_vision_gen_error", error=str(exc))
            plan["mission_vision"] = f"MISSION: {idea_name} exists to serve our customers with excellence.\n\nVISION: To become the most trusted provider in our market."

        # Customer Persona + Funding + Cyber + 90-Day Roadmap (combined call to reduce API costs)
        try:
            combined_raw = await _ai_complete(
                f"For the business: {idea_name} — {idea_desc}\n\n"
                f"Return a JSON object with these keys:\n"
                f'"customer_persona": object with keys: name, age_range, occupation, goals, pain_points, where_to_find\n'
                f'"funding_checklist": array of 8-10 objects with keys: item (string), category (string), completed (boolean false)\n'
                f'"cyber_ai_checklist": array of 8-10 objects with keys: item (string), category (string), completed (boolean false)\n'
                f'"ninety_day_roadmap": array of 3 objects with keys: month (integer 1-3), title (string), goals (array of 4-5 strings)\n\n'
                f"Return ONLY the JSON object.",
                "You are a business strategist. Return only JSON objects.",
                max_tokens=2000,
            )
            combined = _parse_json_object(combined_raw)
            plan["customer_persona"] = combined.get("customer_persona", {})
            plan["funding_checklist"] = combined.get("funding_checklist", [])
            plan["cyber_ai_checklist"] = combined.get("cyber_ai_checklist", [])
            plan["ninety_day_roadmap"] = combined.get("ninety_day_roadmap", [])
        except Exception as exc:
            log.warning("combined_pro_gen_error", error=str(exc))
            plan["customer_persona"] = {"name": "Alex Johnson", "age_range": "28-45", "occupation": "Small business owner", "goals": "Grow their business efficiently", "pain_points": "Lack of time and resources", "where_to_find": "LinkedIn, local business groups, Chamber of Commerce"}
            plan["funding_checklist"] = [
                {"item": "Create a business plan", "category": "Documentation", "completed": False},
                {"item": "Establish business credit", "category": "Finance", "completed": False},
                {"item": "Research SBA loan options", "category": "Funding", "completed": False},
            ]
            plan["cyber_ai_checklist"] = [
                {"item": "Enable MFA on all business accounts", "category": "Security", "completed": False},
                {"item": "Set up automated backups", "category": "Security", "completed": False},
                {"item": "Evaluate AI tools for customer service", "category": "AI", "completed": False},
            ]
            plan["ninety_day_roadmap"] = [
                {"month": 1, "title": "Foundation", "goals": ["Complete business registration", "Set up banking", "Launch website", "Get first customer"]},
                {"month": 2, "title": "Growth", "goals": ["Reach 5 paying customers", "Set up marketing systems", "Refine pricing", "Get first reviews"]},
                {"month": 3, "title": "Scale", "goals": ["Reach 15 customers", "Hire first help", "Expand marketing", "Plan next quarter"]},
            ]

    log.info("launch_plan_generated", idea=idea_name, tier=tier)
    return plan
