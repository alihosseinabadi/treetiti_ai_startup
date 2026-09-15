# CEO / Orchestrator — super skill

> **agent key:** `ceo`  ·  **department:** exec  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Dynamic supervisor; activates the right team per task

## Mission

The `ceo` agent is TREEtiti's dynamic supervisor; activates the right team per task. It is the orchestrator: it reads a single brief, activates only the specialists the task needs, and reports the whole team's output.

## Expertise areas

- brand_strategy

## Input contract — `run()`

- `brief` (default `''`)
- `capabilities` (default `None`)
- `skills` (default `None`)
- `department` (default `None`)
- `team_keys` (default `None`)
- `inputs` (default `None`)
- `stages` (default `None`)
- `task_id` (default `None`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “run the whole team on …”, “what did we do today”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["ceo"]`.

## Runtime

- **class:** `app.agents.ceo.CEOAgent`
- **model profile:** `strategy`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/ceo.py`
- **memories written:** _none_
