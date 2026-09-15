"""Unit tests for the research tool stack (spec §9) in services/search.py.

All network calls are monkeypatched: adapters must degrade gracefully (return
[] / "" / error dict) and normalize shapes without ever raising.
"""

from __future__ import annotations

from app.services import search


class _Resp:
    def __init__(self, body: str | bytes) -> None:
        self._body = body.encode() if isinstance(body, str) else body

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_search_news_normalizes(monkeypatch):
    html = (
        '<div class="result__body">'
        '<a class="result__a" href="https://example.com/a">Big Headline</a>'
        '<a class="result__snippet">The summary text</a>'
        '<a class="result__url">example.com</a></div>'
    )
    monkeypatch.setattr(search, "_get_html", lambda *a, **k: html)
    results = search.search_news("treetiti news")
    assert results and results[0]["title"] == "Big Headline"
    assert results[0]["source"] == "example.com"


def test_search_news_degrades_to_empty(monkeypatch):
    monkeypatch.setattr(search, "_get_html", lambda *a, **k: "")
    monkeypatch.setattr(search, "_search_bing", lambda *a, **k: [])
    assert search.search_news("nope") == []


def test_search_reddit_normalizes(monkeypatch):
    payload = {
        "data": {
            "children": [
                {"data": {"title": "A post", "url": "https://x", "permalink": "/r/x/1", "subreddit": "marketing", "selftext": "body"}}
            ]
        }
    }
    monkeypatch.setattr(search, "_get_json", lambda *a, **k: payload)
    hits = search.search_reddit("marketing")
    assert hits and hits[0]["source"] == "r/marketing"
    assert hits[0]["url"].startswith("https://www.reddit.com")


def test_search_reddit_degrades_to_empty(monkeypatch):
    monkeypatch.setattr(search, "_get_json", lambda *a, **k: None)
    assert search.search_reddit("anything") == []
    monkeypatch.setattr(search, "_get_json", lambda *a, **k: {"data": {}})
    assert search.search_reddit("anything") == []


def test_search_youtube_filters_to_watch_urls(monkeypatch):
    def fake_web(q, max_results=5):
        return [
            {"title": "video", "url": "https://www.youtube.com/watch?v=abc", "snippet": "s"},
            {"title": "channel", "url": "https://www.youtube.com/@chan", "snippet": "s"},
            {"title": "other", "url": "https://example.com/x", "snippet": "s"},
        ]

    monkeypatch.setattr(search, "search_web", fake_web)
    hits = search.search_youtube("ads")
    assert len(hits) == 1
    assert "watch" in hits[0]["url"]


def test_get_trends_normalizes(monkeypatch):
    monkeypatch.setattr(
        search, "search_web",
        lambda *a, **k: [{"title": "t", "url": "https://x", "snippet": "s"}],
    )
    hits = search.get_trends()
    assert hits and hits[0]["source"] == "trends"


def test_analyze_competitor_error_dict(monkeypatch):
    monkeypatch.setattr(search, "fetch_text", lambda *a, **k: "")
    out = search.analyze_competitor("https://competitor.com")
    assert out["error"]
    assert out["url"] == "https://competitor.com"


def test_analyze_competitor_summary(monkeypatch):
    monkeypatch.setattr(search, "fetch_text", lambda url, **k: "Some words here " * 40)
    out = search.analyze_competitor("https://competitor.com")
    assert "home_preview" in out
    assert out["word_count"] > 0