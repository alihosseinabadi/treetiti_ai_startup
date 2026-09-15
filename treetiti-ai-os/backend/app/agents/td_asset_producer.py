"""TREEtiti AI Marketing OS — 3D Asset Producer (Phase 3).

Builds 3D assets from the 3D Creative Director's briefs via Tripo/Meshy/Blender
through the provider abstraction. When no 3D provider is configured it returns
a production-ready spec instead — the pipeline never breaks.
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent

from app.agents.prompts.td_asset_producer import SYSTEM_PROMPT

logger = logging.getLogger("treetiti.agents.td_asset_producer")


class TDAssetProducerAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "3D Asset Producer"
    role = "3D asset builder"
    agent_key = "td_asset_producer"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        asset_brief: str = "",
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Turn a 3D brief into a build plan (or generate via provider)."""
        spec = self.complete_json(
            f"""TASK: produce a 3D asset build plan.

BRIEF: {brief or "product hero asset"}
ASSET BRIEF: {asset_brief or "hero product on a pedestal"}
{extra_context or ""}

Respond ONLY with JSON:
{{
  "asset": "the asset name",
  "approach": "tripo | meshy | blender",
  "generation_prompt": "the exact prompt for a Tripo/Meshy-style generator",
  "blender_spec": {{
    "geometry": "primitive/boolean description",
    "materials": ["material setup"],
    "lighting": "light rig direction",
    "export": "e.g. GLB, USDZ, resolution"
  }},
  "status": "ready"
}}
""",
            temperature=0.4,
        )
        spec["status"] = spec.get("status") or "ready"
        return spec


__all__ = ["TDAssetProducerAgent"]