# Creative Director — super skill

> **agent key:** `creative_director`  ·  **department:** strategy  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Visual identity, art direction, brand look

## Mission

The `creative_director` agent is TREEtiti's visual identity, art direction, brand look. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- creative_direction
- brand_strategy

## Input contract — `run()`

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “art direction for the brand”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["creative_director"]`.

## Runtime

- **class:** `app.agents.creative_director.CreativeDirectorAgent`
- **model profile:** `reasoning`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/creative_director.py`
- **memories written:** `visual_identity`
