"""TREEtiti AI Agency OS — structured event system (spec §41, §42).

Agents communicate via structured events — NOT free-form agent chat. The bus is
in-process and thread-safe; every published event carries a correlation id so a
whole workflow stays traceable end-to-end.

Standard event types from the spec:

    RESEARCH_COMPLETED ANALYTICS_COMPLETED STRATEGY_CREATED CAMPAIGN_CREATED
    CONTENT_CREATED IMAGE_CREATED VIDEO_CREATED QA_FAILED QA_PASSED
    APPROVAL_REQUIRED APPROVED PUBLISHED PERFORMANCE_AVAILABLE LEARNING_CREATED
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

# Canonical event names (spec §41).
RESEARCH_COMPLETED = "RESEARCH_COMPLETED"
ANALYTICS_COMPLETED = "ANALYTICS_COMPLETED"
STRATEGY_CREATED = "STRATEGY_CREATED"
CAMPAIGN_CREATED = "CAMPAIGN_CREATED"
CONTENT_CREATED = "CONTENT_CREATED"
IMAGE_CREATED = "IMAGE_CREATED"
VIDEO_CREATED = "VIDEO_CREATED"
QA_FAILED = "QA_FAILED"
QA_PASSED = "QA_PASSED"
APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
APPROVED = "APPROVED"
REJECTED = "REJECTED"
PUBLISHED = "PUBLISHED"
PERFORMANCE_AVAILABLE = "PERFORMANCE_AVAILABLE"
LEARNING_CREATED = "LEARNING_CREATED"
AGENT_RUN_STARTED = "AGENT_RUN_STARTED"
AGENT_RUN_FINISHED = "AGENT_RUN_FINISHED"
WORKFLOW_ADVANCED = "WORKFLOW_ADVANCED"

# Autonomous mission events (rebuild §25: mission.* on the live office stream).
MISSION_CREATED = "mission.created"
MISSION_STARTED = "mission.started"
MISSION_STAGE_STARTED = "mission.stage.started"
MISSION_STAGE_COMPLETED = "mission.stage.completed"
MISSION_COMPLETED = "mission.completed"
MISSION_FAILED = "mission.failed"
MISSION_PAUSED = "mission.paused"
MISSION_RESUMED = "mission.resumed"
MISSION_INSTRUCTED = "mission.instructed"
HANDOFF_CREATED = "handoff.created"
HANDOFF_RECEIVED = "handoff.received"
ARTIFACT_CREATED = "artifact.created"


@dataclass
class Event:
    type: str
    source: str = ""          # agent / service name
    payload: dict[str, Any] = field(default_factory=dict)
    workflow_id: str = ""
    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "source": self.source,
            "payload": self.payload,
            "workflow_id": self.workflow_id,
            "correlation_id": self.correlation_id,
            "created_at": self.created_at.isoformat(),
        }


Subscriber = Callable[[Event], None]


class EventBus:
    """In-process publish/subscribe bus with optional retained history."""

    def __init__(self, *, retain: int = 0) -> None:
        self._lock = threading.Lock()
        self._subscribers: dict[str, list[Subscriber]] = {}
        self._history: list[Event] = []
        self._retain = retain

    def subscribe(self, event_type: str, fn: Subscriber) -> None:
        with self._lock:
            self._subscribers.setdefault(event_type, []).append(fn)

    def unsubscribe(self, event_type: str, fn: Subscriber) -> None:
        with self._lock:
            subs = self._subscribers.get(event_type, [])
            if fn in subs:
                subs.remove(fn)

    def publish(self, event: Event) -> None:
        with self._lock:
            if self._retain:
                self._history.append(event)
                if len(self._history) > self._retain:
                    self._history = self._history[-self._retain :]
            subs = list(self._subscribers.get(event.type, ()))
            also_all = list(self._subscribers.get("*", ()))
        for fn in subs + also_all:
            try:
                fn(event)
            except Exception:  # noqa: BLE001  (never let a listener break the bus)
                import logging

                logging.getLogger("treetiti.core.events").exception(
                    "event subscriber failed for %s", event.type
                )

    def recent(self, event_type: str | None = None, *, limit: int = 50) -> list[Event]:
        pool = self._history
        if event_type:
            pool = [e for e in pool if e.type == event_type]
        return pool[-limit:]


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------

_BUS_LOCK = threading.Lock()
_GLOBAL_BUS: EventBus | None = None


def bus() -> EventBus:
    """Default global bus (lazily created, shared across threads)."""
    global _GLOBAL_BUS  # noqa: PLW0603
    if _GLOBAL_BUS is None:
        with _BUS_LOCK:
            if _GLOBAL_BUS is None:
                _GLOBAL_BUS = EventBus(retain=1000)
    return _GLOBAL_BUS


def emit(
    event_type: str,
    *,
    source: str = "",
    payload: dict[str, Any] | None = None,
    workflow_id: str = "",
    correlation_id: str = "",
) -> Event:
    event = Event(
        type=event_type,
        source=source,
        payload=payload or {},
        workflow_id=workflow_id,
        correlation_id=correlation_id or uuid.uuid4().hex,
    )
    bus().publish(event)
    return event