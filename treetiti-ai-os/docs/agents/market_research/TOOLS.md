# Researcher — tools & capabilities

Agent `market_research` holds **14** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `analyze_competitor` — Analyze a competitor's presence
- `database_read` — Read persisted tables (projects, campaigns, analytics…)
- `fetch_page` — Fetch a page body
- `fetch_url` — Fetch a URL's raw content
- `get_trends` — Pull current trending topics
- `read_memory` — Read brand / team long-term memory
- `scrape` — Fetch + parse a page body
- `search` — Web search across engines
- `search_news` — Search news sources
- `search_reddit` — Search Reddit
- `search_social` — Search social platforms
- `search_web` — Search the web
- `search_youtube` — Search YouTube
- `write_memory` — Store findings into long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = yes)
- writes: `content_opportunity`
