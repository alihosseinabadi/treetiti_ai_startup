# Treetiti AI Sales Concierge — Platform Design Document

**Version:** 1.0  
**Status:** Draft for Review  
**Target:** #1 Luxury Real Estate Brand in Iran

---

## 1. Executive Summary

Treetiti AI Sales Concierge is a multi-channel, AI-powered platform that redefines the luxury real estate buying experience. It combines a premium cinematic website with intelligent sales agents operating across WhatsApp, Telegram, and web — delivering 24/7 personalized concierge service to buyers, investors, and overseas clients.

The system uses LangGraph agent orchestration, natural language understanding, image generation (ComfyUI), avatar video (ComfyUI + Piper TTS), and CRM integration to automate the entire sales journey from first touch to closing. Every interaction feels tailored, immediate, and exclusive — comparable to the digital experience offered by brands like Mercedes-Benz, Aman Resorts, and Sotheby's Realty.

**Key Outcomes:**
- Near-zero response time (< 1 second)
- 3x increase in lead conversion
- 24/7 multilingual operation (Farsi, English, Arabic, Turkish)
- Full CRM integration with lead scoring and routing
- Premium brand experience across all touchpoints

---

## 2. Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| Lead Conversion | Conversion rate (inquiry → tour) | 3x improvement |
| Response Time | First response time | < 1 second |
| Customer Satisfaction | CSAT / NPS Score | > 90 |
| Lead Quality | Qualified lead rate | > 60% |
| Operating Cost | Cost per lead | 50% reduction |
| Overseas Coverage | % of leads from abroad | 30%+ |
| 24/7 Availability | Off-hours coverage | 100% |
| Data Collection | Lead data completeness | > 95% |

---

## 3. User Personas

### Persona 1: Arash — The Luxury Buyer
- **Age:** 35–55
- **Occupation:** Senior executive, business owner, physician
- **Location:** Tehran (primary), Dubai (secondary)
- **Tech comfort:** High — expects seamless digital
- **Needs:** Virtual tours, instant pricing, floor plan visualization, appointment scheduling
- **Pain points:** Slow responses, generic messaging, lack of transparency
- **Luxury expectation:** "Treat me like a VIP from the first message"

### Persona 2: Nina — The Overseas Investor
- **Age:** 30–50
- **Occupation:** Diaspora Iranian professional / investor
- **Location:** USA, Canada, UK, UAE, Germany
- **Tech comfort:** Very high
- **Needs:** English/Farsi bilingual, virtual site visits, investment ROI calculations, remote purchase process
- **Pain points:** Time zone differences, language barriers, trust in remote transactions
- **Luxury expectation:** "Show me everything without me being there"

### Persona 3: Saeed — The Portfolio Investor
- **Age:** 45–65
- **Occupation:** Real estate investor, high-net-worth individual
- **Location:** Tehran / International
- **Tech comfort:** Moderate
- **Needs:** Portfolio recommendations, ROI projections, market analysis, bulk purchase options
- **Pain points:** No centralized investment dashboard, slow financial analysis
- **Luxury expectation:** "Give me data-driven confidence before I commit"

### Persona 4: Maryam — The Sales Consultant
- **Age:** 28–45
- **Occupation:** Luxury real estate agent
- **Location:** On-site / Remote
- **Tech comfort:** High
- **Needs:** Lead qualification, CRM sync, automated follow-ups, property tour scheduling, client history
- **Pain points:** Manual data entry, lead leakage, inconsistent follow-up
- **Luxury expectation:** "Let AI handle admin so I can focus on closing"

### Persona 5: Behnam — The Executive Manager
- **Age:** 40–60
- **Occupation:** CEO / VP Sales
- **Location:** Tehran
- **Tech comfort:** Moderate
- **Needs:** Real-time analytics, pipeline overview, team performance, ROI dashboards
- **Pain points:** No unified view, delayed reporting, poor lead attribution
- **Luxury expectation:** "I need to see the numbers in real time, on any device"

---

## 4. User Journeys

### Journey A: First Touch → Tour Booking (WhatsApp/Web)

```
1. Discovery → User finds Treetiti via Instagram, Google, or referral
2. First Contact → Opens WhatsApp or Website Chat
3. AI Greeting → Instant personalized welcome (in Farsi/English)
4. Need Discovery → AI asks qualifying questions:
   - Budget range, preferred area, unit type, timeline
5. Property Match → AI recommends 2-3 units with images/videos
6. Virtual Preview → AI shares 3D tour link or AI-generated interior design
7. Appointment → AI checks calendar, books tour with consultant
8. CRM Update → Lead created with full profile + score
9. Human Handoff → Consultant receives briefing before meeting
10. Follow-up → AI sends reminder + directions + unit details
```

