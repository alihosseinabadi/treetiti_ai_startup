"""Unit tests for core events, skills, workflow, artifacts, and QA."""

from __future__ import annotations

import json

import pytest

from app.core.artifacts import ArtifactStore, ARTIFACT_TYPES
from app.core.events import CONTENT_CREATED, Event, EventBus, emit
from app.core.qa import CONTENT_GATE, CREATIVE_BRIEF_GATE
from app.core.skill_registry import SkillRegistry, SkillSpec, get_registry
from app.core.workflow import Workflow, WorkflowEngine, HUMAN_REQUIRED, SKIPPED, Handoff, get_engine

# --------------------------------------------------------------------------
# Events (spec §41)
# --------------------------------------------------------------------------


def test_event_bus_delivers_and_retains():
    bus = EventBus(retain=10)
    got: list[Event] = []
    bus.subscribe(CONTENT_CREATED, got.append)
    event = Event(type=CONTENT_CREATED, source="content", payload={"id": "a1"})
    bus.publish(event)
    assert got == [event]
    assert bus.recent(CONTENT_CREATED)[-1] == event


def test_event_bus_wildcard():
    bus = EventBus(retain=5)
    seen: list[str] = []
    bus.subscribe("*", lambda e: seen.append(e.type))
    bus.publish(Event(type="QA_PASSED"))
    assert seen == ["QA_PASSED"]


def test_event_bus_listener_error_is_isolated():
    bus = EventBus()

    def boom(_e):
        raise ValueError("listener bug")

    bus.subscribe("X", boom)
    hits: list[int] = []
    bus.subscribe("X", lambda _e: hits.append(1))
    bus.publish(Event(type="X"))
    assert hits == [1]


def test_emit_helper_uses_global_bus():
    event = emit("RESEARCH_COMPLETED", source="test", payload={"n": 1})
    assert event.type == "RESEARCH_COMPLETED"
    assert event.correlation_id

# --------------------------------------------------------------------------
# Skills (spec §17, §18)
# --------------------------------------------------------------------------


def test_skill_registry_dynamic_selection():
    reg = SkillRegistry(
        [
            SkillSpec(id="a", when_to_use=("instagram",)),
            SkillSpec(id="b", when_to_use=("seo",)),
            SkillSpec(id="c", when_to_use=("instagram", "seo"), enabled=False),
        ]
    )
    assert {s.id for s in reg.for_tags(("instagram",))} == {"a"}
    assert {s.id for s in reg.for_tags(("instagram", "seo"))} == {"a", "b"}


def test_default_skills_include_spec_list():
    reg = get_registry()
    ids = {s.id for s in reg.all()}
    assert {"market_research", "copywriting", "ugc", "seo", "sales_and_leads"} <= ids


# --------------------------------------------------------------------------
# Workflow (spec §40, §42, §44)
# --------------------------------------------------------------------------


def test_workflow_canonical_stages_and_progression():
    engine = WorkflowEngine()
    engine.register("research", lambda wf, name, ctx: {"facts": ["x"]})
    engine.register("analytics", lambda wf, name, ctx: {"insight": "y"})
    wf = engine.create(wtype="campaign_creation", stages=["research", "analytics", "content"])
    tf = engine.run(wf, inputs={"topic": "ai"})
    assert tf.status == "completed"
    assert tf.current_stage == "content"
    assert tf.outputs["research"] == {"facts": ["x"]}
    assert tf.outputs["analytics"] == {"insight": "y"}
    assert wf.stages["content"].status == SKIPPED


def test_workflow_failure_retry_then_fail():
    engine = WorkflowEngine()

    def flaky(_wf, name, ctx):
        raise RuntimeError("boom")

    engine.register("research", flaky)
    wf = engine.create(stages=["research"])
    wf.start_stage("research")
    wf.fail_stage("research", "boom", max_retries=2)
    assert wf.stages["research"].status == "retry"
    wf.start_stage("research")
    wf.fail_stage("research", "boom", max_retries=2)
    wf.start_stage("research")
    wf.fail_stage("research", "boom", max_retries=2)
    assert wf.stages["research"].status == "failed"
    assert wf.status == "failed"


def test_workflow_human_approval_blocks_then_approves():
    wf = Workflow(stages=["content", "image"])
    wf.require_human("content")
    assert wf.stages["content"].status == HUMAN_REQUIRED
    assert wf.status == "paused"
    wf.approve("content")
    assert wf.stages["content"].status == "pending"
    assert wf.status == "running"


