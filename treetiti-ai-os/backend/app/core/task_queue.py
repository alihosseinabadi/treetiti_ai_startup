"""TREEtiti AI Agency OS — in-process task queue + worker (spec §2 long-running work).

    AGENT → TASK QUEUE → WORKER → PROGRESS EVENTS → WEB UI (SSE)

Tasks are enqueued in-process and run on a background worker thread. Every
lifecycle change is published to the global EventBus (``task.started``,
``agent.completed``, ``task.failed``, …) so the SSE bridge in
``routers/tasks.py`` can stream live progress to the UI.

Pure-Python and offline-testable: no database, no network.
"""

from __future__ import annotations

import logging
import queue
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

from app.core.events import emit

logger = logging.getLogger("treetiti.core.task_queue")

# UI-facing progress event names (spec §16).
TASK_STARTED = "task.started"
TASK_COMPLETED = "task.completed"
TASK_FAILED = "task.failed"
AGENT_STARTED = "agent.started"
AGENT_COMPLETED = "agent.completed"
AGENT_RETRYING = "agent.retrying"
TOOL_STARTED = "tool.started"
TOOL_COMPLETED = "tool.completed"
MEDIA_GENERATION_STARTED = "media.generation.started"
MEDIA_GENERATION_COMPLETED = "media.generation.completed"
QA_STARTED = "qa.started"
QA_FAILED = "qa.failed"
AGENT_FAILED = "agent.failed"

# Task statuses.
QUEUED = "queued"
RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"
CANCELLED = "cancelled"

TERMINAL_STATUSES = frozenset({COMPLETED, FAILED, CANCELLED})


@dataclass
class Task:
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    kind: str = "generic"
    label: str = ""
    status: str = QUEUED
    payload: dict[str, Any] = field(default_factory=dict)
    result: dict[str, Any] = field(default_factory=dict)
    error: str = ""
    progress: int = 0
    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    finished_at: datetime | None = None
    events: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "label": self.label,
            "status": self.status,
            "progress": self.progress,
            "payload": self.payload,
            "result": self.result,
            "error": self.error,
            "correlation_id": self.correlation_id,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


# A runner receives the Task (for correlation id / progress) and the payload,
# and returns a JSON-serializable result.
Runner = Callable[["Task", dict[str, Any]], dict[str, Any]]


