"""
Champ Compass — Prompt Templates

All AI prompt builders for assessment advice, executive summary,
and roadmap generation. Prompts are calibrated for small business owners,
not tech consultants — direct, jargon-free, and immediately actionable.
"""
from dataclasses import dataclass


@dataclass
class AssessmentContext:
    """Carries all scoring and business context needed to build any prompt."""

    business_name: str
    industry: str
    challenge: str
    cyber_score: int
    ai_score: int
    funding_score: int
    overall_score: int
    maturity_level: str  # e.g. "Advanced readiness", "Growth-ready foundation"


# ── Shared system prompt base ─────────────────────────────────────────────────

_BASE_SYSTEM = (
    "You are a practical small business advisor — not a tech consultant. "
    "Your clients are small business owners who need straight-talking, "
    "actionable guidance in plain English. "
    "Avoid jargon, acronyms, and enterprise tools. "
    "Recommend only free or low-cost solutions a small business can actually use. "
    "Be direct and specific. Every recommendation must be something the owner "
    "can start within a week without hiring a consultant."
)


def _industry_context(industry: str) -> str:
    """Returns an industry-specific framing sentence for prompts."""
    industry_lower = industry.lower()

    if any(k in industry_lower for k in ("restaurant", "food", "cafe", "bakery")):
        return (
            "This is a food service business. Prioritise point-of-sale security, "
            "food-safety record-keeping, and simple loyalty/ordering tools."
        )
    if any(k in industry_lower for k in ("retail", "shop", "store", "boutique")):
        return (
            "This is a retail business. Focus on inventory systems, payment security, "
            "and e-commerce basics."
        )
    if any(k in industry_lower for k in ("healthcare", "medical", "clinic", "dental", "therapy")):
        return (
            "This is a healthcare business. Emphasise patient data privacy (HIPAA basics), "
            "secure communications, and appointment management tools."
        )
    if any(k in industry_lower for k in ("construction", "contractor", "trades", "plumb", "electr")):
        return (
            "This is a trades/construction business. Focus on job-site safety records, "
            "invoice and payment security, and field-team communication tools."
        )
    if any(k in industry_lower for k in ("salon", "spa", "beauty", "barber")):
        return (
            "This is a personal services business. Prioritise appointment booking security, "
            "client data protection, and simple marketing automation."
        )
    if any(k in industry_lower for k in ("law", "legal", "attorney", "accounting", "cpa", "finance")):
        return (
            "This is a professional services business. Client confidentiality and "
            "secure document handling are the top priorities."
        )
    if any(k in industry_lower for k in ("nonprofit", "non-profit", "charity", "ngo")):
        return (
            "This is a nonprofit. Focus on donor data protection, grant compliance, "
            "and free or discounted tools available to registered nonprofits."
        )
    # Default
    return (
        "This is a small business. Focus on practical, affordable steps that "
        "protect the business without requiring dedicated IT staff."
    )


def _score_label(score: int) -> str:
    """Converts a 0-100 score into a short descriptive label."""
    if score >= 75:
        return "strong"
    if score >= 50:
        return "moderate"
    if score >= 25:
        return "developing"
    return "early-stage"


# ── Prompt builders ───────────────────────────────────────────────────────────

def build_cyber_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for cybersecurity dimension advice.
    Output: 2-3 sentence context + numbered list of 3-5 specific actions.
    Max 300 words.
    """
    system_prompt = (
        f"{_BASE_SYSTEM}\n\n"
        f"{_industry_context(ctx.industry)}\n\n"
        "Focus this response exclusively on cybersecurity improvements. "
        "Your output must be under 300 words. "
        "Format: start with a 2-3 sentence paragraph contextualising the score, "
        "then a numbered list of 3-5 specific, actionable steps the owner can take."
    )

    user_message = (
        f"Business: {ctx.business_name}\n"
        f"Industry: {ctx.industry}\n"
        f"Main challenge: {ctx.challenge}\n\n"
        f"Cybersecurity score: {ctx.cyber_score}/100 ({_score_label(ctx.cyber_score)})\n"
        f"AI readiness score: {ctx.ai_score}/100\n"
        f"Funding readiness score: {ctx.funding_score}/100\n"
        f"Overall score: {ctx.overall_score}/100 — {ctx.maturity_level}\n\n"
        "Give me 3-5 specific cybersecurity actions I should take right now to protect my business. "
        "Be concrete — name the tools, set the timelines."
    )

    return system_prompt, user_message


def build_ai_readiness_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for AI readiness dimension advice.
    Output: 2-3 sentence context + numbered list of 3-5 specific actions.
    Max 300 words.
    """
    system_prompt = (
        f"{_BASE_SYSTEM}\n\n"
        f"{_industry_context(ctx.industry)}\n\n"
        "Focus this response exclusively on AI adoption for small businesses. "
        "Recommend only tools with a free tier or under $50/month. "
        "Your output must be under 300 words. "
        "Format: start with a 2-3 sentence paragraph contextualising the score, "
        "then a numbered list of 3-5 specific, actionable steps the owner can take."
    )

    user_message = (
        f"Business: {ctx.business_name}\n"
        f"Industry: {ctx.industry}\n"
        f"Main challenge: {ctx.challenge}\n\n"
        f"AI readiness score: {ctx.ai_score}/100 ({_score_label(ctx.ai_score)})\n"
        f"Cybersecurity score: {ctx.cyber_score}/100\n"
        f"Funding readiness score: {ctx.funding_score}/100\n"
        f"Overall score: {ctx.overall_score}/100 — {ctx.maturity_level}\n\n"
        "Give me 3-5 specific ways I can start using AI tools to grow my business or save time. "
        "Focus on tools that are easy to set up and affordable for a small operation."
    )

    return system_prompt, user_message


