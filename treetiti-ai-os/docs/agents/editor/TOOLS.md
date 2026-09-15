# QA / Brand Guardian — tools & capabilities

Agent `editor` holds **3** of the 35 canonical capabilities. Every capability is checked by `core.permissions.can()` at runtime.

## Capabilities

- `approve_internal` — Approve internal deliverables (editor/QA veto)
- `content_create` — Author on-brand copy (hooks, captions, articles)
- `read_memory` — Read brand / team long-term memory

## Human-in-the-loop

- none of this agent's capabilities require a human gate.

## Data stores

- reads: brand memory, team memory, persisted tables (`database_read` = no)
- writes: _none_
