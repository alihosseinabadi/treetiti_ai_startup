"""TREEtiti AI Marketing OS — Content Hunter / Trend Scout (Phase 2).

Finds trends, angles and content gaps before anyone else does. Uses the
keyless research adapters (news, Reddit, YouTube, trends) to surface what is
moving now, then reasons about which angle TREEtiti can own. Degrades to
reasoning when no live signal is reachable — the pipeline never breaks.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.memory.store import store_brand_memory

from app.agents.prompts.content_hunter import SYSTEM_PROMPT

DEFAULT_QUERIES = [
    "AI marketing 2026",
    "AI agents business automation",
    "AI content creation trends",
    "AI UGC brand campaigns",
]


class ContentHunterAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Content Hunter / Trend Scout"
    role = "trend scout and content opportunity finder"
    agent_key = "content_hunter"
    system_prompt = SYSTEM_PROMPT

    def _scan(self, queries: list[str]) -> dict[str, Any]:
        """Pull live signals across news/reddit/youtube/trends adapters."""
        from app.services.search import get_trends, search_news, search_reddit, search_youtube

        signals: dict[str, Any] = {"news": [], "reddit": [], "youtube": [], "trends": []}
        for q in queries:
            signals["news"] += search_news(q, max_results=3)
            signals["reddit"] += search_reddit(q, max_results=3)
            signals["youtube"] += search_youtube(q, max_results=3)
        signals["trends"] = get_trends("AI marketing", max_results=5)
        for key in signals:
            signals[key] = signals[key][:8]
        return signals

    def run(
        self,
        brief: str = "",
        queries: list[str] | None = None,
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Scan live signals and pick today's strongest content angle."""
        queries = [q for q in (queries or DEFAULT_QUERIES) if q]
        if brief and brief not in queries:
            queries.insert(0, brief)
        signals = self._scan(queries)

        def fmt(items: list[dict[str, str]]) -> str:
            return "\n".join(f"- {i.get('title', '')} ({i.get('source', '')})" for i in items)

        result = self.complete_json(
            f"""Today's date: use current date.
TASK: pick the single strongest content opportunity for TREEtiti right now.

OWNER BRIEF: {brief or "none provided"}
LIVE SIGNALS:
NEWS:
{fmt(signals['news']) or "(none reachable)"}
REDDIT:
{fmt(signals['reddit']) or "(none reachable)"}
YOUTUBE:
{fmt(signals['youtube']) or "(none reachable)"}
TRENDS:
{fmt(signals['trends']) or "(none reachable)"}
{extra_context or ""}

Respond ONLY with JSON:
{{
  "trend": "the trend worth owning right now",
  "angle": "the specific angle TREEtiti should take",
  "why_now": "why this is timely",
  "content_gap": "what competitors are missing about it",
  "recommended_format": "e.g. linkedin_post, tiktok_video, blog",
  "sources": ["urls the signals came from"]
}}
""",
            temperature=0.5,
        )
        result["queries"] = queries
        sources = [i.get("url", "") for lst in signals.values() for i in lst if i.get("url")]
        result["sources"] = [s for s in sources if s][:6]

        try:
            store_brand_memory(
                category="content_opportunity",
                title=result.get("trend", "trend")[:100],
                content=f"Angle: {result.get('angle', '')} | Format: {result.get('recommended_format', '')}",
                source="content_hunter",
            )
        except Exception:  # noqa: BLE001  (memory must never break the agent)
            pass
        return result


__all__ = ["ContentHunterAgent"]