# API Reference

Base URL: `http://localhost:8000/api/v1`

Auth: `Authorization: Bearer <token>` (except `/auth/login` and `/health`).

Interactive docs (Swagger): http://localhost:8000/docs

## System

### `GET /health`
Public. Returns `{"status":"ok","app":"TREEtiti AI Marketing OS"}`.

## Auth

### `POST /auth/login`
Body: `{"email": "...", "password": "..."}`
→ `{"access_token": "...", "token_type": "bearer", "role": "admin"}`

### `GET /auth/me`
→ `{"email": "...", "role": "admin"}`

## Chat (AI Brain)

### `POST /chat`
Body: `{"message": "...", "session_id": null, "context": "tree", "confirm": false}`
→ `{"session_id": "...", "reply": "...", "context": "tree", "company": bool,
"task_id": null, "os_command": bool, "confirmation_required": bool,
"confirm_action": null, "confirm_payload": null}`

The brain answers using brand memory (semantic recall). Omit `session_id` to
start a new conversation.

**Cross-session memory (RAG)**: the brain recalls relevant content from **ALL**
chat sessions, not just the current one — `_system_prompt` injects a
`PAST CHAT SESSIONS` block from `search_chat_history()` (app/memory/store.py)
which scans every non-archived session's messages and scores them against the
question. Ask "what did we decide about X?" in a brand-new chat and the brain
answers from earlier conversations. Long-term signal is also auto-stored as RAG
`MemoryEntry` rows: user goals/preferences via `remember_conversation()` and
assistant outcomes via `store_memory(kind="lesson")`. The `GET /memory` endpoint
now returns both brand memory and RAG chat memories; `GET /memory/kinds` lists
the RAG kinds; `GET /chat/history/search?q=…` recalls matching past exchanges.

Before replying, the brain runs keyword **intent detection** (`_intel_for`) and
injects a real **SYSTEM STATE** block (from `app/ceo_intel.py`) into the system
prompt — today's completed tasks/agent runs/content/assets, active work,
missions, pending approvals, blocked work, projects, recent analytics — so the
CEO answers from real system state, never from a stale prompt. The CEO is
instructed to say plainly what is missing rather than invent it. The chat brain
model is pinned to the content tier (`_chat_model()` → content profile, e.g.
`groq/llama-3.3-70b-versatile`); if battle mode fails, it degrades to a single
model instead of returning 500.

**OS Command Layer**: every message is first passed through
`dispatch_os_command(message, context, session_id, db, confirm)` in
`app/os_commands.py`. When it matches an operational intent the reply is a real
action, not prose: the response sets `os_command: true`, and the action is
executed against the real system. Destructive actions (delete project/session/
memory, stop/cancel task, pause/stop mission, forget) return
`confirmation_required: true` with a `confirm_action` + `confirm_payload`; the
client re-sends the same message with `confirm: true` to execute. Non-destructive
commands (create project/task/mission/media, save memory, move/rename session,
resume mission) execute immediately. Intentions recognized (regex-driven, in
order):

- `create/list/delete project`, `move <chat|session|this chat> to <project>`,
  `rename this chat to <title>`, `delete <this chat|this session>`,
  `delete chat sessions` / `delete the conversation` / `clear this chat`
  (confirm required), `delete all sessions` (confirm required),
  `reset` / `start fresh` / `start a new conversation` (clears the current
  conversation so the next message starts fresh — no confirm needed)
- `create <a> mission <name>`, `pause/resume/stop/delete (the|this) mission`,
  `<mission> <pause|resume|stop|status>` (named-mission steering),
  `pause all missions` / `stop the active missions`, `stop everything`,
  `archive the current work` — bulk controls that pause every active mission
  and cancel running/queued tasks in one step
- `create <a> task for <the> <agent> agent` / `make <agent> <do X>`
- `cancel <the> task` (requires confirm)
- `remember that <fact>` / `forget that` (forget requires confirm, deletes the
  most recent matching memory via `delete_memory`)
- `create an image|video of <prompt>` → enqueues a `media_image`/`media_video`
  task on the background queue, returns `task_id`
- passthroughs to intel: `project status`, `daily summary`, and any
  conversational question falls through to the CEO with real system state

