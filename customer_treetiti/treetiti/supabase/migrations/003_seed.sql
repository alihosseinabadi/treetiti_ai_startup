-- Seed countries

INSERT INTO countries (name, code) VALUES
  ('Oman', 'OM'),
  ('United Arab Emirates', 'AE'),
  ('Russia', 'RU'),
  ('Iran', 'IR'),
  ('Canada', 'CA'),
  ('United States', 'US'),
  ('Turkey', 'TR')
ON CONFLICT (code) DO NOTHING;

-- Grant service_role full access to all tables (bypasses RLS for Edge Functions)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant anon minimum INSERT for public-facing endpoints (chat widget, lead capture)
GRANT INSERT ON leads TO anon;
GRANT INSERT ON chat_messages TO anon;

-- Grant authenticated role full CRUD (admin users via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
