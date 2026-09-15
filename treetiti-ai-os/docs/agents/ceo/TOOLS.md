# CEO / Orchestrator — tools & capabilities

Agent `ceo` holds **6** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `approve_internal` — Approve internal deliverables (editor/QA veto)
- `delegate` — Hand a brief to a specialist agent
- `orchestrate` — Activate and coordinate other agents
- `read_memory` — Read brand / team long-term memory
- `schedule` — Create scheduled agent jobs
- `write_memory` — Store findings into long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: _none_
