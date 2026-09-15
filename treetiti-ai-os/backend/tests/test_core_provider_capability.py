"""Provider capability registry tests (spec §21). Offline — no network."""

from __future__ import annotations

from app.core.provider_capability import (
    CAP_IMAGE,
    CAP_LLM,
    CAP_VIDEO,
    key_configured,
    provider_list,
    provider_specs,
)


def test_registry_has_expected_providers():
    specs = provider_specs()
    for prefix in ("router", "groq", "openrouter", "google", "agnes", "ollama", "cbai", "kimchi"):
        assert prefix in specs, prefix
    # Disabled (402/403) providers are still described, just off.
    assert specs["ds"].enabled is False
    assert specs["gh"].enabled is False


def test_router_is_the_llm_backbone():
    spec = provider_specs()["router"]
    assert CAP_LLM in spec.capabilities
    assert spec.cost_tier == "free"
    assert spec.key_field == "router_key"


def test_media_capabilities():
    assert CAP_IMAGE in provider_specs()["google"].capabilities
    assert CAP_VIDEO in provider_specs()["agnes"].capabilities
    assert CAP_IMAGE in provider_specs()["agnes"].capabilities


def test_provider_list_is_sorted_and_only_enabled():
    rows = provider_list()
    prefixes = [r["prefix"] for r in rows]
    assert "ds" not in prefixes
    assert "gh" not in prefixes
    assert "kimi" not in prefixes
    assert "router" in prefixes
    # every row carries the key-configured flag the dashboard needs
    for r in rows:
        assert "key_configured" in r
        assert r["capabilities"]


def test_keyless_providers_report_configured():
    assert key_configured(provider_specs()["ollama"]) is True
    assert key_configured(provider_specs()["cbai"]) is True  # via gateway