# Video Director — super skill

> **agent key:** `video`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** Video direction, scripts, shot lists, assembly

## Mission

The `video` agent is TREEtiti's video direction, scripts, shot lists, assembly. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- video_production

## Input contract — `run()`

- `topic` (default `''`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “make a video about …”, “/video …”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["video"]`.

## Runtime

- **class:** `app.agents.video.VideoDirectorAgent`
- **model profile:** `vision`  ·  **routed model:** `opencode/deepseek-v4-flash-free`
- **system prompt:** `backend/app/agents/prompts/video.py`
- **memories written:** _none_
