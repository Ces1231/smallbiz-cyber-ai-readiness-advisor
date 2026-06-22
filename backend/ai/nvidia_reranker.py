"""
NVIDIA NIM Reranker adapter.
Uses nvidia/nv-rerankqa-mistral-4b-v3 to rerank passages against a query.
Degrades gracefully when NVIDIA_API_KEY is absent.
"""
import structlog
import httpx

from backend.config import settings

log = structlog.get_logger()

_RERANK_MODEL = "nvidia/nv-rerankqa-mistral-4b-v3"
_RERANK_URL = "https://integrate.api.nvidia.com/v1/ranking"


class NvidiaReranker:
    """Reranks passages by relevance to a query using NVIDIA NIM."""

    @property
    def has_key(self) -> bool:
        return bool(settings.nvidia_api_key)

    async def rerank(self, query: str, passages: list[str]) -> list[int]:
        """
        Returns passage indices sorted by relevance (most relevant first).
        Returns list(range(len(passages))) — original order — on any error or
        when NVIDIA_API_KEY is absent.
        """
        fallback = list(range(len(passages)))

        if not settings.nvidia_api_key:
            log.debug("nvidia_reranker_no_api_key")
            return fallback

        if not passages or not query:
            return fallback

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    _RERANK_URL,
                    headers={
                        "Authorization": f"Bearer {settings.nvidia_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": _RERANK_MODEL,
                        "query": {"role": "user", "content": query},
                        "passages": [{"role": "user", "content": p} for p in passages],
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                # Response format: {"rankings": [{"index": 0, "logit": -1.23}, ...]}
                rankings = data.get("rankings", [])
                # Sort by logit score descending (higher = more relevant)
                sorted_rankings = sorted(rankings, key=lambda x: x.get("logit", 0), reverse=True)
                indices = [r["index"] for r in sorted_rankings]

                log.info("nvidia_reranker_success", query_len=len(query), passages=len(passages))
                return indices
        except Exception as exc:
            log.warning("nvidia_reranker_error", error=str(exc))
            return fallback
