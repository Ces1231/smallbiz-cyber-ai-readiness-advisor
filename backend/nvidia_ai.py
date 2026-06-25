"""
Champ Compass — NVIDIA AI Services Client
Thin async client for the nvidia-ai internal service (ports 8010-8015).
All functions are fail-safe: network errors return {} without raising.
"""
import os

import httpx
import structlog

MORPHEUS_URL = os.getenv("NVIDIA_AI_URL", "http://nvidia-ai:8010")
_NIM_URL = MORPHEUS_URL.replace(":8010", ":8012")
_NEMO_URL = MORPHEUS_URL.replace(":8010", ":8015")

log = structlog.get_logger()

_TIMEOUT = httpx.Timeout(30.0)


async def morpheus_score(findings: list) -> dict:
    """
    POST findings to the Morpheus threat-scoring service on port 8010.
    Returns a dict with at least a 'threat_score' key, or {} on any error.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{MORPHEUS_URL}/score",
                json={"findings": findings},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        log.warning("morpheus_score_failed", error=str(exc))
        return {}


async def nim_classify(title: str, severity: str) -> dict:
    """
    POST to the NIM classification service on port 8012.
    Returns a dict with 'classification' and 'confidence' keys, or {} on error.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{_NIM_URL}/classify",
                json={"title": title, "severity": severity},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        log.warning("nim_classify_failed", error=str(exc))
        return {}


async def nemo_remediate(
    title: str,
    severity: str,
    recommendation: str = "",
) -> dict:
    """
    POST to the NeMo remediation service on port 8015.
    Returns a dict with an 'explanation' key, or {} on error.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{_NEMO_URL}/remediate",
                json={
                    "title": title,
                    "severity": severity,
                    "recommendation": recommendation,
                },
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        log.warning("nemo_remediate_failed", error=str(exc))
        return {}
