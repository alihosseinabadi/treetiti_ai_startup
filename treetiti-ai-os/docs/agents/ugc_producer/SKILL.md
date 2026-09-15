# UGC / Influencer Producer — super skill

> **agent key:** `ugc_producer`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** UGC-style content (image+video+voice combo)

## Mission

The `ugc_producer` agent is TREEtiti's ugc-style content (image+video+voice combo). It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- ugc

## Input contract — `run()`

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “creator-style content pack”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["ugc_producer"]`.

## Runtime

- **class:** `app.agents.ugc_producer.UGCProducerAgent`
- **model profile:** `content`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/ugc_producer.py`
- **memories written:** _none_
