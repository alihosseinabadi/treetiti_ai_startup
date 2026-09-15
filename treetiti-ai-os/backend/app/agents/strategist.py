"""TREEtiti AI Marketing OS — Business Strategist (Phase 2).

Turns a goal into a positioning strategy and campaign concept: who to target,
what to say, why now, and how it maps to TREEtiti's real services. Feeds the
Content Strategist and Creative Director downstream.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.prompts.strategist import SYSTEM_PROMPT
from app.memory.store import store_brand_memory


class BusinessStrategistAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Business Strategist"
    role = "market strategy and positioning lead"
    agent_key = "strategist"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        extra_context: str = "",
        insight_brief: str = "",
    ) -> dict[str, Any]:
        """Produce a positioning strategy + campaign concept from a goal."""
        result = self.complete_json(
            f"""TASK: turn this goal into a TREEtiti positioning strategy + campaign concept.

GOAL / BRIEF: {brief or "raise awareness of TREEtiti's AI marketing services"}

RESEARCH INTEL (from the research agents, if provided):
{insight_brief or extra_context or "(none provided)"}

Respond ONLY with JSON:
{{
  "objective": "the business outcome",
  "target_audience": "exact segment and their pain",
  "thesis": "the single insight this campaign stands on",
  "positioning": "how TREEtiti wins (one sentence)",
  "campaign_concept": {{
    "title": "campaign name",
    "idea": "the memorable idea",
    "channels": ["linkedin", "instagram", "tiktok", "blog"],
    "key_message": "the core message used everywhere"
  }}
}}
""",
            temperature=0.6,
        )
        try:
            store_brand_memory(
                category="strategy",
                title=(result.get("campaign_concept") or {}).get("title", "strategy")[:100],
                content=(
                    f"Thesis: {result.get('thesis', '')} | Positioning: {result.get('positioning', '')}"
                ),
                source="strategist",
            )
        except Exception:  # noqa: BLE001  (memory must never break the agent)
            pass
        return result


__all__ = ["BusinessStrategistAgent"]