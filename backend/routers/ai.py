"""
SmallBiz Advisor — AI Advice Router
Endpoints: GET /ai/advice/{assessment_id}/{dimension}, GET /ai/health
Streams AI-generated advice via Server-Sent Events (SSE).
Caches results in advice_cache to avoid redundant LLM calls.
"""
import hashlib
import time
from collections import defaultdict
from typing import AsyncIterator, Literal
from uuid import UUID

import httpx
import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from supabase import Client

from backend.ai.base import AIProvider
from backend.ai.factory import get_ai_provider
from backend.config import settings
from backend.dependencies import get_current_user, get_supabase_client
from backend.middleware.tier import require_pro_tier
from backend.prompts import (
    AssessmentContext,
    build_ai_readiness_advice_prompt,
    build_cyber_advice_prompt,
    build_executive_summary_prompt,
    build_funding_advice_prompt,
    build_roadmap_prompt,
)

router = APIRouter()
log = structlog.get_logger()

Dimension = Literal["cyber", "ai", "funding", "executive_summary", "roadmap"]

# Rate limiter: 20 AI requests per user per 24 hours (in-memory, resets on restart)
_ai_rate_limit: dict[str, list[float]] = defaultdict(list)
AI_RATE_LIMIT_MAX = 20
AI_RATE_LIMIT_WINDOW = 86400  # 24 hours in seconds

# Map dimension to prompt builder function
_PROMPT_BUILDERS = {
    "cyber": build_cyber_advice_prompt,
    "ai": build_ai_readiness_advice_prompt,
    "funding": build_funding_advice_prompt,
    "executive_summary": build_executive_summary_prompt,
    "roadmap": build_roadmap_prompt,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _check_ai_rate_limit(user_id: str) -> None:
    """Raises HTTP 429 if user exceeded 20 requests per 24-hour window."""
    now = time.time()
    window_start = now - AI_RATE_LIMIT_WINDOW
    _ai_rate_limit[user_id] = [t for t in _ai_rate_limit[user_id] if t > window_start]
    if len(_ai_rate_limit[user_id]) >= AI_RATE_LIMIT_MAX:
        log.info("ai_rate_limit_exceeded", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "ai_rate_limit",
                "message": "You have reached the daily AI advice limit. Please try again tomorrow.",
                "details": {},
            },
        )
    _ai_rate_limit[user_id].append(now)


async def _fetch_and_validate_assessment(
    assessment_id: UUID,
    user_id: str,
    supabase: Client,
) -> dict:
    """
    Loads assessment from DB. Raises HTTP 404 if not found or user mismatch.
    Raises HTTP 422 if scores are missing or incomplete.
    Returns the assessment row as a dict.
    """
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
        log.error(
            "ai_assessment_db_error",
            error=str(exc),
            assessment_id=str(assessment_id),
            user_id=user_id,
        )
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

    assessment = result.data
    # Validate that all three dimension scores are present
    cyber = assessment.get("cyber_score")
    ai = assessment.get("ai_score")
    funding = assessment.get("funding_score")

    if cyber is None or ai is None or funding is None:
        log.warning(
            "ai_assessment_incomplete",
            assessment_id=str(assessment_id),
            user_id=user_id,
            cyber_score=cyber,
            ai_score=ai,
            funding_score=funding,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "assessment_incomplete",
                "message": "This assessment does not have complete scores. Please finish the assessment before requesting AI advice.",
                "details": {},
            },
        )

    return assessment


def _build_context(assessment: dict) -> AssessmentContext:
    """Maps assessment DB row to AssessmentContext. Computes maturity_level from overall_score."""
    overall = assessment.get("overall_score", 0)
    if overall >= 80:
        maturity_level = "Advanced readiness"
    elif overall >= 60:
        maturity_level = "Growth-ready foundation"
    elif overall >= 40:
        maturity_level = "Developing readiness"
    else:
        maturity_level = "High-priority improvement needed"

    return AssessmentContext(
        business_name=assessment.get("business_name", "Your Business"),
        industry=assessment.get("industry", "small business"),
        challenge=assessment.get("challenge", ""),
        cyber_score=assessment.get("cyber_score", 0),
        ai_score=assessment.get("ai_score", 0),
        funding_score=assessment.get("funding_score", 0),
        overall_score=overall,
        maturity_level=maturity_level,
    )


