#!/usr/bin/env bash
# Kimi <-> opencode automatic bridge watcher.
#
# Polls GitHub for changes to the "## From Kimi" section of kimi-bridge.md.
# When a new reply arrives, hands the repo to a headless opencode session that
# executes the task, writes its answer to the "## To Kimi" section, and pushes.
#
# Run:  bash watch-bridge.sh          (stop with Ctrl+C)
# Tune: KIMI_POLL_SECS=15 bash watch-bridge.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE="$REPO_DIR/kimi-bridge.md"
STATE="$REPO_DIR/.kimi-bridge-state"
REMOTE_BRANCH="origin/main"
POLL_SECS="${KIMI_POLL_SECS:-10}"
OPENCODE="$(command -v opencode)"

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }

# Normalized hash of the "## From Kimi" section.
# Returns empty string when the section is empty (no pending reply).
from_kimi_hash() {
  local content
  content="$(awk '/^## From Kimi/{f=1;next} /^## /{f=0} f' "$BRIDGE" | tr -d '\r' | sed '/^[[:space:]]*$/d')"
  [[ -z "$content" ]] && { printf '%s' ""; return 0; }
  printf '%s' "$content" | sha256sum | cut -d' ' -f1
}

last_hash=""
[[ -f "$STATE" ]] && last_hash="$(cat "$STATE")"

log "Watching $BRIDGE (poll ${POLL_SECS}s) — Ctrl+C to stop."
while true; do
  if git -C "$REPO_DIR" fetch --quiet "$REMOTE_BRANCH" 2>/dev/null \
     && git -C "$REPO_DIR" pull --ff-only --autostash --quiet origin main 2>/dev/null; then
    h="$(from_kimi_hash)"
    if [[ -n "$h" && "$h" != "$last_hash" ]]; then
      log "New reply from Kimi detected — running opencode."
      "$OPENCODE" run --dir "$REPO_DIR" --auto \
"Read $BRIDGE. Execute the task in the '## From Kimi' section — actually work on this Treetiti project (edit files, run commands) as needed.
When done, REPLACE the '## To Kimi' section (content between the '## To Kimi' heading and the next '## ' heading) with your reply to Kimi: the completed result, or a question back to Kimi if you need input. Leave the '## From Kimi' section EXACTLY as-is.
Then git add/commit your changes and push to origin main." \
        || log "opencode run failed (check output)."
      echo "$h" > "$STATE"
      log "Done. Reply under '## To Kimi' pushed. Kimi sees it at the raw URL after you refresh."
    else
      log "No new reply from Kimi."
    fi
  else
    log "git fetch/pull failed (network or conflict) — retrying."
  fi
  sleep "$POLL_SECS"
done