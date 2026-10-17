"""MCPConnector protocol tests — real stdio subprocess, no mocks.

Spawns a minimal fake MCP server (newline-delimited JSON-RPC) and drives
connect → list_tools → call_tool → disconnect against it, plus failure
modes: crash on startup, bad binary, JSON-RPC errors, timeouts, and
unimplemented transports.
"""

from __future__ import annotations

import asyncio
import json
import sys

import pytest

from app.core.tool_system import MCPConnector, MCPServerConfig

FAKE_SERVER = """\
import json
import sys
import time


def send(obj):
    sys.stdout.write(json.dumps(obj) + "\\n")
    sys.stdout.flush()


def read():
    line = sys.stdin.readline()
    if not line:
        sys.exit(0)
    return json.loads(line)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "ok"
    if mode == "crash":
        sys.exit(3)
    req = read()
    assert req["method"] == "initialize", req
    send({"jsonrpc": "2.0", "id": req["id"],
          "result": {"protocolVersion": "2024-11-05",
                     "serverInfo": {"name": "fake-mcp", "version": "0.1"}}})
    while True:
        req = read()
        if "id" not in req:
            continue  # notification (e.g. notifications/initialized)
        mid, method = req["id"], req.get("method")
        params = req.get("params", {})
        if method == "tools/list":
            send({"jsonrpc": "2.0", "id": mid,
                  "result": {"tools": [
                      {"name": "echo", "description": "echo back",
                       "inputSchema": {"type": "object"}}]}})
        elif method == "tools/call":
            if params.get("name") == "boom":
                send({"jsonrpc": "2.0", "id": mid,
                      "error": {"code": -32000, "message": "kaboom"}})
            elif params.get("arguments", {}).get("sleep"):
                time.sleep(30)
                send({"jsonrpc": "2.0", "id": mid,
                      "result": {"content": [{"type": "text", "text": "late"}]}})
            else:
                send({"jsonrpc": "2.0", "id": mid,
                      "result": {"content": [{"type": "text",
                                              "text": "got:" + json.dumps(params.get("arguments", {}))}],
                                 "isError": bool(params.get("arguments", {}).get("fail", False))}})
        else:
            send({"jsonrpc": "2.0", "id": mid,
                  "error": {"code": -32601, "message": "no such method"}})


main()
"""


def _write_fake(tmp_path):
    p = tmp_path / "fake_mcp_server.py"
    p.write_text(FAKE_SERVER, encoding="utf-8")
    return str(p)


def _config(*args, **kwargs):
    kwargs.setdefault("transport", "stdio")
    return MCPServerConfig(name="fake", *args, **kwargs)


def test_connect_list_call_roundtrip(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable, args=[_write_fake(tmp_path)]))
        assert await conn.connect() is True
        assert conn.server_info.get("name") == "fake-mcp"
        tools = await conn.list_tools()
        assert [t["name"] for t in tools] == ["echo"]
        out = await conn.call_tool("echo", {"msg": "hi"})
        assert out["isError"] is False
        assert "hi" in out["content"][0]["text"]
        assert out["_meta"]["tool"] == "echo"
        assert out["_meta"]["duration_ms"] >= 0
        await conn.disconnect()
        return True

    assert asyncio.run(go())


def test_tool_iserror_returned_as_data_not_raised(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable, args=[_write_fake(tmp_path)]))
        await conn.connect()
        out = await conn.call_tool("echo", {"fail": True})
        assert out["isError"] is True
        await conn.disconnect()

    asyncio.run(go())


def test_server_error_raises_with_detail(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable, args=[_write_fake(tmp_path)]))
        await conn.connect()
        with pytest.raises(RuntimeError, match="kaboom"):
            await conn.call_tool("boom", {})
        await conn.disconnect()

    asyncio.run(go())


def test_crash_on_startup_raises(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable,
                                    args=[_write_fake(tmp_path), "crash"]))
        with pytest.raises(RuntimeError):
            await conn.connect()
        await conn.disconnect()

    asyncio.run(go())


def test_bad_binary_raises(tmp_path):
    async def go():
        conn = MCPConnector(_config(command="definitely-not-a-real-binary-xyz"))
        with pytest.raises(RuntimeError, match="could not spawn"):
            await conn.connect()

    asyncio.run(go())


def test_call_timeout_raises(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable, args=[_write_fake(tmp_path)]))
        await conn.connect()
        with pytest.raises(RuntimeError, match="[Tt]imed out|timed out|timeout"):
            await conn.call_tool("echo", {"sleep": True}, timeout=2.0)
        await conn.disconnect()

    asyncio.run(go())


def test_sse_transport_not_implemented():
    async def go():
        conn = MCPConnector(_config(transport="sse", url="https://x.example/sse"))
        with pytest.raises(NotImplementedError):
            await conn.connect()

    asyncio.run(go())


def test_empty_tool_name_rejected(tmp_path):
    async def go():
        conn = MCPConnector(_config(command=sys.executable, args=[_write_fake(tmp_path)]))
        await conn.connect()
        with pytest.raises(ValueError):
            await conn.call_tool("  ", {})
        await conn.disconnect()

    asyncio.run(go())
