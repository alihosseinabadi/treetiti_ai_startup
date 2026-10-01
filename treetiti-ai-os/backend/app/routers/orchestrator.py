"""TREEtiti AI OS — orchestrator: hear a goal, assemble the team, make the
project folder, run the agents, report back.

Endpoints (match the OS dashboard flow):
    POST /api/v1/orchestrator/plan     {goal, project_id?} -> run + questions
    POST /api/v1/orchestrator/answer   {run_id, answers}   -> run (ready)
    POST /api/v1/orchestrator/execute  {run_id}            -> run (done, results)
    GET  /api/v1/orchestrator/runs/{run_id}                -> run status
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import time
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_role
from app.database import SessionLocal
from app.llm import llm_json
from app.models import Project, User

logger = logging.getLogger("treetiti.orchestrator")

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])

_RUNS: dict[str, dict[str, Any]] = {}
_STEP_TIMEOUT_S = 300


class PlanRequest(BaseModel):
    goal: str
    project_id: str | None = None


class AnswerRequest(BaseModel):
    run_id: str
    answers: dict[str, str] = Field(default_factory=dict)


class ExecuteRequest(BaseModel):
    run_id: str


def _agent_menu() -> str:
    from app.agents import AGENTS

    lines = []
    for key in sorted(AGENTS):
        agent = AGENTS[key]
        role = (agent.role or "").strip().split("\n")[0][:90]
        lines.append(f"- {key}: {agent.name} — {role}")
    return "\n".join(lines)


def _heuristic_plan(goal: str) -> tuple[list[dict], list[dict]]:
    """Keyword team picker when the LLM planner is unreachable."""
    g = goal.lower()
    steps: list[dict] = []

    def add(key: str, task: str) -> None:
        if all(s["key"] != key for s in steps):
            steps.append({"key": key, "task": task})

    if any(w in g for w in ("instagram", "tiktok", "linkedin", "social", "content", "post", "brand")):
        add("content", f"Create the content for: {goal}")
    if any(w in g for w in ("research", "analy", "market", "competitor", "find", "leads")):
        add("market_research", f"Research and gather facts for: {goal}")
    if any(w in g for w in ("video", "film", "reel")):
        add("video", f"Produce the video plan and script for: {goal}")
    if any(w in g for w in ("image", "design", "logo", "visual", "brand")):
        add("brand", f"Define the brand/visual direction for: {goal}")
    if any(w in g for w in ("sale", "outreach", "client", "customer", "offer")):
        add("sales", f"Draft the sales angle and outreach for: {goal}")
    if any(w in g for w in ("code", "website", "site", "app", "bot", "automat")):
        add("developer", f"Scope and outline the build for: {goal}")
    if any(w in g for w in ("seo", "traffic", "google")):
        add("seo", f"SEO plan for: {goal}")
    if not steps:
        add("strategist", f"Make the strategy for: {goal}")
        add("content", f"Create the first deliverable for: {goal}")
    add("editor", "Review everything above for quality before delivery.")
    steps = steps[:5]

    questions = [
        {"agent": "Chief of Staff", "slot": "audience",
         "question": "Who exactly is this for?"},
        {"agent": "Chief of Staff", "slot": "tone",
         "question": "What tone should it have (bold, luxury, friendly, minimal)?"},
    ]
    return steps, questions


def _llm_plan(goal: str) -> tuple[list[dict], list[dict]] | None:
    """Ask the brain to assemble the team. Returns None on any failure."""
    from app.agents import AGENTS

    try:
        plan = llm_json(
            "You are the Chief of Staff of an AI agency. Reply with ONLY valid JSON.",
            f"GOAL: {goal}\n\nTEAM (pick 2-4 by key):\n{_agent_menu()}\n\n"
            'Return {"steps": [{"key": "<agent key>", "task": "<one-line task>"}], '
            '"questions": [{"agent": "Chief of Staff", "slot": "<short id>", '
            '"question": "<0-3 short clarifying questions, empty array if the goal is crystal clear>"}]}. '
            "Keep tasks concrete and ordered.",
            temperature=0.3,
        )
        if not isinstance(plan, dict):
            return None
        steps = []
        for s in (plan.get("steps") or [])[:5]:
            key = (s.get("key") or "").strip()
            task = (s.get("task") or "").strip()
            if key in AGENTS and task:
                steps.append({"key": key, "task": task})
        if not steps:
            return None
        questions = []
        for q in (plan.get("questions") or [])[:3]:
            question = (q.get("question") or "").strip()
            slot = (q.get("slot") or "").strip() or f"q{len(questions) + 1}"
            if question:
                questions.append({
                    "agent": (q.get("agent") or "Chief of Staff").strip(),
                    "slot": slot,
                    "question": question,
                })
        return steps, questions
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM planner failed, using heuristic: %s", str(exc)[:120])
        return None


def _agent_label(key: str) -> str:
    from app.agents import AGENTS

    agent = AGENTS.get(key)
    return (agent.name if agent else key) or key


def _serialize(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "run_id": run["run_id"],
        "goal": run["goal"],
        "project_id": run["project_id"],
        "project_name": run.get("project_name", ""),
        "status": run["status"],
        "steps": [
            {"key": s["key"], "label": _agent_label(s["key"]),
             "task": s.get("task", ""), "result": s.get("result")}
            for s in run["steps"]
        ],
        "pending_questions": run["pending_questions"],
        "answers": run["answers"],
    }


def _ensure_project(goal: str, project_id: str | None, db) -> Any:
    if project_id:
        p = db.get(Project, project_id)
        if p is None:
            raise HTTPException(status_code=404, detail="project not found")
        return p
    name = goal.strip().split("\n")[0][:60] or "New mission"
    p = Project(name=name, description=goal.strip()[:2000])
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _run_step(agent_key: str, brief: str) -> str:
    """Run one agent synchronously with a hard timeout. Never raises."""
    from app.agents import get_agent
    from app.core.task_queue import _coerce_agent_kwargs

    try:
        agent = get_agent(agent_key)
    except KeyError:
        return f"(unknown agent '{agent_key}' — skipped)"
    try:
        kwargs = _coerce_agent_kwargs(agent, {"brief": brief, "extra_context": brief})
    except Exception:  # noqa: BLE001
        kwargs = {}
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            try:
                result = ex.submit(agent.run, **kwargs).result(timeout=_STEP_TIMEOUT_S)
            except TypeError:
                result = ex.submit(agent.run).result(timeout=_STEP_TIMEOUT_S)
        if isinstance(result, dict):
            return json.dumps(result)[:2000]
        return str(result)[:2000] if result else "(agent returned nothing)"
    except concurrent.futures.TimeoutError:
        return f"({agent_key} timed out after {_STEP_TIMEOUT_S // 60} min — skipped)"
    except Exception as exc:  # noqa: BLE001
        return f"({agent_key} failed: {str(exc)[:200]})"


@router.post("/plan")
def plan(payload: PlanRequest, user: Annotated[User, Depends(require_role("admin", "editor"))]) -> dict:
    """Hear the goal, assemble the team, make the project folder."""
    goal = (payload.goal or "").strip()
    if not goal:
        raise HTTPException(status_code=422, detail="goal is required")
    with SessionLocal() as db:
        project = _ensure_project(goal, payload.project_id, db)
        project_id = project.id
        project_name = project.name
    planned = _llm_plan(goal)
    steps, questions = planned if planned else _heuristic_plan(goal)
    run_id = uuid.uuid4().hex[:12]
    run = {
        "run_id": run_id,
        "goal": goal,
        "project_id": project_id,
        "project_name": project_name,
        "status": "awaiting_answers" if questions else "ready",
        "steps": [{"key": s["key"], "task": s["task"], "result": None} for s in steps],
        "pending_questions": questions,
        "answers": {},
        "created_at": time.time(),
    }
    _RUNS[run_id] = run
    logger.info("orchestrator plan %s: %d steps, %d questions (project %s)",
                run_id, len(steps), len(questions), project_id)
    return _serialize(run)


@router.post("/answer")
def answer(payload: AnswerRequest, user: Annotated[User, Depends(require_role("admin", "editor"))]) -> dict:
    """Fold the user's answers in — the run becomes ready."""
    run = _RUNS.get(payload.run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    run["answers"].update(payload.answers or {})
    run["pending_questions"] = []
    run["status"] = "ready"
    return _serialize(run)


@router.post("/execute")
def execute(payload: ExecuteRequest, user: Annotated[User, Depends(require_role("admin", "editor"))]) -> dict:
    """Run the team step by step (each sees prior results), then report."""
    run = _RUNS.get(payload.run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    run["status"] = "running"
    seen: list[str] = []
    for step in run["steps"]:
        brief = (
            f"GOAL: {run['goal']}\n"
            f"USER ANSWERS: {json.dumps(run['answers'])[:1500]}\n"
            f"PREVIOUS TEAM RESULTS:\n" + ("\n".join(seen) if seen else "(none yet)") + "\n"
            f"YOUR TASK: {step['task']}\n"
            "Deliver your best concrete result as text."
        )
        result = _run_step(step["key"], brief)
        step["result"] = result
        seen.append(f"[{step['key']}] {result[:800]}")
        logger.info("orchestrator %s step %s done (%d chars)",
                    run["run_id"], step["key"], len(result))
    run["status"] = "done"
    # File the outcome into the project folder.
    try:
        with SessionLocal() as db:
            p = db.get(Project, run["project_id"])
            if p is not None:
                summary = "\n".join(
                    f"- {s['key']}: {(s['result'] or '')[:300]}" for s in run["steps"]
                )
                prev = (p.description or "")[:1500]
                p.description = (prev + f"\n\nORCHESTRATOR RUN {run['run_id']}:\n{summary}")[:4000]
                db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not file run outcome: %s", str(exc)[:120])
    return _serialize(run)


@router.get("/runs/{run_id}")
def run_status(run_id: str, user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))]) -> dict:
    """Current state of a run (for polling / debugging)."""
    run = _RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return _serialize(run)
