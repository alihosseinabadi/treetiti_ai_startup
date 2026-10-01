# TREEtiti AI Agency OS — Phase 1 Deliverable: Repository Audit & Plan

Audited: `2026-08-09` · Branch `main` @ `36f2f05` · Working copy == remote (synced)

The spec mandates: audit before implementation, no invented claims. Every statement below is from actual file inspection (3 parallel deep audits + direct reads).

---

## A. Complete repository map

```
our_company/  (= git repo treetiti_ai_startup)
├── AUDIT.md                       # this deliverable
├── media/                         # company videos/profiles (moved out of root, Phase 0.5)
├── customer_treetiti/             # chegovara client work + CUSTOMER_SERVICE_DIRECTORY.md
│   (customer_treetiti/treetiti/ stale duplicate removed Phase 0.5; treetiti/ is canonical)
├── treetiti/                      # NEXT/React 19 luxury marketing site (Vite 8, React 19, Tailwind 4)
│   ├── src/                       # cinematic homepage + Supabase CRM admin (see Frontend map)
│   ├── supabase/                  # migrations + edge functions (chat-webhook, groq-chat)
│   ├── mcp/                       # config references 7 servers, only ffmpeg server exists
│   ├── n8n/                       # 1 lead-capture workflow; credentials empty
│   ├── docs/                      # adr/, architecture/, supabase/
│   ├── AGENTS.md                  # locked-in architectural intent (not all followed)
│   └── scence 07/ , intro_video/, public/scenes/07/   # unreferenced design mockups
└── treetiti-ai-os/                # THE AI AGENCY OS (FastAPI backend + React dashboard)
    ├── docs/                      # incl. kimi-bridge.md (moved from root, Phase 0.5)
    ├── backend/                   # Python 3.12 + FastAPI + SQLAlchemy + pgvector
    │   ├── app/
    │   │   ├── main.py            # app factory, lifespan, 9 routers, SPA mount
    │   │   ├── config.py          # pydantic-settings; per-agent model map; .env
    │   │   ├── models.py          # 17 ORM tables (no tenant columns)
    │   │   ├── llm.py             # opencode CLI + Ollama + free google/groq/openrouter
    │   │   ├── brain.py           # seeds brand knowledge at startup
    │   │   ├── arena.py           # Elo model arena (champion vs challenger battles)
    │   │   ├── dispatcher.py      # keyword + LLM prompt->agent routing
    │   │   ├── scheduler.py       # autopilot daemon, 7 seeded jobs, AgentRun log
    │   │   ├── auth.py            # JWT + bcrypt; require_role unused
    │   │   ├── database.py        # SQLAlchemy engine + vector ext + tables
    │   │   ├── ratelimit.py       # in-process per-key daily limits, google key rotation
    │   │   ├── agents/            # 12 agents + AGENTS singleton (see §3)
    │   │   ├── services/          # pipeline, directory, publisher, search, social, boss, email, report
    │   │   ├── routers/           # agents, arena, auth, chat, content, directory, leads, memory, webhooks
    │   │   └── memory/store.py    # pgvector memory (embeddings only w/ ollama)
    │   ├── tests/                 # 6 files, 31 nodes; no agent/arena/webhook tests
    │   ├── requirements.txt, Dockerfile, .env(.example)
    │   ├── drafts/                # 3 pending_approval content drafts
    │   └── docs/                  # only duplicate CUSTOMER_SERVICE_DIRECTORY.md (real docs in ../docs/)
    ├── docs/                      # API.md, SCHEMA.md, WORKFLOWS.md, INSTALL.md, README.md
    ├── database/                  # init.sh + schema.sql (only creates vector ext; tables via ORM)
    ├── frontend/                  # React 18 dashboard (login, chat, agents, models, content, leads, memory, arena)
    ├── docker-compose.yml         # backend, n8n, postgres(pgvector), ollama optional
    └── .agents/skills/gemini-interactions-api/  # SKILL.md for Gemini Interactions API
```

## B. Current architecture (actual)

