# Video Producer — super skill

> **agent key:** `video_producer`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** Renders/assembles video via media providers

## Mission

The `video_producer` agent is TREEtiti's renders/assembles video via media providers. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- video_production

## Input contract — `run()`

- `brief` (default `''`)
- `concept` (default `''`)
- `scenes` (default `None`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “produce this video”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["video_producer"]`.

## Runtime

- **class:** `app.agents.video_producer.VideoProducerAgent`
- **model profile:** `vision`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/video_producer.py`
- **memories written:** _none_
