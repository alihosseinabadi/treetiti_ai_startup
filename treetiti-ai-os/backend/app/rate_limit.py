"""TREEtiti AI Agency OS — stdlib fixed-window rate limiter (Phase 0.4).

Boring, dependency-free, per-worker in-memory counters. Semantics:

- Fixed windows of 60 seconds per (scope, client-key).
- Client key = direct peer IP, unless the peer is a configured trusted
  proxy (``TRUSTED_PROXIES``: comma-separated IPs/CIDRs) AND an
  ``X-Forwarded-For`` header is present — then the left-most forwarded IP.
  Untrusted proxies' XFF headers are IGNORED (spoofable).
- CAVEAT (documented in docs/SECURITY.md): counters live in this worker
  only. Multi-worker deployments need a shared store (Redis) to enforce
  global limits; until then this is a per-worker abuse brake, and the
  HMAC/replay checks remain the real webhook authentication.
"""

from __future__ import annotations

import ipaddress
import threading
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

_windows: dict[str, tuple[float, int]] = {}
_lock = threading.Lock()
WINDOW_SECONDS = 60.0


def _trusted_proxy_nets(trusted: str) -> list:
    nets = []
    for part in (trusted or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            nets.append(ipaddress.ip_network(part, strict=False))
        except ValueError:
            try:
                nets.append(ipaddress.ip_network(part + "/32", strict=False))
            except ValueError:
                continue
    return nets


def client_ip(request: Request, trusted_proxies: str = "") -> str:
    """Best-effort client IP. XFF honored only from trusted proxies."""
    peer = request.client.host if request.client else "unknown"
    xff = request.headers.get("x-forwarded-for")
    if not xff:
        return peer
    try:
        peer_addr = ipaddress.ip_address(peer)
    except ValueError:
        return peer
    for net in _trusted_proxy_nets(trusted_proxies):
        try:
            if peer_addr in net:
                first = xff.split(",")[0].strip()
                return first or peer
        except TypeError:
            continue
    return peer


def check_rate_limit(scope: str, key: str, max_per_minute: int) -> None:
    """Raise HTTP 429 when ``key`` exceeded its budget in this window."""
    now = time.monotonic()
    bucket = f"{scope}:{key}"
    with _lock:
        start, count = _windows.get(bucket, (now, 0))
        if now - start >= WINDOW_SECONDS:
            start, count = now, 0
        count += 1
        _windows[bucket] = (start, count)
    if count > max_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded, try again later",
        )


def reset_rate_limits() -> None:
    """Test helper: clear all counters."""
    with _lock:
        _windows.clear()


def rate_limited(scope: str, max_per_minute: int):
    """FastAPI dependency factory enforcing a per-IP fixed-window budget."""

    def guard(request: Request):
        from app.config import get_settings

        ip = client_ip(request, get_settings().trusted_proxies)
        check_rate_limit(scope, ip, max_per_minute)
        return ip

    return guard


#: Convenience annotation: 30 req/min per IP (login/setup get tighter
#: budgets at their own call sites).
RateLimitedIP = Annotated[str, Depends(rate_limited("default", 30))]
