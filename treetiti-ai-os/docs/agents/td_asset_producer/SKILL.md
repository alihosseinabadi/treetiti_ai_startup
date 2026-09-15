# 3D Asset Producer — super skill

> **agent key:** `td_asset_producer`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** Builds 3D assets via Tripo/Meshy/Blender

## Mission

The `td_asset_producer` agent is TREEtiti's builds 3d assets via tripo/meshy/blender. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas


## Input contract — `run()`

- `brief` (default `''`)
- `asset_brief` (default `''`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “build plan for this 3D asset”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["td_asset_producer"]`.

## Runtime

- **class:** `app.agents.td_asset_producer.TDAssetProducerAgent`
- **model profile:** `reasoning`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/td_asset_producer.py`
- **memories written:** _none_
