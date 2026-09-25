"""Treetiti AI Marketing OS — social integrations.

Free, self-hosted channels. Telegram works out of the box via the Bot API
(no paid API). LinkedIn/Instagram posting requires OAuth and is routed through
n8n — the publish service provides a clean hook for that.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Any

from app.config import get_settings
from app.llm import llm_complete
from app.memory.store import (
    remember_conversation,
    search_brand_memory,
    search_memory,
)

logger = logging.getLogger("treetiti.social")


def _telegram_api(method: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    """Call a Telegram Bot API method. Returns the JSON result or None."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.info("telegram_bot_token not set; skipping %s", method)
        return None
    base = settings.telegram_api_base_url.rstrip("/")
    url = f"{base}/bot{settings.telegram_bot_token}/{method}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        if settings.telegram_proxy:
            opener = urllib.request.build_opener(
                urllib.request.ProxyHandler(
                    {"http": settings.telegram_proxy, "https": settings.telegram_proxy}
                )
            )
            with opener.open(req, timeout=30) as resp:
                body = json.loads(resp.read().decode())
        else:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode())
        if not body.get("ok"):
            logger.warning("telegram %s failed: %s", method, body)
        return body
    except Exception as exc:  # noqa: BLE001
        logger.error("telegram %s error: %s", method, exc)
        return None


def telegram_send_message(text: str, chat_id: str | None = None) -> dict[str, Any] | None:
    """Send a plain message to the configured Telegram chat.

    Returns the API result dict or None if Telegram is not configured.
    """
    settings = get_settings()
    chat_id = chat_id or settings.telegram_chat_id
    if not chat_id:
        logger.info("telegram_chat_id not set; skipping message")
        return None
    return _telegram_api(
        "sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    )


def notify(subject: str, text: str, telegram_text: str | None = None) -> tuple[bool, bool]:
    """Push a notification through every available channel.

    Returns (email_sent, telegram_sent). Never raises: channels are best-effort
    and are skipped silently when their transport is unreachable or unconfigured.
    Email provides a reliable path where Telegram is filtered; Telegram remains
    the instant push channel where it is reachable.
    """
    from app.services.email import send_email

    email_sent = send_email(subject, text, body_text=text)
    tg = telegram_send_message(telegram_text or text)
    telegram_sent = tg is not None and bool(tg.get("ok"))
    return (email_sent, telegram_sent)


def telegram_set_webhook() -> dict[str, Any] | None:
    """Point Telegram at our /api/v1/webhooks/telegram endpoint."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        return None
    # The public URL under which the backend is reachable. For local dev you can
    # use a tunnel (ngrok / cloudflared); for self-hosted, your real domain.
    base = settings.public_base_url.rstrip("/")
    payload = {"url": f"{base}/api/v1/webhooks/telegram"}
    if settings.telegram_webhook_secret:
        payload["secret_token"] = settings.telegram_webhook_secret
    return _telegram_api("setWebhook", payload)


def handle_telegram_update(update: dict[str, Any]) -> dict[str, Any]:
    """Process one Telegram update.

    - If the sender is the boss (when TELEGRAM_BOSS_IDS is set), text is treated
      as a control command (/approve, /publish, /reject, /status, ...).
    - Otherwise the message is answered by the AI sales assistant (public bot).
    - Anyone who is not the boss but tries to use commands is politely ignored.
    """
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    text = (message.get("text") or "").strip()
    chat_id = chat.get("id")

    if not chat_id or not text:
        return {"handled": False, "reason": "not a text message"}

    from app.services.boss import handle_boss, is_boss

    if is_boss(chat_id):
        if text.startswith("/"):
            reply = handle_boss(text, chat_id)
            _telegram_api(
                "sendMessage",
                {"chat_id": chat_id, "text": reply, "parse_mode": "HTML"},
            )
            return {"handled": True, "chat_id": chat_id, "command": True, "reply": reply}

    memory = search_brand_memory("Treetiti services pricing contact", limit=6)
    memory_block = (
        "\n".join(f"- {m['title']}: {m['content']}" for m in memory)
        or "No brand memory stored yet."
    )
    # RAG recall: the assistant is aware of past talks and team goals.
    team_memory = search_memory(text, limit=4)
    team_block = (
        "\n".join(
            f"- [{m['kind']}] {m['title']}: {m['content'][:250]}" for m in team_memory
        )
        or "No stored memories match yet."
    )
    system = f"""You are Treetiti's 24/7 AI Sales Assistant on Telegram.

You answer questions about Treetiti (an AI agency building AI agents, business
automation, AI websites, CRM automation and AI marketing systems). Brand voice:
premium, futuristic, minimal, confident. Be concise (under 200 words) and end
with a clear next step or a question back to the buyer.

BRAND MEMORY:
{memory_block}

WHAT THE TEAM REMEMBERED (goals, preferences, past decisions — respect these):
{team_block}"""

    # Auto-store important user messages as long-term RAG memory.
    try:
        remember_conversation("user", text, source="telegram")
    except Exception:  # noqa: BLE001
        pass  # memory is best-effort; never break the chat

    reply = llm_complete(system, text, temperature=0.6)
    _telegram_api(
        "sendMessage", {"chat_id": chat_id, "text": reply, "parse_mode": "HTML"}
    )

    # Persist the exchange so the Sales Agent can pick it up later.
    from app.database import SessionLocal
    from app.models import ChatSession

    with SessionLocal() as db:
        session = db.query(ChatSession).filter(ChatSession.title == "telegram").first()
        if session is None:
            session = ChatSession(title="telegram", messages=[])
            db.add(session)
        history = list(session.messages or [])
        history.append({"role": "user", "content": f"(telegram:{chat_id}) {text}"})
        history.append({"role": "assistant", "content": reply})
        session.messages = history
        db.commit()

    return {"handled": True, "chat_id": chat_id, "reply": reply}
