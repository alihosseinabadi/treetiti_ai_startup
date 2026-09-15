# Analytics — tools & capabilities

Agent `analytics` holds **4** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `analytics` — Compute analytics snapshots from persisted data
- `database_read` — Read persisted tables (projects, campaigns, analytics…)
- `read_memory` — Read brand / team long-term memory
- `write_memory` — Store findings into long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = yes)
- writes: `analytics`
