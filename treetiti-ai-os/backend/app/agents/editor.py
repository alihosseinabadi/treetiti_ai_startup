"""TREEtiti AI Marketing OS — Editor / QA Agent (final quality gate).

Has VETO power: no deliverable reaches "approved" without editor sign-off.
Scores every piece on the five-criteria rubric and returns structured revision
notes when any criterion falls below threshold.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.prompts.editor import SYSTEM_PROMPT


class EditorAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Editor / QA Agent"
    role = "chief editor and quality-assurance lead"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        content: str = "",
        brand_voice: str = "",
        deliverable_type: str = "post",
        platform: str = "any",
    ) -> dict[str, Any]:
        """Evaluate a deliverable and return an approve/reject verdict."""
        return self.complete_json(
            f"""You are the Chief Editor and QA Lead. Review the deliverable below
against the brand and rubric. You have VETO power.

DELIVERABLE TYPE: {deliverable_type}
PLATFORM: {platform or "any"}

BRAND VOICE REFERENCE:
{brand_voice or "Premium, futuristic, minimal, confident — Apple/Linear/Stripe inspired. No hype, no fluff."}

DELIVERABLE TO REVIEW:
---
{content or "(no content provided)"}
---

Respond ONLY with JSON:
{{
  "status": "approved" | "rejected",
  "scores": {{
    "accuracy": 1-10,
    "voice_consistency": 1-10,
    "clarity": 1-10,
    "engagement": 1-10,
    "seo_readiness": 1-10,
    "overall": 1-10
  }},
  "revision_notes": ["specific notes if rejected"],
  "hallucination_flags": ["anything that looks made-up"],
  "approved_for_client": true/false
}}
""",
            temperature=0.1,
        )

    def gate(self, content: str, agent: str = "") -> dict[str, Any]:
        """Convenience gate for use as a final quality checkpoint."""
        verdict = self.run(content=content, deliverable_type=agent or "content")
        return verdict


__all__ = ["EditorAgent"]