### Journey B: Overseas Investor Remote Purchase

```
1. Website Visit → Lands on "Investor Relations" page
2. AI Investor Agent → English conversation, asks about investment criteria
3. Portfolio Generation → AI creates personalized investment portfolio
4. ROI Simulation → AI generates projected returns with charts
5. Virtual Tour → AI Avatar video guide walks through property
6. Documentation → AI sends digital brochure + legal info
7. Consultation Scheduling → Book video call with sales consultant
8. Due Diligence → AI provides market reports, comparables
9. Reservation → Online unit reservation with digital payment
10. Ongoing → AI sends construction updates via WhatsApp
```

### Journey C: Sales Consultant Daily Workflow

```
1. Morning Brief → AI generates today's priority leads
2. Lead Review → Hot leads with full conversation history
3. Automated Follow-ups → AI sends personalized messages to warm leads
4. Meeting Prep → AI summarizes client profile before tour
5. Real-time Assist → AI suggests responses during client conversations
6. Closing Support → AI provides financing options, payment plans
7. End-of-Day Report → AI generates activity summary
```

### Journey D: Executive Dashboard

```
1. Dashboard Open → Real-time KPIs: leads, conversion, revenue pipeline
2. Drill-down → Click any metric to see breakdown by channel, consultant, project
3. AI Insights → System highlights trends, anomalies, recommendations
4. Forecast → AI predicts weekly/monthly pipeline
5. Alerts → Notifications for unusual activity or bottlenecks
```

---

## 5. Functional Requirements

### 5.1 Multi-Channel Communication
- FR-101: WhatsApp Business API integration (bot + human handoff)
- FR-102: Telegram bot with rich media support
- FR-103: Website live chat with AI + human toggle
- FR-104: Unified conversation history across channels
- FR-105: Persian (Farsi), English, Arabic, Turkish language support

### 5.2 Lead Management
- FR-201: Automatic lead capture from all channels
- FR-202: Lead scoring (budget, intent, timeline, location)
- FR-203: Lead routing to appropriate consultant
- FR-204: Lead status tracking (new, contacted, qualified, tour, negotiation, closed)
- FR-205: Duplicate detection and merge

### 5.3 Property Management
- FR-301: Property listing database with rich media
- FR-302: 3D virtual tours integration
- FR-303: Floor plan viewer
- FR-304: Pricing and payment plan engine
- FR-305: Availability and inventory tracking

### 5.4 Appointment Management
- FR-401: Calendar integration (Google Calendar, Outlook)
- FR-402: AI-powered scheduling (no double-booking)
- FR-403: Automated reminders (24h, 2h, 30min before)
- FR-404: Virtual tour link generation
- FR-405: Consultant availability management

### 5.5 Content Management
- FR-501: CMS for properties, blog, galleries
- FR-502: AI-generated property descriptions
- FR-503: Project portfolio management
- FR-504: Investor relations documents
- FR-505: Legal and compliance documents

### 5.6 Reporting & Analytics
- FR-601: Real-time dashboard (web + mobile)
- FR-602: Conversion funnel analytics
- FR-603: Channel attribution
- FR-604: Consultant performance metrics
- FR-605: Lead source analysis
- FR-606: Pipeline forecasting

### 5.7 Notification System
- FR-701: Push notifications (new leads, appointment reminders)
- FR-702: Email notifications
- FR-703: WhatsApp/Telegram proactive messages
- FR-704: Alert thresholds configurable by management

---

## 6. AI Capabilities

### 6.1 AI Sales Assistant (LangGraph + LLM)

**Purpose:** Primary conversational agent across all channels.

**Capabilities:**
- Natural conversation in Farsi, English, Arabic, Turkish
- Property recommendations based on user preferences
- Answer FAQs about projects, pricing, payment plans
- Schedule tours and appointments
- Qualify leads with structured data extraction
- Human handoff with complete context

**Architecture:**
```
User Message → Input Router → LangGraph Agent
  ├── Knowledge Base Retriever (Haystack)
  ├── Property Search Tool (Supabase)
  ├── Appointment Tool (Calendar API)
  ├── CRM Tool (Supabase/Salesforce)
  └── Escalation Tool (human handoff)
Agent Response → Output Formatter → Channel Adapter
```

**Models:**
- Primary: GPT-4 / Claude (via API)
- Fallback: Ollama (Mistral/Llama 3 for basic queries)
- Fine-tuning: Custom dataset on Farsi real estate conversations

