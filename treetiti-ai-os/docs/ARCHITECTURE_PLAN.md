# TREEtiti AI OS — Architecture & Migration Plan (A–L)

Source spec: `MASTER_ARCHITECTURE.md` (§33 of the spec mandates this document before coding).
Audited against the real repo: **2026-08-14**, working copy == inspected state.

---

## A. CURRENT ARCHITECTURE (what exists today)

```
React/Vite UI (frontend/src)
   │  REST /api/v1 (+ /health proxy → :8000)
   ▼
FastAPI (backend/app/main.py)
   ├─ routers: auth, chat, agents, arena, content, leads, memory, directory, webhooks(telegram)
   ├─ agents/  (11 BaseAgent subclasses, prompts inline f-strings)
   ├─ llm.py   (_dispatch_provider: opencode CLI / google: / groq: / openrouter: / ollama)
   ├─ dispatcher.py (keyword intent → agent routing)
   ├─ scheduler.py + n8n workflows (daily content/report, telegram approval, lead mgmt)
   └─ core/  ← IN-PROGRESS REWRITE SEED (model_registry, tool_registry, workflow,
                                             qa, events, artifacts, permissions, skill_registry)
   ▼
Postgres 16 + pgvector (SQLAlchemy models: 18 tables)
   ▼
LLM: opencode CLI (opencode/deepseek-v4-flash-free)  •  fallback Ollama (qwen3:8b)
Media: Google AI Studio (gemini-2.5-flash-image) → generate_image / generate_video (ffmpeg)
Search: DuckDuckGo/Bing keyless in research agent
```

### Key facts found
1. **9Router is configured but NOT wired.** `config.py:142` has `router_base_url = http://localhost:20128/v1` but `router_key = ""` and `use_model_router = False`. LLM calls go through the **opencode CLI**, not 9Router.
2. **11 agents exist**, all plain `BaseAgent` subclasses; no LangGraph, no CrewAI/AutoGen in runtime.
3. **`backend/app/core/` is an unfinished seed** that already implements much of the target spec (event bus, model registry, tool registry, QA, workflow, artifacts, permissions, skill registry). It is opt-in via `use_model_router=False`.
4. **18 DB tables** exist (`models.py`); vector columns are real only on the Ollama provider path.
5. **Secrets are committed** in `backend/.env` (JWT, admin password, Telegram token, provider keys) — must be rotated + git-ignored before going live.
6. Frontend: 7 routes (`/chat` battle-mode, `/agents`, `/models`, `/content`, `/leads`, `/memory`); no Team Activity panel, no assets workspace, no projects/calendar/campaigns UI.
7. Media: image via Gemini; video via ffmpeg assembly; **no 3D**, no Nano Banana 2/Pro, no Veo/Gemini-Omni, no Agnes/DeepInfra image-video wiring yet (keys exist in `API_KEYS_MODELS.md`).
8. Research: DuckDuckGo/Bing only; **no Tavily/Firecrawl/Apify**, no evidence-sourced citation structure.
9. n8n + Telegram bot already present (boss commands, publisher fan-out).

---

## B. TARGET ARCHITECTURE (per spec §34)

```
TREEtiti UI (one chat + team activity + projects + assets + brand brain + analytics)
   │  REST + SSE (streaming events) + task approvals
   ▼
FastAPI API
   ▼
CEO / ORCHESTRATOR  (LangGraph supervisor; dynamic agent activation)
   ▼
LangGraph  (stateful graphs: sequential / parallel / iterate / retry / approve)
   ▼
Specialized agents (19 total, split into departments)
   ▼
Tool layer (registry): research / social / media / 3D / analytics / approval
   ▼
9Router  http://localhost:20128/v1  (ALL LLM traffic)
   ▼
Groq / OpenRouter / CodeBuddy / Kimchi / Ollama / others
```

