"""Unit tests for LangGraph orchestration (spec §17: parallel + dependencies)."""

from __future__ import annotations

import time

import pytest

from app.core.langgraph_orchestrator import (
    _has_cycle,
    build_state_graph,
    default_stages,
    run_parallel,
)
from app.core.workflow import Workflow, WorkflowEngine


def _wf(stages: list[str]) -> Workflow:
    wf = Workflow(wtype="test", stages=stages)
    return wf


def _runner_recorder(log: list[tuple[str, float]]):
    def runner(wf: Workflow, stage: str, merged: dict) -> dict:
        log.append((stage, time.monotonic()))
        wf.inputs[f"{stage}_out"] = stage.upper()
        return {"done": stage}
    return runner


def test_cycle_detection():
    assert _has_cycle([("a", ("b",)), ("b", ("a",))]) is True
    assert _has_cycle([("a", ()), ("b", ("a",))]) is False


def test_no_root_rejected():
    with pytest.raises(ValueError):
        build_state_graph([("a", ("b",)), ("b", ("a",))], runner=lambda *a, **k: {})


def test_parallel_roots_run_concurrently():
    log: list[tuple[str, float]] = []

    def slow_runner(wf: Workflow, stage: str, merged: dict) -> dict:
        log.append((stage, time.monotonic()))
        time.sleep(0.15)
        return {"done": stage}

    wf = _wf(["research", "analytics", "strategy"])
    stages = [("research", ()), ("analytics", ()), ("strategy", ("research", "analytics"))]
    run_parallel(wf, stages, slow_runner)
    # research & analytics both started before either finished (parallel),
    # and strategy ran only after both completed.
    start_times = {s: t for s, t in log if s in ("research", "analytics")}
    assert "research" in start_times and "analytics" in start_times
    assert abs(start_times["research"] - start_times["analytics"]) < 0.1
    strategy_idx = [s for s, _ in log].index("strategy")
    # strategy must start after the slower of the two roots ended (0.15s later)
    assert log[strategy_idx][1] >= min(start_times.values()) + 0.14


def test_dependencies_run_after_all_upstream():
    log: list[str] = []

    def runner(wf: Workflow, stage: str, merged: dict) -> dict:
        log.append(stage)
        return {"done": stage}

    wf = _wf(["a", "b", "c", "d"])
    stages = [("a", ()), ("b", ()), ("c", ("a", "b")), ("d", ("c",))]
    run_parallel(wf, stages, runner)
    assert set(log) == {"a", "b", "c", "d"}
    assert log.index("c") > log.index("a")
    assert log.index("c") > log.index("b")
    assert log.index("d") > log.index("c")


def test_stage_results_accumulate_into_workflow():
    wf = _wf(["a", "b", "c"])
    stages = [("a", ()), ("b", ()), ("c", ("a", "b"))]
    run_parallel(wf, stages, _runner_recorder([]))
    assert wf.stages["a"].result == {"done": "a"}
    assert wf.stages["b"].result == {"done": "b"}
    assert wf.stages["c"].status == "completed"
    assert wf.status == "completed"


def test_default_stages_is_valid_dag():
    stages = default_stages()
    assert _has_cycle(stages) is False
    names = {n for n, _ in stages}
    for _, deps in stages:
        for d in deps or ():
            assert d in names
    roots = [n for n, d in stages if not d]
    assert {"research", "analytics"} <= set(roots)


def test_engine_run_langgraph_with_registered_runners():
    engine = WorkflowEngine()
    for stage in ("research", "analytics", "strategy"):
        engine.register(stage, lambda wf, s, m: {"done": s})
    wf = engine.create(wtype="test", stages=["research", "analytics", "strategy"])
    engine.run_langgraph(wf)
    assert all(wf.stages[s].status == "completed" for s in ("research", "analytics", "strategy"))
    assert wf.status == "completed"


def test_engine_run_langgraph_skips_unregistered():
    engine = WorkflowEngine()
    engine.register("research", lambda wf, s, m: {"done": s})
    wf = engine.create(wtype="test", stages=["research", "content"])
    engine.run_langgraph(wf)
    assert wf.stages["research"].status == "completed"
    assert wf.stages["content"].status == "skipped"


def test_reducer_accumulates_across_branches():
    from app.core.langgraph_orchestrator import _merge_completed, _merge_results

    assert _merge_results({"a": 1}, {"b": 2}) == {"a": 1, "b": 2}
    assert _merge_completed(["a"], ["b", "a"]) == ["a", "b"]