# TREEtiti AI Agency OS — Security (Phase 0)

## Threat model (short)

- The backend is reachable from browsers (dashboard), n8n, Telegram, and
  the public internet (lead forms). Authentication is JWT Bearer;
  machine webhooks use HMAC-SHA256; the public lead form uses
  rate limiting + honeypot + origin checks.
- Secrets live ONLY in environment variables / `.env` (gitignored).
  Anything committed is assumed compromised → rotate (checklist below).

## Production startup (fail-closed)

Unset `APP_ENV` = production. `validate_prod()` refuses to boot when:

- `JWT_SECRET` < 32 bytes or a placeholder;
- `ADMIN_PASSWORD` is a placeholder (admins come from `POST /auth/setup`);
- `WEBHOOK_SHARED_SECRET` is empty (public webhooks fail closed);
- CORS contains `*` or `PUBLIC_BASE_URL` is not https;
- docs/openapi are force-disabled in production regardless.

There is no passwordless mode and no default credential anywhere.

## Roles

`require_role` on every router (default-deny middleware is the backstop;
`tests/test_security_phase0.py::test_every_route_is_allowlisted_or_authenticated`
fails the build on any new unauthenticated route):

| | viewer | editor | admin |
|---|---|---|---|
| GET (reads) | ✅ | ✅ | ✅ |
| POST/PUT/PATCH/DELETE (mutations) | ❌ | ✅ | ✅ |

Role vocabulary today is `admin | editor | viewer` (existing tests and
data). The amendment's `operator` maps to `editor`; `client` arrives with
Phase 1 tenancy. JWTs already carry `org_id` so Phase 1 needs no auth
rework (`DEFAULT_ORG_ID` until then).

## Webhooks

- `/webhooks/publish`, `/webhooks/notify`: header `X-Webhook-Timestamp`
  (unix seconds) + `X-Webhook-Signature` =
  `hex(HMAC_SHA256(secret, timestamp + "." + raw_body))`, ±5 min replay
  window, `hmac.compare_digest`. Legacy plain `X-Webhook-Secret` still
  accepted (same secret) for existing integrations.
- `/webhooks/telegram`: `X-Telegram-Bot-Api-Secret-Token` vs
  `TELEGRAM_WEBHOOK_SECRET` (no-op when unconfigured).
- `POST /leads` (public form): 10 req/min/IP + honeypot field `website`
  (must stay empty) + Origin/Referer must match `PUBLIC_BASE_URL`
  (absent header = server-to-server, allowed).

## Rate limiting (caveats — read this)

- Stdlib fixed-window, 60 s buckets, in `backend/app/rate_limit.py`.
- Client IP = direct peer, UNLESS the peer is in `TRUSTED_PROXIES`
  (IPs/CIDRs) and `X-Forwarded-For` is present → left-most entry.
  Untrusted `X-Forwarded-For` is IGNORED (spoofable).
- **Per-worker in-memory.** Behind N workers the effective budget is
  N× the configured one. This is an abuse brake, not a billing guard;
  HMAC + replay checks remain the real webhook authentication. For
  global enforcement put Redis in front (Phase 6).

## Audit log

Logger `treetiti.audit`: login success/failure, setup success/failure,
webhook/HMAC/rate-limit/honeypot rejections. Never contains secrets,
tokens, passwords, signatures or bodies. Ship it to durable storage in
production (it propagates to the root handler like every other log).

## Key-rotation checklist ( MANUAL )

Run these the moment a secret may have leaked (it did — see below):

1. `JWT_SECRET` → new 64-char value. All sessions invalidate (users log
   in again). Command: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
2. `ADMIN_PASSWORD` → change via a logged-in admin (or delete the admin
   row and re-run `POST /auth/setup` with a fresh `ADMIN_SETUP_TOKEN`).
3. `ADMIN_SETUP_TOKEN` → new value after every use; single-use by design
   (route 404s once an admin exists).
4. `WEBHOOK_SHARED_SECRET` → new value; update n8n credential + any
   external signer the same minute (expect 403s during the swap).
5. `TELEGRAM_WEBHOOK_SECRET` → new value, then re-run Telegram
   `setWebhook` with `secret_token`.
6. Supabase admin passwords created by the old scripts → reset in the
   Supabase dashboard (the plaintext password was committed — assume
   known).
7. Provider API keys (Google/Groq/OpenRouter/…) if they ever sat next to
   the leaked password in chat logs or shell history → rotate at each
   provider console.

## Git-history purge ( MANUAL — the password is IN history )

Removing the files is done; scrubbing history needs `git filter-repo`
(local rewrite + force-push; coordinate — it rewrites every commit hash):

```bash
pip install git-filter-repo
cd our_company
OLD_PW='<the old committed password>'   # never commit this file with it filled in
git filter-repo --replace-text <(printf "%s>>>REMOVED<<<" "$OLD_PW") --force
# verify
git log -S 'REMOVED' --oneline | head
git log --all -p | grep -c "$OLD_PW" || echo "clean"
# re-add origin + force-push (everyone re-clones after this)
git remote add origin git@github.com:alihosseinabadi/treetiti_ai_startup.git
git push --force origin main
```

Also then: Settings → Security → secret scanning alerts, and consider
invalidating any PAT that ever touched this machine's shell history.

## Manual actions for the owner (Phase 0 handoff)

- [ ] Run the filter-repo purge above, force-push, all clones re-cloned.
- [ ] Supabase: reset both admin passwords; delete/replace
      `004_admin_users.sql` history (covered by purge) and use
      `ADMIN_EMAILS` + `ADMIN_PASSWORD` env with the new script.
- [ ] Production `.env`: set `APP_ENV=production`, 64-char `JWT_SECRET`,
      real `ADMIN_PASSWORD`, `WEBHOOK_SHARED_SECRET`,
      `ADMIN_SETUP_TOKEN`, https `PUBLIC_BASE_URL`, `TRUSTED_PROXIES`.
- [ ] Create the first admin via `POST /auth/setup`, then delete/rotate
      the setup token.
- [ ] `pip install pre-commit && pre-commit install` (gitleaks gate).
- [ ] Forward `treetiti.audit` logs to durable storage.
