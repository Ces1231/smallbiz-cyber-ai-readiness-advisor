"""
Anthropic Claude provider adapter.
Uses the anthropic Python SDK with streaming.
"""
import os
from typing import AsyncIterator

import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()


class AnthropicProvider(AIProvider):
    """Adapter for Anthropic Claude models via the official SDK."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self._model = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

    def _get_client(self):
        """Lazy import + instantiate to avoid import-time failures when key is absent."""
        import anthropic
        return anthropic.AsyncAnthropic(api_key=self._api_key)

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from Anthropic Claude.
        Yields error message as a final chunk on 429 or any other failure.
        """
        try:
            client = self._get_client()
            async with client.messages.stream(
                model=self._model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as exc:
            import anthropic
            if isinstance(exc, anthropic.RateLimitError):
                log.warning("anthropic_rate_limit", model=self._model)
                yield (
                    "\n\n[Rate limit reached. Please wait a moment and try again.]"
                )
            else:
                log.error("anthropic_stream_error", error=str(exc), model=self._model)
                yield f"\n\n[AI service temporarily unavailable: {type(exc).__name__}]"

    async def health_check(self) -> bool:
        """
        Sends a minimal message to verify the API key and connectivity.
        Returns False on any error.
        """
        try:
            client = self._get_client()
            await client.messages.create(
                model=self._model,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except Exception as exc:
            log.warning("anthropic_health_check_failed", error=str(exc))
            return False