In customer context (`customer:<name>`) all project/mission ops are scoped to
that client. The OS layer never raises into the chat — on no-match it simply
returns `handled: false` and the CEO answers normally.

**Agentic Controller (Phase 7)** runs **before** the OS command layer. The user
describes an *outcome* ("research the Marina Tower villa competitor", "make
content about our villas every day and send it to me") and `run_agentic` in
`app/agentic.py` figures out the workflow — it auto-creates a project, runs deep
research, builds recurring missions and scheduled cycles — and only asks a
business question when a human decision genuinely matters. The chat message is
classified (keyword intent → `research` | `recurring` | `workflow` | `default`);
explicit primitive phrasing ("create a schedule…", "remind me…", "set up a
timetable…") is intentionally left to the OS layer via a classifier guard. A
conversational message returns `handled: false` so the CEO answers normally.

When the controller pauses for a decision it **persists** a `pending_decisions`
row and returns it on the reply:

- `pending_decision`: `{"id": "...", "question": "...", "options": [...]}` —
  render the options as buttons; sending one as the next chat message resumes
  the workflow from its checkpoint (it never restarts). The client may also
  fetch the open list with `GET /chat/pending` (below).
- `mission_id` / `report_id` / `project_id`: the artifact(s) the controller
  created (a mission is usually started immediately, with its first cycle
  enqueued).
- `checkpoints`: workflow progress markers (research done, project ready,
  mission live, …).

The controller **never 500s**: any failure is logged and the chat degrades to
`handled: false` (conversational brain). In customer context
(`customer:<name>`) auto-created projects/missions are scoped to that client.

### `GET /chat/pending`

Auth required. Returns the open business questions awaiting an answer:

```json
[{"id": "...", "session_id": "...", "question": "Where should I send the results?",
  "options": ["Here in TREEtiti", "Email", "Telegram", "Slack"],
  "created_at": "2026-08-19T09:48:27Z"}]
```

Answer by sending a chat message containing the chosen option to the same
session (the controller matches it against the open decision and resumes the
workflow). Decisions are `open` → `answered` (user picked) or `expired`.

`context` selects which CEO answers and what it knows:
- `""` / `"tree"` — TREEtiti CEO (TREEtiti brand memory).
- `"customer:<name>"` — Customer CEO for that client. The system prompt is
  built from `_customer_context_block(name)`: the client's missions
  (goal/status/workspace intel+plan/last cycle), company profile
  (`client_profiles`: business line/goal/dream customer/status) and latest
  lead (status/score/type). Degrades gracefully to just the client name if
  the DB is unavailable — the chat never breaks.

Broad full-team briefs (detected by `is_company_task`) are delegated to the
CEO on the background queue: the reply is an ack + `task_id`, the response
sets `company: true`, and in customer mode the client context block is
prepended to the CEO brief so the whole team works "on behalf of <client>".
Single-agent keyword routing injects the client block as `extra_context` when
the target agent's `run()` accepts it (checked via `inspect`).

### `GET /chat/sessions?context=`
→ list of the last 50 non-archived sessions as `{"id", "title", "context",
"project_id"}`. Pass `?context=tree` or `?context=customer:<name>` to scope to
one workspace (each workspace gets its own conversation list). Deleted
sessions (soft-deleted, `archived=true`) are excluded.

### `GET /chat/sessions/{id}`
→ `{"id", "title", "context", "project_id", "messages": [...]}` — full
transcript for restoring a conversation on the frontend after a refresh.

### `PATCH /chat/sessions/{id}/rename`
Body: `{"title": "..."}` → rename the session (OS command "rename this chat").

### `POST /chat/sessions/{id}/move`
Body: `{"project_id": "..."}` → attach the session to a project (OS command
"move this chat to <project>"). Returns the session with its `project_id`.

### `DELETE /chat/sessions/{id}`
→ soft-delete the session (sets `archived=true`; rows persist for audit).
Returns `{"deleted": true, "id": "..."}`.

### `GET /chat/history/search?q=&limit=`
→ semantic recall across **all** chat sessions. Returns the most relevant past
exchanges as `[{session_id, title, session_updated_at, excerpt, score}]`. Powers
the "Past conversations" panel on the Memory page and the `PAST CHAT SESSIONS`
block the chat brain uses to remember what was discussed anywhere.

## Memory

Categories: `voice`, `customers`, `services`, `design`, `wins`.

### `POST /memory`
Body: `{"category": "voice", "title": "...", "content": "..."}`
Stores text and its embedding (pgvector). → `{"id": "..."}`

### `GET /memory?q=...&category=...&limit=5`
Semantic search over brand memory; when brand hits are thin the response also
appends RAG chat memories (`kind: "rag"`). → `[{id, category, title, content,
score}]` plus optional RAG entries `[{kind, title, content, source, tag, score}]`.

### `GET /memory/categories`
→ `["voice","customers","services","design","wins"]`

### `GET /memory/kinds`
→ RAG memory kinds: `["fact","decision","goal","preference","conversation","rule","lesson"]`

### `DELETE /memory/{memory_id}`
→ delete one memory row (OS command "forget that"). Returns `{"deleted": true}`.

## Agents

Available (19-agent registry, all `implemented`): `ceo`, `strategist`,
`market_research`, `content_hunter`, `social_intel`, `content_strategist`,
`creative_director`, `brand`, `content`, `editor`, `image`, `video`,
`td_creative_director`, `td_asset_producer`, `video_producer`, `ugc_producer`,
`analytics`, `growth_optimizer`, `social_manager`.

### `GET /agents`
→ list of registry specs `{"key", "name", "role", "department", "phase",
"model_profile", "status", "skills", "capabilities"}`.

### `GET /agents/active`
→ only the actively schedulable agents.

### `POST /agents/run`
Body: `{"agent": "brand", "payload": {...}}`
→ `{"agent": "...", "run": {...}, "result": {...}}`. The `ceo` agent is a
dynamic supervisor: hand it a text brief and it resolves + runs the right
sub-team through the LangGraph orchestrator.

### `GET /agents/runs?limit=50`
Recent `AgentRun` records (newest first).

### `GET /agents/schedule?context=customer:<name>`
Scheduled autopilot jobs (archived jobs excluded; `context` scopes to a client).
Each row: `{id, name, agent, job_type, schedule_time, interval_minutes,
enabled, archived, client, project_id, last_run_at, payload}`.

### `POST /agents/schedule` (201)
Create a scheduled job. Body: `{"agent", "name", "job_type": "daily"|"interval",
"schedule_time": "09:00", "interval_minutes", "payload", "client",
"project_id"}`. Agent is validated against the registry.

### `PATCH /agents/schedule/{job_id}`
Toggle/enable a job: `{"enabled": true|false}` (also `job_type`,
`schedule_time`, `interval_minutes`, `payload`, `name`).

### `POST /agents/schedule/{job_id}/duplicate`
Copy a job — same agent/config/time, new row named `"<name> (copy)"`,
starts **disabled**.

### `DELETE /agents/schedule/{job_id}`
Soft-archive a job (`archived=true`, `enabled=false`) — hidden from list.
→ `{"archived": job_id}`.

### `POST /agents/schedule/{job_id}/restore`
Un-archive a job (back in the list, still disabled until re-enabled).

### `POST /agents/run-now/{job_id}`
Manually trigger a scheduled job in the background.

## Projects

### `GET /projects`
List projects. → `[{id, name, client, description, status, created_at}]`

### `POST /projects`
Body: `{"name": "...", "client": "...", "description": "..."}` → new project.

### `GET /projects/{project_id}` · `PATCH /projects/{project_id}` · `DELETE /projects/{project_id}`
Read / update (name, client, description, status) / delete.

## Assets (media production)

### `GET /assets?kind=...&creator_agent=...`
List produced media assets.

### `POST /assets`
Record an asset manually. Body: `{"kind": "image", "title", "creator_agent",
"model", "prompt", "url", "project_id"}`.

### `POST /assets/generate`
Dispatch a producer by kind. Body:
`{"kind": "image|video|audio|3d", "prompt": "...", "title?", "creator_agent?",
"project_id?"}`. Persists a `MediaAsset` row and returns it with a `produced`
detail dict. Producers degrade to `{"status": "spec_only" | "failed"}` rather
than raising when no provider is live (e.g. 3D is spec-only without a key).

### `GET /assets/{asset_id}` · `DELETE /assets/{asset_id}`

## Campaigns

### `GET /campaigns`
List campaigns → `[{id, title, objective, target_audience, strategy,
message_house, status, created_at}]`

### `POST /campaigns`
Body: `{"title", "objective", "target_audience", "strategy"}`.

### `GET /campaigns/{campaign_id}` · `PATCH /campaigns/{campaign_id}` · `DELETE /campaigns/{campaign_id}`

## Approvals (human-in-the-loop gate)

### `GET /approvals?status=...`
List approval requests (`pending` | `approved` | `rejected`).

### `POST /approvals`
Body: `{"kind", "title", "summary", "payload", "requested_by"}`.

### `GET /approvals/{approval_id}`
Single request.

### `POST /approvals/{approval_id}/decide`
Body: `{"decision": "approve"|"reject", "note": "..."}`. Records `reviewed_by`
(the authenticated user's email) and `reviewed_at`.

## Providers (9Router gateway)

### `GET /providers`
Catalog of configured providers: `[{prefix, name, capabilities, cost_tier,
enabled, key_configured, base_url, notes}]`.

### `GET /providers/models`
Flat model list served through the gateway.

### `GET /providers/health?force=`
Cached probe (≈30s TTL) of one model per provider → `{gateway, checked_at,
results: [{model, status, latency_ms, error}]}`.

### `POST /providers/health/probe`
Force a fresh probe.

### `GET /providers/usage`
Today's request counts per provider → `{date, usage: [{provider, requests,
daily_limit}]}`.

## Tasks + event stream (SSE)

### `POST /tasks` (201)
Enqueue a background task. Body: `{"kind": "research"|"content"|"image"|
"video"|"analytics"|"ceo"|"langgraph"|"media_image"|"media_video"|...,
"label": "...", "payload": {...}}`
→ `{task_id, kind, label, status}`. `langgraph` runs the full agent DAG.
`media_image`/`media_video` produce a real asset via the media services
(`produce_image`/`produce_video`) and persist a `media_assets` row; both are
registered as default queue runners alongside `echo`/`workflow`/`langgraph`/
`agent`.

### `GET /tasks?status=...&limit=...`
List tasks → `{tasks: [{id, kind, label, status, ...}]}`.

### `GET /tasks/{task_id}`
Task detail incl. its stored events.

### `GET /tasks/{task_id}/events`
SSE stream for one task's events.

### `POST /tasks/{task_id}/cancel`
Cancel a queued or running task (`TaskQueue.cancel`): the worker marks it
`cancelled` (if still queued/running) and emits a `task.cancelled` event.
→ `{"task_id": ..., "status": "cancelled"}`.

### `POST /tasks/{task_id}/retry`
Re-run a finished (`completed`/`failed`/`cancelled`) task as a fresh one.
→ `{"task_id", "kind", "label", "status": "queued", "retried_from": task_id}`.

### `POST /tasks/{task_id}/reassign`
Give a finished task to a different agent (re-runs it). Body: `{"agent": "..."}`
(validated against the registry). → `{"task_id", "kind", "label", "status",
"reassigned_to", "retried_from"}`.

### `GET /stream` (auth)
Global SSE stream of agent/task events. Frames are `data: {type, source,
payload, correlation_id, created_at}` separated by blank lines. The frontend
consumes this with a `fetch` + `ReadableStream` reader (the endpoint requires
an `Authorization` header, which browser `EventSource` cannot send).

## Daily report (for n8n)

## Content

### `GET /content?status=...&platform=...&limit=50`
List generated content. Statuses: `draft`, `pending_approval`, `approved`,
`published`, `rejected`.

### `GET /content/{item_id}`
Single item (full body).

### `PATCH /content/{item_id}/status`
Body: `{"status": "approved"}`. The n8n Telegram approval workflow calls this.

## Leads

### `POST /leads`
Public webhook for n8n / forms. Body: `{"name","email","company","message","phone"}`.
Automatically runs the Sales Agent → returns the scored lead.

### `GET /leads?status=...&limit=50`
List leads (auth).

### `PATCH /leads/{lead_id}/status?status=won`
Update lead status: `new | contacted | qualified | won | lost`.

## Webhooks (Telegram, email + publishing)

### `POST /webhooks/telegram`
Telegram Bot webhook. Set it as the bot's webhook URL (e.g. via
`https://api.telegram.org/bot<TOKEN>/setWebhook`). Body is a Telegram
`Update` object. Non-text updates are ignored; text messages are answered
with the AI brain (brand-aware, uses memory) and stored as a `telegram`
chat session. If `TELEGRAM_WEBHOOK_SECRET` is set, verify the
`X-Telegram-Bot-Api-Secret-Token` header.

