"""TREEtiti AI Marketing OS — OS Command Layer.

The chat agent's REAL OPERATING POWERS: natural language maps to real
backend operations (create/delete projects, sessions, tasks, missions;
save/forget memory; generate media; control missions), not just answers.

    dispatch_os_command(message, context, session_id, db, confirm=False)
        -> dict | None

Returns a structured result (or None when the message is not an OS command,
so the conversational brain can handle it):

    {
        "handled": True,
        "reply": "...",
        "confirmation_required": False,   # destructive ops ask ONE confirm
        "confirm_action": "delete_session",
        "confirm_payload": {"session_id": "..."},
        "task_id": "..."                   # when a background task is started
    }

Confirmation flow: a destructive command ("delete this chat") returns
confirmation_required=True with a payload; the UI shows [Delete]/[Cancel];
confirming re-sends the message with confirm=True and the op executes.
"""

from __future__ import annotations

import re

from app.core.task_queue import get_queue

# ---------------------------------------------------------------------------
# Intent patterns: (compiled regex, action name). Order matters — first match wins.
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # ---- sessions ----------------------------------------------------------
    (re.compile(r"\b(delete|remove|kill|destroy|wipe)\s+(this|the|that)\s+(chat|conversation|session)\b", re.I), "delete_session"),
    (re.compile(r"\b(delete|remove|kill|destroy|wipe)\s+(all|my)\s+(chats?|conversations?|sessions?)\b", re.I), "delete_all_sessions"),
    (re.compile(r"\b(delete|remove|kill|destroy|wipe)\s+(chat|conversation)\s+(sessions?|histories?|threads?)\s*$", re.I), "delete_session"),
    (re.compile(r"\b(delete|remove|kill|destroy|wipe)\s+(chats?|conversations?|sessions?)\s*$", re.I), "delete_session"),
    (re.compile(r"\b(clear|wipe)\s+(this\s+|the\s+|the\s+entire\s+)?(chat|conversation|session|history|context)\s*$", re.I), "delete_session"),
    (re.compile(r"\b(start\s+a\s+new|start\s+fresh|new)\s+(chat|conversation|session)\b", re.I), "reset_session"),
    (re.compile(r"^(reset|start\s+fresh|clean\s+slate|clear\s+everything)\b", re.I), "reset_session"),
    (re.compile(r"\b(rename)\s+(this|the)\s+(chat|conversation|session)\s+(to|as)?\s+(.+)$", re.I), "rename_session"),
    (re.compile(r"\b(move)\s+(this|the)\s+(chat|conversation|session)\s+(in)?\s*(to|into)\s+(.+)$", re.I), "move_session"),
    (re.compile(r"\b(show|list)\s+(my\s+)?(chats|conversations|sessions)\b", re.I), "list_sessions"),
    # ---- projects ----------------------------------------------------------
    (re.compile(r"\b(create|make|start|new)\s+(a\s+)?project\s+(called|named|for)?\s*(.+)$", re.I), "create_project"),
    (re.compile(r"\b(show|list)\s+(my\s+)?(all\s+)?projects\b", re.I), "list_projects"),
    (re.compile(r"\b(delete|archive|remove)\s+(the\s+)?project\s+(.+)$", re.I), "delete_project"),
    (re.compile(r"\b(what\s+happened|status|how\s+is)\s+(with\s+)?(the\s+)?project\s+(.+)$", re.I), "project_status"),
    # ---- missions / campaigns ---------------------------------------------
    (re.compile(r"\b(pause|stop|hold|cancel|halt)\s+(all|every|the\s+active|all\s+active)\s+(missions?|campaigns?|automations?|schedules?)\b", re.I), "pause_all_missions"),
    (re.compile(r"\b(stop|halt|pause|kill|shut\s+down|turn\s+off)\s+(everything|all\s+agents|all\s+background\s+work|all\s+running\s+tasks|the\s+agents)\s*$", re.I), "stop_everything"),
    (re.compile(r"\b(archive|park|pause)\s+(the|this|current|all)\s+(current\s+)?(work|drafts?|production|output|deliverables?)\s*$", re.I), "archive_current_work"),
    (re.compile(r"\b(create|make|start)\s+(a\s+)?(mission|campaign)\s+(called|named|for)?\s*(.+)$", re.I), "create_mission"),
    (re.compile(r"\b(pause|hold)\s+(the\s+)?(mission|campaign)\b", re.I), "pause_mission"),
    (re.compile(r"\b(resume|continue|unpause|restart)\s+(the\s+)?(mission|campaign)\b", re.I), "resume_mission"),
    (re.compile(r"\b(stop|cancel)\s+(the\s+)?(mission|campaign)\b", re.I), "stop_mission"),
    (re.compile(r"\b(delete|remove)\s+(the\s+)?(mission|campaign)\b", re.I), "delete_mission"),
    (re.compile(r"\b(pause|resume|start|stop|run)\s+(the\s+)?mission\s+(.+)$", re.I), "mission_action_named"),
    (re.compile(r"\b(rename)\s+(the\s+)?(mission|campaign)\s+(named\s+|called\s+)?(.+?)\s+(to|as)\s+(.+)$", re.I), "rename_mission"),
    (re.compile(r"\b(duplicate|copy)\s+(the\s+)?(mission|campaign)\b", re.I), "duplicate_mission"),
    # ---- tasks -------------------------------------------------------------
    (re.compile(r"\b(create|make|enqueue)\s+(a\s+)?task\s+(for|to|about)?\s*(.+)$", re.I), "create_task"),
    (re.compile(r"\b(give|send|hand|assign|reassign|route)\s+(this|it|that|the\s+task|the\s+job)\s+(to|over\s+to)\s+(the\s+)?([\w\-]+)\s+agent\b", re.I), "reassign_task"),
    (re.compile(r"\b(run|retry|redo|re-run|try)\s+(the\s+)?(failed\s+)?(task|job|run|research)(?:\s+(again|once\s+more))?\b", re.I), "retry_failed_task"),
    (re.compile(r"\b(stop|cancel)\s+(the\s+)?(task|job|run)\s+([a-f0-9]{4,})$", re.I), "cancel_task"),
    (re.compile(r"\b(stop|cancel)\s+(the\s+)?(task|job|run)\b", re.I), "cancel_latest_task"),
    # ---- schedules ----------------------------------------------------------
    (re.compile(r"\b(delete|archive|remove)\s+(the\s+)?(schedule|scheduled\s+task|scheduled\s+job|automation)\s+(named\s+|called\s+)?(.+)$", re.I), "delete_schedule"),
    (re.compile(r"\b(rename)\s+(the\s+)?(schedule|scheduled\s+task|automation)\s+(named\s+|called\s+)?(.+?)\s+(to|as)\s+(.+)$", re.I), "rename_schedule"),
    (re.compile(r"\b(duplicate|copy)\s+(the\s+)?(schedule|scheduled\s+task|automation)\b", re.I), "duplicate_schedule"),
    (re.compile(r"\b(run|execute|trigger)\s+it\s+now\b", re.I), "run_schedule_now"),
    (re.compile(r"\b(pause|resume|enable|disable|stop|start|run)\s+(the\s+)?(schedule|scheduled\s+task|scheduled\s+job|automation)\b", re.I), "schedule_action"),
    (re.compile(r"\b(run|do|create|make)\s+(?P<subject>.+?)\s+(every|daily|each)\s+(?P<period>morning|afternoon|evening|night|day|week|weekday)\s*(at\s+)?(?P<time>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\b", re.I), "create_schedule"),
    # ---- memory ------------------------------------------------------------
    (re.compile(r"\b(remember|note|store)\s+that\s+(.+)$", re.I), "save_memory"),
    (re.compile(r"\b(remember|note|store)\s+(.+)$", re.I), "save_memory"),
    (re.compile(r"\b(forget|delete|remove)\s+(that\s+)?(memory|that|it)\b", re.I), "delete_memory"),
    (re.compile(r"\b(what\s+do\s+you\s+remember|search\s+memory|what\s+do\s+we\s+know)\s+(about|regarding)?\s*(.+)$", re.I), "search_memory"),
    # ---- media -------------------------------------------------------------
    (re.compile(r"\b(create|make|generate)\s+(an?\s+)?(image|picture|photo|visual)\s+(of|about|showing)?\s*(.+)$", re.I), "create_image"),
    (re.compile(r"\b(create|make|generate)\s+(a\s+)?(video|film|reel|clip)\s+(of|about|showing)?\s*(.+)$", re.I), "create_video"),
    # ---- agents: custom instructions (Phase 6) -----------------------------
    (re.compile(r"\b(update|change|set|edit)\s+(the\s+)?([\w\-]+)\s+agent\b\s*:\s*(?P<inst>.*)$", re.I), "update_agent"),
    (re.compile(r"\b(teach|train)\s+(the\s+)?([\w\-]+)\s+agent\s+(to\s+|that\s+|:)\s*(?P<inst>.+)$", re.I), "update_agent"),
    (re.compile(r"\b(make|tell)\s+(the\s+)?([\w\-]+)\s+agent\s+(to\s+|always\s+|never\s+|say\s+|write\s+|use\s+)(?P<inst>.+)$", re.I), "update_agent"),
    (re.compile(r"\b(what|show|list)\s+(did\s+you\s+tell|are|do\s+you\s+have)\s+(the\s+)?([\w\-]+)\s+agent(?:\s+(?:instructions|directives|rules))?\s*$", re.I), "show_agent_instructions"),
    (re.compile(r"\b(forget|clear|remove|delete)\s+(the\s+)?([\w\-]+)\s+agent\s+(?:instructions|directives|rules)\s*$", re.I), "clear_agent_instructions"),
    # ---- summaries (fall back to intel in chat.py when these are questions) --
    (re.compile(r"\b(what\s+did\s+we\s+do|summary|daily\s+summary|digest)\b", re.I), "daily_summary"),
]

