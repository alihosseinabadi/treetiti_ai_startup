"""Treetiti AI Marketing OS — ORM models.

PostgreSQL + pgvector. Covers:
- brand knowledge (AI memory)
- content items + calendar
- leads (CRM)
- analytics snapshots
- chat sessions
- research opportunities
- image prompts / video concepts
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    TypeDecorator,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class _VectorCompat(TypeDecorator):
    """pgvector-compatible embedding column that also runs on SQLite.

    Postgres: delegates to pgvector.sqlalchemy.Vector(768).
    SQLite (local boot without Postgres): stores the vector as JSON.
    Search code already falls back to keyword matching when no vectors exist.
    """

    impl = JSON
    cache_ok = True

    def __init__(self, dim: int = 768):
        super().__init__()
        self.dim = dim
        self._pg = None
        try:
            from pgvector.sqlalchemy import Vector as _PgVector

            self._pg = _PgVector(dim)
        except Exception:  # noqa: BLE001
            self._pg = None

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and self._pg is not None:
            return self._pg
        return JSON()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and self._pg is not None:
            return value
        return list(value)

    def process_result_value(self, value, dialect):
        return value


Vector = _VectorCompat


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
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(64), default="chat")  # chat | telegram | api | manual
    tag: Mapped[str] = mapped_column(String(64), default="")  # optional extra tag
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
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


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


class BattleVote(Base):
    """A user's vote in an arena battle between two models."""

    __tablename__ = "battle_votes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    turn_index: Mapped[int] = mapped_column(Integer, default=0)
    model_a: Mapped[str] = mapped_column(String(255))
    model_b: Mapped[str] = mapped_column(String(255))
    winner: Mapped[str] = mapped_column(String(255))  # model the user picked
    judge_winner: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ScheduledJob(Base):
    """A recurring agent task the autopilot runs at a fixed time or interval."""

    __tablename__ = "scheduled_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    agent: Mapped[str] = mapped_column(String(64), index=True)  # agent key, e.g. "content"
    job_type: Mapped[str] = mapped_column(String(16), default="daily")  # daily | interval
    schedule_time: Mapped[str] = mapped_column(String(16), default="09:00")  # HH:MM for daily
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)  # for interval
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
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


class ArenaModel(Base):
    """A model in the self-driving arena — Elo-ranked by automatic battles.

    The arena discovers every model exposed by `opencode`, runs judge-evaluated
    battles between the champion and challengers in the background, and the
    system automatically routes all AI work to the current #1 model.
    """

    __tablename__ = "arena_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    model: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(32), default="opencode")  # opencode | zai | ollama
    elo: Mapped[float] = mapped_column(Float, default=1000.0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    battles: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_battle_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ArenaBattle(Base):
    """A single judge-evaluated battle in the self-driving arena."""

    __tablename__ = "arena_battles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    model_a: Mapped[str] = mapped_column(String(255))
    model_b: Mapped[str] = mapped_column(String(255))
    winner: Mapped[str] = mapped_column(String(255))
    question: Mapped[str] = mapped_column(Text, default="")
    judge: Mapped[str] = mapped_column(Text, default="")
    automatic: Mapped[bool] = mapped_column(Boolean, default=True)  # True = self-driven eval
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


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


class Project(Base):
    """A saved project (ChatGPT-style): chats + memories scoped to it."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class PluginState(Base):
    """Enable/disable + config for harness plugins (builtin or webhook)."""

    __tablename__ = "plugin_states"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    kind: Mapped[str] = mapped_column(String(16), default="builtin")  # builtin | webhook
    label: Mapped[str] = mapped_column(String(128), default="")
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # webhook: {url}
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
