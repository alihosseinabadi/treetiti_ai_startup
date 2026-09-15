"""TREEtiti AI Marketing OS — long-term memory store.

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
    scope: str = "global",
    scope_id: str = "",
) -> str:
    """Persist a piece of long-term memory with an embedding for RAG recall."""
    with SessionLocal() as db:
        entry = MemoryEntry(
            kind=kind,
            title=title,
            content=content,
            source=source,
            tag=tag,
            scope=scope,
            scope_id=scope_id,
            embedding=embed_text(content),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry.id


def search_memory(query: str, kind: str | None = None, limit: int = 5, scope: str | None = None, scope_id: str | None = None) -> list[dict]:
    """Semantic (RAG) search over memory entries. Falls back to text matching."""
    with SessionLocal() as db:
        stmt = select(MemoryEntry).order_by(MemoryEntry.created_at.desc())
        if kind:
            stmt = stmt.where(MemoryEntry.kind == kind)
        if scope:
            stmt = stmt.where(MemoryEntry.scope == scope)
        if scope_id:
            stmt = stmt.where(MemoryEntry.scope_id == scope_id)
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
                "score": round(score, 4),
            }
            for score, it in scored[:limit]
        ]


def remember_conversation(role: str, content: str, source: str = "chat") -> str | None:
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
    return store_memory(text, kind=kind, title=text[:80], source=source)


def delete_memory(memory_id: str) -> bool:
    """Remove a stored memory entry by id. Returns True if deleted."""
    from sqlalchemy import delete as sa_delete

    with SessionLocal() as db:
        result = db.execute(sa_delete(MemoryEntry).where(MemoryEntry.id == memory_id))
        db.commit()
        return result.rowcount > 0


def find_memory_to_forget(query: str, limit: int = 3) -> list[dict]:
    """Best-effort lookup of the memory the user most likely wants to forget."""
    return search_memory(query, limit=limit)


# ---------------------------------------------------------------------------
# Scoped memory convenience functions
# ---------------------------------------------------------------------------

def store_global_memory(content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="global")

def store_client_memory(client_name: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="client", scope_id=client_name)

def store_team_memory(team_id: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="team", scope_id=team_id)

def store_teammate_memory(teammate_id: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="teammate", scope_id=teammate_id)

def store_project_memory(project_id: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="project", scope_id=project_id)

def store_conversation_memory(session_id: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="conversation", scope_id=session_id)

def store_task_memory(task_id: str, content: str, kind: str = "fact", title: str = "", source: str = "chat", tag: str = "") -> str:
    return store_memory(content, kind, title, source, tag, scope="task", scope_id=task_id)


def search_global_memory(query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="global")

def search_client_memory(client_name: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="client", scope_id=client_name)

def search_team_memory(team_id: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="team", scope_id=team_id)

def search_teammate_memory(teammate_id: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="teammate", scope_id=teammate_id)

def search_project_memory(project_id: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="project", scope_id=project_id)

def search_conversation_memory(session_id: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="conversation", scope_id=session_id)

def search_task_memory(task_id: str, query: str, kind: str | None = None, limit: int = 5) -> list[dict]:
    return search_memory(query, kind, limit, scope="task", scope_id=task_id)


# ---------------------------------------------------------------------------
# Cross-session chat recall (remember ALL chats, not just the current one)
# ---------------------------------------------------------------------------

def search_chat_history(query: str, exclude_session_id: str = "", limit: int = 5) -> list[dict]:
    """Recall relevant past conversations from ALL chat sessions.

    The chat brain should remember what was discussed in any earlier session,
    not just the one it is currently in. This scans every non-archived session's
    messages and returns the most relevant exchanges for the current question.

    Returns: [{session_id, title, session_updated_at, excerpt, score}]
    """
    from app.models import ChatSession

    with SessionLocal() as db:
        rows = (
            db.query(ChatSession)
            .filter(ChatSession.archived.is_(False))
            .order_by(ChatSession.updated_at.desc())
            .limit(limit * 6)
            .all()
        )
        query_emb = embed_text(query) if _fast_embeddings() else None
        scored: list[tuple[float, ChatSession, str]] = []
        for s in rows:
            if s.id == exclude_session_id:
                continue
            for m in (s.messages or []):
                if not isinstance(m, dict) or not m.get("content"):
                    continue
                text = str(m["content"])
                if len(text) < 20 or len(text) > 4000:
                    continue
                if query_emb:
                    sim = _cosine(query_emb, m.get("embedding") or []) if m.get("embedding") else _text_sim(query, text)
                else:
                    sim = _text_sim(query, text)
                if sim > 0.05:
                    excerpt = text if len(text) <= 220 else text[:220] + "…"
                    scored.append((sim, s, excerpt))
        scored.sort(key=lambda t: t[0], reverse=True)
        return [
            {
                "session_id": s.id,
                "title": s.title,
                "session_updated_at": s.updated_at.isoformat() if s.updated_at else "",
                "excerpt": excerpt,
                "score": round(score, 4),
            }
            for score, s, excerpt in scored[:limit]
        ]
