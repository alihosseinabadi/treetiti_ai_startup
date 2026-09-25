"""Treetiti AI Marketing OS — daily report service.

Called by the n8n "Daily Report" workflow (or manually). Gathers today's data
and lets the Analytics Agent write the report.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from app.agents import get_agent
from app.database import SessionLocal
from app.models import AnalyticsSnapshot, ContentItem, Lead, ResearchOpportunity


def build_daily_report() -> dict[str, Any]:
    today = date.today().isoformat()

    with SessionLocal() as db:
        content_count = db.query(ContentItem).count()
        pending = (
            db.query(ContentItem).filter(ContentItem.status == "pending_approval").count()
        )
        published = (
            db.query(ContentItem).filter(ContentItem.status == "published").count()
        )
        lead_count = db.query(Lead).count()
        qualified_leads = (
            db.query(Lead).filter(Lead.score >= 70).count()
        )
        opportunities = [
            {"trend": o.trend, "content_opportunity": o.content_opportunity}
            for o in db.query(ResearchOpportunity).order_by(
                ResearchOpportunity.created_at.desc()
            ).limit(3).all()
        ]

    report_data = {
        "date": today,
        "content": {
            "total": content_count,
            "pending_approval": pending,
            "published": published,
        },
        "leads": {"total": lead_count, "qualified": qualified_leads},
        "top_opportunities": opportunities,
    }

    analytics = get_agent("analytics")
    result = analytics.run(report_data)

    with SessionLocal() as db:
        db.add(AnalyticsSnapshot(date=today, report=result))
        db.commit()

    return {"date": today, **result}
