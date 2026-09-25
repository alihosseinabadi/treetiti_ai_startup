"""Treetiti AI Marketing OS — Analytics Agent.

Reads stored research + performance data, keeps the signal, and produces
actionable intelligence for the Content Creation Agent and the owner.

Two duties:
- `analyze_research()` — turns the latest Market Research opportunity into a
  strategic insight brief the content agent builds on.
- `run()` — daily marketing report from raw numbers.
"""

from __future__ import annotations

import json
from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.models import ResearchOpportunity


def _as_dict(value: Any) -> dict[str, Any]:
    """Coerce a JSON column value (dict or JSON-encoded string) to a dict."""
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


class AnalyticsAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"  # verified free, reliable JSON/math
    name = "Analytics Agent"
    role = "data-driven marketing analyst"
    system_prompt = """\
You turn raw marketing data and research into clear, actionable insights for
Treetiti. You never invent data. You only interpret what is given, find what
is working and what is not, and recommend the next action."""

    def analyze_research(self, opportunity: dict[str, Any] | None = None) -> dict[str, Any]:
        """Take the latest research opportunity and produce an insight brief.

        Returns an "insight_brief" dict that the Content Agent consumes. It is
        also persisted as the research record's extra.insight so it is never lost.
        """
        with SessionLocal() as db:
            if opportunity is None:
                row = (
                    db.query(ResearchOpportunity)
                    .order_by(ResearchOpportunity.created_at.desc())
                    .first()
                )
                if row is None:
                    return {
                        "opportunity": None,
                        "insight": "No research yet — run Market Research first.",
                    }
                opportunity = {
                    "trend": row.trend,
                    "business_problem": row.business_problem,
                    "content_opportunity": row.content_opportunity,
                    "target_customer": row.target_customer,
                    "extra": _as_dict(row.extra),
                }

        brief = self.complete_json(
            f"""Analyze this research opportunity for Treetiti and turn it into a
strategic insight brief that a content creator can build on.

RESEARCH OPPORTUNITY:
{json.dumps(opportunity, ensure_ascii=False, indent=2)}

Respond ONLY with JSON:
{{
  "opportunity": "the core opportunity in one sentence",
  "why_it_matters_now": "why this is relevant to B2B decision-makers right now",
  "key_stat_or_angle": "the single strongest data point or angle to anchor content",
  "target_audience": "who exactly to write for",
  "recommended_angle": "the content angle Treetiti should take",
  "success_metric": "what to measure to know it worked"
}}
""",
            temperature=0.3,
        )
        # Keep the data: persist the insight on the latest research record.
        with SessionLocal() as db:
            row = (
                db.query(ResearchOpportunity)
                .order_by(ResearchOpportunity.created_at.desc())
                .first()
            )
            if row is not None:
                extra = _as_dict(row.extra)
                extra["insight"] = brief
                row.extra = extra
                db.commit()
        return {"opportunity": opportunity, "insight": brief}

    def run(self, report_data: dict[str, Any]) -> dict[str, Any]:
        result = self.complete_json(
            f"""Write Treetiti's daily marketing report.

RAW DATA:
{report_data}

Respond ONLY with JSON:
{{
  "summary": "2-3 sentence executive summary",
  "wins": ["what worked today"],
  "concerns": ["what did not work"],
  "recommendations": ["the next 2-3 actions to take"],
  "report_text": "a full, human-readable daily report ready to send to the owner"
}}
""",
            temperature=0.4,
        )
        return result