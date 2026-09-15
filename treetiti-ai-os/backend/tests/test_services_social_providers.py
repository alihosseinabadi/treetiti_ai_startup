"""Unit tests for the SocialProvider abstraction (spec §10).

Agents must be able to trust ``provider.capabilities`` — unsupported
capabilities must raise, supported ones must work keylessly.
"""

from __future__ import annotations

import pytest

from app.services.social import (
    UnsupportedCapabilityError,
    get_provider,
    list_providers,
)


def test_all_spec_platforms_present():
    names = {p["name"] for p in list_providers()}
    assert {"instagram", "tiktok", "youtube", "linkedin", "x", "reddit"} <= names


def test_unknown_provider_returns_none():
    assert get_provider("myspace") is None


def test_capabilities_are_whitelisted():
    from app.services.social.providers import SOCIAL_CAPABILITIES

    for provider in list_providers():
        caps = set(provider["capabilities"])
        assert caps <= SOCIAL_CAPABILITIES


def test_unsupported_capability_raises():
    tg = get_provider("telegram")
    assert tg is not None
    with pytest.raises(UnsupportedCapabilityError):
        tg.search("hello")
    ig = get_provider("instagram")
    with pytest.raises(UnsupportedCapabilityError):
        ig.publish(text="hi")


def test_reddit_search_delegates(monkeypatch):
    reddit = get_provider("reddit")
    monkeypatch.setattr(
        "app.services.search.search_reddit",
        lambda *a, **k: [{"title": "post", "url": "https://x", "snippet": "s"}],
    )
    assert reddit is not None
    hits = reddit.search("marketing")
    assert hits and hits[0]["title"] == "post"


def test_telegram_publish_unconfigured_returns_ok_false(monkeypatch):
    tg = get_provider("telegram")
    monkeypatch.setattr(
        "app.services.social.telegram_send_message", lambda *a, **k: None
    )
    assert tg is not None
    assert tg.publish("hi") == {"ok": False, "error": "telegram not configured"}


def test_capability_guard_is_explicit_not_implicit():
    """Capabilities are declared, never guessed: no adapter claims publishing by default."""
    for name in ("instagram", "tiktok", "linkedin", "x"):
        provider = get_provider(name)
        assert provider is not None
        assert "publishing" not in provider.capabilities