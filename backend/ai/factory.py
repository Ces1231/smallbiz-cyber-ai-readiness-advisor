"""
AI Provider Factory.
Returns the appropriate AIProvider instance based on configuration.
Works both standalone and as a FastAPI Depends() target.
"""
import os

import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()


def get_ai_provider() -> AIProvider:
    """
    Reads the AI_PROVIDER environment variable and returns the configured
    provider instance.

    Valid values: 'anthropic', 'openai', 'groq', 'ollama'
    Defaults to 'anthropic' if AI_PROVIDER is not set.

    Raises:
        ValueError: If AI_PROVIDER is set to an unrecognised value.

    Usage as a FastAPI dependency:
        from fastapi import Depends
        from backend.ai.factory import get_ai_provider
        from backend.ai.base import AIProvider

        @router.get("/advice")
        async def get_advice(provider: AIProvider = Depends(get_ai_provider)):
            ...
    """
    provider_name = os.environ.get("AI_PROVIDER", "anthropic").lower().strip()

    if provider_name == "anthropic":
        from backend.ai.anthropic_provider import AnthropicProvider
        return AnthropicProvider()

    if provider_name == "openai":
        from backend.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()

    if provider_name == "groq":
        from backend.ai.groq_provider import GroqProvider
        return GroqProvider()

    if provider_name == "ollama":
        from backend.ai.ollama_provider import OllamaProvider
        return OllamaProvider()

    if provider_name in ("nvidia", "nvidia-nim", "nim"):
        from backend.ai.nvidia_nim_provider import NvidiaNimProvider
        return NvidiaNimProvider()

    log.error("ai_provider_not_found", provider=provider_name)
    raise ValueError(
        f"Unknown AI provider: '{provider_name}'. "
        "Valid values are: 'anthropic', 'openai', 'groq', 'ollama', 'nvidia'."
    )
