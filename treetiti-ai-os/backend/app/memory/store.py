"""Treetiti AI Marketing OS — long-term memory store.

Stores brand knowledge, content memory and customer memory in PostgreSQL
with pgvector similarity search. Embeddings come from the same brain provider
(no paid embedding API required).
"""

from __future__ import annotations

import json
import logging
import subprocess
from typing import Any

from sqlalchemy import select, update

from app.config import get_settings
from app.database import SessionLocal
from app.models import BrandMemory, ContentItem, MemoryEntry

logger = logging.getLogger("treetiti.memory")


def _fast_embeddings() -> bool:
    """True only when a fast local embedding endpoint is configured.

    The opencode-CLI embedding path costs ~30s per call (spawns a full opencode
    run) — far too slow for live search. So we only use real vectors when a fast
    local provider (ollama) is available; otherwise we fall back to instant
    keyword similarity so searches and chat replies stay snappy.
    """
    return get_settings().llm_provider.lower() == "ollama"

# ---------------------------------------------------------------------------
# Embeddings (free, local-first)
# ---------------------------------------------------------------------------

def embed_text(text: str) -> list[float] | None:
    """Return a 768-d embedding using the brain provider.

    opencode path: ask the model to output a compact JSON embedding.
    ollama path:   use the nomic-embed-text / bge-m3 model via /api/embed.

    When only the slow opencode-CLI embedding path is available we skip
    vectors entirely (return None) so live search stays instant and stores
    degrade to keyword matching. Real vectors are only computed when a fast
    local provider is configured.
    """
    if not _fast_embeddings():
        return None
    settings = get_settings()
    try:
        if settings.llm_provider.lower() == "ollama":
            return _ollama_embed(text)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("embedding failed, storing without vector: %s", exc)
        return None


def _ollama_embed(text: str) -> list[float]:
    import urllib.request

    url = get_settings().ollama_base_url.rstrip("/") + "/api/embed"
    body = json.dumps({"model": "nomic-embed-text", "input": text}).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode())
    embeddings = payload.get("embeddings", [])
    if not embeddings:
        raise RuntimeError("ollama embed returned no vectors")
    return embeddings[0]


def _opencode_embed(text: str) -> list[float]:
    """Fallback embedding: have the model produce a JSON vector.

    Keeps the system fully free (no OpenAI embeddings). The vector is a
    deterministic 768-dim hashed-token bag if the model fails to produce JSON.
    """
    system = (
        "You are an embedding function. Return a JSON array of 64 floats "
        "(values between -1 and 1) representing the semantic content of the "
        "text. Respond with ONLY the JSON array."
    )
    from app.llm import _opencode_complete

    raw = _opencode_complete(system, text[:2000], get_settings().opencode_model, 0.0, 180)
    try:
        vec = json.loads(raw)
        if isinstance(vec, list) and vec and all(isinstance(x, (int, float)) for x in vec):
            return _pad(vec, 768)
    except Exception:  # noqa: BLE001
        pass
    return _hash_bag(text)


def _pad(vec: list[float], size: int) -> list[float]:
    if len(vec) >= size:
        return vec[:size]
    return vec + [0.0] * (size - len(vec))


def _hash_bag(text: str, dims: int = 768) -> list[float]:
    import math

    vec = [0.0] * dims
    for token in text.lower().split():
        h = abs(hash(token)) % dims
        vec[h] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


# ---------------------------------------------------------------------------
# Brand memory
# ---------------------------------------------------------------------------