Media is **separate** from LLM: Image (Nano Banana 2/Pro → Agnes → …), Video (Gemini Omni Flash → Veo 3.1 → Agnes → Seedance), 3D (Tripo → Meshy → Blender local), Voice (dedicated TTS/STT), Web (Tavily → Firecrawl → Apify → official APIs).

Memory: every agent → Brand Brain → Supabase/Postgres (+ pgvector only where semantic retrieval helps).
Long tasks: Agent → Task queue → Worker → Progress events → Web UI (SSE).

### Target differences from current
- LLM gateway: **opencode CLI → 9Router** (set `use_model_router=True`, fill `router_key`).
- Orchestration: dispatcher keyword table → **LangGraph** dynamic workflows.
- Agents: 11 → **19** (add CEO, Business Strategist, Content Hunter/Trend Scout, Social/Competitor Intel, Content Strategist, Creative Director, Copywriter, Social Media Manager, 3D Creative Director, 3D Asset Producer, Video Director, Video Producer, UGC Producer, QA guardian, Growth Optimizer; keep+repurpose Research, Image, Analytics, Sales, Brand).
- Prompts: inline f-strings → **external prompt files** (deployable, editable, versioned).
- Model policy: hardcoded per-agent → **capability-based model selection** (spec §7) with configurable tiers + dynamic fallback.
- UI: agent list/battle-mode → **one chat + right-panel Team Activity + developer mode**.
- Research: keyless search → **Tavily/Firecrawl evidence-cited research**.
- Media: Gemini-image only → **multi-provider abstraction** with Nano Banana 2/Pro, Agnes, Veo, Seedance, 3D providers.

---

## C. MIGRATION PLAN

Fully spec-compliant phases (§32). Each phase lands working, testable increments.

| Phase | Scope | Result |
|---|---|---|
| **0 — Hardening** | Rotate & remove committed secrets; add `.env.example`; git-ignore real `.env`; baseline tests pass | Secure baseline |
| **1 — Foundation** | Wire 9Router as the LLM gateway (fill `router_key`, `use_model_router=True`); finish `core/` seed: agent registry, tool registry, provider capability registry, task queue + worker, SSE event stream, Supabase sync, Brand Brain storage, logging, provider health probes | Platform runs on 9Router, events stream to UI |
| **2 — Core team** | Build CEO (LangGraph supervisor), Researcher (Tavily/Firecrawl), Content Hunter, Strategist, Creative Director, Copywriter, QA, Brand Brain | 1-chat orchestration works end-to-end |
| **3 — Production** | Image Producer (Nano Banana 2/Pro + Agnes fallback), Video Director+Producer (Omni Flash/Veo + Agnes/Seedance), 3D Creative Director + Asset Producer (Tripo/Meshy/Blender), UGC Producer | Media pipeline integrated |
| **4 — Growth** | Social Media Manager (modular platform adapters), Campaign Manager, Analytics (WHY + insights), Growth Optimizer (learning loop) | Closed loop: publish → analyze → learn |
| **5 — Monetization** | Sales + Customer Success agents | Business-ready |

Principle: reuse the `core/` seed and existing routers/agents wherever possible; extend, don't rebuild from zero.

---

## D. AGENT MATRIX (current 11 → target 19)

| # | Spec agent | Dept | Status | Maps to existing |
|---|---|---|---|---|
| 1 | CEO / Orchestrator | Exec | NEW | dispatcher.py (replace w/ LangGraph) |
| 2 | Business Strategist | Exec | NEW | — (campaign.py partially) |
| 3 | Researcher | Research | EXIST | research.py (add Tavily/Firecrawl + evidence) |
| 4 | Content Hunter / Trend Scout | Research | NEW | research.py (extend) |
| 5 | Social / Competitor Intel | Research | NEW | research.py (extend) |
| 6 | Content Strategist | Strategy | NEW | campaign.py |
| 7 | Creative Director | Strategy | NEW | brand.py (visual identity control) |
| 8 | Copywriter | Strategy | NEW | content.py |
| 9 | Social Media Manager | Strategy | NEW | services/social.py |
| 10 | 3D Creative Director | Production | NEW | video.py (extend) |
| 11 | 3D Asset Producer | Production | NEW | — (Tripo/Meshy/Blender) |
| 12 | Image Producer | Production | EXIST | image.py (add Nano Banana 2/Pro, Agnes) |
| 13 | Video Director | Production | EXIST | video.py |
| 14 | Video Producer | Production | NEW | llm.py generate_video (extend) |
| 15 | UGC / Influencer Producer | Production | NEW | — (LLM+image+video+voice combo) |
| 16 | QA / Brand Guardian | Quality | EXIST | editor.py (VETO power) |
| 17 | Analytics | Growth | EXIST | analytics.py (add WHY insights) |
| 18 | Growth Optimizer | Growth | NEW | — (learning loop) |
| 19 | Brand Brain | Memory | EXIST | brain.py / memory/store.py |