# Destructive operations require one confirmation step.
_DESTRUCTIVE = {
    "delete_session",
    "delete_all_sessions",
    "delete_project",
    "delete_mission",
    "stop_mission",
    "cancel_task",
    "cancel_latest_task",
    "delete_memory",
    "delete_schedule",
}


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip(" .!?")


def _extract_after(match: re.Match[str]) -> str:
    """The trailing free-text capture (the subject) from a match."""
    value = ""
    for group in match.groups():
        if group:
            value = group
    return _clean(value)


def _customer_name(context: str) -> str:
    return context[len("customer:") :] if context.startswith("customer:") else ""


_AGENT_HINTS: dict[str, str] = {
    "instagram": "social_intel",
    "social": "social_intel",
    "competitor": "social_intel",
    "tiktok": "social_intel",
    "linkedin": "social_intel",
    "youtube": "social_intel",
    "trend": "content_hunter",
    "content": "content_hunter",
    "opportunity": "content_hunter",
    "news": "content_hunter",
    "research": "market_research",
    "search": "market_research",
    "analytics": "analytics",
    "report": "analytics",
    "metric": "analytics",
    "strateg": "strategist",
    "plan": "strategist",
}


def _agent_for(subject: str) -> str:
    subj = (subject or "").lower()
    for kw, agent in _AGENT_HINTS.items():
        if kw in subj:
            return agent
    return "content"


