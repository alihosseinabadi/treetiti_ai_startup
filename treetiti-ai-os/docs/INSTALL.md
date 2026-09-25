# Install Guide

## Prerequisites

- Docker + Docker Compose (recommended path)
- Python 3.12 (manual path)
- The `opencode` CLI on your PATH — **or** a running Ollama server
- PostgreSQL with pgvector (only for the manual path; Docker provides it)

### Brain: opencode (default, free)

The brain shells out to your existing `opencode` runtime:

```bash
# verify it is available
opencode --version
opencode run --model opencode/deepseek-v4-flash-free "Reply with: OK"
```

Set in `backend/.env`:

```ini
LLM_PROVIDER=opencode
OPENCODE_MODEL=opencode/deepseek-v4-flash-free
```

> Any model your opencode config supports works — just change `OPENCODE_MODEL`.

### Telegram (optional — Phase 6)

```ini
TELEGRAM_BOT_TOKEN=123456:ABC...      # from @BotFather
TELEGRAM_CHAT_ID=123456789            # chat/group to publish approved content to
TELEGRAM_WEBHOOK_SECRET=              # optional shared secret for webhook auth
PUBLIC_BASE_URL=http://localhost:8000 # used to build the webhook URL
```

Without these, the Telegram webhook and publish endpoints return clear
errors and the rest of the app keeps working.

> **Region note (Russia / Iran / filtered networks):** if `api.telegram.org`
> is unreachable from your machine, route Telegram traffic through your VPN
> or a mirror. Set the proxy and it is used automatically:
>
> ```ini
> TELEGRAM_PROXY=http://127.0.0.1:7890   # your VPN/proxy HTTP port
> TELEGRAM_API_BASE_URL=https://api.telegram.org  # or a Telegram API mirror
> ```
>
> Without a proxy the bot simply cannot deliver messages from a filtered
> network — everything else (dashboard, agents, memory, n8n) is unaffected.

### Email notifications (Telegram-free — recommended on filtered networks)

The n8n workflows notify you by **email** via `POST /webhooks/notify`, so they
work even where Telegram is unreachable. Works with any SMTP provider. Yandex
is a good choice in Russia (no VPN needed):

```ini
SMTP_HOST=smtp.yandex.com
SMTP_PORT=587
SMTP_USERNAME=your.yandex.login@yandex.com
SMTP_PASSWORD=your-app-password   # NOT your login password — generate one:
EMAIL_FROM=Treetiti AI <you@yandex.com>
EMAIL_TO=you@yandex.com
```

For Yandex, an **app password** is required for SMTP (your login password is
rejected): https://id.yandex.com/security/app-passwords → create one for Mail.
Gmail works the same way but `smtp.gmail.com:587` is unreachable from Russia.

You can verify delivery without a provider by pointing SMTP_HOST at a local
debug server: `SMTP_HOST=127.0.0.1 SMTP_PORT=2525` with no username/password.

### Brain: Ollama (fallback, free)

```bash
ollama pull deepseek-r1:7b
ollama pull qwen3:8b
ollama pull nomic-embed-text   # for vector embeddings
```

```ini
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:7b
OLLAMA_FALLBACK_MODEL=qwen3:8b
```

---

## Option A — Docker (recommended)

```bash
cp backend/.env.example backend/.env
# edit backend/.env (ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET)

docker compose up -d --build
```

- Backend API + Swagger UI: http://localhost:8000/docs
- n8n: http://localhost:5678
- PostgreSQL: localhost:5433 (5432 is often taken by an existing Postgres)

## Option B — Manual / local dev

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env

# start Postgres with pgvector (e.g.):
#   docker run -d --name treetiti-db \
#     -e POSTGRES_USER=treetiti -e POSTGRES_PASSWORD=treetiti \
#     -e POSTGRES_DB=treetiti_ai_os -p 5432:5432 pgvector/pgvector:pg16

# start the API
.venv/bin/uvicorn app.main:app --reload --port 8000
```

The API creates the schema and the default admin on first startup.

---

## First run

1. `GET /health` → `{"status":"ok",...}`
2. `POST /api/v1/auth/login` with your admin credentials → `access_token`
3. Use `Authorization: Bearer <token>` for every other endpoint.
4. Store your first brand memory:
   `POST /api/v1/memory` with `{category, title, content}`.
5. Chat with the brain: `POST /api/v1/chat`.
6. Run an agent: `POST /api/v1/agents/run` with `{agent, payload}`.

See [API.md](API.md) for every endpoint.
