"""Treetiti AI Marketing OS — research-to-content pipeline.

The full automated flow:

  ideas + sources (owner)
        |
        v
  [1] Market Research  -> real web search, stores ResearchOpportunity
        |
        v
  [2] Analytics        -> analyze_research() keeps the data + writes insight brief
        |
        v
  [3] Brand gate       -> gate_idea() pre-flight checks the angle BEFORE writing
        |
        v
  [4] Content Creation -> writes content from the brand-approved analyst brief
        |
        v
      Brand check (per piece, unchanged)

Everything is free: search (DuckDuckGo keyless) + the verified free models.
Each stage is optional-safe — if research yields nothing, content still works.
"""

from __future__ import annotations

import json
from typing import Any

from app.agents import get_agent


def run_research_pipeline(
    ideas: list[str] | None = None,
    sources: list[str] | None = None,
    platform: str = "linkedin",
    count: int = 1,
    approve: bool = True,
    extra_context: str = "",
) -> dict[str, Any]:
    """Run the 4-stage pipeline and return a stage-by-stage report."""
    research = get_agent("market_research")
    analytics = get_agent("analytics")
    brand = get_agent("brand")
    content = get_agent("content")

    # 1. Research — search the web using owner ideas + sources.
    opportunity = research.run(
        ideas=ideas or [],
        sources=sources or [],
        extra_context=extra_context,
    )

    # 2. Analytics — keep the data, write the insight brief.
    brief = analytics.analyze_research(opportunity)
    insight = brief.get("insight") or {}

    # 3. Brand gate — pre-flight the angle BEFORE writing anything.
    gate = brand.gate_idea(
        trend=opportunity.get("trend", ""),
        content_opportunity=opportunity.get("content_opportunity", ""),
        target_customer=opportunity.get("target_customer", ""),
    )
    if gate.get("approved") and gate.get("refined_angle"):
        # Feed the refined on-brand angle into the content brief.
        if isinstance(insight, dict):
            insight["recommended_angle"] = gate["refined_angle"]
            insight["brand_gate"] = {
                "score": gate.get("score"),
                "reason": gate.get("reason"),
            }
            brief["insight"] = insight

    # 4. Content — create from the brand-approved analyst brief.
    items = content.run(
        opportunity=opportunity,
        platform=platform,
        count=count,
        approve=approve,
        insight_brief=brief,
    )

    return {
        "research": {
            "trend": opportunity.get("trend", ""),
            "content_opportunity": opportunity.get("content_opportunity", ""),
            "target_customer": opportunity.get("target_customer", ""),
            "sources_checked": opportunity.get("sources_checked", []),
        },
        "analytics": {
            "opportunity": insight.get("opportunity", "") if isinstance(insight, dict) else insight,
            "recommended_angle": insight.get("recommended_angle", "") if isinstance(insight, dict) else "",
            "success_metric": insight.get("success_metric", "") if isinstance(insight, dict) else "",
        },
        "brand_gate": {
            "approved": bool(gate.get("approved")),
            "score": gate.get("score"),
            "reason": gate.get("reason", ""),
            "refined_angle": gate.get("refined_angle", ""),
        },
        "content": {
            "count": len(items),
            "titles": [i.get("title", "") for i in items],
            "status": items[0].get("status", "") if items else "",
        },
    }