Response: `{"handled": true, "reply": "…"}` (or `{"handled": false, "reason": "…"}`).

### `POST /webhooks/notify`
Send a brand-style **email notification** (used by all n8n workflows instead of
Telegram — works on networks where `api.telegram.org` is unreachable).
Body:
```json
{
  "subject": "[TREEtiti] New lead — Jane",
  "title": "New lead captured",
  "rows": [["Name", "Jane"], ["Email", "jane@x.com"], ["Score", "88"]]
}
```
Requires SMTP config (see INSTALL.md). Response: `{"sent": true, "to": "…"}`.
Returns `400` when SMTP is not configured.

### `POST /webhooks/publish/{content_id}`
Publish an approved content item to a channel. Body: `{"channel": "telegram"}`
or `{"channel": "email"}`. The item must be `approved` (set via
`PATCH /content/{id}/status?status=approved`). `telegram` sends via the bot;
`email` sends a styled email to `EMAIL_TO`. Either marks it `published`.

Response: `{"channel": "…", "published": true}`.

## Daily report (for n8n)

Called internally by the Daily Report workflow. Exposed via the analytics agent:
`POST /agents/run {"agent": "analytics", "payload": {"report_data": {...}}}`.

## Missions (autonomous per-client workspaces)

The unit of autonomy: one mission = one client the OS keeps alive in the
background. Missions run on a schedule (daily observe/analyze, weekly full
cycle through the CEO's 10-agent / 14-stage LangGraph DAG).

### `GET /missions?status=active`
List missions (optionally filtered by `active | paused | archived`). Each row
carries `workspace` (progressive reveal: `intel → analytics → plan → content
→ assets → results`) and next-run timestamps.

### `POST /missions` (201)
Create a persistent client mission. Body:
```json
{
  "name": "Luxury Penthouse Launch",
  "client": "Marina Tower",
  "goal": "Position the penthouse collection...",
  "cadence": "daily",
  "daily_time": "08:30",
  "weekly_day": "monday",
  "config": {"competitors": [...], "audience": "...", "platforms": ["linkedin"]}
}
```
Newly created active missions auto-run a daily cycle on the next scheduler tick.

### `GET /missions/{id}`
Fetch one mission + its workspace.

### `PATCH /missions/{id}`
Update `name`/`goal`/`cadence`/`daily_time`/`weekly_day`/`status`/`config`.

### `POST /missions/{id}/start` · `POST /missions/{id}/pause`
Resume / pause autonomy (no new scheduled cycles while paused).

### `POST /missions/{id}/run`
Run a cycle NOW on the background queue. Body: `{"cycle": "daily"|"weekly"}`
→ `{"mission_id", "cycle", "task_id"}`. The office animates the run live.

### `POST /missions/{id}/talk`
Send a steering instruction (§15); the next cycle honors it. Body: `{"instruction": "..."}`.

### `POST /missions/{id}/duplicate`
Copy a mission — same goal/cadence/config, name `"<name> (copy)"`, workspace
reveal reset, starts **paused** so the user can tweak before relaunching.

### `GET /missions/{id}/runs?limit=50`
Cycle audit trail (`MissionRun` rows with `cycle_type`, `status`, `task_id`).

## Clients (per-client workspace hub)

Aggregates every client the OS is working for into one status card, joining
missions, directory dossiers, leads and pending approvals.

### `GET /clients`
→ list of client cards:
`{name, missions, mission_count, active_missions, paused_missions, directory,
lead, pending_approvals, workspace_revealed, content_count, last_cycle,
last_cycle_status, last_run_at}`. Sorted by most recent run.

### `GET /clients/{name}`
One client's full card (404 if the client has neither missions nor a directory profile).

## Templates (executable blueprints, Phase 3)

A template is a real blueprint: installing it creates actual OS objects — a
configured `Mission` (with `source_template` set), recurring `ScheduledJob`s
(agent autopilot jobs) and optionally a `Project`. Installs are tracked so the
catalog can report installed state and uninstall can archive everything a
template created for a client.

### `GET /templates?context=customer:<name>`
Catalog of 12 templates: `{id, name, category, description, source, license,
security, deps, capabilities, quality, version, brief, installed}` where
`installed` = non-archived missions created by that template for the context
client (0 when no client). → `{templates: [...], context}`.

### `POST /templates/{template_id}/install`
Body: `{"client": "..."}`. Really installs the template for that client:
creates the mission (active, configured, `source_template` set), the recurring
schedules (payload tagged `template_id` + `mission_id`; unknown agents skipped),
and the optional project. → `{template_id, client, mission, schedules, project}`.

### `POST /templates/{template_id}/uninstall`
Body: `{"client": "..."}`. Soft-archives every mission (`status=archived`) and
schedule (`archived=true, enabled=false`) created by that template for that
client. → `{template_id, client, missions_archived, schedules_archived}`.

## Deep Research (Phase 4)

A real multi-source research pipeline (`app/research.py`): DISCOVERY runs web /
news / Reddit / YouTube searches in parallel, EXTRACTION fetches the top unique
pages, SYNTHESIS builds a source-grounded report with the LLM (falling back to a
deterministic template synthesis when the provider is unreachable — the report
always exists and always carries its sources).

### `GET /research?context=customer:<name>`
Client-scoped history. → `{reports: [...], context}`.

### `POST /research`
Body: `{"topic": "...", "context": "customer:<name>", "depth": "quick|deep"}`.
Runs the full pipeline synchronously and persists a `ResearchReport`. → the
report: `{id, client, topic, depth, status, summary, findings, insights,
recommendations, sources, report_md, meta, created_at}`. Each finding carries
`claim`, `source`, `confidence` (high/medium/low) and `type`
(fact/inference/opinion); `meta.synthesis` = `llm` or `template`.

### `GET /research/{id}`
One full report. 404 if unknown.

### `DELETE /research/{id}`
Removes the report. → `{deleted}`.

## API Connectors (Phase 5)

Service connectors (`app/connectors.py`) — external APIs the OS talks to. The
catalog auto-seeds 9 connectors (`telegram, whatsapp, vk, linkedin, instagram,
google, n8n, webhook, supabase`) on first read. Every connector carries
`id, name, category, description, capabilities, configured, config_keys,
last_status (missing|configured|ok|error), last_error, last_checked_at`. Probes
never fake success: unreachable services report `error` with the real message.

### `GET /connectors`
The seeded catalog (DB-backed). → `{connectors: [...]}`.

### `POST /connectors/{connector_id}/configure`
Body: `{"config": {"bot_token": "...", ...}}` — keys are the catalog's
`config_keys`. Marks `configured=True`, status `configured`. 404 unknown
connector.

### `POST /connectors/{connector_id}/test`
Runs a connectivity probe (telegram → live `getMe`; others → configured-state).
Updates `last_status`/`last_error`/`last_checked_at`. 404 unknown.

## MCP Servers (Phase 5)

Model Context Protocol servers (`app/mcp.py`) — the agent tool layer. Transport
is `stdio` (local command) or `sse`/`http` (remote URL). Each server carries
`id, name, transport, command, args, url, tools, status
(registered|reachable|unreachable), last_error, last_checked_at`.

### `GET /mcp`
Registered servers. → `{servers: [...]}`.

### `POST /mcp`
Body: `{"name", "transport", "command", "args", "url", "tools"}`. Validation:
`stdio` requires `command`; `sse`/`http` require `url`; unsupported transport →
400. → `{server}`.

### `POST /mcp/{server_id}/probe`
Connectivity probe (stdio → binary present on PATH; sse/http → URL set).
Updates `status`. 404 unknown.

### `DELETE /mcp/{server_id}`
Unregisters. → `{deleted}`. 404 unknown.
