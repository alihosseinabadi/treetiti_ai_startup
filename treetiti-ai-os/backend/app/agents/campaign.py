"""TREEtiti AI Marketing OS — Campaign Intelligence Agent.

The strategic brain of the team. Deeply understands TREEtiti's real services
and the full business model, and turns goals into full multi-platform branding
campaigns (strategy -> message house -> content plan).

Business services it is trained on and must always remember:
- UGC branding & marketing (user-generated content campaigns)
- Cinematic / professional shots system (photo & video production style)
- AI Marketing AI (AI-powered campaigns, funnels, automation)
- Intelligent Data Science & Data Analytics (lead scoring, attribution, dashboards)
- AI Websites & Apps (AI-powered web and app builds)
- Full branding & campaign management (strategy to launch to reporting)

Usage:
    agent = CampaignIntelligenceAgent()
    campaign = agent.plan_campaign("UGC campaign to launch our cinematic service")
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent
from app.agents.prompts.campaign import BUSINESS_SERVICES, CAMPAIGN_FRAMEWORK, SYSTEM_PROMPT
from app.database import SessionLocal
from app.memory.store import search_memory, store_brand_memory
from app.models import BrandContentCampaign

logger = logging.getLogger("treetiti.agents.campaign")


class CampaignIntelligenceAgent(BaseAgent):
    model = "zai/glm-4.7-flash"  # strongest verified free reasoning for strategy
    name = "Campaign Intelligence Agent"
    role = "chief marketing strategist"
    system_prompt = SYSTEM_PROMPT

    def plan_campaign(
        self,
        objective: str,
        target_audience: str = "",
        extra_context: str = "",
        campaigns: int = 1,
    ) -> dict[str, Any]:
        """Plan one or more full branding campaigns and persist them.

        Returns a dict with title, objective, strategy, message_house,
        content_plan. Also stores a branded memory of the campaign so all
        agents stay aligned with it.
        """
        memory = search_memory(objective, limit=5)
        memory_block = (
            "\n".join(f"- [{m['kind']}] {m['title']}: {m['content'][:300]}" for m in memory)
            or "No stored memory matches yet."
        )

        result = self.complete_json(
            f"""Design a full branding campaign for TREEtiti.

OBJECTIVE: {objective}
TARGET AUDIENCE: {target_audience or "B2B decision-makers (founders, CMOs, brand managers)"}
EXTRA CONTEXT: {extra_context or "none"}

TEAM MEMORY (relevant past talks, goals, preferences):
{memory_block}

SERVICES (the campaign must clearly promote at least one):
{BUSINESS_SERVICES}

Respond ONLY with JSON:
{{
  "title": "campaign name",
  "objective": "restated business outcome",
  "strategy": "the campaign thesis: audience, message, channels, why now",
  "message_house": [
    {{
      "platform": "linkedin | instagram | tiktok | blog",
      "angle": "what this platform says",
      "cta": "the call to action for this platform"
    }}
  ],
  "content_plan": [
    {{
      "platform": "linkedin | instagram | tiktok | blog",
      "format": "post | reel | carousel | article | ugc_showcase | cinematic_film",
      "title": "working title",
      "hook": "the opening line",
      "visual_direction": "how it looks (cinematic / UGC / minimal)",
      "cta": "what the viewer should do"
    }}
  ],
  "success_metrics": ["how to measure this campaign"]
}}
""",
            temperature=0.6,
        )

        with SessionLocal() as db:
            row = BrandContentCampaign(
                title=result.get("title", "Untitled campaign"),
                objective=result.get("objective", objective),
                target_audience=target_audience or result.get("target_audience", ""),
                strategy=result.get("strategy", ""),
                message_house=result.get("message_house", []),
                status="planning",
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            result["id"] = row.id

        # Make the campaign part of the shared brain so every agent aligns.
        try:
            store_brand_memory(
                "campaigns",
                result.get("title", "Campaign"),
                (
                    f"Campaign '{result.get('title')}': {result.get('strategy', '')} | "
                    f"message house: {len(result.get('message_house', []))} platforms | "
                    f"objective: {result.get('objective', '')}"
                ),
                source="campaign_agent",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("campaign memory store failed: %s", exc)

        return result

    def run(self, *args: Any, **kwargs: Any) -> Any:
        return self.plan_campaign(*args, **kwargs)


__all__ = ["CampaignIntelligenceAgent", "BUSINESS_SERVICES", "CAMPAIGN_FRAMEWORK"]
