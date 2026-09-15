# Image Producer — tools & capabilities

Agent `image` holds **4** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `design` — Visual direction / art direction
- `generate_image` — Generate an image
- `image_generate` — Produce images via media services
- `read_memory` — Read brand / team long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: _none_
