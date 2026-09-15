# Image Producer — super skill

> **agent key:** `image`  ·  **department:** production  ·  **build phase:** 3  ·  **status:** implemented

**Role:** Image generation via multi-provider abstraction

## Mission

The `image` agent is TREEtiti's image generation via multi-provider abstraction. It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- creative_direction

## Input contract — `run()`

- `idea` (required)
- `style` (default `'cinematic'`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “create an image of …”, “/image …”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["image"]`.

## Runtime

- **class:** `app.agents.image.ImageGenerationAgent`
- **model profile:** `image`  ·  **routed model:** `opencode/deepseek-v4-flash-free`
- **system prompt:** `backend/app/agents/prompts/image.py`
- **memories written:** _none_
