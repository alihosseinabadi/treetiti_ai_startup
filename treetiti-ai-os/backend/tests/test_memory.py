"""Unit tests for memory-store helpers (no DB, no network)."""

from __future__ import annotations

from app.memory.store import _cosine, _hash_bag, _text_sim


def test_cosine_similar():
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert _cosine(a, b) == pytest_approx(1.0)


def test_cosine_orthogonal():
    assert _cosine([1.0, 0.0], [0.0, 1.0]) == pytest_approx(0.0)


def test_cosine_length_mismatch():
    assert _cosine([1.0], [1.0, 0.0]) == 0.0


def test_hash_bag_deterministic_and_normalized():
    v1 = _hash_bag("Treetiti AI agents automation")
    v2 = _hash_bag("Treetiti AI agents automation")
    assert v1 == v2
    assert len(v1) == 768
    import math

    norm = math.sqrt(sum(x * x for x in v1))
    assert norm == pytest_approx(1.0)


def test_text_sim():
    assert _text_sim("ai agents", "ai agents for business") > 0
    assert _text_sim("", "anything") == 0.0


def pytest_approx(value: float):
    import pytest

    return pytest.approx(value)