def build_funding_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for funding readiness dimension advice.
    Output: 2-3 sentence context + numbered list of 3-5 specific actions.
    Max 300 words.
    """
    system_prompt = (
        f"{_BASE_SYSTEM}\n\n"
        f"{_industry_context(ctx.industry)}\n\n"
        "Focus this response exclusively on funding and financial readiness. "
        "Include grants, SBA loans, CDFI lenders, and local programs where relevant. "
        "Your output must be under 300 words. "
        "Format: start with a 2-3 sentence paragraph contextualising the score, "
        "then a numbered list of 3-5 specific, actionable steps the owner can take."
    )

    user_message = (
        f"Business: {ctx.business_name}\n"
        f"Industry: {ctx.industry}\n"
        f"Main challenge: {ctx.challenge}\n\n"
        f"Funding readiness score: {ctx.funding_score}/100 ({_score_label(ctx.funding_score)})\n"
        f"Cybersecurity score: {ctx.cyber_score}/100\n"
        f"AI readiness score: {ctx.ai_score}/100\n"
        f"Overall score: {ctx.overall_score}/100 — {ctx.maturity_level}\n\n"
        "Give me 3-5 specific steps to improve my chances of securing funding — "
        "grants, loans, or investors — for my business. "
        "Be specific about what documents to prepare and where to apply."
    )

    return system_prompt, user_message


def build_executive_summary_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for a full executive summary.
    Output: 150-250 words covering all three dimensions.
    """
    system_prompt = (
        f"{_BASE_SYSTEM}\n\n"
        f"{_industry_context(ctx.industry)}\n\n"
        "Write a concise executive summary covering cybersecurity, AI readiness, "
        "and funding readiness together. "
        "Length: 150-250 words. No lists — flowing paragraphs. "
        "End with one clear next step the owner should take this week."
    )

    user_message = (
        f"Business: {ctx.business_name}\n"
        f"Industry: {ctx.industry}\n"
        f"Main challenge: {ctx.challenge}\n\n"
        f"Scores:\n"
        f"  Cybersecurity: {ctx.cyber_score}/100 ({_score_label(ctx.cyber_score)})\n"
        f"  AI readiness:  {ctx.ai_score}/100 ({_score_label(ctx.ai_score)})\n"
        f"  Funding:       {ctx.funding_score}/100 ({_score_label(ctx.funding_score)})\n"
        f"  Overall:       {ctx.overall_score}/100 — {ctx.maturity_level}\n\n"
        "Write a brief executive summary of where this business stands today "
        "and what matters most to address first."
    )

    return system_prompt, user_message


def build_roadmap_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for a 30/60/90-day personalised roadmap.

    The response MUST follow this exact format for the frontend parser:
        30 Days: [2-3 specific actions]
        60 Days: [2-3 specific actions building on 30-day results]
        90 Days: [2-3 specific actions for longer-term growth]
    """
    system_prompt = (
        f"{_BASE_SYSTEM}\n\n"
        f"{_industry_context(ctx.industry)}\n\n"
        "Create a 30/60/90-day action roadmap. "
        "You MUST use exactly this format — the frontend parser depends on it:\n\n"
        "30 Days: [list 2-3 specific actions the owner can complete in the first month]\n"
        "60 Days: [list 2-3 specific actions that build on the 30-day results]\n"
        "90 Days: [list 2-3 specific actions for longer-term growth and resilience]\n\n"
        "Each phase should have 2-3 numbered sub-items. "
        "Actions must be concrete, cheap or free, and achievable without a consultant."
    )

    user_message = (
        f"Business: {ctx.business_name}\n"
        f"Industry: {ctx.industry}\n"
        f"Main challenge: {ctx.challenge}\n\n"
        f"Scores:\n"
        f"  Cybersecurity: {ctx.cyber_score}/100 ({_score_label(ctx.cyber_score)})\n"
        f"  AI readiness:  {ctx.ai_score}/100 ({_score_label(ctx.ai_score)})\n"
        f"  Funding:       {ctx.funding_score}/100 ({_score_label(ctx.funding_score)})\n"
        f"  Overall:       {ctx.overall_score}/100 — {ctx.maturity_level}\n\n"
        "Build me a personalised 30/60/90-day roadmap to improve my weakest areas "
        "and keep my strengths. Prioritise based on my scores and industry."
    )

    return system_prompt, user_message
