# Treetiti — Premium AI Agency Platform

## Project Identity

Treetiti is a premium international AI agency (AI Sales Concierge → evolved to full AI Agency). 
We build AI websites, AI automation, AI systems, AI content, AI UGC, AI marketing, AI branding, and AI documentaries for premium clients worldwide.

Brand DNA: Luxury, Cinematic, Minimal, Confident, Innovative.
Every pixel must feel world-class — like Apple, Linear, or Stripe.

**Current Version:** V2 (Cinematic Agency Website)
**Status:** 8.5/10 — Architecture & features complete. Needs real content + production deployment + integrations to hit 10/10.

## Current Website Architecture

The website is currently a single-page Vite + React 19 application with:
- Cinematic hero with AI video
- Services showcase (8 AI services)
- Portfolio / case studies grid
- Sticky scroll + parallax + text reveal animations
- Premium dark theme (black/white/blue accent)
- Lenis smooth scrolling + GSAP + Framer Motion
- Language: English (default)

## Multilingual — 5 Languages (i18next, NOT next-intl)

The site supports 5 languages with native-quality copy:

| Language | Code | Direction | URL | Status |
|----------|------|-----------|-----|--------|
| English | en | LTR | / | ✅ LIVE |
| Persian | fa | RTL | /fa | ✅ LIVE |
| Russian | ru | LTR | /ru | ✅ LIVE |
| Arabic | ar | RTL | /ar | ✅ LIVE |
| Turkish | tr | LTR | /tr | ✅ LIVE |

Implementation:
- Uses **i18next + react-i18next** (NOT next-intl — AGENTS.md planning note is outdated)
- Translation files in `src/i18n/{en,fa,ru,ar,tr}.ts` — each natively written, NOT machine translated
- LanguageProvider auto-switches HTML dir (RTL/LTR), applies correct fonts, persists to localStorage
- Language switcher in navbar with smooth animation, no page reload
- Persian & Arabic: Vazirmatn font + full RTL layout
- Russian & Turkish: Inter font + LTR layout
- Default: English

## Tech Stack (Authoritative — Do Not Change)

### Frontend
- **Vite + React 19** with TypeScript strict mode
- **Tailwind CSS v4** with custom design tokens
- **Framer Motion / Motion** — all animations
- **GSAP + ScrollTrigger** — advanced scroll animations
- **Lenis** — smooth scrolling
- **React Three Fiber + Drei + Three.js** — 3D/WebGL
- **Lucide React** — icons
- **Spline** — 3D scene integration
- **Zustand** — state management

### Backend (Current: Supabase — Already Built)
- **Supabase** (PostgreSQL, Auth, Storage, Realtime) — ✅ ACTIVE
- Full CRM schema in `supabase/migrations/001_schema.sql`
- RLS policies in `supabase/migrations/002_rls.sql`
- Seed data in `supabase/migrations/003_seed.sql`
- Admin users in `supabase/migrations/004_admin_users.sql`
- Edge Function: `supabase/functions/chat-webhook/index.ts`
- Admin Panel: 10+ pages (Dashboard, Inbox, Leads, Clients, Projects, Invoices, Contracts, Meetings, Partners, Settings)
- Real Supabase auth connected
- StartPage submits to leads table

### Planned (Future)
- **NestJS** — if we outgrow Supabase
- **Stripe** — payment provider
- **Resend** — email provider
- **Redis + BullMQ** — background jobs
- **MinIO / S3** — object storage**

### CRM (Planned)
- **Custom CRM** built into the platform (not third-party)
- Modules: Dashboard, Leads, Companies, Contacts, Projects, Invoices, Payments, Meetings, Tasks, Notes, Documents, Contracts, Media, AI Assets, Automation, Marketing, Analytics, Support Tickets, Activity Timeline, Notifications, Calendar, Team, Roles, Permissions
- Multi-step project onboarding wizard (chat-based + step-based hybrid)

### Client Portal (Planned)
- Dashboard for clients after login
- Projects, deliverables, invoices, payments, contracts, messages, meetings, timeline, downloads, support tickets, AI assets

### AI & Automation
- **LangGraph** — primary agent orchestration
- **CrewAI** — multi-agent workflows
- **n8n** — automation workflows (preferred over custom scripts)
- **MCP Servers** — all external integrations (Python FastMCP preferred)
- **OpenAI / Anthropic** — LLM APIs (decided, not yet implemented)
- **OpenRouter** — fallback LLM provider

### AI Services
- **Ollama** — local LLMs (Mistral, Llama 3)
- **ComfyUI** — image/avatar/video generation
- **Piper** — text-to-speech
- **Haystack** — RAG pipeline

### Deployment
- **Vercel** — frontend + marketing site
- **Supabase** — backend / database hosting
- **Docker** — containerized backend services
- **Cloudflare** — CDN, DNS, security

## Architecture Rules

1. **Design before code** — write the plan first, implement second
2. **n8n over custom scripts** — automation workflows in n8n, not Node/Python scripts
3. **MCP over direct API** — all external integrations go through MCP servers
4. **TypeScript strict mode** — no implicit any, no unchecked indexed access
5. **WCAG AA minimum** — accessibility is non-negotiable
6. **Tests on critical paths** — Playwright E2E + Vitest unit tests
7. **RLS on all tables** — Row Level Security in Supabase
8. **No secrets in code** — all env vars via Vercel/Supabase

## Folder Structure

