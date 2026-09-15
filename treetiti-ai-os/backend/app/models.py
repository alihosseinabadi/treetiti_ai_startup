"""TREEtiti AI Marketing OS — ORM models.

PostgreSQL + pgvector. Covers:
- brand knowledge (AI memory)
- content items + calendar
- leads (CRM)
- analytics snapshots
- chat sessions
- research opportunities
- image prompts / video concepts
- projects / media assets / approvals (human-in-the-loop)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="admin")  # admin | editor | viewer
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class BrandMemory(Base):
    """Long-term brand knowledge. `embedding` is used for similarity search."""

    __tablename__ = "brand_memory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    category: Mapped[str] = mapped_column(String(64), index=True)  # voice | customers | services | design | wins
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MemoryEntry(Base):
    """RAG memory: pieces of conversation / decisions / facts worth remembering.

    Every important exchange and fact the team learns gets stored as an entry
    with an embedding so it can be semantically retrieved later. This is the
    long-term memory that makes the system aware of past talks and goals.
    """

    __tablename__ = "memory_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(32), index=True, default="fact")
    #   fact | decision | goal | preference | conversation | rule | lesson
    title: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text)  # the memory to retrieve later
    source: Mapped[str] = mapped_column(String(64), default="chat")  # chat | telegram | api | manual
    tag: Mapped[str] = mapped_column(String(64), default="")  # optional extra tag
    scope: Mapped[str] = mapped_column(String(32), index=True, default="global")  # global | client | team | teammate | project | conversation | task
    scope_id: Mapped[str] = mapped_column(String(36), index=True, default="")  # client name, team id, project id, etc.
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class BrandContentCampaign(Base):
    """A full branding campaign: objective -> strategy -> multi-platform content.

    A campaign bundles research, analytics insight, brand gate and several
    content items across platforms into one goal-driven initiative. This is how
    the system runs whole campaigns, not just single posts.
    """

    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    objective: Mapped[str] = mapped_column(Text)  # what the campaign must achieve
    target_audience: Mapped[str] = mapped_column(Text, default="")
    strategy: Mapped[str] = mapped_column(Text, default="")  # the campaign thesis
    message_house: Mapped[list[dict]] = mapped_column(JSON, default=list)  # [{platform, angle, cta}]
    status: Mapped[str] = mapped_column(String(32), default="draft")  # draft | planning | active | archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform: Mapped[str] = mapped_column(String(32), index=True)  # linkedin | instagram | tiktok | blog
    content_type: Mapped[str] = mapped_column(String(32), default="post")  # post | reel | carousel | article
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)  # full content / captions / script
    hook: Mapped[str] = mapped_column(Text, default="")
    cta: Mapped[str] = mapped_column(Text, default="")
    target_audience: Mapped[str] = mapped_column(String(255), default="")
    visual_recommendation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="draft")  # draft | pending_approval | approved | published | rejected
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)


class ImagePrompt(Base):
    __tablename__ = "image_prompts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    content_item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    subject: Mapped[str] = mapped_column(Text)
    style: Mapped[str] = mapped_column(String(64), default="cinematic")
    prompt: Mapped[str] = mapped_column(Text)  # full professional prompt
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    width: Mapped[int] = mapped_column(Integer, default=1024)
    height: Mapped[int] = mapped_column(Integer, default=1024)
    status: Mapped[str] = mapped_column(String(32), default="ready")  # ready | generated | failed
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class VideoConcept(Base):
    __tablename__ = "video_concepts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    concept: Mapped[str] = mapped_column(Text)
    duration: Mapped[str] = mapped_column(String(32), default="00:30")
    scenes: Mapped[list[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ResearchOpportunity(Base):
    __tablename__ = "research_opportunities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    trend: Mapped[str] = mapped_column(Text)
    business_problem: Mapped[str] = mapped_column(Text)
    content_opportunity: Mapped[str] = mapped_column(Text)
    target_customer: Mapped[str] = mapped_column(String(255))
    extra: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ResearchReport(Base):
    __tablename__ = "research_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    client: Mapped[str] = mapped_column(String(255), default="")
    topic: Mapped[str] = mapped_column(String(255), default="")
    depth: Mapped[str] = mapped_column(String(16), default="deep")  # quick | deep
    status: Mapped[str] = mapped_column(String(16), default="completed")  # completed | failed
    summary: Mapped[str] = mapped_column(Text, default="")
    findings: Mapped[list] = mapped_column(JSON, default=list)
    insights: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    report_md: Mapped[str] = mapped_column(Text, default="")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), index=True)
    company: Mapped[str] = mapped_column(String(255), default="")
    source: Mapped[str] = mapped_column(String(64), default="website")  # website | telegram | referral
    phone: Mapped[str] = mapped_column(String(64), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    customer_type: Mapped[str] = mapped_column(String(32), default="")  # startup | smb | enterprise
    score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    recommended_package: Mapped[str] = mapped_column(String(64), default="")
    suggested_reply: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="new")  # new | contacted | qualified | won | lost
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # slug
    name: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    capabilities: Mapped[list] = mapped_column(JSON, default=list)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    configured: Mapped[bool] = mapped_column(Boolean, default=False)
    last_status: Mapped[str] = mapped_column(String(16), default="missing")  # missing | configured | ok | error
    last_error: Mapped[str] = mapped_column(Text, default="")
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class McpServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), default="")
    transport: Mapped[str] = mapped_column(String(16), default="stdio")  # stdio | sse | http
    command: Mapped[str] = mapped_column(String(255), default="")
    args: Mapped[list] = mapped_column(JSON, default=list)
    url: Mapped[str] = mapped_column(String(512), default="")
    tools: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(16), default="registered")  # registered | reachable | unreachable
    last_error: Mapped[str] = mapped_column(Text, default="")
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    date: Mapped[str] = mapped_column(String(16), index=True)  # YYYY-MM-DD
    report: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), default="New conversation")
    messages: Mapped[list[dict]] = mapped_column(JSON, default=list)
    context: Mapped[str] = mapped_column(String(64), default="")  # "tree" | "customer:<name>"
    project_id: Mapped[str] = mapped_column(String(36), default="")  # optional project association
    archived: Mapped[bool] = mapped_column(Boolean, default=False)  # soft delete
    session_state: Mapped[dict] = mapped_column(JSON, default=dict)  # agentic checkpoints/workflow state (Phase 7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class PendingDecision(Base):
    """A business question TREEtiti stopped the workflow to ask (Phase 7).

    Agentic ask-back: the main chat keeps working autonomously but pauses for
    the ONE human decision it can't make (audience, channel, budget, approve).
    The question survives browser closes; answering resumes the workflow from
    its checkpoint — it never restarts.
    """

    __tablename__ = "pending_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String(36), default="")
    question: Mapped[str] = mapped_column(Text, default="")
    options: Mapped[list[str]] = mapped_column(JSON, default=list)  # human choices, e.g. ["Daily", "3x/week", "Weekly"]
    answer: Mapped[str] = mapped_column(Text, default="")  # the user's choice
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | answered | expired
    workflow: Mapped[dict] = mapped_column(JSON, default=dict)  # what to resume (project/mission/checkpoint data)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DebugReport(Base):
    """Software Engineer agent output: issue -> root cause -> fix proposal."""

    __tablename__ = "debug_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    issue: Mapped[str] = mapped_column(Text)  # the bug / task as described
    category: Mapped[str] = mapped_column(String(32), default="debug")  # debug | build
    root_cause: Mapped[str] = mapped_column(Text, default="")
    affected_files: Mapped[list[dict]] = mapped_column(JSON, default=list)  # [{path, snippet}]
    diagnosis: Mapped[str] = mapped_column(Text, default="")
    fix: Mapped[str] = mapped_column(Text, default="")  # proposed change / patch
    test_plan: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | applied | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ScheduledJob(Base):
    """A recurring agent task the autopilot runs at a fixed time or interval."""

    __tablename__ = "scheduled_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), default="")
    agent: Mapped[str] = mapped_column(String(64), index=True)  # agent key, e.g. "content"
    job_type: Mapped[str] = mapped_column(String(16), default="daily")  # daily | interval
    schedule_time: Mapped[str] = mapped_column(String(16), default="09:00")  # HH:MM for daily
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)  # for interval
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    client: Mapped[str] = mapped_column(String(255), default="")
    project_id: Mapped[str] = mapped_column(String(36), default="")
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AgentRun(Base):
    """A single execution of an agent — by the autopilot or manually."""

    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    agent: Mapped[str] = mapped_column(String(64), index=True)
    job_type: Mapped[str] = mapped_column(String(32), default="manual")  # manual | daily | interval
    status: Mapped[str] = mapped_column(String(16), default="success")  # success | failed | running
    summary: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)


class ClientProfile(Base):
    """A Customer Service Directory client: one link + intake answers.

    This is the seed for the whole Directory workflow. The orchestrator turns
    it into a researched profile, then every specialist agent produces its
    deliverable for THIS client.
    """

    __tablename__ = "client_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), default="")
    link: Mapped[str] = mapped_column(String(512))
    business_line: Mapped[str] = mapped_column(Text, default="")   # Q1
    dream_customer: Mapped[str] = mapped_column(Text, default="")  # Q2
    main_goal: Mapped[str] = mapped_column(Text, default="")       # Q3
    competitors: Mapped[str] = mapped_column(Text, default="")     # Q4
    desired_tone: Mapped[str] = mapped_column(Text, default="")    # Q5
    profile: Mapped[dict] = mapped_column(JSON, default=dict)      # researched profile (stage 1-4)
    dossier: Mapped[dict] = mapped_column(JSON, default=dict)      # final deliverables (stage 5-6)
    status: Mapped[str] = mapped_column(String(32), default="onboarding")  # onboarding | researching | producing | gating | ready | failed
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class TaskRecord(Base):
    """A unit of long-running work in the queue (spec §2, §21).

    Mirrors the in-process ``TaskQueue`` task; persisted so completed work
    survives restarts and is queryable from the UI.
    """

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(32), index=True, default="generic")
    label: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(32), index=True, default="queued")
    #   queued | running | completed | failed | cancelled
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str] = mapped_column(Text, default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    workflow_id: Mapped[str] = mapped_column(String(36), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TaskEvent(Base):
    """A progress event emitted while a task ran (spec §16, §21).

    The SSE stream for a finished task is replayed from here.
    """

    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    task_id: Mapped[str] = mapped_column(String(36), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)  # task.started | agent.started | ...
    source: Mapped[str] = mapped_column(String(64), default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    correlation_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProviderRecord(Base):
    """A model provider (spec §21). Metadata mirrors core/provider_capability.py."""

    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    prefix: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)  # [llm, image, video, ...]
    cost_tier: Mapped[str] = mapped_column(String(16), default="free")  # free | paid
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    base_url: Mapped[str] = mapped_column(String(512), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProviderHealth(Base):
    """Latest health probe result for a provider (spec §21)."""

    __tablename__ = "provider_health"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    model: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(16), default="unknown")  # ok | degraded | down | unknown
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProviderUsage(Base):
    """Daily per-provider request/spend usage (spec §21, plan §K cost guardrail)."""

    __tablename__ = "provider_usage"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    date: Mapped[str] = mapped_column(String(16), index=True)  # YYYY-MM-DD
    requests: Mapped[int] = mapped_column(Integer, default=0)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Project(Base):
    """A client initiative bundling campaigns -> content -> assets.

    The top-level unit a human plans against: a project owns several
    campaigns, which in turn own content items and media assets.
    """

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    client: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="active")  # active | paused | archived
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MediaAsset(Base):
    """A media asset produced by an agent (image/video/3D/audio).

    Tracks the creating agent, the model, the exact prompt and a version so
    the assets workspace can browse/reuse past production.
    """

    __tablename__ = "media_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(16), index=True)  # image | video | 3d | audio
    title: Mapped[str] = mapped_column(String(255), default="")
    creator_agent: Mapped[str] = mapped_column(String(64), default="")
    model: Mapped[str] = mapped_column(String(128), default="")
    prompt: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[str] = mapped_column(String(512), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    project_id: Mapped[str] = mapped_column(String(36), default="")
    session_id: Mapped[str] = mapped_column(String(36), default="")  # originating chat session
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Mission(Base):
    """A persistent per-client marketing mission (autonomous company, §6-§14).

    The unit of autonomy: one mission = one client workspace that the OS
    keeps alive in the background. Status gates whether the autonomous loop
    runs scheduled cycles for it. ``workspace`` is the progressive state
    machine — intel → strategy → calendar → content → assets → results —
    revealed to the UI as it fills up. ``config`` holds per-client cadence,
    platforms, competitors and brand notes.
    """

    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    client: Mapped[str] = mapped_column(String(255), default="")
    goal: Mapped[str] = mapped_column(Text, default="")  # what this mission must achieve
    source_template: Mapped[str] = mapped_column(String(64), default="")  # template id that installed it (Phase 3)
    status: Mapped[str] = mapped_column(String(32), default="active")  # active | paused | archived
    cadence: Mapped[str] = mapped_column(String(16), default="daily")  # daily | weekly
    daily_time: Mapped[str] = mapped_column(String(16), default="08:30")  # HH:MM observe/analyze
    weekly_day: Mapped[str] = mapped_column(String(16), default="monday")  # full-cycle day
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # platforms, competitors, audience, brand_notes
    workspace: Mapped[dict] = mapped_column(JSON, default=dict)  # progressive state (intel/strategy/...)
    current_cycle: Mapped[str] = mapped_column(String(32), default="")  # last cycle type
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_daily_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_weekly_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instruction: Mapped[str] = mapped_column(Text, default="")  # live user steer (§15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class MissionRun(Base):
    """A single autonomous cycle executed for a mission (audit trail)."""

    __tablename__ = "mission_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    mission_id: Mapped[str] = mapped_column(String(36), index=True)
    cycle_type: Mapped[str] = mapped_column(String(32), default="daily")  # daily | weekly | event | manual
    status: Mapped[str] = mapped_column(String(32), default="running")  # running | completed | failed
    summary: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str] = mapped_column(Text, default="")
    task_id: Mapped[str] = mapped_column(String(64), default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)


class Approval(Base):
    """A human-in-the-loop approval gate (spec §18).

    Agents request approval before publishing/spending/importantly-deleting;
    a human reviews and either approves (then the referenced action runs) or
    rejects (then the agent is told to revise).
    """

    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(32), index=True)  # publish | spend | delete | edit
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | approved | rejected
    requested_by: Mapped[str] = mapped_column(String(64), default="")
    reviewed_by: Mapped[str] = mapped_column(String(64), default="")
    decision_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentInstruction(Base):
    """A persistent custom instruction the owner gave an agent (Phase 6).

    One row per agent key. Injected verbatim into the agent's system prompt at
    run time, so the team obeys it across chat, missions, schedules and the
    CEO's delegations until it is changed or cleared.
    """

    __tablename__ = "agent_instructions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    agent: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    instruction: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Teammate(Base):
    """A persistent AI teammate (Grok-style bot).

    A teammate is a configured agent persona with tools, memory access,
    autonomy level, and client/project permissions. Unlike a raw agent key,
    a teammate is a named, persistent entity the user hires and manages.
    """

    __tablename__ = "teammates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), index=True)
    role: Mapped[str] = mapped_column(String(64), default="")  # e.g. "Researcher", "Copywriter"
    agent_key: Mapped[str] = mapped_column(String(64), index=True)  # maps to AGENTS registry
    avatar: Mapped[str] = mapped_column(String(8), default="🤖")  # emoji or icon
    description: Mapped[str] = mapped_column(Text, default="")
    system_instructions: Mapped[str] = mapped_column(Text, default="")  # custom prompt
    model: Mapped[str] = mapped_column(String(128), default="")  # override model
    tools: Mapped[list[str]] = mapped_column(JSON, default=list)  # enabled tool keys
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)  # skill tags
    memory_scopes: Mapped[list[str]] = mapped_column(JSON, default=list)  # global|client|team|project|conversation
    client_access: Mapped[list[str]] = mapped_column(JSON, default=list)  # client names or ["*"]
    project_access: Mapped[list[str]] = mapped_column(JSON, default=list)  # project ids or ["*"]
    autonomy_level: Mapped[str] = mapped_column(String(32), default="ask")  # ask | independent | full
    routines: Mapped[list[str]] = mapped_column(JSON, default=list)  # routine IDs
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Team(Base):
    """A persistent team of teammates with a Chief coordinator."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    chief_id: Mapped[str] = mapped_column(String(36), nullable=True)  # Teammate ID
    member_ids: Mapped[list[str]] = mapped_column(JSON, default=list)  # Teammate IDs
    client_access: Mapped[list[str]] = mapped_column(JSON, default=list)
    project_access: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class TeammateActivity(Base):
    """Activity log for a teammate (what they did, when, with what result)."""

    __tablename__ = "teammate_activity"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    teammate_id: Mapped[str] = mapped_column(String(36), index=True)
    task_id: Mapped[str] = mapped_column(String(36), index=True, default="")
    action: Mapped[str] = mapped_column(String(64), default="")  # research, write, generate, delegate, etc.
    status: Mapped[str] = mapped_column(String(32), default="completed")  # running | completed | failed
    input_summary: Mapped[str] = mapped_column(Text, default="")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    activity_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Routine(Base):
    """A reusable workflow/skill that can be triggered on schedule or manually."""

    __tablename__ = "routines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    trigger: Mapped[str] = mapped_column(String(32), default="manual")  # manual | schedule | event
    schedule: Mapped[str] = mapped_column(String(128), default="")  # cron or interval
    teammate_id: Mapped[str] = mapped_column(String(36), nullable=True)  # assigned teammate
    team_id: Mapped[str] = mapped_column(String(36), nullable=True)  # or team
    instructions: Mapped[str] = mapped_column(Text, default="")
    tools: Mapped[list[str]] = mapped_column(JSON, default=list)
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    outputs: Mapped[dict] = mapped_column(JSON, default=dict)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class ApprovalRequest(Base):
    """A human-in-the-loop approval for consequential actions."""

    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    teammate_id: Mapped[str] = mapped_column(String(36), index=True)
    task_id: Mapped[str] = mapped_column(String(36), index=True, default="")
    kind: Mapped[str] = mapped_column(String(32), index=True)  # publish | spend | delete | external | data
    risk_level: Mapped[str] = mapped_column(String(16), default="medium")  # low | medium | high
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | approved | rejected | expired
    requested_by: Mapped[str] = mapped_column(String(64), default="")
    reviewed_by: Mapped[str] = mapped_column(String(64), default="")
    decision_note: Mapped[str] = mapped_column(Text, default="")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TalkRoom(Base):
    """A War Room: a live multi-agent chat where bots talk to each other
    and the owner can jump in, ping a bot, or kick a fresh round."""

    __tablename__ = "talk_rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), index=True)
    topic: Mapped[str] = mapped_column(Text, default="")  # the mission / question on the table
    mode: Mapped[str] = mapped_column(String(32), default="groq")  # groq | opencode
    thinking: Mapped[str] = mapped_column(String(32), default="deep")  # plain | deep | super
    speaker_keys: Mapped[list[str]] = mapped_column(JSON, default=list)  # agent registry keys, order = talk order
    chief_id: Mapped[str] = mapped_column(String(36), nullable=True)  # Teammate ID of the chief (optional)
    team_id: Mapped[str] = mapped_column(String(36), nullable=True)
    client: Mapped[str] = mapped_column(String(128), default="")  # business context, e.g. customer name
    status: Mapped[str] = mapped_column(String(32), default="idle")  # idle | round_running | paused
    created_by: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class TalkMessage(Base):
    """A single message inside a War Room. role = user | agent. When an agent
    speaks it carries its agent_key; thinking_stages record the visible
    super-thinking trail (draft → critique → refine) for that turn."""

    __tablename__ = "talk_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    room_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(16), index=True)  # user | agent | system
    speaker_key: Mapped[str] = mapped_column(String(64), index=True, default="")  # agent key when role=agent
    speaker_name: Mapped[str] = mapped_column(String(128), default="")
    content: Mapped[str] = mapped_column(Text)
    thinking_stages: Mapped[list[dict]] = mapped_column(JSON, default=list)  # [{stage, note}]
    model: Mapped[str] = mapped_column(String(128), default="")  # which model spoke
    addressed_to: Mapped[str] = mapped_column(String(128), default="")  # who this was addressed to
    round_number: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
