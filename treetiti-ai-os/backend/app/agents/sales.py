"""Treetiti AI Marketing OS — Sales Agent.

Analyzes leads, scores them 0-100, selects a recommended package and drafts a
personalized reply. Works with the lead data captured by n8n.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent

PACKAGES = [
    "UGC Marketing Package",
    "AI Sales Assistant",
    "Business Automation System",
    "AI Website + CRM Automation",
]


class SalesAgent(BaseAgent):
    model = "zai/glm-4.5-flash"  # verified free, fast for hourly follow-up
    name = "Sales Agent"
    role = "senior B2B sales representative"
    system_prompt = """\
You are Treetiti's senior sales representative for B2B buyers.
You qualify leads, score them, recommend the right package, and write replies
that sound like a real senior professional — confident, specific, no hype."""

    def run(self, lead: dict[str, Any]) -> dict[str, Any]:
        result = self.complete_json(
            f"""Qualify this lead for Treetiti, a premium AI agency.

LEAD:
{lead}

Score the lead 0-100 on fit for Treetiti's services (AI agents, business
automation, AI websites, CRM automation, AI marketing).

Respond ONLY with JSON:
{{
  "score": 0-100,
  "customer_type": "startup | smb | enterprise",
  "status": "new",
  "recommended_package": "one of: {", ".join(PACKAGES)}",
  "suggested_reply": "a short personalized reply to send to this lead"
}}
""",
            temperature=0.3,
        )
        # Normalize status so it can be saved directly.
        result.setdefault("status", "new")
        if "customer_type" not in result:
            result["customer_type"] = "smb"
        return result
