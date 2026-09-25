-- ============================================================
-- Treetiti AI Sales Concierge — Supabase Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'tour', 'negotiation', 'closed', 'lost');
CREATE TYPE channel_type AS ENUM ('whatsapp', 'telegram', 'web', 'email', 'phone', 'social', 'referral');
CREATE TYPE unit_type AS ENUM ('studio', '1bed', '2bed', '3bed', 'penthouse', 'villa');
CREATE TYPE project_status AS ENUM ('pre_launch', 'under_construction', 'completed');
CREATE TYPE appointment_type AS ENUM ('site_tour', 'virtual_tour', 'meeting', 'video_call');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

-- ============================================================
-- CONSULTANTS (extends auth.users)
-- ============================================================
CREATE TABLE consultants (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('consultant', 'manager', 'admin')),
  languages TEXT[] DEFAULT '{fa,en}',
  specialties TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL,
  description JSONB,
  location JSONB,
  total_units INTEGER,
  total_floors INTEGER,
  completion_date DATE,
  developer TEXT,
  status project_status DEFAULT 'under_construction',
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UNITS
-- ============================================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  unit_type unit_type NOT NULL,
  floor_number INTEGER,
  area_sqm NUMERIC(8,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  has_balcony BOOLEAN DEFAULT FALSE,
  balcony_area NUMERIC(8,2),
  direction TEXT,
  floor_plan_url TEXT,
  virtual_tour_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  base_price NUMERIC(15,0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UNIT PRICES (history tracking)
-- ============================================================
CREATE TABLE unit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(15,0) NOT NULL,
  payment_plan JSONB,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE unit_prices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  language TEXT DEFAULT 'fa',
  source_channel channel_type NOT NULL,
  source_campaign TEXT,
  budget_min NUMERIC(15,0),
  budget_max NUMERIC(15,0),
  preferred_areas TEXT[] DEFAULT '{}',
  unit_type unit_type,
  timeline TEXT,
  investor_type TEXT CHECK (investor_type IN ('end_user', 'investor', 'overseas')),
  lead_score INTEGER DEFAULT 0,
  lead_status lead_status DEFAULT 'new',
  assigned_to UUID REFERENCES consultants(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_channel ON leads(source_channel);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INTERACTIONS
-- ============================================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  channel channel_type NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'location')),
  ai_handled BOOLEAN DEFAULT TRUE,
  ai_confidence NUMERIC(3,2),
  consultant_id UUID REFERENCES consultants(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_lead ON interactions(lead_id);
CREATE INDEX idx_interactions_created ON interactions(created_at DESC);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES consultants(id) NOT NULL,
  appointment_type appointment_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status appointment_status DEFAULT 'scheduled',
  location TEXT,
  virtual_meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_consultant ON appointments(consultant_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TAGS (segmentation)
-- ============================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('interest', 'behavior', 'demographic')),
  color TEXT DEFAULT '#C9A84C',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel channel_type NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('broadcast', 'targeted', 'automated')),
  target_audience JSONB,
  content JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed')),
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- KNOWLEDGE BASE (for AI RAG - pgvector)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  source_type TEXT NOT NULL CHECK (source_type IN ('property', 'faq', 'project', 'blog', 'policy')),
  language TEXT DEFAULT 'fa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_documents_type ON documents(source_type);
CREATE INDEX idx_documents_lang ON documents(language);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Leads
CREATE POLICY "consultants_view_assigned_leads" ON leads
  FOR SELECT USING (assigned_to = auth.uid() OR auth.uid() IN (SELECT id FROM consultants WHERE role IN ('manager', 'admin')));

CREATE POLICY "consultants_insert_leads" ON leads
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "consultants_update_assigned_leads" ON leads
  FOR UPDATE USING (assigned_to = auth.uid() OR auth.uid() IN (SELECT id FROM consultants WHERE role IN ('manager', 'admin')));

-- Interactions
CREATE POLICY "consultants_view_lead_interactions" ON interactions
  FOR SELECT USING (lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR auth.uid() IN (SELECT id FROM consultants WHERE role IN ('manager', 'admin'))));

CREATE POLICY "consultants_insert_interactions" ON interactions
  FOR INSERT WITH CHECK (TRUE);

-- Appointments
CREATE POLICY "consultants_view_appointments" ON appointments
  FOR SELECT USING (consultant_id = auth.uid() OR auth.uid() IN (SELECT id FROM consultants WHERE role IN ('manager', 'admin')));

CREATE POLICY "consultants_manage_appointments" ON appointments
  FOR ALL USING (consultant_id = auth.uid() OR auth.uid() IN (SELECT id FROM consultants WHERE role IN ('manager', 'admin')));

-- Projects (public read)
CREATE POLICY "public_read_projects" ON projects
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_projects" ON projects
  FOR ALL USING (auth.uid() IN (SELECT id FROM consultants WHERE role = 'admin'));

-- Units (public read)
CREATE POLICY "public_read_units" ON units
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_units" ON units
  FOR ALL USING (auth.uid() IN (SELECT id FROM consultants WHERE role = 'admin'));

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Lead score calculation (BANT-based)
CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_budget_min NUMERIC,
  p_budget_max NUMERIC,
  p_timeline TEXT,
  p_unit_type TEXT,
  p_source_channel TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Budget (max 30)
  IF p_budget_max IS NOT NULL THEN
    IF p_budget_max >= 100000000000 THEN v_score := v_score + 30;
    ELSIF p_budget_max >= 50000000000 THEN v_score := v_score + 20;
    ELSIF p_budget_max >= 10000000000 THEN v_score := v_score + 10;
    ELSE v_score := v_score + 5;
    END IF;
  END IF;

  -- Timeline (max 20)
  IF p_timeline = 'immediate' THEN v_score := v_score + 20;
  ELSIF p_timeline = '3months' THEN v_score := v_score + 15;
  ELSIF p_timeline = '6months' THEN v_score := v_score + 10;
  ELSIF p_timeline = '1year' THEN v_score := v_score + 5;
  END IF;

  -- Unit type indicates intent (max 20)
  IF p_unit_type IS NOT NULL THEN v_score := v_score + 20; END IF;

  -- Channel quality (max 30)
  IF p_source_channel = 'whatsapp' THEN v_score := v_score + 30;
  ELSIF p_source_channel = 'web' THEN v_score := v_score + 25;
  ELSIF p_source_channel = 'telegram' THEN v_score := v_score + 20;
  ELSIF p_source_channel = 'referral' THEN v_score := v_score + 30;
  ELSE v_score := v_score + 10;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Auto-assign lead to least busy consultant
CREATE OR REPLACE FUNCTION auto_assign_consultant()
RETURNS UUID AS $$
DECLARE
  v_consultant_id UUID;
BEGIN
  SELECT c.id INTO v_consultant_id
  FROM consultants c
  LEFT JOIN leads l ON l.assigned_to = c.id AND l.lead_status NOT IN ('closed', 'lost')
  WHERE c.is_active = TRUE AND c.role IN ('consultant', 'manager')
  GROUP BY c.id
  ORDER BY COUNT(l.id) ASC, c.created_at ASC
  LIMIT 1;

  RETURN v_consultant_id;
END;
$$ LANGUAGE plpgsql;
