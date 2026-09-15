"""Deep research engine (Phase 4) acceptance tests.

Drives the pipeline with injected fake tools + fake LLM so no network or
provider is required. Also exercises the router handlers against a FakeDb.
"""

from __future__ import annotations

import pytest

from app import research
from app.research import run_deep_research, report_markdown
from app.routers import research as research_router


class FakeRow:
    def __init__(self, **kw):
        self.__dict__.update(kw)
        self.created_at = kw.get("created_at")
        if self.created_at is None:
            from datetime import datetime, timezone

            self.created_at = datetime.now(timezone.utc)


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self):
        self.rows: dict[type, list] = {}

    def query(self, model):
        return FakeQuery(self.rows.get(model, []))

    def get(self, model, key):
        for r in self.rows.get(model, []):
            if getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        if not getattr(obj, "id", None):
            obj.id = f"id-{len(self.rows.get(type(obj), [])) + 1}"
        self.rows.setdefault(type(obj), []).append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def delete(self, obj):
        self.rows.get(type(obj), []).remove(obj)


FAKE_TOOLS = {
    "search_web": lambda q, max_results=5: [
        {"title": "Company A overview", "url": "https://a.example", "snippet": f"about {q} — snippet"},
        {"title": "Market report", "url": "https://b.example", "snippet": "growth numbers"},
    ],
    "search_news": lambda q, max_results=5: [
        {"title": "Latest news", "url": "https://news.example", "snippet": "breaking " + q, "source": "news"},
    ],
    "search_reddit": lambda q, max_results=5: [
        {"title": "reddit thread", "url": "https://reddit.example", "snippet": "user pain point", "source": "r/test"},
    ],
    "search_youtube": lambda q, max_results=5: [
        {"title": "video", "url": "https://youtube.example/watch?v=1", "snippet": "explainer", "source": "youtube"},
    ],
    "fetch_text": lambda url, max_chars=3000: f"page text for {url} " * 20,
    "analyze_competitor": lambda url, max_chars=3000: {"url": url, "home_preview": "comp text"},
}


def _fake_llm(system, prompt, **kwargs):
    return {
        "summary": "A thorough synthesis of the evidence.",
        "findings": [
            {"claim": "Claim one from evidence.", "source": "https://a.example", "confidence": "high", "type": "fact"},
            {"claim": "Claim two.", "source": "https://news.example", "confidence": "medium", "type": "inference"},
        ],
        "insights": ["Insight one.", "Insight two."],
        "recommendations": ["Recommendation one."],
    }


def test_run_deep_research_returns_structured_report():
    out = run_deep_research("luxury real estate marketing", tools=FAKE_TOOLS, llm_fn=_fake_llm, client="Acme")
    assert out["topic"] == "luxury real estate marketing"
    assert out["synthesis"] == "llm"
    assert "thorough synthesis" in out["summary"]
    assert len(out["findings"]) == 2
    assert out["findings"][0]["confidence"] == "high"
    assert len(out["sources"]) >= 2
    assert out["took_ms"] >= 0
    assert out["report_md"].startswith("# Deep Research")


def test_report_markdown_is_always_renderable():
    md = report_markdown({"topic": "T", "summary": "S", "findings": [{"claim": "c", "source": "u", "confidence": "high", "type": "fact"}], "sources": [{"title": "t", "url": "u"}], "synthesis": "llm"})
    assert "# Deep Research" in md
    assert "high · fact" in md
    assert "[t](u)" in md


def test_llm_failure_degrades_to_template_synthesis():
    def boom(system, prompt, **kwargs):
        raise RuntimeError("provider down")

    out = run_deep_research("some topic", tools=FAKE_TOOLS, llm_fn=boom)
    assert out["synthesis"] == "template"
    assert out["summary"]
    assert out["findings"]
    assert out["report_md"].startswith("# Deep Research")


def test_llm_garbage_degrades_gracefully():
    out = run_deep_research("topic", tools=FAKE_TOOLS, llm_fn=lambda s, p, **k: {"summary": ""})
    assert out["synthesis"] == "template"


def test_empty_topic_never_raises():
    out = run_deep_research("   ", tools=FAKE_TOOLS, llm_fn=_fake_llm)
    assert out["summary"] == "No topic provided."


def test_router_create_persists_report(monkeypatch):
    from app.models import ResearchReport

    db = FakeDb()
    monkeypatch.setattr(
        research_router,
        "_run_research",
        lambda topic, client, depth: run_deep_research(topic, tools=FAKE_TOOLS, llm_fn=_fake_llm, client=client, depth=depth),
    )
    res = research_router.create_report(
        research_router.ResearchCreate(topic="luxury marketing", context="customer:Acme", depth="quick"),
        FakeRow(email="x"),
        db,
    )
    assert res["client"] == "Acme"
    assert res["status"] == "completed"
    assert res["summary"]
    assert len(db.rows) > 0

    stored = db.rows[ResearchReport][0]
    assert stored.topic == "luxury marketing"
    assert stored.client == "Acme"
    assert stored.meta["synthesis"] == "llm"


def test_router_list_is_client_scoped():
    db = FakeDb()
    from app.models import ResearchReport

    db.add(ResearchReport(id="r-1", client="Acme", topic="a"))
    db.add(ResearchReport(id="r-2", client="Other", topic="b"))
    out = research_router.list_reports(FakeRow(email="x"), db, context="customer:Acme")
    assert out["context"] == "Acme"
    assert [r["id"] for r in out["reports"]] == ["r-1"]


def test_router_get_unknown_404():
    from fastapi import HTTPException

    db = FakeDb()
    with pytest.raises(HTTPException) as exc:
        research_router.get_report("nope", FakeRow(email="x"), db)
    assert exc.value.status_code == 404


def test_router_delete_removes_report():
    db = FakeDb()
    from app.models import ResearchReport

    row = ResearchReport(id="r-1", client="Acme", topic="a")
    db.add(row)
    research_router.delete_report("r-1", FakeRow(email="x"), db)
    assert len(db.rows[ResearchReport]) == 0