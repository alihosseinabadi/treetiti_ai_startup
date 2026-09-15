"""API Connectors registry (Phase 5) acceptance tests — FakeDb, no network."""

from __future__ import annotations

import pytest

from app import connectors as mod
from app.connectors import CATALOG, configure_connector, list_connectors, sync_connector_catalog
from app.models import Connector

_test_connector_fn = mod.test_connector


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def order_by(self, *a, **k):
        return self

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self):
        self.rows: list[Connector] = []

    def query(self, model):
        return FakeQuery(self.rows)

    def get(self, model, key):
        for r in self.rows:
            if getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        if not any(getattr(r, "id", None) == getattr(obj, "id", None) for r in self.rows):
            self.rows.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        pass


def _mk(id, configured=False, config=None, status="missing"):
    return Connector(id=id, name=id, category="c", description="", capabilities=["x"], config=config or {}, configured=configured, last_status=status, last_error="")


def test_catalog_auto_seeds():
    db = FakeDb()
    created = sync_connector_catalog(db)
    assert created == len(CATALOG)
    out = list_connectors(db)
    ids = {c["id"] for c in out}
    assert {"telegram", "webhook", "supabase"} <= ids
    assert all(not c["configured"] for c in out)


def test_list_returns_connector_dicts():
    db = FakeDb()
    db.add(_mk("telegram", configured=True))
    out = {c["id"]: c for c in list_connectors(db)}
    assert out["telegram"]["configured"] is True
    assert out["telegram"]["last_status"] == "missing"  # test() not run yet


def test_configure_saves_keys():
    db = FakeDb()
    db.add(_mk("telegram"))
    out = configure_connector("telegram", {"bot_token": "abc", "chat_id": "@x"}, db)
    assert out["configured"] is True
    assert out["last_status"] == "configured"
    assert db.rows[0].config["bot_token"] == "abc"


def test_configure_unknown_raises():
    db = FakeDb()
    with pytest.raises(KeyError):
        configure_connector("nope", {}, db)


def test_test_configured_connector_reports_ok():
    db = FakeDb()
    db.add(_mk("webhook", configured=True, config={"url": "https://x"}))
    out = _test_connector_fn("webhook", db, probe=lambda c: {"status": "ok", "message": "configured"})
    assert out["last_status"] == "ok"
    assert db.rows[0].last_status == "ok"
    assert db.rows[0].last_checked_at is not None


def test_test_missing_connector_reports_missing():
    db = FakeDb()
    db.add(_mk("whatsapp"))
    out = _test_connector_fn("whatsapp", db, probe=lambda c: {"status": "missing", "message": "not configured"})
    assert out["last_status"] == "missing"


def test_default_probe_degrades_without_network(monkeypatch):
    db = FakeDb()
    c = _mk("telegram", configured=True, config={"bot_token": "tok"})
    db.add(c)
    monkeypatch.setattr(mod, "_default_probe", lambda conn: {"status": "ok", "message": "stubbed"})
    out = _test_connector_fn("telegram", db)
    assert out["last_status"] == "ok"


def test_test_unknown_raises():
    db = FakeDb()
    with pytest.raises(KeyError):
        _test_connector_fn("nope", db)