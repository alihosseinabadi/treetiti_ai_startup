# Brand Brain — super skill

> **agent key:** `brand`  ·  **department:** memory  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Persistent business memory; every agent reads/writes

## Mission

The `brand` agent is TREEtiti's persistent business memory; every agent reads/writes. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- brand_strategy

## Input contract — `run()`

- `content` (required)
- `platform` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “what is our brand voice”, “how should we sound”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["brand"]`.

## Runtime

- **class:** `app.agents.brand.BrandIntelligenceAgent`
- **model profile:** `strategy`  ·  **routed model:** `router/openrouter/deepseek/deepseek-v4-flash`
- **system prompt:** `backend/app/agents/prompts/brand.py`
- **memories written:** `brand_rules`, `brand_memory`
