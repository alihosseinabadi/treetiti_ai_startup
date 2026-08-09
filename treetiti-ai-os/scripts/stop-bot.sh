#!/usr/bin/env bash
# TREEtiti AI Marketing OS — stop backend + cloudflared tunnel started by run-bot.sh
set -euo pipefail

echo "→ stopping backend…"
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "  backend stopped" || echo "  backend not running"
echo "→ stopping tunnel…"
pkill -f "cloudflared tunnel --url" 2>/dev/null && echo "  tunnel stopped" || echo "  tunnel not running"
echo "Done."