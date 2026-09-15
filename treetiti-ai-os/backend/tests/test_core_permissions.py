"""Unit tests for core.permissions (spec §32)."""

from __future__ import annotations

import pytest

from app.core.permissions import (
    DEFAULT_PERMISSIONS,
    PermissionDeniedError,
    can,
    capabilities_of,
    load_all,
    require,
    require_human_approval,
    validate_request,
)


def test_spec_matrix_sales_cannot_send():
    assert can("sales", "lead_read")
    assert can("sales", "draft_message")
    assert not can("sales", "send_message")
    assert require_human_approval("send_message")


def test_developer_levels():
    assert can("developer", "read_code")
    assert can("developer", "modify_code")
    assert not can("developer", "deploy") or require_human_approval("deploy")


def test_ceo_delegates_but_not_publish():
    assert can("ceo", "orchestrate")
    assert can("ceo", "delegate")
    assert not can("ceo", "publish")
    assert require_human_approval("publish")


def test_research_never_publishes():
    assert can("market_research", "search")
    assert can("market_research", "scrape")
    assert not can("market_research", "publish")


def test_require_raises():
    require("content", "content_create")  # must not raise
    with pytest.raises(PermissionDeniedError):
        require("content", "deploy")


def test_unknown_capability_rejected():
    with pytest.raises(ValueError):
        can("content", "not_a_real_capability")


def test_capabilities_never_exceed_defined_set():
    for agent in DEFAULT_PERMISSIONS:
        caps = capabilities_of(agent)
        assert caps <= frozenset(DEFAULT_PERMISSIONS[agent])


def test_load_all_covers_spec_agents():
    perms = load_all()
    for key in ("market_research", "content", "brand", "editor", "sales", "developer", "ceo"):
        assert key in perms
    assert perms["sales"].denied == {"send_message"}


def test_validate_request():
    validate_request("analytics", "analytics")
    with pytest.raises(PermissionDeniedError):
        validate_request("analytics", "deploy")