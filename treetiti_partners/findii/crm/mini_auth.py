"""Telegram Mini App auth — validates WebApp initData per Telegram spec.

https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

Validating data received via the Mini App:
  secret_key = HMAC_SHA256(bot_token, key="WebAppData")
  data_check_string = "\\n".join(f"{k}=<v>" for sorted keys except "hash")
  hash == hex(HMAC_SHA256(data_check_string, secret_key))

Also enforces auth_date freshness (default 24h) to stop replay attacks.
Pure stdlib — no extra dependencies.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

MAX_AGE_SECONDS = 24 * 3600


def validate_init_data(init_data: str, bot_token: str,
                       max_age: int = MAX_AGE_SECONDS,
                       now: float | None = None) -> dict:
    """Validate Telegram Mini App initData.

    Returns the parsed payload (incl. decoded `user` dict) on success.
    Raises ValueError on any failure: bad signature, missing fields,
    expired auth_date, or empty bot token.
    """
    if not bot_token:
        raise ValueError("bot token not configured")
    if not init_data:
        raise ValueError("missing init data")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", "")
    if not received_hash:
        raise ValueError("missing hash")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(),
                          hashlib.sha256).digest()
    expected = hmac.new(secret_key, data_check_string.encode(),
                        hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise ValueError("bad signature")

    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        raise ValueError("bad auth_date") from None
    if (now if now is not None else time.time()) - auth_date > max_age:
        raise ValueError("init data expired")

    user: dict = {}
    if pairs.get("user"):
        try:
            user = json.loads(pairs["user"])
        except json.JSONDecodeError:
            raise ValueError("bad user payload") from None
    return {**pairs, "user": user}
