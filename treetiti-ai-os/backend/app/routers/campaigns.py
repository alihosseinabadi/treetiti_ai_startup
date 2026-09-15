"""TREEtiti AI Marketing OS — campaign routes (plan §L).

    GET    /api/v1/campaigns            list campaigns (filter status)
    POST   /api/v1/campaigns            create a campaign
    GET    /api/v1/campaigns/{id}       fetch one campaign
    PATCH  /api/v1/campaigns/{id}       update fields / status
    DELETE /api/v1/campaigns/{id}       archive a campaign
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import BrandContentCampaign, User

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class CampaignCreate(BaseModel):
    title: str
    objective: str
    target_audience: str = ""
    strategy: str = ""


class CampaignUpdate(BaseModel):
    title: str | None = None
    objective: str | None = None
    target_audience: str | None = None
    strategy: str | None = None
    message_house: list[dict] | None = None
    status: str | None = None


@router.get("")
def list_campaigns(
    user: Annotated[User, Depends(get_current_user)],
    status: str = "",
) -> list[dict]:
    with SessionLocal() as db:
        q = db.query(BrandContentCampaign)
        if status:
            q = q.filter(BrandContentCampaign.status == status)
        rows = q.order_by(BrandContentCampaign.created_at.desc()).all()
        return [_campaign_dict(c) for c in rows]


@router.post("")
def create_campaign(
    payload: CampaignCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        c = BrandContentCampaign(
            title=payload.title,
            objective=payload.objective,
            target_audience=payload.target_audience,
            strategy=payload.strategy,
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        return _campaign_dict(c)


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        c = db.get(BrandContentCampaign, campaign_id)
        if c is None:
            raise HTTPException(status_code=404, detail="campaign not found")
        return _campaign_dict(c)


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        c = db.get(BrandContentCampaign, campaign_id)
        if c is None:
            raise HTTPException(status_code=404, detail="campaign not found")
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(c, field, value)
        db.commit()
        db.refresh(c)
        return _campaign_dict(c)


@router.delete("/{campaign_id}")
def archive_campaign(
    campaign_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        c = db.get(BrandContentCampaign, campaign_id)
        if c is None:
            raise HTTPException(status_code=404, detail="campaign not found")
        c.status = "archived"
        db.commit()
        return {"id": campaign_id, "status": "archived"}


def _campaign_dict(c: BrandContentCampaign) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "objective": c.objective,
        "target_audience": c.target_audience,
        "strategy": c.strategy,
        "message_house": c.message_house,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }