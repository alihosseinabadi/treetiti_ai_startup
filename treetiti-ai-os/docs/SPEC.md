# TREEtiti AI OS — Product Specification

> **Status:** Reference spec for the premium GrokNight theme rebuild and system-level features.
> **Theme:** Luxury dark (GrokNight), driven entirely by CSS variables defined in `frontend/src/index.css` (`@theme` block).
> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS v4 + OmniRoute gateway (`localhost:20128`, 48+ free models).

---

## 1. Overview

TREEtiti is an AI marketing operating system. It orchestrates a **swarm of specialist agents** (copywriter, researcher, strategist, video, social…) around a single mission, routing work between them with real-time visibility into tool calls, approvals, handoffs, and streaming output.

The system exposes two primary surfaces:

- **Chat workspace** — the command center where a user types a mission and watches a team of agents assemble, research, draft, and iterate.
- **System mode** — the management console (agents, calendar, content, projects, campaigns, assets, approvals, analytics, integrations, leads, brand memory, settings).

---

## 2. Design System — "GrokNight" Premium Dark Theme

All colors MUST come from CSS variables / Tailwind theme tokens. **No hardcoded raw hex values** (except semantic JS color constants used for dynamic inline styling).

### 2.1 Core tokens (`@theme` in `index.css`)

| Token | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#08080a` | App background |
| `--color-bg-secondary` | `#0e0e11` | Sidebar / panels / cards |
| `--color-bg-tertiary` | `#141417` | Nested surfaces / rows |
| `--color-bg-elevated` | `#1a1a1f` | Hover / raised |
| `--color-bg-hover` | `#222228` | Stronger hover |
| `--color-text-primary` | `#ededef` | Primary text |
| `--color-text-secondary` | `#a8a8ad` | Secondary text |
| `--color-text-muted` | `#5a5a62` | Muted / placeholder |
| `--color-text-dim` | `#35353d` | Dim |
| `--color-accent` | `#7aa2f7` | Primary accent (Grok blue) |
| `--color-assistant` | `#7aa2f7` | Assistant messages |
| `--color-user` | `#d4d4d8` | User messages |
| `--color-error` | `#f43f5e` | Error / destructive |
| `--color-success` | `#22c55e` | Success / done |
| `--color-warning` | `#eab308` | Warning / pending |
| `--color-border` | `#1e1e24` | Borders / dividers |
| `--color-border-hover` | `#3a3a44` | Border hover |

### 2.2 Tailwind utilities

Theme tokens resolve automatically in Tailwind v4, e.g. `bg-bg-secondary`, `text-accent`, `border-border`, `bg-bg-elevated`, `text-text-muted`. These were verified to emit `var(--color-*)` rules in the production CSS bundle.

### 2.3 Component class primitives (`index.css`)

Reusable class primitives live in `index.css` (not Tailwind) for cross-page consistency:

- `.t-app`, `.t-sidebar`, `.t-sidebar-item` (active, hover), `.t-ico`, `.t-sidebar-label`
- `.t-card` — bordered panel with surface background
- `.t-btn` (with `.primary`/`.danger` variants), `.t-chip`, `.t-input`
- `.t-msg` (`.t-msg-user`/`.t-msg-assistant`), `.t-bubble`, `.t-msg-avatar`
- `.t-md` (markdown body), `.t-exec` / `.t-exec-step` (`.pending`/`.working`/`.done`/`.failed`) / `.t-st-dot`
- `.t-home`, `.t-home-logo`, `.t-home-sub`
- `.t-page`, `.t-page-inner`, `.t-heading`, `.t-sub`
- `.t-row` — clickable list row
- `.t-pill` (`.t-pill-green`/`.t-pill-blue`/`.t-pill-amber`/`.t-pill-gray`/`.t-pill-red`)
- Form controls: `.t-search`, `.t-input`, `.t-select`, `.t-checkbox`, `.t-textarea`
- Layout: `.t-rail` (right context panel), `.t-section-header`, `.t-muted`

### 2.4 Motion

- `msg-in`, `fade-in`, `pop-in`, `typing-dot`, `pulse-subtle`, `step-in` keyframes.
- `@media (prefers-reduced-motion: reduce)` disables animations.
- `:focus-visible` outline uses accent with 55% alpha.


---

## 3. Architecture

```
frontend/src/
  App.tsx               — Router, auth gate, mode switch (Chat vs System)
  auth/                 — AuthContext (login/logout/session)
  hooks/useChat.ts      — ChatApi: messages, streaming, SSE, teams, agents
  api.ts                — REST client to backend (content/leads/tasks/approvals)
  components/
    chat/               — Conversation, Composer, Message, Markdown, OnboardingConversation
    agent/AgentCard.tsx — Agent identity + live task status
    team/               — AgentCanvas, GrokBot (animated agents)
    shell/              — SectionLayout, AppShell
    ui.tsx              — Card, Btn, Spinner, ErrorBanner, StatusBadge
  pages/                — Dashboard, Agents, Calendar, Content, Projects, Campaigns,
                          Assets, Approvals, Analytics, Integrations, Leads, Memory,
                          Settings, Login…
```

### 3.1 Data flow (chat)

1. User sends a message → `useChat.sendStream()` → backend routes to agents over SSE.
2. Backend emits `treetiti:tool-event` CustomEvents (browser, terminal, web_research, image…).
3. `Conversation` subscribes and renders a live **Tool Activity** panel.
4. Agent stages stream into `chat.stages[taskId]` → rendered as **step-by-step execution timeline**.
5. When agents finish, final content streams into `streamingMsg` with a typewriter effect.

---

## 4. Chat Workspace

### 4.1 Conversation (`components/chat/Conversation.tsx`)

Renders, in order:
1. **Agent identity header** (persona name, "Ready" status)
2. **Empty state** — `t-home` logo + suggestion chips
3. **Media gallery** (images/videos generated in-chat)
4. **Team assembled banner** + `AgentCard` per routed agent
5. **Approval cards** (risk-level color-coded: low ✓ green / medium ⏳ amber / high ⚠ red)
6. **Handoff indicators** (agent-to-agent transfer)
7. **Message list** (`Message` component; user ◆ / assistant ▲ avatars, markdown body, attachment media)
8. **Tool events panel** (collapsible; live SSE tool activity)
9. **Streaming message** (typewriter reveal, blinking cursor)
10. **Task progress card** (done/total stage counter + per-agent step rows)
11. **Thinking indicator** (spinner while busy && not streaming)
12. **Composer** — multi-line textarea with slash commands (`/`), mentionable teammates/clients/projects (`@`, `#`), voice input, file attach, send button

### 4.2 Composer (`components/chat/Composer.tsx`)

- Slash command palette (`/new`, `/agent`, `/research`, `/image`, `/video`, `/design`, `/schedule`, `/swarm`, `/status`, `/help`)
- Mention palette for teammates (avatar), teams (👑), clients (◆), projects (initials), files
- Voice-to-text via Web Speech API (`SpeechRecognition`)
- File attach (appends `[Files: name]` token)
- Enter to send, Shift+Enter for newline
- Busy state disables send

### 4.3 Message (`components/chat/Message.tsx`)

- User vs assistant bubbles via `t-msg-user` / `t-msg-assistant`
- Assistant agent label (uppercase, accent)
- Markdown body (`Markdown` component)
- Media card (video `<video controls>` / image `<img>`)
- Pending decision option buttons
- OS command confirm/cancel (`Btn` primary-danger pair)

### 4.4 Onboarding (`OnboardingConversation`)

- Stepped welcome flow with progress dots (accent for filled, `bg-border` for empty)
- Input styled with `focus:ring-accent`

---

## 5. System Mode

`Layout.tsx` provides the System sidebar (`.t-sidebar`):

- **Company** section: Office, Missions, Clients, Results
- **System** section: Dashboard, Agents, Calendar, Content, Projects, Campaigns, Assets, Approvals, Analytics, Integrations, Leads, Brand Memory, Settings
- Logo tile (accent square with "T"), TREE**titi** wordmark
- User email + sign out at the bottom
- Active item: `rgba(122,162,247,0.08)` bg + accent text

### 5.1 Dashboard (`pages/Dashboard.tsx`)

- 4 stat cards (Content pieces, Awaiting approval, Published, Leads captured)
- Recent leads (sorted by score) and Latest content lists
- Refresh control; loading spinner; error banner

---

## 6. Agents System

### 6.1 AgentCard (`components/agent/AgentCard.tsx`)

- Avatar in role color (`${color}15` bg tint), name, role label
- Live status pill: Queued (zinc) / Working (accent, animated) / Done (green) / Failed (red)
- Stage text via `stageText()` + optional note
- Click navigates to `/teammate/:id`

### 6.2 Role colors (`ROLE_COLORS`)

Semantic JS constants (used in inline `style` only):
- chief `#7aa2f7`, researcher `#10b981`, strategist `#8b5cf6`, copywriter `#ec4899`, creative `#f59e0b`, video `#06b6d4`, social `#f43f5e`, analytics `#84cc16`, editor `#6366f1`, brand `#14b8a6`, seo `#a855f7`, campaign `#eab308`, developer `#64748b`, sales `#f97316`, growth `#22c55e`, default `#71717a`

---

## 7. Tool Events & SSE

