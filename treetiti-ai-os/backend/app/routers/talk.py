"""War Room routes: create/list rooms, jump into the chat, kick bot rounds,
and stream the live talk (``talk.*`` SSE events) for one room."""

from __future__ import annotations

import asyncio
import json
import queue as _queue
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_role
from app.core.events import Event, bus
from app.database import get_db
from app.models import TalkMessage, TalkRoom, User
from app.talk import (
    ROOM_ERROR,
    ROUND_FINISHED,
    ROUND_STARTED,
    REPLY,
    THINKING,
    create_room as talk_create_room,
    message_dict,
    post_message,
    room_dict,
)

router = APIRouter(prefix="/talk", tags=["talk"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    topic: str = Field(default="")
    speaker_keys: list[str] = Field(default_factory=list)
    mode: str = Field(default="groq", pattern="^(groq|opencode)$")
    thinking: str = Field(default="deep", pattern="^(plain|deep|super)$")
    client: str = Field(default="", max_length=128)
    chief_key: str = Field(default="", max_length=64)
    team_id: str | None = None


class RoomMessage(BaseModel):
    content: str = Field(..., min_length=1)
    addressed_to: str = Field(default="", max_length=128)


class RoundKick(BaseModel):
    triggered_by: str = Field(default="user", max_length=64)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_room(db: Session, room_id: str) -> TalkRoom:
    room = db.query(TalkRoom).filter(TalkRoom.id == room_id).first()
    if room is None:
        raise HTTPException(404, "Room not found")
    return room


def _team_speakers(db: Session, team_id: str) -> tuple[list[str], str]:
    """Resolve a Team to its member agent keys (chief first)."""
    from app.models import Team, Teammate  # noqa: PLC0415

    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(404, "Team not found")
    members = db.query(Teammate).filter(Teammate.id.in_(team.member_ids)).all()
    by_id = {m.id: m for m in members}
    keys = [t.agent_key for t in members if t.agent_key]
    chief_key = ""
    if team.chief_id and team.chief_id in by_id:
        chief_key = by_id[team.chief_id].agent_key
    return keys, chief_key
# ---------------------------------------------------------------------------
# REST
# ---------------------------------------------------------------------------

@router.post("/rooms")
def create_room(
    body: RoomCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    from app.agents import AGENTS  # noqa: PLC0415

    keys, chief_key = body.speaker_keys, body.chief_key
    if body.team_id:
        keys, chief_key = _team_speakers(db, body.team_id)
    if not keys:
        # Sensible default: the CEO + a strategy brain.
        keys = ["ceo", "strategist", "content", "analytics"]
    for k in keys:
        if k not in AGENTS:
            raise HTTPException(400, f"Unknown agent key '{k}'")
    try:
        room = talk_create_room(
            db,
            name=body.name,
            topic=body.topic,
            speaker_keys=keys,
            mode=body.mode,
            thinking=body.thinking,
            client=body.client,
            chief_key=chief_key,
            team_id=body.team_id,
            created_by=user.email or "owner",
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return room_dict(room, db)


@router.get("/rooms")
def list_rooms(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    rooms = db.query(TalkRoom).order_by(TalkRoom.updated_at.desc()).all()
    return [room_dict(r, db) for r in rooms]


@router.get("/rooms/{room_id}")
def get_room(
    room_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return room_dict(_get_room(db, room_id), db)


@router.get("/rooms/{room_id}/messages")
def get_messages(
    room_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 200,
) -> dict:
    _get_room(db, room_id)
    rows = (
        db.query(TalkMessage)
        .filter(TalkMessage.room_id == room_id)
        .order_by(TalkMessage.created_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )
    return {
        "room": room_dict(_get_room(db, room_id), db),
        "messages": [message_dict(m) for m in reversed(rows)],
    }


@router.delete("/rooms/{room_id}")
def delete_room(
    room_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    room = _get_room(db, room_id)
    db.query(TalkMessage).filter(TalkMessage.room_id == room_id).delete()
    db.delete(room)
    db.commit()
    return {"deleted": room_id}


@router.post("/rooms/{room_id}/messages")
def send_message(
    room_id: str,
    body: RoomMessage,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """You talk to the room. The bots then react (round starts in background)."""
    _get_room(db, room_id)
    msg = post_message(
        db,
        room_id,
        body.content,
        speaker_name="You",
        addressed_to=body.addressed_to,
    )
    return {"message": message_dict(msg), "room": room_dict(_get_room(db, room_id), db)}


@router.post("/rooms/{room_id}/round")
def kick_round(
    room_id: str,
    body: RoundKick,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """The floor is open: every bot in the room reacts to the current talk."""
    _get_room(db, room_id)
    post_message(
        db,
        room_id,
        "The floor is open — share your take on where the discussion stands.",
        speaker_key="",
        speaker_name="You",
        addressed_to="everyone",
    )
    return {"ok": True, "room_id": room_id, "triggered_by": body.triggered_by}


# ---------------------------------------------------------------------------
# SSE: live room stream (talk.* events filtered by room_id)
# ---------------------------------------------------------------------------

_TALK_TYPES = {THINKING, REPLY, ROUND_STARTED, ROUND_FINISHED, ROOM_ERROR}


def _sse_frame(data: dict[str, Any]) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _room_stream(room_id: str) -> Any:
    """Generator bridged from the global bus → this connection's SSE queue."""
    pending: _queue.Queue = _queue.Queue(maxsize=1000)

    def on_event(event: Event) -> None:
        if event.type not in _TALK_TYPES:
            return
        if event.payload.get("room_id") != room_id:
            return
        try:
            pending.put_nowait(event)
        except _queue.Full:
            pass

    bus().subscribe("*", on_event)
    try:
        while True:
            try:
                event = pending.get_nowait()
            except _queue.Empty:
                yield ": keepalive\n\n"
                await asyncio.sleep(0.5)
                continue
            yield _sse_frame(
                {
                    "type": event.type,
                    "payload": event.payload,
                    "created_at": event.created_at.isoformat(),
                }
            )
    finally:
        bus().unsubscribe("*", on_event)


@router.get("/rooms/{room_id}/stream")
def room_stream(
    room_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> StreamingResponse:
    """Live SSE feed for one War Room: thinking stages + replies stream in."""
    return StreamingResponse(
        _room_stream(room_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )