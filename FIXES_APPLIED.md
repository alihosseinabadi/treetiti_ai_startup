# Fixes Applied – treetiti_repo/ (2026-09-21)

Local sparse copy: 250 text files (47 media/lock skipped to avoid timeout).
All patches applied directly + verified `compileall` + AST.

## Applied
1. `treetiti-ai-os/backend/app/main.py` – CORS `["*"]` -> `settings.cors_origins` allowlist, version 0.2.0
2. `treetiti-ai-os/backend/app/config.py` – `app_name Treetiti`, new `cors_origins`, diversified 11 agent_models + failover (editor no-failover)
3. `treetiti-ai-os/backend/app/auth.py` – removed `passlib` -> `bcrypt` direct (hashpw/checkpw)
4. `treetiti-ai-os/backend/requirements.txt` – no passlib, bcrypt>=4.1, +email-validator, multipart, pytest-asyncio
5. `treetiti-ai-os/frontend/src/api.ts` – `BASE` env `VITE_API_URL`
6. `treetiti-ai-os/frontend/package.json` – v0.2.0 + query/zustand + lint
7. `treetiti/README.md` – real README (was Vite template)
8. `.gitattributes` – LFS for mp4/mov/webm/png/jpg
9. `customer_treetiti/directory_router.py` – onboard/dossier scaffold
10. `treetiti/supabase/functions/stripe-checkout/index.ts` – Stripe stub
11. Branding sweep: 47 files `TREEtiti` -> `Treetiti`
12. `.env.example` additions: CORS_ORIGINS + VITE_API_URL

## Still needs YOU (needs node/git/prod keys)
- `cd treetiti; npm install; npm run build` (no node here)
- `cd treetiti-ai-os/backend; pytest -q` (needs postgres)
- Move videos to R2/Supabase Storage, `git lfs migrate`, delete `scence 07` dup
- Supabase prod deploy + Stripe Price IDs + Vercel envs (see fixes/supabase/prod_checklist.md)
- `git add/commit/push` from a machine with git (not available here)

Diff vs GitHub: compare treetiti_repo/ against fresh clone to generate patch.