`treetiti:tool-event` CustomEvents carry: `{ type, tool, agent?, input?, output?, status: "started"|"completed"|"failed", timestamp }`.

Tool icon map:
- browser 🌐, search 🔍, files 📁, terminal 💻, image_generation 🖼, video_generation 🎬, web_research 🔬, analytics 📊, social_publish 📱, email 📧, calendar 📅, crm 👥, cloud_storage ☁️, deep_research 📚, code_execution ⚙️

Status color: started accent / completed success / failed error.

---

## 8. Agent Execution Timeline   *(in progress)*

> Build a dedicated step-by-step execution timeline (§8) with real SSE status.

- Each routed agent maps to one row in the timeline.
- Rows reflect live SSE `phase`: pending → working → done/failed.
- Progress header shows `done/total` pill + running spinner.
- Cap display at 6 rows with `+N more stages`; collapsible.

**TODO:** richer timeline with per-stage timestamps, retry indicators, expandable tool I/O for each step.

---

## 9. Approvals

`ApprovalCard` — risk-level color-coded left border + icon tile, kind badge, title/summary, review link, Approve/Reject buttons (`Btn primary`/`danger`).


---

## 10. Artifacts   *(planned)*

> Implement artifact model, persistence, preview/download.

`ArtifactCard` currently renders (title, kind icon, Open/Download/Regenerate actions) but is **not yet wired to real artifact data**.

Kind icons: image 🖼, video 🎬, document 📄, code 💻, data 📊.

**TODO:**
- Artifact data model (id, title, kind, url, preview, created_at, project/mission refs)
- Persistence layer (backend table + REST/SSE)
- Preview modal + download endpoint
- Regenerate action

---

## 11. Media & Asset System

- `MediaGallery` renders chat media (grid of `<video>`/`<img>` thumbnails)
- `pages/Assets.tsx` — asset CRUD with kind filter, search, upload
- Asset placeholder state uses `bg-bg-secondary` + `text-text-muted`

---

## 12. Projects   *(planned)*

> Wire project-scoped context, files, memory, agent access.

**TODO:**
- Project model (id, name, client, files, memory store)
- Scope chat context per project (mention `#project`)
- Bind agents, campaigns, assets, leads to a project
- Brand memory per project

---

## 13. Integrations / MCP   *(planned)*

> Start with Vane (search) + Scrapling (web extraction) for the Research Agent.

`MCP` palette in the app currently lists providers. **TODO:**
- Register MCP servers, configure tools per agent
- Research Agent → Vane (search) + Scrapling (web content extraction)
- Surface MCP tool health/usage in Integrations page

---

## 14. Analytics

`pages/Analytics.tsx` — session/analytics provider cards (`bg-bg-secondary`, `border-white/[0.06]`), raw analytics rows, referral sources.

---

## 15. Status Badges (`ui.tsx`)

- published: green pill, pending_approval: amber, queued: zinc, draft: zinc, failed/lost: error tint
- Non-listed statuses default to zinc

---

## 16. Accessibility & Motion

- `:focus-visible` accent outline
- Reduced-motion query disables all animation/transition
- Semantic buttons with `aria-label` on icon-only controls
- Keyboard: slash commands, Enter/Shift+Enter in composer

---

## 17. Conventions & Rules

1. **No hardcoded theme hexes in TSX/TS** — always Tailwind theme tokens (`bg-bg-*`, `text-text-*`, `text-accent`, `border-border`, `bg-accent`/`bg-success`/`text-error`).
2. Semantic JS color **constants** (role/event colors) are allowed for dynamic inline `style` because Tailwind can't process variable class names.
3. Component class primitives (`.t-*`) belong in `index.css`; page-specific styling uses Tailwind tokens.
4. Always validate with `npx tsc --noEmit` and `npx vite build` after changes.
5. All new UI must be GrokNight-consistent (dark surfaces, accent blue `#7aa2f7`, muted text hierarchy).

---

## 18. Verification Commands

```bash
cd frontend
npx tsc --noEmit          # type safety
npx vite build            # production build
```

Both pass cleanly for the current theme rebuild.

---

## 19. Backlog (ordered)

1. ✅ Color sweep — eliminate old hardcoded hex / light-theme classes
2. ✅ CSS variable cleanup (`index.css`)
3. ✅ Tailwind class fixes (dark equivalents)
4. ✅ TypeScript + production build verified
5. 🔄 Agent execution timeline (§8) with real SSE status
6. ⏳ Artifact system — model, persistence, preview/download (§10–11)
7. ⏳ Project system — context, files, memory, agent access (§12–13)
8. ⏳ MCP integration — Vane + Scrapling for Research Agent (§13)
9. ⏳ Visual QA in browser (restart Vite due to `/mnt/c` watch issues)

