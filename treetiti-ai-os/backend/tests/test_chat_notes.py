"""POST /chat/sessions/{id}/notes — Alfred desktop ingest endpoint.

Real sqlite DB (ChatSession table only) + TestClient; no network.
Covers: append, idempotent retry, auth failures, 404, 400, truncation.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main
from app.database import get_db
from app.models import Base, ChatSession


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=[ChatSession.__table__])
    maker = sessionmaker(bind=engine)
    db = maker()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(monkeypatch, db_session):
    monkeypatch.setattr(main, "ensure_schema", lambda: None)
    monkeypatch.setattr(main, "ensure_admin_user", lambda: None)
    monkeypatch.setattr(main, "seed_business_knowledge", lambda: 0)
    monkeypatch.setattr(main, "seed_primary_project", lambda: None)
    monkeypatch.setattr(main, "start_autopilot", lambda: None)
    monkeypatch.setattr(main, "stop_autopilot", lambda: None)

    def _override():
        try:
            yield db_session
        finally:
            pass

    main.app.dependency_overrides[get_db] = _override
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()


def _settings(monkeypatch, token="", prod=False):
    import app.routers.chat as chat_router

    class _S:
        alfred_ingest_token = token
        is_prod = prod

    monkeypatch.setattr(chat_router, "get_settings", lambda: _S())


def _mk_session(db_session, messages=None):
    s = ChatSession(
        id="sess-1",
        title="t",
        messages=messages if messages is not None else [],
        context="tree",
    )
    db_session.add(s)
    db_session.commit()
    return s


def test_notes_append_and_persist(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    r = client.post(
        "/api/v1/chat/sessions/sess-1/notes",
        json={"text": "hello from desktop", "task_id": "t-9",
              "client_message_id": "m-1"},
        headers={"X-Alfred-Token": "tok123"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message_index"] == 0
    assert body["chars"] > 0
    assert body["duplicate"] is False
    assert body["truncated"] is False
    msgs = db_session.query(ChatSession).filter(
        ChatSession.id == "sess-1").first().messages
    assert msgs[0]["role"] == "assistant"
    assert msgs[0]["content"] == "hello from desktop"
    assert msgs[0]["task_id"] == "t-9"


def test_notes_idempotent_retry(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    payload = {"text": "same answer", "client_message_id": "m-dedupe"}
    h = {"X-Alfred-Token": "tok123"}
    r1 = client.post("/api/v1/chat/sessions/sess-1/notes", json=payload, headers=h)
    r2 = client.post("/api/v1/chat/sessions/sess-1/notes", json=payload, headers=h)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r2.json()["duplicate"] is True
    assert r2.json()["message_index"] == r1.json()["message_index"]
    msgs = db_session.query(ChatSession).filter(
        ChatSession.id == "sess-1").first().messages
    assert len(msgs) == 1


def test_notes_bad_token_rejected(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    r = client.post(
        "/api/v1/chat/sessions/sess-1/notes",
        json={"text": "x"},
        headers={"X-Alfred-Token": "wrong"},
    )
    assert r.status_code == 403


def test_notes_missing_token_rejected_when_configured(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    r = client.post("/api/v1/chat/sessions/sess-1/notes", json={"text": "x"})
    assert r.status_code == 403


def test_notes_unknown_session_404(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    r = client.post(
        "/api/v1/chat/sessions/nope/notes",
        json={"text": "x"},
        headers={"X-Alfred-Token": "tok123"},
    )
    assert r.status_code == 404


def test_notes_empty_text_400(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    r = client.post(
        "/api/v1/chat/sessions/sess-1/notes",
        json={"text": "   "},
        headers={"X-Alfred-Token": "tok123"},
    )
    assert r.status_code == 400


def test_notes_truncates_huge_text(client, db_session, monkeypatch):
    _settings(monkeypatch, token="tok123")
    _mk_session(db_session)
    r = client.post(
        "/api/v1/chat/sessions/sess-1/notes",
        json={"text": "z" * 21000},
        headers={"X-Alfred-Token": "tok123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["truncated"] is True
    assert body["chars"] > 20000


def test_notes_prod_without_token_forbidden(client, db_session, monkeypatch):
    _settings(monkeypatch, token="", prod=True)
    _mk_session(db_session)
    r = client.post(
        "/api/v1/chat/sessions/sess-1/notes", json={"text": "x"})
    assert r.status_code == 403
