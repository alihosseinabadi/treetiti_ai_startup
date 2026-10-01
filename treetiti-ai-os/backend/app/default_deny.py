"""TREEtiti AI Agency OS — default-deny router guard (Phase 0.1, amendment 1).

Every request is denied unless it matches the explicit public allowlist OR
carries a valid Bearer JWT. Pure-ASGI (no response buffering) so SSE
streams keep working. Per-endpoint ``require_role`` checks in the routers
remain the fine-grained layer; this is the backstop that makes adding a
new router without auth impossible to ship silently.

Public surface (explicit allowlist):
- GET  /health, /os, /favicon.ico, /docs, /openapi.json, /redoc
  (+ /assets/*, /media/* static and any other GET outside /api/* — the SPA
  shell; docs routes only exist outside production)
- POST /api/v1/auth/login, /api/v1/auth/setup (self-guarded: rate limits,
  setup token)
- POST /api/v1/leads (rate limit + honeypot + origin check inside)
- POST /api/v1/webhooks/* (HMAC / secret_token checks inside)
"""

from __future__ import annotations

import json

_API = "/api/v1"

_EXACT_GET = {
    "/health",
    "/os",
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
}

_EXACT_POST = {
    f"{_API}/auth/login",
    f"{_API}/auth/setup",
    f"{_API}/leads",
}

_POST_PREFIXES = (f"{_API}/webhooks/",)

_STATIC_GET_PREFIXES = ("/assets/", "/media/")


def is_public_request(method: str, path: str) -> bool:
    """True when (method, path) is on the explicit public allowlist."""
    method = (method or "").upper()
    if method == "GET":
        if path in _EXACT_GET:
            return True
        if path.startswith(_STATIC_GET_PREFIXES):
            return True
        if not path.startswith(_API + "/"):
            return True  # SPA shell / marketing pages: no data, no actions
        return False
    if method == "POST":
        if path in _EXACT_POST:
            return True
        return path.startswith(_POST_PREFIXES)
    return False


def _unauthorized(message: str) -> dict:
    return {
        "type": "http.response.start",
        "status": 401,
        "headers": [(b"content-type", b"application/json")],
    }


class DefaultDenyMiddleware:
    """Pure-ASGI default-deny. Add with ``app.add_middleware``."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        method = scope.get("method", "")
        path = scope.get("path", "")
        if is_public_request(method, path):
            await self.app(scope, receive, send)
            return
        token = ""
        for name, value in scope.get("headers", []):
            if name == b"authorization":
                token = value.decode("latin-1")
                break
        if token.lower().startswith("bearer "):
            from app.auth import decode_token

            try:
                decode_token(token[7:].strip())
                await self.app(scope, receive, send)
                return
            except Exception:
                pass
        body = json.dumps({"detail": "Not authenticated"}).encode()
        await send(_unauthorized("x"))
        await send({"type": "http.response.body", "body": body})
