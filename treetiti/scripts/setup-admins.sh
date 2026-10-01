#!/usr/bin/env bash
set -euo pipefail

# Bootstrap admin users in Supabase Auth.
# Run after `supabase start` for local dev, or point to production DB for
# initial setup. Phase 0: credentials come ONLY from the environment —
# never committed to this repo (see docs/SECURITY.md).
#
# Usage (local dev):
#   ADMIN_EMAILS="you@example.com" ADMIN_PASSWORD='...' ./scripts/setup-admins.sh
#
# Usage (production):
#   DB_URL="postgresql://postgres:password@db.your-project.supabase.co:6543/postgres" \
#   ADMIN_EMAILS="owner@company.com" ADMIN_PASSWORD='...' ./scripts/setup-admins.sh

DB_URL="${DB_URL:-${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"

if [ -z "${ADMIN_EMAILS:-}" ]; then
  echo "  ❌ Refusing: set ADMIN_EMAILS (comma-separated, e.g. ADMIN_EMAILS='a@x.io,b@x.io')"
  exit 1
fi
if [ -z "${ADMIN_PASSWORD:-}" ] || [ ${#ADMIN_PASSWORD} -lt 12 ]; then
  echo "  ❌ Refusing: set ADMIN_PASSWORD (>= 12 chars) in the environment, never in a file"
  exit 1
fi

echo "Bootstrapping admin users in auth.users..."

IFS=',' read -ra EMAILS <<< "$ADMIN_EMAILS"
for EMAIL in "${EMAILS[@]}"; do
  EMAIL="$(echo "$EMAIL" | tr -d '[:space:]')"
  [ -n "$EMAIL" ] || continue
  HASH=$(ADMIN_PASSWORD="$ADMIN_PASSWORD" python3 -c "
import os, bcrypt
pw = bcrypt.hashpw(os.environ['ADMIN_PASSWORD'].encode(), bcrypt.gensalt(rounds=6))
print(pw.decode())
" 2>/dev/null || echo "")

  if [ -z "$HASH" ]; then
    echo "  ❌ Can't generate bcrypt hash. Install python3-bcrypt."
    exit 1
  fi

  psql "$DB_URL" -v email="$EMAIL" -v hash="$HASH" <<'SQL'
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      :'email',
      :'hash',
      NOW(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false,
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin", "role": "admin"}',
      NOW(),
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = :'email');
SQL

  USER_ID=$(psql "$DB_URL" -t -A -c "SELECT id FROM auth.users WHERE email = '$EMAIL';")

  if [ -n "$USER_ID" ]; then
    psql "$DB_URL" -c "
      INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES ('$USER_ID', '$USER_ID', '{\"sub\": \"$USER_ID\", \"email\": \"$EMAIL\"}', 'email', NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    "
    echo "  ✅ $EMAIL created (ID: $USER_ID)"
  fi
done

echo "Done! Rotate ADMIN_PASSWORD now if it was ever shared (docs/SECURITY.md)."
