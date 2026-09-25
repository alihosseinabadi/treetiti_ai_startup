"""Brand memory routes: read/write the long-term brand knowledge base."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.memory.store import search_brand_memory, store_brand_memory
from app.models import User

router = APIRouter(prefix="/memory", tags=["memory"])

CATEGORIES = ["voice", "customers", "services", "design", "wins"]


class MemoryCreate(BaseModel):
    category: str
    title: str
    content: str


@router.post("")
def add_memory(
    payload: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {CATEGORIES}")
    item_id = store_brand_memory(payload.category, payload.title, payload.content)
    return {"id": item_id}


@router.get("")
def query_memory(
    user: Annotated[User, Depends(get_current_user)],
    q: str = "",
    category: str | None = None,
    limit: int = 5,
) -> list[dict]:
    return search_brand_memory(q or "Treetiti", category=category, limit=limit)


@router.get("/categories")
def memory_categories(
    user: Annotated[User, Depends(get_current_user)],
) -> list[str]:
    return CATEGORIES
