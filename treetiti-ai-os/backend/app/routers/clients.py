"""Client routes — the per-client workspace hub.

    GET   /api/v1/clients             aggregate clients across the OS
    GET   /api/v1/clients/{name}      one client + its missions + deliverable count

A client is whatever name the user gave a mission (or a Directory profile). The
hub joins mission autonomy, directory dossiers, leads and approvals into a single
per-client status card so the office can run the whole company from one view.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_role
from app.database import SessionLocal
from app.missions import mission_dict
from app.models import Approval, ClientProfile, Lead, Mission, MissionRun, User

router = APIRouter(prefix="/clients", tags=["clients"])


def _missions_for(db, name: str) -> list[dict]:
    rows = db.query(Mission).filter(Mission.client == name).order_by(Mission.updated_at.desc()).all()
    return [mission_dict(m) for m in rows]


def _directory_for(db, name: str) -> dict[str, Any] | None:
    row = db.query(ClientProfile).filter(ClientProfile.name == name).order_by(ClientProfile.updated_at.desc()).first()
    if row is None:
        return None
    return {
        "id": row.id,
        "status": row.status,
        "business_line": row.business_line,
        "main_goal": row.main_goal,
        "profile": row.profile,
        "dossier": row.dossier,
        "error": row.error,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _client_card(db, name: str) -> dict[str, Any]:
    missions = _missions_for(db, name)
    latest: MissionRun | None = None
    for m in db.query(Mission).filter(Mission.client == name):
        run = (
            db.query(MissionRun)
            .filter(MissionRun.mission_id == m.id)
            .order_by(MissionRun.started_at.desc())
            .first()
        )
        if run is not None and (latest is None or run.started_at > latest.started_at):
            latest = run

    revealed: set[str] = set()
    content_count = 0
    for m in missions:
        ws = m.get("workspace") or {}
        revealed.update(ws.get("revealed") or [])
        for key in ("content", "posts", "carousel", "reel", "article"):
            content_count += len(ws.get(key) or [])

    lead = db.query(Lead).filter(Lead.company == name).order_by(Lead.created_at.desc()).first()
    pending_approvals = (
        db.query(Approval)
        .filter(Approval.status == "pending")
        .count()
    )

    return {
        "name": name,
        "missions": missions,
        "mission_count": len(missions),
        "active_missions": sum(1 for m in missions if m.get("status") == "active"),
        "paused_missions": sum(1 for m in missions if m.get("status") == "paused"),
        "directory": _directory_for(db, name),
        "lead": {
            "id": lead.id,
            "status": lead.status,
            "score": lead.score,
            "customer_type": lead.customer_type,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        }
        if lead is not None
        else None,
        "pending_approvals": pending_approvals,
        "workspace_revealed": sorted(revealed),
        "content_count": content_count,
        "last_cycle": latest.cycle_type if latest is not None else None,
        "last_cycle_status": latest.status if latest is not None else None,
        "last_run_at": latest.started_at.isoformat() if latest is not None else None,
    }


@router.get("")
def list_clients(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        names: set[str] = set()
        for m in db.query(Mission.client).distinct():
            if m[0]:
                names.add(m[0])
        for c in db.query(ClientProfile.name).distinct():
            if c[0]:
                names.add(c[0])
        cards = [c for c in (_client_card(db, n) for n in names) if c is not None]
        cards.sort(key=lambda c: c.get("last_run_at") or "", reverse=True)
        return cards


@router.get("/{client_name}")
def get_client(
    client_name: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> dict[str, Any]:
    with SessionLocal() as db:
        card = _client_card(db, client_name)
        if card["mission_count"] == 0 and card["directory"] is None:
            raise HTTPException(status_code=404, detail="client not found")
        return card


__all__ = ["router"]