"""TREEtiti AI Marketing OS — Growth Optimizer (Phase 4).

Learning-loop agent: analyzes past campaign/analytics signals and produces a
concrete optimization plan (what to keep, stop, scale) that feeds the next
strategy cycle. Grounded in analytics memory so it never optimizes blindly.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent

from app.agents.prompts.growth_optimizer import SYSTEM_PROMPT


class GrowthOptimizerAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Growth Optimizer"
    role = "learning loop: analyze → optimize → re-run"
    agent_key = "growth_optimizer"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        campaign_data: str = "",
        analytics_report: str = "",
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Analyze past results and return a learning/optimization plan."""
        result = self.complete_json(
            f"""TASK: produce a growth optimization plan from past results.

BRIEF: {brief or "improve the next campaign cycle"}
CAMPAIGN DATA: {campaign_data or "(no campaign data provided)"}
ANALYTICS: {analytics_report or extra_context or "(no analytics provided)"}

Respond ONLY with JSON:
{{
  "learnings": [
    {{"finding": "what the data shows", "confidence": "high|medium|low"}}
  ],
  "keep": ["tactics to keep running"],
  "stop": ["tactics to stop or fix"],
  "scale": ["tactics to scale with more budget"],
  "experiments": [
    {{"hypothesis": "what to test next", "metric": "the success metric", "variants": ["A", "B"]}}
  ],
  "next_cycle": "the recommended next campaign brief in 1-2 sentences"
}}
""",
            temperature=0.5,
        )
        result["learnings"] = result.get("learnings") or []
        result["experiments"] = result.get("experiments") or []
        return result


__all__ = ["GrowthOptimizerAgent"]