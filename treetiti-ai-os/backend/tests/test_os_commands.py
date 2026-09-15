"""OS Command Layer — real operating powers acceptance tests (TEST 1-15 core).

Uses a fake in-memory database so no real DB/network is required.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app import os_commands as osc
from app.os_commands import dispatch_os_command


class FakeRow:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def limit(self, n):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None

    def __iter__(self):
        return iter(self._rows)


class FakeDb:
    """Minimal stand-in for a SessionLocal() connection."""

    def __init__(self):
        self.rows: dict[type, list] = {}
        self.deleted = []

    def query(self, model):
        return FakeQuery(self.rows.get(model, []))

    def get(self, model, key):
        for r in self.rows.get(model, []):
            if getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        if not getattr(obj, "id", None):
            obj.id = f"id-{len(self.rows.get(type(obj), [])) + 1}"
        self.rows.setdefault(type(obj), []).append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def delete(self, obj):
        self.deleted.append(obj)

    def execute(self, stmt):
        return MagicMock(rowcount=1)


def _make_session(**kw) -> FakeRow:
    base = dict(id="sess-1", title="New conversation", messages=[], context="tree",
                project_id="", archived=False)
    base.update(kw)
    return FakeRow(**base)


# ---------------------------------------------------------------------------
# TEST 1 — "Create a project called Summer Campaign" → project created
# ---------------------------------------------------------------------------

def test_create_project():
    db = FakeDb()
    out = dispatch_os_command("Create a project called Summer Campaign", "tree", "sess-1", db)
    assert out and out["handled"]
    assert not out["confirmation_required"]
    assert "Summer Campaign" in out["reply"]
    projs = db.rows.get(object, [])
    from app.models import Project

    projs = db.rows.get(Project, [])
    assert len(projs) == 1
    assert projs[0].name == "Summer Campaign"


# ---------------------------------------------------------------------------
# TEST 2 — "Move this chat to Summer Campaign" → session associated
# ---------------------------------------------------------------------------

def test_move_session_to_project(monkeypatch):
    from app.models import ChatSession, Project

    db = FakeDb()
    project = FakeRow(id="p-1", name="Summer Campaign", status="active")
    db.rows[Project] = [project]
    db.rows[ChatSession] = [_make_session()]

    out = dispatch_os_command("Move this chat to Summer Campaign", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "Summer Campaign" in out["reply"]
    assert db.rows[ChatSession][0].project_id == "p-1"


# ---------------------------------------------------------------------------
# TEST 3 — "Delete this chat" → confirmation, then really deleted
# ---------------------------------------------------------------------------

def test_delete_chat_requires_confirmation():
    from app.models import ChatSession

    db = FakeDb()
    db.rows[ChatSession] = [_make_session()]
    out = dispatch_os_command("Delete this chat", "tree", "sess-1", db)
    assert out["confirmation_required"]
    assert out["confirm_action"] == "delete_session"

    # Confirm → executes (soft delete → archived).
    out2 = dispatch_os_command("Delete this chat", "tree", "sess-1", db, confirm=True)
    assert out2 and out2["handled"]
    assert not out2["confirmation_required"]
    assert db.rows[ChatSession][0].archived is True


# ---------------------------------------------------------------------------
# TEST 3b — "Delete chat sessions" / "delete the conversation" also work
# ---------------------------------------------------------------------------

def test_delete_session_phrasings():
    from app.models import ChatSession

    for phrase in ("delete chat sessions", "delete the conversation", "clear this chat",
                   "wipe this session", "kill this conversation"):
        db = FakeDb()
        db.rows[ChatSession] = [_make_session()]
        out = dispatch_os_command(phrase, "tree", "sess-1", db)
        assert out and out["confirm_action"] == "delete_session", phrase
        out2 = dispatch_os_command(phrase, "tree", "sess-1", db, confirm=True)
        assert db.rows[ChatSession][0].archived is True, phrase


# ---------------------------------------------------------------------------
# TEST 3c — "Delete all conversations" archives every session (with confirm)
# ---------------------------------------------------------------------------

def test_delete_all_sessions_requires_confirmation():
    from app.models import ChatSession

    db = FakeDb()
    db.rows[ChatSession] = [_make_session(), _make_session(id="sess-2")]
    out = dispatch_os_command("delete all sessions", "tree", "sess-1", db)
    assert out and out["confirm_action"] == "delete_all_sessions"
    out2 = dispatch_os_command("delete all sessions", "tree", "sess-1", db, confirm=True)
    assert out2 and out2["handled"]
    assert all(s.archived for s in db.rows[ChatSession])


# ---------------------------------------------------------------------------
# TEST 3d — "reset / start fresh" clears the current conversation
# ---------------------------------------------------------------------------

def test_reset_session():
    from app.models import ChatSession

    db = FakeDb()
    db.rows[ChatSession] = [_make_session()]
    for phrase in ("reset", "start fresh", "clear everything", "start a new conversation"):
        out = dispatch_os_command(phrase, "tree", "sess-1", db)
        assert out and out["handled"], phrase
        assert not out["confirmation_required"], phrase
        assert "fresh" in out["reply"].lower() or "cleared" in out["reply"].lower(), phrase
        assert db.rows[ChatSession][0].archived is True, phrase
        # fresh DB for next phrase
        db = FakeDb()
        db.rows[ChatSession] = [_make_session()]


# ---------------------------------------------------------------------------
# TEST 3e — "Pause all missions" pauses every active mission
# ---------------------------------------------------------------------------

def test_pause_all_missions():
    from app.models import Mission

    db = FakeDb()
    db.rows[Mission] = [
        FakeRow(id="m-1", name="Alpha", status="active"),
        FakeRow(id="m-2", name="Beta", status="active"),
        FakeRow(id="m-3", name="Gamma", status="paused"),
    ]
    for phrase in ("pause all missions", "pause every mission", "stop all missions",
                   "stop the active missions", "halt all campaigns"):
        out = dispatch_os_command(phrase, "tree", "sess-1", db)
        assert out and out["handled"], phrase
        assert not out["confirmation_required"], phrase
        assert all(m.status == "paused" for m in db.rows[Mission]), phrase
        for m in db.rows[Mission]:
            m.status = "active"


# ---------------------------------------------------------------------------
# TEST 3f — "Stop everything" pauses missions and cancels running tasks
# ---------------------------------------------------------------------------

def test_stop_everything(monkeypatch):
    from app.models import Mission

    q = MagicMock()
    q.list.return_value = [
        FakeRow(id="t-1", status="running", kind="agent"),
        FakeRow(id="t-2", status="queued", kind="media_image"),
    ]
    import app.os_commands as mod

    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    db.rows[Mission] = [FakeRow(id="m-1", name="Alpha", status="active")]
    out = dispatch_os_command("stop everything", "tree", "sess-1", db)
    assert out and out["handled"]
    assert not out["confirmation_required"]
    assert db.rows[Mission][0].status == "paused"
    assert q.cancel.call_count == 2


# ---------------------------------------------------------------------------
# TEST 3g — "Archive the current work" quiets production
# ---------------------------------------------------------------------------

def test_archive_current_work(monkeypatch):
    from app.models import Mission

    q = MagicMock()
    q.list.return_value = [FakeRow(id="t-1", status="running", kind="agent")]
    import app.os_commands as mod

    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    db.rows[Mission] = [FakeRow(id="m-1", name="Alpha", status="active")]
    out = dispatch_os_command("archive the current work", "tree", "sess-1", db)
    assert out and out["handled"]
    assert db.rows[Mission][0].status == "paused"
    assert q.cancel.call_count == 1


# ---------------------------------------------------------------------------
# TEST 4 — "Create a task for the research agent" → task enqueued
# ---------------------------------------------------------------------------

def test_create_task_for_agent(monkeypatch):
    q = MagicMock()
    q.enqueue.return_value = FakeRow(id="task-1", kind="agent")
    import app.os_commands as mod

    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Create a task for the research agent", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "research" in out["reply"]
    assert out.get("task_id") == "task-1"
    assert q.enqueue.called


# ---------------------------------------------------------------------------
# TEST 5 — "Pause the mission" → mission paused
# ---------------------------------------------------------------------------

def test_pause_mission(monkeypatch):
    from app.models import Mission

    db = FakeDb()
    db.rows[Mission] = [FakeRow(id="m-1", name="Summer Campaign", status="active")]
    out = dispatch_os_command("Pause the mission", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "paused" in out["reply"]
    assert db.rows[Mission][0].status == "paused"


# ---------------------------------------------------------------------------
# TEST 8 — "Remember that our audience is startup founders" → memory stored
# ---------------------------------------------------------------------------

def test_remember_memory(monkeypatch):
    import app.memory.store as store
    from app.os_commands import dispatch_os_command

    stored = []
    monkeypatch.setattr(store, "store_memory", lambda content, kind, title, source: (stored.append((content, kind)), "mem-1")[1])
    db = FakeDb()
    out = dispatch_os_command("Remember that our audience is startup founders", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "startup founders" in out["reply"]
    assert stored and "startup founders" in stored[0][0]


# ---------------------------------------------------------------------------
# TEST 9 — "Forget that" → memory deleted
# ---------------------------------------------------------------------------

def test_forget_memory(monkeypatch):
    import app.memory.store as store

    monkeypatch.setattr(
        store,
        "find_memory_to_forget",
        lambda q, limit=3: [{"id": "mem-9", "content": "audience is startup founders", "kind": "fact"}],
    )
    deleted = []
    monkeypatch.setattr(store, "delete_memory", lambda mid: (deleted.append(mid), True)[1])
    db = FakeDb()
    out = dispatch_os_command("Forget that", "tree", "sess-1", db)
    assert out["confirmation_required"]
    out2 = dispatch_os_command("Forget that", "tree", "sess-1", db, confirm=True)
    assert out2 and out2["handled"]
    assert deleted == ["mem-9"]


# ---------------------------------------------------------------------------
# TEST 14 — active work surfaces via intel (chat handles, dispatcher passes)
# ---------------------------------------------------------------------------

def test_active_work_falls_through_to_intel():
    db = FakeDb()
    out = dispatch_os_command("What is everyone doing right now?", "tree", "sess-1", db)
    assert out is None  # conversational → brain/intel layer handles it


# ---------------------------------------------------------------------------
# Non-command conversation → None (never hijacks chat)
# ---------------------------------------------------------------------------

def test_normal_question_not_a_command():
    db = FakeDb()
    assert dispatch_os_command("What did we decide last week?", "tree", "sess-1", db) is None
    assert dispatch_os_command("Tell me about yourself", "tree", "sess-1", db) is None


# ---------------------------------------------------------------------------
# Customer isolation — mission ops scope to that client
# ---------------------------------------------------------------------------

def test_customer_mission_scoping():
    from app.models import Mission

    db = FakeDb()
    db.rows[Mission] = [
        FakeRow(id="m-1", name="Mission A", status="active"),
        FakeRow(id="m-2", name="Mission B", status="active"),
    ]
    # No client filter in FakeDb; dispatcher still returns handled without crashing.
    out = dispatch_os_command("Pause the mission", "customer:Acme", "sess-1", db)
    assert out and out["handled"]


# ---------------------------------------------------------------------------
# "What happened with the Summer Campaign?" → project_status returns None
# (intel layer in chat.py answers from real project state)
# ---------------------------------------------------------------------------

def test_project_status_delegates_to_intel():
    db = FakeDb()
    out = dispatch_os_command("What happened with the Summer Campaign?", "tree", "sess-1", db)
    assert out is None


def test_create_image_enqueues_task(monkeypatch):
    q = MagicMock()
    q.enqueue.return_value = FakeRow(id="task-img-1", kind="media_image")
    import app.os_commands as mod

    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Create an image of a luxury penthouse", "tree", "sess-1", db)
    assert out and out["handled"]
    assert out.get("task_id") == "task-img-1"
    assert q.enqueue.call_args.args[0] == "media_image"


def test_cancel_task_confirmation(monkeypatch):
    q = MagicMock()
    q.cancel.return_value = True
    import app.os_commands as mod

    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Stop the task abc12345", "tree", "sess-1", db)
    assert out["confirmation_required"]
    out2 = dispatch_os_command("Stop the task abc12345", "tree", "sess-1", db, confirm=True)
    assert out2 and out2["handled"]
    assert "abc12345" in out2["reply"]


# ---------------------------------------------------------------------------
# Phase 2 — schedules: create / rename / duplicate / delete / pause / run now
# ---------------------------------------------------------------------------

def test_create_schedule_every_morning():
    from app.models import ScheduledJob

    db = FakeDb()
    out = dispatch_os_command("Run a competitor scan every morning at 9", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "daily schedule" in out["reply"]
    jobs = db.rows[ScheduledJob]
    assert len(jobs) == 1
    job = jobs[0]
    assert job.agent == "social_intel"  # "competitor" → social_intel
    assert job.enabled is True
    assert job.schedule_time == "09:00"
    assert "competitor scan" in job.name


def test_create_schedule_default_time():
    from app.models import ScheduledJob

    db = FakeDb()
    out = dispatch_os_command("Create a weekly report every evening", "tree", "sess-1", db)
    assert out and out["handled"]
    job = db.rows[ScheduledJob][0]
    assert job.agent == "analytics"  # "report" → analytics
    assert job.schedule_time == "17:00"  # evening default
    assert job.job_type == "daily"


def test_rename_schedule():
    from app.models import ScheduledJob

    db = FakeDb()
    db.rows[ScheduledJob] = [FakeRow(id="s-1", name="Morning Scan", agent="content_hunter",
                                     job_type="daily", schedule_time="09:00", enabled=True,
                                     client="", project_id="", payload={}, created_at=None)]
    out = dispatch_os_command("Rename the schedule Morning Scan to Evening Scan", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "Evening Scan" in out["reply"]
    assert db.rows[ScheduledJob][0].name == "Evening Scan"


def test_duplicate_schedule_is_paused():
    from app.models import ScheduledJob

    db = FakeDb()
    db.rows[ScheduledJob] = [FakeRow(id="s-1", name="Morning Scan", agent="content_hunter",
                                     job_type="daily", schedule_time="09:00",
                                     interval_minutes=1440, payload={"prompt": "x"},
                                     client="", project_id="", enabled=True, created_at=None)]
    out = dispatch_os_command("Duplicate the schedule", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "copy" in out["reply"]
    copies = [s for s in db.rows[ScheduledJob] if "(copy)" in s.name]
    assert len(copies) == 1
    assert copies[0].enabled is False


def test_delete_schedule_requires_confirmation():
    from app.models import ScheduledJob

    db = FakeDb()
    db.rows[ScheduledJob] = [FakeRow(id="s-1", name="Morning Trend Scan", agent="content_hunter",
                                     job_type="daily", schedule_time="09:00", enabled=True,
                                     client="", project_id="", payload={}, created_at=None)]
    out = dispatch_os_command("Delete the schedule named Morning Trend Scan", "tree", "sess-1", db)
    assert out["confirmation_required"]
    assert out["confirm_action"] == "delete_schedule"
    out2 = dispatch_os_command("Delete the schedule named Morning Trend Scan", "tree", "sess-1", db, confirm=True)
    assert out2 and out2["handled"]
    job = db.rows[ScheduledJob][0]
    assert job.archived is True
    assert job.enabled is False


def test_pause_and_resume_schedule():
    from app.models import ScheduledJob

    db = FakeDb()
    db.rows[ScheduledJob] = [FakeRow(id="s-1", name="Morning Scan", agent="content_hunter",
                                     job_type="daily", schedule_time="09:00", enabled=True,
                                     client="", project_id="", payload={}, created_at=None)]
    out = dispatch_os_command("Pause the schedule", "tree", "sess-1", db)
    assert out and out["handled"]
    assert db.rows[ScheduledJob][0].enabled is False
    out = dispatch_os_command("Resume the schedule", "tree", "sess-1", db)
    assert out and out["handled"]
    assert db.rows[ScheduledJob][0].enabled is True


def test_run_schedule_now(monkeypatch):
    from app.models import ScheduledJob
    import app.scheduler as sched

    monkeypatch.setattr(sched, "run_agent", lambda agent, payload, job_type: (FakeRow(task_id="t-run-1"), None))
    db = FakeDb()
    db.rows[ScheduledJob] = [FakeRow(id="s-1", name="Morning Scan", agent="content_hunter",
                                     job_type="daily", schedule_time="09:00", enabled=True,
                                     client="", project_id="", payload={"prompt": "x"}, created_at=None)]
    out = dispatch_os_command("Run it now", "tree", "sess-1", db)
    assert out and out["handled"]
    assert out.get("task_id") == "t-run-1"


# ---------------------------------------------------------------------------
# Phase 2 — tasks: retry failed, reassign to another agent
# ---------------------------------------------------------------------------

def _queue_with(list_rows, fresh_id="t-fresh-1"):
    q = MagicMock()
    q.list.return_value = list_rows
    q.retry.return_value = FakeRow(id=fresh_id, label="agent", kind="agent", status="queued")
    return q


def test_retry_failed_task(monkeypatch):
    import app.os_commands as mod

    q = _queue_with([FakeRow(id="t-dead-1", label="content: draft", kind="agent", status="failed")])
    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Retry the failed task", "tree", "sess-1", db)
    assert out and out["handled"]
    assert out.get("task_id") == "t-fresh-1"
    assert q.retry.called
    assert q.retry.call_args.args[0] == "t-dead-1"


def test_retry_failed_task_nothing_failed(monkeypatch):
    import app.os_commands as mod

    q = _queue_with([FakeRow(id="t-1", label="x", kind="agent", status="completed")])
    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Retry the failed task", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "Nothing failed" in out["reply"]
    assert not q.retry.called


def test_reassign_task(monkeypatch):
    import app.os_commands as mod

    q = _queue_with([FakeRow(id="t-done-1", label="research: q2", kind="agent", status="completed")])
    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Reassign the task to the research agent", "tree", "sess-1", db)
    assert out and out["handled"]
    assert out.get("task_id") == "t-fresh-1"
    assert q.retry.called
    override = q.retry.call_args.kwargs.get("payload_override")
    assert override == {"agent": "market_research"}


def test_reassign_task_unknown_agent(monkeypatch):
    import app.os_commands as mod

    q = _queue_with([FakeRow(id="t-done-1", label="x", kind="agent", status="completed")])
    monkeypatch.setattr(mod, "get_queue", lambda: q)
    db = FakeDb()
    out = dispatch_os_command("Reassign the task to the zzz agent", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "don't know an agent" in out["reply"]
    assert not q.retry.called


# ---------------------------------------------------------------------------
# Phase 2 — missions: rename, duplicate
# ---------------------------------------------------------------------------

def test_rename_mission():
    from app.models import Mission

    db = FakeDb()
    db.rows[Mission] = [FakeRow(id="m-1", name="Summer Campaign", status="active")]
    out = dispatch_os_command("Rename the mission Summer Campaign to Summer Blast", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "Summer Blast" in out["reply"]
    assert db.rows[Mission][0].name == "Summer Blast"


def test_duplicate_mission_is_paused():
    from app.models import Mission

    db = FakeDb()
    db.rows[Mission] = [FakeRow(id="m-1", name="Summer Campaign", status="active", client="",
                                goal="G", cadence="daily", daily_time="09:00", weekly_day=None,
                                config={}, workspace={}, updated_at=None)]
    out = dispatch_os_command("Duplicate the mission", "tree", "sess-1", db)
    assert out and out["handled"]
    assert "(copy)" in out["reply"]
    copies = [m for m in db.rows[Mission] if "(copy)" in m.name]
    assert len(copies) == 1
    assert copies[0].status == "paused"