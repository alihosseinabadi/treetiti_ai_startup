# Content Hunter / Trend Scout — super skill

> **agent key:** `content_hunter`  ·  **department:** research  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Finds trends, angles and content gaps

## Mission

The `content_hunter` agent is TREEtiti's finds trends, angles and content gaps. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- market_research
- growth

## Input contract — `run()`

- `brief` (default `''`)
- `queries` (default `None`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “what's trending”, “find content gaps”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["content_hunter"]`.

## Runtime

- **class:** `app.agents.content_hunter.ContentHunterAgent`
- **model profile:** `research`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/content_hunter.py`
- **memories written:** `content_opportunity`
