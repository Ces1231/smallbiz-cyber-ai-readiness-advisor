"""
Ollama (local) provider adapter.
Uses httpx to stream from the Ollama REST API at /api/generate.
"""
import json
import os
from typing import AsyncIterator

import httpx
import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()


class OllamaProvider(AIProvider):
    """Adapter for locally-running Ollama models via its HTTP API."""

    def __init__(self) -> None:
        self._base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self._model = os.environ.get("OLLAMA_MODEL", "llama3.2")

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from Ollama's /api/generate endpoint.
        Parses newline-delimited JSON chunks from the response body.
        Yields error message as a final chunk on any failure.
        """
        prompt = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_message}"
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/api/generate",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            text = chunk.get("response", "")
                            if text:
                                yield text
                            if chunk.get("done", False):
                                break
                        except json.JSONDecodeError:
                            log.warning("ollama_json_decode_error", line=line[:100])
                            continue
        except httpx.ConnectError:
            log.error("ollama_connect_error", base_url=self._base_url)
            yield (
                "\n\n[Could not connect to Ollama. "
                "Ensure Ollama is running at "
                f"{self._base_url}]"
            )
        except Exception as exc:
            log.error("ollama_stream_error", error=str(exc), model=self._model)
            yield f"\n\n[AI service temporarily unavailable: {type(exc).__name__}]"

    async def health_check(self) -> bool:
        """
        GETs /api/tags to verify Ollama is running and reachable.
        Returns False on any error.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                return response.status_code == 200
        except Exception as exc:
            log.warning("ollama_health_check_failed", error=str(exc))
            return False
