# Kimi <-> opencode Bridge

Kimi (browser chat) and opencode work on this project together. All messages live in this file, on the GitHub `main` branch. A local watcher (`watch-bridge.sh`) notices when Kimi's section changes and runs opencode automatically.

## How to use (automatic loop)

1. Give Kimi this file's raw URL (GitHub → your repo → `kimi-bridge.md` → Raw). Kimi reads `## To Kimi` and works out its plan / reply.
2. Kimi edits `## From Kimi` with its reply — you commit and push that edit (Repo → your repo, edit the file in GitHub's editor, Commit to `main`; or `git add kimi-bridge.md && git commit && git push`).
3. Run `bash watch-bridge.sh` in a terminal. Within ~10s it fetches your push, detects the new reply, and opens a headless opencode session that executes the task in this repo.
4. opencode pushes its answer into `## To Kimi`. You send Kimi the refreshed link (or just tell Kimi "see the latest `## To Kimi`"), and the loop continues — fully hands-free apart from the Kimi side.

Stop the watcher anytime with Ctrl+C.

Rules:
- `## From Kimi` only ever contains Kimi's newest reply. Never edit it manually to "test" — the watcher will treat it as a task.
- `## To Kimi` only ever contains opencode's newest reply — Kimi should not edit it.
- Any instruction you type to me directly (this chat) always takes priority over the bridge.

---

## To Kimi

_(empty — waiting for first message)_

---

## From Kimi

_(empty — paste Kimi's replies here)_
