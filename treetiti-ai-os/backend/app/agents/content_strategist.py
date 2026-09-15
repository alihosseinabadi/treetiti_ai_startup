"""TREEtiti AI Marketing OS — Content Strategist (Phase 2).

Owns the editorial layer between strategy and production: content pillars,
an editorial calendar, and per-piece creative briefs that the Copywriter and
Creative Director execute. Grounds everything in the strategy from the
Business Strategist and in brand memory.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.prompts.content_strategist import SYSTEM_PROMPT
from app.memory.store import store_brand_memory


class ContentStrategistAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Content Strategist"
    role = "editorial strategist and campaign coordinator"
    agent_key = "content_strategist"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        extra_context: str = "",
        insight_brief: str = "",
    ) -> dict[str, Any]:
        """Build pillars + calendar + briefs from a strategy brief."""
        result = self.complete_json(
            f"""TASK: turn the strategy below into a concrete editorial plan.

STRATEGY / BRIEF: {brief or "position TREEtiti as the premium AI marketing agency"}
{insight_brief or extra_context or ""}

Respond ONLY with JSON:
{{
  "content_pillars": [
    {{"name": "pillar name", "why": "why this pillar works"}}
  ],
  "editorial_calendar": [
    {{
      "title": "piece title",
      "pillar": "pillar name",
      "platform": "linkedin|instagram|tiktok|blog",
      "format": "post|video|article",
      "hook_direction": "what the hook should be about",
      "cta": "the call to action",
      "timing": "e.g. this week"
    }}
  ],
  "creative_briefs": {{
    "copywriter": "one clear directive for the Copywriter",
    "creative_director": "one clear directive for the Creative Director"
  }}
}}
""",
            temperature=0.5,
        )
        try:
            pillars = result.get("content_pillars") or []
            if pillars:
                names = ", ".join(p.get("name", "") for p in pillars[:3])
                store_brand_memory(
                    category="content_strategy",
                    title=f"Pillars: {names[:100]}",
                    content=(
                        f"Calendar of {len(result.get('editorial_calendar') or [])} pieces. "
                        f"Copy: {(result.get('creative_briefs') or {}).get('copywriter', '')[:200]}"
                    ),
                    source="content_strategist",
                )
        except Exception:  # noqa: BLE001  (memory must never break the agent)
            pass
        return result


__all__ = ["ContentStrategistAgent"]