# Architecture Decision Records

> Chronological log of significant decisions. Format: Context → Decision →
> Consequences. Statuses: `accepted` · `superseded`.

## ADR-001 — 9Router as the single LLM gateway (accepted, 2026-08-14)

**Context:** Nine direct provider keys (Groq, OpenRouter, CodeBuddy, Kimchi,
Ollama, BazaarLink, DeepSeek, Kimi, GitHub) with mixed health; a production
"AI Marketing OS" needed reliable, routed, monitored model access.

**Decision:** All production agent + chat LLM traffic flows through the local
9Router gateway (`http://127.0.0.1:20128/v1`). Tiers map model families to
capability profiles: reasoning→`cbai/glm-5.2`, strategy/coding→
`openrouter/deepseek/deepseek-v4-flash`, research/qa→`kimchi/minimax-m3`,
content/analytics/json→`groq/llama-3.3-70b-versatile`, fast→
`groq/llama-3.1-8b-instant`. The opencode CLI remains a dev-only fallback.

**Consequences:** Single key (`ROUTER_KEY`) to rotate; health + usage are
observable (`/providers/*`); a dead provider degrades instead of breaking a
run. WSL gotcha: `localhost` resolves to `::1` where the gateway does not
listen — always use the `127.0.0.1` literal.

## ADR-002 — LangGraph over CrewAI/AutoGen for orchestration (accepted, 2026-08-14)

**Context:** Agent DAGs needed deterministic stage ordering, parallel branches,
cycle protection, and state reducers — without another orchestrator framework's
surface area.

**Decision:** Use LangGraph's `StateGraph` (`langgraph_orchestrator.py`) with a
`TypedDict` state, parallel branches for analytics/strategy and
editorial/creative, and stage pruning in `WorkflowEngine.run_langgraph()`.
Tasks of kind `langgraph` run the full DAG. Import `Send` from
`langgraph.types` (the `langgraph.constants` path is deprecated).

**Consequences:** ~7s import cost on first use (short-circuited for empty
runs); a single canonical `default_stages()` defines the agency DAG.

## ADR-003 — CEO dynamic supervisor (accepted, 2026-08-14)

**Context:** A fixed hand-coded pipeline can't route arbitrary briefs to the
right specialist agents.

**Decision:** `CEOAgent` resolves the team at runtime from
`agent_registry.resolve()` (capabilities/skills/department), maps DAG stages →
agent keys, registers only implemented agents as LangGraph runners, and hands
each agent only the kwargs its `run()` accepts (`_BRIEF_PARAMS` aliases map a
text brief → `content`/`extra_context`/`issue`/`idea`/`topic`).

**Consequences:** New agents auto-join delegation once registered; no global
routing edits needed.

## ADR-004 — 19-agent matrix, registry as source of truth (accepted, 2026-08-14)

**Context:** Agents grew organically; there was no single inventory or status
gate.

**Decision:** `agent_registry.py` is the source of truth: 19 agents all
`STATUS_IMPLEMENTED`, keyed by module name, with department/phase/model profile/
skills/capabilities. `STAGE_TO_AGENT` drives DAG mapping (`learning→
growth_optimizer`, replacing the old `learning→brand`). The 4 legacy agents
(`sales`, `developer`, `campaign`, `seo`) stay registered but outside the
matrix.

**Consequences:** `GET /agents` returns rich specs; the frontend Agents page is
data-driven (no per-agent hardcoding except run-form specs).

## ADR-005 — Media/voice producers degrade, never raise (accepted, 2026-08-14)

**Context:** Live providers are flaky (e.g. Agnes 503s, no 3D key); a failing
producer must not break the pipeline or a REST call.

**Decision:** Every producer returns a dict `{"kind", "status", ...}` and
degrades to `{"status": "spec_only"}` (spec generated, no media) or
`{"status": "failed"}` instead of raising. `POST /assets/generate` persists a
`MediaAsset` row regardless.

**Consequences:** UI can render "spec only" honestly; tests
(`test_services_media.py`) lock the contract.

## ADR-006 — Human-in-the-loop approval gate (accepted, 2026-08-14)

**Context:** Auto-publishing without review risks off-brand output.

**Decision:** New `approvals` router + `POST /approvals/{id}/decide` records
the decider's email (`User.email`, not `username`) and a decision note. Content
workflow: research → … → content → human decides → social_manager publishes
(real channel failures become queued drafts, never fake successes).

**Consequences:** A documented review loop exists for content/campaigns/assets.

## ADR-007 — `agents/prompts/` extraction (accepted, 2026-08-14)

**Context:** Prompts lived inline in agent classes; hard to version/review.

