"""Orchestrator routes: Chief-of-Staff planning + ask-user loop.

POST /orchestrator/plan   {goal}            -> steps + pending_questions
POST /orchestrator/answer {run_id, answers} -> updated run (may become ready)
POST /orchestrator/execute {run_id}         -> fan-out to agents -> dossier
GET  /orchestrator/runs/{run_id}            -> run status
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import harness
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


class PlanIn(BaseModel):
    goal: str
    project_id: str | None = None


class AnswerIn(BaseModel):
    run_id: str
    answers: dict[str, str]


class ExecuteIn(BaseModel):
    run_id: str


@router.post("/plan")
def plan(body: PlanIn, user: Annotated[User, Depends(get_current_user)]) -> dict:
    if not body.goal.strip():
        raise HTTPException(status_code=400, detail="Goal is empty")
    return harness.run_to_dict(harness.plan_run(body.goal.strip(), body.project_id))


@router.post("/answer")
def answer(body: AnswerIn, user: Annotated[User, Depends(get_current_user)]) -> dict:
    if body.run_id not in harness.RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    return harness.run_to_dict(harness.answer_run(body.run_id, body.answers))


@router.post("/execute")
def execute(body: ExecuteIn, user: Annotated[User, Depends(get_current_user)]) -> dict:
    if body.run_id not in harness.RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    run = harness.RUNS[body.run_id]
    if run.pending_questions:
        raise HTTPException(status_code=409, detail="Answer pending questions first")
    return harness.run_to_dict(harness.execute_run(body.run_id))


@router.get("/runs/{run_id}")
def get_run(run_id: str, user: Annotated[User, Depends(get_current_user)]) -> dict:
    if run_id not in harness.RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    return harness.run_to_dict(harness.RUNS[run_id])


class PluginToggle(BaseModel):
    enabled: bool


class PluginCreate(BaseModel):
    key: str
    label: str = ""
    url: str


@router.get("/plugins")
def plugins(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    """All pluggable stuff: builtin agents + custom webhooks, with on/off."""
    return harness.list_plugins()


@router.patch("/plugins/{key}")
def plugin_toggle(key: str, body: PluginToggle,
                  user: Annotated[User, Depends(get_current_user)]) -> dict:
    if key not in harness.PLUGINS and harness._states().get(key) is None:
        raise HTTPException(status_code=404, detail="Plugin not found")
    if key == "campaign":
        raise HTTPException(status_code=400, detail="Chief of Staff cannot be disabled")
    return harness.set_plugin(key, enabled=body.enabled)


@router.post("/plugins")
def plugin_add(body: PluginCreate,
               user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Plug custom stuff in: any webhook that takes {goal, answers}."""
    key = "".join(c.lower() if (c.isalnum() or c == "_") else "_" for c in body.key.strip())
    if not key or not body.url.strip():
        raise HTTPException(status_code=400, detail="key + url required")
    if key in harness.PLUGINS:
        raise HTTPException(status_code=400, detail="Key is a builtin plugin")
    if not body.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="url must be http(s)")
    return harness.set_plugin(key, enabled=True, label=body.label or key,
                              kind="webhook", config={"url": body.url.strip()})


@router.delete("/plugins/{key}")
def plugin_remove(key: str, user: Annotated[User, Depends(get_current_user)]) -> dict:
    if not harness.delete_plugin(key):
        raise HTTPException(status_code=404, detail="Custom plugin not found")
    return {"deleted": key}
