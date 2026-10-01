"""TREEtiti AI Marketing OS — executable template routes (Phase 3).

    GET    /api/v1/templates                     catalog (+ installed counts)
    POST   /api/v1/templates/{id}/install        really install: mission + schedules + project
    POST   /api/v1/templates/{id}/uninstall      archive everything a template created for a client
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import SessionLocal, get_db
from app.models import User
from app.templates import get_template, install_template, list_catalog, uninstall_template

router = APIRouter(prefix="/templates", tags=["templates"])


class ClientBody(BaseModel):
    client: str = ""


@router.get("")
def catalog(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
    context: str = "",
) -> dict:
    client = context[len("customer:") :] if context.startswith("customer:") else context.strip()
    return {"templates": list_catalog(db, client), "context": client}


@router.post("/{template_id}/install")
def install(
    template_id: str,
    body: ClientBody,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        get_template(template_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"unknown template {template_id!r}") from None
    try:
        return install_template(template_id, body.client.strip(), db)
    except Exception as exc:  # noqa: BLE001 — surface a clean 400 for install failures
        raise HTTPException(status_code=400, detail=f"install failed: {exc}") from exc


@router.post("/{template_id}/uninstall")
def uninstall(
    template_id: str,
    body: ClientBody,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        get_template(template_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"unknown template {template_id!r}") from None
    return uninstall_template(template_id, body.client.strip(), db)