def _resolve_agent(raw: str) -> str | None:
    """Resolve a spoken agent name to a real registry key (hints + fallback).

    Mirrors the reassign-task resolution: exact key first, then a hint keyword,
    then a loose keyword scan. Returns None when nothing matches so callers can
    reply "I don't know an agent called X".
    """
    from app.agents import get_agent

    value = (raw or "").strip().lower().rstrip(".")
    if not value:
        return None
    try:
        get_agent(value)
        return value
    except KeyError:
        pass
    hint = _AGENT_HINTS.get(value)
    if hint:
        try:
            get_agent(hint)
            return hint
        except KeyError:
            return None
    loose = _agent_for(value)
    if loose != "content":
        try:
            get_agent(loose)
            return loose
        except KeyError:
            return None
    return None


def _parse_time(raw: str) -> str:
    t = re.sub(r"\s+", "", (raw or "").lower())
    if not t:
        return "09:00"
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", t)
    if not m:
        return "09:00"
    hour, minute, meridiem = m.groups()
    h = int(hour)
    minute_int = int(minute or 0)
    if meridiem:
        if meridiem == "pm" and h < 12:
            h += 12
        if meridiem == "am" and h == 12:
            h = 0
    return f"{h:02d}:{minute_int:02d}"


def dispatch_os_command(
    message: str,
    context: str,
    session_id: str,
    db,
    confirm: bool = False,
) -> dict | None:
    """Return the OS command result dict, or None if this is not an OS command."""
    text = _clean(message)
    if not text:
        return None

    action: str | None = None
    match: re.Match[str] | None = None
    for pattern, name in _PATTERNS:
        m = pattern.search(text)
        if m:
            action, match = name, m
            break

    if action is None:
        return None

    from app.models import ChatSession, Mission, Project, ScheduledJob

    queue = get_queue()
    client = _customer_name(context)

    # ---- sessions ----------------------------------------------------------
    if action == "delete_session":
        if not confirm:
            return _confirm("delete_session", {"session_id": session_id},
                            "Delete this conversation? This can't be undone.")
        sess = db.get(ChatSession, session_id)
        if sess is None:
            return _reply("That conversation no longer exists.")
        sess.archived = True
        db.commit()
        out = _reply("Done. I deleted this conversation.")
        out["chat_cleared"] = True
        return out

    if action == "delete_all_sessions":
        if not confirm:
            return _confirm("delete_all_sessions", {},
                            "Delete ALL conversations? This can't be undone.")
        rows = (
            db.query(ChatSession)
            .filter(ChatSession.context == context, ChatSession.archived == False)  # noqa: E712
            .all()
        )
        for sess in rows:
            sess.archived = True
        db.commit()
        count = len(rows)
        out = _reply(f"Done. I deleted {count} conversation{'s' if count != 1 else ''}.")
        out["chat_cleared"] = True
        return out

    if action == "reset_session":
        # "reset / start fresh / start a new conversation": archive the current
        # session so the next message is treated as a brand new conversation.
        sess = db.get(ChatSession, session_id)
        if sess is not None:
            sess.archived = True
            db.commit()
        out = _reply(
            "Done — I cleared this conversation. The next message starts a fresh chat."
        )
        out["chat_cleared"] = True
        return out

    if action == "rename_session":
        new_name = _extract_after(match)
        if not new_name:
            return _reply("Rename to what?")
        sess = db.get(ChatSession, session_id)
        if sess is None:
            return _reply("That conversation no longer exists.")
        sess.title = new_name[:255]
        db.commit()
        return _reply(f"Done. I renamed this conversation to “{new_name}”.")

    if action == "move_session":
        project_name = _extract_after(match)
        proj = db.query(Project).filter(Project.name.ilike(project_name)).first()
        if proj is None:
            return _reply(
                f"I couldn't find a project named “{project_name}”. "
                f"Say “show projects” to see what exists."
            )
        sess = db.get(ChatSession, session_id)
        if sess is None:
            return _reply("That conversation no longer exists.")
        sess.project_id = proj.id
        db.commit()
        return _reply(f"Done. I moved this conversation into project “{proj.name}”.")

    if action == "list_sessions":
        rows = (
            db.query(ChatSession)
            .filter(ChatSession.context == context, ChatSession.archived == False)  # noqa: E712
            .order_by(ChatSession.updated_at.desc())
            .limit(25)
            .all()
        )
        if not rows:
            return _reply("You don't have any conversations yet.")
        listing = "\n".join(f"- {r.title}" for r in rows)
        return _reply(f"Your conversations:\n{listing}")

    # ---- projects ----------------------------------------------------------
    if action == "create_project":
        name = _extract_after(match)
        name = re.sub(r"^(called|named|for)\s+", "", name, flags=re.I).strip()
        if not name:
            return _reply("What should the project be called?")
        existing = db.query(Project).filter(Project.name.ilike(name)).first()
        if existing:
            return _reply(f"A project named “{name}” already exists.")
        proj = Project(name=name[:255], client=client, status="active")
        db.add(proj)
        db.commit()
        return _reply(f"Done. I created project “{name}”.")

    if action == "list_projects":
        q = db.query(Project)
        if client:
            q = q.filter(Project.client == client)
        rows = q.order_by(Project.created_at.desc()).limit(25).all()
        if not rows:
            return _reply("No projects yet. Say “create a project called …” to start one.")
        listing = "\n".join(f"- {p.name} [{p.status}]" for p in rows)
        return _reply(f"Projects:\n{listing}")

    if action == "delete_project":
        name = _extract_after(match)
        if not confirm:
            return _confirm("delete_project", {"name": name},
                            f"Delete project “{name}”? This can't be undone.")
        proj = db.query(Project).filter(Project.name.ilike(name)).first()
        if proj is None:
            return _reply(f"I couldn't find a project named “{name}”.")
        proj.status = "archived"
        db.commit()
        return _reply(f"Done. I archived project “{name}”.")

    if action == "project_status":
        return None  # handled by the intel layer in chat.py

    # ---- missions / campaigns ---------------------------------------------
    if action == "create_mission":
        name = _extract_after(match)
        name = re.sub(r"^(called|named|for)\s+", "", name, flags=re.I).strip()
        if not name:
            return _reply("What should the mission be called?")
        mission = Mission(name=name[:255], client=client, goal="", status="active")
        db.add(mission)
        db.commit()
        return _reply(
            f"Done. I created mission “{mission.name}”. Say “start the mission” "
            f"to launch its first cycle, or tell me its goal to shape it."
        )

    def _first_mission() -> Mission | None:
        q = db.query(Mission)
        if client:
            q = q.filter(Mission.client == client)
        return q.order_by(Mission.updated_at.desc()).first()

    def _all_missions() -> list[Mission]:
        q = db.query(Mission)
        if client:
            q = q.filter(Mission.client == client)
        return q.filter(Mission.status != "archived").order_by(Mission.updated_at.desc()).all()

    if action == "pause_all_missions":
        missions = _all_missions()
        active = [m for m in missions if m.status == "active"]
        if not active:
            return _reply("Nothing active to pause — all missions are already paused or stopped.")
        for m in active:
            m.status = "paused"
        db.commit()
        names = " | ".join(f"- **{m.name}** → paused" for m in active)
        return _reply(f"Done. I paused {len(active)} active mission{'s' if len(active) != 1 else ''}:\n{names}")

    if action == "stop_everything":
        missions = _all_missions()
        active = [m for m in missions if m.status == "active"]
        for m in active:
            m.status = "paused"
        running = [t for t in queue.list(limit=50) if t.status in ("queued", "running")]
        for t in running:
            queue.cancel(t.id)
        db.commit()
        lines: list[str] = ["Stopped everything now."]
        if active:
            lines.append(f"- Paused {len(active)} active mission{'s' if len(active) != 1 else ''}")
        if running:
            lines.append(f"- Cancelled {len(running)} running/queued task{'s' if len(running) != 1 else ''}")
        if not active and not running:
            lines.append("- Nothing was active — no missions running, no tasks queued.")
        return _reply("\n".join(lines))

    if action == "archive_current_work":
        # Pause all missions + stop any running drafts so the pipeline goes quiet.
        missions = _all_missions()
        active = [m for m in missions if m.status == "active"]
        for m in active:
            m.status = "paused"
        running = [t for t in queue.list(limit=50) if t.status in ("queued", "running")]
        for t in running:
            queue.cancel(t.id)
        db.commit()
        lines: list[str] = ["Archived the current work — production is quiet now."]
        if active:
            lines.append(f"- Paused {len(active)} active mission{'s' if len(active) != 1 else ''}")
        if running:
            lines.append(f"- Cancelled {len(running)} in-flight task{'s' if len(running) != 1 else ''}")
        if not active and not running:
            lines.append("- Nothing was running.")
        return _reply("\n".join(lines))

    if action == "pause_mission":
        mission = _first_mission()
        if mission is None:
            return _reply("No active mission to pause.")
        mission.status = "paused"
        db.commit()
        return _reply(f"Done. Mission “{mission.name}” is paused — background cycles are stopped.")

    if action == "resume_mission":
        mission = _first_mission()
        if mission is None:
            return _reply("No mission to resume.")
        mission.status = "active"
        db.commit()
        return _reply(f"Done. Mission “{mission.name}” is active again — cycles resume on schedule.")

    if action == "stop_mission":
        if not confirm:
            return _confirm("stop_mission", {},
                            "Stop the current mission? Background cycles will be halted.")
        mission = _first_mission()
        if mission is None:
            return _reply("No mission to stop.")
        mission.status = "paused"
        db.commit()
        return _reply(f"Done. I stopped mission “{mission.name}”.")

    if action == "delete_mission":
        if not confirm:
            return _confirm("delete_mission", {},
                            "Delete the current mission? This can't be undone.")
        mission = _first_mission()
        if mission is None:
            return _reply("No mission to delete.")
        name = mission.name
        mission.status = "archived"
        db.commit()
        return _reply(f"Done. I deleted mission “{name}”.")

    if action == "mission_action_named":
        verb = (match.group(1) or "").lower()
        name = _extract_after(match)
        q = db.query(Mission)
        if client:
            q = q.filter(Mission.client == client)
        mission = q.filter(Mission.name.ilike(name)).first()
        if mission is None:
            return _reply(f"I couldn't find a mission named “{name}”.")
        if verb in ("pause", "stop"):
            mission.status = "paused"
        elif verb == "resume":
            mission.status = "active"
        db.commit()
        verbed = "paused" if verb in ("pause", "stop") else "resumed"
        return _reply(f"Done. Mission “{mission.name}” is {verbed}.")

    if action == "rename_mission":
        groups = match.groups()
        old = _clean(groups[-3] if len(groups) >= 3 else "")
        new = _clean(groups[-1] if groups else "")
        old = re.sub(r"^(named|called|to|as)\s+", "", old, flags=re.I).strip()
        if not old or not new:
            return _reply("Rename which mission to what? (e.g. “rename the mission X to Y”)")
        q = db.query(Mission)
        if client:
            q = q.filter(Mission.client == client)
        mission = q.filter(Mission.name.ilike(old)).first()
        if mission is None:
            return _reply(f"I couldn't find a mission named “{old}”.")
        mission.name = new[:255]
        db.commit()
        return _reply(f"Done. I renamed mission “{old}” to “{new}”.")

    if action == "duplicate_mission":
        q = db.query(Mission)
        if client:
            q = q.filter(Mission.client == client)
        mission = q.order_by(Mission.updated_at.desc()).first()
        if mission is None:
            return _reply("No mission to duplicate.")
        from app.models import Mission as MissionModel

        copy = MissionModel(
            name=f"{mission.name} (copy)",
            client=mission.client,
            goal=mission.goal,
            cadence=mission.cadence,
            daily_time=mission.daily_time,
            weekly_day=mission.weekly_day,
            config=dict(mission.config or {}),
            workspace={"revealed": []},
            status="paused",
        )
        db.add(copy)
        db.commit()
        return _reply(
            f"Done. I duplicated mission “{mission.name}” as “{copy.name}” "
            f"(paused — resume it when you're ready)."
        )

    # ---- tasks -------------------------------------------------------------
    if action == "create_task":
        subject = _extract_after(match)
        subject = re.sub(r"^(for|to|about)\s+", "", subject, flags=re.I).strip()
        if not subject:
            return _reply("What should the task be?")
        agent_key = subject
        m = re.match(r"^(?:the\s+)?(\w[\w\-]*)\s+agent\b", subject, re.I)
        if m:
            agent_key = m.group(1)
        kwargs: dict = {}
        if context.startswith("customer:"):
            from app.agents import get_agent
            import inspect

            try:
                sig = inspect.signature(get_agent(agent_key).run)
                if "extra_context" in sig.parameters:
                    from app.routers.chat import _customer_context_block

                    kwargs["extra_context"] = (
                        f" This work is for client `{client}`. {_customer_context_block(client)}"
                    )
            except Exception:  # noqa: BLE001 — agent signature best-effort
                pass
        task = queue.enqueue("agent", label=f"task: {subject[:60]}",
                             payload={"agent": agent_key, "kwargs": kwargs})
        return _reply(
            f"Done. I created a task for the {agent_key} agent: “{subject[:80]}”.",
            task_id=task.id,
        )

    if action == "cancel_task":
        task_id = match.group(4) if match.lastindex and match.lastindex >= 4 else ""
        if not task_id:
            return _reply("Which task should I stop?")
        if not confirm:
            return _confirm("cancel_task", {"task_id": task_id},
                            f"Stop task `{task_id}`?")
        if not queue.cancel(task_id):
            return _reply(f"Task `{task_id}` is already finished or not found.")
        return _reply(f"Done. I stopped task `{task_id}`.")

    if action == "cancel_latest_task":
        if not confirm:
            return _confirm("cancel_latest_task", {},
                            "Stop the most recent task?")
        latest = next((t for t in queue.list(limit=10)
                       if t.status in ("queued", "running")), None)
        if latest is None:
            return _reply("Nothing is currently running to stop.")
        queue.cancel(latest.id)
        return _reply(f"Done. I stopped task `{latest.id}` ({latest.kind}).")

    if action == "reassign_task":
        agent_key = (match.group(5) or "").strip().lower()
        terminal = [t for t in queue.list(limit=25) if t.status in ("completed", "failed", "cancelled")]
        if not terminal:
            return _reply("I don't see any finished tasks to reassign.")
        target = terminal[0]
        from app.agents import get_agent

        resolved = agent_key
        try:
            get_agent(resolved)
        except KeyError:
            hint = _agent_for(agent_key)
            if hint != "content":
                try:
                    get_agent(hint)
                    resolved = hint
                except KeyError:
                    pass
            if resolved == agent_key:
                return _reply(f"I don't know an agent called “{agent_key}”. Say “list agents” to see the team.")
        fresh = queue.retry(target.id, payload_override={"agent": resolved})
        if fresh is None:
            return _reply("I couldn't reassign that task.")
        return _reply(
            f"Done. I gave task `{fresh.id}` to the {resolved} agent — it's running now.",
            task_id=fresh.id,
        )

    if action == "retry_failed_task":
        failed = [t for t in queue.list(limit=50)
                  if t.status == "failed" and t.kind in ("agent", "workflow", "langgraph", "media_image", "media_video")]
        if not failed:
            return _reply("Nothing failed recently to retry.")
        fresh = queue.retry(failed[0].id)
        if fresh is None:
            return _reply("I couldn't retry that task.")
        return _reply(
            f"Done. I re-ran task `{fresh.id}` ({fresh.label}) — it's back on the queue.",
            task_id=fresh.id,
        )

    # ---- agent instructions (Phase 6) ---------------------------------------
    if action == "update_agent":
        from app.agent_instructions import set_instruction

        agent_key = _resolve_agent(match.group(3))
        instruction = _clean(match.group("inst"))
        if agent_key is None:
            return _reply("I don't know an agent called that. Say “list agents” to see the team.")
        if not instruction:
            return _reply(f"Tell me what the {agent_key} agent should follow. e.g. update the {agent_key} agent: always …")
        set_instruction(agent_key, instruction, db)
        return _reply(
            f"Done. I updated the {agent_key} agent — from now on it will follow:\n"
            f"“{instruction[:300]}”"
        )

    if action == "show_agent_instructions":
        from app.agent_instructions import get_instruction

        agent_key = _resolve_agent(match.group(4))
        if agent_key is None:
            return _reply("I don't know an agent called that. Say “list agents” to see the team.")
        current = get_instruction(agent_key, db)
        if not current:
            return _reply(f"The {agent_key} agent has no custom instructions — it follows its stock playbook.")
        return _reply(
            f"Here's what I told the {agent_key} agent:\n“{current[:600]}”"
        )

    if action == "clear_agent_instructions":
        from app.agent_instructions import clear_instruction

        agent_key = _resolve_agent(match.group(3))
        if agent_key is None:
            return _reply("I don't know an agent called that. Say “list agents” to see the team.")
        if not confirm:
            return _confirm(
                "clear_agent_instructions",
                {"agent": agent_key},
                f"Forget the {agent_key} agent's custom instructions and restore its stock playbook?",
            )
        cleared = clear_instruction(agent_key, db)
        return _reply(
            f"Done. The {agent_key} agent is back to its stock playbook."
            if cleared
            else f"The {agent_key} agent didn't have custom instructions to clear."
        )

    # ---- memory ------------------------------------------------------------
    if action == "save_memory":
        from app.memory.store import store_memory

        content = _extract_after(match)
        content = re.sub(r"^(that|note|store)\s+", "", content, flags=re.I).strip()
        if not content:
            return _reply("What should I remember?")
        memory_id = store_memory(content, kind="fact", title=content[:80], source="chat")
        return _reply(
            f"Done. I'll remember that: “{content[:200]}”."
            if memory_id
            else "I couldn't store that memory."
        )

    if action == "delete_memory":
        from app.memory.store import delete_memory, find_memory_to_forget

        hints = [m for m in find_memory_to_forget(text, limit=3)
                 if m.get("kind", "") in ("fact", "preference", "goal", "decision")]
        if not confirm:
            target = hints[0] if hints else {}
            if not target:
                return _reply("I don't have a matching memory to forget.")
            return _confirm(
                "delete_memory",
                {"memory_id": target["id"], "content": target["content"][:120]},
                f"Forget this? “{target['content'][:120]}”",
            )
        if not hints:
            return _reply("I don't have a matching memory to forget.")
        deleted = delete_memory(hints[0]["id"])
        return _reply("Done. I forgot that." if deleted else "That memory is already gone.")

    if action == "search_memory":
        from app.memory.store import search_memory

        query = _extract_after(match)
        results = search_memory(query or text, limit=5)
        if not results:
            return _reply("I don't have any stored memories matching that.")
        listing = "\n".join(f"- {r['content'][:180]}" for r in results)
        return _reply(f"What I remember:\n{listing}")

    # ---- media -------------------------------------------------------------
    if action == "create_image":
        prompt = _extract_after(match)
        if not prompt:
            prompt = "a premium marketing visual"
        task = queue.enqueue(
            "media_image",
            label=f"image: {prompt[:50]}",
            payload={"prompt": prompt, "project_id": ""},
        )
        return _reply(
            f"I'm generating an image now ({prompt[:80]}). I'll stream the "
            f"result here as soon as it's ready.",
            task_id=task.id,
        )

    if action == "create_video":
        prompt = _extract_after(match)
        if not prompt:
            prompt = "a premium brand video"
        task = queue.enqueue(
            "media_video",
            label=f"video: {prompt[:50]}",
            payload={"prompt": prompt, "project_id": ""},
        )
        return _reply(
            f"I'm producing a video now ({prompt[:80]}). This takes a moment — "
            f"I'll stream the result here when it's ready.",
            task_id=task.id,
        )

    # ---- summaries ---------------------------------------------------------
    if action == "daily_summary":
        return None  # handled by the intel layer in chat.py

    # ---- schedules ---------------------------------------------------------
    def _schedules() -> list[ScheduledJob]:
        q = db.query(ScheduledJob).filter(ScheduledJob.archived == False)  # noqa: E712
        if client:
            q = q.filter(ScheduledJob.client == client)
        return q.order_by(ScheduledJob.created_at.desc()).all()

    if action == "create_schedule":
        from app.agents import get_agent

        subject = (match.group("subject") or "").strip()
        subject = re.sub(r"^(run|do|create|make)\s+", "", subject, flags=re.I).strip()
        period = (match.group("period") or "day").lower()
        raw_time = (match.group("time") or "").strip()
        if not raw_time:
            raw_time = {"morning": "09:00", "afternoon": "14:00",
                        "evening": "17:00", "night": "21:00"}.get(period, "09:00")
        schedule_time = _parse_time(raw_time)
        agent_key = _agent_for(subject)
        try:
            get_agent(agent_key)
        except KeyError:
            agent_key = "content"
        job = ScheduledJob(
            name=f"{subject[:120]} — {schedule_time} {period}",
            agent=agent_key,
            job_type="daily",
            schedule_time=schedule_time,
            interval_minutes=1440,
            payload={"prompt": subject},
            client=client,
            project_id="",
            enabled=True,
        )
        db.add(job)
        db.commit()
        return _reply(
            f"Done. I set up a daily schedule: “{subject}” every {period} at "
            f"{schedule_time} (using the {agent_key} agent). Say “run it now” "
            f"to trigger it immediately."
        )

    if action == "delete_schedule":
        name = _extract_after(match)
        name = re.sub(r"^(named|called|the)\s+", "", name, flags=re.I).strip()
        target = None
        if name:
            target = next((s for s in _schedules() if name.lower() in (s.name or s.agent).lower()), None)
        else:
            target = _schedules()[0] if _schedules() else None
        if target is None:
            return _reply("I couldn't find a schedule to delete.")
        if not confirm:
            return _confirm("delete_schedule", {"job_id": target.id},
                            f"Delete schedule “{target.name}”? This stops it for good.")
        target.archived = True
        target.enabled = False
        db.commit()
        return _reply(f"Done. I deleted schedule “{target.name}”.")

    if action == "rename_schedule":
        groups = match.groups()
        old = _clean(groups[-3] if len(groups) >= 3 else "")
        new = _clean(groups[-1] if groups else "")
        old = re.sub(r"^(named|called|the)\s+", "", old, flags=re.I).strip()
        if not old or not new:
            return _reply("Rename which schedule to what? (e.g. “rename the schedule X to Y”)")
        target = next((s for s in _schedules() if old.lower() in (s.name or s.agent).lower()), None)
        if target is None:
            return _reply(f"I couldn't find a schedule named “{old}”.")
        target.name = new[:255]
        db.commit()
        return _reply(f"Done. I renamed schedule “{old}” to “{new}”.")

    if action == "duplicate_schedule":
        target = _schedules()[0] if _schedules() else None
        if target is None:
            return _reply("No schedule to duplicate.")
        copy = ScheduledJob(
            name=f"{target.name or target.agent} (copy)",
            agent=target.agent,
            job_type=target.job_type,
            schedule_time=target.schedule_time,
            interval_minutes=target.interval_minutes,
            payload=dict(target.payload or {}),
            client=target.client or "",
            project_id=target.project_id or "",
            enabled=False,
        )
        db.add(copy)
        db.commit()
        return _reply(
            f"Done. I duplicated “{target.name}” as “{copy.name}” — paused, "
            f"resume it when you want it live."
        )

    if action == "run_schedule_now":
        from app.scheduler import run_agent

        target = next((s for s in _schedules() if s.enabled), None) or (_schedules()[0] if _schedules() else None)
        if target is None:
            return _reply("No schedule to run. Say “run X every morning at 9” to create one.")
        run, _ = run_agent(target.agent, target.payload or {}, target.job_type)
        db.commit()
        return _reply(
            f"Done. I triggered “{target.name}” — the {target.agent} agent is "
            f"working on it now.",
            task_id=run.task_id if hasattr(run, "task_id") else None,
        )

    if action == "schedule_action":
        verb = (match.group(1) or "").lower()
        target = _schedules()[0] if _schedules() else None
        if target is None:
            return _reply("No schedule found to control.")
        if verb in ("pause", "stop", "disable"):
            target.enabled = False
            db.commit()
            return _reply(f"Done. I paused schedule “{target.name}” — it won't run until you resume it.")
        if verb == "resume":
            target.enabled = True
            db.commit()
            return _reply(f"Done. I resumed schedule “{target.name}” — back on schedule.")
        if verb in ("run", "start", "enable"):
            from app.scheduler import run_agent

            target.enabled = True
            db.commit()
            run, _ = run_agent(target.agent, target.payload or {}, target.job_type)
            db.commit()
            return _reply(f"Done. I ran “{target.name}” now ({target.agent} agent).",
                          task_id=run.task_id if hasattr(run, "task_id") else None)

    return None


# ---------------------------------------------------------------------------
# Result helpers
# ---------------------------------------------------------------------------

def _reply(text: str, task_id: str | None = None) -> dict:
    out: dict = {"handled": True, "reply": text, "confirmation_required": False}
    if task_id:
        out["task_id"] = task_id
    return out


def _confirm(action: str, payload: dict, prompt: str) -> dict:
    return {
        "handled": True,
        "reply": prompt,
        "confirmation_required": True,
        "confirm_action": action,
        "confirm_payload": payload,
    }