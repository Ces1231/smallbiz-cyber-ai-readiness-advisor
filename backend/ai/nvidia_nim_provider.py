"""
NVIDIA NIM (Inference Microservices) provider adapter.

Uses the OpenAI-compatible API served by NVIDIA's cloud inference platform.
Any model listed at https://build.nvidia.com can be used here.

Recommended models:
  - meta/llama-3.1-8b-instruct   (fast, accurate, free tier available)
  - meta/llama-3.3-70b-instruct  (higher quality, larger)
  - mistralai/mistral-7b-instruct-v0.3

Environment variables:
  NVIDIA_API_KEY   — from https://build.nvidia.com (required)
  NVIDIA_NIM_MODEL — model name (default: meta/llama-3.1-8b-instruct)
  NVIDIA_NIM_BASE_URL — base URL (default: https://integrate.api.nvidia.com/v1)
"""
import os
from typing import AsyncIterator

import structlog
from openai import AsyncOpenAI

from backend.ai.base import AIProvider

log = structlog.get_logger()

_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
_DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"


class NvidiaNimProvider(AIProvider):
    """
    Adapter for NVIDIA NIM cloud inference — OpenAI-compatible API.
    Runs large models (8B–70B) via NVIDIA's GPU cloud with no local hardware needed.
    Pairs with Jetson's local Ollama for a local+cloud hybrid architecture.
    """

    def __init__(self) -> None:
        self._api_key = os.environ.get("NVIDIA_API_KEY", "")
        self._model = os.environ.get("NVIDIA_NIM_MODEL", _DEFAULT_MODEL)
        self._base_url = os.environ.get("NVIDIA_NIM_BASE_URL", _DEFAULT_BASE_URL)

        self._client = AsyncOpenAI(
            api_key=self._api_key or "no-key",
            base_url=self._base_url,
        )

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from the NVIDIA NIM API using OpenAI-compatible streaming.
        Falls back to a clear error message if NIM is unavailable or API key is missing.
        """
        if not self._api_key:
            log.warning("nvidia_nim_no_api_key")
            yield (
                "[NVIDIA NIM: Set NVIDIA_API_KEY to enable cloud inference. "
                "Get a free key at build.nvidia.com]"
            )
            return

        try:
            stream = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

        except Exception as exc:
            log.error("nvidia_nim_stream_error", error=str(exc), model=self._model)
            yield f"\n\n[NVIDIA NIM temporarily unavailable: {type(exc).__name__}]"

    async def health_check(self) -> bool:
        """Verifies NIM reachability with a minimal completion call."""
        if not self._api_key:
            return False
        try:
            resp = await self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
                stream=False,
            )
            return bool(resp.choices)
        except Exception as exc:
            log.warning("nvidia_nim_health_failed", error=str(exc))
            return False
