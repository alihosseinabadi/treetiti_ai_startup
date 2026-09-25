"""Treetiti AI Marketing OS — multi-channel publisher.

Publishes approved ContentItem rows to social channels:

- telegram   -> works out of the box (Bot API, no approval). Set TOKEN + CHAT_ID.
- vk         -> free VK API, no app approval needed. Set VK_ACCESS_TOKEN
               (optionally VK_GROUP_ID to post to a group wall instead of yours).
- linkedin   -> needs a LinkedIn OAuth app + token. Code-ready, not live until
               LINKEDIN_ACCESS_TOKEN is set.
- instagram  -> needs a Meta (Facebook) developer app + Instagram Business
               account + token. Code-ready via the Graph API container flow.

Every function is defensive: returns (ok, detail) and never raises, so a
broken channel never blocks the others.
"""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from typing import Any

from app.config import get_settings
from app.models import ContentItem

logger = logging.getLogger("treetiti.publisher")

_UA = "Mozilla/5.0 (treetiti-ai-os publisher)"


def _post_json(url: str, data: dict[str, Any], timeout: int = 30) -> dict[str, Any] | None:
    req = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(data).encode(),
        headers={"User-Agent": _UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("POST %s failed: %s", url, exc)
        return None


def _render_text(item: ContentItem) -> str:
    text = f"{item.title}\n\n{item.body}"
    if item.hook:
        text = f"{item.hook}\n\n{text}"
    if item.cta:
        text += f"\n\n{item.cta}"
    return text


# ---------------------------------------------------------------------------
# Channel adapters — each returns (ok: bool, detail: str)
# ---------------------------------------------------------------------------

def publish_telegram(item: ContentItem) -> tuple[bool, str]:
    from app.services.social import _telegram_api

    settings = get_settings()
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        return False, "Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)"
    text = _render_text(item)
    result = _telegram_api(
        "sendMessage",
        {"chat_id": settings.telegram_chat_id, "text": text, "parse_mode": "HTML"},
    )
    if result is None:
        return False, "Telegram API unreachable"
    if not result.get("ok"):
        return False, f"Telegram error: {result}"
    return True, "sent"


def publish_vk(item: ContentItem) -> tuple[bool, str]:
    settings = get_settings()
    token = settings.vk_access_token
    if not token:
        return False, "VK not configured (VK_ACCESS_TOKEN)"
    text = _render_text(item)
    payload: dict[str, Any] = {
        "access_token": token,
        "v": "5.199",
        "message": text,
    }
    owner_id = ""
    if settings.vk_group_id:
        owner_id = f"-{settings.vk_group_id}"
        payload["owner_id"] = owner_id
        payload["from_group"] = "1"
    result = _post_json("https://api.vk.com/method/wall.post", payload)
    if result is None:
        return False, "VK API unreachable"
    if "error" in result:
        return False, f"VK error: {result['error'].get('error_msg', result['error'])}"
    post_id = result.get("response", {}).get("post_id")
    return True, f"posted (id {post_id}) on wall {owner_id or 'own'}"


def publish_linkedin(item: ContentItem) -> tuple[bool, str]:
    settings = get_settings()
    token = settings.linkedin_access_token
    if not token:
        return False, "LinkedIn not configured (LINKEDIN_ACCESS_TOKEN)"
    if not settings.linkedin_author_urn:
        return False, "LinkedIn author not set (LINKEDIN_AUTHOR_URN, e.g. urn:li:person:abc)"
    text = _render_text(item)
    body = {
        "author": settings.linkedin_author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    req = urllib.request.Request(
        "https://api.linkedin.com/rest/posts",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202401",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return True, f"posted (status {resp.status})"
    except Exception as exc:  # noqa: BLE001
        return False, f"LinkedIn error: {exc}"


def publish_instagram(item: ContentItem) -> tuple[bool, str]:
    settings = get_settings()
    token = settings.instagram_access_token
    if not token:
        return False, "Instagram not configured (INSTAGRAM_ACCESS_TOKEN)"
    if not settings.instagram_account_id:
        return False, "Instagram account id not set (INSTAGRAM_ACCOUNT_ID)"
    text = _render_text(item)
    # Step 1: create a media container (photo-less caption post via IG API is
    # limited; use the caption with a supported image when available).
    container = _post_json(
        f"https://graph.facebook.com/v19.0/{settings.instagram_account_id}/media",
        {"caption": text, "access_token": token},
    )
    if container is None:
        return False, "Instagram Graph API unreachable"
    if container.get("error"):
        return False, f"Instagram container error: {container['error'].get('message', container['error'])}"
    container_id = container.get("id")
    if not container_id:
        return False, "Instagram returned no container id"
    result = _post_json(
        f"https://graph.facebook.com/v19.0/{settings.instagram_account_id}/media_publish",
        {"creation_id": container_id, "access_token": token},
    )
    if result is None:
        return False, "Instagram publish request failed"
    if result.get("error"):
        return False, f"Instagram publish error: {result['error'].get('message', result['error'])}"
    return True, f"posted (media {result.get('id')})"


# ---------------------------------------------------------------------------
# Multi-channel orchestration
# ---------------------------------------------------------------------------

CHANNELS = {
    "telegram": publish_telegram,
    "vk": publish_vk,
    "linkedin": publish_linkedin,
    "instagram": publish_instagram,
}


def publish_all(item: ContentItem, channels: list[str] | None = None) -> list[dict[str, Any]]:
    """Publish `item` to every requested channel (default: all configured).

    Returns [{"channel", "ok", "detail"}]. Never raises.
    """
    wanted = channels or list(CHANNELS)
    results: list[dict[str, Any]] = []
    for name in wanted:
        fn = CHANNELS.get(name)
        if fn is None:
            results.append({"channel": name, "ok": False, "detail": "unknown channel"})
            continue
        ok, detail = fn(item)
        results.append({"channel": name, "ok": ok, "detail": detail})
    return results
