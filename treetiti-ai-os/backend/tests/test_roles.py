"""Tests for role-based access control on the API.

`require_role` is a FastAPI dependency factory used to guard mutating endpoints
(agents.run, agents.create, settings.manage, etc.). We exercise the returned
checker directly with lightweight stub users so the tests need no database or
network.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.auth import require_role


def _user(role: str):
    return SimpleNamespace(role=role, email=f"{role}@example.com")


@pytest.mark.parametrize("role", ["viewer", "editor", "admin"])
def test_viewers_blocked_from_mutating_agents(role):
    checker = require_role("admin", "editor")
    user = _user(role)
    if role == "viewer":
        with pytest.raises(HTTPException) as exc:
            checker(user)
        assert exc.value.status_code == 403
    else:
        assert checker(user) is user


def test_editor_allowed_for_editor_plus():
    checker = require_role("admin", "editor")
    assert checker(_user("editor")) is not None
    assert checker(_user("admin")) is not None


def test_admin_only_blocks_editor():
    checker = require_role("admin")
    assert checker(_user("admin")) is not None
    with pytest.raises(HTTPException) as exc:
        checker(_user("editor"))
    assert exc.value.status_code == 403


def test_agents_run_endpoint_is_role_gated():
    """The POST /agents/run handler must reject viewers before any work runs."""
    import inspect

    import app.routers.agents as mod

    sig = inspect.signature(mod.run_agent_endpoint)
    user_anno = sig.parameters["user"].annotation
    from typing import Annotated

    as_str = user_anno.__repr__()
    assert "require_role" in as_str, f"agents/run not role-gated: {as_str}"


def test_agents_schedule_create_endpoint_is_role_gated():
    import inspect

    import app.routers.agents as mod

    sig = inspect.signature(mod.create_schedule)
    as_str = sig.parameters["user"].annotation.__repr__()
    assert "require_role" in as_str, f"agents/schedule not role-gated: {as_str}"


def test_agents_list_remains_auth_only():
    """Listing agents requires an authenticated viewer-or-higher role.

    Phase 0.1: every router enforces require_role; reads admit the
    viewer trio, mutations the editor duo.
    """
    import inspect

    import app.routers.agents as mod

    sig = inspect.signature(mod.list_agents)
    as_str = sig.parameters["user"].annotation.__repr__()
    assert "require_role" in as_str
    assert "viewer" in as_str