- **Backend**: single FastAPI service; agents are Python classes calling an LLM via `llm.py`. The default LLM provider is the **opencode CLI** (`opencode run --format json`, keyless, free). Free provider dispatch exists for `google/`, `groq/`, `openrouter/` prefixed model IDs.
- **Orchestration**: two bespoke orchestrators — `services/pipeline.py` (research→analytics→brand-gate→content) and `services/directory.py` (client intake→11-producer fan-out→editor QA→dossier). No formal workflow engine, no event bus, no task queue. Concurrency = `threading.Thread` + daemon scheduler tick.
- **Memory**: PostgreSQL + pgvector; but embeddings are only generated when `LLM_PROVIDER=ollama`, so default mode falls back to token-overlap matching. No tenant scoping.
- **Agents**: 12 classes (`market_research, content, brand, analytics, campaign, editor, seo, image, video, sales, developer` + `BaseAgent`), all delegate to `complete()`/`complete_json()`. No per-agent permission config; QA "gates" (brand gate, editor gate) are advisory — they never block or reject.
- **Frontend (os)**: React 18 dashboard already calls most backend endpoints incl. arena/memory/schedule (more than docs list).
- **Frontend (treetiti)**: marketing site + Supabase CRM admin; only LLM touchpoint is one Groq chat; **no approval/observability UI**.
- **DB tables (17)**: users, brand_memory, memory_entries, campaigns, content_items, image_prompts, video_concepts, research_opportunities, leads, analytics_snapshots, chat_sessions, debug_reports, battle_votes, scheduled_jobs, agent_runs, arena_models, arena_battles, client_profiles.

## C. Gap analysis (vs spec)

| Spec requirement | Status |
|---|---|
| 12 core agents | ✅ EXISTS (11 in AGENTS + special-cased publish) |
| CEO/Orchestrator agent | ⚠️ PARTIAL (pipeline/directory are fixed monoliths, no dynamic CEO) |
| Event system / handoffs (41,42) | ❌ MISSING |
| Workflow engine with stages/statuses (40) | ❌ MISSING |
| Artifact system + versioning (33,34) | ⚠️ PARTIAL (tables store outputs; no versioning, no provenance trail) |
| Skill Registry (17,18) | ❌ MISSING |
| Tool Registry + Tool Router (19–22) | ❌ MISSING (tools hardcoded inside agents) |
| Model Registry + Model Router (23,29) | ⚠️ PARTIAL (`agent_models` map + arena exist, no capability-filter router) |
| FREE_ONLY gate (30) | ❌ MISSING (philosophy only in comments; nothing enforces it) |
| Model Arena (31) | ✅ EXISTS (arena.py), ⚠️ hardcoded FAST_MODELS |
| Agent permissions (32) | ❌ MISSING |
| QA gates / approval flow (35) | ⚠️ PARTIAL (brand+editor gates exist but never block; Telegram approvals work) |
| Memory tenant isolation (36,39,15) | ❌ MISSING (no org/client/brand/workspace columns) |
| Learning loop (37) | ⚠️ PARTIAL (analytics snapshots only) |
| Scheduler (38) | ✅ EXISTS |
| Observability (43) | ⚠️ PARTIAL (AgentRun rows only; dashboard in treetiti-ai-os/frontend) |
| Failure handling / retries (44) | ⚠️ PARTIAL (model failover in llm.py; no tool fallback chain) |
| Multi-client architecture (15) | ❌ MISSING |
| Human-in-the-loop UI (45) | ⚠️ PARTIAL (Telegram yes; dashboard APPROVE/EDIT/REJECT no) |
| Security (46) | ⚠️ PARTIAL (secrets in .env + hardcoded defaults present — see §Safety) |
| Research pipeline w/ structured evidence (5,6,7) | ⚠️ PARTIAL (search.py keyless DDG/Bing, ResearchOpportunity w/ `extra` JSON) |
| CreativeBrief + Image/Video pipelines (11–16) | ⚠️ PARTIAL (image/video agents exist; image needs GOOGLE key; no CreativeBrief schema object) |

## D. Proposed architecture

Add a **core OS layer** (`backend/app/core/`) on top of the existing working pieces — no rewrites:

```
AGENTS (existing 12)  →  SKILL REGISTRY  →  TOOL REGISTRY  →  TOOL ROUTER (free-first, fallback chain)
                        →  MODEL REGISTRY →  MODEL ROUTER (FREE_ONLY gate, capability filters)
                              ↓
                     WORKFLOW ENGINE (stages, statuses, handoffs, events)
                              ↓
                     ARTIFACT SYSTEM (versioned, provenance-linked)
                              ↓
                     QA GATES (deterministic + brand + editor; now BLOCKING, returns revisions)
                              ↓
                     APPROVAL → PUBLISH → ANALYTICS → LEARNING (memory write-back)
```

