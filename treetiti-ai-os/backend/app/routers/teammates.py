"""Teammates API: persistent AI teammates (Grok-style bots)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import Team, Teammate, TeammateActivity, User

router = APIRouter(prefix="/teammates", tags=["teammates"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TeammateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    role: str = Field(default="", max_length=64)
    agent_key: str = Field(..., min_length=1, max_length=64)
    avatar: str = Field(default="🤖", max_length=8)
    description: str = Field(default="")
    system_instructions: str = Field(default="")
    model: str = Field(default="", max_length=128)
    tools: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    memory_scopes: list[str] = Field(default_factory=lambda: ["global", "conversation"])
    client_access: list[str] = Field(default_factory=lambda: ["*"])
    project_access: list[str] = Field(default_factory=lambda: ["*"])
    autonomy_level: str = Field(default="ask", pattern="^(ask|independent|full)$")
    routines: list[str] = Field(default_factory=list)
    is_active: bool = True
    is_pinned: bool = False


class TeammateCreate(TeammateBase):
    pass


class TeammateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    role: str | None = Field(default=None, max_length=64)
    agent_key: str | None = Field(default=None, min_length=1, max_length=64)
    avatar: str | None = Field(default=None, max_length=8)
    description: str | None = None
    system_instructions: str | None = None
    model: str | None = Field(default=None, max_length=128)
    tools: list[str] | None = None
    skills: list[str] | None = None
    memory_scopes: list[str] | None = None
    client_access: list[str] | None = None
    project_access: list[str] | None = None
    autonomy_level: str | None = Field(default=None, pattern="^(ask|independent|full)$")
    routines: list[str] | None = None
    is_active: bool | None = None
    is_pinned: bool | None = None


class TeammateResponse(TeammateBase):
    id: str
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(default="")
    chief_id: str | None = None
    member_ids: list[str] = Field(default_factory=list)
    client_access: list[str] = Field(default_factory=lambda: ["*"])
    project_access: list[str] = Field(default_factory=lambda: ["*"])
    is_active: bool = True


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None
    chief_id: str | None = None
    member_ids: list[str] | None = None
    client_access: list[str] | None = None
    project_access: list[str] | None = None
    is_active: bool | None = None


class TeamResponse(TeamBase):
    id: str
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class ActivityResponse(BaseModel):
    id: str
    teammate_id: str
    task_id: str
    action: str
    status: str
    input_summary: str
    output_summary: str
    metadata: dict
    created_at: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_AGENT_KEYS = {
    "ceo", "brand", "content_hunter", "social_intel", "strategist",
    "content_strategist", "creative_director", "td_creative_director",
    "td_asset_producer", "video_producer", "ugc_producer",
    "social_manager", "growth_optimizer", "market_research",
    "content", "video", "image", "sales", "analytics", "developer",
    "campaign", "editor", "seo",
}

VALID_TOOLS = {
    "browser", "files", "terminal", "image_generation", "video_generation",
    "web_research", "analytics", "social_publish", "email", "calendar",
    "crm", "cloud_storage", "search", "deep_research", "code_execution",
}

VALID_MEMORY_SCOPES = {"global", "client", "team", "teammate", "project", "conversation", "task"}

AUTONOMY_LEVELS = {"ask", "independent", "full"}


def _validate_teammate(data: TeammateBase) -> None:
    if data.agent_key not in VALID_AGENT_KEYS:
        raise HTTPException(400, f"Invalid agent_key. Must be one of: {', '.join(sorted(VALID_AGENT_KEYS))}")
    for tool in data.tools:
        if tool not in VALID_TOOLS:
            raise HTTPException(400, f"Invalid tool: {tool}. Valid: {', '.join(sorted(VALID_TOOLS))}")
    for scope in data.memory_scopes:
        if scope not in VALID_MEMORY_SCOPES:
            raise HTTPException(400, f"Invalid memory_scope: {scope}. Valid: {', '.join(sorted(VALID_MEMORY_SCOPES))}")
    if data.autonomy_level not in AUTONOMY_LEVELS:
        raise HTTPException(400, f"Invalid autonomy_level: {data.autonomy_level}. Valid: {', '.join(sorted(AUTONOMY_LEVELS))}")


def _to_response(t: Teammate) -> TeammateResponse:
    return TeammateResponse(
        id=t.id,
        name=t.name,
        role=t.role,
        agent_key=t.agent_key,
        avatar=t.avatar,
        description=t.description,
        system_instructions=t.system_instructions,
        model=t.model,
        tools=t.tools or [],
        skills=t.skills or [],
        memory_scopes=t.memory_scopes or [],
        client_access=t.client_access or [],
        project_access=t.project_access or [],
        autonomy_level=t.autonomy_level,
        routines=t.routines or [],
        is_active=t.is_active,
        is_pinned=t.is_pinned,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


def _to_team_response(t: Team) -> TeamResponse:
    return TeamResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        chief_id=t.chief_id,
        member_ids=t.member_ids or [],
        client_access=t.client_access or [],
        project_access=t.project_access or [],
        is_active=t.is_active,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


# ---------------------------------------------------------------------------
# Teammate CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[TeammateResponse])
def list_teammates(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = True,
) -> list[TeammateResponse]:
    q = db.query(Teammate)
    if active_only:
        q = q.filter(Teammate.is_active == True)  # noqa: E712
    teammates = q.order_by(Teammate.is_pinned.desc(), Teammate.name.asc()).all()
    return [_to_response(t) for t in teammates]


@router.get("/pinned", response_model=list[TeammateResponse])
def list_pinned_teammates(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[TeammateResponse]:
    teammates = db.query(Teammate).filter(Teammate.is_pinned == True, Teammate.is_active == True).all()  # noqa: E712
    return [_to_response(t) for t in teammates]


# ---------------------------------------------------------------------------
# Team CRUD (static routes must be registered before /{teammate_id},
# otherwise FastAPI matches "/teams" as a teammate id and returns 404)
# ---------------------------------------------------------------------------

@router.get("/teams", response_model=list[TeamResponse])
def list_teams(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = True,
) -> list[TeamResponse]:
    q = db.query(Team)
    if active_only:
        q = q.filter(Team.is_active == True)  # noqa: E712
    teams = q.order_by(Team.name.asc()).all()
    return [_to_team_response(t) for t in teams]


@router.get("/teams/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeamResponse:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    return _to_team_response(team)


@router.post("/teams", response_model=TeamResponse, status_code=201)
def create_team(
    payload: TeamCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeamResponse:
    if payload.chief_id:
        chief = db.query(Teammate).filter(Teammate.id == payload.chief_id).first()
        if not chief:
            raise HTTPException(400, "Chief teammate not found")
    for mid in payload.member_ids:
        member = db.query(Teammate).filter(Teammate.id == mid).first()
        if not member:
            raise HTTPException(400, f"Teammate {mid} not found")
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return _to_team_response(team)


@router.patch("/teams/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: str,
    payload: TeamUpdate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeamResponse:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "chief_id" in update_data and update_data["chief_id"]:
        chief = db.query(Teammate).filter(Teammate.id == update_data["chief_id"]).first()
        if not chief:
            raise HTTPException(400, "Chief teammate not found")
    if "member_ids" in update_data:
        for mid in update_data["member_ids"]:
            member = db.query(Teammate).filter(Teammate.id == mid).first()
            if not member:
                raise HTTPException(400, f"Teammate {mid} not found")
    for key, value in update_data.items():
        setattr(team, key, value)
    db.commit()
    db.refresh(team)
    return _to_team_response(team)


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    db.delete(team)
    db.commit()
    return {"deleted": team_id}


@router.get("/{teammate_id}", response_model=TeammateResponse)
def get_teammate(
    teammate_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeammateResponse:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")
    return _to_response(teammate)


@router.post("", response_model=TeammateResponse, status_code=201)
def create_teammate(
    payload: TeammateCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeammateResponse:
    _validate_teammate(payload)
    teammate = Teammate(**payload.model_dump())
    db.add(teammate)
    db.commit()
    db.refresh(teammate)
    return _to_response(teammate)


@router.patch("/{teammate_id}", response_model=TeammateResponse)
def update_teammate(
    teammate_id: str,
    payload: TeammateUpdate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeammateResponse:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        # Validate any provided fields
        if "agent_key" in update_data and update_data["agent_key"] not in VALID_AGENT_KEYS:
            raise HTTPException(400, f"Invalid agent_key. Must be one of: {', '.join(sorted(VALID_AGENT_KEYS))}")
        if "tools" in update_data:
            for tool in update_data["tools"]:
                if tool not in VALID_TOOLS:
                    raise HTTPException(400, f"Invalid tool: {tool}")
        if "memory_scopes" in update_data:
            for scope in update_data["memory_scopes"]:
                if scope not in VALID_MEMORY_SCOPES:
                    raise HTTPException(400, f"Invalid memory_scope: {scope}")
        if "autonomy_level" in update_data and update_data["autonomy_level"] not in AUTONOMY_LEVELS:
            raise HTTPException(400, f"Invalid autonomy_level: {update_data['autonomy_level']}")

        for key, value in update_data.items():
            setattr(teammate, key, value)
        db.commit()
        db.refresh(teammate)
    return _to_response(teammate)


@router.delete("/{teammate_id}")
def delete_teammate(
    teammate_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")
    db.delete(teammate)
    db.commit()
    return {"deleted": teammate_id}


@router.post("/{teammate_id}/pin")
def pin_teammate(
    teammate_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeammateResponse:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")
    teammate.is_pinned = True
    db.commit()
    db.refresh(teammate)
    return _to_response(teammate)


@router.post("/{teammate_id}/unpin")
def unpin_teammate(
    teammate_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> TeammateResponse:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")
    teammate.is_pinned = False
    db.commit()
    db.refresh(teammate)
    return _to_response(teammate)


# ---------------------------------------------------------------------------
# Teammate Activity
# ---------------------------------------------------------------------------

@router.get("/{teammate_id}/activity", response_model=list[ActivityResponse])
def get_teammate_activity(
    teammate_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
) -> list[ActivityResponse]:
    teammate = db.query(Teammate).filter(Teammate.id == teammate_id).first()
    if not teammate:
        raise HTTPException(404, "Teammate not found")
    activities = (
        db.query(TeammateActivity)
        .filter(TeammateActivity.teammate_id == teammate_id)
        .order_by(TeammateActivity.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ActivityResponse(
            id=a.id,
            teammate_id=a.teammate_id,
            task_id=a.task_id,
            action=a.action,
            status=a.status,
            input_summary=a.input_summary,
            output_summary=a.output_summary,
            metadata=a.metadata or {},
            created_at=a.created_at.isoformat() if a.created_at else "",
        )
        for a in activities
    ]


# ---------------------------------------------------------------------------
# Agent registry reference (for create teammate UI)
# ---------------------------------------------------------------------------

@router.get("/registry/agents")
def list_agent_keys(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> dict[str, dict[str, str]]:
    from app.agents import AGENTS
    return {
        key: {
            "name": agent.name,
            "role": agent.role,
            "description": getattr(agent, "description", ""),
        }
        for key, agent in AGENTS.items()
    }


@router.get("/registry/tools")
def list_tools(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> list[str]:
    return sorted(VALID_TOOLS)


@router.get("/registry/memory-scopes")
def list_memory_scopes(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> list[str]:
    return sorted(VALID_MEMORY_SCOPES)


@router.get("/registry/autonomy-levels")
def list_autonomy_levels(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
) -> list[str]:
    return sorted(AUTONOMY_LEVELS)