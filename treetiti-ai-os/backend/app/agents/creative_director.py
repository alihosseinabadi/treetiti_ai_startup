"""TREEtiti AI Marketing OS — Creative Director (Phase 2).

Owns visual identity and art direction: the brand look, the visual system for
a campaign, and concrete art-direction briefs for the Image/Video producers.
Grounded in the strategy and content briefs downstream.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.prompts.creative_director import SYSTEM_PROMPT
from app.memory.store import store_brand_memory


class CreativeDirectorAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Creative Director"
    role = "creative director and head of visual identity"
    agent_key = "creative_director"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        extra_context: str = "",
        insight_brief: str = "",
    ) -> dict[str, Any]:
        """Produce a visual/art-direction system for a campaign."""
        result = self.complete_json(
            f"""TASK: define the visual identity and art direction for this campaign.

CAMPAIGN / BRIEF: {brief or "premium AI marketing campaign"}
{insight_brief or extra_context or ""}

Respond ONLY with JSON:
{{
  "mood": "the feeling of the campaign in 3-5 words",
  "palette": {{
    "primary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "rationale": "why these colors"
  }},
  "typography": {{
    "display": "display font personality",
    "body": "body font personality"
  }},
  "cinematic_language": {{
    "lighting": "how light is used",
    "depth": "depth and layering",
    "motion": "how motion feels (e.g. slow, precise)"
  }},
  "composition_rules": ["rules that keep the work on-brand"],
  "image_directive": "one concrete directive for the Image Producer",
  "video_directive": "one concrete directive for the Video Director"
}}
""",
            temperature=0.6,
        )
        try:
            store_brand_memory(
                category="visual_identity",
                title=f"Mood: {result.get('mood', '')[:100]}",
                content=(
                    f"Palette: {result.get('palette', {}).get('primary', '')} | "
                    f"Image: {result.get('image_directive', '')[:200]}"
                ),
                source="creative_director",
            )
        except Exception:  # noqa: BLE001  (memory must never break the agent)
            pass
        return result


__all__ = ["CreativeDirectorAgent"]