"""
NVIDIA NIM Embeddings adapter.
Uses nvidia/nv-embedqa-e5-v5 to embed text passages.
Degrades gracefully when NVIDIA_API_KEY is absent.
"""
import structlog
import httpx

from backend.config import settings

log = structlog.get_logger()

_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5"
_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings"


class NvidiaEmbeddings:
    """Thin wrapper around NVIDIA NIM embeddings endpoint."""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Returns a list of embedding vectors, one per input text.
        Returns an empty list if NVIDIA_API_KEY is not configured or on any error.
        """
        if not settings.nvidia_api_key:
            log.debug("nvidia_embeddings_no_api_key")
            return []

        if not texts:
            return []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    _EMBED_URL,
                    headers={
                        "Authorization": f"Bearer {settings.nvidia_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": _EMBED_MODEL,
                        "input": texts,
                        "input_type": "passage",
                        "encoding_format": "float",
                        "truncate": "END",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                # Sort by index to guarantee order matches input
                items = sorted(data["data"], key=lambda x: x["index"])
                return [item["embedding"] for item in items]
        except Exception as exc:
            log.warning("nvidia_embeddings_error", error=str(exc))
            return []