### 6.2 AI Interior Designer (ComfyUI)

**Purpose:** Generate photorealistic interior visualizations of units.

**Capabilities:**
- Text-to-image: "Show me this unit in modern minimalist style"
- Style transfer: Apply design styles (classic, modern, Japandi, Art Deco)
- Virtual staging: Furnish empty rooms with AI
- Color palette: Show unit in different color schemes
- Before/after: Renovation visualization

**Workflow:**
```
User Request → Prompt Builder → ComfyUI Pipeline
  ├── IPAdapter (style reference)
  ├── ControlNet (floor plan / layout)
  ├── Upscale
  └── Output → User via channel
```

### 6.3 AI Analytics Dashboard

**Purpose:** Real-time business intelligence.

**Capabilities:**
- Lead conversion funnel visualization
- Channel performance comparison
- Consultant ranking and KPI tracking
- Revenue pipeline forecast
- Anomaly detection (drop in contacts, spike in response time)
- Natural language query: "How did we perform this week?"

**Stack:** Supabase (data) → n8n (ETL) → Next.js (dashboard) with chart.js / D3

### 6.4 AI Accounting Assistant

**Purpose:** Financial reconciliation and reporting for transactions.

**Capabilities:**
- Automated bank vs company reconciliation
- Installment tracking and reminders
- Payment status dashboard
- Invoice generation
- Financial report generation

**Stack:** n8n workflow → Supabase → PDF generator

### 6.5 AI Avatar Video System (ComfyUI + Piper)

**Purpose:** Personalized video messages at scale.

**Capabilities:**
- AI avatar presents property walkthroughs
- Personalized video greetings for high-value leads
- Multi-language lip-synced videos
- Property update announcements via video
- Virtual agent for overseas buyers

**Workflow:**
```
Script (AI generated) → Piper TTS → ComfyUI Avatar Pipeline
  ├── Face animation (Wav2Lip / AnimateAnyone)
  ├── Background (property image/video)
  └── Output → MP4 sent via WhatsApp/Email
```

---

## 7. Knowledge Base Structure

### 7.1 Data Sources

| Source | Content | Update Frequency |
|--------|---------|-----------------|
| Property Database | Units, floor plans, pricing, availability | Real-time |
| Project Documents | Brochures, fact sheets, legal docs | On change |
| FAQ Repository | Common questions and answers | Weekly review |
| Blog/Articles | Market insights, company news | Per publication |
| Pricing Engine | Dynamic pricing, payment plans | Real-time |
| Sales Playbook | Consultant scripts, objection handling | Monthly |
| Location Data | Neighborhood guides, amenities, transport | Quarterly |

### 7.2 Vector Store Schema (Supabase pgvector)

```sql
-- documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),  -- OpenAI ada-002
  source_type VARCHAR(50),  -- property, faq, project, blog
  language VARCHAR(10),     -- fa, en, ar, tr
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX documents_embedding_idx ON documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 7.3 Retrieval Strategy

- **Hybrid Search:** Vector similarity + keyword (full-text search via Supabase)
- **Reranking:** Cross-encoder model for precision
- **Context Window:** Top 5 chunks, max 4000 tokens
- **Filtering:** By source_type, language, date range

---

## 8. CRM Integration Plan

### 8.1 CRM Platform

**Primary:** Supabase (built-in CRM tables)  
**Secondary:** HubSpot / Zoho / Salesforce (export sync)  
**Fallback:** Google Sheets via n8n

### 8.2 Data Flow

```
All Channels
  ↓
AI Agent (captures + enriches)
  ↓
Supabase CRM Tables
  ↓
n8n Workflow
  ├── Lead Scoring → Update Lead Score
  ├── Lead Routing → Assign to Consultant
  ├── Enrichment → Company info, social profile
  ├── Activity Log → Timeline entry
  └── External CRM Sync → HubSpot / Zoho
