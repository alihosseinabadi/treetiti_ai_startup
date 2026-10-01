# TREEtiti — AI Marketing OS

Monorepo for the TREEtiti AI product line: a cinematic marketing site plus a
self-hosted, free-models-only AI agency backend.

## Structure

| Path | What it is |
|---|---|
| `treetiti/` | React 19 + Vite + Tailwind 4 marketing site (cinematic scenes, Supabase CRM admin, i18n: en/fa/ru/ar/tr) |
| `treetiti-ai-os/` | The AI OS: FastAPI backend (agents, model router, pgvector memory, scheduler), React dashboard, n8n workflows, docker-compose |
| `customer_treetiti/` | Customer Service Directory blueprint (spec document) |
| `treetiti_partners/findii/` | FindII — AI real-estate lead agent (Avito + Telegram + OSM map-grounded scoring, web CRM) |

## Architecture

```
                        ┌─────────────────────────────────┐
                        │  Clients: dashboard (:8091/os)  │
                        │  Vite landing (treetiti/)       │
                        │  Telegram / n8n / lead forms    │
                        └───────────────┬─────────────────┘
                                        │ JWT / HMAC / secret_token
                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI backend (treetiti-ai-os/backend)   default-deny + roles │
│  routers/ → agents · orchestrator · chat · approvals · assets …  │
│  core/ → registry · queue · workflow · events · qa · permissions  │
│  services/ → media · mail · social · connect                     │
└───────┬──────────────────────────┬───────────────┬───────────────┘
        │ SQLAlchemy                 │ Trail         │ Keys (free tiers)
        ▼                            ▼               ▼
┌───────────────┐            treetiti.audit   model_router (FREE_ONLY)
│ Postgres +    │            (security log)          │
│ pgvector  /   │                                     ▼
│ SQLite (dev)  │                          opencode · ollama · groq …
└───────────────┘                          groq/openrouter/zai/cf …
```

Security model: `treetiti-ai-os/docs/SECURITY.md`. Tenant isolation,
event bus and connector framework land in Phases 1–3.

## Backend quickstart (`treetiti-ai-os/backend`)

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in your values
uvicorn app.main:app --reload
```

- Database: PostgreSQL + pgvector by default (`docker-compose.yml` in
  `treetiti-ai-os/` starts backend + postgres + n8n + optional ollama).
- SQLite works for light local testing: `DATABASE_URL=sqlite:///./treetiti_dev.db`.

## Tests

```bash
cd treetiti-ai-os/backend
python -m pytest -q
```

CI runs the same suite on every push — see
`.github/workflows/backend-tests.yml`.

## Security notes

- `WEBHOOK_SHARED_SECRET` — when set, public state-changing endpoints
  (`POST /leads`, `POST /webhooks/publish`, `POST /webhooks/notify`) require
  the `X-Webhook-Secret` header. **Set it in production.**
- Never commit `.env` (gitignored); rotate any credential that was ever
  committed in history.
