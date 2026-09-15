"""MCP server registry (Phase 5) acceptance tests — FakeDb, no subprocess."""

from __future__ import annotations

import pytest

from app.mcp import list_mcp_servers, probe_mcp_server, register_mcp_server, unregister_mcp_server
from app.models import McpServer


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def order_by(self, *a, **k):
        return self

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self):
        self.rows: list[McpServer] = []

    def query(self, model):
        return FakeQuery(self.rows)

    def get(self, model, key):
        for r in self.rows:
            if getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        obj.id = f"mcp-{len(self.rows) + 1}"
        self.rows.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def delete(self, obj):
        self.rows.remove(obj)


def test_register_stdio_creates_server():
    db = FakeDb()
    s = register_mcp_server("Playwright", transport="stdio", command="npx @playwright/mcp@latest", args=["--headless"], db=db)
    assert s.transport == "stdio"
    assert s.status == "registered"
    assert s.args == ["--headless"]
    assert len(db.rows) == 1


def test_register_sse_requires_url():
    db = FakeDb()
    with pytest.raises(ValueError):
        register_mcp_server("x", transport="sse", db=db)


def test_register_stdio_requires_command():
    db = FakeDb()
    with pytest.raises(ValueError):
        register_mcp_server("x", transport="stdio", db=db)


def test_register_unsupported_transport_raises():
    db = FakeDb()
    with pytest.raises(ValueError):
        register_mcp_server("x", transport="carrier-pigeon", command="x", db=db)


def test_register_sse_accepts_url_and_tools():
    db = FakeDb()
    s = register_mcp_server("Data Broker", transport="sse", url="https://broker.example/sse", tools=[{"name": "lookup", "description": "lookup"}], db=db)
    assert s.url == "https://broker.example/sse"
    assert s.tools[0]["name"] == "lookup"


def test_list_and_unregister():
    db = FakeDb()
    register_mcp_server("A", transport="stdio", command="echo", db=db)
    register_mcp_server("B", transport="http", url="https://b.example", db=db)
    out = list_mcp_servers(db)
    assert len(out) == 2
    assert {s["name"] for s in out} == {"A", "B"}
    assert unregister_mcp_server("mcp-1", db) is True
    assert len(db.rows) == 1
    assert unregister_mcp_server("mcp-99", db) is False


def test_probe_with_injected_probe():
    db = FakeDb()
    register_mcp_server("A", transport="stdio", command="echo", db=db)
    out = probe_mcp_server("mcp-1", db, probe=lambda s: {"status": "reachable", "message": "stubbed"})
    assert out["status"] == "reachable"
    assert db.rows[0].status == "reachable"
    assert db.rows[0].last_checked_at is not None


def test_probe_unknown_raises():
    db = FakeDb()
    with pytest.raises(KeyError):
        probe_mcp_server("nope", db)