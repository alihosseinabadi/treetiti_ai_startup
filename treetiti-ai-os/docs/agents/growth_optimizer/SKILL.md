# Growth Optimizer — super skill

> **agent key:** `growth_optimizer`  ·  **department:** growth  ·  **build phase:** 4  ·  **status:** implemented

**Role:** Learning loop: analyze → optimize → re-run

## Mission

The `growth_optimizer` agent is TREEtiti's learning loop: analyze → optimize → re-run. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- growth

## Input contract — `run()`

- `brief` (default `''`)
- `campaign_data` (default `''`)
- `analytics_report` (default `''`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “what should we scale or stop”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["growth_optimizer"]`.

## Runtime

- **class:** `app.agents.growth_optimizer.GrowthOptimizerAgent`
- **model profile:** `analytics`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/growth_optimizer.py`
- **memories written:** _none_