class TaskQueue:
    """In-process queue + single background worker.

    Thread-safe: enqueue/publish take a lock; the worker runs tasks serially in
    one daemon thread (production can scale workers by changing the count).
    """

    def __init__(self, *, workers: int = 1, event_history: int = 500) -> None:
        self._jobs: queue.Queue[Task] = queue.Queue()
        self._lock = threading.Lock()
        self._tasks: dict[str, Task] = {}
        self._runners: dict[str, Runner] = {}
        self._event_history = event_history
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        for _ in range(max(1, workers)):
            t = threading.Thread(target=self._worker, daemon=True, name="task-worker")
            t.start()
            self._threads.append(t)

    # -- registration --------------------------------------------------------
    def register(self, kind: str, runner: Runner) -> None:
        """Bind a runner to a task kind. Re-registering overwrites."""
        with self._lock:
            self._runners[kind] = runner

    # -- enqueue / inspect ----------------------------------------------------
    def enqueue(self, kind: str, *, label: str = "", payload: dict[str, Any] | None = None) -> Task:
        task = Task(kind=kind, label=label or kind, payload=payload or {})
        with self._lock:
            self._tasks[task.id] = task
        self._jobs.put(task)
        return task

    def get(self, task_id: str) -> Task | None:
        with self._lock:
            return self._tasks.get(task_id)

    def cancel(self, task_id: str) -> bool:
        """Mark a queued/running task cancelled (user-facing 'stop')."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None or task.status in TERMINAL_STATUSES:
                return False
            task.status = CANCELLED
            task.finished_at = datetime.now(timezone.utc)
        task = self.get(task_id)
        if task:
            ev = emit(
                "task.cancelled",
                source=task.kind,
                workflow_id=task.id,
                correlation_id=task.correlation_id,
                payload={"task_id": task.id, "kind": task.kind, "status": CANCELLED},
            )
            with self._lock:
                task.events.append(ev.to_dict())
        return True

    def list(self, *, limit: int = 50, status: str | None = None) -> list[Task]:
        with self._lock:
            tasks = [t for t in self._tasks.values() if status is None or t.status == status]
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]

    def retry(
        self, task_id: str, *, payload_override: dict[str, Any] | None = None
    ) -> Task | None:
        """Re-enqueue a finished task as a fresh one (retry / reassign).

        Only terminal tasks can be retried. Returns the new Task (or None when
        the source task is not terminal / not found).
        """
        task = self.get(task_id)
        if task is None or task.status not in TERMINAL_STATUSES:
            return None
        payload = dict(task.payload or {})
        if payload_override:
            payload.update(payload_override)
        return self.enqueue(task.kind, label=f"{task.label} (retry)", payload=payload)

    # -- worker ---------------------------------------------------------------
    def _worker(self) -> None:
        while not self._stop.is_set():
            try:
                task = self._jobs.get(timeout=0.5)
            except queue.Empty:
                continue
            try:
                self._run_one(task)
            finally:
                self._jobs.task_done()

    def _run_one(self, task: Task) -> None:
        task.status = RUNNING
        task.started_at = datetime.now(timezone.utc)
        self._publish(TASK_STARTED, task, extra={"state": RUNNING})
        runner = self._runners.get(task.kind)
        if runner is None:
            self._fail(task, f"no runner registered for task kind {task.kind!r}")
            return
        try:
            result = runner(task, task.payload)
            task.result = result if isinstance(result, dict) else {"result": result}
            task.status = COMPLETED
            task.progress = 100
            task.finished_at = datetime.now(timezone.utc)
            self._publish(TASK_COMPLETED, task, extra={"result": task.result})
        except Exception as exc:  # noqa: BLE001  (a failing task must never kill the worker)
            logger.exception("task %s (%s) failed", task.id, task.kind)
            self._fail(task, str(exc))

    def _fail(self, task: Task, error: str) -> None:
        task.status = FAILED
        task.error = error
        task.finished_at = datetime.now(timezone.utc)
        self._publish(TASK_FAILED, task, extra={"error": error})

    def _publish(self, name: str, task: Task, *, extra: dict[str, Any] | None = None) -> None:
        ev = emit(
            name,
            source=task.kind,
            workflow_id=task.id,
            correlation_id=task.correlation_id,
            payload={"task_id": task.id, "kind": task.kind, **(extra or {})},
        )
        with self._lock:
            task.events.append(ev.to_dict())
            if len(task.events) > self._event_history:
                task.events = task.events[-self._event_history :]
        _persist_task(task)
        _persist_event(task, name, ev)

    def stop(self, *, timeout: float = 5.0) -> None:
        self._stop.set()
        for t in self._threads:
            t.join(timeout=timeout)
        self._threads.clear()


# ---------------------------------------------------------------------------
# Built-in runners
# ---------------------------------------------------------------------------

def echo_runner(task: Task, payload: dict[str, Any]) -> dict[str, Any]:
    """Instant, offline smoke-test runner."""
    return {"message": payload.get("message", "")}


def workflow_runner(task: Task, payload: dict[str, Any]) -> dict[str, Any]:
    """Run a Workflow through the engine; returns its serialized state."""
    from app.core.workflow import get_engine

    engine = get_engine()
    wf = engine.create(
        wtype=payload.get("wtype", "campaign_creation"),
        stages=payload.get("stages"),
    )
    emit(
        AGENT_STARTED,
        source="workflow",
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "stage": "orchestrator"},
    )
    engine.run(wf, inputs=payload.get("inputs"))
    state = wf.to_dict()
    if wf.status == "completed":
        emit(
            AGENT_COMPLETED,
            source="workflow",
            workflow_id=task.id,
            correlation_id=task.correlation_id,
            payload={"task_id": task.id, "status": "completed", "stages": len(state["stages"])},
        )
    else:
        emit(
            AGENT_RETRYING,
            source="workflow",
            workflow_id=task.id,
            correlation_id=task.correlation_id,
            payload={"task_id": task.id, "status": wf.status},
        )
    return state


def langgraph_runner(task: Task, payload: dict[str, Any]) -> dict[str, Any]:
    """Run a Workflow through LangGraph (spec §17: parallel dependencies).

    Payload: {"wtype", "stages", "inputs", "deps"}. ``deps`` overrides the
    default canonical DAG when provided.
    """
    from app.core.workflow import get_engine

    engine = get_engine()
    wf = engine.create(
        wtype=payload.get("wtype", "campaign_creation"),
        stages=payload.get("stages"),
    )
    emit(
        AGENT_STARTED,
        source="langgraph",
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "stage": "orchestrator", "engine": "langgraph"},
    )
    engine.run_langgraph(wf, inputs=payload.get("inputs"), stages=payload.get("deps"))
    state = wf.to_dict()
    status_event = AGENT_COMPLETED if wf.status == "completed" else AGENT_RETRYING
    emit(
        status_event,
        source="langgraph",
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "status": wf.status, "stages": len(state["stages"])},
    )
    return state


def agent_runner(task: Task, payload: dict[str, Any]) -> dict[str, Any]:
    """Run a registered AI agent by key. Payload: {"agent", "args": [], "kwargs": {}}."""
    from app.agents import get_agent

    agent_key = payload.get("agent", "")
    if not agent_key:
        raise ValueError("payload['agent'] is required")
    agent = get_agent(agent_key)
    emit(
        AGENT_STARTED,
        source=agent_key,
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "agent": agent_key},
    )
    kwargs = _coerce_agent_kwargs(agent, dict(payload.get("kwargs", {})))
    # Thread the background task id through so signature-aware agents (e.g. the
    # CEO) can tag their per-stage progress events with it → the UI can group
    # live team activity under the right mission.
    try:
        import inspect

        _accepts = "task_id" in inspect.signature(agent.run).parameters
    except Exception:  # noqa: BLE001
        _accepts = False
    if _accepts:
        kwargs.setdefault("task_id", task.id)
    result = agent.run(
        *payload.get("args", []),
        **kwargs,
    )
    if isinstance(result, dict):
        output = result
    else:
        output = {"output": result}
    emit(
        AGENT_COMPLETED,
        source=agent_key,
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "agent": agent_key, "summary": str(result)[:500]},
    )
    return {"agent": agent_key, **output}


# Generic kwargs for agents that accept a text brief under a differently-named
# parameter (mirrors the CEO's _BRIEF_PARAMS mapping in agents/ceo.py).
_BRIEF_PARAMS = ("content", "extra_context", "issue", "idea", "topic", "opportunity", "insight_brief")


def _coerce_agent_kwargs(agent: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
    """Hand each agent only the kwargs its run() actually accepts.

    A `brief` kwarg is aliased onto the first accepted brief-param the agent
    declares (content/extra_context/issue/idea/topic), so callers can always
    send {"brief": ..., "extra_context": ...} regardless of the agent.
    """
    import inspect

    try:
        accepted = set(inspect.signature(agent.run).parameters)
    except Exception:  # noqa: BLE001
        return dict(kwargs)
    if not accepted:
        return dict(kwargs)
    out = {k: v for k, v in kwargs.items() if k in accepted}
    if "brief" in kwargs and "brief" not in accepted and kwargs.get("brief"):
        target = next((p for p in _BRIEF_PARAMS if p in accepted), None)
        if target:
            out[target] = kwargs["brief"]
    return out


def media_runner(task: Task, payload: dict[str, Any]) -> dict[str, Any]:
    """Produce a media asset (image/video) via the media services. Degrades to
    spec_only/failed instead of raising — never kills the worker."""
    kind = task.kind.replace("media_", "")
    prompt = payload.get("prompt", "")
    emit(
        MEDIA_GENERATION_STARTED,
        source=f"media:{kind}",
        workflow_id=task.id,
        correlation_id=task.correlation_id,
        payload={"task_id": task.id, "kind": kind, "prompt": prompt[:200]},
    )
    try:
        if kind == "image":
            from app.services.media import produce_image

            produced = produce_image(prompt)
        elif kind == "video":
            from app.services.media import produce_video

            produced = produce_video(prompt, filename="os_command_video.mp4")
        else:  # pragma: no cover — 3d/audio not routed here yet
            produced = {"status": "spec_only", "message": "kind not supported"}
        result = {"kind": kind, **produced}
        # Persist a MediaAsset row for the workspace (best-effort).
        try:
            from app.database import SessionLocal
            from app.models import MediaAsset

            with SessionLocal() as db:
                db.add(
                    MediaAsset(
                        kind=kind,
                        title=prompt[:80] or f"{kind} asset",
                        creator_agent=f"media:{kind}",
                        prompt=prompt,
                        url=produced.get("url", ""),
                        project_id=payload.get("project_id", ""),
                    )
                )
                db.commit()
        except Exception:  # noqa: BLE001
            pass
        emit(
            MEDIA_GENERATION_COMPLETED,
            source=f"media:{kind}",
            workflow_id=task.id,
            correlation_id=task.correlation_id,
            payload={"task_id": task.id, "kind": kind, "status": produced.get("status")},
        )
        return result
    except Exception as exc:  # noqa: BLE001
        emit(
            "media.generation.failed",
            source=f"media:{kind}",
            workflow_id=task.id,
            correlation_id=task.correlation_id,
            payload={"task_id": task.id, "kind": kind, "error": str(exc)},
        )
        raise


# ---------------------------------------------------------------------------
# Persistence (best-effort): mirror the in-process queue to TaskRecord/TaskEvent
# so work history survives restarts and is queryable from the UI. Runs on a
# short-lived daemon thread so the queue worker is never blocked by DB I/O.
# Never throws.
# ---------------------------------------------------------------------------

def _persist_task(task: Task) -> None:
    def _work() -> None:
        try:
            from app.database import SessionLocal
            from app.models import TaskRecord

            with SessionLocal() as db:
                row = db.get(TaskRecord, task.id)
                if row is None:
                    db.add(
                        TaskRecord(
                            id=task.id,
                            kind=task.kind,
                            label=task.label,
                            status=task.status,
                            payload=task.payload,
                            result=task.result,
                            error=task.error,
                            progress=task.progress,
                            workflow_id=task.correlation_id,
                            created_at=task.created_at,
                            started_at=task.started_at,
                            finished_at=task.finished_at,
                        )
                    )
                else:
                    row.status = task.status
                    row.result = task.result
                    row.error = task.error
                    row.progress = task.progress
                    row.started_at = task.started_at
                    row.finished_at = task.finished_at
                db.commit()
        except Exception:  # noqa: BLE001  (persistence is best-effort)
            pass

    threading.Thread(target=_work, daemon=True).start()


def _persist_event(task: Task, name: str, ev: Any) -> None:
    def _work() -> None:
        try:
            from app.database import SessionLocal
            from app.models import TaskEvent

            with SessionLocal() as db:
                db.add(
                    TaskEvent(
                        task_id=task.id,
                        event_type=name,
                        source=ev.source,
                        payload=ev.payload,
                        correlation_id=ev.correlation_id,
                        created_at=ev.created_at,
                    )
                )
                db.commit()
        except Exception:  # noqa: BLE001
            pass

    threading.Thread(target=_work, daemon=True).start()


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

_GLOBAL_LOCK = threading.Lock()
_GLOBAL_QUEUE: TaskQueue | None = None


def get_queue() -> TaskQueue:
    """Default global queue (shared across threads, lazily created)."""
    global _GLOBAL_QUEUE  # noqa: PLW0603
    if _GLOBAL_QUEUE is None:
        with _GLOBAL_LOCK:
            if _GLOBAL_QUEUE is None:
                _GLOBAL_QUEUE = TaskQueue()
                _register_defaults(_GLOBAL_QUEUE)
    return _GLOBAL_QUEUE


def _register_defaults(q: TaskQueue) -> None:
    """Register the built-in runners so any caller can enqueue them."""
    q.register("echo", echo_runner)
    q.register("workflow", workflow_runner)
    q.register("langgraph", langgraph_runner)
    q.register("agent", agent_runner)
    q.register("media_image", media_runner)
    q.register("media_video", media_runner)