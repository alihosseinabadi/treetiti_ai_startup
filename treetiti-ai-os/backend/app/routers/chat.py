"""Chat routes: talk to the AI brain, with memory-backed context."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.dispatcher import dispatch, is_company_task, route_prompt
from app.llm import llm_complete, model_health
from app.memory.store import (
    remember_conversation,
    search_brand_memory,
    search_memory,
)
from app.models import ChatSession, User

router = APIRouter(prefix="/chat", tags=["chat"])

# Hard ceiling for a single brain reply. When the LLM can't answer within this
# (offline providers, exhausted keys), the chat falls back to a grounded reply
# so the user is never left waiting on a stalled request.
# NOTE: Agnes 2.5-pro is a reasoning model — it thinks before answering and
# routinely takes 30-90s. Draft + 2-pass refine can reach ~150s. 120s lets the
# draft + at least one refinement complete before grounding kicks in.
_BRAIN_TIMEOUT = 120


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    context: str = ""  # "tree" | "customer:<name>" — which CEO is talking
    confirm: bool = False  # true → destructive OS commands execute
    mentions: list[dict] = []  # [{"id": "...", "type": "teammate|team|client|project", "name": "..."}]


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    task_id: str | None = None
    company: bool = False
    context: str = ""
    confirmation_required: bool = False
    confirm_action: str = ""
    confirm_payload: dict = {}
    os_command: bool = False
    report_id: str | None = None
    mission_id: str | None = None
    project_id: str | None = None
    pending_decision: dict | None = None
    checkpoints: list = []


def _system_prompt(query: str = "", context: str = "", intel: str = "", session_id: str = "") -> str:
    memory = search_brand_memory("TREEtiti brand services", limit=6)
    memory_block = (
        "\n".join(f"- {m['title']}: {m['content']}" for m in memory)
        or "No brand memory stored yet."
    )
    # RAG recall: pull relevant long-term memories for this specific question.
    team_memory = search_memory(query, limit=4)
    team_block = (
        "\n".join(
            f"- [{m['kind']}] {m['title']}: {m['content'][:300]}" for m in team_memory
        )
        or "No stored memories match yet."
    )

    # Cross-session recall: remember ALL chats, not just this one. If the user
    # asks about something discussed in a different conversation, the brain can
    # actually recall it.
    from app.memory.store import search_chat_history

    past = search_chat_history(query, exclude_session_id=session_id, limit=4)
    past_block = (
        "\n".join(
            f"- [{p['title']} · {p['session_updated_at'][:10]}] {p['excerpt']}"
            for p in past
        )
        or ""
    )
    if past_block:
        past_block = f"""

PAST CHAT SESSIONS (what was discussed before — other conversations):
{past_block}"""

    context_block = ""
    if context.startswith("customer:"):
        context_block = _customer_context_block(context[len("customer:") :])
        persona = "Customer CEO"
    else:
        persona = "TREEtiti CEO"

    intel_block = f"""
SYSTEM STATE (real, retrieved just now — trust this over guesses):
{intel}"""
    if not intel:
        intel_block = ""

    return f"""You are the {persona} of TREEtiti's AI Marketing OS.

You run the {persona.split()[0]} side of the company autonomously: you decide
what to do, delegate to the specialist team (research, social, strategy,
content, image, video, 3D, website, advertising, analytics, growth, QA) and
report results simply. Decide automatically whenever the right call is clear;
only ask for confirmation when money, publishing, data or strategy hangs on it.

When the user asks about activity, status, projects, missions, approvals,
analytics or anything about what the team did — answer ONLY from the SYSTEM
STATE block below. If the state does not contain the answer, say plainly what
is missing (e.g. "I don't have today's Instagram data because that connection
is offline") instead of inventing it. Keep answers natural and concise, like a

BRAND MEMORY:
{memory_block}

WHAT THE TEAM REMEMBERED (past talks, goals, preferences — respect these):
{team_block}
{past_block}
{context_block}
{intel_block}

Keep answers clear, direct and high-end. Do not invent claims about services
that are not in the brand memory."""


_INTENT_RULES: list[tuple[str, str]] = [
    # (regex-ish substring, intel fetcher label)
    ("what did we do today", "digest"),
    ("what happened today", "digest"),
    ("what did you do today", "digest"),
    ("what happened while i was away", "digest"),
    ("while i was away", "digest"),
    ("what happened", "recent"),
    ("what have you been", "recent"),
    ("what did we do", "recent"),
    ("what did the team", "recent"),
    ("what happened yesterday", "recent"),
    ("what changed this week", "recent"),
    ("this week", "recent"),
    ("yesterday", "recent"),
    ("what is everyone doing", "active"),
    ("what are the agents working", "active"),
    ("what are you working", "active"),
    ("who is working", "active"),
    ("what's running", "active"),
    ("what is running", "active"),
    ("what's in progress", "active"),
    ("unfinished", "active"),
    ("what is blocked", "blocked"),
    ("what's blocked", "blocked"),
    ("what went wrong", "blocked"),
    ("any errors", "blocked"),
    ("why did this fail", "blocked"),
    ("what needs my attention", "approvals"),
    ("needs my approval", "approvals"),
    ("pending approval", "approvals"),
    ("approval", "approvals"),
    ("mission", "missions"),
    ("campaign", "projects"),
    ("project", "projects"),
    ("status of", "projects"),
    ("asset", "assets"),
    ("image", "assets"),
    ("video", "assets"),
    ("analytics", "analytics"),
    ("instagram", "analytics"),
    ("performance", "analytics"),
    ("what did the analyst", "analytics"),
    ("analyst find", "analytics"),
    ("agents", "agents"),
    ("what did the team do", "digest"),
]


def _deliberate_refine(prompt: str, draft: str, system: str) -> str:
    """Critique + refine the brain's draft (Kimi-style deliberation, pass 2).

    Asks the model to judge the draft for weaknesses, then rewrite it fixing
    every raised point. Any provider failure propagates to the caller, which
    keeps the unrefined draft — the chat never stalls or 500s.
    """
    critique = llm_complete(
        system,
        f"{prompt}\n\nDRAFT:\n{draft}\n\n"
        "You are a ruthless critic. Judge the draft for accuracy, "
        "clarity, completeness and usefulness to the user. List "
        "the 3-5 most important concrete weaknesses as numbered "
        "points. Be specific — no praise.",
        model=_chat_model(),
    )
    return llm_complete(
        system,
        f"{prompt}\n\nPREVIOUS DRAFT:\n{draft}\n\nCRITIQUE:\n{critique}\n\n"
        "Rewrite the answer fixing EVERY weakness the critique raised. "
        "Keep what already works. Return only the final answer.",
        model=_chat_model(),
    )


def _chat_model() -> str:
    """The persona-capable chat brain model (content tier), not the reasoning tier.

    glm-5.2 (reasoning) self-identifies as a coding assistant and ignores the
    CEO persona; the content tier (groq/llama-3.3-70b) follows the system
    prompt and speaks as the requested CEO.

    When the 9Router gateway is down the registry picks a dead slug and the
    whole chain burns its budget before reaching a working provider. This
    helper returns the first direct-provider model from the free chain
    (Agnes, Groq, Google) so the primary path hits a live endpoint instead
    of relying on chain failover.
    """
    from app.config import get_settings

    settings = get_settings()

    # 1) Direct-provider models from the free chain are tried first — they
    #    bypass the (possibly-down) 9Router gateway entirely.
    for candidate in settings.free_model_chain:
        prefix = candidate.split("/", 1)[0]
        if prefix in ("router", "opencode"):
            continue  # gateway / CLI — skip as primary
        return candidate

    # 2) Registry pick (may return a router slug).
    try:
        from app.core.model_registry import get_registry as model_get_registry

        chosen = model_get_registry().pick_for_profile("content").model
        # If the registry returned a router slug, skip it — the gateway
        # is almost certainly the reason we're failing.
        if not chosen.startswith("router/"):
            return chosen
    except Exception:  # noqa: BLE001
        pass

    return settings.opencode_model


def _intel_for(query: str, context: str, db: Session) -> str:
    """Return the SYSTEM STATE block relevant to the user's question.

    Cheap keyword intent matching (no extra LLM call): finds what the user is
    asking about and retrieves that real state from the DB.
    """
    import app.ceo_intel as intel

    q = " " + query.lower() + " "
    chosen: list[str] = []
    for needle, label in _INTENT_RULES:
        if needle in q:
            if label not in chosen:
                chosen.append(label)
    if not chosen:
        # Default: a light digest so the CEO always has grounding.
        chosen = ["digest"]

    blocks: list[str] = []
    for label in chosen:
        if label == "digest":
            blocks.append(intel.get_daily_digest(db, context))
        elif label == "recent":
            blocks.append("RECENT ACTIVITY:\n" + intel.get_recent_activity(db, context))
        elif label == "active":
            blocks.append("ACTIVE WORK:\n" + intel.get_active_work(db, context))
        elif label == "blocked":
            blocks.append("BLOCKED WORK:\n" + intel.get_blocked_work(db, context))
        elif label == "approvals":
            blocks.append("PENDING APPROVALS:\n" + intel.get_pending_approvals(db, context))
        elif label == "missions":
            blocks.append("MISSIONS:\n" + intel.get_mission_status(db, context))
        elif label == "projects":
            blocks.append("PROJECTS:\n" + intel.get_project_status(db, context))
        elif label == "assets":
            blocks.append("RECENT ASSETS:\n" + intel.get_recent_assets(db, context))
        elif label == "analytics":
            blocks.append("ANALYTICS:\n" + intel.get_recent_analytics(db, context))
        elif label == "agents":
            blocks.append("AGENT ACTIVITY:\n" + intel.get_agent_activity(db, context))
    return "\n\n".join(blocks)


def _customer_context_block(name: str) -> str:
    """Assemble what the Customer CEO knows about one client (real data only)."""
    if not name:
        return "CUSTOMER: (no name given)\n"
    parts: list[str] = [f"CUSTOMER: {name}"]

    try:
        from app.database import SessionLocal
        from app.models import ClientProfile, Lead, Mission, MissionRun

        with SessionLocal() as db:
            missions = (
                db.query(Mission)
                .filter(Mission.client == name)
                .order_by(Mission.updated_at.desc())
                .all()
            )
            if missions:
                parts.append("\nACTIVE MISSIONS:")
                for m in missions:
                    parts.append(
                        f"- {m.name} [{m.status}]: {m.goal}"
                    )
                    ws = m.workspace or {}
                    if ws.get("intel"):
                        parts.append(f"  intel: {str(ws['intel'])[:400]}")
                    if ws.get("plan"):
                        parts.append(f"  plan: {str(ws['plan'])[:400]}")
                    last_run = (
                        db.query(MissionRun)
                        .filter(MissionRun.mission_id == m.id)
                        .order_by(MissionRun.started_at.desc())
                        .first()
                    )
                    if last_run is not None:
                        parts.append(f"  last cycle: {last_run.cycle_type} {last_run.status}")

            directory = (
                db.query(ClientProfile)
                .filter(ClientProfile.name == name)
                .order_by(ClientProfile.updated_at.desc())
                .first()
            )
            if directory is not None:
                parts.append("\nCOMPANY PROFILE:")
                parts.append(f"- business line: {directory.business_line or 'n/a'}")
                parts.append(f"- main goal: {directory.main_goal or 'n/a'}")
                parts.append(f"- dream customer: {directory.dream_customer or 'n/a'}")
                parts.append(f"- status: {directory.status}")

            lead = (
                db.query(Lead).filter(Lead.company == name).order_by(Lead.created_at.desc()).first()
            )
            if lead is not None:
                parts.append("\nLEAD:")
                parts.append(f"- status: {lead.status} · score: {lead.score} · type: {lead.customer_type}")
    except Exception as exc:  # noqa: BLE001 — real context is best-effort
        import logging

        logging.getLogger("treetiti.chat").warning(
            "customer context unavailable for %s: %s", name, exc
        )

    return "\n".join(parts)


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
    else:
        session = ChatSession(title=payload.message[:80], messages=[], context=payload.context)
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

    # Auto-store important user messages as long-term RAG memory.
    try:
        remember_conversation("user", payload.message, source="chat")
    except Exception:  # noqa: BLE001
        pass  # memory is best-effort; never break the chat

    # AGENTIC CONTROLLER — intent → plan → execute (Phase 7). The user
    # describes the outcome ("research this competitor, build daily content and
    # send it to me"); TREEtiti figures out the workflow — project auto-create,
    # deep research, missions, scheduled cycles — and only asks a business
    # question (persisted as a pending decision) when a human decision matters.
    # It runs BEFORE the imperative OS layer so outcome-oriented requests win;
    # the OS layer still owns explicit primitive phrasing ("create a schedule",
    # "delete this chat", …).
    try:
        from app.agentic import run_agentic

        agentic_result = run_agentic(payload.message, session, db, confirm=payload.confirm)
    except Exception as exc:  # noqa: BLE001 — a controller bug must never 500 the chat
        logger = __import__("logging").getLogger("treetiti.chat")
        logger.warning("agentic controller failed: %s", exc)
        agentic_result = None
    if agentic_result:
        history.append(
            {
                "role": "assistant",
                "content": agentic_result["reply"],
                "agentic": True,
                "task_id": agentic_result.get("task_id"),
                "mission_id": agentic_result.get("mission_id"),
                "report_id": agentic_result.get("report_id"),
                "project_id": agentic_result.get("project_id"),
                "pending_decision": agentic_result.get("pending_decision"),
                "checkpoints": agentic_result.get("checkpoints", []),
            }
        )
        session.messages = history
        db.commit()
        return ChatResponse(
            session_id=session.id,
            reply=agentic_result["reply"],
            context=payload.context,
            task_id=agentic_result.get("task_id"),
            mission_id=agentic_result.get("mission_id"),
            report_id=agentic_result.get("report_id"),
            project_id=agentic_result.get("project_id"),
            pending_decision=agentic_result.get("pending_decision"),
            checkpoints=agentic_result.get("checkpoints", []),
        )

    # OS COMMAND LAYER — real operating powers. Imperative natural language
    # ("create a project called …", "delete this chat", "pause the mission",
    # "remember that …") executes against real backend state BEFORE the
    # conversational brain. Destructive ops return a one-step confirmation
    # (confirm=True re-runs and executes).
    try:
        from app.os_commands import dispatch_os_command

        os_result = dispatch_os_command(
            payload.message,
            payload.context,
            session.id,
            db,
            confirm=payload.confirm,
        )
        if os_result:
            history.append(
                {
                    "role": "assistant",
                    "content": os_result["reply"],
                    "os_command": True,
                    "confirmation_required": os_result.get("confirmation_required", False),
                    "confirm_action": os_result.get("confirm_action", ""),
                }
            )
            session.messages = history
            db.commit()
            return ChatResponse(
                session_id=session.id,
                reply=os_result["reply"],
                context=payload.context,
                task_id=os_result.get("task_id"),
                confirmation_required=os_result.get("confirmation_required", False),
                confirm_action=os_result.get("confirm_action", ""),
                confirm_payload=os_result.get("confirm_payload", {}),
                os_command=True,
            )
    except Exception as exc:  # noqa: BLE001 — OS commands must never break chat
        logger = __import__("logging").getLogger("treetiti.chat")
        logger.warning("OS command dispatch failed: %s", exc)

    # Prompt-adaptive routing: if this is a concrete task (not just a
    # conversational question), dispatch it to the specialist agent and return
    # the agent's deliverable. Conversational questions stay on the brain.
    #
    # ONE CHAT (spec §12/§29/§30): a broad full-team brief is delegated to the
    # CEO, which runs the whole implemented team through the LangGraph DAG. That
    # runs on the background task queue (LLM calls take ~30s/agent), so we
    # return an immediate ack + task_id and the UI streams live team progress.
    if is_company_task(payload.message):
        from app.core.task_queue import agent_runner, get_queue

        queue = get_queue()
        queue.register("agent", agent_runner)  # idempotent
        brief = payload.message
        customer_ctx = ""
        if payload.context.startswith("customer:"):
            customer_ctx = payload.context[len("customer:") :]
            brief = (
                f"You are acting as the Customer CEO for client `{customer_ctx}`. "
                f"Run the whole team on behalf of this client.\n\n"
                f"CLIENT CONTEXT:\n{_customer_context_block(customer_ctx)}\n\n"
                f"BRIEF: {payload.message}"
            )
        task = queue.enqueue(
            "agent",
            label=f"ceo: {payload.message[:70]}",
            payload={"agent": "ceo", "kwargs": {"brief": brief}},
        )
        ack = (
            f"On it. I've activated the full team on behalf of "
            f"{customer_ctx or 'TREEtiti'} — the CEO is orchestrating "
            "research, strategy, creative, production and QA on your brief.\n\n"
            f"Task `{task.id}` is running. Live team activity streams below."
        )
        history.append(
            {"role": "assistant", "content": ack, "agent": "ceo", "task_id": task.id}
        )
        session.messages = history
        db.commit()
        return ChatResponse(
            session_id=session.id,
            reply=ack,
            task_id=task.id,
            company=True,
            context=payload.context,
        )

    routed_key = route_prompt(payload.message)
    if routed_key:
        try:
            import inspect

            from app.agents import get_agent

            _agent_key, agent_payload = dispatch(payload.message)
            if payload.context.startswith("customer:"):
                cname = payload.context[len("customer:") :]
                sig = inspect.signature(get_agent(_agent_key).run)
                if "extra_context" in sig.parameters:
                    agent_payload["extra_context"] = (
                        f"This work is for client `{cname}`.\n{_customer_context_block(cname)}"
                    )
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
            return ChatResponse(session_id=session.id, reply=reply, context=payload.context)
        except Exception as exc:  # noqa: BLE001
            # Agent failed -> fall through to the conversational brain.
            logger = __import__("logging").getLogger("treetiti.chat")
            logger.warning("agent routing fell back to brain: %s", exc)

    try:
        # Hard time budget: the brain must never make the chat stall. Run the
        # LLM in a thread and take a grounded reply if it overruns.
        import threading as _threading

        _brain_box: dict[str, object] = {}

        def _run_brain():
            try:
                system = _system_prompt(
                    payload.message,
                    payload.context,
                    _intel_for(payload.message, payload.context, db),
                    session.id,
                )
                # Pass 1 — draft. Stored immediately so a budget timeout still
                # returns a real (if unrefined) answer instead of nothing.
                draft = llm_complete(system, prompt, model=_chat_model())
                _brain_box["reply"] = draft
                # Pass 2 — critique + refine (Kimi-style deliberation, bounded).
                # Never raises: any provider failure keeps the draft.
                try:
                    _brain_box["reply"] = _deliberate_refine(prompt, draft, system)
                except Exception as exc:  # noqa: BLE001 — keep the draft
                    logger = __import__("logging").getLogger("treetiti.chat")
                    logger.warning("brain refinement skipped (%s) — serving draft", str(exc)[:120])
            except Exception as exc:  # noqa: BLE001
                _brain_box["error"] = exc

        _thread = _threading.Thread(target=_run_brain, daemon=True)
        _thread.start()
        _thread.join(timeout=_BRAIN_TIMEOUT)
        if "reply" in _brain_box:
            reply = _brain_box["reply"]
        elif "error" in _brain_box:
            raise _brain_box["error"]
        else:
            raise TimeoutError(f"brain LLM did not respond within {_BRAIN_TIMEOUT}s")
    except Exception as exc:  # noqa: BLE001
        # EVERY LLM provider down (offline sandbox, exhausted keys, CLI
        # missing) — the chat must still answer, never 500. Fall back to a
        # real, grounded reply from whatever the system knows.
        logger = __import__("logging").getLogger("treetiti.chat")
        logger.warning("brain LLM unavailable (%s) — serving grounded reply", str(exc)[:150])
        intel = _intel_for(payload.message, payload.context, db)
        memory = search_memory(payload.message, limit=3)
        if memory:
            learned = "\n".join(f"- {m['title']}: {m['content'][:200]}" for m in memory)
            reply = (
                "I can't reach a language model right now (all providers are "
                f"offline — {str(exc)[:120]}), so I'll answer from what I "
                f"already know.\n\nWhat the team remembered:\n{learned}"
            )
        else:
            reply = (
                "I can't reach a language model right now (all providers are "
                "offline), so I can't run a full analysis on that yet. The "
                "moment the model connection is back, ask me again and I'll "
                "handle it properly."
            )
        if "SYSTEM STATE" in intel:
            reply += f"\n\nCurrent system state:\n{intel[:800]}"

    history.append({"role": "assistant", "content": reply})
    session.messages = history
    db.commit()

    # Remember what the brain just told the user — assistant outcomes are
    # durable team knowledge too, not just user wishes.
    try:
        from app.memory.store import store_memory

        if len(reply) >= 60:
            store_memory(reply, kind="lesson", title=f"Assistant: {reply[:80]}", source="chat", tag="assistant")
    except Exception:  # noqa: BLE001
        pass  # memory is best-effort; never break the chat

    return ChatResponse(session_id=session.id, reply=reply, context=payload.context)


@router.get("/history/search")
def search_all_chat_history(
    user: Annotated[User, Depends(get_current_user)],
    q: str = "",
    limit: int = 5,
) -> list[dict]:
    """Search across ALL chat sessions — recall what was discussed anywhere."""
    from app.memory.store import search_chat_history

    return search_chat_history(q or "TREEtiti", exclude_session_id="", limit=limit)


@router.get("/pending")
def list_pending_decisions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    """Open agentic ask-back questions (survive browser closes)."""
    from app.models import PendingDecision

    rows = (
        db.query(PendingDecision)
        .filter(PendingDecision.status == "open")
        .order_by(PendingDecision.created_at.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "session_id": d.session_id,
            "question": d.question,
            "options": d.options,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in rows
    ]


@router.get("/sessions")
def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    context: str = "",
) -> list[dict]:
    q = db.query(ChatSession).filter(ChatSession.archived == False)  # noqa: E712
    if context:
        q = q.filter(ChatSession.context == context)
    sessions = q.order_by(ChatSession.updated_at.desc()).limit(50).all()
    return [
        {"id": s.id, "title": s.title, "project_id": s.project_id or ""} for s in sessions
    ]


class SessionRename(BaseModel):
    title: str


class SessionMove(BaseModel):
    project_id: str


@router.patch("/sessions/{session_id}/rename")
def rename_session(
    session_id: str,
    payload: SessionRename,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is empty")
    session.title = payload.title.strip()[:255]
    db.commit()
    return {"id": session.id, "title": session.title}


@router.post("/sessions/{session_id}/move")
def move_session(
    session_id: str,
    payload: SessionMove,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    from app.models import Project

    if payload.project_id:
        project = db.get(Project, payload.project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
    session.project_id = payload.project_id
    db.commit()
    return {"id": session.id, "project_id": session.project_id}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session.archived = True
    db.commit()
    return {"deleted": session_id}


@router.get("/sessions/{session_id}")
def session_detail(
    session_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "title": session.title,
        "context": session.context or "",
        "project_id": session.project_id or "",
        "messages": [_with_media(m) for m in (session.messages or [])],
    }


def _with_media(msg: dict) -> dict:
    """Attach a media card to any message whose text references a produced file."""
    out = dict(msg)
    if out.get("media"):
        return out
    content = out.get("content") or ""
    import re

    match = re.search(r"/media/[^\s)\"']+", content)
    if match:
        url = match.group(0)
        out["media"] = {
            "url": url,
            "kind": "video" if url.lower().endswith((".mp4", ".webm", ".mov")) else "image",
        }
    return out


@router.get("/health")
def chat_health(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Model health: consecutive failures per model (for the dashboard)."""
    return {"models": model_health()}


# Streaming endpoint for real-time token-by-token responses
@router.post("/stream")
def chat_stream(
    payload: ChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Stream chat response token by token via Server-Sent Events."""
    from fastapi.responses import StreamingResponse
    
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")

    if payload.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(title=payload.message[:80], messages=[], context=payload.context)
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

    def event_generator():
        # Send session_id first
        yield f"data: {{\"type\": \"session\", \"session_id\": \"{session.id}\"}}\n\n"
        
        try:
            from app.llm import llm_stream
            from app.memory.store import search_brand_memory, search_memory
            import json
            
            memory = search_brand_memory("TREEtiti brand services", limit=6)
            memory_block = "\n".join(f"- {m['title']}: {m['content']}" for m in memory) or "No brand memory stored yet."
            team_memory = search_memory(payload.message, limit=4)
            team_block = "\n".join(f"- [{m['kind']}] {m['title']}: {m['content'][:300]}" for m in team_memory) or "No stored memories match yet."
            
            context_block = ""
            if payload.context.startswith("customer:"):
                context_block = _customer_context_block(payload.context[len("customer:"):])
                persona = "Customer CEO"
            else:
                persona = "TREEtiti CEO"

            system = f"""You are the {persona} of TREEtiti's AI Marketing OS.

BRAND MEMORY:
{memory_block}

WHAT THE TEAM REMEMBERED:
{team_block}
{context_block}

Keep answers clear, direct and high-end."""

            # Real streaming (spec 18): yield each delta as the model emits it.
            full_response = ""
            for piece in llm_stream(system, prompt, model=_chat_model()):
                full_response += piece
                token_data = {"type": "token", "content": piece}
                yield f"data: {json.dumps(token_data)}\n\n"
            
            # Update session with the full response
            history.append({"role": "assistant", "content": full_response})
            session.messages = history
            db.commit()
            
            done_data = {"type": "done", "session_id": session.id, "reply": full_response}
            yield f"data: {json.dumps(done_data)}\n\n"
            
        except Exception as exc:
            error_data = {"type": "error", "message": str(exc)[:200]}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
