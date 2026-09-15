# Business Strategist — super skill

> **agent key:** `strategist`  ·  **department:** exec  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Market strategy, positioning, campaign concepts

## Mission

The `strategist` agent is TREEtiti's market strategy, positioning, campaign concepts. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- brand_strategy
- content_strategy

## Input contract — `run()`

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “position us against …”, “strategy for …”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["strategist"]`.

## Runtime

- **class:** `app.agents.strategist.BusinessStrategistAgent`
- **model profile:** `strategy`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/strategist.py`
- **memories written:** `strategy`