async def _stream_cached_advice(cached_content: str) -> AsyncIterator[str]:
    """
    Simulates streaming by splitting cached content into ~50-char chunks.
    Yields SSE-formatted data events.
    Ends with [DONE] then [CACHED] sentinels.
    """
    chunk_size = 50
    for i in range(0, len(cached_content), chunk_size):
        chunk = cached_content[i : i + chunk_size]
        # Sanitize newlines to prevent SSE injection
        safe_chunk = chunk.replace("\n", " ").replace("\r", " ")
        yield f"data: {safe_chunk}\n\n"
    yield "data: [DONE]\n\n"
    yield "data: [CACHED]\n\n"


async def _generate_and_cache_advice(
    assessment: dict,
    dimension: str,
    user_id: str,
    supabase: Client,
    ai: AIProvider,
) -> AsyncIterator[str]:
    """
    Builds prompt, streams from AI provider (yields SSE-formatted chunks),
    collects full text as it streams, and stores the result in advice_cache
    after the stream completes. Cache write failure is logged but does not
    interrupt or raise after streaming.
    Yields 'data: [DONE]\\n\\n' as the final chunk.
    """
    ctx = _build_context(assessment)
    assessment_id = assessment.get("id", "")
    prompt_hash = hashlib.sha256(f"{assessment_id}{dimension}".encode()).hexdigest()

    # Build prompt — treat prompt build failure as a streamed error event
    try:
        builder = _PROMPT_BUILDERS[dimension]
        system_prompt, user_message = builder(ctx)
    except Exception as exc:
        log.error(
            "ai_prompt_build_failed",
            error=str(exc),
            dimension=dimension,
            assessment_id=str(assessment_id),
        )
        yield (
            "event: error\n"
            'data: {"code": "prompt_build_failed", "message": "AI advice is temporarily unavailable. Showing standard recommendations."}\n\n'
        )
        return

    # ── Reranker context injection (soft enhancement — no-op when key absent) ──
    try:
        from backend.ai.nvidia_reranker import NvidiaReranker
        reranker = NvidiaReranker()
        if reranker.has_key:
            past = (
                supabase.table("advice_cache")
                .select("content")
                .eq("user_id", user_id)
                .order("id", desc=True)
                .limit(5)
                .execute()
            )
            past_passages = [r["content"] for r in (past.data or []) if r.get("content")]
            if past_passages:
                ranked_indices = await reranker.rerank(
                    query=f"{system_prompt}\n\n{user_message}",
                    passages=past_passages,
                )
                if ranked_indices:
                    top_passage = past_passages[ranked_indices[0]]
                    system_prompt = (
                        f"Relevant prior advice for context:\n{top_passage}\n\n{system_prompt}"
                    )
                    log.info(
                        "reranker_context_injected",
                        dimension=dimension,
                        passages_considered=len(past_passages),
                    )
    except Exception as exc:
        log.warning("reranker_injection_failed", error=str(exc))
        # Continue without reranker context — non-blocking

    # Stream from AI provider, collecting full text
    full_text_parts: list[str] = []
    stream_failed = False

    try:
        async for chunk in ai.stream_completion(
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=settings.ai_max_tokens,
            temperature=settings.ai_temperature,
        ):
            full_text_parts.append(chunk)
            # Sanitize newlines to prevent SSE injection — replace with spaces
            safe_chunk = chunk.replace("\n", " ").replace("\r", " ")
            yield f"data: {safe_chunk}\n\n"
    except Exception as exc:
        log.warning(
            "ai_provider_stream_error",
            error=str(exc),
            dimension=dimension,
            assessment_id=str(assessment_id),
        )
        stream_failed = True
        yield (
            "event: error\n"
            'data: {"code": "ai_provider_unavailable", "message": "AI advice is temporarily unavailable. Showing standard recommendations."}\n\n'
        )

    if stream_failed:
        return

    yield "data: [DONE]\n\n"

    # Cache the full response — failure is silent (logged only)
    # Do not cache if the output is empty or appears to be an error string from
    # a provider that yielded error text internally (e.g. rate limit messages)
    full_text = "".join(full_text_parts)
    error_sentinel = "[AI service"
    if full_text and not full_text.strip().startswith(error_sentinel):
        # Determine the active model name based on provider
        active_model = _get_active_model()
        try:
            supabase.table("advice_cache").insert({
                "user_id": user_id,
                "assessment_id": str(assessment_id),
                "dimension": dimension,
                "provider": settings.ai_provider,
                "model": active_model,
                "content": full_text,
                "prompt_hash": prompt_hash,
            }).execute()
            log.info(
                "ai_advice_cached",
                assessment_id=str(assessment_id),
                dimension=dimension,
            )
        except Exception as exc:
            log.error(
                "ai_cache_write_failed",
                error=str(exc),
                assessment_id=str(assessment_id),
                dimension=dimension,
            )


