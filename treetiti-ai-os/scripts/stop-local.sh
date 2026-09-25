#!/usr/bin/env bash
# Stop the local dev stack started by start-local.sh
set -euo pipefail

echo "→ Stopping backend…"
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "  stopped" || echo "  not running"

echo "→ Stopping n8n…"
if docker ps --format '{{.Names}}' | grep -qx treetiti-n8n; then
  docker rm -f treetiti-n8n >/dev/null && echo "  stopped"
else
  echo "  not running"
fi

echo "Done."
