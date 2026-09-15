"""War Room engine — live multi-agent chat (Groq bot mode + super thinking).

A War Room is a persistent conversation where several TREEtiti agents talk to
EACH OTHER about a topic, and the owner can jump in, ping a specific bot, or
kick a fresh round. Agents think out loud: every super-thinking stage
(plan -> draft -> critique -> refine -> verify -> finalize) is streamed to the
SSE bus as a ``talk.*`` event so the UI shows the bots *thinking*, not just the
final message.

Model routing (``mode`` on the room):
  groq    -> use ``groq/<settings.groq_model>`` for every bot when a Groq key
             is configured (with automatic opencode/provider fallback from the
             existing llm.py chain). This is the default "Grok bot mode".
  opencode -> agent default models (settings.agent_models / model router).

Threading: each room gets a lock so rounds never overlap; a second user
message landing mid-round flags a pending round that starts right when the
running one finishes.
"""

from __future__ import annotations

import logging
import threading

from app.config import get_settings

logger = logging.getLogger("treetiti.talk")

# Custom event types streamed on the global SSE bus (payload always has room_id).
ROOM_CREATED = "talk.room.created"
ROUND_STARTED = "talk.round.started"
THINKING = "talk.thinking"
REPLY = "talk.reply"
ROUND_FINISHED = "talk.round.finished"
ROOM_ERROR = "talk.error"

_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
_pending_rounds: set[str] = set()
_pending_guard = threading.Lock()


