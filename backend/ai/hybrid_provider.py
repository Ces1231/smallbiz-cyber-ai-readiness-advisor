"""
HybridProvider — tries providers in priority order, falls back on failure.
Priority: NIM (cloud, best quality) → Ollama (local Jetson) → hardcoded fallback text.
Set AI_PROVIDER=hybrid in docker-compose.yml to activate.
"""
import os
from typing import AsyncIterator

import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()


class HybridProvider(AIProvider):
    """
    Tries NIM (cloud) first, then Ollama (local Jetson), then yields a
    hardcoded fallback message. Transparent to callers — they never know
    which provider was used (unless they read the logs).
    """

    def __init__(self) -> None:
        self._nim = None
        self._ollama = None

        nvidia_api_key = os.environ.get("NVIDIA_API_KEY", "")
        if nvidia_api_key:
            try:
                from backend.ai.nvidia_nim_provider import NvidiaNimProvider
                self._nim = NvidiaNimProvider()
                log.info("hybrid_provider_nim_initialized")
            except Exception as exc:
                log.warning("hybrid_provider_nim_init_failed", error=str(exc))

        try:
            from backend.ai.ollama_provider import OllamaProvider
            self._ollama = OllamaProvider()
            log.info("hybrid_provider_ollama_initialized")
        except Exception as exc:
            log.warning("hybrid_provider_ollama_init_failed", error=str(exc))

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams from NIM first (if API key present), falls back to Ollama,
        then falls back to a hardcoded error message.
        Logs which provider was ultimately used.
        """
        # ── Attempt 1: NVIDIA NIM ─────────────────────────────────────────────
        if self._nim is not None:
            nim_chunks: list[str] = []
            nim_failed = False
            try:
                async for chunk in self._nim.stream_completion(
                    system_prompt=system_prompt,
                    user_message=user_message,
                    max_tokens=max_tokens,
                    temperature=temperature,
                ):
                    # NIM provider yields error sentinel text internally; detect it
                    if chunk.startswith("[NVIDIA NIM"):
                        nim_failed = True
                        break
                    nim_chunks.append(chunk)
                    yield chunk
            except Exception as exc:
                log.warning("hybrid_nim_error", error=str(exc))
                nim_failed = True

            if not nim_failed and nim_chunks:
                log.info("hybrid_provider_used", provider="nim")
                return

            # NIM failed — drain any partial output already yielded is lost;
            # the caller gets incomplete text. Reset and try Ollama.
            # NOTE: We cannot un-yield, so we fall through to Ollama only when
            # nim_chunks is empty (NIM failed before yielding anything).
            if nim_chunks:
                # Already partially streamed from NIM. Log and return.
                log.warning("hybrid_nim_partial_failure", chunks_yielded=len(nim_chunks))
                log.info("hybrid_provider_used", provider="nim_partial")
                return

        # ── Attempt 2: Ollama ─────────────────────────────────────────────────
        if self._ollama is not None:
            ollama_chunks: list[str] = []
            ollama_failed = False
            try:
                async for chunk in self._ollama.stream_completion(
                    system_prompt=system_prompt,
                    user_message=user_message,
                    max_tokens=max_tokens,
                    temperature=temperature,
                ):
                    if chunk.startswith("\n\n[Could not connect") or chunk.startswith("\n\n[AI service"):
                        ollama_failed = True
                        break
                    ollama_chunks.append(chunk)
                    yield chunk
            except Exception as exc:
                log.warning("hybrid_ollama_error", error=str(exc))
                ollama_failed = True

            if not ollama_failed and ollama_chunks:
                log.info("hybrid_provider_used", provider="ollama")
                return

            if ollama_chunks:
                log.warning("hybrid_ollama_partial_failure", chunks_yielded=len(ollama_chunks))
                log.info("hybrid_provider_used", provider="ollama_partial")
                return

        # ── Attempt 3: Hardcoded fallback ────────────────────────────────────
        log.warning("hybrid_provider_used", provider="fallback")
        yield (
            "AI advice is temporarily unavailable. "
            "Please ensure either NVIDIA_API_KEY is set or Ollama is running locally. "
            "In the meantime, review your assessment scores and focus on the dimension "
            "with the lowest score first — whether that is cybersecurity, AI readiness, "
            "or funding readiness. Small improvements in your weakest area typically "
            "deliver the greatest overall impact for your business."
        )

    async def health_check(self) -> bool:
        """Returns True if either NIM or Ollama is healthy."""
        if self._nim is not None:
            try:
                if await self._nim.health_check():
                    return True
            except Exception:
                pass

        if self._ollama is not None:
            try:
                if await self._ollama.health_check():
                    return True
            except Exception:
                pass

        return False
