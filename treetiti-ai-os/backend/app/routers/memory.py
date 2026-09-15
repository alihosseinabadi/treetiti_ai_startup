"""Memory API: scoped memory management."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.memory.store import (
    search_global_memory,
    search_client_memory,
    search_team_memory,
    search_teammate_memory,
    search_project_memory,
    search_conversation_memory,
    search_task_memory,
    store_global_memory,
    store_client_memory,
    store_team_memory,
    store_teammate_memory,
    store_project_memory,
    store_conversation_memory,
    store_task_memory,
    store_memory,
    search_memory,
    delete_memory,
    find_memory_to_forget,
)
from app.models import MemoryEntry, User

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryCreate(BaseModel):
    content: str = Field(..., min_length=1)
    kind: str = Field(default="fact", pattern="^(fact|decision|goal|preference|conversation|rule|lesson)$")
    title: str = Field(default="", max_length=255)
    source: str = Field(default="chat")
    tag: str = Field(default="")
    scope: str = Field(default="global", pattern="^(global|client|team|teammate|project|conversation|task)$")
    scope_id: str = Field(default="", max_length=36)


class MemoryResponse(BaseModel):
    id: str
    kind: str
    title: str
    content: str
    source: str
    tag: str
    scope: str
    scope_id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    kind: str | None = Field(default=None, pattern="^(fact|decision|goal|preference|conversation|rule|lesson)$")
    scope: str | None = Field(default=None, pattern="^(global|client|team|teammate|project|conversation|task)$")
    scope_id: str | None = Field(default=None, max_length=36)
    limit: int = Field(default=5, ge=1, le=50)


@router.get("", response_model=list[MemoryResponse])
def list_memories(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    scope: str = Query(default="global", pattern="^(global|client|team|teammate|project|conversation|task)$"),
    scope_id: str = Query(default=""),
    kind: str | None = Query(default=None, pattern="^(fact|decision|goal|preference|conversation|rule|lesson)$"),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[MemoryResponse]:
    q = db.query(MemoryEntry).filter(MemoryEntry.scope == scope)
    if scope_id:
        q = q.filter(MemoryEntry.scope_id == scope_id)
    if kind:
        q = q.filter(MemoryEntry.kind == kind)
    memories = q.order_by(MemoryEntry.created_at.desc()).limit(limit).all()
    return [
        MemoryResponse(
            id=m.id,
            kind=m.kind,
            title=m.title,
            content=m.content,
            source=m.source,
            tag=m.tag,
            scope=m.scope,
            scope_id=m.scope_id,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in memories
    ]


@router.post("", response_model=MemoryResponse, status_code=201)
def create_memory(
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    entry = MemoryEntry(
        kind=payload.kind,
        title=payload.title,
        content=payload.content,
        source=payload.source,
        tag=payload.tag,
        scope=payload.scope,
        scope_id=payload.scope_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return MemoryResponse(
        id=entry.id,
        kind=entry.kind,
        title=entry.title,
        content=entry.content,
        source=entry.source,
        tag=entry.tag,
        scope=entry.scope,
        scope_id=entry.scope_id,
        created_at=entry.created_at.isoformat() if entry.created_at else "",
    )


@router.post("/search", response_model=list[dict])
def search_memories(
    payload: MemorySearchRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return search_memory(
        query=payload.query,
        kind=payload.kind,
        limit=payload.limit,
        scope=payload.scope,
        scope_id=payload.scope_id,
    )


@router.delete("/{memory_id}")
def delete_memory_endpoint(
    memory_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == memory_id).first()
    if not entry:
        raise HTTPException(404, "Memory not found")
    db.delete(entry)
    db.commit()
    return {"deleted": memory_id}


@router.post("/forget", response_model=list[dict])
def forget_memory(
    payload: MemorySearchRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    """Find memories matching the query that the user might want to forget."""
    return find_memory_to_forget(payload.query, payload.limit)


# Scoped memory endpoints
@router.post("/global", response_model=MemoryResponse, status_code=201)
def create_global_memory(
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "global"
    return create_memory(payload, user, db)


@router.post("/client/{client_name}", response_model=MemoryResponse, status_code=201)
def create_client_memory(
    client_name: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "client"
    payload.scope_id = client_name
    return create_memory(payload, user, db)


@router.post("/team/{team_id}", response_model=MemoryResponse, status_code=201)
def create_team_memory(
    team_id: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "team"
    payload.scope_id = team_id
    return create_memory(payload, user, db)


@router.post("/teammate/{teammate_id}", response_model=MemoryResponse, status_code=201)
def create_teammate_memory(
    teammate_id: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "teammate"
    payload.scope_id = teammate_id
    return create_memory(payload, user, db)


@router.post("/project/{project_id}", response_model=MemoryResponse, status_code=201)
def create_project_memory(
    project_id: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "project"
    payload.scope_id = project_id
    return create_memory(payload, user, db)


@router.post("/conversation/{session_id}", response_model=MemoryResponse, status_code=201)
def create_conversation_memory(
    session_id: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "conversation"
    payload.scope_id = session_id
    return create_memory(payload, user, db)


@router.post("/task/{task_id}", response_model=MemoryResponse, status_code=201)
def create_task_memory(
    task_id: str,
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MemoryResponse:
    payload.scope = "task"
    payload.scope_id = task_id
    return create_memory(payload, user, db)