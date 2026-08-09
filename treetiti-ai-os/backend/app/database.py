"""TREEtiti AI Marketing OS — database connection (PostgreSQL + pgvector).

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


def _make_engine():
    settings = get_settings()
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Create the pgvector extension and all tables (idempotent)."""
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    from app import models  # noqa: F401  (registers tables)

    Base.metadata.create_all(bind=engine)

    # Lightweight column backfill for existing installs (idempotent).
    _ensure_column("image_prompts", "image_url", "VARCHAR(512)")
    _ensure_column("image_prompts", "status", "VARCHAR(32) DEFAULT 'ready'")
    _ensure_column("research_opportunities", "extra", "JSON DEFAULT '{}'::json")


def _ensure_column(table: str, column: str, ddl: str) -> None:
    """Add a column if it doesn't exist yet (PostgreSQL)."""
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
