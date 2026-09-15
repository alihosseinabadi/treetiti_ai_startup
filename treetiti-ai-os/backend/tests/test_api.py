"""API smoke tests. No database/network required.

The app's lifespan (ensure_schema + ensure_admin_user) is patched out so these
tests run anywhere.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

import app.main as main


def _client(monkeypatch) -> TestClient:
    monkeypatch.setattr(main, "ensure_schema", lambda: None)
    monkeypatch.setattr(main, "ensure_admin_user", lambda: None)
    monkeypatch.setattr(main, "seed_business_knowledge", lambda: 0)
    monkeypatch.setattr(main, "seed_primary_project", lambda: None)
    monkeypatch.setattr(main, "start_autopilot", lambda: None)
    monkeypatch.setattr(main, "stop_autopilot", lambda: None)
    return TestClient(main.app)


def test_health(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_protected_route_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.post("/api/v1/chat", json={"message": "hi"})
    assert resp.status_code == 401


def test_agents_list_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/agents")
    assert resp.status_code == 401


def test_memory_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/memory")
    assert resp.status_code == 401


def test_tasks_list_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/tasks")
    assert resp.status_code == 401


def test_missions_list_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/missions")
    assert resp.status_code == 401


def test_clients_list_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/clients")
    assert resp.status_code == 401


def test_clients_detail_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/clients/Acme")
    assert resp.status_code == 401
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/stream")
    assert resp.status_code == 401


def test_customer_context_block_degrades_gracefully():
    """No DB available in smoke tests -> still returns the client name."""
    from app.routers.chat import _customer_context_block, _system_prompt

    block = _customer_context_block("Marina Tower")
    assert "CUSTOMER: Marina Tower" in block
    prompt = _system_prompt("build me a campaign", "customer:Marina Tower")
    assert "Customer CEO" in prompt
    assert "Marina Tower" in prompt
    tree_prompt = _system_prompt("build me a campaign")
    assert "TREEtiti CEO" in tree_prompt


def test_deliberate_refine_critiques_then_rewrites(monkeypatch):
    """Brain pass 2 asks for weaknesses, then rewrites fixing them."""
    import app.routers.chat as chat

    calls: list[str] = []
    model = "mock-model"

    def fake_complete(system, prompt, **kwargs):
        calls.append(prompt)
        if "You are a ruthless critic" in prompt:
            return "1. Too vague. 2. Missing a call to action."
        return "REFINED: sharp answer with a CTA."

    monkeypatch.setattr(chat, "llm_complete", fake_complete)
    monkeypatch.setattr(chat, "_chat_model", lambda: model)
    result = chat._deliberate_refine("write an ad", "VAGUE: draft", "system")
    assert result == "REFINED: sharp answer with a CTA."
    assert len(calls) == 2
    assert "1. Too vague" in calls[1]


def test_deliberate_refine_propagates_provider_failure(monkeypatch):
    """A dead provider propagates so the caller keeps the draft."""
    import app.routers.chat as chat

    def boom(system, prompt, **kwargs):
        raise RuntimeError("providers unreachable")

    monkeypatch.setattr(chat, "llm_complete", boom)
    monkeypatch.setattr(chat, "_chat_model", lambda: "mock-model")
    try:
        chat._deliberate_refine("write an ad", "draft", "system")
    except RuntimeError:
        pass
    else:  # pragma: no cover
        raise AssertionError("expected RuntimeError to propagate")


def test_providers_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/providers")
    assert resp.status_code == 401


def test_provider_health_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/providers/health")
    assert resp.status_code == 401


def test_provider_usage_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/providers/usage")
    assert resp.status_code == 401


def test_projects_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/projects")
    assert resp.status_code == 401


def test_assets_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/assets")
    assert resp.status_code == 401


def test_campaigns_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/campaigns")
    assert resp.status_code == 401


def test_approvals_requires_auth(monkeypatch):
    with _client(monkeypatch) as client:
        resp = client.get("/api/v1/approvals")
    assert resp.status_code == 401
