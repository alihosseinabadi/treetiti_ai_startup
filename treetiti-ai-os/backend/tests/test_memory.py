"""Unit tests for memory-store helpers (no DB, no network)."""

from __future__ import annotations

from unittest.mock import patch

from app.memory.store import _cosine, _hash_bag, _text_sim, search_chat_history


def test_cosine_similar():
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert _cosine(a, b) == pytest_approx(1.0)


def test_cosine_orthogonal():
    assert _cosine([1.0, 0.0], [0.0, 1.0]) == pytest_approx(0.0)


def test_cosine_length_mismatch():
    assert _cosine([1.0], [1.0, 0.0]) == 0.0


def test_hash_bag_deterministic_and_normalized():
    v1 = _hash_bag("TREEtiti AI agents automation")
    v2 = _hash_bag("TREEtiti AI agents automation")
    assert v1 == v2
    assert len(v1) == 768
    import math

    norm = math.sqrt(sum(x * x for x in v1))
    assert norm == pytest_approx(1.0)


def test_text_sim():
    assert _text_sim("ai agents", "ai agents for business") > 0
    assert _text_sim("", "anything") == 0.0


class _FakeSession:
    def __init__(self, rows):
        self._rows = rows

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def query(self, model):
        return _FakeQuery(self._rows)

    def execute(self, *a, **k):
        return _FakeResult()


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def limit(self, n):
        return self

    def all(self):
        return self._rows


class _FakeResult:
    def scalars(self):
        return self

    def all(self):
        return []


class _FakeSessionRow:
    def __init__(self, id, title, messages, updated_at, archived=False):
        self.id = id
        self.title = title
        self.messages = messages
        self.updated_at = updated_at
        self.archived = archived


def test_search_chat_history_finds_relevant_past_session():
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    rows = [
        _FakeSessionRow(
            "sess-other",
            "Villa campaign talk",
            [{"role": "user", "content": "we want to launch a luxury villa instagram campaign"},
             {"role": "assistant", "content": "campaign created and scheduled"}],
            now,
        ),
        _FakeSessionRow(
            "sess-current",
            "Current chat",
            [{"role": "user", "content": "what is the weather today"}],
            now,
        ),
    ]
    with patch("app.memory.store.SessionLocal", lambda: _FakeSession(rows)):
        hits = search_chat_history("luxury villa instagram campaign", exclude_session_id="sess-current", limit=3)
    assert hits, "should recall the other session's campaign talk"
    assert hits[0]["session_id"] == "sess-other"
    assert "campaign" in hits[0]["excerpt"].lower()
    assert all(h["session_id"] != "sess-current" for h in hits)


def pytest_approx(value: float):
    import pytest

    return pytest.approx(value)
