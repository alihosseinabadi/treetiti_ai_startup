"""Webhook authentication (Phase 0.4, amendment 4).

Two mechanisms, depending on the endpoint:

1. HMAC endpoints (POST /webhooks/publish, POST /webhooks/notify):
   client signs ``f"{timestamp}.{raw_body}"`` with the shared secret::

       signature = hex(HMAC-SHA256(secret, timestamp + "." + raw_body))

   sent as ``X-Webhook-Timestamp`` (unix seconds) + ``X-Webhook-Signature``
   (hex). Accepted only inside a ±5 minute replay window, compared with
   ``hmac.compare_digest`` (constant time). The legacy plain
   ``X-Webhook-Secret`` header is still accepted as a fallback (same
   secret) for existing integrations.

2. Public form (POST /leads): NO HMAC — rate limit + honeypot + origin
   check instead (amendment 4).

Fail-closed: in production, endpoints requiring a secret answer 403 when
no secret is configured. Telegram keeps its own ``secret_token`` check.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Annotated, Optional
from urllib.parse import urlparse

from fastapi import Depends, Header, HTTPException, Request

from app.audit import audit_log
from app.config import get_settings
from app.rate_limit import check_rate_limit, client_ip

REPLAY_WINDOW_SECONDS = 5 * 60


def _ip(request: Request) -> str:
    return client_ip(request, get_settings().trusted_proxies)


def _reject(action: str, request: Request, reason: str,
            status_code: int = 403) -> HTTPException:
    audit_log(action, result="failure", ip=_ip(request), reason=reason)
    return HTTPException(status_code=status_code, detail="Forbidden")


def sign_webhook(secret: str, timestamp: int, raw_body: bytes) -> str:
    """Compute the X-Webhook-Signature value for a payload (test helper)."""
    msg = f"{timestamp}.".encode("utf-8") + raw_body
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


async def verify_webhook_request(request: Request) -> None:
    """HMAC gate for publish/notify. Raises 403/429, audits rejections."""
    settings = get_settings()
    secret = settings.webhook_shared_secret or ""
    if settings.is_prod and not secret:
        raise _reject("webhook.auth", request, "no-secret-configured")
    if not secret:
        return  # dev only: fail-open, same as before
    raw = await request.body()
    ts_raw = request.headers.get("x-webhook-timestamp", "")
    sig = request.headers.get("x-webhook-signature", "")
    legacy = request.headers.get("x-webhook-secret", "")
    if legacy and hmac.compare_digest(legacy, secret):
        return
    try:
        ts = int(ts_raw)
    except (TypeError, ValueError):
        raise _reject("webhook.auth", request, "bad-timestamp")
    if abs(time.time() - ts) > REPLAY_WINDOW_SECONDS:
        raise _reject("webhook.auth", request, "replay-window")
    expected = sign_webhook(secret, ts, raw)
    if not sig or not hmac.compare_digest(sig, expected):
        raise _reject("webhook.auth", request, "bad-signature")


def require_webhook_secret(x_webhook_secret: Optional[str]) -> None:
    """Legacy plain-header gate (kept for backwards compatibility).

    New integrations should use HMAC (verify_webhook_request). Fail-closed
    in production when no secret is configured.
    """
    settings = get_settings()
    expected = settings.webhook_shared_secret
    if settings.is_prod and not expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    if expected and x_webhook_secret != expected:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-Webhook-Secret header",
        )


def webhook_secret_header() -> Optional[str]:
    """FastAPI dependency alias kept for readability in router signatures."""
    return None


def verify_telegram_request(request: Request) -> None:
    """Telegram secret_token check (amendment 4). No-op when unconfigured."""
    settings = get_settings()
    expected = settings.telegram_webhook_secret or ""
    if not expected:
        return
    got = request.headers.get("x-telegram-bot-api-secret-token", "")
    if not got or not hmac.compare_digest(got, expected):
        raise _reject("webhook.telegram", request, "bad-secret-token")


def check_lead_request(request: Request, honeypot: str) -> None:
    """Public-form guards for POST /leads: honeypot + origin check."""
    if (honeypot or "").strip():
        raise _reject("webhook.lead", request, "honeypot")
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if origin:
        try:
            host = urlparse(origin).hostname or ""
        except ValueError:
            raise _reject("webhook.lead", request, "bad-origin")
        allowed = set()
        for base in (get_settings().public_base_url, "http://localhost:8091",
                     "http://127.0.0.1:8091"):
            try:
                h = urlparse(base).hostname
                if h:
                    allowed.add(h)
            except ValueError:
                continue
        if host not in allowed:
            raise _reject("webhook.lead", request, f"origin-not-allowed:{host}")


def webhook_rate_limit(scope: str, max_per_minute: int):
    """Dependency factory: per-IP budget for public webhook endpoints."""

    def guard(request: Request):
        from app.config import get_settings as _gs
        ip = client_ip(request, _gs().trusted_proxies)
        try:
            check_rate_limit(scope, ip, max_per_minute)
        except HTTPException:
            audit_log("webhook.ratelimit", result="failure", ip=ip,
                      reason=scope)
            raise
        return ip

    return guard
