# Copywriter — tools & capabilities

Agent `content` holds **13** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `content_create` — Author on-brand copy (hooks, captions, articles)
- `generate_image` — Generate an image
- `generate_video` — Generate a video
- `get_trends` — Pull current trending topics
- `image_generate` — Produce images via media services
- `read_memory` — Read brand / team long-term memory
- `search_news` — Search news sources
- `search_reddit` — Search Reddit
- `search_social` — Search social platforms
- `search_web` — Search the web
- `search_youtube` — Search YouTube
- `video_generate` — Produce video via media services
- `write_memory` — Store findings into long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: _none_