New modules:
- `core/permissions.py` — per-agent capability matrix + allowed-tool checks
- `core/model_registry.py` — registry + router w/ FREE_ONLY gate, cost tier, capability filters, quota
- `core/tool_registry.py` — registry + router w/ capability→tool resolution, metadata, fallback chains
- `core/skill_registry.py` — versioned skill schema, dynamic load by task
- `core/events.py` — in-process publish/subscribe bus with spec event names
- `core/workflow.py` — Workflow state machine (stages, statuses, retries, handoff records)
- `core/artifacts.py` — artifact envelope + versioning + provenance (parent_id lineage)
- `core/qa.py` — deterministic + LLM QA gate helpers (blocking, revision feedback)

## E. File-by-file change plan (first batch)

```
treetiti-ai-os/backend/app/config.py            → MODIFY (add FREE_ONLY, tool/skill/model metadata flags, budget)
treetiti-ai-os/backend/app/core/__init__.py     → CREATE
treetiti-ai-os/backend/app/core/permissions.py  → CREATE
treetiti-ai-os/backend/app/core/model_registry.py → CREATE
treetiti-ai-os/backend/app/core/tool_registry.py  → CREATE
treetiti-ai-os/backend/app/core/skill_registry.py → CREATE
treetiti-ai-os/backend/app/core/events.py       → CREATE
treetiti-ai-os/backend/app/core/workflow.py     → CREATE
treetiti-ai-os/backend/app/core/artifacts.py    → CREATE
treetiti-ai-os/backend/app/core/qa.py           → CREATE
treetiti-ai-os/backend/tests/test_core_*.py      → CREATE
treetiti-ai-os/backend/app/agents/base.py       → MODIFY (attach permission set; emit run events)
treetiti-ai-os/backend/app/services/pipeline.py → MODIFY (route through core events/workflow) [later batch]
treetiti-ai-os/backend/app/services/directory.py → MODIFY (make QA gate blocking) [later batch]
```

## F. Dependency plan

No new third-party deps for the core layer (stdlib + existing sqlalchemy/pydantic). Optional later: `psutil` (resource caps), `aiofile` (async queue). Nothing paid.

## G. Migration plan

No DB schema changes in the first batch (core layer is in-memory + optional artifact dir). Tenant columns, content versioning table, and a workflow table are a dedicated later migration using SQLAlchemy `Base.metadata` + a versioned `.sql` file under `treetiti-ai-os/database/`.

## H. Testing plan

- Unit: registries (model/tool/skill), FREE_ONLY gate, router filters, artifact versioning, workflow transitions, QA gate — new `tests/test_core_*.py`.
- Regression: run existing `pytest` (31 nodes) green before/after.
- Integration/manual: `POST /agents/run` unchanged paths; `LLM_PROVIDER=ollama` smoke.
- E2E: not yet — requires live keys (TBD per spec "API keys at the end").

## I. Free-cost plan

| Provider | Tier | Used for | Status |
|---|---|---|---|
| opencode CLI (opencode/zai models) | FREE, keyless | default brain, all agents | in use |
| Ollama (local) | FREE | fallback + only real embeddings today | in use (optional) |
| Google AI Studio (Gemini) | FREE tier | image gen, multimodal | keys blank → image jobs fail; needs key later |
| Groq | FREE tier | fast extraction/QA | key in .env |
| OpenRouter | FREE tier | fallback pool | key in .env |
| DuckDuckGo/Bing search | FREE keyless | research | in use |
| Telegram / VK / SMTP | FREE | publish + notify | in use |
| FFmpeg/built-in | FREE | video | in use via mcp/ffmpeg |

`FREE_ONLY=true` is the default and **will be enforced** (raise clear error + local fallback, never silently switch to a paid provider).

## ⚠️ Safety findings (must fix but NOT part of silent auto-run)

- `backend/.env` contains live-looking credentials (admin pass, JWT secret, Telegram token, Groq/OpenRouter keys); config.py ships hardcoded `change-me-in-prod` defaults. → rotate keys; the user provides keys at the end.
- `scripts/setup-admins.sh` + `supabase/migrations/004_admin_users.sql` commit plaintext admin passwords. → recommend cleanup.
- Public webhooks (`/webhooks/publish`, `/webhooks/notify`, `POST /leads`) have no shared-secret auth — a DoS/abuse vector.
- `.gitignore` already excludes `.env*` except `.env.example` (safe).
- `AUTH_PASSWORDLESS=true` is currently on in `.env`.

## Next step (unblocks Phase 2+)

Implement `backend/app/core/` (E above) behind the existing API without changing RPC contracts, run the full pytest suite, then commit + push so the whole loop (Kimi bridge + watcher) keeps operating on the live repo.