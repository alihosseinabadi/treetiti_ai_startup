-- Seed admin users into auth.users (idempotent)
-- Uses pgcrypto for bcrypt password hashing
--
-- Phase 0: NO credentials live in this file. Pass them as psql variables:
--   psql "$DB_URL" -v admin_emails="'a@x.io','b@x.io'" -v admin_password='...' \
--     -f supabase/migrations/004_admin_users.sql
-- The migration REFUSES to run with an empty/short password.
-- Run only on local/dev — never in production (use the backend
-- POST /auth/setup first-run flow there).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

\if :{?admin_password}
\else
  \echo 'REFUSING: pass -v admin_password=... (>= 12 chars, never committed)'
  \quit 1
\endif

DO $$
DECLARE
  user_id uuid;
  v_email text;
  admin_list text := :'admin_emails';
  admin_password text := :'admin_password';
BEGIN
  IF admin_password IS NULL OR length(admin_password) < 12 THEN
    RAISE EXCEPTION 'REFUSING: admin_password must be >= 12 chars (passed via -v, never committed)';
  END IF;
  IF admin_list IS NULL OR admin_list = '' THEN
    RAISE EXCEPTION 'REFUSING: pass -v admin_emails=''''a@x.io'',''b@x.io''''';
  END IF;

  FOREACH v_email IN ARRAY string_to_array(admin_list, ',')
  LOOP
    v_email := trim(both ' ' FROM trim(both '''' FROM trim(v_email)));
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM auth.users u WHERE u.email = v_email) THEN
      CONTINUE;
    END IF;

    -- Create user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change_token_current,
      email_change, phone_change, phone_change_token,
      reauthentication_token,
      is_sso_user, is_anonymous,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf', 6)),
      NOW(), NOW(),
      '', '', '', '',
      '', '', '',
      '',
      false, false,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('name', 'Admin', 'role', 'admin'),
      NOW(), NOW(), NOW()
    )
    RETURNING id INTO user_id;

    -- Create identity record
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (user_id, user_id, jsonb_build_object('sub', user_id, 'email', v_email), 'email', NOW(), NOW(), NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created admin user: %', v_email;
  END LOOP;
END;
$$;
