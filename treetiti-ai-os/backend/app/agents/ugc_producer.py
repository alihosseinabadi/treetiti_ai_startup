"""TREEtiti AI Marketing OS — UGC / Influencer Producer (Phase 3).

Produces UGC-style content: the raw, creator-feel assets (image + video +
voiceover direction) that fuel influencer-style campaigns. Returns asset
specs ready for the Image/Video producers to render.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent

from app.agents.prompts.ugc_producer import SYSTEM_PROMPT


class UGCProducerAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "UGC / Influencer Producer"
    role = "UGC-style content producer"
    agent_key = "ugc_producer"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        extra_context: str = "",
        insight_brief: str = "",
    ) -> dict[str, Any]:
        """Produce a UGC content pack (image/video/voice specs)."""
        result = self.complete_json(
            f"""TASK: produce a UGC-style content pack for this brief.

BRIEF: {brief or "authentic creator-style launch of TREEtiti's cinematic service"}
{insight_brief or extra_context or ""}

Respond ONLY with JSON:
{{
  "ugc_angle": "the authentic story angle (real-person framing)",
  "images": [
    {{
      "scene": "what the frame shows (phone-shot energy, real setting)",
      "prompt": "image generation prompt with natural/authentic look"
    }}
  ],
  "videos": [
    {{
      "scene": "what happens on camera",
      "voiceover": "casual spoken script line",
      "prompt": "video generation prompt, handheld/casual feel"
    }}
  ],
  "voice_direction": "the vocal style (warm, conversational, unpolished)",
  "asset_status": "ready"
}}
""",
            temperature=0.7,
        )
        result["asset_status"] = result.get("asset_status") or "ready"
        return result


__all__ = ["UGCProducerAgent"]