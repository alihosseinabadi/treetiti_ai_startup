"""TREEtiti AI Marketing OS — MCP server registry (Phase 5).

Model Context Protocol (MCP) servers give agents external tools. This module
manages the registered servers: list / register / unregister / probe and tool
discovery. Probes are honest and injectable for tests:

- stdio transport: checks the command binary is on PATH.
- sse/http transport: reports reachable only when the URL is present (a live
  handshake is intentionally not attempted from the registry so it stays fast
  and testable — a connector-style probe can be added later).
"""

from __future__ import annotations

import shutil
from typing import Any, Callable

from app.models import McpServer

STDIO = "stdio"
SSE = "sse"
HTTP = "http"

TRANSPORTS = (STDIO, SSE, HTTP)


def _server_dict(s: McpServer) -> dict[str, Any]:
    return {
        "id": s.id,
        "name": s.name,
        "transport": s.transport,
        "command": s.command,
        "args": s.args or [],
        "url": s.url,
        "tools": s.tools or [],
        "status": s.status,
        "last_error": s.last_error or "",
        "last_checked_at": s.last_checked_at.isoformat() if s.last_checked_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _now_utc():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


def register_mcp_server(
    name: str,
    *,
    transport: str = STDIO,
    command: str = "",
    args: list[str] | None = None,
    url: str = "",
    tools: list[dict[str, Any]] | None = None,
    db=None,
) -> McpServer:
    transport = transport.lower()
    if transport not in TRANSPORTS:
        raise ValueError(f"unsupported transport {transport!r}; use one of {list(TRANSPORTS)}")
    if transport == STDIO and not command.strip():
        raise ValueError("stdio MCP servers need a command")
    if transport in (SSE, HTTP) and not url.strip():
        raise ValueError(f"{transport} MCP servers need a url")
    server = McpServer(
        name=(name or command or url).strip(),
        transport=transport,
        command=command.strip(),
        args=[str(a) for a in (args or []) if str(a).strip()],
        url=(url or "").strip(),
        tools=tools or [],
        status="registered",
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return server


def list_mcp_servers(db) -> list[dict[str, Any]]:
    return [_server_dict(s) for s in db.query(McpServer).order_by(McpServer.name).all()]


def unregister_mcp_server(server_id: str, db) -> bool:
    server = db.get(McpServer, server_id)
    if server is None:
        return False
    db.delete(server)
    db.commit()
    return True


def _default_probe(s: McpServer) -> dict[str, Any]:
    if s.transport == STDIO:
        cmd = (s.command or "").split()[0] if s.command else ""
        if cmd and shutil.which(cmd):
            return {"status": "reachable", "message": f"binary {cmd!r} found on PATH"}
        return {"status": "unreachable", "message": f"binary {cmd or '(none)'!r} not found on PATH"}
    if s.url:
        return {"status": "reachable", "message": f"{s.transport.upper()} endpoint registered ({s.url})"}
    return {"status": "unreachable", "message": "no endpoint URL configured"}


def probe_mcp_server(
    server_id: str,
    db,
    probe: Callable[[McpServer], dict[str, Any]] | None = None,
) -> dict[str, Any]:
    server = db.get(McpServer, server_id)
    if server is None:
        raise KeyError(f"unknown MCP server {server_id!r}")
    result = (probe or _default_probe)(server)
    server.status = result.get("status", "registered")
    server.last_error = result.get("message", "")
    server.last_checked_at = _now_utc()
    db.commit()
    db.refresh(server)
    out = _server_dict(server)
    out["last_error"] = server.last_error
    return out