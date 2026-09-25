#!/usr/bin/env bash
set -euo pipefail

# Bootstrap admin users in Supabase Auth
# Run after `supabase start` for local dev, or point to production DB for initial setup
#
# Usage (local dev):
#   ./scripts/setup-admins.sh
#
# Usage (production):
#   DB_URL="postgresql://postgres:password@db.your-project.supabase.co:6543/postgres" ./scripts/setup-admins.sh

DB_URL="${DB_URL:-${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"
ADMINS=(
  "hosseinabadiia@gmail.com:123Aliappleid456!"
  "erfnho3einabadi@gmail.com:123Aliappleid456!"
)

echo "Bootstrapping admin users in auth.users..."

for entry in "${ADMINS[@]}"; do
  EMAIL="${entry%%:*}"
  PASSWORD="${entry#*:}"
  HASH=$(python3 -c "
import hashlib, base64
# bcrypt hash
import bcrypt
pw = bcrypt.hashpw(b'$PASSWORD', bcrypt.gensalt(rounds=6))
print(pw.decode())
" 2>/dev/null || echo "")

  if [ -z "$HASH" ]; then
    echo "  ⚠️  bcrypt not available, trying openssl..."
    HASH=$(php -r "echo password_hash('$PASSWORD', PASSWORD_BCRYPT, ['cost' => 6]);" 2>/dev/null || echo "")
  fi

  if [ -z "$HASH" ]; then
    echo "  ❌ Can't generate bcrypt hash. Install python3-bcrypt or php."
    exit 1
  fi

  psql "$DB_URL" -c "
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      '$EMAIL',
      '$HASH',
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
      '{\"provider\": \"email\", \"providers\": [\"email\"]}',
      '{\"name\": \"Admin\", \"role\": \"admin\"}',
      NOW(),
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '$EMAIL');
  "

  # Get the user ID we just created
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

echo "Done!"