def _get_active_model() -> str:
    """Returns the model name for whichever AI provider is currently active."""
    provider = settings.ai_provider.lower()
    if provider == "openai":
        return settings.openai_model
    if provider == "groq":
        return settings.groq_model
    if provider == "ollama":
        return settings.ollama_model
    if provider in ("nvidia", "nvidia-nim", "nim"):
        return settings.nvidia_nim_model
    return settings.anthropic_model


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/advice/{assessment_id}/{dimension}")
async def stream_advice(
    assessment_id: UUID,
    dimension: Dimension,
    current_user: dict = Depends(get_current_user),
    _profile: dict = Depends(require_pro_tier),
    supabase: Client = Depends(get_supabase_client),
    ai: AIProvider = Depends(get_ai_provider),
) -> StreamingResponse:
    """
    Stream AI-generated advice for one dimension of a completed assessment.

    Returns a text/event-stream response. SSE format:
        data: <text chunk>\\n\\n
        data: [DONE]\\n\\n

    For cached responses, a final 'data: [CACHED]\\n\\n' sentinel is added.
    On AI provider failure, yields an SSE error event instead of an HTTP error.

    Rate-limited to 20 requests per user per 24 hours.
    """
    user_id = current_user["id"]

    # Rate limit check BEFORE any streaming begins
    await _check_ai_rate_limit(user_id)

    # Load and validate assessment — raises HTTP errors (not SSE events)
    assessment = await _fetch_and_validate_assessment(assessment_id, user_id, supabase)

    log.info(
        "ai_advice_requested",
        user_id=user_id,
        assessment_id=str(assessment_id),
        dimension=dimension,
    )

    # Cache lookup — filter by user_id to prevent cross-user cache exposure
    try:
        cache_result = (
            supabase.table("advice_cache")
            .select("content")
            .eq("assessment_id", str(assessment_id))
            .eq("user_id", user_id)
            .eq("dimension", dimension)
            .limit(1)
            .execute()
        )
        if cache_result.data:
            log.info(
                "ai_advice_cache_hit",
                assessment_id=str(assessment_id),
                dimension=dimension,
            )
            return StreamingResponse(
                _stream_cached_advice(cache_result.data[0]["content"]),
                media_type="text/event-stream",
            )
        else:
            log.info(
                "ai_advice_cache_miss",
                assessment_id=str(assessment_id),
                dimension=dimension,
            )
    except Exception as exc:
        # Cache read failure — fall through to live generation
        log.warning(
            "ai_cache_read_failed",
            error=str(exc),
            assessment_id=str(assessment_id),
            dimension=dimension,
        )

    # Cache miss — stream from AI provider
    return StreamingResponse(
        _generate_and_cache_advice(
            assessment=assessment,
            dimension=dimension,
            user_id=user_id,
            supabase=supabase,
            ai=ai,
        ),
        media_type="text/event-stream",
    )


@router.post("/transcribe", status_code=200)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Accepts an audio file (m4a, wav, or any format from expo-av).
    Sends to NVIDIA NIM Parakeet ASR if NVIDIA_API_KEY is configured.
    Returns {text, message} — text is None when transcription is unavailable.
    """
    _unused_user = current_user  # auth check only

    if not settings.nvidia_api_key:
        return {
            "text": None,
            "message": (
                "Voice transcription requires NVIDIA_API_KEY — "
                "configure it to enable this feature."
            ),
        }

    try:
        audio_bytes = await audio.read()
        filename = audio.filename or "audio.m4a"
        content_type = audio.content_type or "audio/m4a"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://integrate.api.nvidia.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
                files={
                    "file": (filename, audio_bytes, content_type),
                },
                data={"model": "nvidia/parakeet-ctc-1.1b-asr"},
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("text", "").strip()

        log.info("audio_transcribed", user_id=current_user["id"], chars=len(text))
        return {"text": text or None, "message": None}

    except httpx.HTTPStatusError as exc:
        log.warning(
            "transcribe_nim_http_error",
            status=exc.response.status_code,
            user_id=current_user["id"],
        )
        return {"text": None, "message": "Transcription service returned an error. Please try again."}
    except Exception as exc:
        log.error("transcribe_error", error=str(exc), user_id=current_user["id"])
        return {"text": None, "message": "Transcription failed. Please try again."}


@router.get("/health")
async def ai_health(ai: AIProvider = Depends(get_ai_provider)) -> dict:
    """
    Check AI provider connectivity. No authentication required.
    Returns provider name, model, availability, and latency.
    """
    start = time.time()
    available = await ai.health_check()
    latency_ms = int((time.time() - start) * 1000)

    return {
        "provider": settings.ai_provider,
        "model": _get_active_model(),
        "available": available,
        "latency_ms": latency_ms,
    }
