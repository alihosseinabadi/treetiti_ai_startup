"""Treetiti AI Marketing OS — database connection (PostgreSQL + pgvector).

The engine is created at import but nothing connects until a session is used
or ensure_schema() is called. This keeps unit tests (and tooling that only
imports the app) working without a running database.
"""

from __future__ import annotations

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

logger = logging.getLogger("treetiti.database")


class Base(DeclarativeBase):
    pass


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def _make_engine():
    from pathlib import Path as _P  # local import: keeps module import light

    settings = get_settings()
    url = settings.database_url
    if not _is_sqlite(url):
        # Try Postgres; fall back to a local SQLite file when unreachable
        # (local boot without docker). Postgres remains the production path.
        try:
            eng = create_engine(url, pool_pre_ping=True, pool_size=10, max_overflow=20)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("database: postgres reachable")
            return eng
        except Exception as exc:  # noqa: BLE001
            logger.warning("database: postgres unreachable (%s) -> sqlite fallback", exc)
            url = f"sqlite:///{_P(__file__).resolve().parent.parent / 'treetiti_local.db'}"
    return create_engine(url, pool_pre_ping=False, connect_args={"check_same_thread": False})


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Create the pgvector extension and all tables (idempotent).

    SQLite fallback: skips the extension, creates tables, skips the
    Postgres-specific backfill (fresh tables already include the columns).
    """
    sqlite = _is_sqlite(str(engine.url))
    if not sqlite:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    from app import models  # noqa: F401  (registers tables)

    Base.metadata.create_all(bind=engine)

    if sqlite:
        # Backfill new columns on existing local DBs (SQLite has no IF NOT EXISTS
        # for ADD COLUMN — check PRAGMA first).
        _ensure_column("memory_entries", "project_id", "VARCHAR(36)")
        _ensure_column("chat_sessions", "project_id", "VARCHAR(36)")
        return
    # Lightweight column backfill for existing installs (idempotent).
    _ensure_column("image_prompts", "image_url", "VARCHAR(512)")
    _ensure_column("image_prompts", "status", "VARCHAR(32) DEFAULT 'ready'")
    _ensure_column("research_opportunities", "extra", "JSON DEFAULT '{}'::json")


def _ensure_column(table: str, column: str, ddl: str) -> None:
    """Add a column if it doesn't exist yet (PostgreSQL + SQLite)."""
    with engine.begin() as conn:
        if _is_sqlite(str(engine.url)):
            cols = [r[1] for r in conn.execute(text(f'PRAGMA table_info("{table}")')).fetchall()]
            if column not in cols:
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {ddl}'))
                logger.info("added column %s.%s", table, column)
            return
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
