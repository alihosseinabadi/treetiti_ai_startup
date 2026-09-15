"""Agent routes: run each of the 7 AI employees via the API + autopilot."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents import AGENTS, get_agent
from app.auth import get_current_user, require_role
from app.database import SessionLocal, get_db
from app.models import AgentRun, ScheduledJob, User
from app.scheduler import run_agent

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentRequest(BaseModel):
    agent: str
    payload: dict = {}


class ScheduleCreate(BaseModel):
    agent: str
    name: str = ""
    job_type: str = "daily"  # daily | interval
    schedule_time: str = "09:00"
    interval_minutes: int = 60
    payload: dict = {}
    client: str = ""
    project_id: str = ""


class ScheduleUpdate(BaseModel):
    enabled: bool | None = None
    job_type: str | None = None
    schedule_time: str | None = None
    interval_minutes: int | None = None
    payload: dict | None = None
    name: str | None = None


def _serialize_run(run: AgentRun) -> dict:
    return {
        "id": run.id,
        "agent": run.agent,
        "job_type": run.job_type,
        "status": run.status,
        "summary": run.summary,
        "error": run.error,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "duration_ms": run.duration_ms,
    }


def _serialize_job(job: ScheduledJob) -> dict:
    return {
        "id": job.id,
        "name": job.name or job.agent,
        "agent": job.agent,
        "job_type": job.job_type,
        "schedule_time": job.schedule_time,
        "interval_minutes": job.interval_minutes,
        "enabled": job.enabled,
        "archived": job.archived,
        "client": job.client or "",
        "project_id": job.project_id or "",
        "last_run_at": job.last_run_at.isoformat() if job.last_run_at else None,
        "payload": job.payload,
    }


@router.post("/run")
def run_agent_endpoint(
    req: AgentRequest,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    """Run an agent on the background queue (async) — returns a task id.

    Progress streams on GET /tasks/{id}/events and the global /stream.
    """
    from app.core.task_queue import agent_runner, get_queue

    try:
        agent = get_agent(req.agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    q = get_queue()
    q.register("agent", agent_runner)  # idempotent
    task = q.enqueue(
        "agent",
        label=f"agent: {req.agent}",
        payload={"agent": req.agent, "kwargs": req.payload},
    )
    return {"agent": req.agent, "task_id": task.id, "status": task.status}


@router.get("")
def list_agents(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    from app.core.agent_registry import get_registry

    return get_registry().to_dicts()


@router.get("/active")
def list_active_agents(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    from app.core.agent_registry import get_registry

    return [a.to_dict() for a in get_registry().active()]


@router.get("/runs")
def list_runs(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
) -> list[dict]:
    runs = (
        db.query(AgentRun)
        .order_by(AgentRun.started_at.desc())
        .limit(min(limit, 200))
        .all()
    )
    return [_serialize_run(r) for r in runs]


@router.get("/schedule")
def get_schedule(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    context: str = "",
) -> list[dict]:
    q = db.query(ScheduledJob).filter(ScheduledJob.archived == False)  # noqa: E712
    if context.startswith("customer:"):
        q = q.filter(ScheduledJob.client == context[len("customer:"):])
    jobs = q.order_by(ScheduledJob.schedule_time).all()
    return [_serialize_job(j) for j in jobs]


@router.post("/schedule", status_code=201)
def create_schedule(
    body: ScheduleCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Create a scheduled job (a real OS object, not just config)."""
    try:
        get_agent(body.agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"unknown agent {body.agent!r}") from None
    job = ScheduledJob(
        agent=body.agent,
        name=body.name[:255] if body.name else "",
        job_type=body.job_type if body.job_type in ("daily", "interval") else "daily",
        schedule_time=body.schedule_time,
        interval_minutes=body.interval_minutes,
        payload=body.payload or {},
        client=body.client or "",
        project_id=body.project_id or "",
        enabled=True,
    )
    db.add(job)
    db.commit()
    return _serialize_job(job)


@router.patch("/schedule/{job_id}")
def update_schedule(
    job_id: str,
    payload: ScheduleUpdate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    if payload.enabled is not None:
        job.enabled = payload.enabled
    if payload.job_type is not None:
        job.job_type = payload.job_type
    if payload.schedule_time is not None:
        job.schedule_time = payload.schedule_time
    if payload.interval_minutes is not None:
        job.interval_minutes = payload.interval_minutes
    if payload.payload is not None:
        job.payload = payload.payload
    if payload.name is not None:
        job.name = payload.name[:255]
    db.commit()
    return _serialize_job(job)


@router.post("/schedule/{job_id}/duplicate")
def duplicate_schedule(
    job_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Copy a schedule — same agent/config, fresh schedule time default."""
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    copy = ScheduledJob(
        agent=job.agent,
        name=f"{job.name or job.agent} (copy)",
        job_type=job.job_type,
        schedule_time=job.schedule_time,
        interval_minutes=job.interval_minutes,
        payload=dict(job.payload or {}),
        client=job.client or "",
        project_id=job.project_id or "",
        enabled=False,
    )
    db.add(copy)
    db.commit()
    return _serialize_job(copy)


@router.delete("/schedule/{job_id}")
def archive_schedule(
    job_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Archive (soft-delete) a scheduled job — disabled and hidden from list."""
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    job.archived = True
    job.enabled = False
    db.commit()
    return {"archived": job_id}


@router.post("/schedule/{job_id}/restore")
def restore_schedule(
    job_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    job.archived = False
    db.commit()
    return _serialize_job(job)


@router.post("/run-now/{job_id}")
def run_job_now(
    job_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Manually trigger a scheduled job right now (in the background)."""
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    run, _ = run_agent(job.agent, job.payload or {}, job.job_type)
    db.commit()
    return _serialize_run(run)


class AgentInstructionRequest(BaseModel):
    instruction: str


@router.get("/instructions")
def list_agent_instructions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    """Every custom instruction the owner gave an agent (Phase 6)."""
    from app.agent_instructions import list_instructions

    return list_instructions(db)


@router.put("/instructions/{agent}")
def set_agent_instruction(
    agent: str,
    payload: AgentInstructionRequest,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Create or replace an agent's custom instruction."""
    from app.agent_instructions import set_instruction

    try:
        get_agent(agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    instruction = (payload.instruction or "").strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Instruction is empty")
    set_instruction(agent, instruction, db)
    return {"agent": agent, "instruction": instruction}


@router.delete("/instructions/{agent}")
def clear_agent_instruction(
    agent: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Remove an agent's custom instruction (back to the stock playbook)."""
    from app.agent_instructions import clear_instruction

    try:
        get_agent(agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    cleared = clear_instruction(agent, db)
    return {"agent": agent, "cleared": cleared}
