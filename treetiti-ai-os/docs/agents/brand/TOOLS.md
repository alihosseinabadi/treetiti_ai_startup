# Brand Brain — tools & capabilities

Agent `brand` holds **4** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `approve_internal` — Approve internal deliverables (editor/QA veto)
- `design` — Visual direction / art direction
- `read_memory` — Read brand / team long-term memory
- `write_memory` — Store findings into long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: `brand_rules`, `brand_memory`
