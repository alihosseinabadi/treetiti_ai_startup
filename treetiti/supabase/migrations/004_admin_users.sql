-- Seed admin users into auth.users (idempotent)
-- Uses pgcrypto for bcrypt password hashing
-- Run only on local/dev — never in production

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  user_id uuid;
  v_email text;
  admin_emails text[] := ARRAY['hosseinabadiia@gmail.com', 'erfnho3einabadi@gmail.com'];
  admin_password text := '123Aliappleid456!';
BEGIN
  FOREACH v_email IN ARRAY admin_emails
  LOOP
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
      CASE
        WHEN v_email = 'hosseinabadiia@gmail.com' THEN '{"name": "Ali Hosseinabadi", "role": "admin"}'::jsonb
        WHEN v_email = 'erfnho3einabadi@gmail.com' THEN '{"name": "Erfan Hosseinabadi", "role": "admin"}'::jsonb
      END,
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
