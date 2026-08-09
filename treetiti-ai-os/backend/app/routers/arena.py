"""Arena routes: self-driving model arena — pool, leaderboard, battles."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.arena import champion, leaderboard, recent_battles, run_battle, run_self_battle, sync_pool
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/arena", tags=["arena"])


class BattleRequest(BaseModel):
    model_a: str
    model_b: str
    question: str | None = None


@router.get("")
def arena_status(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Pool size, current champion and the full Elo leaderboard."""
    from app.config import get_settings

    s = get_settings()
    active = s.opencode_model if s.llm_provider.lower() == "opencode" else s.ollama_model
    top = champion()
    return {
        "champion": top,
        "leaderboard": leaderboard(),
        "provider": s.llm_provider,
        "active_model": active,
    }


@router.post("/sync")
def sync(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Re-scan the opencode CLI for models and add any new ones."""
    return sync_pool()


@router.get("/leaderboard")
def arena_leaderboard(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    return leaderboard()


@router.get("/battles")
def battles(user: Annotated[User, Depends(get_current_user)], limit: int = 20) -> list[dict]:
    return recent_battles(limit=min(limit, 100))


@router.post("/battle")
def battle(req: BattleRequest, user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Manually run a judge battle between two models."""
    if not req.model_a or not req.model_b:
        raise HTTPException(status_code=400, detail="model_a and model_b are required")
    if req.model_a == req.model_b:
        raise HTTPException(status_code=400, detail="Pick two different models")
    return run_battle(req.model_a, req.model_b, req.question, automatic=False)


@router.post("/self-battle")
def self_battle(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Champion vs a random challenger — run one now."""
    return run_self_battle()
