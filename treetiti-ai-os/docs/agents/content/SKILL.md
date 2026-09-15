# Copywriter — super skill

> **agent key:** `content`  ·  **department:** strategy  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Hooks, copy, CTAs in the brand voice

## Mission

The `content` agent is TREEtiti's hooks, copy, ctas in the brand voice. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- copywriting

## Input contract — `run()`

- `opportunity` (default `None`)
- `platform` (default `'linkedin'`)
- `count` (default `1`)
- `approve` (default `True`)
- `insight_brief` (default `None`)
- `revision_notes` (default `None`)
- `previous` (default `None`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “write a caption for …”, “draft a post about …”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["content"]`.

## Runtime

- **class:** `app.agents.content.ContentCreationAgent`
- **model profile:** `content`  ·  **routed model:** `router/groq/llama-3.3-70b-versatile`
- **system prompt:** `backend/app/agents/prompts/content.py`
- **memories written:** _none_
