"""Unit tests for the search service (no network / no DB required)."""

from __future__ import annotations

from app.services.search import _clean_url


def test_clean_url_resolves_ddg_redirect():
    href = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpost"
    assert _clean_url(href) == "https://example.com/post"


def test_clean_url_passes_http_through():
    assert _clean_url("https://example.com") == "https://example.com"


def test_clean_url_rejects_junk():
    assert _clean_url("javascript:alert(1)") == ""
    assert _clean_url("") == ""
