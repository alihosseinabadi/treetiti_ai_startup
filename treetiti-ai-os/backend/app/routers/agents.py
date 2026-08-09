"""Agent routes: run each of the 7 AI employees via the API + autopilot."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents import AGENTS, get_agent
from app.auth import get_current_user
from app.database import SessionLocal, get_db
from app.models import AgentRun, ScheduledJob, User
from app.scheduler import run_agent

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentRequest(BaseModel):
    agent: str
    payload: dict = {}


class ScheduleUpdate(BaseModel):
    enabled: bool | None = None
    job_type: str | None = None
    schedule_time: str | None = None
    interval_minutes: int | None = None
    payload: dict | None = None


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
        "agent": job.agent,
        "job_type": job.job_type,
        "schedule_time": job.schedule_time,
        "interval_minutes": job.interval_minutes,
        "enabled": job.enabled,
        "last_run_at": job.last_run_at.isoformat() if job.last_run_at else None,
        "payload": job.payload,
    }


@router.post("/run")
def run_agent_endpoint(
    req: AgentRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    try:
        agent = get_agent(req.agent)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    try:
        run, result = run_agent(req.agent, req.payload, job_type="manual")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    return {"agent": req.agent, "run": _serialize_run(run), "result": result}


@router.get("")
def list_agents(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    return [{"name": a.name, "role": a.role} for a in AGENTS.values()]


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
) -> list[dict]:
    jobs = db.query(ScheduledJob).order_by(ScheduledJob.schedule_time).all()
    return [_serialize_job(j) for j in jobs]


@router.patch("/schedule/{job_id}")
def update_schedule(
    job_id: str,
    payload: ScheduleUpdate,
    user: Annotated[User, Depends(get_current_user)],
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
    db.commit()
    return _serialize_job(job)


@router.post("/run-now/{job_id}")
def run_job_now(
    job_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Manually trigger a scheduled job right now (in the background)."""
    job = db.get(ScheduledJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    run, _ = run_agent(job.agent, job.payload or {}, job.job_type)
    db.commit()
    return _serialize_run(run)
