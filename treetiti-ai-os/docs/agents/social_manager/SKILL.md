# Social Media Manager — super skill

> **agent key:** `social_manager`  ·  **department:** strategy  ·  **build phase:** 4  ·  **status:** implemented

**Role:** Publish + engage across platform adapters

## Mission

The `social_manager` agent is TREEtiti's publish + engage across platform adapters. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- instagram_strategy
- ugc

## Input contract — `run()`

- `brief` (default `''`)
- `channels` (default `None`)
- `extra_context` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “publish the approved posts”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["social_manager"]`.

## Runtime

- **class:** `app.agents.social_manager.SocialManagerAgent`
- **model profile:** `content`  ·  **routed model:** `router/cbai/glm-5.2`
- **system prompt:** `backend/app/agents/prompts/social_manager.py`
- **memories written:** _none_
