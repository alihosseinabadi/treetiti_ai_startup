"""TREEtiti AI Agency OS — Workflow Engine (spec §40, §41, §42, §44).

A named pipeline with an ordered list of stages. Each stage transitions through
``pending → running → completed | failed | blocked | skipped`` and can require a
human at ``human_required``. Handoffs record exactly what each stage produced for
the next one, so a workflow is debuggable end-to-end.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Iterable

from app.core.events import WORKFLOW_ADVANCED, emit

# Stage statuses (spec §40).
PENDING = "pending"
RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"
BLOCKED = "blocked"
RETRY = "retry"
SKIPPED = "skipped"
HUMAN_REQUIRED = "human_required"

STAGE_STATUSES = frozenset(
    {PENDING, RUNNING, COMPLETED, FAILED, BLOCKED, RETRY, SKIPPED, HUMAN_REQUIRED}
)

# The canonical agency workflow (spec §0 / §51).
CANONICAL_STAGES = [
    "research",
    "analytics",
    "strategy",
    "campaign",
    "content",
    "image",
    "video",
    "qa",
    "approval",
    "publish",
    "analytics_measure",
    "learning",
]


@dataclass
class StageState:
    name: str
    status: str = PENDING
    attempts: int = 0
    worker: str = ""
    error: str = ""
    result: dict[str, Any] = field(default_factory=dict)
    started_at: datetime | None = None
    finished_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["started_at"] = self.started_at.isoformat() if self.started_at else None
        d["finished_at"] = self.finished_at.isoformat() if self.finished_at else None
        return d


@dataclass
class Handoff:
    from_agent: str
    to_agent: str
    task_id: str
    input_artifacts: list[str] = field(default_factory=list)
    required_output: str = ""
    constraints: list[str] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class Workflow:
    def __init__(
        self,
        *,
        workflow_id: str | None = None,
        wtype: str = "campaign_creation",
        stages: Iterable[str] | None = None,
    ) -> None:
        self.id = workflow_id or uuid.uuid4().hex
        self.type = wtype
        self.status = RUNNING  # running | completed | failed | paused
        self.current_stage: str | None = None
        self.stages: dict[str, StageState] = {
            s: StageState(name=s) for s in (stages or CANONICAL_STAGES)
        }
        self._order = [s for s in (stages or CANONICAL_STAGES)]
        self.handoffs: list[Handoff] = []
        self.inputs: dict[str, Any] = {}
        self.outputs: dict[str, Any] = {}
        self.depth = 0
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = self.created_at

    # -- queries ------------------------------------------------------------
    def next_stage(self) -> str | None:
        for name in self._order:
            st = self.stages[name]
            if st.status == PENDING:
                return name
        return None

    def is_terminal(self) -> bool:
        return self.status in {"completed", "failed"}

    # -- transitions ---------------------------------------------------------
    def _touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc)

    def start_stage(self, name: str, *, worker: str = "") -> StageState:
        st = self.stages[name]
        st.status = RUNNING
        st.worker = worker
        st.attempts += 1
        st.started_at = datetime.now(timezone.utc)
        self.current_stage = name
        self._touch()
        return st

    def finish_stage(self, name: str, result: dict[str, Any], *, emit_event: str | None = None) -> StageState:
        st = self.stages[name]
        st.status = COMPLETED
        st.result = result
        st.finished_at = datetime.now(timezone.utc)
        self.outputs[name] = result
        self._touch()
        if emit_event:
            emit(emit_event, source=st.worker, payload={"workflow_id": self.id, "stage": name})
        emit(WORKFLOW_ADVANCED, source="workflow", payload={"workflow_id": self.id, "stage": name})
        if self.next_stage() is None:
            self.status = COMPLETED
        return st

    def fail_stage(self, name: str, error: str, *, max_retries: int = 2) -> StageState:
        """Record a failure; mark RETRY until max_retries, then FAILED (§44)."""
        st = self.stages[name]
        st.error = error
        st.finished_at = datetime.now(timezone.utc)
        if st.attempts <= max_retries:
            st.status = RETRY
        else:
            st.status = FAILED
            self.status = FAILED
        self._touch()
        return st

    def block_stage(self, name: str, reason: str = "") -> StageState:
        st = self.stages[name]
        st.status = BLOCKED
        st.error = reason
        self.status = "paused" if self.status == RUNNING else self.status
        self._touch()
        return st

    def require_human(self, name: str, *, inputs: dict[str, Any] | None = None) -> StageState:
        st = self.stages[name]
        st.status = HUMAN_REQUIRED
        if inputs:
            st.result = {**st.result, **inputs}
        self.status = "paused"
        self._touch()
        return st

    def approve(self, name: str) -> StageState:
        """Human approved → stage becomes pending (runs next tick) or completes now."""
        st = self.stages[name]
        if st.status == HUMAN_REQUIRED:
            st.status = PENDING
            self.status = RUNNING
        self._touch()
        return st

    def skip_stage(self, name: str, reason: str = "") -> StageState:
        st = self.stages[name]
        st.status = SKIPPED
        st.error = reason or "skipped by orchestrator"
        self.current_stage = name
        self._touch()
        return st

    def record_handoff(self, handoff: Handoff) -> None:
        self.handoffs.append(handoff)
        self._touch()

    # -- serialization --------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        return {
            "workflow_id": self.id,
            "type": self.type,
            "status": self.status,
            "current_stage": self.current_stage,
            "stages": [self.stages[s].to_dict() for s in self._order],
            "handoffs": [h.to_dict() for h in self.handoffs],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


# Stage-runner protocol: callable(name, workflow, inputs) -> dict result
Runner = Callable[["Workflow", str, dict], dict[str, Any]]


class WorkflowEngine:
    def __init__(self) -> None:
        self._runners: dict[str, Runner] = {}
        self._lock = threading.Lock()
        self._workflows: dict[str, Workflow] = {}

    def register(self, stage_name: str, runner: Runner) -> None:
        self._runners[stage_name] = runner

    def create(self, *, wtype: str = "campaign_creation", stages: Iterable[str] | None = None) -> Workflow:
        wf = Workflow(wtype=wtype, stages=stages)
        with self._lock:
            self._workflows[wf.id] = wf
        return wf

    def get(self, workflow_id: str) -> Workflow | None:
        return self._workflows.get(workflow_id)

    def run(self, wf: Workflow, *, inputs: dict[str, Any] | None = None) -> Workflow:
        """Drive the workflow forward until a terminal/blocked/human state.

        Synchronous, single-threaded stepping is intentional: production will
        replace it with a queue, keeping the same Workflow state machine.
        """
        if inputs:
            wf.inputs = {**wf.inputs, **inputs}
        while not wf.is_terminal():
            name = wf.next_stage()
            if name is None:
                break
            st = wf.stages[name]
            if st.status == BLOCKED or st.status == HUMAN_REQUIRED:
                break
            if st.status == RETRY:
                st.status = PENDING
                continue
            runner = self._runners.get(name)
            if runner is None:
                wf.skip_stage(name, reason=f"no runner registered for {name!r}")
                continue
            wf.start_stage(name, worker=getattr(runner, "__name__", "runner"))
            try:
                result = runner(wf, name, {**wf.inputs, **wf.outputs})
                wf.finish_stage(name, result if isinstance(result, dict) else {"result": result})
            except Exception as exc:  # noqa: BLE001
                wf.fail_stage(name, str(exc))
        if not wf.is_terminal():
            stalled = [
                s for s in wf.stages.values()
                if s.status in {BLOCKED, HUMAN_REQUIRED, RETRY, FAILED}
            ]
            if wf.next_stage() is None and not stalled:
                wf.status = COMPLETED
        return wf

    def run_langgraph(
        self,
        wf: Workflow,
        *,
        inputs: dict[str, Any] | None = None,
        stages: Iterable[tuple[str, Iterable[str]]] | None = None,
    ) -> Workflow:
        """Run a workflow through LangGraph (spec §17: parallel dependencies).

        Independent stages run in parallel branches; a stage waits for every
        declared dependency. Falls back to the sequential engine when LangGraph
        is unavailable. ``stages`` is a list of (stage_name, [deps]); defaults
        to the canonical agency DAG.
        """
        # Only stages the engine can execute (registered) AND that belong to
        # this workflow's declared stage set may run. Short-circuit before the
        # (slow) langgraph import when nothing is runnable.
        runnable = set(self._runners) & set(wf.stages)
        if not runnable:
            for name in wf.stages:
                wf.skip_stage(name, reason="no runner registered or not in DAG")
            wf.status = COMPLETED
            return wf

        from app.core.langgraph_orchestrator import default_stages, run_parallel

        if stages is None:
            stages = default_stages()
        else:
            stages = list(stages)
        declared = {name for name, _ in stages}
        allowed = declared & runnable
        if allowed != declared:
            stages = [
                (name, [d for d in deps if d in allowed])
                for name, deps in stages if name in allowed
            ]
        for name in wf.stages:
            if name not in allowed:
                wf.skip_stage(name, reason="no runner registered or not in DAG")
        if not stages:
            wf.status = COMPLETED
            return wf

        def runner(wf: Workflow, stage: str, merged: dict[str, Any]) -> dict[str, Any]:
            fn = self._runners[stage]
            return fn(wf, stage, merged)

        return run_parallel(wf, stages, runner, inputs=inputs)


singleton: WorkflowEngine | None = None


def get_engine() -> WorkflowEngine:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = WorkflowEngine()
    return singleton