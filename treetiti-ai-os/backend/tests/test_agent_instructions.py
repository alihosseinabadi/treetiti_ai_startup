"""Per-agent custom instructions (Phase 6) — store + OS-command dispatch tests.

Covers ``app/agent_instructions`` (set/get/clear/list) and the chat wiring:
"update the <agent> agent: <rule>" teaches an agent, "what did you tell the
<agent> agent" reads it back, "forget the <agent> agent instructions" clears it
(confirm-gated), and ``BaseAgent._system`` injects the OWNER DIRECTIVE.
"""

from __future__ import annotations

import pytest

from app import agent_instructions as store


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows
        self._filtered: list = rows

    def filter(self, *a, **k):
        q = FakeQuery(self._rows)
        if a:
            expr = a[0]
            left = getattr(expr, "left", None)
            right = getattr(expr, "right", None)
            col = getattr(left, "key", None)
            val = getattr(right, "value", right) if right is not None else None
            q._filtered = [r for r in self._rows if getattr(r, col, None) == val] if col else self._rows
        return q

    def order_by(self, *a, **k):
        q = FakeQuery(self._filtered)
        if a:
            key = getattr(a[0], "key", None)
            if key:
                q._filtered = sorted(self._filtered, key=lambda r: getattr(r, key, "") or "")
        return q

    def first(self):
        return self._filtered[0] if self._filtered else None

    def all(self):
        return self._filtered


class FakeDb:
    def __init__(self):
        self.rows: list = []
        self.commits = 0

    def query(self, model):
        return FakeQuery(self.rows)

    def add(self, obj):
        if not any(r is obj for r in self.rows):
            self.rows.append(obj)

    def delete(self, obj):
        self.rows = [r for r in self.rows if r is not obj]

    def commit(self):
        self.commits += 1


def _mk(agent: str, instruction: str, updated_at=None):
    from app.models import AgentInstruction

    return AgentInstruction(agent=agent, instruction=instruction, updated_at=updated_at)


# ---- store -------------------------------------------------------------


def test_set_creates_and_updates():
    db = FakeDb()
    store.set_instruction("content", "rule one", db)
    assert db.rows and db.rows[0].instruction == "rule one"
    store.set_instruction("content", "rule two", db)
    assert len(db.rows) == 1
    assert db.rows[0].instruction == "rule two"


def test_get_returns_empty_when_none():
    db = FakeDb()
    assert store.get_instruction("ceo", db) == ""


def test_get_returns_stored():
    db = FakeDb()
    store.set_instruction("ceo", "  always be brief  ", db)
    assert store.get_instruction("ceo", db) == "always be brief"


def test_clear_removes_and_reports():
    db = FakeDb()
    assert store.clear_instruction("ceo", db) is False
    store.set_instruction("ceo", "x", db)
    assert store.clear_instruction("ceo", db) is True
    assert store.get_instruction("ceo", db) == ""


def test_list_returns_ordered_dicts():
    db = FakeDb()
    store.set_instruction("video", "v", db)
    store.set_instruction("content", "c", db)
    out = store.list_instructions(db)
    assert [r["agent"] for r in out] == ["content", "video"]
    assert out[0]["instruction"] == "c"
    assert out[0]["updated_at"] is None


def test_instructions_for_degrades_without_db():
    assert store.instructions_for("content") == ""


# ---- OS-command dispatch ------------------------------------------------


def _dispatch(text: str, confirm: bool = False):
    from app import os_commands

    return os_commands.dispatch_os_command(text, "tree", "sess-1", FakeDb(), confirm=confirm)


def test_update_agent_teaches_agent():
    out = _dispatch("update the content agent: always write in a friendly tone")
    assert out is not None and out["handled"] is True
    assert "content" in out["reply"]
    assert "friendly tone" in out["reply"]


def test_teach_agent_synonym():
    out = _dispatch("teach the video agent to always end with a CTA")
    assert out["handled"] is True
    assert "video" in out["reply"]


def test_make_agent_synonym_with_agent_key_alias():
    out = _dispatch("make the research agent never mention prices")
    assert out["handled"] is True
    assert "market_research" in out["reply"]


def test_update_unknown_agent_rejected():
    out = _dispatch("update the taxman agent: be brief")
    assert out["handled"] is True
    assert "don't know an agent" in out["reply"].lower()