def store_brand_memory(category: str, title: str, content: str, source: str = "manual") -> str:
    with SessionLocal() as db:
        item = BrandMemory(
            category=category,
            title=title,
            content=content,
            source=source,
            embedding=embed_text(content),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item.id


def search_brand_memory(query: str, category: str | None = None, limit: int = 5) -> list[dict]:
    """Semantic search over brand memory. Falls back to text search w/o embedding."""
    with SessionLocal() as db:
        stmt = select(BrandMemory).order_by(BrandMemory.created_at.desc())
        if category:
            stmt = stmt.where(BrandMemory.category == category)
        items = db.execute(stmt.limit(limit * 3)).scalars().all()

        # Filter by embedding similarity when available.
        query_emb = embed_text(query) if _fast_embeddings() else None
        scored: list[tuple[float, BrandMemory]] = []
        for item in items:
            if query_emb and item.embedding:
                try:
                    sim = _cosine(query_emb, item.embedding)
                except Exception:  # noqa: BLE001
                    sim = 0.0
            else:
                sim = _text_sim(query, item.content)
            scored.append((sim, item))

        scored.sort(key=lambda t: t[0], reverse=True)
        return [
            {
                "id": it.id,
                "category": it.category,
                "title": it.title,
                "content": it.content,
                "score": round(score, 4),
            }
            for score, it in scored[:limit]
        ]


def _cosine(a: list[float], b: list[float]) -> float:
    import math

    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


def _text_sim(query: str, content: str, title: str = "") -> float:
    q = set(query.lower().split())
    c = set(content.lower().split())
    if not q:
        return 0.0
    content_score = len(q & c) / len(q)
    if title:
        t = set(title.lower().split())
        title_score = len(q & t) / len(q) * 1.2
        return max(content_score, title_score)
    return content_score


# ---------------------------------------------------------------------------
# Content memory
# ---------------------------------------------------------------------------

def store_content_memory(item_id: str, text: str) -> None:
    with SessionLocal() as db:
        db.execute(
            update(ContentItem)
            .where(ContentItem.id == item_id)
            .values(embedding=embed_text(text))
        )
        db.commit()


def search_content_memory(query: str, limit: int = 5) -> list[dict]:
    with SessionLocal() as db:
        items = db.execute(
            select(ContentItem)
            .where(ContentItem.status.in_(["published", "approved"]))
            .order_by(ContentItem.created_at.desc())
            .limit(limit * 3)
        ).scalars().all()

        query_emb = embed_text(query) if _fast_embeddings() else None
        scored = []
        for item in items:
            if query_emb and item.embedding:
                try:
                    sim = _cosine(query_emb, item.embedding)
                except Exception:  # noqa: BLE001
                    sim = 0.0
            else:
                sim = _text_sim(query, item.body or "")
            scored.append((sim, item))

        scored.sort(key=lambda t: t[0], reverse=True)
        return [
            {
                "id": it.id,
                "platform": it.platform,
                "title": it.title,
                "body": it.body[:500],
                "score": round(score, 4),
            }
            for score, it in scored[:limit]
        ]


# ---------------------------------------------------------------------------
# RAG conversation memory (MemoryEntry)
# ---------------------------------------------------------------------------

def store_memory(
    content: str,
    kind: str = "fact",
    title: str = "",
    source: str = "chat",
    tag: str = "",
    project_id: str | None = None,
) -> str:
    """Persist a piece of long-term memory with an embedding for RAG recall."""
    with SessionLocal() as db:
        entry = MemoryEntry(
            kind=kind,
            title=title,
            content=content,
            source=source,
            tag=tag,
            project_id=project_id,
            embedding=embed_text(content),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry.id


def search_memory(query: str, kind: str | None = None, limit: int = 5,
                  project_id: str | None = None) -> list[dict]:
    """Semantic (RAG) search over memory entries. Falls back to text matching."""
    with SessionLocal() as db:
        stmt = select(MemoryEntry).order_by(MemoryEntry.created_at.desc())
        if kind:
            stmt = stmt.where(MemoryEntry.kind == kind)
        if project_id:
            stmt = stmt.where(MemoryEntry.project_id == project_id)
        rows = db.execute(stmt.limit(limit * 4)).scalars().all()

        query_emb = embed_text(query) if _fast_embeddings() else None
        scored: list[tuple[float, MemoryEntry]] = []
        for item in rows:
            if query_emb and item.embedding:
                try:
                    sim = _cosine(query_emb, item.embedding)
                except Exception:  # noqa: BLE001
                    sim = 0.0
            else:
                sim = _text_sim(query, item.content)
            scored.append((sim, item))
        scored.sort(key=lambda t: t[0], reverse=True)
        return [
            {
                "id": it.id,
                "kind": it.kind,
                "title": it.title,
                "content": it.content,
                "source": it.source,
                "tag": it.tag,
                "project_id": it.project_id,
                "score": round(score, 4),
            }
            for score, it in scored[:limit]
        ]


def remember_conversation(role: str, content: str, source: str = "chat",
                          project_id: str | None = None) -> str | None:
    """Auto-store an important user message (goals, preferences, instructions).

    Only stores messages that look like long-term signal (decisions, goals,
    preferences) — trivial small talk is skipped to avoid memory spam.
    Returns the memory id, or None if not worth remembering.
    """
    if role != "user":
        return None
    text = content.strip()
    if len(text) < 60:
        return None  # too short to be a durable memory

    triggers = (
        "we want", "we need", "our goal", "the goal is", "objective",
        "i want", "i need", "remember", "important", "always", "never",
        "make it", "it should", "we are", "our business", "branding",
        "campaign", "ugc", "data science", "cinematic", "prefer", "focus on",
    )
    if not any(t in text.lower() for t in triggers):
        return None
    kind = "goal" if any(t in text.lower() for t in ("goal", "objective", "we need", "our goal")) else "preference"
    return store_memory(text, kind=kind, title=text[:80], source=source, project_id=project_id)
