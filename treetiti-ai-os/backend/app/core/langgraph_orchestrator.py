"""TREEtiti AI Marketing OS — LangGraph orchestration (spec §17, §32, §40).

LangGraph manages the *dependencies* between workflow stages: independent
stages run in parallel branches, stages with dependencies wait for all of them,
and the shared Workflow state machine still drives status transitions + events.

    research (competitors)  ┐
    research (trends)       ├─ ∥  → content_strategist → ...
    analyze existing        ┘

This adapter builds a ``StateGraph`` from a ``(stage, [deps])`` declaration and
reuses the tested ``Workflow``/``WorkflowEngine`` primitives for state
(``start_stage``/``finish_stage``/``fail_stage``) so the rest of the OS (SSE,
artifacts, QA, approvals) keeps working unchanged.

Only stages with a registered runner are executed; missing runners are skipped
just like the sequential engine. Nodes are idempotent (a completed stage
short-circuits) so LangGraph's branch re-invocation never double-runs a stage.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any, Callable, Iterable, TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.events import WORKFLOW_ADVANCED, emit
from app.core.workflow import COMPLETED, Workflow

logger = logging.getLogger("treetiti.core.langgraph")

# Stage -> ordered list of stages it depends on. Empty deps = root stage.
StageDecl = tuple[str, Iterable[str]]


def _merge_results(acc: dict[str, Any] | None, new: dict[str, Any] | None) -> dict[str, Any]:
    return {**(acc or {}), **(new or {})}


def _merge_completed(acc: list[str] | None, new: list[str] | None) -> list[str]:
    return list(dict.fromkeys([*(acc or []), *(new or [])]))


class OrchestratorState(TypedDict, total=False):
    """Shared LangGraph state: accumulate stage results + completed names.

    LangGraph merges returns from parallel branches with these reducers, so a
    join node (e.g. Content Strategist) sees every upstream result.
    """

    workflow: Workflow
    inputs: dict[str, Any]
    results: Annotated[dict[str, Any], _merge_results]
    completed: Annotated[list[str], _merge_completed]


def _has_cycle(stages: list[StageDecl]) -> bool:
    """Detect dependency cycles (A→B→A) before building the graph."""
    edges: dict[str, set[str]] = {}
    for name, deps in stages:
        edges.setdefault(name, set()).update(deps or ())
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> bool:
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        for dep in edges.get(node, ()):
            if visit(dep):
                return True
        visiting.discard(node)
        visited.add(node)
        return False

    return any(visit(name) for name, _ in stages)


def build_state_graph(stages: list[StageDecl], runner: Callable[[Workflow, str, dict[str, Any]], dict[str, Any]]) -> StateGraph:
    """Build a LangGraph StateGraph from (stage, deps) declarations.

    ``runner`` receives (workflow, stage_name, merged_inputs) and returns the
    stage result dict, exactly like the sequential engine's registered runners.
    """
    if _has_cycle(stages):
        raise ValueError("workflow stage dependency cycle detected")
    names = [name for name, _ in stages]
    deps_map = {name: set(deps or ()) for name, deps in stages}
    roots = [name for name, deps in stages if not deps]
    if not roots:
        raise ValueError("workflow has no root stage (no stage without dependencies)")

    graph = StateGraph(OrchestratorState)

    def make_node(stage: str) -> Callable[[OrchestratorState], dict[str, Any]]:
        def node(state: OrchestratorState) -> dict[str, Any]:
            wf: Workflow = state["workflow"]
            st = wf.stages[stage]
            if st.status == COMPLETED:  # idempotent across branch re-invocation
                return {"completed": [stage]}
            wf.start_stage(stage, worker=getattr(runner, "__name__", "runner"))
            try:
                result = runner(wf, stage, state.get("inputs") or {})
                payload = result if isinstance(result, dict) else {"result": result}
                wf.finish_stage(stage, payload)
            except Exception as exc:  # noqa: BLE001
                logger.warning("stage %s failed: %s", stage, exc)
                wf.fail_stage(stage, str(exc))
            emit(WORKFLOW_ADVANCED, source=stage, payload={"workflow_id": wf.id, "stage": stage})
            return {"results": {stage: st.result}, "completed": [stage]}
        return node

    for stage in names:
        graph.add_node(stage, make_node(stage))
    for root in roots:
        graph.add_edge(START, root)
    for name, deps in stages:
        for dep in deps or ():
            graph.add_edge(dep, name)
    for name in names:
        downstream = {n for n, d in stages if name in (d or ())}
        if not downstream:
            graph.add_edge(name, END)
    return graph


def run_parallel(
    wf: Workflow,
    stages: list[StageDecl],
    runner: Callable[[Workflow, str, dict[str, Any]], dict[str, Any]],
    *,
    inputs: dict[str, Any] | None = None,
) -> Workflow:
    """Execute a LangGraph workflow, running independent stages in parallel.

    Stages with missing runners are skipped; the workflow object is mutated in
    place and returned. Any exception in a stage is recorded on that stage and
    does not abort the whole graph (mirrors the sequential engine's semantics).
    """
    if inputs:
        wf.inputs = {**wf.inputs, **inputs}
    graph = build_state_graph(stages, runner)
    compiled = graph.compile()
    initial = OrchestratorState(workflow=wf, inputs=wf.inputs, results={}, completed=[])
    compiled.invoke(initial)
    if wf.next_stage() is None and not [
        s for s in wf.stages.values() if s.status in {"blocked", "human_required", "retry", "failed"}
    ]:
        wf.status = COMPLETED
    return wf


def default_stages() -> list[StageDecl]:
    """The canonical agency pipeline as a dependency DAG (spec §0 / §51).

    Research, analytics and campaign research are independent → run in parallel;
    strategy waits for them; editorial + creative direction (both fed by
    strategy) run in parallel; content waits for editorial; media for content;
    QA for media; approval/publish for QA; measure + learning last.
    """
    return [
        ("research", ()),
        ("analytics", ()),
        ("campaign", ("research", "analytics")),
        ("strategy", ("research", "analytics", "campaign")),
        ("editorial", ("strategy",)),
        ("creative", ("strategy",)),
        ("content", ("editorial", "creative")),
        ("image", ("content",)),
        ("video", ("content",)),
        ("qa", ("content", "image", "video")),
        ("approval", ("qa",)),
        ("publish", ("approval",)),
        ("analytics_measure", ("publish",)),
        ("learning", ("analytics_measure",)),
    ]
