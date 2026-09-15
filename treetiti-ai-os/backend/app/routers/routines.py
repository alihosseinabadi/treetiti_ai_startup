"""Routines API: reusable workflows/skills."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Routine, User

router = APIRouter(prefix="/routines", tags=["routines"])


class RoutineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(default="")
    trigger: str = Field(default="manual", pattern="^(manual|schedule|event)$")
    schedule: str = Field(default="")
    teammate_id: str | None = Field(default=None, max_length=36)
    team_id: str | None = Field(default=None, max_length=36)
    instructions: str = Field(default="")
    tools: list[str] = Field(default_factory=list)
    inputs: dict = Field(default_factory=dict)
    outputs: dict = Field(default_factory=dict)
    requires_approval: bool = Field(default=False)
    is_active: bool = Field(default=True)


class RoutineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None
    trigger: str | None = Field(default=None, pattern="^(manual|schedule|event)$")
    schedule: str | None = None
    teammate_id: str | None = Field(default=None, max_length=36)
    team_id: str | None = Field(default=None, max_length=36)
    instructions: str | None = None
    tools: list[str] | None = None
    inputs: dict | None = None
    outputs: dict | None = None
    requires_approval: bool | None = None
    is_active: bool | None = None


class RoutineResponse(BaseModel):
    id: str
    name: str
    description: str
    trigger: str
    schedule: str
    teammate_id: str | None
    team_id: str | None
    instructions: str
    tools: list[str]
    inputs: dict
    outputs: dict
    requires_approval: bool
    is_active: bool
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class RoutineRunRequest(BaseModel):
    inputs: dict = Field(default_factory=dict)


@router.get("", response_model=list[RoutineResponse])
def list_routines(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = True,
) -> list[RoutineResponse]:
    q = db.query(Routine)
    if active_only:
        q = q.filter(Routine.is_active == True)  # noqa: E712
    routines = q.order_by(Routine.name.asc()).all()
    return [
        RoutineResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            trigger=r.trigger,
            schedule=r.schedule,
            teammate_id=r.teammate_id,
            team_id=r.team_id,
            instructions=r.instructions,
            tools=r.tools or [],
            inputs=r.inputs or {},
            outputs=r.outputs or {},
            requires_approval=r.requires_approval,
            is_active=r.is_active,
            created_at=r.created_at.isoformat() if r.created_at else "",
            updated_at=r.updated_at.isoformat() if r.updated_at else "",
        )
        for r in routines
    ]


@router.get("/{routine_id}", response_model=RoutineResponse)
def get_routine(
    routine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoutineResponse:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")
    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        trigger=routine.trigger,
        schedule=routine.schedule,
        teammate_id=routine.teammate_id,
        team_id=routine.team_id,
        instructions=routine.instructions,
        tools=routine.tools or [],
        inputs=routine.inputs or {},
        outputs=routine.outputs or {},
        requires_approval=routine.requires_approval,
        is_active=routine.is_active,
        created_at=routine.created_at.isoformat() if routine.created_at else "",
        updated_at=routine.updated_at.isoformat() if routine.updated_at else "",
    )


@router.post("", response_model=RoutineResponse, status_code=201)
def create_routine(
    payload: RoutineCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoutineResponse:
    if payload.teammate_id:
        from app.models import Teammate
        teammate = db.query(Teammate).filter(Teammate.id == payload.teammate_id).first()
        if not teammate:
            raise HTTPException(400, "Teammate not found")
    if payload.team_id:
        from app.models import Team
        team = db.query(Team).filter(Team.id == payload.team_id).first()
        if not team:
            raise HTTPException(400, "Team not found")

    routine = Routine(**payload.model_dump())
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        trigger=routine.trigger,
        schedule=routine.schedule,
        teammate_id=routine.teammate_id,
        team_id=routine.team_id,
        instructions=routine.instructions,
        tools=routine.tools or [],
        inputs=routine.inputs or {},
        outputs=routine.outputs or {},
        requires_approval=routine.requires_approval,
        is_active=routine.is_active,
        created_at=routine.created_at.isoformat() if routine.created_at else "",
        updated_at=routine.updated_at.isoformat() if routine.updated_at else "",
    )


@router.patch("/{routine_id}", response_model=RoutineResponse)
def update_routine(
    routine_id: str,
    payload: RoutineUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoutineResponse:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "teammate_id" in update_data and update_data["teammate_id"]:
        from app.models import Teammate
        teammate = db.query(Teammate).filter(Teammate.id == update_data["teammate_id"]).first()
        if not teammate:
            raise HTTPException(400, "Teammate not found")
    if "team_id" in update_data and update_data["team_id"]:
        from app.models import Team
        team = db.query(Team).filter(Team.id == update_data["team_id"]).first()
        if not team:
            raise HTTPException(400, "Team not found")

    for key, value in update_data.items():
        setattr(routine, key, value)
    db.commit()
    db.refresh(routine)

    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        trigger=routine.trigger,
        schedule=routine.schedule,
        teammate_id=routine.teammate_id,
        team_id=routine.team_id,
        instructions=routine.instructions,
        tools=routine.tools or [],
        inputs=routine.inputs or {},
        outputs=routine.outputs or {},
        requires_approval=routine.requires_approval,
        is_active=routine.is_active,
        created_at=routine.created_at.isoformat() if routine.created_at else "",
        updated_at=routine.updated_at.isoformat() if routine.updated_at else "",
    )


@router.post("/{routine_id}/run")
async def run_routine(
    routine_id: str,
    payload: RoutineRunRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")
    if not routine.is_active:
        raise HTTPException(400, "Routine is not active")

    # Execute the routine via the task queue
    from app.core.task_queue import get_queue

    queue = get_queue()
    queue.register("routine", _routine_runner)
    task = queue.enqueue(
        "routine",
        label=f"routine: {routine.name}",
        payload={"routine_id": routine.id, "inputs": payload.inputs},
    )

    return {"task_id": task.id, "routine_id": routine.id, "status": "started"}


@router.post("/{routine_id}/pause")
def pause_routine(
    routine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoutineResponse:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")
    routine.is_active = False
    db.commit()
    db.refresh(routine)
    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        trigger=routine.trigger,
        schedule=routine.schedule,
        teammate_id=routine.teammate_id,
        team_id=routine.team_id,
        instructions=routine.instructions,
        tools=routine.tools or [],
        inputs=routine.inputs or {},
        outputs=routine.outputs or {},
        requires_approval=routine.requires_approval,
        is_active=routine.is_active,
        created_at=routine.created_at.isoformat() if routine.created_at else "",
        updated_at=routine.updated_at.isoformat() if routine.updated_at else "",
    )


@router.post("/{routine_id}/resume")
def resume_routine(
    routine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoutineResponse:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")
    routine.is_active = True
    db.commit()
    db.refresh(routine)
    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        description=routine.description,
        trigger=routine.trigger,
        schedule=routine.schedule,
        teammate_id=routine.teammate_id,
        team_id=routine.team_id,
        instructions=routine.instructions,
        tools=routine.tools or [],
        inputs=routine.inputs or {},
        outputs=routine.outputs or {},
        requires_approval=routine.requires_approval,
        is_active=routine.is_active,
        created_at=routine.created_at.isoformat() if routine.created_at else "",
        updated_at=routine.updated_at.isoformat() if routine.updated_at else "",
    )


@router.delete("/{routine_id}")
def delete_routine(
    routine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(404, "Routine not found")
    db.delete(routine)
    db.commit()
    return {"deleted": routine_id}


def _routine_runner(task, payload: dict) -> dict:
    """Execute a routine."""
    routine_id = payload.get("routine_id")
    inputs = payload.get("inputs", {})

    from app.database import SessionLocal
    from app.core.tool_system import get_tool_registry, execute_tool

    with SessionLocal() as db:
        from app.models import Routine
        routine = db.query(Routine).filter(Routine.id == routine_id).first()
        if not routine:
            return {"error": "Routine not found"}

    registry = get_tool_registry()
    results = {}

    # Execute each step (for now, just run instructions as a prompt to an agent)
    # In a full implementation, this would parse the instructions and execute steps
    from app.llm import llm_complete
    from app.config import get_settings

    settings = get_settings()
    prompt = f"""Execute the following routine:

Routine: {routine.name}
Description: {routine.description}
Instructions: {routine.instructions}
Inputs: {json.dumps(inputs)}

Execute the instructions step by step. Use available tools as needed.
Return a summary of what was done and the final outputs."""

    try:
        result = llm_complete(
            "You are an AI assistant executing a routine. Follow instructions precisely.",
            prompt,
            model=settings.ollama_model,
        )
        return {"status": "completed", "result": result, "inputs": inputs}
    except Exception as e:
        return {"error": str(e), "inputs": inputs}