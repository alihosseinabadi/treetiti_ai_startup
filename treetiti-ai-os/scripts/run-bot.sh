#!/usr/bin/env bash
# TREEtiti AI Marketing OS — self-healing Telegram bot supervisor.
#
# Keeps the whole stack alive and working:
#   1. backend  (uvicorn :8000)  — start if down
#   2. tunnel   (cloudflared)    — start if down; ephemeral URL rotates on restart
#   3. webhook  (registrar)      — re-point Telegram at the CURRENT tunnel URL,
#                                  so the bot keeps working even after a restart
#
# Usage:
#   ./scripts/run-bot.sh            start everything + loop forever
#   ./scripts/run-bot.sh once       start everything once (for systemd/cron)
#   ./scripts/run-bot.sh status     show what's running
#   ./scripts/stop-bot.sh           stop backend + tunnel
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_LOG="/tmp/treetiti-backend.log"
TUNNEL_LOG="/tmp/treetiti-tunnel.log"
REGISTER_LOG="/tmp/treetiti-register.log"
URL_FILE="/tmp/treetiti-tunnel-url"
VENV_BIN="$ROOT/backend/.venv/bin"
export PYTHONPATH="$ROOT/backend"

ensure_backend() {
  if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
    return 0
  fi
  echo "[bot] starting backend…"
  (cd "$ROOT/backend" && nohup "$VENV_BIN/uvicorn" app.main:app --host 0.0.0.0 --port 8000 >> "$BACKEND_LOG" 2>&1 &)
  for _ in $(seq 1 20); do
    curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1 && { echo "[bot] backend healthy ✓"; return 0; }
    sleep 1
  done
  echo "[bot] backend failed to start — see $BACKEND_LOG"
  return 1
}

ensure_tunnel() {
  if pgrep -f "cloudflared tunnel --url" >/dev/null 2>&1; then
    return 0
  fi
  echo "[bot] starting cloudflared tunnel…"
  : > "$TUNNEL_LOG"
  nohup cloudflared tunnel --url http://localhost:8000 >> "$TUNNEL_LOG" 2>&1 &
  for _ in $(seq 1 60); do
    url="$(current_url)"
    if [[ -n "$url" ]]; then
      echo "[bot] tunnel up: $url"
      echo "$url" > "$URL_FILE"
      return 0
    fi
    sleep 1
  done
  echo "[bot] tunnel failed — see $TUNNEL_LOG"
  return 1
}

current_url() {
  if [[ -r "$TUNNEL_LOG" ]]; then
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1
  fi
}

register_webhook() {
  local url
  url="$(current_url)"
  [[ -z "$url" ]] && { echo "[bot] no tunnel url to register"; return 1; }
  echo "[bot] registering webhook -> ${url}/api/v1/webhooks/telegram"
  (cd "$ROOT/backend" && "$VENV_BIN/python" - "$url" > "$REGISTER_LOG" 2>&1 <<'PY'
import sys
from app.services.social import _telegram_api
url = sys.argv[1] + "/api/v1/webhooks/telegram"
r = _telegram_api("setWebhook", {"url": url}) or {}
ok = bool(r.get("result", r.get("ok", False)))
print("ok:", ok, "url:", url, "pending:", r.get("result", {}).get("pending_update_count") if isinstance(r.get("result"), dict) else None)
PY
)
  if grep -q "ok: True" "$REGISTER_LOG"; then
    echo "[bot] webhook registered ✓"
    return 0
  fi
  echo "[bot] webhook register output: $(cat "$REGISTER_LOG")"
  return 1
}

run_once() {
  ensure_backend || return 1
  ensure_tunnel || return 1
  register_webhook
}

status() {
  pgrep -f "uvicorn app.main:app" >/dev/null 2>&1 && b="running ✓" || b="DOWN ✗"
  pgrep -f "cloudflared tunnel --url" >/dev/null 2>&1 && t="running ✓" || t="DOWN ✗"
  u="$(current_url)"
  echo "backend : $b"
  echo "tunnel  : $t   url: ${u:-none}"
}

mode="${1:-loop}"
case "$mode" in
  once)
    run_once
    echo "[bot] done (once mode)."
    ;;
  status)
    status
    ;;
  *)
    echo "[bot] supervisor running (Ctrl-C to stop). Logs: $BACKEND_LOG $TUNNEL_LOG"
    while true; do
      run_once || true
      sleep 30
    done
    ;;
esac