---

## E. MODEL MATRIX (via 9Router; capability-based, configurable)

Tiers from spec §6, mapped to real, verified models:

| Tier | Purpose | Models (primary → fallback) |
|---|---|---|
| **A — Fast** | routing, classification, short copy, summaries | `groq/llama-3.3-70b-versatile` → `groq/qwen/qwen3-32b` |
| **B — Strong general** | strategy, creative reasoning, copy, research synth | `kimchi/minimax-m3` / `openrouter/deepseek/deepseek-v4-flash` |
| **C — Complex reasoning** | hard strategy, multi-step planning, conflict | `cbai/glm-5.2` → `openrouter/deepseek/deepseek-v4-flash` → `kimchi/minimax-m3` |
| **D — Local** | fallback, privacy, cheap batch | `ollama/gpt-oss:120b` → `ollama/qwen3:8b` |

Agent→tier bindings (config-driven, not hardcoded):
- CEO: A (default), fallback C, local D
- Business Strategist / Content Strategist: C → B
- Researcher: C synthesis / A fast synth
- Content Hunter: A → C complex analysis
- Creative Director / Copywriter (high quality): B → C
- QA: C
- Media agents: model used only for planning/JSON; actual media via media providers.

Media models (separate, §8):
- **Image**: `Nano Banana 2` (high-volume) → `Nano Banana Pro` (premium) → `agnes-image-2.1-flash` → `agnes-image-2.0-flash` → DeepInfra image (only when balance) → local SD
- **Video**: `Gemini Omni Flash` → `Veo 3.1` (cinematic) → `agnes-video-v2.0` → DeepInfra `Seedance-2.0` (only when balance) → ffmpeg assembly
- **3D**: Tripo → Meshy → Blender (local Python API)
- **Voice**: dedicated TTS/STT provider (Piper local or cloud)

Model selection layer (spec §7): each agent declares `required_capabilities` (reasoning / vision / tool_calling / structured_output / long_context / speed / creativity); the router layer (already seeded in `core/model_registry.py`) picks best available through 9Router + health.

---

## F. TOOL / API MATRIX

| Capability | Tool(s) | Provider | Status |
|---|---|---|---|
| Web search | `web_search()` | Tavily (pref) → fallback (DuckDuckGo existing) | ADD |
| Extraction | `web_extract()`, `crawl_site()` | Firecrawl → direct fetch | ADD |
| News/social/reddit/youtube | `search_news()`, `search_social()`, `search_reddit()`, `search_youtube()` | Tavily / Apify / official APIs | ADD |
| Competitor/company data | `find_competitors()`, `extract_company_data()` | Tavily + Firecrawl | ADD |
| Trend/intent scoring | `get_trends()` | Tavily trends + LLM scoring | ADD |
| Social platform adapter | `SocialProvider` (IG/TikTok/YT/LinkedIn/X/Reddit) w/ `capabilities` | official APIs / compliant providers | ADD |
| 3D generation | text→3D, image→3D, mesh, texture | Tripo → Meshy → Blender local | ADD |
| Image generation | LLM-independent | Nano Banana 2/Pro → Agnes → DeepInfra → local SD | EXTEND (image.py) |
| Video generation | image→video, ref-based, cinematic | Gemini Omni Flash → Veo 3.1 → Agnes → Seedance → ffmpeg | EXTEND |
| Voice | TTS/STT | dedicated provider | ADD |
| Queue/workers | long-running tasks | in-process queue → worker → SSE | EXTEND (core/) |
| Automation | n8n workflows | existing | KEEP |
| Telegram | bot + approval commands | existing | KEEP |

