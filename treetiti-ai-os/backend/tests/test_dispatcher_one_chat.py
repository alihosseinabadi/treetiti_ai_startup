"""Unit tests for ONE CHAT (spec §12/§29/§30): company-task detection and
CEO stage-event threading for live team progress."""

from __future__ import annotations

from app.agents.ceo import CEOAgent
from app.dispatcher import dispatch, is_company_task, route_prompt


def test_full_campaign_brief_is_company_task():
    assert is_company_task("Build an Instagram launch campaign for a truck tire brand.")
    assert is_company_task("Take this brand from zero to a complete Instagram campaign.")
    assert is_company_task("Run the whole team on this brief, full campaign please.")


def test_single_agent_requests_are_not_company_tasks():
    assert not is_company_task("write a blog post about truck tires")
    assert not is_company_task("make a logo for the brand")
    assert not is_company_task("what services does treetiti offer?")
    assert not is_company_task("fix a bug in the checkout")


def test_company_brief_dispatches_to_ceo():
    key, payload = dispatch("Build an Instagram launch campaign for a new truck tire brand.")
    assert key == "ceo"
    assert payload["brief"]


def test_non_company_still_uses_keyword_routing():
    assert route_prompt("write a blog post") == "content"


def test_ceo_emits_stage_events_for_live_progress():
    from app.core.events import bus

    seen: list[tuple[str, dict]] = []

    def cb(ev):
        seen.append((ev.type, ev.payload))

    sub = bus().subscribe("*", cb)
    try:
        ceo = CEOAgent()
        ceo._emit_stage("task123", "research", "market_research", "started")
        ceo._emit_stage("task123", "research", "market_research", "completed")
        ceo._emit_stage("task123", "creative", "creative_director", "failed", "nope")
    finally:
        bus().unsubscribe("*", sub)

    types = [t for t, _ in seen]
    assert "agent.started" in types
    assert "agent.completed" in types
    assert "agent.failed" in types
    first = seen[0][1]
    assert first["task_id"] == "task123"
    assert first["agent"] == "market_research"
    assert first["stage"] == "research"