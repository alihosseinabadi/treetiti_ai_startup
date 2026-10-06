"""TREEtiti AI OS — MuseWork local link (spec: chat with the desktop Muse app).

MuseWork's `muse serve` exposes a local JSON-RPC API used by its own UI:
    POST /session/exchange        (empty body + Authorization: Bearer <single-use token>)
    POST /rpc/<method>            (JSON body, Cookie: muse_session=<id>)

This module owns the whole lifecycle so agents just call ``muse_chat()``:
  1. find a live serve (scan ports) or spawn ``muse serve`` and read its URL
  2. exchange the single-use token once -> session cookie (8h, cached)
  3. create (or reuse) a chat session with the MuBear agent
  4. send the message, poll the session until the assistant replies

No secrets involved — everything is local loopback.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

logger = logging.getLogger("treetiti.muse")

_STATE_FILE = os.path.join(tempfile.gettempdir(), "treetiti-muse-link.json")
_MUSE_CMD = r"C:\Users\ali hosseinabadi\AppData\Local\Programs\MuseWork\muse.cmd"
_PORTS = list(range(6300, 6330))


def _http(base: str, path: str, payload="__none__", cookie: str = "",
          token: str = "", timeout: int = 30):
    body = None if payload == "__none__" else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json",
               "Origin": base}
    if token:
        headers["Authorization"] = "Bearer " + token
    if cookie:
        headers["Cookie"] = "muse_session=" + cookie
    req = urllib.request.Request(base + path, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = r.read().decode("utf-8", errors="replace")
            set_ck = r.headers.get("Set-Cookie", "")
            return r.status, (json.loads(text) if text.strip().startswith(("{", "[")) else text), set_ck
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")[:300], ""


def _load_state() -> dict:
    try:
        with open(_STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_state(state: dict) -> None:
    try:
        with open(_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)
    except Exception as exc:  # noqa: BLE001
        logger.warning("muse state save failed: %s", exc)


def _spawn_serve() -> tuple[str, str, int | None]:
    """Start `muse serve` detached; return (base_url, session_token, pid)."""
    log = os.path.join(tempfile.gettempdir(), "treetiti-muse-serve.log")
    with open(log, "w") as fh:
        proc = subprocess.Popen(
            ["cmd", "/c", _MUSE_CMD, "serve"],
            stdout=fh, stderr=subprocess.STDOUT,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    pid = proc.pid
    for _ in range(15):
        time.sleep(3)
        try:
            txt = open(log, encoding="utf-8", errors="replace").read()
        except Exception:
            continue
        m = re.search(r"http://127\.0\.0\.1:(\d+)/#muse-session=([A-Za-z0-9\-_]+)", txt)
        if m:
            return f"http://127.0.0.1:{m.group(1)}", m.group(2), pid
    raise RuntimeError("muse serve did not print a session URL in time")


def _try_cookie(base: str, cookie: str) -> bool:
    st, _, _ = _http(base, "/rpc/is-logged-in", [], cookie=cookie)
    return st == 200


def ensure_link() -> tuple[str, str]:
    """Return (base_url, session_cookie), spawning + exchanging as needed."""
    import subprocess as _sp

    state = _load_state()
    base, cookie = state.get("base", ""), state.get("cookie", "")
    obtained = state.get("obtained_at", 0)
    if base and cookie and time.time() - obtained < 7 * 3600:
        if _try_cookie(base, cookie):
            return base, cookie
    # Retire our previous serve instance (if we spawned one) so ports
    # don't leak: single-use tokens mean a fresh serve per session anyway.
    old_pid = state.get("serve_pid")
    if old_pid:
        try:
            _sp.run(["taskkill", "/PID", str(old_pid), "/F"],
                    capture_output=True, timeout=15)
        except Exception:
            pass
    base, token, pid = _spawn_serve()
    st, _, set_ck = _http(base, "/session/exchange", "__none__", token=token)
    if st != 204:
        raise RuntimeError(f"muse exchange failed: {st}")
    m = re.search(r"muse_session=([^;]+)", set_ck or "")
    if not m:
        raise RuntimeError("muse exchange gave no session cookie")
    cookie = m.group(1)
    _save_state({"base": base, "cookie": cookie, "obtained_at": time.time(),
                 "serve_pid": pid})
    return base, cookie


def _rpc(base: str, cookie: str, path: str, payload="__none__"):
    st, body, _ = _http(base, "/rpc/" + path, payload, cookie=cookie)
    if st != 200:
        raise RuntimeError(f"muse {path} -> {st}: {str(body)[:200]}")
    data = body.get("result", {}) if isinstance(body, dict) else {}
    if isinstance(data, dict) and data.get("ok") is False:
        raise RuntimeError(f"muse {path} not ok: {str(data)[:200]}")
    return data.get("data", data) if isinstance(data, dict) else data


def _discover_agent(base: str, cookie: str, prefer_id: str = "") -> str:
    """Pick a usable agent id (preferred MuBear id, else first listed)."""

    def rpc(path, payload="__none__"):
        return _rpc(base, cookie, path, payload)

    agents = rpc("musa-fetch", ["agents", {"method": "GET", "query": {"specialty": "all"}}])
    ids = [a.get("agent_id") or a.get("id") for a in (agents.get("agents", []) or [])]
    ids = [i for i in ids if i]
    if not ids:
        raise RuntimeError("muse: no agents available")
    if prefer_id and prefer_id in ids:
        return prefer_id
    return ids[0]


def muse_chat(message: str, *, model_key: str = "deepseek-v4-flash",
              agent_id: str = "",
              timeout: int = 240) -> str:
    """Send one message to the desktop Muse app and return its reply text."""
    from app.config import get_settings

    settings = get_settings()
    base, cookie = ensure_link()

    def rpc(path, payload="__none__"):
        return _rpc(base, cookie, path, payload)

    if not agent_id:
        agent_id = getattr(settings, "muse_agent_id", "") or ""
    try:
        agents = rpc("musa-fetch", ["agents", {"method": "GET", "query": {"specialty": "all"}}])
        available = [(a.get("agent_id") or a.get("id")) for a in (agents.get("agents", []) or [])]
        available = [a for a in available if a]
    except Exception:
        available = []
    if not available:
        raise RuntimeError("muse: no agents available")
    if agent_id not in available:
        agent_id = available[0]

    channels = rpc("musa-fetch", ["channels", {"method": "GET", "query": {"agent_id": agent_id}}])
    chs = channels.get("channels", []) if isinstance(channels, dict) else []
    if not chs:
        raise RuntimeError("muse: no channels for agent")
    channel_id = chs[0]["id"]

    session = rpc("musa-fetch", ["sessions", {"method": "POST",
                "body": {"agent_id": agent_id, "channel_id": channel_id}}])
    session_id = session.get("session_id")
    if not session_id:
        raise RuntimeError(f"muse: session create failed: {str(session)[:150]}")

    rpc("musa-chat-stream-start", [{
        "clientStreamId": "renderer-" + str(uuid.uuid4()),
        "sessionId": session_id,
        "channelId": channel_id,
        "agentId": agent_id,
        "content": [{"type": "text", "text": message}],
        "subscribeStream": True,
        "modelKey": model_key,
        "reasoningEffort": "medium",
    }])

    deadline = time.time() + timeout
    seen_texts = set()
    while time.time() < deadline:
        time.sleep(4)
        data = rpc("musa-fetch", [f"sessions/{session_id}/messages",
                   {"method": "GET", "query": {"limit": "10", "order_by": "desc"}}])
        for m in (data.get("messages") or []):
            if m.get("role") != "assistant":
                continue
            if m.get("content_type") not in (None, "", "Reply"):
                continue  # skip Reasoning / status messages
            content = m.get("content", {})
            text = content.get("content", content) if isinstance(content, dict) else content
            text = text if isinstance(text, str) else json.dumps(text)
            if text.strip() and text not in seen_texts:
                return text.strip()
    raise RuntimeError("muse: no assistant reply arrived in time")