def test_update_missing_instruction_asks():
    out = _dispatch("update the content agent:")
    assert "Tell me what" in out["reply"]


def test_show_instructions_with_none():
    out = _dispatch("what did you tell the content agent")
    assert "no custom instructions" in out["reply"]


def test_show_instructions_returns_rule():
    db = FakeDb()
    store.set_instruction("content", "never mention prices", db)

    from app import os_commands

    out = os_commands.dispatch_os_command(
        "what did you tell the content agent", "tree", "sess-1", db
    )
    assert "never mention prices" in out["reply"]


def test_clear_requires_confirmation():
    db = FakeDb()
    store.set_instruction("content", "x", db)

    from app import os_commands

    out = os_commands.dispatch_os_command(
        "forget the content agent instructions", "tree", "sess-1", db
    )
    assert out["confirmation_required"] is True

    out = os_commands.dispatch_os_command(
        "forget the content agent instructions", "tree", "sess-1", db, confirm=True
    )
    assert "back to its stock playbook" in out["reply"]
    assert store.get_instruction("content", db) == ""


def test_clear_without_rule_reports_nothing():
    out = _dispatch("forget the content agent instructions", confirm=True)
    assert "didn't have custom instructions" in out["reply"]


# ---- BaseAgent._system injection ---------------------------------------

from app.agents.base import BaseAgent


class _DummyAgent(BaseAgent):
    def run(self, **kwargs):  # pragma: no cover - never called
        return {"ok": True}


def _mk_agent(key: str) -> _DummyAgent:
    agent = _DummyAgent()
    agent.name = "Content"
    agent.role = "content"
    agent.system_prompt = "stock prompt"
    agent.agent_key = key
    return agent


def test_base_agent_system_injects_owner_directive(monkeypatch):
    agent = _mk_agent("content")
    monkeypatch.setattr("app.agent_instructions.instructions_for", lambda a: "always be brief")
    system = agent._system()
    assert "OWNER DIRECTIVE" in system
    assert "always be brief" in system


def test_base_agent_system_without_instruction(monkeypatch):
    agent = _mk_agent("content")
    monkeypatch.setattr("app.agent_instructions.instructions_for", lambda a: "")
    system = agent._system()
    assert "OWNER DIRECTIVE" not in system


def test_base_agent_system_survives_lookup_failure(monkeypatch):
    agent = _mk_agent("content")

    def boom(a):
        raise RuntimeError("db down")

    monkeypatch.setattr("app.agent_instructions.instructions_for", boom)
    assert "OWNER DIRECTIVE" not in agent._system()


# ---- deliberate() deliberation loop --------------------------------------


def test_deliberate_runs_draft_critique_refine(monkeypatch):
    agent = _mk_agent("content")
    calls: list[str] = []
    monkeypatch.setattr("app.agents.base.BaseAgent._route_model", lambda self: "mock")
    monkeypatch.setattr("app.agents.base.BaseAgent._resolved_fallback", lambda self: None)

    def fake_complete(self, system, prompt, model, temp, json_mode):
        calls.append(prompt)
        if "PREVIOUS DRAFT:" in prompt:
            return "FINAL: strong hook + CTA."
        if "CRITIQUE:" in prompt:
            return "1. Hook is weak. 2. No CTA."
        if "DRAFT:" in prompt:
            return "DRAFT: weak first attempt"
        return "FIRST: initial draft"

    monkeypatch.setattr("app.agents.base.BaseAgent._try_complete", fake_complete)
    result = agent.deliberate("write an ad", refine_rounds=1)
    assert result == "FINAL: strong hook + CTA."
    assert len(calls) == 3


def test_deliberate_degrades_to_draft_on_failure(monkeypatch):
    agent = _mk_agent("content")
    monkeypatch.setattr("app.agents.base.BaseAgent._route_model", lambda self: "mock")
    monkeypatch.setattr("app.agents.base.BaseAgent._resolved_fallback", lambda self: None)
    calls = 0

    def fake_complete(self, system, prompt, model, temp, json_mode):
        nonlocal calls
        calls += 1
        if calls == 1:
            return "draft survives"
        raise RuntimeError("critic offline")

    monkeypatch.setattr("app.agents.base.BaseAgent._try_complete", fake_complete)
    assert agent.deliberate("x", refine_rounds=2) == "draft survives"
