"""Content routes: browse generated content, update approval status."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ContentItem, User

router = APIRouter(prefix="/content", tags=["content"])

ALLOWED_STATUSES = ["draft", "pending_approval", "approved", "published", "rejected"]


class StatusUpdate(BaseModel):
    status: str


def _serialize(item: ContentItem) -> dict:
    return {
        "id": item.id,
        "platform": item.platform,
        "content_type": item.content_type,
        "title": item.title,
        "hook": item.hook,
        "body": item.body,
        "cta": item.cta,
        "target_audience": item.target_audience,
        "visual_recommendation": item.visual_recommendation,
        "status": item.status,
        "scheduled_for": item.scheduled_for,
        "engagement_score": item.engagement_score,
    }


@router.get("")
def list_content(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
    platform: str | None = None,
    limit: int = 50,
) -> list[dict]:
    query = db.query(ContentItem)
    if status:
        query = query.filter(ContentItem.status == status)
    if platform:
        query = query.filter(ContentItem.platform == platform)
    items = query.order_by(ContentItem.created_at.desc()).limit(limit).all()
    return [_serialize(i) for i in items]


@router.get("/{item_id}")
def get_content(
    item_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    item = db.get(ContentItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content not found")
    return _serialize(item)


@router.patch("/{item_id}/status")
def update_status(
    item_id: str,
    payload: StatusUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400, detail=f"status must be one of {ALLOWED_STATUSES}"
        )
    item = db.get(ContentItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content not found")
    item.status = payload.status
    db.commit()
    return _serialize(item)
