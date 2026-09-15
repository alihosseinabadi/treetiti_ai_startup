"""Unit tests for the CEO / Orchestrator agent (Phase 2, spec §32)."""

from __future__ import annotations

from app.agents import AGENTS, get_agent
from app.agents.ceo import CEOAgent, STAGE_TO_AGENT


def test_ceo_registered_in_runtime():
    assert "ceo" in AGENTS
    agent = get_agent("ceo")
    assert isinstance(agent, CEOAgent)
    assert agent.agent_key == "ceo"


def test_stage_to_agent_maps_core_pipeline():
    assert STAGE_TO_AGENT["research"] == "market_research"
    assert STAGE_TO_AGENT["content"] == "content"
    assert STAGE_TO_AGENT["qa"] == "editor"
    assert STAGE_TO_AGENT["learning"] == "growth_optimizer"


def test_resolve_team_by_capability():
    agent = CEOAgent()
    team = agent.resolve_team(capabilities=["search", "search_news"])
    keys = {t["key"] for t in team}
    assert "market_research" in keys
    assert "ceo" not in keys  # CEO resolves others, never itself


def test_resolve_team_returns_spec_dicts():
    agent = CEOAgent()
    team = agent.resolve_team(skills=["copywriting"])
    assert team
    assert all({"key", "name", "role", "department", "status"} <= set(t) for t in team)


def test_build_workflow_registers_only_implemented_agents():
    from app.agents import AGENTS as runtime

    agent = CEOAgent()
    wf = agent.build_workflow(brief="launch campaign", team_keys=set(runtime.keys()))
    # Every stage mapped to a runtime agent must be present.
    present = set(wf.stages)
    for stage, agent_key in STAGE_TO_AGENT.items():
        if agent_key in runtime:
            assert stage in present


def test_run_degrades_when_no_agent_reachable():
    """CEO run must not raise even when every stage skips (no runners)."""
    agent = CEOAgent()
    report = agent.run(brief="test brief", team_keys=set())
    assert report["status"] in {"completed", "running"}
    assert report["brief"] == "test brief"
    assert isinstance(report["stages"], list)


def test_run_reports_team_and_stage_statuses():
    agent = CEOAgent()
    report = agent.run(
        brief="monthly content sprint",
        capabilities=["content_create"],
    )
    assert "content" in report["team"]
    assert report["team_details"]
    assert any(s["name"] == "content" for s in report["stages"])


def test_run_with_dag_overrides():
    """Custom DAG keeps only the stages we pass; dropped ones are skipped."""
    agent = CEOAgent()
    report = agent.run(brief="x", team_keys=set(), stages=[("content", ())])
    statuses = {s["name"]: s["status"] for s in report["stages"]}
    assert statuses.get("content") in {"skipped", "completed"}


def test_qa_loop_rejects_after_max_attempts_without_revision_agent():
    """QA return loop stops after MAX_QA_ATTEMPTS even with no revision agent."""
    from app.agents.ceo import MAX_QA_ATTEMPTS
    from app.agents import get_agent

    class _RejectingEditor:
        def run(self, content: str = "", **kwargs: Any) -> dict[str, Any]:
            return {
                "status": "rejected",
                "revision_notes": ["always reject"],
                "scores": {},
                "hallucination_flags": [],
                "approved_for_client": False,
            }

    ceo = CEOAgent()
    wf = ceo.build_workflow(brief="x", team_keys=set(), stages=[("content", ()), ("qa", ())])
    wf.outputs["content"] = {"result": [{"title": "T", "platform": "linkedin", "body": "body"}]}
    verdict = ceo._run_qa_loop(wf, "qa", {}, _RejectingEditor(), task_id=None)
    assert verdict["status"] == "rejected"
    assert verdict["attempts"] == MAX_QA_ATTEMPTS
    assert verdict["revision_notes"] == ["always reject"]


def test_qa_loop_approves_on_first_pass():
    """QA loop passes content through when the editor approves immediately."""
    from app.agents.ceo import MAX_QA_ATTEMPTS

    class _ApprovingEditor:
        def run(self, content: str = "", **kwargs: Any) -> dict[str, Any]:
            return {
                "status": "approved",
                "scores": {"overall": 9},
                "revision_notes": [],
                "hallucination_flags": [],
                "approved_for_client": True,
            }

    ceo = CEOAgent()
    wf = ceo.build_workflow(brief="x", team_keys=set(), stages=[("content", ()), ("qa", ())])
    wf.outputs["content"] = {"result": [{"title": "T", "platform": "linkedin", "body": "body"}]}
    verdict = ceo._run_qa_loop(wf, "qa", {}, _ApprovingEditor(), task_id=None)
    assert verdict["status"] == "approved"
    assert verdict["attempts"] == 1
    assert verdict["content"]


