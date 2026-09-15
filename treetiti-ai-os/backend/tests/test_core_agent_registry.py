"""Unit tests for core.agent_registry (spec §32, plan §D)."""

from __future__ import annotations

import pytest

from app.core.agent_registry import (
    AgentRegistry,
    AgentSpec,
    DEPARTMENTS,
    STATUS_IMPLEMENTED,
    STATUS_PLANNED,
    get_registry,
)


def _spec(key: str = "x", department: str = "research", **kw) -> AgentSpec:
    kw.setdefault("status", STATUS_IMPLEMENTED)
    return AgentSpec(key=key, name=key.title(), role="does things", department=department, phase=2, **kw)


def test_full_matrix_has_19_agents():
    reg = get_registry()
    assert len(reg.all()) == 19


def test_matrix_covers_all_departments():
    reg = get_registry()
    assert {a.department for a in reg.all()} == set(DEPARTMENTS)


def test_implemented_agents_match_runtime():
    from app.agents import AGENTS

    reg = get_registry()
    implemented_keys = {a.key for a in reg.implemented()}
    runtime_keys = set(AGENTS.keys())
    # Every agent marked implemented must actually exist in the runtime. The
    # runtime may hold extra legacy agents not part of the 19-agent matrix.
    assert implemented_keys <= runtime_keys
    core = {"market_research", "content", "image", "video", "editor", "analytics", "brand"}
    assert core <= implemented_keys


def test_duplicate_register_rejected():
    reg = AgentRegistry([_spec(key="a")])
    with pytest.raises(KeyError):
        reg.register(_spec(key="a"))


def test_invalid_department_rejected():
    with pytest.raises(ValueError):
        AgentSpec(key="x", name="X", role="r", department="nope", phase=2)


def test_activation_flow():
    reg = AgentRegistry([_spec(key="a", status=STATUS_PLANNED), _spec(key="b")])
    assert reg.activate("a") is True
    assert reg.activate("missing") is False
    assert {a.key for a in reg.active()} == {"a", "b"}
    reg.deactivate("a")
    assert {a.key for a in reg.active()} == {"b"}


def test_resolve_by_capability():
    reg = AgentRegistry(
        [
            _spec(key="r", capabilities=("search", "fetch_url")),
            _spec(key="c", capabilities=("content_create",)),
        ]
    )
    team = reg.resolve(capabilities=("fetch_url",))
    assert {a.key for a in team} == {"r"}


def test_resolve_by_skill_any_match():
    reg = AgentRegistry(
        [_spec(key="r", skills=("market_research", "seo")), _spec(key="w", skills=())]
    )
    team = reg.resolve(skills=("seo", "growth"))
    assert {a.key for a in team} == {"r"}


def test_resolve_filters_planned_by_default():
    reg = AgentRegistry(
        [_spec(key="p", status=STATUS_PLANNED, capabilities=("search",)),
         _spec(key="i", status=STATUS_IMPLEMENTED, capabilities=("search",))]
    )
    team = reg.resolve(capabilities=("search",))
    assert [a.key for a in team] == ["i"]
    both = reg.resolve(capabilities=("search",), implemented_only=False)
    assert {a.key for a in both} == {"p", "i"}


def test_resolve_by_department():
    reg = get_registry()
    research = reg.resolve(department="research")
    assert research and all(a.department == "research" for a in research)


def test_to_dicts_sorted_and_serializable():
    reg = get_registry()
    rows = reg.to_dicts()
    assert len(rows) == 19
    first = rows[0]
    assert set(first) >= {"key", "name", "role", "department", "phase", "model_profile", "status"} 