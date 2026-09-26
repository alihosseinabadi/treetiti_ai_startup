"""TREEtiti AI Marketing OS — database connection (PostgreSQL + pgvector + SQLite).

The engine is created at import but nothing connects until a session is used
or ensure_schema() is called. This keeps unit tests (and tooling that only
imports the app) working without a running database.
"""

from __future__ import annotations

import logging

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

logger = logging.getLogger("treetiti.database")


class Base(DeclarativeBase):
    pass


def _make_engine():
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    if "sqlite" in settings.database_url:
        # WAL mode + busy timeout: concurrent agent threads and dashboard
        # polling otherwise hit "database is locked" on SQLite.
        from sqlalchemy import event

        @event.listens_for(engine, "connect")
        def _sqlite_wal(dbapi_conn, _record):  # noqa: ANN202
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=15000")
            cursor.close()

    return engine


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _is_postgresql() -> bool:
    """Check if we're using PostgreSQL."""
    return "postgresql" in str(engine.url)


def _is_sqlite() -> bool:
    """Check if we're using SQLite."""
    return "sqlite" in str(engine.url)


def ensure_schema() -> None:
    """Create the pgvector extension and all tables (idempotent)."""
    with engine.begin() as conn:
        if _is_postgresql():
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # SQLite doesn't need pgvector extension
    
    from app import models  # noqa: F401  (registers tables)

    Base.metadata.create_all(bind=engine)

    # Lightweight column backfill for existing installs (idempotent).
    # Only run for PostgreSQL - SQLite handles schema via metadata.create_all
    if _is_postgresql():
        _ensure_column("image_prompts", "image_url", "VARCHAR(512)")
        _ensure_column("image_prompts", "status", "VARCHAR(32) DEFAULT 'ready'")
        _ensure_column("research_opportunities", "extra", "JSON DEFAULT '{}'::json")
        _ensure_column("chat_sessions", "context", "VARCHAR(64) DEFAULT ''")
        _ensure_column("chat_sessions", "project_id", "VARCHAR(36) DEFAULT ''")
        _ensure_column("chat_sessions", "archived", "BOOLEAN DEFAULT false")
        _ensure_column("chat_sessions", "session_state", "JSON DEFAULT '{}'::json")
        _ensure_column("media_assets", "session_id", "VARCHAR(36) DEFAULT ''")
        _ensure_column("scheduled_jobs", "name", "VARCHAR(255) DEFAULT ''")
        _ensure_column("scheduled_jobs", "archived", "BOOLEAN DEFAULT false")
        _ensure_column("scheduled_jobs", "client", "VARCHAR(255) DEFAULT ''")
        _ensure_column("scheduled_jobs", "project_id", "VARCHAR(36) DEFAULT ''")
        _ensure_column("missions", "source_template", "VARCHAR(64) DEFAULT ''")
        _ensure_column("projects", "pinned", "BOOLEAN DEFAULT false")


def _ensure_column(table: str, column: str, ddl: str) -> None:
    """Add a column if it doesn't exist yet (PostgreSQL)."""
    if _is_sqlite():
        return  # SQLite handles schema via metadata.create_all
    
    with engine.begin() as conn:
        exists = conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ),
            {"t": table, "c": column},
        ).fetchone()
        if not exists:
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {ddl}'))
            logger.info("added column %s.%s", table, column)
