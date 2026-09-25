-- Treetiti CRM & Backend Schema
-- PostgreSQL (used by Supabase)

-- ENUMS
CREATE TYPE lead_stage AS ENUM (
  'new', 'contacted', 'discovery_call', 'proposal_sent',
  'negotiation', 'client', 'completed', 'ongoing'
);

CREATE TYPE client_status AS ENUM ('active', 'completed', 'ongoing');

CREATE TYPE project_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE meeting_type AS ENUM ('discovery', 'proposal', 'review', 'check_in');

CREATE TYPE partner_permission AS ENUM ('view_leads', 'view_clients', 'none');

-- TABLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  country_id UUID REFERENCES countries(id),
  permission partner_permission NOT NULL DEFAULT 'view_leads',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'chat',
  country_id UUID REFERENCES countries(id),
  partner_id UUID REFERENCES partners(id),
  stage lead_stage NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id),
  company TEXT,
  position TEXT,
  website TEXT,
  country_id UUID REFERENCES countries(id),
  status client_status NOT NULL DEFAULT 'active',
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  services TEXT[],
  level INT NOT NULL DEFAULT 1,
  status project_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT,
  signed_date DATE,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  contract_id UUID REFERENCES contracts(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  deposit_percentage INT NOT NULL DEFAULT 20,
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  transaction_id TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  type meeting_type NOT NULL DEFAULT 'discovery',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  direction message_direction NOT NULL DEFAULT 'inbound',
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_country ON leads(country_id);
CREATE INDEX idx_clients_country ON clients(country_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_chat_messages_lead ON chat_messages(lead_id);
CREATE INDEX idx_chat_messages_read ON chat_messages(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(lead_id, client_id, project_id);

-- SOFT DELETE SUPPORT (add deleted_at to key tables)
ALTER TABLE leads ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ;

-- GRANTS (must be at the end, after all tables exist)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT INSERT ON leads TO anon;
GRANT INSERT ON chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
