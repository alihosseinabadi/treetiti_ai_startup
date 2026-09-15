"""TREEtiti AI Marketing OS — Social / Competitor Intel Agent (Phase 2).

Monitors competitor and social signals: what competitors are publishing, what
audiences complain about / praise, and where the market noise is. Produces a
structured intel brief for the Strategist. Degrades to reasoning when no live
signal is reachable.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent

from app.agents.prompts.social_intel import SYSTEM_PROMPT

DEFAULT_COMPETITORS = [
    "https://www.viralnation.com",
    "https://www.obvious.com",
]


class SocialIntelAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Social / Competitor Intel Agent"
    role = "competitive and social intelligence analyst"
    agent_key = "social_intel"
    system_prompt = SYSTEM_PROMPT

    def _gather(self, competitors: list[str]) -> dict[str, Any]:
        from app.services.search import analyze_competitor, search_reddit, search_youtube

        scans: list[dict[str, Any]] = []
        for url in competitors[:4]:
            data = analyze_competitor(url, max_chars=2000)
            if not data.get("error"):
                scans.append(data)
        social: dict[str, list[dict[str, str]]] = {
            "reddit": search_reddit("AI marketing agency", max_results=5),
            "youtube": search_youtube("AI marketing agency review", max_results=5),
        }
        return {"competitors": scans, "social": social}

    def run(
        self,
        brief: str = "",
        competitors: list[str] | None = None,
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Scan competitors + social noise and produce an intel brief."""
        competitors = competitors or DEFAULT_COMPETITORS
        data = self._gather(competitors)

        def fmt(items: list[dict[str, str]]) -> str:
            return "\n".join(f"- {i.get('title', '')} ({i.get('source', '')})" for i in items)

        competitor_block = "\n".join(
            f"- {c.get('url', '')} | {c.get('home_preview', '')[:220]}" for c in data["competitors"]
        ) or "(competitor sites unreachable)"
        result = self.complete_json(
            f"""TASK: produce a competitive intel brief for TREEtiti.
BRIEF: {brief or "none provided"}
{extra_context or ""}

COMPETITOR SCANS:
{competitor_block}

REDDIT SIGNAL:
{fmt(data['social']['reddit']) or "(none reachable)"}

YOUTUBE SIGNAL:
{fmt(data['social']['youtube']) or "(none reachable)"}

Respond ONLY with JSON:
{{
  "competitor_moves": ["what competitors are doing"],
  "audience_voice": ["what people say about AI agencies right now"],
  "gaps": ["gaps TREEtiti can exploit"],
  "positioning_recommendation": "how TREEtiti should position against them",
  "intel_summary": "one-paragraph decision-ready summary"
}}
""",
            temperature=0.4,
        )
        result["competitors_scanned"] = [c.get("url") for c in data["competitors"]]
        return result


__all__ = ["SocialIntelAgent"]