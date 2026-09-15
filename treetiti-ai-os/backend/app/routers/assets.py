"""TREEtiti AI Marketing OS — asset routes (plan §L).

    GET    /api/v1/assets               list media assets (filter kind/agent)
    POST   /api/v1/assets               record a produced asset
    POST   /api/v1/assets/generate      produce + record an asset via media services
    GET    /api/v1/assets/{id}          fetch one asset
    DELETE /api/v1/assets/{id}          delete an asset record
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import MediaAsset, User
from app.services.media import produce_image, produce_video
from app.services.voice import synthesize_speech

router = APIRouter(prefix="/assets", tags=["assets"])

KINDS = {"image", "video", "3d", "audio"}


class AssetCreate(BaseModel):
    kind: str
    title: str = ""
    creator_agent: str = ""
    model: str = ""
    prompt: str = ""
    url: str = ""
    project_id: str = ""
    session_id: str = ""


class AssetGenerate(BaseModel):
    kind: str
    prompt: str
    title: str = ""
    creator_agent: str = "media"
    project_id: str = ""
    session_id: str = ""


@router.get("")
def list_assets(
    user: Annotated[User, Depends(get_current_user)],
    kind: str = "",
    creator_agent: str = "",
    session_id: str = "",
) -> list[dict]:
    with SessionLocal() as db:
        q = db.query(MediaAsset)
        if kind:
            q = q.filter(MediaAsset.kind == kind)
        if creator_agent:
            q = q.filter(MediaAsset.creator_agent == creator_agent)
        if session_id:
            q = q.filter(MediaAsset.session_id == session_id)
        rows = q.order_by(MediaAsset.created_at.desc()).limit(200).all()
        return [_asset_dict(a) for a in rows]


@router.post("")
def create_asset(
    payload: AssetCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if payload.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {sorted(KINDS)}")
    with SessionLocal() as db:
        a = MediaAsset(
            kind=payload.kind,
            title=payload.title,
            creator_agent=payload.creator_agent,
            model=payload.model,
            prompt=payload.prompt,
            url=payload.url,
            project_id=payload.project_id,
            session_id=payload.session_id,
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        return _asset_dict(a)


@router.post("/generate")
def generate_asset(
    payload: AssetGenerate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if payload.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {sorted(KINDS)}")

    if payload.kind == "image":
        produced = produce_image(payload.prompt)
    elif payload.kind == "video":
        produced = produce_video(payload.prompt, filename="asset_video.mp4")
    elif payload.kind == "audio":
        produced = synthesize_speech(payload.prompt)
    else:  # 3d -> spec only (no live provider yet)
        from app.services.media.td import produce_3d

        produced = produce_3d(payload.prompt)

    record = {
        "kind": payload.kind,
        "title": payload.title or payload.prompt[:80],
        "creator_agent": payload.creator_agent,
        "prompt": payload.prompt,
        "url": produced.get("url", ""),
        "project_id": payload.project_id,
        "session_id": payload.session_id,
    }
    with SessionLocal() as db:
        a = MediaAsset(**record)
        db.add(a)
        db.commit()
        db.refresh(a)
        row = _asset_dict(a)
    row["produced"] = produced
    return row


@router.get("/{asset_id}")
def get_asset(
    asset_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        a = db.get(MediaAsset, asset_id)
        if a is None:
            raise HTTPException(status_code=404, detail="asset not found")
        return _asset_dict(a)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        a = db.get(MediaAsset, asset_id)
        if a is None:
            raise HTTPException(status_code=404, detail="asset not found")
        db.delete(a)
        db.commit()
        return {"id": asset_id, "deleted": True}


def _asset_dict(a: MediaAsset) -> dict:
    return {
        "id": a.id,
        "kind": a.kind,
        "title": a.title,
        "creator_agent": a.creator_agent,
        "model": a.model,
        "prompt": a.prompt,
        "url": a.url,
        "version": a.version,
        "project_id": a.project_id,
        "session_id": a.session_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }