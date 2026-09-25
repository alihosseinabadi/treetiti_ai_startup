"""Chat routes: talk to the AI brain, with memory-backed context."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.dispatcher import dispatch, route_prompt
from app.llm import llm_battle, llm_complete_safe, model_health
from app.memory.store import (
    remember_conversation,
    search_brand_memory,
    search_memory,
)
from app.models import BattleVote, ChatSession, User

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    project_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    battle: bool = False
    turn_index: int = 0
    winner_model: str | None = None
    judge: str | None = None
    answers: list[dict] = []
    failover: bool = False
    skipped_model: str | None = None


class VoteRequest(BaseModel):
    session_id: str
    turn_index: int
    winner: str  # "A" or "B"


def _system_prompt(query: str = "", project_id: str | None = None) -> str:
    memory = search_brand_memory("Treetiti brand services", limit=6)
    memory_block = (
        "\n".join(f"- {m['title']}: {m['content']}" for m in memory)
        or "No brand memory stored yet."
    )
    # RAG recall: pull relevant long-term memories for this specific question.
    team_memory = search_memory(query, limit=4, project_id=project_id)
    team_block = (
        "\n".join(
            f"- [{m['kind']}] {m['title']}: {m['content'][:300]}" for m in team_memory
        )
        or "No stored memories match yet."
    )
    project_block = ""
    if project_id:
        try:
            from app.database import SessionLocal as _SL
            from app.models import Project as _P

            with _SL() as _db:
                proj = _db.get(_P, project_id)
                if proj is not None:
                    project_block = (
                        f"\nACTIVE PROJECT: {proj.name}\n"
                        f"{proj.description[:500]}\n"
                        "Everything below scoped to this project — its past chats "
                        "and saved memories outrank generic knowledge.\n"
                    )
        except Exception:  # noqa: BLE001
            project_block = ""
    return f"""You are Treetiti's AI Marketing Employee.

You know everything about the Treetiti brand, its services and the team's
long-term goals. You answer with the Treetiti brand voice: premium, futuristic,
minimal, confident, B2B.
{project_block}
BRAND MEMORY:
{memory_block}

WHAT THE TEAM REMEMBERED (past talks, goals, preferences — respect these):
{team_block}

Keep answers clear, direct and high-end. Do not invent claims about services
that are not in the brand memory."""


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")

    if payload.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        project_id = payload.project_id or session.project_id
        if payload.project_id and payload.project_id != session.project_id:
            session.project_id = payload.project_id
            db.commit()
    else:
        project_id = payload.project_id
        session = ChatSession(title=payload.message[:80], messages=[], project_id=project_id)
        db.add(session)
        db.commit()
        db.refresh(session)

    history = list(session.messages or [])
    history.append({"role": "user", "content": payload.message})

    context = "\n".join(
        f"{m['role']}: {m['content']}" for m in history[-8:]
    )

    settings = get_settings()
    prompt = f"Conversation so far:\n{context}\n\nReply to the latest message."
    battle = settings.battle_mode

    # Auto-store important user messages as long-term RAG memory.
    try:
        remember_conversation("user", payload.message, source="chat", project_id=project_id)
    except Exception:  # noqa: BLE001
        pass  # memory is best-effort; never break the chat

    # Prompt-adaptive routing: if this is a concrete task (not just a
    # conversational question), dispatch it to the specialist agent and return
    # the agent's deliverable. Conversational questions stay on the brain.
    routed_key = route_prompt(payload.message)
    if routed_key:
        try:
            from app.agents import get_agent

            _agent_key, agent_payload = dispatch(payload.message)
            agent_out = get_agent(_agent_key).run(**agent_payload)
            reply = str(agent_out)[:4000]
            history.append(
                {
                    "role": "assistant",
                    "content": reply,
                    "agent": _agent_key,
                }
            )
            session.messages = history
            db.commit()
            return ChatResponse(session_id=session.id, reply=reply)
        except Exception as exc:  # noqa: BLE001
            # Agent failed -> fall through to the conversational brain.
            logger = __import__("logging").getLogger("treetiti.chat")
            logger.warning("agent routing fell back to brain: %s", exc)

    if battle:
        result = llm_battle(_system_prompt(payload.message, project_id), prompt)
        reply = result["winner"]
        turn_index = len(history)
        battle_msg = {
            "role": "assistant",
            "content": reply,
            "battle": True,
            "winner_model": result["winner_model"],
            "judge": result.get("judge"),
            "answers": result["answers"],
        }
        history.append(battle_msg)
        session.messages = history
        db.commit()
        return ChatResponse(
            session_id=session.id,
            reply=reply,
            battle=True,
            turn_index=turn_index,
            winner_model=result["winner_model"],
            judge=result.get("judge"),
            answers=result["answers"],
            failover=result.get("failover", False),
            skipped_model=result.get("skipped_model"),
        )

    reply, _offline = llm_complete_safe(_system_prompt(payload.message, project_id), prompt)

    history.append({"role": "assistant", "content": reply})
    session.messages = history
    db.commit()

    return ChatResponse(session_id=session.id, reply=reply)


@router.get("/sessions")
def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    sessions = (
        db.query(ChatSession).order_by(ChatSession.updated_at.desc()).limit(50).all()
    )
    return [{"id": s.id, "title": s.title, "project_id": s.project_id} for s in sessions]


@router.post("/vote")
def vote(
    payload: VoteRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Record the user's pick between the two arena models."""
    session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = session.messages or []
    if not (0 <= payload.turn_index < len(msgs)):
        raise HTTPException(status_code=404, detail="Battle turn not found")
    battle_msg = msgs[payload.turn_index]
    if not battle_msg.get("battle") or not battle_msg.get("answers"):
        raise HTTPException(status_code=404, detail="Turn is not a battle")

    answers = battle_msg["answers"]
    if payload.winner not in ("A", "B"):
        raise HTTPException(status_code=400, detail="winner must be 'A' or 'B'")
    slot = 0 if payload.winner == "A" else 1
    if slot >= len(answers):
        raise HTTPException(status_code=400, detail="That model did not answer")
    winner_model = answers[slot]["model"]

    model_a = answers[0]["model"] if answers else ""
    model_b = answers[1]["model"] if len(answers) > 1 else ""

    db.add(
        BattleVote(
            session_id=payload.session_id,
            turn_index=payload.turn_index,
            model_a=model_a,
            model_b=model_b,
            winner=winner_model,
            judge_winner=battle_msg.get("winner_model") or "",
        )
    )
    db.commit()
    return {"voted": winner_model}


@router.get("/leaderboard")
def leaderboard(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    """Per-model arena record: wins, losses, battles, win rate."""
    votes = db.query(BattleVote).all()
    stats: dict[str, dict] = {}
    for v in votes:
        for m in (v.model_a, v.model_b):
            if not m:
                continue
            stats.setdefault(m, {"model": m, "wins": 0, "losses": 0, "battles": 0})
            stats[m]["battles"] += 1
            stats[m]["wins"] += 1 if v.winner == m else 0
            stats[m]["losses"] += 0 if v.winner == m else 1
    rows = list(stats.values())
    for r in rows:
        r["win_rate"] = round(r["wins"] / r["battles"], 3) if r["battles"] else 0.0
    rows.sort(key=lambda r: (-r["win_rate"], -r["wins"]))
    return rows


@router.get("/health")
def chat_health(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Arena model health: which model is active and how many failures it has."""
    return {"models": model_health()}
