"""POST /chat/stt — Alfred cloud-STT proxy endpoint.

TestClient; Groq provider mocked (no network).
Covers: success, token gate, empty body, oversize, provider failure.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.main as main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "ensure_schema", lambda: None)
    monkeypatch.setattr(main, "ensure_admin_user", lambda: None)
    monkeypatch.setattr(main, "seed_business_knowledge", lambda: 0)
    monkeypatch.setattr(main, "seed_primary_project", lambda: None)
    monkeypatch.setattr(main, "start_autopilot", lambda: None)
    monkeypatch.setattr(main, "stop_autopilot", lambda: None)
    with TestClient(main.app) as c:
        yield c


def _settings(monkeypatch, token="tok-123", prod=False):
    import app.routers.chat as chat_router

    class _S:
        alfred_ingest_token = token
        is_prod = prod

    monkeypatch.setattr(chat_router, "get_settings", lambda: _S())


WAV = b"RIFF" + b"\x00" * 5000


def test_stt_success(client, monkeypatch):
    _settings(monkeypatch)
    import app.llm as llm

    monkeypatch.setattr(llm, "transcribe_audio", lambda b, timeout=30: "open notepad")
    r = client.post(
        "/api/v1/chat/stt",
        content=WAV,
        headers={"X-Alfred-Token": "tok-123", "Content-Type": "audio/wav"},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"text": "open notepad"}


def test_stt_bad_token(client, monkeypatch):
    _settings(monkeypatch)
    r = client.post(
        "/api/v1/chat/stt",
        content=WAV,
        headers={"X-Alfred-Token": "wrong"},
    )
    assert r.status_code == 403


def test_stt_empty_body(client, monkeypatch):
    _settings(monkeypatch)
    r = client.post(
        "/api/v1/chat/stt",
        content=b"",
        headers={"X-Alfred-Token": "tok-123"},
    )
    assert r.status_code == 400


def test_stt_oversize(client, monkeypatch):
    _settings(monkeypatch)
    r = client.post(
        "/api/v1/chat/stt",
        content=b"\x00" * (2 * 1024 * 1024 + 1),
        headers={"X-Alfred-Token": "tok-123"},
    )
    assert r.status_code == 413


def test_stt_provider_failure_is_502(client, monkeypatch):
    _settings(monkeypatch)
    import app.llm as llm

    def _boom(b, timeout=30):
        raise RuntimeError("groq STT failed: 401")

    calls = []

    def _fake(b, timeout=30):
        calls.append(1)
        if len(calls) < 2:
            raise RuntimeError("groq STT failed: 401")
        return "fallback worked"

    monkeypatch.setattr(llm, "transcribe_audio", _fake)

    monkeypatch.setattr(llm, "transcribe_audio", _boom)
    r = client.post(
        "/api/v1/chat/stt",
        content=WAV,
        headers={"X-Alfred-Token": "tok-123"},
    )
    assert r.status_code == 502
