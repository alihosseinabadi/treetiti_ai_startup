"""TREEtiti AI Marketing OS — mission routes (autonomous company core).

    GET    /api/v1/missions                     list missions (optionally ?status=)
    POST   /api/v1/missions                     create a persistent client mission
    GET    /api/v1/missions/{id}                fetch one mission + workspace
    PATCH  /api/v1/missions/{id}                update name/goal/config/instruction
    POST   /api/v1/missions/{id}/start          resume autonomy (background loop)
    POST   /api/v1/missions/{id}/pause          pause autonomy (no new cycles)
    POST   /api/v1/missions/{id}/run            run a cycle NOW (daily|weekly)
    POST   /api/v1/missions/{id}/talk           send a steering instruction (§15)
    GET    /api/v1/missions/{id}/runs           cycle audit trail
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_role
from app.core.events import MISSION_CREATED, MISSION_INSTRUCTED, MISSION_PAUSED, MISSION_RESUMED, emit
from app.database import SessionLocal
from app.missions import mission_dict, run_mission_cycle
from app.models import Mission, MissionRun, User

router = APIRouter(prefix="/missions", tags=["missions"])

VALID_STATUS = {"active", "paused", "archived"}


class MissionCreate(BaseModel):
    name: str
    client: str = ""
    goal: str = ""
    cadence: str = "daily"  # daily | weekly
    daily_time: str = "08:30"
    weekly_day: str = "monday"
    config: dict = {}


class MissionUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    cadence: str | None = None
    daily_time: str | None = None
    weekly_day: str | None = None
    status: str | None = None
    config: dict | None = None


class TalkRequest(BaseModel):
    instruction: str


def _run_dict(r: MissionRun) -> dict:
    return {
        "id": r.id,
        "mission_id": r.mission_id,
        "cycle_type": r.cycle_type,
        "status": r.status,
        "summary": r.summary,
        "result": r.result,
        "error": r.error,
        "task_id": r.task_id,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        "duration_ms": r.duration_ms,
    }


@router.get("")
def list_missions(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    status: str = "",
) -> list[dict]:
    with SessionLocal() as db:
        q = db.query(Mission)
        if status:
            if status not in VALID_STATUS:
                raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUS)}")
            q = q.filter(Mission.status == status)
        rows = q.order_by(Mission.updated_at.desc()).all()
        return [mission_dict(m) for m in rows]


@router.post("", status_code=201)
def create_mission(
    payload: MissionCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    with SessionLocal() as db:
        m = Mission(
            name=payload.name.strip(),
            client=payload.client.strip(),
            goal=payload.goal.strip(),
            cadence=payload.cadence if payload.cadence in {"daily", "weekly"} else "daily",
            daily_time=payload.daily_time,
            weekly_day=payload.weekly_day,
            config=payload.config or {},
            workspace={"revealed": []},
            status="active",
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        out = mission_dict(m)
    emit(MISSION_CREATED, source="missions", workflow_id=out["id"], payload={"mission_id": out["id"], "name": out["name"]})
    return out


@router.get("/{mission_id}")
def get_mission(
    mission_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> dict:
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        return mission_dict(m)


@router.patch("/{mission_id}")
def update_mission(
    mission_id: str,
    payload: MissionUpdate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        if payload.name is not None:
            m.name = payload.name
        if payload.goal is not None:
            m.goal = payload.goal
        if payload.cadence is not None and payload.cadence in {"daily", "weekly"}:
            m.cadence = payload.cadence
        if payload.daily_time is not None:
            m.daily_time = payload.daily_time
        if payload.weekly_day is not None:
            m.weekly_day = payload.weekly_day
        if payload.config is not None:
            m.config = {**(m.config or {}), **payload.config}
        if payload.status is not None:
            if payload.status not in VALID_STATUS:
                raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUS)}")
            m.status = payload.status
        db.commit()
        db.refresh(m)
        return mission_dict(m)


@router.post("/{mission_id}/duplicate")
def duplicate_mission(
    mission_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    """Copy a mission — same goal/cadence/config, starts paused so the user
    can tweak before relaunching."""
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        copy = Mission(
            name=f"{m.name} (copy)",
            client=m.client,
            goal=m.goal,
            cadence=m.cadence,
            daily_time=m.daily_time,
            weekly_day=m.weekly_day,
            config=dict(m.config or {}),
            workspace={"revealed": []},
            status="paused",
        )
        db.add(copy)
        db.commit()
        db.refresh(copy)
        out = mission_dict(copy)
    return out


@router.post("/{mission_id}/start")
def start_mission(
    mission_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        m.status = "active"
        db.commit()
        db.refresh(m)
        out = mission_dict(m)
    emit(MISSION_RESUMED, source="missions", workflow_id=mission_id, payload={"mission_id": mission_id})
    return out


@router.post("/{mission_id}/pause")
def pause_mission(
    mission_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        m.status = "paused"
        db.commit()
        db.refresh(m)
        out = mission_dict(m)
    emit(MISSION_PAUSED, source="missions", workflow_id=mission_id, payload={"mission_id": mission_id})
    return out


class RunCycleRequest(BaseModel):
    cycle: str = "daily"  # daily | weekly


@router.post("/{mission_id}/run")
def run_mission_now(
    mission_id: str,
    payload: RunCycleRequest,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    """Run a cycle NOW on the background queue (returns the task id)."""
    from app.core.task_queue import get_queue

    if payload.cycle not in {"daily", "weekly"}:
        raise HTTPException(status_code=400, detail="cycle must be 'daily' or 'weekly'")
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
    from app.missions import mission_runner

    q = get_queue()
    q.register("mission", mission_runner)  # idempotent
    task = q.enqueue(
        "mission",
        label=f"mission {payload.cycle}: {m.name[:50]}",
        payload={"mission_id": mission_id, "cycle_type": payload.cycle},
    )
    return {"mission_id": mission_id, "cycle": payload.cycle, "task_id": task.id}


@router.post("/{mission_id}/talk")
def talk_to_mission(
    mission_id: str,
    payload: TalkRequest,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
) -> dict:
    """Send a steering instruction; the next cycle honors it (§15)."""
    if not payload.instruction.strip():
        raise HTTPException(status_code=400, detail="instruction is required")
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        m.instruction = payload.instruction.strip()
        db.commit()
        db.refresh(m)
        out = mission_dict(m)
    emit(
        MISSION_INSTRUCTED,
        source="missions",
        workflow_id=mission_id,
        payload={"mission_id": mission_id, "instruction": payload.instruction},
    )
    return out


@router.get("/{mission_id}/runs")
def list_mission_runs(
    mission_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    limit: int = 50,
) -> list[dict]:
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if m is None:
            raise HTTPException(status_code=404, detail="mission not found")
        rows = (
            db.query(MissionRun)
            .filter(MissionRun.mission_id == mission_id)
            .order_by(MissionRun.started_at.desc())
            .limit(min(limit, 200))
            .all()
        )
        return [_run_dict(r) for r in rows]