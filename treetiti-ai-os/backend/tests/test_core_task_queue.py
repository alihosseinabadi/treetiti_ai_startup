"""Task queue + worker tests (spec §2 long-running work, plan §L). Offline.

The queue is pure-Python/in-memory: no database, no network, no LLM.
"""

from __future__ import annotations

import time

import pytest

from app.core.task_queue import (
    COMPLETED,
    FAILED,
    QUEUED,
    RUNNING,
    TaskQueue,
    agent_runner,
    echo_runner,
    langgraph_runner,
    workflow_runner,
)


def _wait_status(q: TaskQueue, task_id: str, status: str, timeout: float = 3.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        t = q.get(task_id)
        if t is not None and t.status == status:
            return True
        time.sleep(0.02)
    return False


@pytest.fixture
def q():
    queue = TaskQueue()
    queue.register("echo", echo_runner)
    queue.register("workflow", workflow_runner)
    queue.register("langgraph", langgraph_runner)
    queue.register("agent", agent_runner)
    yield queue
    queue.stop()


def test_enqueue_returns_queued_task(q):
    task = q.enqueue("echo", label="ping", payload={"message": "hi"})
    assert task.id
    assert task.status == QUEUED
    assert task.label == "ping"


def test_echo_runner_completes(q):
    task = q.enqueue("echo", payload={"message": "hello"})
    assert _wait_status(q, task.id, COMPLETED)
    done = q.get(task.id)
    assert done.result == {"message": "hello"}
    assert done.progress == 100
    assert done.finished_at is not None


def test_unknown_runner_fails_task(q):
    task = q.enqueue("nope")
    assert _wait_status(q, task.id, FAILED)
    done = q.get(task.id)
    assert "no runner registered" in done.error


def test_task_emits_lifecycle_events(q):
    task = q.enqueue("echo", payload={"message": "x"})
    assert _wait_status(q, task.id, COMPLETED)
    done = q.get(task.id)
    types = [e["type"] for e in done.events]
    assert "task.started" in types
    assert "task.completed" in types
    # every event is correlated to the task for SSE filtering
    for e in done.events:
        assert e["payload"].get("task_id") == task.id


def test_workflow_runner_skips_unregistered_stages_and_completes(q):
    # No runners registered on the engine → every stage is skipped, and the
    # engine marks the workflow completed when it ends by skipping.
    task = q.enqueue("workflow", payload={"wtype": "campaign_creation"})
    assert _wait_status(q, task.id, COMPLETED)
    done = q.get(task.id)
    state = done.result
    assert state["type"] == "campaign_creation"
    assert state["status"] == "completed"
    assert all(s["status"] == "skipped" for s in state["stages"])


def test_langgraph_runner_completes_with_default_dag(q):
    task = q.enqueue("langgraph", payload={"wtype": "campaign_creation"})
    assert _wait_status(q, task.id, COMPLETED)
    done = q.get(task.id)
    state = done.result
    assert state["status"] == "completed"
    # LangGraph engine: every DAG stage without a runner is skipped, but the
    # graph itself compiles and runs with the canonical stages.
    assert len(state["stages"]) >= 8  # canonical agency DAG breadth


def test_agent_runner_requires_agent_key(q):
    task = q.enqueue("agent", payload={"args": [], "kwargs": {}})
    assert _wait_status(q, task.id, FAILED)
    assert "agent" in q.get(task.id).error


def test_list_filters_by_status(q):
    a = q.enqueue("echo", payload={"message": "1"})
    b = q.enqueue("echo", payload={"message": "2"})
    _wait_status(q, a.id, COMPLETED)
    _wait_status(q, b.id, COMPLETED)
    assert len(q.list(limit=10)) == 2
    assert len(q.list(limit=10, status=COMPLETED)) == 2
    assert len(q.list(limit=10, status=RUNNING)) == 0


def test_get_missing_returns_none(q):
    assert q.get("does-not-exist") is None