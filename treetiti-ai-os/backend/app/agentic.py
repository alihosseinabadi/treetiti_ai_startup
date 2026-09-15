"""TREEtiti AI Marketing OS — agentic controller (Phase 7).

The MAIN CHAT behaves like an autonomous workspace. The user describes the
outcome; TREEtiti figures out the workflow:

    USER REQUEST → INTENT → INSPECT CONTEXT → PLAN → ASK ONLY WHEN A HUMAN
    DECISION MATTERS → EXECUTE → DELEGATE → SAVE RESULTS → UPDATE MEMORY →
    REPORT PROFESSIONALLY → KEEP WORKING.

This module sits in the chat pipeline after the imperative OS-command layer and
before the conversational brain. For recognized intents (research, recurring
automation, multi-step workflows) it composes the existing backend — deep
research pipeline, missions, projects, task queue, memory, approvals — instead
of asking the user to click through separate pages.

Design rules from the spec:
- Never ask for a technical decision (model/api/agent/database). Decide.
- Ask only business/creative questions, persisted as ``PendingDecision`` rows
  that survive browser closes; answering resumes the workflow from its
  checkpoint (it never restarts).
- Auto-create a Project for substantial initiatives; infer whenever safe,
  otherwise one project-gate question.
- Never return a raw dump: complex jobs get a compact, professional message
  plus links/ids; full traces belong in System mode.
- Never 500: every branch degrades to a graceful reply (and ``run_agentic``
  itself is wrapped by the caller so a controller bug can't kill the chat).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger("treetiti.agentic")

# --------------------------------------------------------------------------
# Injectable seams (tests swap these for fakes; production keeps the default).
# --------------------------------------------------------------------------
_RESEARCH_RUNNER = None  # (topic, client, depth) -> structured report dict
_MISSION_ENQUEUE = None  # (mission_id, cycle_type) -> task_id | None


def _default_research(topic: str, client: str, depth: str) -> dict:
    from app.research import run_deep_research

    return run_deep_research(topic, client=client, depth=depth)


def _default_enqueue(mission_id: str, cycle_type: str) -> str | None:
    from app.core.task_queue import get_queue
    from app.missions import mission_runner

    queue = get_queue()
    queue.register("mission", mission_runner)  # idempotent
    task = queue.enqueue(
        "mission",
        label=f"mission: {mission_id} ({cycle_type})",
        payload={"mission_id": mission_id, "cycle_type": cycle_type},
    )
    return task.id


# --------------------------------------------------------------------------
# Intent model + classifier (deterministic, no extra LLM call).
# --------------------------------------------------------------------------

RESEARCH_VERBS = (
    "research",
    "analyze",
    "investigate",
    "deep dive",
    "deep-dive",
    "study",
    "scan",
    "track the competitor",
    "monitor the competitor",
    "watch the competitor",
    "competitor analysis",
    "competitor research",
    "market research",
    "look into",
    "find out about",
    "compare the",
    "compare competitors",
    "check out",
)

RECURRING_VERBS = (
    "create",
    "build",
    "set up",
    "setup",
    "make",
    "generate",
    "produce",
    "start",
    "launch",
    "track",
    "monitor",
)

WORKFLOW_WORDS = (
    "workflow",
    "pipeline",
    "automate",
    "automation",
    "then",
    "and then",
    "after that",
    "next,",
    "system",
    "engine",
)

CADENCE_DAILY = ("daily", "every day", "each day", "every morning", "every evening")
CADENCE_WEEKLY = ("weekly", "every week", "each week", "once a week")
CADENCE_3X = ("3x", "3 x", "three times", "3 times", "mon wed fri", "monday wednesday friday")

CHANNEL_OPTIONS = ["Here in TREEtiti", "Email", "Telegram", "Slack"]
CADENCE_OPTIONS = ["Daily", "Weekly"]

_URL_RE = re.compile(r"https?://[^\s]+", re.I)
_HANDLE_RE = re.compile(r"(?:instagram|linkedin|tiktok|youtube|facebook)\.com/\S+", re.I)
_FRESH_RE = re.compile(
    r"^\s*(research|analyze|investigate|create|build|set up|make|start|stop|run|"
    r"track|monitor|deep dive|write|generate|publish|forget|clear|pause|resume|"
    r"duplicate|rename|delete|move|remember|tell|teach|update)\b",
    re.I,
)
_YES = {"yes", "y", "yeah", "sure", "ok", "okay", "do it", "yes please", "go ahead"}
_NO = {"no", "n", "nope", "skip", "not now"}


@dataclass
class Intent:
    kind: str = "default"  # research | recurring | workflow | default
    topic: str = ""
    project_title: str = ""
    cadence: str = ""  # daily | weekly | 3x_week | ""
    sources: list[str] = field(default_factory=list)
    ask_cadence: bool = False
    ask_channel: bool = False
    channel: str = ""  # explicit delivery channel if stated
    raw: str = ""


def _detect_cadence(text: str) -> str:
    for kw in CADENCE_3X:
        if kw in text:
            return "3x_week"
    for kw in CADENCE_WEEKLY:
        if kw in text:
            return "weekly"
    for kw in CADENCE_DAILY:
        if kw in text:
            return "daily"
    return ""


def _detect_channel(text: str) -> str:
    low = text.lower()
    if "telegram" in low:
        return "Telegram"
    if "email" in low or "e-mail" in low:
        return "Email"
    if "slack" in low:
        return "Slack"
    return ""


def _strip_topic(text: str) -> str:
    """Pull the research subject out of an action phrase."""
    t = text.strip()
    verbs = (
        r"(?:please\s+)?(?:can you\s+)?(?:deep\s+dive\s+into|research|analyze|investigate|"
        r"study|scan|look into|find out about|track|monitor|watch|check out|"
        r"compare|audit)\s+"
    )
    t = re.sub(rf"^{verbs}", "", t, flags=re.I)
    t = re.sub(r"^(?:the|this|that|a|an|our|their|its)\s+", "", t, flags=re.I)
    t = re.sub(r"\s+(?:and|then|after that|next).*$", "", t, flags=re.I)
    t = re.sub(r"\s+(?:every|daily|weekly).*$", "", t, flags=re.I)
    t = re.sub(r"\s*\.$", "", t)
    return t.strip(" ,:;")

def _humanize(s: str) -> str:
    s = s.replace("_", " ").strip()
    return s[:1].upper() + s[1:] if s else s


def _project_title_from(message: str, kind: str, topic: str) -> str:
    m = re.search(r"(?:project|initiative)\s+(?:called\s+|named\s+|titled\s+)?[\"“']?([^\"”'.!?]+)", message, re.I)
    if m:
        return m.group(1).strip()[:120]
    base = _humanize(topic) if topic else None
    if kind == "research":
        return f"{base} — Research" if base else "Competitor Intelligence"
    if kind == "recurring":
        return f"Daily {base}" if base and not base.lower().startswith("daily ") else (base or "Daily Content Engine")
    return f"{base} — Intelligence & Content" if base else "Autonomous Content System"


def classify_request(message: str) -> Intent:
    """Deterministic intent classifier (no LLM). Returns an ``Intent``."""
    text = (message or "").strip()
    if not text:
        return Intent(raw=text)
    low = " " + text.lower() + " "

    sources = _URL_RE.findall(text) + _HANDLE_RE.findall(text)
    cadence = _detect_cadence(low)
    channel = _detect_channel(text)
    has_send = "send" in low and ("to me" in low or "every" in low)

    # Explicit primitive phrasing the OS command layer owns — let it handle it.
    if re.search(r"\b(create|set up|make)\s+a\s+schedule\b|\b(schedule|timetable|reminder)\b", low):
        return Intent(raw=text, cadence=cadence, channel=channel)

    has_research = any(v in low for v in RESEARCH_VERBS)
    has_recurring = cadence != "" and any(v in low for v in RECURRING_VERBS)
    has_workflow_marker = any(w in low for w in WORKFLOW_WORDS)
    multi_step = bool(re.search(r"\b(then|and then|after that|next,)\b", low))

    if has_recurring and has_research:
        kind = "workflow"
    elif has_workflow_marker and (has_research or has_recurring or multi_step or sources):
        kind = "workflow"
    elif has_recurring:
        kind = "recurring"
    elif has_research or sources:
        kind = "research"
    else:
        return Intent(raw=text, cadence=cadence, channel=channel)

    topic = _strip_topic(text)
    if not topic and sources:
        topic = sources[0]
    project_title = _project_title_from(message, kind, topic)

    ask_cadence = kind in ("recurring", "workflow") and not cadence and "every" not in low
    ask_channel = has_send and not channel

    return Intent(
        kind=kind,
        topic=topic,
        project_title=project_title,
        cadence=cadence,
        sources=sources,
        ask_cadence=ask_cadence,
        ask_channel=ask_channel,
        channel=channel,
        raw=text,
    )


# --------------------------------------------------------------------------
# Helpers: customer scoping, checkpoints, project auto-create.
# --------------------------------------------------------------------------

def _customer_of(session) -> str:
    ctx = session.context or ""
    return ctx[len("customer:") :] if ctx.startswith("customer:") else ""


def _checkpoint(session, name: str, detail: str = "") -> None:
    state = dict(session.session_state or {})
    checkpoints = list(state.get("checkpoints") or [])
    checkpoints.append({"name": name, "detail": detail, "at": datetime.now(timezone.utc).isoformat()})
    state["checkpoints"] = checkpoints[-20:]
    state["last_successful_turn"] = name
    session.session_state = state


def ensure_project(db, session, title: str, client: str, description: str = "") -> dict:
    """Find the active project by name (client-scoped) or create it. Returns dict."""
    from app.models import Project

    name = (title or "").strip()
    rows = db.query(Project).filter(Project.status != "archived").all()
    for p in rows:
        if (p.name or "").lower() == name.lower() and (p.client or "") == client:
            session.project_id = p.id
            return {"project": {"id": p.id, "name": p.name, "client": p.client}, "created": False}
    project = Project(name=name, client=client, description=description, status="active")
    db.add(project)
    db.commit()
    db.refresh(project)
    session.project_id = project.id
    return {"project": {"id": project.id, "name": project.name, "client": project.client}, "created": True}


# --------------------------------------------------------------------------
# Pending decisions (agentic ask-back, §18/§19/§49).
# --------------------------------------------------------------------------

def _open_decision(db, session_id: str):
    from app.models import PendingDecision

    return (
        db.query(PendingDecision)
        .filter(PendingDecision.session_id == session_id, PendingDecision.status == "open")
        .order_by(PendingDecision.created_at.desc())
        .first()
    )


def _ask(db, session, question: str, options: list[str], workflow: dict) -> dict:
    from app.models import PendingDecision

    decision = PendingDecision(
        session_id=session.id,
        question=question,
        options=options,
        status="open",
        workflow=workflow,
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return {
        "id": decision.id,
        "question": question,
        "options": options,
    }


def _normalize_cadence(answer: str) -> str:
    a = (answer or "").lower()
    for kw in CADENCE_3X:
        if kw in a:
            return "3x_week"
    for kw in CADENCE_WEEKLY:
        if kw in a:
            return "weekly"
    for kw in CADENCE_DAILY:
        if kw in a:
            return "daily"
    return ""


def _yes(answer: str) -> bool:
    return (answer or "").strip().lower() in _YES


# --------------------------------------------------------------------------
# Mission building + execution.
# --------------------------------------------------------------------------

def _build_mission(
    db, session, *, name: str, goal: str, client: str, cadence: str, config: dict | None = None
):
    """Create an active mission (dedupe by name+client). Returns the Mission."""
    from app.models import Mission

    cadence = cadence if cadence in ("daily", "weekly") else "daily"
    cfg = dict(config or {})
    if cadence == "3x_week":
        cadence = "daily"
        cfg["cadence_detail"] = "3x_week"
    name = (name or "Daily Content Engine").strip()
    existing = db.query(Mission).filter(Mission.client == client, Mission.status != "archived").all()
    for m in existing:
        if (m.name or "").lower() == name.lower():
            m.config = {**(m.config or {}), **cfg}
            db.commit()
            return m
    mission = Mission(
        name=name,
        client=client,
        goal=goal[:2000],
        cadence=cadence,
        config=cfg,
        workspace={"revealed": []},
        status="active",
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


def _enqueue_mission_cycle(mission_id: str, cycle_type: str) -> str | None:
    try:
        if _MISSION_ENQUEUE is not None:
            return _MISSION_ENQUEUE(mission_id, cycle_type)
        return _default_enqueue(mission_id, cycle_type)
    except Exception as exc:  # noqa: BLE001 — background work must not break chat
        logger.warning("mission cycle enqueue failed for %s: %s", mission_id, exc)
        return None


def _save_research_memory(topic: str, summary: str) -> None:
    try:
        from app.memory.store import store_memory

        store_memory(
            content=summary[:1500],
            kind="research",
            title=f"Research: {topic}",
            source="agentic",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("research memory save failed: %s", exc)


# --------------------------------------------------------------------------
# Workflow execution.
# --------------------------------------------------------------------------

def _run_research(intent: Intent, session, db, client: str) -> dict:
    topic = intent.topic or "market research"
    try:
        if _RESEARCH_RUNNER is not None:
            result = _RESEARCH_RUNNER(topic, client, "deep")
        else:
            result = _default_research(topic, client, "deep")
    except Exception as exc:  # noqa: BLE001
        logger.warning("research runner failed: %s", exc)
        return {
            "handled": True,
            "reply": (
                "I couldn't complete the research run right now — the source "
                f"layer is unavailable ({exc}). I've kept your request and will "
                "retry it. Nothing else was affected."
            ),
            "checkpoints": ["research-failed"],
        }

    from app.models import ResearchReport

    report = ResearchReport(
        client=client,
        topic=result.get("topic", topic),
        depth=result.get("depth", "deep"),
        status="completed",
        summary=result.get("summary", ""),
        findings=result.get("findings", []),
        insights=result.get("insights", []),
        recommendations=result.get("recommendations", []),
        sources=result.get("sources", []),
        report_md=result.get("report_md", ""),
        meta={
            "synthesis": result.get("synthesis", "template"),
            "page_count": result.get("page_count", 0),
            "took_ms": result.get("took_ms", 0),
        },
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    _checkpoint(session, "research", topic)
    _save_research_memory(topic, result.get("summary", ""))

    findings = (result.get("findings") or [])[:3]
    bullets = "\n".join(
        f"- {f.get('claim', '')[:160]}{' (' + str(f.get('confidence', '')) + ')' if f.get('confidence') else ''}"
        for f in findings
        if f.get("claim")
    )
    reply = (
        f"Research complete — I saved a full report to the project.\n\n"
        f"{result.get('summary', '')[:500]}\n"
    )
    if bullets:
        reply += f"\nTop findings:\n{bullets}\n"
    reply += f"\nSources scanned: {result.get('page_count', 0)} · Report `{report.id}` — open it from Research."
    return {
        "handled": True,
        "reply": reply,
        "report_id": report.id,
        "checkpoints": list((session.session_state or {}).get("checkpoints") or []),
    }


def _do_recurring(intent: Intent, session, db, client: str) -> dict:
    if intent.ask_cadence:
        pd = _ask(
            db, session,
            "How often should this run?",
            CADENCE_OPTIONS,
            {
                "type": "cadence",
                "name": intent.project_title,
                "goal": intent.raw,
                "client": client,
                "config": {"sources": intent.sources, "delivery": intent.channel},
            },
        )
        return {
            "handled": True,
            "reply": (
                f"I'll set up **{intent.project_title}** as an ongoing automation. "
                f"One quick decision: how often should it run?"
            ),
            "pending_decision": pd,
        }

    if intent.ask_channel:
        pd = _ask(
            db, session,
            "Where should I send the results?",
            CHANNEL_OPTIONS,
            {
                "type": "channel",
                "name": intent.project_title,
                "goal": intent.raw,
                "client": client,
                "cadence": intent.cadence,
                "config": {"sources": intent.sources},
            },
        )
        return {
            "handled": True,
            "reply": "Done — and where should I deliver it each time?",
            "pending_decision": pd,
        }

    mission = _build_mission(
        db, session,
        name=intent.project_title,
        goal=intent.raw,
        client=client,
        cadence=intent.cadence or "daily",
        config={"sources": intent.sources, "delivery": intent.channel or "treetiti"},
    )
    _checkpoint(session, "mission", mission.name)
    task_id = _enqueue_mission_cycle(mission.id, "daily")
    label = intent.cadence or "daily"
    reply = (
        f"Done. I created the **{mission.name}** mission — it runs {label} and "
        f"delivers to {intent.channel or 'TREEtiti'}."
    )
    if task_id:
        reply += f"\n\nThe first cycle is running now (`{task_id}`) — live stages stream below."
    return {"handled": True, "reply": reply, "mission_id": mission.id, "task_id": task_id}


def _do_workflow(intent: Intent, session, db, client: str) -> dict:
    # Substantial initiative → auto-create a project (§4 infer-when-safe).
    project = ensure_project(
        db, session,
        title=intent.project_title,
        client=client,
        description=f"Created from chat: {intent.raw[:300]}",
    )
    _checkpoint(session, "project", project["project"]["name"])

    recurring_like = intent.cadence or intent.ask_channel
    if recurring_like and not intent.ask_cadence:
        if intent.ask_channel:
            pd = _ask(
                db, session,
                "Where should I deliver the results?",
                CHANNEL_OPTIONS,
                {
                    "type": "channel",
                    "name": intent.project_title,
                    "goal": intent.raw,
                    "client": client,
                    "cadence": intent.cadence or "daily",
                    "config": {"sources": intent.sources},
                },
            )
            return {
                "handled": True,
                "reply": "I've set up the project — one more thing: where should the content go?",
                "pending_decision": pd,
                "project_id": project["project"]["id"],
            }
        mission = _build_mission(
            db, session,
            name=intent.project_title,
            goal=intent.raw,
            client=client,
            cadence=intent.cadence or "daily",
            config={"sources": intent.sources, "delivery": intent.channel or "treetiti"},
        )
        _checkpoint(session, "mission", mission.name)
        task_id = _enqueue_mission_cycle(mission.id, "daily")
        reply = (
            f"On it. I've set up the **{mission.name}** project + mission "
            f"({intent.cadence or 'daily'})."
        )
        if task_id:
            reply += f"\n\nThe first cycle is running now (`{task_id}`) — live stages stream below."
        return {
            "handled": True,
            "reply": reply,
            "mission_id": mission.id,
            "task_id": task_id,
            "project_id": project["project"]["id"],
        }

    if intent.ask_cadence:
        pd = _ask(
            db, session,
            "How often should this automation run?",
            CADENCE_OPTIONS,
            {
                "type": "cadence",
                "name": intent.project_title,
                "goal": intent.raw,
                "client": client,
                "config": {"sources": intent.sources, "project_id": project["project"]["id"]},
            },
        )
        return {
            "handled": True,
            "reply": f"Project **{intent.project_title}** is ready. How often should it run?",
            "pending_decision": pd,
            "project_id": project["project"]["id"],
        }

    # One-shot multi-step brief → delegate the whole team (CEO on the queue).
    from app.core.task_queue import agent_runner, get_queue

    queue = get_queue()
    queue.register("agent", agent_runner)  # idempotent
    brief = (
        f"You are running a project. PROJECT: {project['project']['name']}. "
        f"USER REQUEST: {intent.raw}"
    )
    task = queue.enqueue(
        "agent",
        label=f"ceo: {intent.raw[:70]}",
        payload={"agent": "ceo", "kwargs": {"brief": brief}},
    )
    _checkpoint(session, "delegated", task.id)
    reply = (
        f"Understood. I've set up **{project['project']['name']}** and activated "
        f"the team on your brief.\n\nTask `{task.id}` is running — live stages "
        "stream below."
    )
    return {
        "handled": True,
        "reply": reply,
        "task_id": task.id,
        "project_id": project["project"]["id"],
    }


# --------------------------------------------------------------------------
# Decision resume (§18/§49): answer a question, continue from the checkpoint.
# --------------------------------------------------------------------------

def _resume_workflow(decision, answer: str, session, db) -> str:
    wf = decision.workflow or {}
    wtype = wf.get("type")
    client = wf.get("client", "")
    name = wf.get("name") or "Daily Content Engine"
    goal = wf.get("goal") or ""

    if wtype == "cadence":
        cadence = _normalize_cadence(answer) or wf.get("cadence") or "daily"
        mission = _build_mission(
            db, session,
            name=name,
            goal=goal,
            client=client,
            cadence=cadence,
            config=dict(wf.get("config") or {}),
        )
        _checkpoint(session, "mission", mission.name)
        task_id = _enqueue_mission_cycle(mission.id, "daily")
        base = f"Got it — {cadence}. I've set up **{mission.name}** to run {cadence}."
        if task_id:
            base += f"\n\nThe first cycle is running now (`{task_id}`) — live stages stream below."
        return base

    if wtype == "channel":
        config = dict(wf.get("config") or {})
        config["delivery"] = answer
        mission = _build_mission(
            db, session,
            name=name,
            goal=goal,
            client=client,
            cadence=wf.get("cadence") or "daily",
            config=config,
        )
        _checkpoint(session, "mission", mission.name)
        task_id = _enqueue_mission_cycle(mission.id, "daily")
        base = f"Got it — I'll deliver via **{answer}**. **{mission.name}** is live."
        if task_id:
            base += f"\n\nThe first cycle is running now (`{task_id}`) — live stages stream below."
        return base

    if wtype == "project_gate":
        if _yes(answer):
            pid = wf.get("project_id")
            if pid:
                from app.models import Project

                p = db.get(Project, pid)
                if p is not None:
                    session.project_id = p.id
                    return f"Done — working inside **{p.name}**. Anything specific first?"
            return "Done — I've got it. What would you like to start with?"
        return "OK — continuing without a project. What's the first move?"

    return "Got it — noted. Where should we pick up?"


def _fresh_command(text: str) -> bool:
    return bool(_FRESH_RE.match(text or ""))


def _answer_decision(decision, answer: str, session, db) -> dict:
    from app.models import PendingDecision

    decision.answer = (answer or "").strip()
    decision.status = "answered"
    decision.answered_at = datetime.now(timezone.utc)
    db.commit()
    try:
        reply = _resume_workflow(decision, decision.answer, session, db)
    except Exception as exc:  # noqa: BLE001
        logger.warning("decision resume failed: %s", exc)
        reply = f"Got it — “{decision.answer}”. I'll keep working from here."
    return {
        "handled": True,
        "reply": reply,
        "checkpoints": list((session.session_state or {}).get("checkpoints") or []),
    }


# --------------------------------------------------------------------------
# Public entry point.
# --------------------------------------------------------------------------

def run_agentic(message: str, session, db, confirm: bool = False) -> dict | None:
    """Handle an agentic message. Returns a chat-result dict or None to fall
    through to the conversational brain."""
    text = (message or "").strip()
    if not text:
        return None

    try:
        # 1) Pending decision? The user's message is likely the answer.
        decision = _open_decision(db, session.id)
        if decision is not None and not _fresh_command(text):
            return _answer_decision(decision, text, session, db)
        if decision is not None:
            decision.status = "expired"
            db.commit()

        # 2) Classify the intent.
        intent = classify_request(text)
        if intent.kind == "default":
            return None  # conversational -> the brain

        client = _customer_of(session)

        if intent.kind == "research":
            return _run_research(intent, session, db, client)
        if intent.kind == "recurring":
            return _do_recurring(intent, session, db, client)
        if intent.kind == "workflow":
            return _do_workflow(intent, session, db, client)
        return None
    except Exception as exc:  # noqa: BLE001 — the controller must never 500 the chat
        logger.warning("agentic controller degraded: %s", exc)
        return {
            "handled": True,
            "reply": (
                "I hit a snag while setting that up, but nothing is lost — "
                f"({exc}). Tell me to continue and I'll pick it up from here."
            ),
            "checkpoints": ["degraded"],
        }