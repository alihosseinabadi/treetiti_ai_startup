"""Agentic controller (Phase 7) acceptance tests — FakeDb, no network.

The MAIN CHAT is now an autonomous workspace: the user describes the outcome
("research this competitor, build daily content and send it to me") and the
controller figures out the workflow — intent classification, auto project
creation, deep research, mission creation, scheduled cycles, and persisted
ask-back decisions that resume without restarting.
"""

from __future__ import annotations

import uuid

from sqlalchemy.sql import operators

from app import agentic as mod
from app.models import ChatSession, Mission, PendingDecision, Project, ResearchReport


class FakeQuery:
    def __init__(self, rows):
        self._filtered = list(rows)

    def filter(self, *args, **kwargs):
        q = FakeQuery(self._filtered)
        for arg in args:
            expr = arg
            left = getattr(expr, "left", None)
            right = getattr(expr, "right", None)
            col = getattr(left, "key", None)
            val = getattr(right, "value", right) if right is not None else None
            op = getattr(expr, "operator", operators.eq)
            if col is not None:
                if op is operators.ne:
                    q._filtered = [r for r in q._filtered if getattr(r, col, None) != val]
                else:
                    q._filtered = [r for r in q._filtered if getattr(r, col, None) == val]
        return q

    def order_by(self, *a, **k):
        return self

    def first(self):
        return self._filtered[0] if self._filtered else None

    def all(self):
        return list(self._filtered)


class FakeDb:
    def __init__(self):
        self.rows: list = []

    def flush(self):
        for r in self.rows:
            if getattr(r, "id", None) is None:
                r.id = str(uuid.uuid4())

    def _store(self, model):
        return [r for r in self.rows if isinstance(r, model)]

    def query(self, model):
        return FakeQuery(self._store(model))

    def get(self, model, key):
        for r in self.rows:
            if isinstance(r, model) and getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        if not any(r is obj for r in self.rows):
            self.rows.append(obj)

    def delete(self, obj):
        self.rows = [r for r in self.rows if r is not obj]

    def commit(self):
        self.flush()

    def refresh(self, obj):
        self.flush()


def _session(**kw) -> ChatSession:
    s = ChatSession(context=kw.pop("context", "tree"), **kw)
    if s.id is None:
        s.id = str(uuid.uuid4())
    return s


def _fake_report(topic="Luxury Villas Competitors"):
    return {
        "topic": topic,
        "depth": "deep",
        "synthesis": "llm",
        "page_count": 7,
        "took_ms": 1200,
        "summary": "Competitors lean on problem-first Reels hooks.",
        "findings": [
            {"claim": "Reels with problem-first hooks outperform product-first.", "confidence": "high"},
            {"claim": "Posting cadence is 5x/week.", "confidence": "medium"},
        ],
        "insights": ["Video gaps exist at the low price band."],
        "recommendations": ["Double down on Reels."],
        "sources": ["https://instagram.com/comp", "https://example.com"],
        "report_md": "# Report\nsummary here",
    }


# ---- classify_request ----------------------------------------------------


def test_classify_research():
    intent = mod.classify_request("Research this competitor for luxury real estate")
    assert intent.kind == "research"
    assert "luxury real estate" in intent.topic.lower()
    assert intent.cadence == ""


def test_classify_recurring():
    intent = mod.classify_request("Make content every day for our villas")
    assert intent.kind == "recurring"
    assert intent.cadence == "daily"


def test_classify_workflow_multistep():
    intent = mod.classify_request("Research competitors, then build daily content and send it to me")
    assert intent.kind == "workflow"
    assert intent.cadence == "daily"
    assert intent.ask_channel is True


def test_classify_question_falls_through():
    intent = mod.classify_request("What is the weather like today?")
    assert intent.kind == "default"


def test_classify_detects_channel_and_cadence():
    intent = mod.classify_request("Send me a weekly report via email")
    assert intent.cadence == "weekly"
    assert intent.channel == "Email"


# ---- controller -----------------------------------------------------------


def _run(message: str, db: FakeDb, session: ChatSession | None = None):
    return mod.run_agentic(message, session or _session(), db)


