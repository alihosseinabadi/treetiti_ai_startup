"""TREEtiti AI Marketing OS — deep research routes (Phase 4).

    GET    /api/v1/research?context=<client>   list reports (client-scoped)
    POST   /api/v1/research                     run a deep research task
    GET    /api/v1/research/{id}                one full report
    DELETE /api/v1/research/{id}                remove a report
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ResearchReport, User
from app.research import run_deep_research

router = APIRouter(prefix="/research", tags=["research"])


def _client_of(context: str) -> str:
    if context.startswith("customer:"):
        return context[len("customer:") :].strip()
    return context.strip()


class ResearchCreate(BaseModel):
    topic: str = Field(..., min_length=2)
    context: str = ""
    depth: str = "deep"


def _run_research(topic: str, client: str, depth: str) -> dict:
    """Injection seam: tests monkeypatch this to avoid network/LLM."""
    return run_deep_research(topic, client=client, depth=depth)


def _report_dict(r: ResearchReport) -> dict:
    return {
        "id": r.id,
        "client": r.client,
        "topic": r.topic,
        "depth": r.depth,
        "status": r.status,
        "summary": r.summary,
        "findings": r.findings,
        "insights": r.insights,
        "recommendations": r.recommendations,
        "sources": r.sources,
        "report_md": r.report_md,
        "meta": r.meta,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
def list_reports(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    context: str = "",
) -> dict:
    client = _client_of(context)
    rows = db.query(ResearchReport).order_by(ResearchReport.created_at.desc()).all()
    if client:
        rows = [r for r in rows if r.client == client]
    return {"reports": [_report_dict(r) for r in rows], "context": client}


@router.post("")
def create_report(
    body: ResearchCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    client = _client_of(body.context)
    try:
        result = _run_research(body.topic, client, body.depth)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"research failed: {exc}") from exc
    report = ResearchReport(
        client=client,
        topic=result.get("topic", body.topic),
        depth=result.get("depth", body.depth),
        status="completed",
        summary=result.get("summary", ""),
        findings=result.get("findings", []),
        insights=result.get("insights", []),
        recommendations=result.get("recommendations", []),
        sources=result.get("sources", []),
        report_md=result.get("report_md", ""),
        meta={
            "synthesis": result.get("synthesis", "template"),
            "page_count": result.get("page_count", 0),
            "took_ms": result.get("took_ms", 0),
        },
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _report_dict(report)


@router.get("/{report_id}")
def get_report(
    report_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    report = db.get(ResearchReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="report not found")
    return _report_dict(report)


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    report = db.get(ResearchReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="report not found")
    db.delete(report)
    db.commit()
    return {"deleted": report_id}