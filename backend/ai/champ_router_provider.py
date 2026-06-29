"""
CHAMP AI Router Provider.
Bridges the AIProvider stream_completion interface to the CHAMP AI Router
on port 9000. Parses assessment scores from the prompt text, builds
structured findings, calls /ai/full-analysis, and streams the formatted
JSON result as readable advice text.
"""
import asyncio
import os
import re
from typing import AsyncIterator

import httpx
import structlog

from backend.ai.base import AIProvider

log = structlog.get_logger()

_PROJECT_ID = "smallbiz-cyber-ai"

_TIER_LABELS = {
    "CRITICAL": "critical gaps that need immediate attention",
    "HIGH":     "significant gaps that should be addressed soon",
    "MEDIUM":   "moderate gaps worth addressing over the next 30–60 days",
    "LOW":      "a solid foundation with room for improvement",
}

_DIM_LABELS = {
    "cyber":             "cybersecurity",
    "ai":                "AI readiness",
    "funding":           "funding readiness",
    "executive_summary": "overall readiness",
    "roadmap":           "readiness",
}


class CHAMPRouterProvider(AIProvider):
    """
    AIProvider that routes to the CHAMP AI Router instead of a direct LLM.
    Configured via CHAMP_AI_ROUTER_URL and CHAMP_AI_ROUTER_API_KEY env vars.
    Falls back gracefully if the router is unreachable.
    """

    def __init__(self, base_url: str = None, api_key: str = None):
        self._base_url = (
            base_url or os.getenv("CHAMP_AI_ROUTER_URL", "http://localhost:9000")
        ).rstrip("/")
        self._api_key = api_key or os.getenv("CHAMP_AI_ROUTER_API_KEY", "")

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self._api_key:
            h["X-CHAMP-API-Key"] = self._api_key
        return h

    def _parse_scores(self, user_message: str) -> dict:
        """Extract business info and scores from the structured prompt text."""
        out = {
            "business_name": "Your Business",
            "industry":      "small business",
            "challenge":     "",
            "cyber_score":   50,
            "ai_score":      50,
            "funding_score": 50,
            "overall_score": 50,
        }
        patterns = {
            "business_name": r"Business:\s*(.+)",
            "industry":      r"Industry:\s*(.+)",
            "challenge":     r"Main challenge:\s*(.+)",
            "cyber_score":   r"Cybersecurity score:\s*(\d+)/100",
            "ai_score":      r"AI readiness score:\s*(\d+)/100",
            "funding_score": r"Funding readiness score:\s*(\d+)/100",
            "overall_score": r"Overall score:\s*(\d+)/100",
        }
        for key, pattern in patterns.items():
            m = re.search(pattern, user_message)
            if m:
                val = m.group(1).strip()
                out[key] = int(val) if key.endswith("_score") else val
        return out

    def _detect_dimension(self, system_prompt: str) -> str:
        p = system_prompt.lower()
        if "cybersecurity" in p:
            return "cyber"
        if "ai adoption" in p or "ai tools" in p:
            return "ai"
        if "funding" in p:
            return "funding"
        if "executive summary" in p:
            return "executive_summary"
        if "roadmap" in p or "30 days" in p:
            return "roadmap"
        return "cyber"

    def _build_findings(self, scores: dict, dimension: str) -> list:
        """Translate assessment scores into structured findings for the router."""
        findings = []
        business  = scores["business_name"]
        cyber     = scores["cyber_score"]
        ai_s      = scores["ai_score"]
        funding   = scores["funding_score"]
        overall   = scores["overall_score"]
        challenge = scores.get("challenge", "")

        def _sev(score: int) -> str:
            if score < 40:   return "critical"
            if score < 60:   return "high"
            if score < 80:   return "medium"
            return "low"

        if dimension in ("cyber", "executive_summary", "roadmap"):
            findings.append({
                "title":          f"Cybersecurity readiness gap — {business}",
                "severity":       _sev(cyber),
                "recommendation": (
                    f"Cybersecurity score {cyber}/100. "
                    "Enable MFA on all accounts, set up automated backups, and train "
                    "employees to recognise phishing. Use free tools: Bitwarden, "
                    "Google Workspace security alerts, and Cloudflare WARP."
                ),
            })
        if dimension in ("ai", "executive_summary", "roadmap"):
            findings.append({
                "title":          f"AI adoption readiness gap — {business}",
                "severity":       _sev(ai_s),
                "recommendation": (
                    f"AI readiness score {ai_s}/100. "
                    "Start with ChatGPT or Claude for customer emails and marketing copy. "
                    "Use Notion AI or Google Workspace AI for internal docs. "
                    "All have free tiers a small business can adopt in one week."
                ),
            })
        if dimension in ("funding", "executive_summary", "roadmap"):
            findings.append({
                "title":          f"Funding readiness gap — {business}",
                "severity":       _sev(funding),
                "recommendation": (
                    f"Funding score {funding}/100. "
                    "Prepare a one-page business summary, 2-year P&L, and bank statements. "
                    "Apply for SBA Microloan, search Grants.gov, and contact your local SBDC "
                    "for free application coaching."
                ),
            })
        if challenge:
            findings.append({
                "title":          f"Primary challenge: {challenge[:80]}",
                "severity":       "medium",
                "recommendation": (
                    f"Directly address: {challenge}. "
                    f"Overall readiness score is {overall}/100 — "
                    "focus on the lowest-scoring area first for the fastest improvement."
                ),
            })
        if not findings:
            findings.append({
                "title":          f"Readiness assessment — {business}",
                "severity":       "medium" if overall < 70 else "low",
                "recommendation": (
                    f"Overall score {overall}/100. "
                    "Address each dimension in order of lowest score first."
                ),
            })
        return findings

    def _format_advice(self, router_result: dict, scores: dict, dimension: str) -> str:
        """Format the router's full-analysis JSON into readable advice text."""
        business     = scores["business_name"]
        industry     = scores["industry"]
        threat_score = router_result.get("threat_score", 0)
        risk_tier    = router_result.get("risk_tier", "MEDIUM")
        remediation  = router_result.get("remediation_guidance", [])
        fallback     = router_result.get("fallback_used", False)

        tier_text = _TIER_LABELS.get(risk_tier, "gaps worth reviewing")
        dim_label = _DIM_LABELS.get(dimension, "readiness")

        lines = [
            f"{business} ({industry}) shows {tier_text} in {dim_label}. "
            f"Your risk level is {risk_tier.title()} "
            f"({int(threat_score)}/100 readiness risk score). "
            "Here are your prioritised next steps:",
            "",
        ]

        if remediation:
            for i, item in enumerate(remediation[:5], 1):
                guidance  = item.get("guidance") or item.get("explanation", "")
                title_txt = item.get("title", "")
                severity  = item.get("severity", "").upper()
                if guidance:
                    lines.append(f"{i}. [{severity}] {title_txt}")
                    lines.append(f"   {guidance}")
                    lines.append("")
        else:
            lines += [
                "1. Enable multi-factor authentication on every business account today.",
                "2. Set up automated off-site backups (Backblaze: $7/month).",
                "3. Complete the free Google Cybersecurity Fundamentals course.",
                "",
            ]

        lines.append(
            "Start with the critical and high items — most can be completed "
            "this week without a consultant or significant budget."
        )

        if fallback:
            lines.append("")
            lines.append(
                "(Advice generated using CHAMP AI Router fallback mode — "
                "connect NVIDIA AI Services for enhanced analysis.)"
            )

        return "\n".join(lines)

    # ── AIProvider interface ──────────────────────────────────────────────────

    async def _nvidia_reachable(self) -> bool:
        """
        Fast TCP probe to the project's Morpheus port (8610).
        Returns True in <1s if the service is listening; False otherwise.
        Avoids the 30s HTTP timeout from the router's health endpoints.
        """
        nvidia_host = os.getenv("NVIDIA_SERVICE_HOST", "host.docker.internal")
        morpheus_port = int(os.getenv("NVIDIA_MORPHEUS_PORT", "8610"))
        try:
            _, writer = await asyncio.wait_for(
                asyncio.open_connection(nvidia_host, morpheus_port),
                timeout=1.5,
            )
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            return True
        except Exception:
            return False

    async def _pick_provider(self) -> str:
        """
        Returns 'mock_provider' if Morpheus is unreachable (fast TCP probe).
        Returns '' (empty) to use the router's configured default otherwise.
        """
        reachable = await self._nvidia_reachable()
        if not reachable:
            log.info("champ_router_nvidia_unreachable_using_mock", project=_PROJECT_ID)
            return "mock_provider"
        return ""

    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Calls /ai/full-analysis on the CHAMP AI Router, then streams
        the formatted result as text chunks (~60 chars each).
        Probes project service health first — uses mock_provider when
        NVIDIA services are offline to avoid multi-minute timeouts.
        Never raises — yields an error sentinel string on failure.
        """
        try:
            scores    = self._parse_scores(user_message)
            dimension = self._detect_dimension(system_prompt)
            findings  = self._build_findings(scores, dimension)

            async with httpx.AsyncClient(timeout=35.0) as client:
                provider = await self._pick_provider()

                payload = {
                    "project_id": _PROJECT_ID,
                    "findings":   findings,
                }
                if provider:
                    payload["provider"] = provider

                resp = await client.post(
                    f"{self._base_url}/ai/full-analysis",
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()

            advice = self._format_advice(data, scores, dimension)

            chunk_size = 60
            for i in range(0, len(advice), chunk_size):
                yield advice[i : i + chunk_size]

        except httpx.HTTPStatusError as exc:
            log.error("champ_router_http_error", status=exc.response.status_code)
            yield f"[AI service unavailable — HTTP {exc.response.status_code}. Please try again shortly.]"
        except Exception as exc:
            log.error("champ_router_error", error=str(exc))
            yield "[AI service temporarily unavailable. Please try again shortly.]"

    async def health_check(self) -> bool:
        """Returns True if champ-ai-router /health responds with status=ok."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self._base_url}/health",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                return resp.json().get("status") == "ok"
        except Exception as exc:
            log.warning("champ_router_health_failed", error=str(exc))
            return False