def _room_lock(room_id: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(room_id, threading.Lock())


def _emit(event_type: str, room_id: str, **payload) -> None:
    try:
        from app.core.events import emit

        emit(event_type, source="talk", payload={"room_id": room_id, **payload})
    except Exception:  # noqa: BLE001  (never let the event bus break the room)
        pass


def _mark_pending(room_id: str, flag: bool) -> None:
    with _pending_guard:
        if flag:
            _pending_rounds.add(room_id)
        else:
            _pending_rounds.discard(room_id)


def _is_pending(room_id: str) -> bool:
    with _pending_guard:
        return room_id in _pending_rounds


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def message_dict(m) -> dict:
    return {
        "id": m.id,
        "room_id": m.room_id,
        "role": m.role,
        "speaker_key": m.speaker_key,
        "speaker_name": m.speaker_name,
        "content": m.content,
        "thinking_stages": m.thinking_stages or [],
        "model": m.model,
        "addressed_to": m.addressed_to,
        "round_number": m.round_number,
        "created_at": m.created_at.isoformat() if m.created_at else "",
    }


def room_dict(room, db) -> dict:
    from app.agents import AGENTS
    from app.models import TalkMessage  # noqa: PLC0415

    speakers = []
    for key in room.speaker_keys or []:
        agent = AGENTS.get(key)
        if agent is not None:
            speakers.append({"key": key, "name": agent.name, "role": agent.role})

    last = (
        db.query(TalkMessage)
        .filter(TalkMessage.room_id == room.id)
        .order_by(TalkMessage.created_at.desc())
        .first()
    )
    return {
        "id": room.id,
        "name": room.name,
        "topic": room.topic,
        "mode": room.mode,
        "thinking": room.thinking,
        "speakers": speakers,
        "chief_id": room.chief_id,
        "team_id": room.team_id,
        "client": room.client,
        "status": room.status,
        "created_by": room.created_by,
        "last_message": last.content[:160] if last else "",
        "last_at": last.created_at.isoformat() if last and last.created_at else "",
        "created_at": room.created_at.isoformat() if room.created_at else "",
        "updated_at": room.updated_at.isoformat() if room.updated_at else "",
    }


# ---------------------------------------------------------------------------
# Room CRUD + turns
# ---------------------------------------------------------------------------

def create_room(
    db,
    *,
    name: str,
    topic: str = "",
    speaker_keys: list[str] | None = None,
    mode: str = "groq",
    thinking: str = "deep",
    client: str = "",
    chief_key: str = "",
    team_id: str | None = None,
    created_by: str = "",
):
    """Create a War Room. ``speaker_keys`` is the talk order (chief first)."""
    from app.agents import AGENTS  # noqa: PLC0415
    from app.models import TalkRoom  # noqa: PLC0415

    keys = [k for k in (speaker_keys or []) if k in AGENTS]
    if chief_key and chief_key in AGENTS and chief_key in keys:
        keys.remove(chief_key)
        keys.insert(0, chief_key)
    if not keys:
        raise ValueError(
            f"No valid speakers. Available agents: {', '.join(sorted(AGENTS))}"
        )
    if thinking not in ("plain", "deep", "super"):
        thinking = "deep"
    if mode not in ("groq", "opencode"):
        mode = "groq"

    room = TalkRoom(
        name=(name or "War Room").strip()[:128],
        topic=topic.strip(),
        mode=mode,
        thinking=thinking,
        speaker_keys=keys,
        client=(client or "").strip(),
        team_id=team_id,
        created_by=created_by,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    _emit(
        ROOM_CREATED,
        room.id,
        name=room.name,
        speakers=keys,
        mode=mode,
        thinking=thinking,
    )
    return room


def _speaker_model(room) -> str | None:
    """Groq bot mode: force the Groq model when a key exists, else use the
    agent's normal routing (opencode fallback inside llm.py still applies)."""
    if room.mode != "groq":
        return None
    settings = get_settings()
    if not settings.groq_key:
        return None
    return f"groq/{settings.groq_model or 'openai/gpt-oss-120b'}"


def _transcript(db, room_id: str, limit: int = 14) -> str:
    from app.models import TalkMessage  # noqa: PLC0415

    rows = (
        db.query(TalkMessage)
        .filter(TalkMessage.room_id == room_id)
        .order_by(TalkMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    lines = []
    for m in reversed(rows):
        name = m.speaker_name or ("You" if m.role == "user" else m.speaker_key)
        lines.append(f"{name}: {m.content}")
    return "\n".join(lines)


def _turn_prompt(room, agent, db) -> str:
    transcript = _transcript(db, room.id)
    return (
        f"Room: {room.name}\n"
        f"Business context: {room.client or 'TREEtiti internal'}\n"
        f"Discussion so far:\n{transcript or '(nothing yet - you open the topic)'}\n\n"
        f"It is YOUR turn. You are {agent.name}, the {agent.role}.\n"
        f"Room topic / directive:\n{room.topic}\n\n"
        f"Reply as {agent.name} ({agent.role}): naturally continue the discussion in a "
        "team chat - agree, push back with a sharper angle, add the missing piece from "
        "your specialty, or propose next steps. Address the most recent speaker "
        "directly. Stay in character, be specific, and keep it a tight chat message "
        "(2-6 sentences unless the topic demands more). Do not repeat points already made."
    )
# ---------------------------------------------------------------------------
# Rounds (the live part)
# ---------------------------------------------------------------------------

def run_round(db, room_id: str, *, triggered_by: str = "user") -> None:
    """Have every speaker react, in order. Runs in a background thread; each
    bot streams its super-thinking stages then its final reply."""
    from app.agents import AGENTS  # noqa: PLC0415
    from app.models import TalkMessage, TalkRoom  # noqa: PLC0415

    lock = _room_lock(room_id)
    if not lock.acquire(blocking=False):
        # A round is already running - the new input will be picked up.
        _mark_pending(room_id, True)
        return

    room = db.query(TalkRoom).filter(TalkRoom.id == room_id).first()
    if room is None:
        lock.release()
        return
    try:
        room.status = "round_running"
        db.commit()
        _emit(ROUND_STARTED, room_id, triggered_by=triggered_by)

        try:
            last_msg = (
                db.query(TalkMessage)
                .filter(TalkMessage.room_id == room_id)
                .order_by(TalkMessage.round_number.desc())
                .first()
            )
            round_no = (last_msg.round_number if last_msg else 0) + 1
        except Exception:  # noqa: BLE001
            round_no = 1

        model_override = _speaker_model(room)
        for key in room.speaker_keys or []:
            agent = AGENTS.get(key)
            if agent is None:
                continue
            _emit(
                THINKING,
                room_id,
                agent_key=key,
                agent_name=agent.name,
                stage="starting",
                note=f"{agent.name} is taking the floor...",
                model=model_override or agent._route_model(),
                round_number=round_no,
            )

            def on_stage(stage: str, note: str, _key: str = key, _agent=agent) -> None:
                _emit(
                    THINKING,
                    room_id,
                    agent_key=_key,
                    agent_name=_agent.name,
                    stage=stage,
                    note=note,
                    model=model_override or _agent._route_model(),
                    round_number=round_no,
                )

            try:
                prompt = _turn_prompt(room, agent, db)
                text, stages = agent.super_deliberate(
                    prompt,
                    think=room.thinking or "deep",
                    on_stage=on_stage,
                    model=model_override,
                )
                if not text.strip():
                    text = "(stepped back - nothing to add this round.)"
                msg = TalkMessage(
                    room_id=room_id,
                    role="agent",
                    speaker_key=key,
                    speaker_name=agent.name,
                    content=text,
                    thinking_stages=stages,
                    model=model_override or agent._route_model(),
                    round_number=round_no,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)
                _emit(REPLY, room_id, message=message_dict(msg), round_number=round_no)
            except Exception as exc:  # noqa: BLE001 - one bot failing keeps the round going
                logger.warning("war room %s: %s failed to speak: %s", room_id, key, exc)
                _emit(
                    ROOM_ERROR,
                    room_id,
                    agent_key=key,
                    note=f"{agent.name} hit a snag and will be skipped.",
                )

        _emit(ROUND_FINISHED, room_id, round_number=round_no)
    finally:
        fresh_room = db.query(TalkRoom).filter(TalkRoom.id == room_id).first()
        if fresh_room is not None:
            fresh_room.status = "idle"
            db.commit()
        lock.release()
        if _is_pending(room_id):
            _mark_pending(room_id, False)
            try:
                from app.database import SessionLocal  # noqa: PLC0415

                fresh = SessionLocal()
                try:
                    run_round(fresh, room_id, triggered_by="queued")
                finally:
                    fresh.close()
            except Exception as exc:  # noqa: BLE001
                logger.warning("war room %s: queued round failed: %s", room_id, exc)


def post_message(
    db,
    room_id: str,
    content: str,
    *,
    speaker_key: str = "",
    speaker_name: str = "",
    addressed_to: str = "",
    kick_round: bool = True,
):
    """Persist a user (or agent) message. User messages kick a round."""
    from app.models import TalkMessage  # noqa: PLC0415

    msg = TalkMessage(
        room_id=room_id,
        role="user" if not speaker_key else "agent",
        speaker_key=speaker_key,
        speaker_name=speaker_name,
        content=content.strip(),
        addressed_to=addressed_to,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    if kick_round:
        threading.Thread(
            target=_kick_round,
            args=(room_id,),
            kwargs={"triggered_by": speaker_key or "user"},
            daemon=True,
        ).start()
    return msg


def _kick_round(room_id: str, *, triggered_by: str) -> None:
    """Open a dedicated session for the round thread (the request session
    closes when the HTTP call returns, so we can't reuse it)."""
    from app.database import SessionLocal  # noqa: PLC0415

    fresh = SessionLocal()
    try:
        run_round(fresh, room_id, triggered_by=triggered_by)
    finally:
        fresh.close()