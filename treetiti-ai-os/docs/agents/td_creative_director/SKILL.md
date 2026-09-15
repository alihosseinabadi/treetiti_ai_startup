# 3D Creative Director — super skill

> **agent key:** `td_creative_director`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** 3D look direction, concepts, asset briefs

## Mission

The `td_creative_director` agent is TREEtiti's 3d look direction, concepts, asset briefs. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- creative_direction

## Input contract — `run()`

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “3D look direction”, “3D concept”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["td_creative_director"]`.

## Runtime

- **class:** `app.agents.td_creative_director.TD3DCreativeDirectorAgent`
- **model profile:** `reasoning`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/td_creative_director.py`
- **memories written:** _none_
