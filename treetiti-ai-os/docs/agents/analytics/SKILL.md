# Analytics — super skill

> **agent key:** `analytics`  ·  **department:** growth  ·  **build phase:** 4  ·  **status:** implemented

**Role:** WHY behind the numbers, insight reports

## Mission

The `analytics` agent is TREEtiti's why behind the numbers, insight reports. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- growth

## Input contract — `run()`

- `report_data` (default `None`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “how did our content perform”, “analytics report”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["analytics"]`.

## Runtime

- **class:** `app.agents.analytics.AnalyticsAgent`
- **model profile:** `analytics`  ·  **routed model:** `router/groq/llama-3.3-70b-versatile`
- **system prompt:** `backend/app/agents/prompts/analytics.py`
- **memories written:** `analytics`