**Decision:** Extract every `system_prompt` into
`backend/app/agents/prompts/<agent>.py` exporting `SYSTEM_PROMPT`; move
grounding constants (`BRAND_RULES`, `BUSINESS_SERVICES`, etc.) into the same
modules. Agents re-import what they still use at runtime. Verified: class
`system_prompt == module SYSTEM_PROMPT` for all 24 loadable agents.

**Consequences:** Prompt review/versioning is now file-based; no behavioral
change (183 tests unchanged).

## ADR-008 — Vanilla pointer-event drag for the team canvas (accepted, 2026-08-14)

**Context:** The frontend wanted mouse-movable agent cards; `package.json` has
no drag library (only react/react-dom/react-router-dom).

**Decision:** Build `TeamCanvas`/`AgentCard` with native pointer events
(`setPointerCapture`, `touch-action`), clamp cards to canvas bounds, persist
positions to `localStorage`, and support background-drag pan. No new
dependencies.

**Consequences:** Zero bundle growth; one more hand-rolled component to
maintain.

## ADR-009 — SSE consumed via fetch (accepted, 2026-08-14)

**Context:** The global event stream (`/api/v1/stream`) requires an
`Authorization` header; browser `EventSource` cannot set headers.

**Decision:** `streamEvents()` in `api.ts` uses `fetch` + `ReadableStream` with
a `TextDecoder` and frame parsing, returning an abort function. Token attached
via header; malformed frames ignored.

**Consequences:** Live team activity panel works under auth; client owns the
abort lifecycle.

## ADR-011 — TREEtiti OFFICE: 2.5D SVG office as the primary UI (accepted, 2026-08-15)

**Context:** The system needed a "living" primary experience — one central chat
driving the real multi-agent backend, with team status/movement visualized live
from real SSE events, not mocked. Options ranged from a 3D engine (Three.js) to
a plain dashboard.

**Decision:** Build a **2.5D SVG/CSS office** with **zero new dependencies** —
custom SVG mascots (19 icons, per-agent accent colors) animated via CSS
keyframes + camera transforms (drag-pan, wheel-zoom, focus-on-agent). All 19
agents render at desks; only agents with a non-idle phase animate/glow with
status bubbles and pulse rings. Routing: `/` = the office (protected), `/system/*`
= the existing Layout pages (System Mode), `*` → `/`. The office consumes the
global `/api/v1/stream` SSE via fetch + ReadableStream (ADR-009) plus 4s polling
of running missions.

**Consequences:** No new frontend deps; 60fps on modest hardware; mobile falls
back to compact office + agent focus. The office only ever reflects real backend
state — un-implemented features render as pending, never fake progress. Backend
support changes: `agent_runner` now threads `task_id` into signature-aware
agents, and the CEO's LangGraph stage runner tags `_emit_stage` events with the
correct per-stage agent key (fixes a closure bug where every stage event
reported the last agent).

## ADR-010 — Passwordless login (accepted, 2026-08-14)

**Context:** Local single-operator deployment; per-user passwords add friction.

**Decision:** `AUTH_PASSWORDLESS=true` + `AUTH_PASSWORDLESS_LOGIN=<email>` in
`.env` allow a login with that email and any non-empty password; the account's
`role` is returned directly.

**Consequences:** Simple local dev/auth; must be disabled for multi-user
deployment (documented in INSTALL.md).

## ADR-011 — QA return loop stays inside the CEO runner (accepted, 2026-08-15)

**Context:** The `qa` stage maps to the Editor Agent (veto). Rejected content
previously dead-ended — the pipeline kept going with unapproved work, or the
run failed.

**Decision:** Implement the return loop **inside the CEO's `qa` stage runner**
rather than adding graph cycles to LangGraph (which is a DAG). On rejection the
runner re-runs the content agent with the editor's `revision_notes` and the
previous draft, then re-QAs, up to `MAX_QA_ATTEMPTS = 3`. The editor keeps
final veto. Rejections emit `agent.failed` for `editor` with
`payload.revision_notes`, then `agent.started`/`agent.completed` for the
`content` revision pass — so the office shows the return loop live.

**Consequences:** No LangGraph cycle support needed; one bounded retry loop
lives in `_run_qa_loop`/`_revise_content`; the QA stage result records
`{status, attempts, revision_notes, content}`. The content agent gained
`revision_notes`/`previous` params (revision mode) while staying
backwards-compatible.

## ADR-012 — Clients hub aggregates missions, not a new table (accepted, 2026-08-15)

**Context:** A per-client view needed to run the company from one screen.

**Decision:** No new `clients` table. `GET /api/v1/clients` joins the existing
`missions.client`, `client_profiles`, `leads.company` and `approvals` into a
derived per-client card. The frontend `/clients` page renders those cards.

**Consequences:** No migration; clients emerge from the names used on missions /
directory profiles. A client with neither has no card (404 on detail).