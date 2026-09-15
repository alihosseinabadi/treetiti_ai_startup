"""TREEtiti AI Marketing OS — mission orchestration (autonomous company core).

A mission is a persistent per-client workspace the OS keeps alive on a
cadence + in response to events — not because a human asked in chat.

    OBSERVE → RESEARCH → ANALYZE → UNDERSTAND → PLAN → CREATE → QA
            → APPROVE → PUBLISH → MEASURE → LEARN → (loop)

Two cycle depths keep it resource-efficient (no always-thinking loops):

    daily    observe/analyze only: content_hunter + social_intel + analytics
             (keyless scans + one light LLM pass, ~seconds)
    weekly   full CEO DAG through the canonical pipeline, mission-scoped
             (~10 agents, parallel via LangGraph)

Event-triggered cycles: an approved ``publish`` approval fires a publish step
for that mission; a QA reject returns the brief for revision.

Every cycle runs on the background task queue so progress streams to the
office over SSE (``mission.*`` + ``agent.*`` events, task-tagged).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.database import SessionLocal
from app.models import Mission, MissionRun

logger = logging.getLogger("treetiti.missions")

# Canonical pipeline stages mapped to agent keys (same as the CEO's).
STAGE_TO_AGENT: dict[str, str] = {
    "research": "market_research",
    "analytics": "analytics",
    "campaign": "campaign",
    "strategy": "strategist",
    "editorial": "content_strategist",
    "creative": "creative_director",
    "content": "content",
    "image": "image",
    "video": "video",
    "qa": "editor",
    "publish": "social_manager",
    "learning": "growth_optimizer",
}

# Agents the full weekly cycle actually needs (implemented, meaningful).
WEEKLY_TEAM = [
    "market_research",
    "analytics",
    "content_hunter",
    "social_intel",
    "strategist",
    "content_strategist",
    "creative_director",
    "content",
    "editor",
    "growth_optimizer",
]

# Agents the light daily observe/analyze cycle runs.
DAILY_TEAM = ["content_hunter", "social_intel", "analytics"]


# ---------------------------------------------------------------------------
# Workspace helpers (progressive reveal)
# ---------------------------------------------------------------------------

def mission_dict(m: Mission) -> dict[str, Any]:
    """Serialize a mission for the API (workspace included)."""
    return {
        "id": m.id,
        "name": m.name,
        "client": m.client,
        "goal": m.goal,
        "status": m.status,
        "cadence": m.cadence,
        "daily_time": m.daily_time,
        "weekly_day": m.weekly_day,
        "config": m.config or {},
        "workspace": m.workspace or {},
        "current_cycle": m.current_cycle,
        "instruction": m.instruction,
        "last_run_at": m.last_run_at.isoformat() if m.last_run_at else None,
        "next_daily_at": m.next_daily_at.isoformat() if m.next_daily_at else None,
        "next_weekly_at": m.next_weekly_at.isoformat() if m.next_weekly_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def mission_context(m: Mission) -> dict[str, Any]:
    """Assemble the context every cycle hands the agents about this client."""
    cfg = m.config or {}
    ws = m.workspace or {}
    ctx: dict[str, Any] = {
        "mission_id": m.id,
        "client": m.client or m.name,
        "goal": m.goal,
        "platforms": cfg.get("platforms", ["instagram", "linkedin"]),
        "competitors": cfg.get("competitors", []),
        "audience": cfg.get("audience", ""),
        "brand_notes": cfg.get("brand_notes", ""),
        "instruction": m.instruction,
    }
    # Ground strategy in what we already know about this client.
    intel = ws.get("intel") or {}
    if intel:
        ctx["intel_summary"] = intel.get("summary", "")
    if ws.get("strategy"):
        ctx["existing_strategy"] = str(ws["strategy"])[:2000]
    return ctx


# ---------------------------------------------------------------------------
# Cycle execution
# ---------------------------------------------------------------------------

def _emit_mission_event(
    name: str,
    mission_id: str,
    *,
    task_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    from app.core.events import emit

    emit(
        name,
        source="mission",
        workflow_id=mission_id,
        payload={"mission_id": mission_id, "task_id": task_id, **(payload or {})},
    )


def _emit_agent_event(name: str, key: str, task_id: str, *, note: str | None = None) -> None:
    from app.core.events import emit

    emit(
        name,
        source="mission",
        workflow_id=task_id,
        payload={"agent": key, "task_id": task_id, "note": note},
    )


def _run_daily_cycle(m: Mission, task_id: str) -> dict[str, Any]:
    """OBSERVE + ANALYZE: keyless scans + one light pass. Cheap, frequent."""
    from app.agents import get_agent

    ctx = mission_context(m)
    intel: dict[str, Any] = {}
    observed: list[str] = []

    try:
        _emit_agent_event("agent.started", "content_hunter", task_id, note="scanning trends")
        hunts = get_agent("content_hunter").run(
            brief=ctx["goal"],
            queries=ctx.get("competitors") or [],
            extra_context=ctx.get("brand_notes", ""),
        )
        intel["trends"] = str(hunts.get("trend", ""))[:600]
        intel["angle"] = str(hunts.get("angle", ""))[:600]
        observed.append("content_hunter")
        _emit_agent_event("agent.completed", "content_hunter", task_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("mission %s content_hunter failed: %s", m.id, exc)
        _emit_agent_event("agent.failed", "content_hunter", task_id)

    try:
        _emit_agent_event("agent.started", "social_intel", task_id, note="scouting competitors")
        si = get_agent("social_intel").run(
            brief=ctx["goal"],
            competitors=ctx.get("competitors") or [],
            extra_context=ctx.get("brand_notes", ""),
        )
        intel["competitors"] = str(si.get("intel_summary", ""))[:1000]
        observed.append("social_intel")
        _emit_agent_event("agent.completed", "social_intel", task_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("mission %s social_intel failed: %s", m.id, exc)
        _emit_agent_event("agent.failed", "social_intel", task_id)

    intel["observed_at"] = datetime.now(timezone.utc).isoformat()
    intel["summary"] = (
        f"Trend: {intel.get('trends', 'n/a')[:120]} · "
        f"Angle: {intel.get('angle', 'n/a')[:120]} · "
        f"Competitors: {intel.get('competitors', 'n/a')[:160]}"
    )

    ws = dict(m.workspace or {})
    ws["intel"] = intel
    ws.setdefault("revealed", [])

    # ANALYZE (light): analytics over existing content, if any.
    analyzed = False
    try:
        from app.models import ContentItem

        with SessionLocal() as db:
            count = (
                db.query(ContentItem)
                .filter(ContentItem.status.in_(["published", "approved"]))
                .count()
            )
        if count:
            _emit_agent_event("agent.started", "analytics", task_id, note="measuring performance")
            a = get_agent("analytics").run(report_data=None)
            ws["analytics"] = {"summary": str(a)[:800], "ran_at": datetime.now(timezone.utc).isoformat()}
            analyzed = True
            _emit_agent_event("agent.completed", "analytics", task_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("mission %s analytics failed: %s", m.id, exc)

    _store_workspace(m, ws)
    return {
        "cycle": "daily",
        "agents": observed,
        "analyzed": analyzed,
        "summary": intel.get("summary", ""),
    }


def _run_weekly_cycle(m: Mission, task_id: str) -> dict[str, Any]:
    """Full agency pipeline via the CEO's LangGraph, mission-scoped.

    The CEO resolves the team, builds the canonical DAG and streams per-stage
    ``agent.*`` events (task-tagged) so the office shows the team working.
    """
    from app.agents import get_agent

    ctx = mission_context(m)
    inputs = {
        "client": ctx.get("client", ""),
        "goal": ctx.get("goal", ""),
        "platforms": ctx.get("platforms"),
        "competitors": ctx.get("competitors"),
        "audience": ctx.get("audience", ""),
        "extra_context": "\n".join(
            filter(
                None,
                [
                    ctx.get("brand_notes", ""),
                    ctx.get("intel_summary", ""),
                    m.instruction,
                ],
            )
        ),
    }
    _emit_mission_event("mission.stage.started", m.id, task_id=task_id, payload={"stage": "plan"})
    ceo = get_agent("ceo")
    report = ceo.run(
        brief=m.goal or m.name,
        team_keys=WEEKLY_TEAM,
        inputs=inputs,
        task_id=task_id,
    )
    _emit_mission_event("mission.stage.completed", m.id, task_id=task_id, payload={"stage": "plan", "status": report.get("status")})

    ws = dict(m.workspace or {})
    ws["plan"] = {
        "status": report.get("status"),
        "team": report.get("team", []),
        "stages": report.get("stages", []),
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }
    ws.setdefault("revealed", [])
    # Fold new agent outputs (content items etc.) into the workspace.
    for out in (report.get("outputs") or {}).values():
        if isinstance(out, list) and out and isinstance(out[0], dict):
            key = out[0].get("content_type") or "content"
            ws.setdefault(key, [])
            for item in out:
                if item not in ws[key]:
                    ws[key].append(item)
    _store_workspace(m, ws)
    return {
        "cycle": "weekly",
        "team": report.get("team", []),
        "status": report.get("status"),
        "stages": len(report.get("stages", [])),
    }


def _store_workspace(m: Mission, ws: dict[str, Any]) -> None:
    with SessionLocal() as db:
        row = db.get(Mission, m.id)
        if row is None:
            return
        row.workspace = ws
        row.last_run_at = datetime.now(timezone.utc)
        db.commit()


def run_mission_cycle(mission_id: str, cycle_type: str = "daily", *, task_id: str = "") -> dict[str, Any]:
    """Execute one cycle for a mission; record a MissionRun audit row."""
    started = datetime.now(timezone.utc)
    run = MissionRun(mission_id=mission_id, cycle_type=cycle_type, status="running", task_id=task_id)
    with SessionLocal() as db:
        db.add(run)
        db.commit()
        run_id = run.id
        mission = db.get(Mission, mission_id)
        if mission is None:
            run.status = "failed"
            run.error = "mission not found"
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            return {"error": "mission not found"}
        m = Mission(
            id=mission.id,
            name=mission.name,
            client=mission.client,
            goal=mission.goal,
            status=mission.status,
            cadence=mission.cadence,
            daily_time=mission.daily_time,
            weekly_day=mission.weekly_day,
            config=mission.config,
            workspace=mission.workspace,
            current_cycle=mission.current_cycle,
            last_run_at=mission.last_run_at,
            next_daily_at=mission.next_daily_at,
            next_weekly_at=mission.next_weekly_at,
            instruction=mission.instruction,
        )
    try:
        if cycle_type == "weekly":
            result = _run_weekly_cycle(m, task_id)
        elif cycle_type == "daily":
            result = _run_daily_cycle(m, task_id)
        else:
            result = _run_daily_cycle(m, task_id)
        status = "completed"
        summary = result.get("summary", f"{cycle_type} cycle done")
        error = ""
    except Exception as exc:  # noqa: BLE001
        logger.exception("mission %s %s cycle failed", mission_id, cycle_type)
        status = "failed"
        summary = ""
        error = str(exc)[:2000]
        result = {"error": error}
    finished = datetime.now(timezone.utc)
    with SessionLocal() as db:
        run = db.get(MissionRun, run_id)
        run.status = status
        run.summary = summary
        run.result = result
        run.error = error
        run.finished_at = finished
        run.duration_ms = int((finished - started).total_seconds() * 1000)
        mission = db.get(Mission, mission_id)
        if mission is not None:
            mission.current_cycle = cycle_type
            mission.last_run_at = finished
            mission.updated_at = finished
        db.commit()
    _emit_mission_event(
        "mission.completed" if status == "completed" else "mission.failed",
        mission_id,
        task_id=task_id,
        payload={"cycle": cycle_type, "status": status},
    )
    return {"mission_id": mission_id, "cycle": cycle_type, "status": status, **result}


# ---------------------------------------------------------------------------
# Scheduler support — due-date math
# ---------------------------------------------------------------------------

def next_daily_at(now: datetime, daily_time: str) -> datetime:
    try:
        hh, mm = (daily_time or "08:30").split(":")
        base = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    except ValueError:
        base = now.replace(hour=8, minute=30, second=0, microsecond=0)
    return base + timedelta(days=1)


_WEEKDAY_IDX = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def next_weekly_at(now: datetime, weekly_day: str) -> datetime:
    target = _WEEKDAY_IDX.get((weekly_day or "monday").lower(), 0)
    days_ahead = (target - now.weekday()) % 7
    base = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
    if base <= now:
        base += timedelta(days=7)
    return base


def daily_due(m: Mission, now: datetime) -> bool:
    if m.status != "active":
        return False
    if m.last_run_at is None:
        return True
    last = m.last_run_at.replace(tzinfo=timezone.utc)
    if last.date() == now.date():
        return False
    try:
        hh, mm = (m.daily_time or "08:30").split(":")
        due_time = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    except ValueError:
        due_time = now.replace(hour=8, minute=30, second=0, microsecond=0)
    return now >= due_time


def weekly_due(m: Mission, now: datetime) -> bool:
    if m.status != "active":
        return False
    target = _WEEKDAY_IDX.get((m.weekly_day or "monday").lower(), 0)
    if now.weekday() != target:
        return False
    if m.last_run_at is None:
        return True
    last = m.last_run_at.replace(tzinfo=timezone.utc)
    return last.date() != now.date()


# ---------------------------------------------------------------------------
# Task queue runner (registered lazily so the queue stays offline-testable)
# ---------------------------------------------------------------------------

def mission_runner(task: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """TaskQueue runner: run one mission cycle inside a background task."""
    mission_id = payload.get("mission_id", "")
    if not mission_id:
        raise ValueError("payload['mission_id'] is required")
    cycle_type = payload.get("cycle_type", "daily")
    return run_mission_cycle(mission_id, cycle_type, task_id=task.id)