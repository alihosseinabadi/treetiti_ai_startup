"""Customer Service Directory API.

  POST /directory/onboard   {link, questions...}  -> creates client + starts the run
  GET  /directory/{id}                            -> the full client dossier
  GET  /directory                                 -> list clients

The Directory turns one link + a few answers into a complete multi-agent
deliverable set (content, visual, video, sales, campaign, SEO), QA-gated by the
Editor.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.services import directory

router = APIRouter(prefix="/directory", tags=["directory"])


class OnboardRequest(BaseModel):
    link: str
    name: str = ""
    business_line: str = ""   # Q1: what is your business in one line?
    dream_customer: str = ""  # Q2: who is your dream customer?
    main_goal: str = ""       # Q3: what is the #1 goal right now?
    competitors: str = ""     # Q4: main competitors
    desired_tone: str = ""    # Q5: tone (luxury, bold, friendly...)


def _to_dict(client: "directory.ClientProfile") -> dict[str, Any]:
    return {
        "id": client.id,
        "name": client.name,
        "link": client.link,
        "status": client.status,
        "business_line": client.business_line,
        "dream_customer": client.dream_customer,
        "main_goal": client.main_goal,
        "competitors": client.competitors,
        "desired_tone": client.desired_tone,
        "profile": client.profile,
        "dossier": client.dossier,
        "error": client.error,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "updated_at": client.updated_at.isoformat() if client.updated_at else None,
    }


@router.post("/onboard")
def onboard(
    payload: OnboardRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    if not payload.link.strip():
        raise HTTPException(status_code=400, detail="link is required")
    client = directory.onboard_client(
        link=payload.link.strip(),
        name=payload.name,
        business_line=payload.business_line,
        dream_customer=payload.dream_customer,
        main_goal=payload.main_goal,
        competitors=payload.competitors,
        desired_tone=payload.desired_tone,
    )
    # Run synchronously for now; the response carries the final dossier.
    client = directory.run_directory(client.id)
    return _to_dict(client)


@router.get("/{client_id}")
def get(
    client_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    client = directory.get_directory(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return _to_dict(client)


@router.get("")
def list_all(
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict[str, Any]]:
    return [_to_dict(c) for c in directory.list_directories()]