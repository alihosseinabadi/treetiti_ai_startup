"""Treetiti AI Marketing OS — per-key rate limiting + Google key rotation.

Tracks daily request counts per provider key in-process so the agent client can
fail over BEFORE hitting a hard 429 (design doc: OpenRouter 50 req/day, Google
~1500 req/day). Also rotates across the up-to-3 Google AI Studio keys.

Counters are in-memory and reset on UTC midnight — fine for a single-process
MVP supervisor. Persisting to Postgres is a future upgrade.
"""

from __future__ import annotations

import threading
import time
from typing import Any

from app.config import get_settings

_lock = threading.Lock()
# key_fingerprint -> {"day": "YYYY-MM-DD", "requests": int}
_usage: dict[str, dict[str, Any]] = {}


def _today() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def _fingerprint(provider: str, secret: str) -> str:
    return f"{provider}:{secret[-8:]}"


def record_request(provider: str, secret: str) -> None:
    fp = _fingerprint(provider, secret)
    with _lock:
        entry = _usage.get(fp, {})
        if entry.get("day") != _today():
            entry = {"day": _today(), "requests": 0}
        entry["requests"] += 1
        _usage[fp] = entry


def requests_used(provider: str, secret: str) -> int:
    fp = _fingerprint(provider, secret)
    with _lock:
        entry = _usage.get(fp, {})
        if entry.get("day") != _today():
            return 0
        return entry["requests"]

def daily_limit(provider: str) -> int:
    s = get_settings()
    if provider == "openrouter":
        return s.rate_limit_openrouter_daily
    if provider == "groq":
        return s.rate_limit_groq_daily
    # google: effectively unlimited for a single agency MVP (thousands/day).
    return 10_000_000


def can_call(provider: str, secret: str) -> bool:
    return requests_used(provider, secret) < daily_limit(provider)


def google_keys() -> list[str]:
    """The ordered list of configured Google AI Studio keys, primary first."""
    s = get_settings()
    keys = []
    for field in ("google_ai_studio_key", "google_ai_studio_key_2", "google_ai_studio_key_3"):
        val = (getattr(s, field, "") or "").strip()
        if val:
            keys.append(val)
    return keys


def google_keys_with_capacity() -> list[str]:
    """Google keys that still have headroom today, primary first."""
    return [k for k in google_keys() if can_call("google", k)]


__all__ = [
    "record_request",
    "requests_used",
    "daily_limit",
    "can_call",
    "google_keys",
    "google_keys_with_capacity",
]