# OS Dashboard × deepseek-harness (2026-09-21)

## What was built
WebUI chat where you talk to the **Chief of Staff**, then every agent runs —
and agents **ask you mid-task** when they need answers to hit the goal better.
Layout mirrors your reference picture: agents sidebar | chat | screen+routines.

## deepseek-harness (plugin architecture)
Repo: https://github.com/deepseek-ai/deepseek-harness — "everything is a plugin".
Run it side-by-side (needs Node 22+):
```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness && pnpm install && pnpm run build
npx @deepseek-ai/dsh web   # http://127.0.0.1:3080
```
Our backend mirrors the pattern in `backend/app/harness.py` (PLUGINS registry
+ PIPELINE + pending_questions). A real dsh plugin shim can wrap
`POST /api/v1/orchestrator/plan|answer|execute` — see bottom of harness.py.

## New files
- Backend: `app/harness.py`, `app/routers/orchestrator.py` (wired in `app/main.py`)
- Frontend: `src/pages/OsChat.tsx` (route `/os`, nav "OS Chat"), `src/lib/orchestrator.ts`
- Preview (no node needed): `os_preview.html` at repo root of this copy

## Flow (ask-user loop)
1. You: "Launch our new UGC package for startup founders, bold tone"
2. `POST /orchestrator/plan` → steps for 10 plugins + pending_questions
   (e.g. Growth Marketer: platform? Sales: offer?)
3. Right panel shows questions; you answer inline → `POST /orchestrator/answer`
4. Status `ready` → `POST /orchestrator/execute` fans out to real agents
   (`get_agent().run(**payload)`), Editor QA gates, dossier returned.
5. If backend offline, OsChat runs in demo mode (simulated questions + chat fallback).

## Picture mapping
| Picture | Ours |
|---|---|
| Chief of Staff | campaign plugin (orchestrator) |
| EA / Inbox / Sales / Talent / Growth / Support / Expense / Invoice | developer / leads(sales) / sales / market_research / content / support(sales) / analytics / invoices(analytics) |
| File card Kickoff Agenda.pdf | attachment bubble |
| Routines (briefing, cleanup, weekly) | right panel static list (wire to scheduler next) |
| Mobile cards | CSS grid stacks under 1000px |

## Next (needs prod env)
- Persist RUNS to DB instead of memory; stream step progress via websocket/SSE.
- Wire Routines to `app/scheduler.py` autopilot jobs.
- Approvals: content `pending_approval` → Approve button calls existing PATCH.