def test_research_from_chat_runs_and_saves_report(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr(mod, "_RESEARCH_RUNNER", lambda topic, client, depth: _fake_report(topic))
    session = _session()
    out = mod.run_agentic("Research the luxury villas competitor", session, db)
    assert out and out["handled"]
    assert "Research complete" in out["reply"]
    assert out["report_id"]
    reports = db._store(ResearchReport)
    assert len(reports) == 1
    assert reports[0].client == ""
    assert reports[0].summary
    checkpoints = (session.session_state or {}).get("checkpoints")
    assert checkpoints and checkpoints[-1]["name"] == "research"


def test_research_failure_degrades_not_500(monkeypatch):
    db = FakeDb()

    def boom(topic, client, depth):
        raise RuntimeError("search provider down")

    monkeypatch.setattr(mod, "_RESEARCH_RUNNER", boom)
    out = _run("research this competitor", db)
    assert out and out["handled"]
    assert "couldn't complete" in out["reply"]


def test_recurring_with_send_asks_channel_then_builds_mission(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr(mod, "_MISSION_ENQUEUE", lambda mid, ct: "task-1")
    session = _session()

    out = mod.run_agentic("make content about our villas every day and send it to me", session, db)
    assert out["handled"]
    assert out["pending_decision"], "should ask where to deliver"
    pd_id = out["pending_decision"]["id"]
    decisions = db._store(PendingDecision)
    assert len(decisions) == 1
    assert decisions[0].status == "open"

    # User answers — workflow resumes, does not restart.
    out2 = mod.run_agentic("Telegram", session, db)
    assert out2["handled"]
    assert "Telegram" in out2["reply"]
    missions = db._store(Mission)
    assert len(missions) == 1
    assert missions[0].config.get("delivery") == "Telegram"
    assert decisions[0].status == "answered"
    assert decisions[0].answer == "Telegram"


def test_workflow_autocreates_project_and_mission(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr(mod, "_MISSION_ENQUEUE", lambda mid, ct: "task-2")
    session = _session()
    out = mod.run_agentic("research this competitor and build daily content every day", session, db)
    assert out["handled"]
    assert out["mission_id"]
    assert out["task_id"] == "task-2"
    projects = db._store(Project)
    assert len(projects) == 1
    assert session.project_id == projects[0].id
    missions = db._store(Mission)
    assert len(missions) == 1
    assert missions[0].cadence == "daily"


def test_workflow_asks_cadence_when_missing(monkeypatch):
    db = FakeDb()
    session = _session()
    out = mod.run_agentic("research the brand, build a strategy then create content for them", session, db)
    assert out["handled"]
    assert out["pending_decision"]
    assert out["project_id"], "project auto-created before asking"
    decisions = db._store(PendingDecision)
    assert decisions[0].workflow.get("type") == "cadence"
    assert "Daily" in decisions[0].options


def test_cadence_answer_resumes_and_builds_mission(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr(mod, "_MISSION_ENQUEUE", lambda mid, ct: "task-3")
    session = _session()
    out = mod.run_agentic("research the brand, build a strategy then create content for them", session, db)
    pd_id = out["pending_decision"]["id"]
    out2 = mod.run_agentic("Weekly", session, db)
    assert out2["handled"]
    missions = db._store(Mission)
    assert len(missions) == 1
    assert missions[0].cadence == "weekly"
    assert db.get(PendingDecision, pd_id).status == "answered"


def test_question_message_returns_none():
    out = _run("How are we doing today?", FakeDb())
    assert out is None


def test_open_decision_consumed_by_plain_reply():
    db = FakeDb()
    session = _session()
    mod.run_agentic("make content every day and send it to me", session, db)
    assert len(db._store(PendingDecision)) == 1
    # A fresh command expires the old decision instead of answering it.
    out = mod.run_agentic("pause the mission", session, db)
    assert out is None or out["handled"]  # OS layer owns "pause"; controller must not swallow it
    assert db._store(PendingDecision)[0].status == "expired"


def test_controller_never_raises(monkeypatch):
    db = FakeDb()
    monkeypatch.setattr(mod, "classify_request", lambda m: (_ for _ in ()).throw(RuntimeError("boom")))
    out = mod.run_agentic("research something", _session(), db)
    assert out["handled"]
    assert "hit a snag" in out["reply"]


def test_ensure_project_reuses_existing():
    db = FakeDb()
    session = _session()
    first = mod.ensure_project(db, session, "Tire Tejaarat", "")
    second = mod.ensure_project(db, session, "tire tejaarat", "")
    assert first["created"] is True
    assert second["created"] is False
    assert len(db._store(Project)) == 1
    assert session.project_id == first["project"]["id"]