```
src/
├── app/              # Page components
│   ├── public/       # Public pages (home, projects, about, contact)
│   └── admin/        # Admin panel (dashboard, leads, analytics)
├── components/       # Shared UI components
│   ├── ui/           # shadcn-style primitives (button, card, input)
│   ├── animations/   # FadeIn, TextReveal, Slide, Stagger, etc.
│   ├── three/        # React Three Fiber components
│   ├── layout/       # Navigation, Footer, Section wrappers
│   └── widgets/      # AI Chat, WhatsApp button, Property cards
├── hooks/            # Custom React hooks
├── lib/              # Utilities (supabase client, api, cn, formatters)
├── providers/        # React context providers (Theme, Auth, Chat)
├── types/            # TypeScript type definitions
├── styles/           # Global styles, CSS variables
└── utils/            # Pure utility functions
```

## Design Language

- **Colors:** Black (#0A0A0A) bg, White text, Blue accent (#3B82F6), Soft grays for depth
  - EVOLVED from Gold (#D4A843) accent to Blue accent — blue is now the brand accent
- **Typography:** Display: Space Grotesk / Inter, Body: Inter
- **Motion:** 60 FPS, GPU-accelerated, micro-interactions on everything
- **Tone:** Cinematic, premium, minimal, confident — every pixel intentional
- **Cursor:** Custom cursor on desktop (magnetic buttons, cursor-aware effects)
- **Scroll:** Lenis smooth scrolling with GSAP ScrollTrigger
- **Background:** Deep black with animated grain, volumetric light, subtle floating particles
- **Cards:** Rounded, glass/glow borders, luxury shadows, moving reflections

## Animation Patterns

- Text reveal: clip-path, blur, word-by-word mask reveals
- Stagger children in lists/grids
- Parallax: subtle multi-layer depth on scroll
- Hover: magnetic attraction, scale + glow on interactive elements
- Page transitions: smooth crossfade
- Hero: 3 video cards stacked with perspective, scroll-to-reveal choreography
- Section transitions: cinematic masks, depth reveals, no hard cuts
- Ambient motion: camera drift, floating layers, moving lighting

## Homepage Section Architecture (LOCKED)

The homepage MUST follow this 5-scene structure. NEVER add/remove/reorder sections without approval.

| Scene | Section | Description |
|-------|---------|-------------|
| 1 | **Hero** | 100vh. Split: Left 45% (headline/subtitle/CTA/trust badges), Right 55% (3 stacked video cards with scroll choreography) |
| 2 | **Services** | Interactive service cards (8 AI services) with hover preview, video, depth |
| 3 | **Portfolio** | Video-driven case studies with cinematic transitions, before/after, results |
| 4 | **Process** | How we work — visual workflow with scroll storytelling |
| 5 | **Final CTA** | Minimal cinematic call-to-action → leads to /start (Project Discovery) |

## Project Discovery Flow

The contact form at the bottom of homepage is REMOVED.
Instead:

1. **CTA "Start Your Project"** on homepage → navigates to `/start`
2. **`/start` page** has TWO modes:
   - **Package Explorer** — browse premium packages (Apple-style product cards, video previews, pricing, select → 3 short fields → submit)
   - **Custom AI Solution** — conversational interface (chat-based, one question at a time, live-updating Project Blueprint on right side)
3. On submit: creates Lead + Project record (CRM integration ready)

## Authentication (Planned)

- Sign In / Login in navbar
- Premium glass modal with email/password + social login
- After login → Client Dashboard

## Architecture Decision Records

### Decided & Implemented
- ✅ Brand evolve: Gold → Blue accent (keeping black/white)
- ✅ Remove contact form → add /start Project Discovery page
- ✅ Hero redesign: 3 stacked video cards, split 45/55 layout
- ✅ i18n: i18next (5 languages: EN, FA, RU, AR, TR)
- ✅ RTL support for Persian & Arabic
- ✅ Auth: Supabase Auth (connected to real backend)
- ✅ AuthModal: premium glass modal with email/password + social placeholders
- ✅ StartPage: chat-based custom + package explorer modes
- ✅ 6-phase Project Discovery flow
- ✅ Admin Panel: 10 CRM pages + full Supabase backend
- ✅ Dual theme: Dark (default) + Light mode — design token system with CSS variables
- ✅ Theme toggle in navbar with sun/moon animated switch
- ✅ Theme persisted to localStorage with system preference detection
- ✅ Page transitions: smooth AnimatePresence
- ✅ Magnetic buttons, custom cursor, GSAP scroll animations
- ✅ Section transitions: cinematic masks, depth reveals

### Not Yet Implemented (Ask before building)
- ❓ Stripe payment integration
- ❓ Resend email provider
- ❓ Production Supabase deployment (currently local at :54321)
- ❓ Real portfolio content (currently placeholder data)
- ❓ n8n automation workflows
- ❓ MCP servers (WhatsApp, Telegram)
- ❓ LangGraph agent orchestration
- ❓ ComfyUI / Piper TTS / Haystack RAG
- ❓ E2E tests (Playwright)
- ❓ CI/CD pipeline

## Lead Qualification (BANT) — for CRM Phase

- Budget (30pts), Authority (20pts), Need (30pts), Timeline (20pts)
- HOT: 70+, WARM: 40-69, COLD: < 40

## Agent Communication Protocol

All C-suite agents and sub-agents use this protocol:
- `/cs:*` — orchestration commands
- Isolation: agents work independently, results merged
- Memory: use Mem0 for cross-session persistence
- Prompt discipline: never guess business logic, always ask the user before making assumptions

## Quality Gates

Before any commit:
1. `npm run build` succeeds
2. `npm run lint` passes
3. No `console.log` in production code
4. Accessibility: keyboard navigable, proper ARIA labels
5. Mobile responsive: test at 375px, 768px, 1440px
6. No duplicated sections
7. No placeholder buttons — every clickable element must work
8. No hardcoded strings — all text in translation files
