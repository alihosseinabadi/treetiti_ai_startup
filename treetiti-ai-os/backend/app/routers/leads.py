"""Lead routes: list / qualify leads (Sales Agent) + webhook for n8n."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_role
from app.agents import get_agent
from app.database import get_db
from app.models import Lead, User
from app.webhook_security import check_lead_request, webhook_rate_limit

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str = ""
    email: str
    company: str = ""
    message: str = ""
    phone: str = ""
    # Honeypot: real forms never fill this; bots do. Non-empty → rejected.
    website: str = ""


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
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("")
def create_lead(
    payload: LeadCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[str, Depends(webhook_rate_limit("leads", 10))],
) -> dict:
    """Public lead form — n8n/posts form leads here.

    Guarded by rate limit + honeypot + origin check (amendment 4), NOT by
    HMAC: this is a public form, not a machine integration.
    """
    check_lead_request(request, payload.website)
    lead = _save_lead(db, payload, qualify=True)
    return _serialize(lead)


@router.get("")
def list_leads(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
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
    user: Annotated[User, Depends(require_role("admin", "editor"))],
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
