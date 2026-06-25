"""
Tests for the AI Provider abstraction layer (Feature 1, SPRINT-002).

Covers:
  - Factory routing for all four providers
  - Factory error on unknown provider
  - AnthropicProvider health_check (mocked)
  - AnthropicProvider 429 handling — error chunk yielded, no raise
  - Prompt builders — score inclusion, industry inclusion, all five non-empty
"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Env setup — must happen before any backend imports ────────────────────────

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")


# ── Factory tests ─────────────────────────────────────────────────────────────

def test_factory_returns_anthropic_provider():
    """AI_PROVIDER=anthropic → AnthropicProvider instance."""
    from backend.ai.anthropic_provider import AnthropicProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "anthropic"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, AnthropicProvider)


def test_factory_returns_openai_provider():
    """AI_PROVIDER=openai → OpenAIProvider instance."""
    from backend.ai.openai_provider import OpenAIProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "openai"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, OpenAIProvider)


def test_factory_returns_groq_provider():
    """AI_PROVIDER=groq → GroqProvider instance."""
    from backend.ai.groq_provider import GroqProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "groq"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, GroqProvider)


def test_factory_returns_ollama_provider():
    """AI_PROVIDER=ollama → OllamaProvider instance."""
    from backend.ai.ollama_provider import OllamaProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, OllamaProvider)


def test_factory_returns_nvidia_provider():
    """AI_PROVIDER=nvidia → NvidiaNimProvider instance."""
    from backend.ai.nvidia_nim_provider import NvidiaNimProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "nvidia"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, NvidiaNimProvider)


def test_factory_returns_nvidia_nim_alias():
    """AI_PROVIDER=nvidia-nim → NvidiaNimProvider instance."""
    from backend.ai.nvidia_nim_provider import NvidiaNimProvider

    with patch.dict(os.environ, {"AI_PROVIDER": "nvidia-nim"}):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, NvidiaNimProvider)


def test_factory_raises_for_unknown_provider():
    """AI_PROVIDER=unknown → ValueError with helpful message."""
    with patch.dict(os.environ, {"AI_PROVIDER": "unknown_llm"}):
        from backend.ai.factory import get_ai_provider
        with pytest.raises(ValueError, match="Unknown AI provider"):
            get_ai_provider()


def test_factory_defaults_to_anthropic_when_env_unset():
    """When AI_PROVIDER is not set, factory defaults to AnthropicProvider."""
    from backend.ai.anthropic_provider import AnthropicProvider

    env = {k: v for k, v in os.environ.items() if k != "AI_PROVIDER"}
    with patch.dict(os.environ, env, clear=True):
        from backend.ai.factory import get_ai_provider
        provider = get_ai_provider()

    assert isinstance(provider, AnthropicProvider)


# ── AnthropicProvider health check ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_anthropic_provider_health_check_success():
    """health_check() returns True when the API call succeeds."""
    from backend.ai.anthropic_provider import AnthropicProvider

    provider = AnthropicProvider()

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=MagicMock())

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.health_check()

    assert result is True
    mock_client.messages.create.assert_called_once()


@pytest.mark.asyncio
async def test_anthropic_provider_health_check_failure():
    """health_check() returns False when the API raises any exception."""
    from backend.ai.anthropic_provider import AnthropicProvider

    provider = AnthropicProvider()

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(side_effect=Exception("connection refused"))

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.health_check()

    assert result is False


# ── AnthropicProvider 429 rate-limit handling ─────────────────────────────────

@pytest.mark.asyncio
async def test_anthropic_provider_handles_rate_limit():
    """
    When Anthropic raises RateLimitError during streaming, stream_completion
    yields an error message string instead of raising.
    """
    import anthropic as anthropic_sdk
    from backend.ai.anthropic_provider import AnthropicProvider

    provider = AnthropicProvider()

    # Build a mock context manager that raises RateLimitError on enter
    rate_limit_exc = anthropic_sdk.RateLimitError(
        message="Rate limit exceeded",
        response=MagicMock(status_code=429, headers={}),
        body={"error": {"message": "Rate limit exceeded"}},
    )

    mock_stream_cm = MagicMock()
    mock_stream_cm.__aenter__ = AsyncMock(side_effect=rate_limit_exc)
    mock_stream_cm.__aexit__ = AsyncMock(return_value=False)

    mock_client = MagicMock()
    mock_client.messages.stream.return_value = mock_stream_cm

    chunks = []
    with patch.object(provider, "_get_client", return_value=mock_client):
        async for chunk in provider.stream_completion(
            system_prompt="You are helpful.",
            user_message="Test",
        ):
            chunks.append(chunk)

    assert len(chunks) == 1
    assert "rate limit" in chunks[0].lower() or "Rate limit" in chunks[0]


@pytest.mark.asyncio
async def test_anthropic_provider_stream_does_not_raise_on_generic_error():
    """
    Any non-RateLimitError exception during streaming yields an error
    chunk instead of propagating the exception.
    """
    from backend.ai.anthropic_provider import AnthropicProvider

    provider = AnthropicProvider()

    mock_stream_cm = MagicMock()
    mock_stream_cm.__aenter__ = AsyncMock(side_effect=ConnectionError("timeout"))
    mock_stream_cm.__aexit__ = AsyncMock(return_value=False)

    mock_client = MagicMock()
    mock_client.messages.stream.return_value = mock_stream_cm

    chunks = []
    with patch.object(provider, "_get_client", return_value=mock_client):
        async for chunk in provider.stream_completion("sys", "user"):
            chunks.append(chunk)

    assert len(chunks) == 1
    assert "unavailable" in chunks[0].lower()


# ── Prompt builder tests ──────────────────────────────────────────────────────

def _make_ctx(**overrides) -> "AssessmentContext":
    from backend.prompts import AssessmentContext
    defaults = dict(
        business_name="Bright Path Café",
        industry="restaurant",
        challenge="Manual inventory tracking.",
        cyber_score=33,
        ai_score=17,
        funding_score=50,
        overall_score=33,
        maturity_level="Growth-ready foundation",
    )
    defaults.update(overrides)
    return AssessmentContext(**defaults)


def test_prompt_builder_cyber_includes_scores():
    """Cyber prompt includes all four scores in the user message."""
    from backend.prompts import build_cyber_advice_prompt

    ctx = _make_ctx()
    system, user = build_cyber_advice_prompt(ctx)

    assert "33" in user          # cyber_score
    assert "17" in user          # ai_score
    assert "50" in user          # funding_score
    assert system                # non-empty


def test_prompt_builder_includes_industry():
    """All prompt builders reflect the industry in the system prompt."""
    from backend.prompts import (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    )

    ctx = _make_ctx(industry="healthcare")

    for builder in (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    ):
        system, user = builder(ctx)
        # Industry should appear in the system prompt (via _industry_context)
        # AND business name in user message
        assert ctx.business_name in user
        assert ctx.industry in user or "healthcare" in system.lower()


def test_prompt_builder_all_five_dimensions_return_nonempty():
    """All five prompt builders return non-empty (system, user) tuples."""
    from backend.prompts import (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    )

    ctx = _make_ctx()

    for builder in (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    ):
        system, user = builder(ctx)
        assert system, f"{builder.__name__} returned empty system prompt"
        assert user, f"{builder.__name__} returned empty user message"
        assert len(system) > 50, f"{builder.__name__} system prompt too short"
        assert len(user) > 50, f"{builder.__name__} user message too short"


def test_roadmap_prompt_contains_required_format_markers():
    """Roadmap prompt instructs the model to use the exact 30/60/90-day format."""
    from backend.prompts import build_roadmap_prompt

    ctx = _make_ctx()
    system, user = build_roadmap_prompt(ctx)

    assert "30 Days" in system
    assert "60 Days" in system
    assert "90 Days" in system


def test_prompt_builder_business_name_in_user_message():
    """Every prompt builder includes the business name in the user message."""
    from backend.prompts import (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    )

    ctx = _make_ctx(business_name="Sunrise Laundromat")

    for builder in (
        build_cyber_advice_prompt,
        build_ai_readiness_advice_prompt,
        build_funding_advice_prompt,
        build_executive_summary_prompt,
        build_roadmap_prompt,
    ):
        _, user = builder(ctx)
        assert "Sunrise Laundromat" in user, (
            f"{builder.__name__} missing business name in user message"
        )


def test_industry_context_varies_by_industry():
    """Different industries produce different system prompt content."""
    from backend.prompts import build_cyber_advice_prompt

    restaurant_sys, _ = build_cyber_advice_prompt(_make_ctx(industry="restaurant"))
    healthcare_sys, _ = build_cyber_advice_prompt(_make_ctx(industry="healthcare"))
    retail_sys, _ = build_cyber_advice_prompt(_make_ctx(industry="retail"))

    # Each should produce a different system prompt
    assert restaurant_sys != healthcare_sys
    assert restaurant_sys != retail_sys
    assert healthcare_sys != retail_sys
