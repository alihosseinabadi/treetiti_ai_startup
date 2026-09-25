# Run the real OS backend (no docker needed)

```bash
cd treetiti-ai-os/backend
python -m pip install -r requirements.txt   # psycopg optional (postgres only)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- Local `.env` (gitignored) boots SQLite `treetiti_local.db`, seeds admin
  `admin@treetiti.com / admin123`, seeds brand brain. Postgres is still the
  production path: set `DATABASE_URL=postgresql+psycopg://...` and it uses it
  (auto-detected, pgvector active).
- No LLM brain reachable? Chat + leads + orchestrator still answer honestly in
  OFFLINE mode (brand memory shown, nothing invented). Add a brain via:
  opencode CLI on PATH, `LLM_PROVIDER=ollama`, or GOOGLE/GROQ/OPENROUTER key.
- API docs: http://localhost:8000/docs — login → Authorize → every click works.
- Verified 2026-09-22: 21/21 click-tests green (see `click_test.py`).