---

## G. DATABASE SCHEMA

Current (18 tables, `backend/app/models.py`): users, brand_memory, memory_entries, brand_content_campaigns, content_items, image_prompts, video_concepts, research_opportunities, leads, analytics_snapshots, chat_sessions, debug_reports, battle_votes, scheduled_jobs, agent_runs, arena_models, arena_battles, client_profiles.

Target additions (spec §21 — extend, don't replace):
- `organizations`, `clients`, `brands`, `brand_assets`
- `projects` (client → campaigns → content → assets → research → analytics → experiments)
- `campaigns`
- `tasks`, `task_events` (queue + progress)
- `agents` (registry metadata), `agent_runs` (exists — extend)
- `tools`, `tool_runs`
- `providers`, `models`, `provider_health`, `provider_usage` (model/cost/health registry)
- `research_sources`, `research_results` (evidence: source, URL, date, confidence, type)
- `content_versions`, `content_performance`
- `experiments` (growth optimizer)
- `media_assets` (image/video/3D/audio + creator agent + model + prompt metadata + version)
- `social_accounts`, `social_posts`
- `analytics`, `approvals` (human-in-the-loop)

---

## H. FRONTEND COMPONENT TREE (target)

```
App
├─ Sidebar (left): New Chat · Conversations · Team · Brand Brain · Projects ·
│                 Content Calendar · Campaigns · Assets · Analytics ·
│                 Integrations · Settings   (+ Developer Mode toggle)
├─ ChatWorkspace (center)
│   ├─ ConversationThread
│   │   ├─ UserMessage / AssistantMessage
│   │   ├─ AgentActivityInline (who's working + progress)
│   │   ├─ AssetPreview (image/video/3D/citation cards)
│   │   └─ ApprovalGate ([Review] [Approve & Publish] [Edit])
│   └─ Composer (multi-modal: text + references + approve-as-you-go)
├─ TeamActivityPanel (right, collapsible)
│   ├─ AgentCard (avatar · name · role · status · current task · progress)
│   ├─ ToolRunLog · SourceList · ModelBadge (dev mode) · Latency/Retries
└─ Views (existing→extend): Projects · Assets · Calendar · Campaigns ·
    BrandBrain · Analytics · Integrations · Settings
```

UI language: ChatGPT/Linear/Apple-style premium creative-studio feel — not a developer dashboard. Reuse existing React 18 + Vite + Tailwind 4 stack; add real-time via SSE.

---

## I. EVENT / STREAMING ARCHITECTURE

Event bus already seeded in `core/events.py`. Standard event names (spec §16):

```
task.started / task.completed / task.failed
agent.started / agent.completed / agent.retrying
tool.started / tool.completed
media.generation.started / media.generation.completed
qa.started / qa.failed
```

Transport: FastAPI **SSE** endpoint (`/api/v1/stream?task_id=…`) → UI right panel + inline. Parallel agents (research ∥ competitor ∥ trends) emit concurrently; LangGraph manages join. Developer mode adds per-event `model`, `provider`, `tool`, `latency`, `retries`, `status`.

---

## J. SECURITY MODEL

1. **Rotate + purge committed secrets** (`backend/.env`: JWT secret, admin password, Telegram token, provider keys). Add `.env.example`; git-ignore `.env`.
2. Keys only in env/secret store — never in source, prompts, AGENTS.md, frontend, or DB responses to clients. Source of truth: `our_company/treetiti-ai-os/API_KEYS_MODELS.md` (never printed in full).
3. Backend-only key resolution; frontend receives model *metadata*, never credentials.
4. Auth: existing JWT + RBAC; admin-only for provider/cost settings.
5. Approval gates for publish / paid API calls / spend / delete / major campaign changes (spec §18).
6. Cost/abuse limits: per-key rate limits (existing), free-first defaults.
7. Do not log full prompts with secrets; redact tool payloads.

---

## K. COST MODEL (free-first, §23)

- Default routing: free/cheap tiers first (groq llama-3.3, openrouter free, kimchi, cbai).
- Paid providers OFF unless enabled. Each paid provider carries `enabled`, `max request cost`, `max monthly budget`, `approval required`.
- `provider_usage` table records per-run spend → monthly budget guardrail.
- Media: Nano Banana 2 (high-volume cheap) before Nano Banana Pro; DeepInfra only when balance exists; local Ollama for batch/privacy.
- Monitor + log actual latency vs local (spec §6 Tier D note).

---

## L. EXACT FILES TO CREATE / MODIFY (Phase 1 focus)

### Modify (config / gateway)
- `backend/app/config.py` — set `use_model_router=True`, fill `router_key` from env, expand provider/media/cost settings.
- `backend/app/llm.py` — replace opencode-CLI dispatch with 9Router client (`POST {router_base_url}/v1/chat/completions`), keep media + provider fallback; keep opencode path as dev-only (spec §4).
- `backend/.env` / `.env.example` — rotate secrets, add `ROUTER_KEY`, Tavily/Firecrawl/3D keys.
- `backend/.gitignore` — ensure `.env`, `*.pem`, `treetiti-artifacts/` ignored.

### Extend (foundation already seeded in `backend/app/core/`)
- `core/model_registry.py` → provider capability registry + tier binding + health
- `core/tool_registry.py` → research/media/social/3d tool adapters + fallback chains
- `core/workflow.py` → LangGraph integration
- `core/events.py` → SSE emitter wiring
- `core/qa.py`, `core/artifacts.py`, `core/permissions.py`, `core/skill_registry.py` → finish + unit tests

### New agents (`backend/app/agents/`)
`ceo.py`, `strategist.py`, `content_hunter.py`, `social_intel.py`, `content_strategist.py`, `creative_director.py`, `copywriter.py`, `social_manager.py`, `td_creative_director.py`, `td_asset_producer.py`, `video_director.py`, `video_producer.py`, `ugc_producer.py`, `growth_optimizer.py` (+ refactor existing into shared `prompts/` dir).

### New routers
`routers/tasks.py` (queue+worker+SSE), `routers/projects.py`, `routers/assets.py`, `routers/campaigns.py`, `routers/approvals.py`, `routers/providers.py` (health/usage).

### New services / tools
`services/search.py` (Tavily/Firecrawl), `services/social/` (adapters + capabilities), `services/media/image.py`, `services/media/video.py`, `services/media/td.py`, `services/voice.py`.

### DB
`backend/app/models.py` — add tables from §G. `database/schema.sql` — extension + indexes.

### Frontend (`frontend/src`)
- `components/chat/` (Thread, Composer, AssetPreview, ApprovalGate)
- `components/team/` (AgentCard, TeamActivityPanel, ToolRunLog)
- `components/layout/Sidebar.tsx` (new nav), `pages/Projects`, `Assets`, `Calendar`, `Campaigns`, `Analytics`, `Integrations`, `Settings`
- `api.ts` — add SSE + new endpoints
- Keep existing `/chat`, `/agents`, `/models`, `/content`, `/leads`, `/memory`; fold battle-mode under dev tools.

### Docs
- `docs/` — extend API.md, SCHEMA.md, WORKFLOWS.md with new contracts; add `docs/ADRS.md`.

---

## Next action

Phase 1 is the safe first increment: **wire 9Router + finish `core/` seed + SSE + provider health**, with tests. Per spec §33, I will not start writing the 19 agents until this foundation is green.
