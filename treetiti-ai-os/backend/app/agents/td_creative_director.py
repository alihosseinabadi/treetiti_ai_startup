"""TREEtiti AI Marketing OS — 3D Creative Director (Phase 3).

Owns 3D look direction: visual concepts, material/lighting language and
concrete asset briefs that the 3D Asset Producer executes (Tripo/Meshy/Blender).
Grounded in the Creative Director's overall visual identity.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent

from app.agents.prompts.td_creative_director import SYSTEM_PROMPT


class TD3DCreativeDirectorAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "3D Creative Director"
    role = "3D art direction lead"
    agent_key = "td_creative_director"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        extra_context: str = "",
        insight_brief: str = "",
    ) -> dict[str, Any]:
        """Produce a 3D art-direction concept + asset briefs."""
        result = self.complete_json(
            f"""TASK: define 3D look direction for this campaign.

BRIEF: {brief or "premium 3D product showcase for TREEtiti"}
{insight_brief or extra_context or ""}

Respond ONLY with JSON:
{{
  "concept": "the 3D visual concept in 2-3 sentences",
  "geometry_style": "e.g. sleek, soft, faceted, organic",
  "materials": ["material language for key objects"],
  "lighting": "the lighting mood",
  "color_palette": ["hex colors that dominate"],
  "asset_briefs": [
    {{
      "asset": "what object to build",
      "detail": "geometry/material/scale direction",
      "purpose": "where it is used in the campaign"
    }}
  ]
}}
""",
            temperature=0.6,
        )
        return result


__all__ = ["TD3DCreativeDirectorAgent"]