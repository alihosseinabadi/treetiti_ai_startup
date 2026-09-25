-- RLS Policies
-- admins: full access (identified by email)
-- partners: read-only, scoped to their country
-- chat webhook: insert-only on leads + chat_messages

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read users"
  ON users FOR SELECT
  USING (auth.jwt() ->> 'email' IN ('hosseinabadiia@gmail.com', 'erfnho3einabadi@gmail.com'));

CREATE POLICY "admins can update users"
  ON users FOR UPDATE
  USING (auth.jwt() ->> 'email' IN ('hosseinabadiia@gmail.com', 'erfnho3einabadi@gmail.com'));

-- HELPER: check if current user is admin
-- Admins are identified by email in the Supabase Auth JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth.jwt() ->> 'email' IN ('hosseinabadiia@gmail.com', 'erfnho3einabadi@gmail.com');
$$;

-- LEADS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on leads"
  ON leads FOR ALL
  USING (public.is_admin());

CREATE POLICY "partners view leads in their country"
  ON leads FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'partner'
    AND country_id = (SELECT country_id FROM partners WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "public insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on clients"
  ON clients FOR ALL
  USING (public.is_admin());

CREATE POLICY "partners view clients in their country"
  ON clients FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'partner'
    AND country_id = (SELECT country_id FROM partners WHERE email = auth.jwt() ->> 'email')
  );

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on projects"
  ON projects FOR ALL
  USING (public.is_admin());

-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on invoices"
  ON invoices FOR ALL
  USING (public.is_admin());

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on payments"
  ON payments FOR ALL
  USING (public.is_admin());

-- CONTRACTS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on contracts"
  ON contracts FOR ALL
  USING (public.is_admin());

-- MEETINGS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on meetings"
  ON meetings FOR ALL
  USING (public.is_admin());

-- CHAT MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on chat_messages"
  ON chat_messages FOR ALL
  USING (public.is_admin());

CREATE POLICY "public insert chat_messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

-- ACTIVITY LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on activity_logs"
  ON activity_logs FOR ALL
  USING (public.is_admin());

-- PARTNERS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all on partners"
  ON partners FOR ALL
  USING (public.is_admin());

CREATE POLICY "partners view own record"
  ON partners FOR SELECT
  USING (email = auth.jwt() ->> 'email');
