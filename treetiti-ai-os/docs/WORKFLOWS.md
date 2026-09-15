# n8n Workflows

Import these from the n8n UI: **Workflows → Import from file**
(`n8n/workflows/*.json`). Set these environment variables in n8n (Settings →
Environment variables) before activating:

| Variable | Value |
|----------|-------|
| `API_TOKEN` | a JWT from `POST /api/v1/auth/login` |
| `TELEGRAM_CHAT_ID` | your Telegram chat id |
| (Telegram nodes use your bot token via n8n credentials) |

## 1. Daily Content — 08:00 (`daily-content.json`)

1. Runs **Market Research Agent** (`market_research`, finds today's AI trend + content angle).
2. Runs **Content Creation Agent** (`content`) for LinkedIn (validated by **Brand Agent** `brand`).
3. Sends the result to Telegram for approval.

## 2. Telegram Approval Buttons (`telegram-approval.json`)

Listens for inline-button callbacks (`approve:<content_id>` / `reject:<content_id>`)
and updates the content status via `PATCH /api/v1/content/{id}/status`.

To attach the buttons, set the **Notify Telegram** node in workflow 1 to send
an inline keyboard with buttons whose `callback_data` is
`approve:{{ $json.result[0].id }}` and `reject:{{ $json.result[0].id }}`.

## 3. Lead Management (`lead-management.json`)

- Webhook path: `treetiti-lead`
- Forwards form submissions to `POST /api/v1/leads`, which runs the **Sales
  Agent** (score + package + reply), then notifies Telegram.

## 4. Daily Report — 18:00 (`daily-report.json`)

Runs the **Analytics Agent** on the day's data and sends the report to Telegram.

---

## Agent pipelines (in-app, no n8n needed)

### LangGraph full-team DAG

`POST /api/v1/tasks` with `{"kind": "langgraph", "label": "...", "payload":
{"brief": "...", "run_all": true}}` runs the canonical agency DAG:

```
research → analytics ∥ strategy → editorial ∥ creative → content
```

stages map to agents via `STAGE_TO_AGENT` (`market_research`, `analytics`,
`strategist`, `content_strategist`, `creative_director`, `content`). The
orchestrator prunes stages whose agents are not implemented and never runs an
empty graph.

### CEO dynamic delegation

`POST /api/v1/agents/run` with `{"agent": "ceo", "payload": {"brief":
"<text>"}}` lets the CEO agent resolve the team from the registry and delegate
the brief to the right sub-agents.

### ONE CHAT → CEO → live office stream

`POST /api/v1/chat` with a broad company brief is detected by the dispatcher
(`is_company_task`) and enqueued as a background `agent` task
(`payload: {"agent": "ceo", "kwargs": {"brief": "<text>"}}`). The chat returns an
immediate ack with `company: true` and the background `task_id` (LLM calls take
~30s/agent). The queue's `agent_runner` threads `task_id` into the CEO's
`run()` so the CEO can tag every per-stage progress event with it. Events flow
over the global SSE `/api/v1/stream` as `agent.started` / `agent.completed` /
`agent.failed` with `payload.agent` = the stage's agent key (via `STAGE_TO_AGENT`)
and `payload.task_id` = the mission id. The frontend office groups live team
activity under that mission id.

### Human-in-the-loop approval gate

Producers (content, campaigns, assets) can raise an approval via
`POST /api/v1/approvals`. A human approves/rejects through
`POST /api/v1/approvals/{id}/decide`; the decider's email is recorded as
`reviewed_by`. All 19 agents are `implemented`; the 4 legacy agents
(`sales`, `developer`, `campaign`, `seo`) remain registered but are outside
the 19-agent matrix.

### QA return loop (§44)

The `qa` stage maps to the **Editor Agent** (veto power). Rejected content does
not dead-end: the CEO's QA runner routes it back to the **Content Agent** with
the editor's `revision_notes` (and the previous draft), re-QAs, and repeats up
to `MAX_QA_ATTEMPTS = 3`. The editor keeps final veto — after the last attempt
the rejection stands and the pipeline never publishes.

Events: a rejection emits `agent.failed` for `editor` with
`payload.revision_notes` (the office shows "QA rejected — returning to content
for revision"), then `agent.started`/`agent.completed` for a `content` "revision
after QA reject" pass. The QA stage result carries `{status: approved|rejected,
attempts, revision_notes, content}`.

### Missions + clients

`POST /api/v1/missions` creates a persistent per-client workspace. The scheduler
auto-enqueues daily (content_hunter → social_intel → analytics) and weekly (CEO
10-agent / 14-stage LangGraph) cycles; daily cycles also emit `agent.*` events so
the office animates. `GET /api/v1/clients` aggregates every client's missions,
directory dossier, lead and pending approvals into one status card.

---

> The backend must be reachable from n8n at `http://localhost:8000`. If the two
> run on different hosts, replace the URLs in the HTTP Request nodes.
