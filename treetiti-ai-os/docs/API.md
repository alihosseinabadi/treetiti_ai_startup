# API Reference

Base URL: `http://localhost:8000/api/v1`

Auth: `Authorization: Bearer <token>` (except `/auth/login` and `/health`).

Interactive docs (Swagger): http://localhost:8000/docs

## System

### `GET /health`
Public. Returns `{"status":"ok","app":"Treetiti AI Marketing OS"}`.

## Auth

### `POST /auth/login`
Body: `{"email": "...", "password": "..."}`
→ `{"access_token": "...", "token_type": "bearer", "role": "admin"}`

### `GET /auth/me`
→ `{"email": "...", "role": "admin"}`

## Chat (AI Brain)

### `POST /chat`
Body: `{"message": "...", "session_id": null}`
→ `{"session_id": "...", "reply": "..."}`

The brain answers using brand memory (semantic recall). Omit `session_id` to
start a new conversation.

### `GET /chat/sessions`
→ list of `{"id", "title"}` for the last 50 sessions.

## Memory

Categories: `voice`, `customers`, `services`, `design`, `wins`.

### `POST /memory`
Body: `{"category": "voice", "title": "...", "content": "..."}`
Stores text and its embedding (pgvector). → `{"id": "..."}`

### `GET /memory?q=...&category=...&limit=5`
Semantic search over brand memory. → `[{id, category, title, content, score}]`

### `GET /memory/categories`
→ `["voice","customers","services","design","wins"]`

## Agents

Available: `brand`, `market_research`, `content`, `video`, `image`, `sales`, `analytics`.

### `GET /agents`
→ list of `{"name", "role"}`.

### `POST /agents/run`
Body: `{"agent": "sales", "payload": {...}}`
Payload keys depend on the agent:

| Agent | Payload |
|-------|---------|
| `brand` | `{content, platform?}` |
| `market_research` | `{extra_context?}` |
| `content` | `{opportunity?, platform?, count?, approve?}` |
| `video` | `{topic?}` |
| `image` | `{idea, style?}` |
| `sales` | `{lead: {name?, email, company?, message?, phone?}}` |
| `analytics` | `{report_data: {...}}` |

→ `{"agent": "...", "result": {...}}`

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
  "subject": "[Treetiti] New lead — Jane",
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
