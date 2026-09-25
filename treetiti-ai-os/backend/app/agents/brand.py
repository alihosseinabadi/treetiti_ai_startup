"""Treetiti AI Marketing OS — Brand Intelligence Agent.

Guards brand consistency. Every generated piece of content passes through here
before it is saved. It compares output against the stored brand memory and
either approves it or returns fix instructions.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.memory.store import search_brand_memory

BRAND_RULES = """\
Treetiti brand rules (non-negotiable):
- Positioning: Treetiti is a premium AI agency building AI agents, business
  automation systems, AI websites, CRM automation and AI marketing systems.
- Style: premium, futuristic, minimal, confident. Apple / Linear / Stripe inspired.
- Audience: professional B2B decision-makers (founders, CTOs, marketing leads).
- Tone: confident but not hypey. No fluff, no emoji spam, no all-caps shouting.
- Language: clear, direct, high-end. Every claim must be believable and specific.
- No generic AI buzzwords without a concrete benefit attached.
"""


class BrandIntelligenceAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"  # verified free, strict JSON verdicts
    name = "Brand Intelligence Agent"
    role = "brand guardian"
    system_prompt = (
        "You ensure every piece of Treetiti content stays on-brand.\n" + BRAND_RULES
    )

    def run(self, content: str, platform: str = "") -> dict[str, Any]:
        """Check content against brand rules. Returns verdict + fixes."""
        memory = search_brand_memory("Treetiti brand voice style positioning", limit=4)
        memory_block = "\n".join(
            f"- {m['title']}: {m['content']}" for m in memory
        ) or "No brand memory stored yet. Use the brand rules above."

        verdict = self.complete_json(
            f"""Evaluate this Treetiti content for brand consistency.

PLATFORM: {platform or "any"}

BRAND MEMORY:
{memory_block}

CONTENT TO REVIEW:
---
{content}
---

Respond ONLY with JSON:
{{
  "approved": true/false,
  "score": 0-100,
  "reason": "short reason",
  "issues": ["issue 1", "issue 2"],
  "fixed_content": "the corrected version if not approved, else empty string"
}}
""",
            temperature=0.1,
        )
        return verdict

    def gate_idea(self, trend: str, content_opportunity: str, target_customer: str) -> dict[str, Any]:
        """Pre-flight check BEFORE content is written.

        Vets whether the research-derived angle is on-brand, specific and
        worth publishing. Returns approved + refined angle.
        """
        memory = search_brand_memory("Treetiti brand voice services positioning", limit=4)
        memory_block = "\n".join(
            f"- {m['title']}: {m['content']}" for m in memory
        ) or "No brand memory stored yet. Use the brand rules above."

        verdict = self.complete_json(
            f"""You are the Brand Intelligence Agent for Treetiti. A Market
Research opportunity is about to be turned into content. Decide whether the
ANGLE is on-brand and worth publishing BEFORE anything is written.

BRAND RULES:
{BRAND_RULES}

BRAND MEMORY:
{memory_block}

TREND: {trend}
PROPOSED ANGLE: {content_opportunity}
TARGET CUSTOMER: {target_customer}

Respond ONLY with JSON:
{{
  "approved": true/false,
  "score": 0-100,
  "reason": "one sentence on brand fit",
  "risks": ["any risk with this angle"],
  "refined_angle": "an improved, on-brand version of the angle if approved, else empty string"
}}
""",
            temperature=0.1,
        )
        return verdict
