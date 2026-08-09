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
    monkeypatch.setattr(main, "start_autopilot", lambda: None)
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
