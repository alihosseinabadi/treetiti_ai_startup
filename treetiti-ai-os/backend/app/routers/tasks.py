"""TREEtiti AI Agency OS — task routes (queue + worker + SSE, plan §L).

    POST /api/v1/tasks         enqueue work (echo | workflow | agent)
    GET  /api/v1/tasks         list tasks (optional ?status=, ?limit=)
    GET  /api/v1/tasks/{id}    task detail + retained events
    GET  /api/v1/tasks/{id}/events   SSE stream for one task
    GET  /api/v1/stream        global SSE stream of team activity

SSE transport: a per-connection bridge subscribes to the global EventBus and
streams ``data: {json}\\n\\n`` frames. Already-completed tasks replay their
retained event history before the live stream.
"""

from __future__ import annotations

import asyncio
import json
import queue as _queue
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_user
from app.core.events import Event, bus
from app.core.task_queue import (
    TERMINAL_STATUSES,
    Task,
    TaskQueue,
    agent_runner,
    echo_runner,
    get_queue,
    langgraph_runner,
    media_runner,
    workflow_runner,
)
from app.models import User

router = APIRouter(prefix="/tasks", tags=["tasks"])
stream_router = APIRouter(tags=["stream"])


def _app_queue() -> TaskQueue:
    q = get_queue()
    # idempotent registration of the built-in runners.
    q.register("echo", echo_runner)
    q.register("workflow", workflow_runner)
    q.register("langgraph", langgraph_runner)
    q.register("agent", agent_runner)
    q.register("media_image", media_runner)
    q.register("media_video", media_runner)
    return q


def _sse_frame(record: dict[str, Any]) -> str:
    """Render an event dict (or Event.to_dict()) as an SSE data frame."""
    return f"data: {json.dumps(record)}\n\n"


def _event_record(event: Event) -> dict[str, Any]:
    return {
        "type": event.type,
        "source": event.source,
        "payload": event.payload,
        "correlation_id": event.correlation_id,
        "created_at": event.created_at.isoformat(),
    }


async def _event_stream(q: TaskQueue, *, task_id: str | None = None):
    """Bridge the in-process bus to an SSE response."""
    pending: _queue.Queue = _queue.Queue(maxsize=1000)
    task = q.get(task_id) if task_id else None

    def on_event(event: Event) -> None:
        if task_id and event.payload.get("task_id") != task_id:
            return
        try:
            pending.put_nowait(event)
        except _queue.Full:
            pass

    bus().subscribe("*", on_event)
    try:
        # Replay retained history for an already-started task.
        if task is not None:
            for record in task.events:
                yield _sse_frame(record)
        while True:
            try:
                event = pending.get_nowait()
            except _queue.Empty:
                if task_id:
                    live = q.get(task_id)
                    if live is not None and live.status in TERMINAL_STATUSES:
                        return  # terminal task → close the stream
                yield ": keepalive\n\n"
                await asyncio.sleep(0.5)
                continue
            yield _sse_frame(_event_record(event))
            if task_id:
                live = q.get(task_id)
                if live is not None and live.status in TERMINAL_STATUSES:
                    return
    finally:
        bus().unsubscribe("*", on_event)


# ---------------------------------------------------------------------------
# REST
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    kind: str  # echo | workflow | langgraph | agent
    label: str = ""
    payload: dict = {}


@router.post("", status_code=201)
def create_task(
    body: TaskCreate,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    q = _app_queue()
    if body.kind not in {"echo", "workflow", "langgraph", "agent"}:
        raise HTTPException(status_code=422, detail=f"unknown task kind: {body.kind!r}")
    task = q.enqueue(body.kind, label=body.label, payload=body.payload)
    return {"task_id": task.id, "kind": task.kind, "label": task.label, "status": task.status}


@router.get("")
def list_tasks(
    _: Annotated[User, Depends(get_current_user)],
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    tasks = _app_queue().list(limit=limit, status=status)
    return {"tasks": [t.to_dict() for t in tasks]}


@router.get("/{task_id}")
def get_task(
    task_id: str,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    task = _app_queue().get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"task {task_id!r} not found")
    return {**task.to_dict(), "events": task.events}


@router.post("/{task_id}/cancel")
def cancel_task(
    task_id: str,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    q = _app_queue()
    task = q.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"task {task_id!r} not found")
    if task.status in TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"task {task_id!r} already {task.status}")
    q.cancel(task_id)
    return {"task_id": task_id, "status": "cancelled"}


class TaskReassign(BaseModel):
    agent: str


@router.post("/{task_id}/retry")
def retry_task(
    task_id: str,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Re-run a finished (failed/completed) task as a fresh task."""
    q = _app_queue()
    task = q.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"task {task_id!r} not found")
    if task.status not in TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"task {task_id!r} is still running")
    fresh = q.retry(task_id)
    if fresh is None:
        raise HTTPException(status_code=400, detail="could not retry task")
    return {
        "task_id": fresh.id,
        "kind": fresh.kind,
        "label": fresh.label,
        "status": fresh.status,
        "retried_from": task_id,
    }


@router.post("/{task_id}/reassign")
def reassign_task(
    task_id: str,
    body: TaskReassign,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Give a finished task to a different agent (re-runs it)."""
    from app.agents import get_agent

    try:
        get_agent(body.agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"unknown agent {body.agent!r}") from None
    q = _app_queue()
    task = q.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"task {task_id!r} not found")
    if task.status not in TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"task {task_id!r} is still running")
    fresh = q.retry(task_id, payload_override={"agent": body.agent})
    if fresh is None:
        raise HTTPException(status_code=400, detail="could not reassign task")
    return {
        "task_id": fresh.id,
        "kind": fresh.kind,
        "label": fresh.label,
        "status": fresh.status,
        "reassigned_to": body.agent,
        "retried_from": task_id,
    }


# ---------------------------------------------------------------------------
# SSE
# ---------------------------------------------------------------------------

@router.get("/{task_id}/events")
def task_event_stream(task_id: str, _: Annotated[User, Depends(get_current_user)]) -> StreamingResponse:
    q = _app_queue()
    if q.get(task_id) is None:
        raise HTTPException(status_code=404, detail=f"task {task_id!r} not found")
    return StreamingResponse(
        _event_stream(q, task_id=task_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@stream_router.get("/stream")
def global_stream(_: Annotated[User, Depends(get_current_user)]) -> StreamingResponse:
    """Team activity: every event on the bus, live."""
    return StreamingResponse(
        _event_stream(_app_queue()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )