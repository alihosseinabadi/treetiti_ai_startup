"""TREEtiti AI Marketing OS — project routes (plan §L).

    GET    /api/v1/projects              list projects (filter by status)
    POST   /api/v1/projects              create a project
    GET    /api/v1/projects/{id}         fetch one project
    PATCH  /api/v1/projects/{id}         update status / fields
    DELETE /api/v1/projects/{id}         archive a project
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import Project, User
import logging

logger = logging.getLogger("treetiti.projects")

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    client: str = ""
    description: str = ""
    pinned: bool = False


class ProjectUpdate(BaseModel):
    name: str | None = None
    client: str | None = None
    description: str | None = None
    status: str | None = None
    pinned: bool | None = None


@router.get("")
def list_projects(
    user: Annotated[User, Depends(get_current_user)],
    status: str = "",
) -> list[dict]:
    with SessionLocal() as db:
        q = db.query(Project)
        if status:
            q = q.filter(Project.status == status)
        rows = q.order_by(Project.created_at.desc()).all()
        rows.sort(key=lambda p: (not p.pinned, 0))
        return [_project_dict(p) for p in rows]


@router.post("")
def create_project(
    payload: ProjectCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        p = Project(
            name=payload.name,
            client=payload.client,
            description=payload.description,
            pinned=payload.pinned,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return _project_dict(p)


@router.get("/{project_id}")
def get_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if p is None:
            raise HTTPException(status_code=404, detail="project not found")
        return _project_dict(p)


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if p is None:
            raise HTTPException(status_code=404, detail="project not found")
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(p, field, value)
        db.commit()
        db.refresh(p)
        return _project_dict(p)


@router.post("/{project_id}/pin")
def pin_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    pinned: bool = True,
) -> dict:
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if p is None:
            raise HTTPException(status_code=404, detail="project not found")
        p.pinned = pinned
        db.commit()
        db.refresh(p)
        return _project_dict(p)


@router.delete("/{project_id}")
def archive_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if p is None:
            raise HTTPException(status_code=404, detail="project not found")
        p.status = "archived"
        db.commit()
        return {"id": project_id, "status": "archived"}


def _project_dict(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "client": p.client,
        "description": p.description,
        "status": p.status,
        "pinned": p.pinned,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def seed_primary_project() -> None:
    """Ensure TREEtiti's own social-media growth project exists and is pinned.

    The OS's primary mission is growing TREEtiti itself on social channels, so
    the project is pinned to the top of every workspace.
    """
    with SessionLocal() as db:
        existing = db.query(Project).filter(Project.name == "TREEtiti Social Media Growth").first()
        if existing is None:
            db.add(
                Project(
                    name="TREEtiti Social Media Growth",
                    client="TREEtiti",
                    description=(
                        "Primary mission: grow TREEtiti's own brand across "
                        "Instagram, LinkedIn, X and Telegram. Runs the content "
                        "engine, tracks follower/engagement growth, and posts "
                        "on a daily cadence."
                    ),
                    status="active",
                    pinned=True,
                )
            )
            db.commit()
            logger.info("seeded pinned project 'TREEtiti Social Media Growth'")
        elif not existing.pinned:
            existing.pinned = True
            db.commit()