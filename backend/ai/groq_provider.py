"""
Groq provider adapter.
Uses the groq Python SDK with streaming.
"""
import os
from typing import AsyncIterator

import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()


class GroqProvider(AIProvider):
    """Adapter for Groq-hosted models (LLaMA, Mixtral, etc.) via the official SDK."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("GROQ_API_KEY", "")
        self._model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

    def _get_client(self):
        """Lazy import + instantiate to avoid import-time failures when key is absent."""
        import groq
        return groq.AsyncGroq(api_key=self._api_key)

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from Groq.
        Yields error message as a final chunk on any failure.
        """
        try:
            client = self._get_client()
            stream = await client.chat.completions.create(
                model=self._model,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception as exc:
            import groq
            if isinstance(exc, groq.RateLimitError):
                log.warning("groq_rate_limit", model=self._model)
                yield "\n\n[Rate limit reached. Please wait a moment and try again.]"
            else:
                log.error("groq_stream_error", error=str(exc), model=self._model)
                yield f"\n\n[AI service temporarily unavailable: {type(exc).__name__}]"

    async def health_check(self) -> bool:
        """
        Sends a minimal request to verify the API key and connectivity.
        Returns False on any error.
        """
        try:
            client = self._get_client()
            await client.chat.completions.create(
                model=self._model,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except Exception as exc:
            log.warning("groq_health_check_failed", error=str(exc))
            return False
