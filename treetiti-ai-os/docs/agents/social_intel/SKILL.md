# Social / Competitor Intel — super skill

> **agent key:** `social_intel`  ·  **department:** research  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Monitors competitor & social signals

## Mission

The `social_intel` agent is TREEtiti's monitors competitor & social signals. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- competitive_analysis

## Input contract — `run()`

- `brief` (default `''`)
- `competitors` (default `None`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “what are competitors posting”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["social_intel"]`.

## Runtime

- **class:** `app.agents.social_intel.SocialIntelAgent`
- **model profile:** `research`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/social_intel.py`
- **memories written:** `competitor_intel`