def test_workflow_handoff_recorded():
    wf = Workflow(stages=["content"])
    wf.record_handoff(
        Handoff(
            from_agent="strategy",
            to_agent="content",
            task_id="t1",
            input_artifacts=["s1"],
        )
    )
    assert len(wf.handoffs) == 1
    assert wf.handoffs[0].from_agent == "strategy"


def test_run_stops_on_blocked_stage():
    engine = WorkflowEngine()
    engine.register("research", lambda wf, name, ctx: {"ok": 1})
    wf = engine.create(stages=["research", "image"])
    wf.block_stage("image", "need api key")
    tf = engine.run(wf)
    assert tf.stages["research"].status == "completed"
    assert tf.stages["image"].status == "blocked"


# --------------------------------------------------------------------------
# Artifacts (spec §33, §34)
# --------------------------------------------------------------------------


def test_artifact_save_and_versioning(tmp_path):
    store = ArtifactStore(tmp_path)
    a1 = store.new(artifact_type="ContentArtifact", agent="content", payload={"draft": 1})
    a2 = store.save(a1)
    v2 = store.revise(a2.id, feedback="more hooks")
    assert store.latest(a2.id).version == 2
    assert len(store.versions(a2.id)) == 2
    assert v2 is not None and v2.id == a2.id


def test_artifact_lineage():
    store = ArtifactStore(tmp_path_factory_helper())
    base = store.new(artifact_type="ResearchArtifact", agent="research")
    base = store.save(base)
    child = store.new(artifact_type="InsightArtifact", agent="analytics", parent_id=base.id)
    child = store.save(child)
    grand = store.new(artifact_type="CampaignArtifact", agent="campaign", parent_id=child.id)
    grand = store.save(grand)
    lineage = store.lineage(grand.id)
    assert [a.type for a in lineage] == ["ResearchArtifact", "InsightArtifact", "CampaignArtifact"]


def test_artifact_missing_lineage_is_just_self():
    store = ArtifactStore(tmp_path_factory_helper())
    art = store.new(artifact_type="QAArtifact", agent="editor")
    art = store.save(art)
    assert len(store.lineage(art.id)) == 1


def test_artifact_persists_to_disk(tmp_path):
    store = ArtifactStore(tmp_path)
    art = store.save(store.new(artifact_type="ImageArtifact", agent="image", payload={"url": "/x.png"}))
    on_disk = (tmp_path / f"{art.id}.v1.json").read_text()
    assert json.loads(on_disk)["type"] == "ImageArtifact"


def test_artifact_type_validated():
    store = ArtifactStore(tmp_path_factory_helper())
    with pytest.raises(ValueError):
        store.save(store.new(artifact_type="NotReal", agent="x"))


def tmp_path_factory_helper():
    import tempfile

    return tempfile.mkdtemp()

# --------------------------------------------------------------------------
# QA gates (spec §35)
# --------------------------------------------------------------------------


def test_content_gate_rejects_bad_content():
    verdict = CONTENT_GATE.evaluate({"title": "", "body": "", "hook": "", "cta": ""})
    assert verdict.passed is False
    assert any("title" in p for p in verdict.problems)


def test_content_gate_passes_good_content():
    verdict = CONTENT_GATE.evaluate(
        {"title": "T", "body": "b" * 10, "hook": "h", "cta": "c"}
    )
    assert verdict.passed is True


def test_content_gate_rejects_forbidden_term():
    verdict = CONTENT_GATE.evaluate({"title": "Buy now", "body": "x", "hook": "y", "cta": "z"})
    assert verdict.passed is False


def test_brief_gate_schema():
    verdict = CREATIVE_BRIEF_GATE.evaluate(
        {"platform": "instagram", "format": "reel", "objective": "lead_generation",
         "hook": "h", "message": "m", "audience": "a", "scene_count": 6}
    )
    assert verdict.passed is True
    bad = CREATIVE_BRIEF_GATE.evaluate({"platform": "instagram", "scene_count": "six"})
    assert bad.passed is False


def test_gate_emits_events():
    from app.core import events

    seen: list[str] = []
    events.bus().subscribe("QA_FAILED", lambda e: seen.append(e.type))
    CONTENT_GATE.evaluate({"whatever": 1})  # junk payload fails required-field rules
    assert seen == ["QA_FAILED"]