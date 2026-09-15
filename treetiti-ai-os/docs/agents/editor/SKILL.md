# QA / Brand Guardian — super skill

> **agent key:** `editor`  ·  **department:** quality  ·  **build phase:** 2  ·  **status:** implemented

**Role:** VETO-quality gate over every important output

## Mission

The `editor` agent is TREEtiti's veto-quality gate over every important output. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- copy_qa

## Input contract — `run()`

- `content` (default `''`)
- `brand_voice` (default `''`)
- `deliverable_type` (default `'post'`)
- `platform` (default `'any'`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “review this content”, “QA check”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["editor"]`.

## Runtime

- **class:** `app.agents.editor.EditorAgent`
- **model profile:** `qa`  ·  **routed model:** `router/kimchi/minimax-m3`
- **system prompt:** `backend/app/agents/prompts/editor.py`
- **memories written:** _none_
