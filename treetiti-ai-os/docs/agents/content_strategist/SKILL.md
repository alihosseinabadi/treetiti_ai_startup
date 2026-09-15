# Content Strategist — super skill

> **agent key:** `content_strategist`  ·  **department:** strategy  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Editorial calendar, content pillars, briefing

## Mission

The `content_strategist` agent is TREEtiti's editorial calendar, content pillars, briefing. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- content_strategy

## Input contract — `run()`

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “content pillars”, “editorial calendar”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["content_strategist"]`.

## Runtime

- **class:** `app.agents.content_strategist.ContentStrategistAgent`
- **model profile:** `strategy`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/content_strategist.py`
- **memories written:** `content_strategy`
