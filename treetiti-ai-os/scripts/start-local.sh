#!/usr/bin/env bash
# TREEtiti AI Marketing OS — local dev launcher (uvicorn + n8n container).
# Usage: ./scripts/start-local.sh
#   - Starts the backend (uvicorn on :8000) using backend/.env
#   - Starts n8n (Docker container on :5678) with a long-lived API token
#     so the built-in workflows can call the backend.
# Stop with: ./scripts/stop-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
LOG="/tmp/treetiti-backend.log"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy backend/.env.example and set values first."
  exit 1
fi

echo "→ Generating a long-lived API token for n8n…"
TOKEN="$(cd "$ROOT/backend" && .venv/bin/python3 - <<'EOF'
from app.config import get_settings
from app.auth import create_access_token
from app.database import SessionLocal
from app.models import User
s = get_settings()
with SessionLocal() as db:
    u = db.query(User).filter(User.email == s.admin_email).first()
    if u is None:
        raise SystemExit("admin user not found — start the backend once to bootstrap it")
    print(create_access_token(u.email, u.role))
EOF
)"

echo "→ Starting backend on :8000 …"
if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
  echo "  backend already running, skipping."
else
  (cd "$ROOT/backend" && nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "$LOG" 2>&1 &)
  sleep 4
fi
curl -sf http://127.0.0.1:8000/health >/dev/null && echo "  backend healthy ✓" || { echo "  backend failed to start — see $LOG"; exit 1; }

echo "→ Starting n8n on :5678 …"
if docker ps --format '{{.Names}}' | grep -qx treetiti-n8n; then
  echo "  n8n already running, skipping."
else
  docker run -d --name treetiti-n8n \
    -p 5678:5678 \
    -e API_TOKEN="$TOKEN" \
    -e TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2)" \
    -e N8N_HOST=localhost -e N8N_PORT=5678 -e N8N_PROTOCOL=http \
    -e N8N_DIAGNOSTICS_ENABLED=false -e DB_TYPE=sqlite \
    -v treetiti_n8n:/home/node/.n8n \
    -v "$ROOT/n8n/workflows:/home/node/workflows" \
    n8nio/n8n:latest >/dev/null
  sleep 12
fi
curl -sf -o /dev/null http://127.0.0.1:5678/ && echo "  n8n healthy ✓"

echo
echo "Everything up:"
echo "  Dashboard + API  http://localhost:8000"
echo "  n8n              http://localhost:5678"
