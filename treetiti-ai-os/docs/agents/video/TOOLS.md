# Video Director — tools & capabilities

Agent `video` holds **5** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `design` — Visual direction / art direction
- `generate_video` — Generate a video
- `image_generate` — Produce images via media services
- `read_memory` — Read brand / team long-term memory
- `video_generate` — Produce video via media services

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: _none_
