"""Project routes: saved projects with scoped chats + memories (ChatGPT-style).

POST   /projects            {name, description?} -> project
GET    /projects            -> all projects (with counts)
GET    /projects/{id}       -> project + recent sessions + memory count
PATCH  /projects/{id}       {name?, description?}
DELETE /projects/{id}       (memories/sessions keep project_id for history)
GET    /projects/{id}/memories?q=&limit=   -> project-scoped RAG memories
POST   /projects/{id}/memories {content, kind?, title?} -> save to project
GET    /projects/{id}/sessions -> chat sessions in this project
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.memory.store import search_memory, store_memory
from app.models import ChatSession, MemoryEntry, Project, User

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectMemoryCreate(BaseModel):
    content: str
    kind: str = "fact"
    title: str = ""


def _serialize(p: Project, db: Session) -> dict:
    mem_n = db.query(MemoryEntry).filter_by(project_id=p.id).count()
    ses_n = db.query(ChatSession).filter_by(project_id=p.id).count()
    return {"id": p.id, "name": p.name, "description": p.description,
            "memories": mem_n, "sessions": ses_n,
            "created_at": p.created_at.isoformat() if p.created_at else None}


@router.post("")
def create_project(body: ProjectCreate, user: Annotated[User, Depends(get_current_user)],
                   db: Annotated[Session, Depends(get_db)]) -> dict:
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is empty")
    p = Project(name=body.name.strip(), description=body.description or "")
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize(p, db)


@router.get("")
def list_projects(user: Annotated[User, Depends(get_current_user)],
                  db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [_serialize(p, db) for p in rows]


@router.get("/{project_id}")
def get_project(project_id: str, user: Annotated[User, Depends(get_current_user)],
                db: Annotated[Session, Depends(get_db)]) -> dict:
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _serialize(p, db)


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate,
                   user: Annotated[User, Depends(get_current_user)],
                   db: Annotated[Session, Depends(get_db)]) -> dict:
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.name is not None:
        p.name = body.name.strip()
    if body.description is not None:
        p.description = body.description
    db.commit()
    return _serialize(p, db)


@router.delete("/{project_id}")
def delete_project(project_id: str, user: Annotated[User, Depends(get_current_user)],
                   db: Annotated[Session, Depends(get_db)]) -> dict:
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
    return {"deleted": project_id}


@router.get("/{project_id}/memories")
def project_memories(project_id: str, user: Annotated[User, Depends(get_current_user)],
                     q: str = "", limit: int = 20) -> list[dict]:
    return search_memory(q or "project", limit=min(limit, 50), project_id=project_id)


@router.post("/{project_id}/memories")
def project_memory_add(project_id: str, body: ProjectMemoryCreate,
                       user: Annotated[User, Depends(get_current_user)],
                       db: Annotated[Session, Depends(get_db)]) -> dict:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content is empty")
    mid = store_memory(body.content.strip(), kind=body.kind or "fact",
                       title=body.title or body.content.strip()[:80],
                       source="project", project_id=project_id)
    return {"id": mid, "project_id": project_id}


@router.get("/{project_id}/sessions")
def project_sessions(project_id: str, user: Annotated[User, Depends(get_current_user)],
                     db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = (db.query(ChatSession).filter_by(project_id=project_id)
            .order_by(ChatSession.updated_at.desc()).limit(50).all())
    return [{"id": s.id, "title": s.title} for s in rows]