def test_qa_loop_emits_return_events():
    """Rejection emits AGENT_FAILED with revision notes (office return loop)."""
    from app.core.events import bus
    from app.core.task_queue import AGENT_FAILED

    class _RejectOnceEditor:
        def __init__(self) -> None:
            self.calls = 0

        def run(self, content: str = "", **kwargs: Any) -> dict[str, Any]:
            self.calls += 1
            if self.calls == 1:
                return {
                    "status": "rejected",
                    "revision_notes": ["hook is weak"],
                    "scores": {},
                    "hallucination_flags": [],
                    "approved_for_client": False,
                }
            return {
                "status": "approved",
                "scores": {"overall": 8},
                "revision_notes": [],
                "hallucination_flags": [],
                "approved_for_client": True,
            }

    events: list[dict] = []
    b = bus()
    b.subscribe(AGENT_FAILED, lambda e: events.append(e.to_dict()))
    try:
        ceo = CEOAgent()
        wf = ceo.build_workflow(brief="x", team_keys=set(), stages=[("content", ()), ("qa", ())])
        wf.outputs["content"] = {"result": [{"title": "T", "platform": "linkedin", "body": "body"}]}
        verdict = ceo._run_qa_loop(wf, "qa", {}, _RejectOnceEditor(), task_id=None)
    finally:
        pass  # subscriber is process-local; test bus stays as-is
    assert verdict["status"] == "approved"
    assert verdict["attempts"] == 2
    assert events, "expected an AGENT_FAILED return-loop event"
    assert events[0]["payload"].get("revision_notes") == ["hook is weak"]


# ---- final deliverable synthesis -----------------------------------------


def test_synthesize_returns_empty_when_no_outputs():
    """No stage output -> synthesis degrades to empty, never breaks the run."""
    ceo = CEOAgent()
    wf = ceo.build_workflow(brief="x", team_keys=set())
    out = ceo._synthesize(wf, task_id=None)
    assert isinstance(out, dict)
    assert out.get("result") == ""
    assert out.get("digest") == ""


def test_digest_outputs_flattens_stage_results():
    ceo = CEOAgent()
    wf = ceo.build_workflow(brief="x", team_keys=set(), stages=[("research", ()), ("content", ())])
    wf.outputs["research"] = {"result": "competitor landscape done"}
    wf.outputs["content"] = {"result": [{"title": "Post", "body": "Hello"}]}
    digest = ceo._digest_outputs(wf)
    assert "research" in digest
    assert "content" in digest
    assert "competitor landscape done" in digest
    assert "Hello" in digest


def test_synthesize_falls_back_to_digest_on_llm_failure(monkeypatch):
    ceo = CEOAgent()
    wf = ceo.build_workflow(brief="x", team_keys=set(), stages=[("research", ())])
    wf.outputs["research"] = {"result": "key finding"}

    class _Boom:
        def deliberate(self, prompt, **kwargs):
            raise RuntimeError("providers unreachable")

    monkeypatch.setattr("app.agents.get_agent", lambda key: _Boom())
    out = ceo._synthesize(wf, task_id=None)
    assert "key finding" in out["result"]
    assert "key finding" in out["digest"]


def test_synthesize_wires_into_run_report(monkeypatch):
    """run() exposes a synthesized deliverable (not just raw stage dumps)."""
    from app.agents.ceo import SYNTHESIS_AGENT

    called = {}

    class _FakeStrategist:
        def deliberate(self, prompt, **kwargs):
            called["prompt"] = prompt
            return "# FINAL DELIVERABLE\n\nPolished output."

    monkeypatch.setattr(
        "app.agents.get_agent",
        lambda key: _FakeStrategist() if key == SYNTHESIS_AGENT else None,
    )
    monkeypatch.setattr(
        "app.agents.ceo.CEOAgent._digest_outputs",
        staticmethod(lambda wf: "### research\ncompetitor landscape done"),
    )
    ceo = CEOAgent()
    report = ceo.run(brief="launch", team_keys=set(), stages=[("research", ())])
    assert report["deliverable"] == "# FINAL DELIVERABLE\n\nPolished output."
    assert report["outputs"]["synthesis"]["result"] == "# FINAL DELIVERABLE\n\nPolished output."
    assert "RAW TEAM OUTPUT" in called["prompt"]