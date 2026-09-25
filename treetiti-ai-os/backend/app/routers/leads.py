"""Lead routes: list / qualify leads (Sales Agent) + webhook for n8n."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.agents import get_agent
from app.config import get_settings
from app.database import get_db
from app.models import Lead, User

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str = ""
    email: str
    company: str = ""
    message: str = ""
    phone: str = ""


def _serialize(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "company": lead.company,
        "message": lead.message,
        "phone": lead.phone,
        "score": lead.score,
        "customer_type": lead.customer_type,
        "status": lead.status,
        "recommended_package": lead.recommended_package,
        "suggested_reply": lead.suggested_reply,
        "created_at": lead.created_at,
    }


def _save_lead(db: Session, payload: LeadCreate, qualify: bool = True) -> Lead:
    lead = Lead(
        name=payload.name,
        email=payload.email,
        company=payload.company,
        message=payload.message,
        phone=payload.phone,
        status="new",
    )
    if qualify:
        try:
            sales = get_agent("sales")
            verdict = sales.run(
                {
                    "name": payload.name,
                    "email": payload.email,
                    "company": payload.company,
                    "message": payload.message,
                }
            )
            lead.score = int(verdict.get("score", 50))
            lead.customer_type = verdict.get("customer_type", "smb")
            lead.recommended_package = verdict.get("recommended_package", "")
            lead.suggested_reply = verdict.get("suggested_reply", "")
        except Exception:  # noqa: BLE001 — offline: keep lead, score later
            lead.score = 50
            lead.suggested_reply = "(offline: AI scoring unavailable, qualify manually)"
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("")
def create_lead(payload: LeadCreate, db: Annotated[Session, Depends(get_db)]) -> dict:
    """Open endpoint — n8n posts form leads here."""
    lead = _save_lead(db, payload, qualify=True)
    return _serialize(lead)


@router.get("")
def list_leads(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
    limit: int = 50,
) -> list[dict]:
    query = db.query(Lead)
    if status:
        query = query.filter(Lead.status == status)
    items = query.order_by(Lead.created_at.desc()).limit(limit).all()
    return [_serialize(i) for i in items]


@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: str,
    status: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if status not in ["new", "contacted", "qualified", "won", "lost"]:
        raise HTTPException(status_code=400, detail="invalid status")
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = status
    db.commit()
    return _serialize(lead)
