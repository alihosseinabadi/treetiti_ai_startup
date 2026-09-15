"""Unit tests for core.tool_registry: Tool Pool + Router + FREE_ONLY (spec §19-§22)."""

from __future__ import annotations

from app.core.tool_registry import COST_PAID, ToolRegistry, ToolResult, ToolSpec


def _tool(name: str, capability: str = "search_web", cost: str = "free", outcome="ok") -> ToolSpec:
    def _run(**kw):
        if outcome == "raise":
            raise RuntimeError(f"tool {name} exploded")
        return f"{name}:{kw}"

    return ToolSpec(
        name=name,
        capability=capability,
        category="research" if capability in ("search_web", "fetch_page") else "utility",
        cost_tier=cost,
        execute=_run,
    )


def _registry() -> ToolRegistry:
    reg = ToolRegistry(
        [
            _tool("http_search"),
            _tool("playwright_search"),
            _tool("paid_search", cost=COST_PAID),
        ]
    )
    return reg


def test_resolve_ranked_free_only():
    reg = _registry()
    chain = reg.fallback_chain("search_web", free_only=True)
    assert "paid_search" not in chain
    assert chain[0] in {"http_search", "playwright_search"}


def test_resolve_allows_paid_when_flag_off():
    reg = _registry()
    assert "paid_search" in reg.fallback_chain("search_web", free_only=False)


def test_execute_runs_best_tool():
    reg = _registry()
    res = reg.execute("search_web", agent_key="market_research", args={"q": "treetiti"})
    assert res.ok is True
    assert "http_search" in res.attempts
    assert res.tool in {"http_search", "playwright_search"}


def test_execute_falls_back_on_failure():
    reg = ToolRegistry(
        [
            _tool("a_broken", outcome="raise"),
            _tool("b_working"),
        ]
    )
    res = reg.execute("search_web", args={"q": "x"})
    assert res.ok is True
    assert res.tool == "b_working"
    assert res.attempts == ["a_broken", "b_working"]


def test_execute_all_fail_returns_result_not_exception():
    reg = ToolRegistry([_tool("a_broken", outcome="raise")])
    res = reg.execute("search_web", args={})
    assert res.ok is False
    assert res.error


def test_execute_respects_max_attempts():
    reg = ToolRegistry([_tool("a", outcome="raise"), _tool("b", outcome="raise"), _tool("c", outcome="raise")])
    res = reg.execute("search_web", args={}, max_attempts=2)
    assert res.ok is False
    assert len(res.attempts) <= 2


def test_execute_checked_against_agent_permissions():
    """Sales has no search capability → search tool must be filtered out."""
    reg = _registry()
    chain = reg.fallback_chain("search_web", agent_key="sales")
    assert chain == []


def test_tool_metadata_fields_present():
    spec = _tool("http_search")
    assert spec.authentication == "none"
    assert 0 <= spec.reliability_score <= 1
    assert 0 <= spec.latency_score <= 1
    assert spec.enabled is True


def test_duplicate_register_rejected():
    reg = _registry()
    try:
        reg.register(_tool("http_search"))
        raised = False
    except KeyError:
        raised = True
    assert raised


# --------------------------------------------------------------------------
# Bundled research + social tools (spec §9, §10, §22)
# --------------------------------------------------------------------------


def test_bundled_research_capabilities_available():
    from app.core.tool_registry import get_registry

    reg = get_registry()
    for capability in ("search_web", "search_news", "search_reddit",
                       "search_youtube", "get_trends", "analyze_competitor",
                       "search_social", "publish_post"):
        assert reg.fallback_chain(capability, free_only=True), capability


def test_bundled_fallback_chain_prefers_specialist():
    from app.core.tool_registry import get_registry

    chain = get_registry().fallback_chain("search_news", free_only=True)
    assert chain[0] == "news_search"


def test_research_agent_can_execute_reddit_search(monkeypatch):
    from app.core.tool_registry import get_registry

    monkeypatch.setattr(
        "app.services.search.search_reddit",
        lambda *a, **k: [{"title": "x", "url": "https://x", "snippet": "s"}],
    )
    res = get_registry().execute("search_reddit", agent_key="research", args={"query": "ads"})
    assert res.ok is True
    assert res.tool == "reddit_search"


def test_social_research_tool_aggregates_providers(monkeypatch):
    from app.core.tool_registry import get_registry

    monkeypatch.setattr("app.services.search.search_reddit",
                        lambda *a, **k: [{"title": "r", "url": "u", "snippet": "s"}])
    monkeypatch.setattr("app.services.search.search_youtube",
                        lambda *a, **k: [{"title": "y", "url": "u", "snippet": "s"}])
    res = get_registry().execute("search_social", agent_key="research", args={"query": "ads"})
    assert res.ok is True
    assert res.tool == "social_research"
    assert len(res.value) == 2