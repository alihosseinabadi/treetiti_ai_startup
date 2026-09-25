# Treetiti AI Marketing OS

A **free, self-hosted, open-source AI Marketing Employee** for Treetiti.
Seven AI agents run on your own hardware, powered by your existing **opencode**
runtime (no paid LLM APIs), backed by **PostgreSQL + pgvector** memory, and
automated by **n8n**.

> Premium, futuristic, minimal — like Apple, Linear and Stripe. That is the
> brand voice every agent enforces.

---

## What it does

- **AI Brain** — a chat interface that answers with full brand memory.
- **7 AI employees** that create, review, direct and sell for you:
  1. **Brand Intelligence** — guards brand consistency on every output.
  2. **Market Research** — daily AI-industry trends → content opportunities.
  3. **Content Creation** — LinkedIn / Instagram / TikTok / blog pieces.
  4. **Video Director** — cinematic shot-by-shot AI video concepts.
  5. **Image Generation** — FLUX/ComfyUI-ready image prompts.
  6. **Sales** — scores leads 0-100, picks a package, drafts the reply.
  7. **Analytics** — turns raw numbers into a daily report.
- **Long-term memory** — PostgreSQL + pgvector semantic recall.
- **Telegram AI responder** — a webhook that answers brand-aware and stores the chat.
- **One-click publish** — push approved content straight to Telegram.
- **n8n automation** — daily content, Telegram approvals, lead management, daily report.
- **REST API + dashboard** — everything is controllable via API or the built-in React dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React dashboard  ──────── REST /api/v1  ───┐               │
├──────────────────────────────────────────────┼──────────────┤
│  FastAPI backend (app/)                      │              │
│    ├─ routers/  chat · auth · memory ·       │  n8n          │
│    │            agents · content · leads     │  workflows    │
│    │            webhooks (Telegram)          │  (schedules)  │
│    ├─ agents/   7 AI employees               │               │
│    ├─ memory/   pgvector semantic store      │               │
│    ├─ services/ social (Telegram)            │               │
│    └─ llm.py    brain provider               │               │
│                    │                         │               │
│              opencode CLI ──────────────────►│  ollama       │
│              (free, default)                 │  (fallback)   │
├──────────────────────────────────────────────┼──────────────┤
│  PostgreSQL + pgvector (database/)           │              │
└──────────────────────────────────────────────┴──────────────┘
```

### Brain providers (free)

| Provider  | Default | Cost  | Notes                                        |
|-----------|---------|-------|----------------------------------------------|
| `opencode` | yes     | free  | Uses your existing opencode runtime + models  |
| `ollama`  | no      | free  | Fully local fallback (`deepseek-r1:7b`, `qwen3:8b`) |

## Project layout

```
treetiti-ai-os/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint
│   │   ├── config.py          # settings (.env)
│   │   ├── database.py        # SQLAlchemy + pgvector
│   │   ├── models.py          # ORM schema
│   │   ├── auth.py            # JWT + roles
│   │   ├── llm.py             # brain provider (opencode / ollama)
│   │   ├── agents/            # the 7 AI employees
│   │   ├── memory/            # semantic brand/content memory
│   │   ├── routers/           # REST endpoints (incl. Telegram webhooks)
│   │   └── services/          # daily report + social (Telegram) service
│   ├── tests/                 # pytest suite (no DB/network needed)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  # React + TS + Tailwind dashboard (Phase 5)
├── n8n/workflows/             # 4 automation workflows
├── database/                  # init.sh + schema.sql
├── docs/                      # API docs, install guide, DB schema
├── docker-compose.yml
└── README.md
```

## Quick start

Requirements: Docker, and the `opencode` CLI on your PATH (or Ollama).

```bash
# 1. Configure
cp backend/.env.example backend/.env
#    edit backend/.env — set ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET

# 2. Run the stack (PostgreSQL+pgvector, backend+n8n dashboard, n8n)
docker compose up -d --build

# 3. Check health
curl http://localhost:8000/health

# 4. Open the dashboard
open http://localhost:8000        # SPA is served by the backend
open http://localhost:5678        # n8n

# 5. Login → get a token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@treetiti.ai","password":"CHANGE_ME"}'
```

Without Docker (local dev):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# start PostgreSQL with pgvector (port 5432), then:
.venv/bin/uvicorn app.main:app --reload --port 8000
```

See `docs/` for the full install guide, API reference and DB schema.

## Roadmap / phase status

| Phase | What                              | Status        |
|-------|-----------------------------------|---------------|
| 1     | AI Brain + chat API + auth        | ✅ done, tested |
| 2     | pgvector memory                   | ✅ done, tested |
| 3     | 7 marketing agents                | ✅ done, tested |
| 4     | n8n workflows                     | ✅ 4 active — daily content, daily report, lead mgmt, content approval |
| 5     | React dashboard                   | ✅ done, built, served by backend |
| 6     | Social integrations (Telegram)    | ✅ done, tested (webhooks + publish) |
| 7     | Email notifications               | ✅ done, tested — n8n notifies via email (works where Telegram is blocked) |

## License

Self-hosted, open source. All components are free: FastAPI, SQLAlchemy,
PostgreSQL/pgvector, n8n, React, and your own opencode runtime.
