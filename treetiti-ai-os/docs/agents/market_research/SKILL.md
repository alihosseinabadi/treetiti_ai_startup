# Researcher — super skill

> **agent key:** `market_research`  ·  **department:** research  ·  **build phase:** 2  ·  **status:** implemented

**Role:** Evidence-sourced market research (web + social)

## Mission

The `market_research` agent is TREEtiti's evidence-sourced market research (web + social). It executes one brief per `run()` call and reports a structured result that the CEO, the scheduler and the chat layer can consume.

## Expertise areas

- market_research
- competitive_analysis

## Input contract — `run()`

- `extra_context` (default `''`)
- `ideas` (default `None`)
- `sources` (default `None`)
- `scrape_urls` (default `None`)

> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first accepted parameter, so any caller can pass `brief`.

## Output contract

Returns a JSON-serializable `dict` (or a string for the conversational agents). Producers always include a `status` field; failures degrade to `spec_only`/`failed` instead of raising, so pipelines never crash.

## When to use it

- “research this market”, “who is the audience for …”
- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the scheduler via `scheduler.HANDLERS["market_research"]`.

## Runtime

- **class:** `app.agents.research.MarketResearchAgent`
- **model profile:** `research`  ·  **routed model:** `router/kimchi/minimax-m3`
- **system prompt:** `backend/app/agents/prompts/market_research.py`
- **memories written:** `content_opportunity`