```

### 8.3 CRM Schema (Key Tables)

```sql
-- Leads / Contacts
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  language VARCHAR(10) DEFAULT 'fa',
  source_channel VARCHAR(50),     -- whatsapp, telegram, web, referral
  source_campaign VARCHAR(100),
  budget_min NUMERIC(15,0),
  budget_max NUMERIC(15,0),
  preferred_areas TEXT[],
  unit_type VARCHAR(50),          -- apartment, penthouse, villa
  timeline VARCHAR(50),           -- immediate, 3months, 6months, 1year
  investor_type VARCHAR(50),      -- end_user, investor, overseas
  lead_score INTEGER DEFAULT 0,
  lead_status VARCHAR(50) DEFAULT 'new',
  assigned_to UUID REFERENCES consultants(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  channel VARCHAR(50),
  direction VARCHAR(10),          -- inbound, outbound
  message_text TEXT,
  message_type VARCHAR(50),       -- text, image, video, document
  ai_handled BOOLEAN DEFAULT TRUE,
  ai_confidence NUMERIC(3,2),
  consultant_id UUID REFERENCES consultants(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  consultant_id UUID REFERENCES consultants(id),
  appointment_type VARCHAR(50),   -- site_tour, virtual_tour, meeting
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(50),             -- scheduled, completed, cancelled, no_show
  location TEXT,
  virtual_meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.4 Lead Scoring Algorithm

```
Score = Intent_Weight + Budget_Weight + Timeline_Weight + Channel_Weight

Intent (max 40):
- "I want to buy" → 40
- "Send me details" → 20
- "Just looking" → 5

Budget (max 30):
- Above 100B Rial → 30
- 50-100B Rial → 20
- Below 50B → 10
- Not disclosed → 5

Timeline (max 20):
- Immediate → 20
- 3 months → 15
- 6 months → 10
- 1 year+ → 5

Channel (max 10):
- WhatsApp direct → 10
- Website chat → 8
- Telegram → 6
- Instagram → 4

Thresholds:
- Hot: 70+
- Warm: 40-69
- Cold: < 40
```

---

## 9. WhatsApp Integration Plan

### 9.1 Architecture

```
WhatsApp User
  ↓
WhatsApp Business API (Cloud API / 360Dialog)
  ↓
Webhook → n8n Workflow
  ├── Message Classifier (AI)
  │   ├── Simple Query → Knowledge Base → Reply
  │   ├── Lead Intent → AI Sales Agent → Qualify → Reply
  │   ├── Appointment → Calendar Tool → Confirm
  │   └── Escalation → Human Agent → Handoff
  ↓
Response → WhatsApp API
```

### 9.2 Capabilities

| Feature | Description |
|---------|-------------|
| Auto-reply | Instant AI response to all messages |
| Rich media | Send images, videos, PDF brochures, 3D tours |
| Interactive replies | Quick reply buttons, list menus |
| Template messages | Pre-approved broadcast templates |
| Appointment booking | Calendar integration via interactive flow |
| Human handoff | Seamless transfer with conversation history |
| Proactive outreach | Automated follow-ups (with opt-out) |
| Multi-language | Auto-detect and respond in same language |

### 9.3 Template Categories

- **Welcome** — First contact acknowledgment
- **Property Alert** — New listings matching preferences
- **Appointment Reminder** — 24h / 2h before
- **Follow-up** — "Still interested?" after 7 days
- **Price Update** — Promotions, price changes
- **Construction Update** — Project milestone notifications
- **Payment Reminder** — Installment due notifications
- **Holiday Greeting** — Nowruz, other occasions

---

## 10. Telegram Integration Plan

### 10.1 Architecture

```
Telegram User
  ↓
Telegram Bot (python-telegram-bot / Telegraf)
  ↓
Webhook → n8n Workflow
  ├── Command Handler (/start, /tour, /price)
  ├── Message Handler (AI agent)
  ├── Inline Query Handler
  └── Callback Handler (button presses)
  ↓
Response → Telegram API
```

### 10.2 Capabilities

| Feature | Description |
|---------|-------------|
| Bot Commands | /start, /projects, /price, /tour, /contact, /invest |
| Rich Media | Photos, videos, documents, location |
| Inline Keyboards | Property selection, filter options |
| Channel Integration | Broadcast project updates to channel |
| Group Support | Bot in group for team coordination |
| Poll/Survey | Collect feedback, preferences |
| Payment Link | Direct payment link sharing |
| Location Sharing | Project location on map |

### 10.3 Bot Commands

```
/start — Welcome + Language selection
/projects — List all projects with images
/project [name] — Details of specific project
/price [project] [unit] — Pricing information
/tour [project] — Schedule a tour
/invest — Investor information package
/contact — Contact consultant
/faq — Frequently asked questions
/lang [fa|en|ar|tr] — Change language
```

---

## 11. Website Integration Plan

### 11.1 Component Architecture

```
Website Pages
├── Home — Cinematic hero, featured projects
├── Projects — Project listings with filters
├── Project Detail — Gallery, floor plans, pricing
├── Investor Relations — Portfolio builder, ROI calc
├── About Us — Brand story, team
├── Blog — Market insights, articles
├── Contact — Form, map, direct chat
└── Virtual Tour — 3D walkthrough (separate SPA)

Floating Widgets
├── AI Chat Widget (bottom-right)
│   ├── Text chat (AI + human)
│   ├── Quick action buttons
│   └── File/image sharing
├── WhatsApp Button (click to open chat)
└── Telegram Button (click to open chat)

Embedded AI Components
├── Property Recommender (on project pages)
├── Interior Designer (upload photo → restyle)
├── ROI Calculator (investor page)
├── Payment Plan Visualizer (pricing page)
└── Live Availability Checker
```

### 11.2 AI Chat Widget

- Persistent floating button on all pages
- Opens as slide-in panel (not full page)
- Shows AI avatar with name ("Sara — Your Sales Concierge")
- Quick action chips: "Schedule Tour", "View Projects", "Get Pricing"
- Farsi-first with language toggle
- Typing indicator while AI responds
- File/image upload support
- Escalate to human with one click
- Consultant sees ongoing conversation

### 11.3 Premium UI/UX Considerations

- Dark mode default with gold accent (#C9A84C)
- 60 FPS scroll animations (Lenis + GSAP)
- 3D property viewer (React Three Fiber)
- Cinematic page transitions (Framer Motion)
- Micro-interactions on every interactive element
- Custom cursor for desktop
- Persian calligraphy elements in design
- Full RTL support
- Sub-2 second initial load (Vite + lazy loading)
- Lighthouse score > 90

---

## 12. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CDN (Vercel Edge)                          │
├─────────────────────────────────────────────────────────────────────┤
│                        NEXT.JS APPLICATION                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Public  │ │  Admin   │ │  Dashboard│ │  AI Chat │ │ 3D Tour  │ │
│  │  Pages   │ │  Panel   │ │  (Analytics) │ │  Widget  │ │  Viewer  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴──────────────────────────────────┐
│                         API GATEWAY                                 │
│             Next.js API Routes + MCP Servers                        │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
┌───────────────────────────────────┴──────────────────────────────────┐
│                    AGENT ORCHESTRATION LAYER                         │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  LangGraph   │  │   CrewAI    │  │   AutoGen   │                 │
│  │ (Sales Agent)│  │ (Multi-agent)│  │ (Complex Tasks)│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                          │
│  ┌──────┴──────────────────────────────────┴──────┐                │
│  │              Mem0 (Persistent Memory)           │                │
│  └─────────────────────┬───────────────────────────┘                │
│                        │                                             │
│  ┌─────────────────────┴───────────────────────────┐                │
│  │        Haystack / GPT Researcher (RAG)          │                │
│  └─────────────────────┬───────────────────────────┘                │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
┌─────────────────────────┴──────────────────────────────────────────┐
│                    AI SERVICES LAYER                                │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  ComfyUI   │  │   Piper    │  │   Ollama   │  │  LLM APIs    │ │
│  │(Image/Avatar)│  │  (TTS)   │  │(Local Models)│  │(GPT-4/Claude)│ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
┌─────────────────────────┴──────────────────────────────────────────┐
│                    AUTOMATION & INTEGRATION LAYER                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │  n8n         │  │  MCP Servers │  │  Webhook Gateway       │   │
│  │(Workflows)    │  │ (DB/CRM/API) │  │(WhatsApp/Telegram/Email)│   │
│  └──────────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
┌─────────────────────────┴──────────────────────────────────────────┐
│                        DATA LAYER                                  │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  Supabase  │  │ Supabase   │  │ Supabase   │  │  Redis       │ │
│  │ (Postgres)  │  │  Auth      │  │  Storage   │  │  (Cache)     │ │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────────────────────┘

CHANNELS:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ WhatsApp │  │ Telegram │  │  Website │  │  Email   │
│   API    │  │ Bot API  │  │  Widget  │  │  API     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 13. Database Design (Supabase)

### 13.1 Entity Relationship Summary

```
projects ──┬── units ──┬── unit_images
           │           ├── unit_prices
           │           └── unit_availability
           ├── project_images
           ├── project_documents
           └── project_amenities

leads ──┬── interactions
        ├── appointments
        ├── lead_scores
        ├── lead_tags
        ├── documents (uploaded)
        └── notes

consultants ──┬── lead_assignments
              ├── consultant_availability
              └── appointment_availability

campaigns ──┬── campaign_leads
            └── campaign_metrics
```

### 13.2 Core Tables

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL,               -- multilingual {fa, en, ar, tr}
  description JSONB,
  location JSONB,                      -- {lat, lng, address, neighborhood}
  total_units INTEGER,
  total_floors INTEGER,
  completion_date DATE,
  developer VARCHAR(255),
  status VARCHAR(50),                  -- pre_launch, under_construction, completed
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  unit_number VARCHAR(50),
  unit_type VARCHAR(50),               -- studio, 1bed, 2bed, 3bed, penthouse
  floor_number INTEGER,
  area_sqm NUMERIC(8,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  has_balcony BOOLEAN DEFAULT FALSE,
  balcony_area NUMERIC(8,2),
  direction VARCHAR(20),               -- north, south, east, west
  floor_plan_url TEXT,
  virtual_tour_url TEXT,
  status VARCHAR(50),                   -- available, reserved, sold
  base_price NUMERIC(15,0),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit Prices (history tracking)
CREATE TABLE unit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  price NUMERIC(15,0) NOT NULL,
  payment_plan JSONB,                   -- [{percent, due_date, amount}]
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns (Marketing)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50),                  -- whatsapp, telegram, email, social, web
  type VARCHAR(50),                     -- broadcast, targeted, automated
  target_audience JSONB,                -- filter criteria
  content JSONB,                        -- multilingual content
  status VARCHAR(50),                   -- draft, scheduled, active, completed
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (for segmentation)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),                 -- interest, behavior, demographic
  color VARCHAR(7) DEFAULT '#C9A84C',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);
```

### 13.3 Row Level Security (RLS)

```sql
-- Leads: consultants see assigned leads, managers see all
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultant_leads ON leads
  FOR ALL
  USING (assigned_to = auth.uid() 
         OR auth.role() = 'manager'
         OR auth.role() = 'admin');

-- Appointments: same pattern
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultant_appointments ON appointments
  FOR ALL
  USING (consultant_id = auth.uid() 
         OR auth.role() = 'manager'
         OR auth.role() = 'admin');
```

---

## 14. API Design

### 14.1 RESTful Endpoints

```
Base URL: /api/v1

=== Lead Management ===
GET    /leads                    — List leads (filtered, paginated)
POST   /leads                    — Create lead
GET    /leads/:id                — Lead detail
PUT    /leads/:id                — Update lead
DELETE /leads/:id                — Soft delete lead
POST   /leads/:id/assign         — Assign to consultant
POST   /leads/:id/score          — Trigger lead scoring

=== Interactions ===
GET    /leads/:id/interactions   — Conversation history
POST   /leads/:id/interactions  — Log interaction

=== Appointments ===
GET    /appointments             — List appointments
POST   /appointments             — Create appointment
PUT    /appointments/:id         — Update
DELETE /appointments/:id         — Cancel
POST   /appointments/:id/confirm — Confirm
POST   /appointments/:id/remind  — Send reminder

=== Projects ===
GET    /projects                 — List projects
GET    /projects/:id             — Project details
GET    /projects/:id/units       — Units in project
GET    /units/:id                — Unit detail

=== AI (protected, internal) ===
POST   /ai/chat                  — Send message to AI agent
POST   /ai/interior-design       — Generate interior visualization
POST   /ai/avatar                — Generate avatar video
POST   /ai/recommend             — Property recommendations
POST   /ai/qualify               — Lead qualification

=== Analytics ===
GET    /analytics/overview       — Main dashboard KPIs
GET    /analytics/funnel         — Conversion funnel
GET    /analytics/channels       — Channel performance
GET    /analytics/consultants    — Consultant performance
GET    /analytics/pipeline       — Revenue pipeline
GET    /analytics/forecast       — Pipeline forecast

=== Communication ===
POST   /communications/send      — Send message (any channel)
POST   /communications/template  — Send template message
POST   /communications/broadcast — Bulk send

=== Consultants ===
GET    /consultants              — List consultants
GET    /consultants/:id          — Consultant profile
GET    /consultants/:id/leads    — Consultant's leads
GET    /consultants/:id/stats    — Consultant stats
```

### 14.2 WebSocket (Realtime)

```
ws://treetiti.com/ws

Events (server → client):
- lead.created       — New lead captured
- lead.updated       — Lead status/score change
- message.new        — New incoming message
- appointment.created
- appointment.reminder
- alert.triggered    — KPI threshold breached

Events (client → server):
- subscribe:leads    — Subscribe to lead updates
- subscribe:messages — Subscribe to message stream
```

### 14.3 n8n Webhook Endpoints

```
POST /webhook/whatsapp    — WhatsApp incoming message
POST /webhook/telegram    — Telegram update
POST /webhook/crm-sync    — External CRM sync
POST /webhook/email-inbound — Email parser
POST /webhook/payment     — Payment gateway callback
POST /webhook/calendar    — Calendar event change
```

---

## 15. Security Requirements

### 15.1 Authentication & Authorization

- **Auth Provider:** Supabase Auth (GoTrue)
- **Methods:** Email/password, Google OAuth, OTP (phone)
- **Multi-tenancy:** Row Level Security (RLS) per role
- **Roles:** admin, manager, consultant, api (machine-to-machine)

### 15.2 Data Protection

- **Encryption at rest:** Postgres column-level encryption for PII
- **Encryption in transit:** HTTPS everywhere (Vercel + Supabase)
- **API Keys:** Supabase API keys with restricted permissions
- **Secrets:** Environment variables via Vercel (never in code)
- **Audit Logs:** All access to lead data logged with timestamp + user

### 15.3 AI Safety

- **Prompt Injection:** Input sanitization, system prompt guardrails
- **Content Filtering:** NSFW/image safety checks on AI-generated content
- **Data Privacy:** AI never sends PII to external LLM (anonymize before API call)
- **Rate Limiting:** Per-user, per-channel, per-IP
- **Human-in-the-loop:** AI cannot send contracts, cannot close deals

### 15.4 Compliance

- GDPR compliance for EU citizen data
- Iran data protection (host critical data in-country)
- WhatsApp Business policy compliance
- Opt-out management for all marketing communications

### 15.5 Supabase RLS Summary

```sql
-- Admins: full access
-- Managers: read all, write assigned
-- Consultants: read/write own leads
-- API tokens: scoped per endpoint
```

---

## 16. Analytics Dashboard

### 16.1 Overview Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Today's Performance             Last 7 Days Trend  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │ 145 │ │ 23  │ │ 12  │ │ 8M  │                    │
│  │Leads│ │Tours│ │Deals│ │Revenue│                    │
│  └─────┘ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────────────┤
│  Lead Funnel                                         │
│  Visitors → Inquiries → Qualified → Tours → Deals   │
│  ████████████████░░░░ 65%                           │
│  ██████████░░░░░░░░░░ 42%                           │
│  ███████░░░░░░░░░░░░░ 28%                           │
│  ████░░░░░░░░░░░░░░░░ 15%                           │
├─────────────────────────────────────────────────────┤
│  Channel Performance                                 │
│  WhatsApp  ████████████████  48%   ↑12%            │
│  Website   ██████████░░░░░░  32%   ↑5%             │
│  Telegram  █████░░░░░░░░░░░  15%   →               │
│  Other     ██░░░░░░░░░░░░░░   5%   ↓3%             │
├─────────────────────────────────────────────────────┤
│  AI Performance                                      │
│  Handled: 89%  |  CSAT: 4.7/5  |  Avg Response: 0.8s│
└─────────────────────────────────────────────────────┘
```

### 16.2 Key Metrics

| Category | Metric | Calculation |
|----------|--------|------------|
| Volume | Total Leads | Count per period |
| Volume | Conversations | Unique conversations |
| Quality | Qualified Rate | Qualified / Total |
| Quality | Lead Score Avg | Average score |
| Speed | First Response | Time to first AI reply |
| Speed | Human Handoff | Time to human assignment |
| Conversion | Inquiry → Tour | Tour booked / Inquiry |
| Conversion | Tour → Deal | Deals / Tours |
| Revenue | Pipeline Value | Sum of deal values |
| Revenue | Avg Deal Size | Total / Deals |
| AI | AI Handle Rate | AI-only / Total interactions |
| AI | CSAT | Rating (1-5) |
| Channel | Conversion by Channel | Per channel |
| Team | Consultant Rank | By conversion rate |

### 16.3 Alerts & Notifications

- Lead score > 70: Push notification to consultant
- Response time > 5 min: Alert to manager
- No human handoff within 10 min: Escalation
- Daily goal missed: End-of-day report
- Unusual pattern: AI anomaly detection

---

## 17. Lead Qualification System

### 17.1 Qualification Flow

```
Incoming Message
  ↓
AI Language Detection + Intent Classification
  ↓
Structured Data Extraction:
  ├── Budget (extracted from text)
  ├── Property Type (apartment, villa, penthouse)
  ├── Location Preference
  ├── Timeline
  └── Contact Information
  ↓
Data Completeness Check
  ├── Complete → Lead Score Calculation
  └── Incomplete → Follow-up Question → Re-check
  ↓
Lead Scored + Tiered:
  ├── HOT (70+)   → Immediate notification + assign to top consultant
  ├── WARM (40-69) → Add to nurture sequence
  └── COLD (<40)  → Add to newsletter/list
  ↓
CRM Update → Consultant Notification → Follow-up Sequence
```

### 17.2 BANT Scoring

| Criterion | Questions | Weight |
|-----------|-----------|--------|
| **Budget** | "What's your budget range?" | 30 |
| **Authority** | "Are you the decision maker?" | 20 |
| **Need** | "What are you looking for?" | 30 |
| **Timeline** | "When are you planning to move?" | 20 |

### 17.3 Nurture Sequences (n8n Workflows)

**Hot Lead Sequence (24h):**
1. Immediate: AI responds with property recommendations
2. +15 min: Notification to assigned consultant
3. +1h: Consultant contacts via WhatsApp/phone
4. +24h: AI follow-up if no response

**Warm Lead Sequence (7 days):**
1. Immediate: AI responds with general info
2. +1 day: Send brochure (WhatsApp/Telegram)
3. +3 days: "Would you like to schedule a tour?"
4. +7 days: "Any questions I can help with?"
5. +14 days: Offer virtual tour booking

**Cold Lead Sequence (30 days):**
1. Immediate: AI responds politely
2. +7 days: Newsletter signup
3. +14 days: Project update
4. +30 days: Re-engagement offer

---

## 18. Future Roadmap

### Phase 1 — MVP (Month 1-2)
- Basic company website (React + Vite current project)
- WhatsApp AI Sales Assistant
- Lead capture + CRM (Supabase)
- Basic analytics dashboard
- Human handoff

### Phase 2 — Premium (Month 3-4)
- Premium custom website (Next.js migration)
- Luxury UI/UX with motion design
- Telegram bot
- AI Interior Designer (ComfyUI)
- n8n marketing automation
- AI Analytics Dashboard

### Phase 3 — Luxury v1 (Month 5-6)
- Advanced 3D website effects
- AI Accounting Assistant
- AI Avatar Video System
- Multi-language full support
- Enterprise CRM integration (HubSpot/Zoho)
- Lead scoring system with ML

### Phase 4 — Luxury v2 (Month 7-9)
- All features mature
- Predictive analytics (ML models)
- Automated marketing campaigns
- Investor portal
- Mobile app (React Native)
- Voice-enabled AI assistant

### Phase 5 — Enterprise (Month 10-12)
- Multi-project portfolio management
- White-label solutions
- API marketplace for partners
- Advanced AI recommendations engine
- VR property tours
- Blockchain-based transaction records

---

## 19. MVP Scope

### What ships in Phase 1

**Website:**
- Single-page website (current React + Vite project)
- Animated hero with property showcase
- Project listings (static)
- Contact form
- WhatsApp floating button
- Responsive design

**AI Sales Assistant:**
- WhatsApp integration (WhatsApp Business API)
- Farsi + English
- FAQ answering (knowledge base)
- Lead qualification (BANT)
- Appointment booking
- Human handoff with context
- Response time < 2 seconds

**Backend:**
- Supabase project setup
- Leads table
- Interactions log
- Basic lead scoring
- n8n workflows for lead capture
- Webhook endpoint for WhatsApp

**Dashboard:**
- Lead list view
- Lead detail with conversation history
- Basic conversion metrics
- Manual lead assignment

### What does NOT ship in MVP

- AI Interior Designer
- AI Avatar Video
- 3D website
- Telegram bot
- AI Accounting
- Advanced analytics
- Predictive ML
- Multi-language (beyond Farsi/English)
- External CRM sync
- Mobile app

---

## 20. Enterprise Version Scope

Beyond luxury v2, the enterprise version includes:

### Multi-Project Management
- Manage multiple developments simultaneously
- Each project has its own AI assistant
- Centralized analytics across portfolio
- Cross-project lead routing

### White-Label Solution
- Third-party developers can use the platform
- Custom branding per project
- API access for partners
- Marketplace of AI modules

### Advanced AI
- Custom fine-tuned LLM on Persian real estate
- Predictive lead scoring (ML model trained on historical data)
- Dynamic pricing optimization
- Sentiment analysis on all conversations
- Automated negotiation assistant

### Virtual Reality
- Full VR property tours (WebXR)
- VR meeting room for overseas buyers
- Real-time multiplayer tours

### Blockchain
- Property transaction records on blockchain
- Smart contract for payments
- Digital title deed verification
- Transparent ownership history

### Compliance & Scale
- Full GDPR + Iran data protection compliance
- SOC 2 equivalent for data handling
- 99.99% uptime SLA
- Horizontal scaling on Kubernetes
- Multi-region deployment (Tehran, Istanbul, Dubai)
- Disaster recovery with < 1 hour RTO

---

*Document prepared by the Treetiti AI Factory team.*  
*Next review: [Date]*
