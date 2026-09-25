# System Architecture

## Overview

Treetiti AI Sales Concierge uses a modular architecture with clear separation of concerns:

- **Frontend:** Vite + React 19 (TypeScript), Tailwind CSS v4, Framer Motion
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **AI Layer:** LangGraph agents + Haystack RAG + ComfyUI + Piper
- **Automation:** n8n workflows
- **Integrations:** MCP servers for WhatsApp, Telegram, CRM

## Data Flow

```
User → Channel (WhatsApp/Telegram/Web) → n8n Webhook → AI Agent
  → LangGraph Orchestrator
    → Knowledge Base (pgvector)
    → CRM (Supabase)
    → Calendar
  → Response → Channel
```

## Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (CDN)                      │
│  ┌──────────────────────────────────────────────┐   │
│  │          Vite + React 19 App                 │   │
│  │  ┌─────┐ ┌──────┐ ┌──────┐ ┌────────┐      │   │
│  │  │Public│ │Admin │ │Chat  │ │3D Tour │      │   │
│  │  │Pages│ │Panel │ │Widget│ │Viewer  │      │   │
│  │  └─────┘ └──────┘ └──────┘ └────────┘      │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              Supabase (Backend)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Postgres │ │   Auth   │ │ Storage  │            │
│  │  + RLS   │ │ (GoTrue) │ │ (S3)     │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              n8n (Automation)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │WhatsApp  │ │ Telegram │ │  CRM     │            │
│  │Workflows │ │Workflows │ │ Sync     │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              MCP Servers                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ WhatsApp │ │ Telegram │ │ Database │            │
│  │   MCP    │ │   MCP    │ │   MCP    │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────────────────────────────────────┘
```
