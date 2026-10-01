"""Social / webhook routes.

- POST /webhooks/telegram  → Telegram Bot webhook (AI Sales Assistant)
- POST /webhooks/publish   → publish an approved content item to a channel
- POST /webhooks/notify    → generic email notification (used by n8n)
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated

from app.config import get_settings
from app.database import get_db
from app.models import ContentItem, User
from app.services.email import email_html, send_email
from app.services.social import _telegram_api, handle_telegram_update
from app.webhook_security import (
    verify_telegram_request,
    verify_webhook_request,
    webhook_rate_limit,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/telegram")
def telegram_webhook(
    update: dict,
    request: Request,
    x_telegram_bot_api_secret_token: Annotated[str | None, Header()] = None,
) -> dict:
    """Entry point configured via Telegram's setWebhook.

    Public by design (Telegram calls it). Answers text messages with the brain
    and stores the conversation for the Sales Agent. Verified via the
    X-Telegram-Bot-Api-Secret-Token header (see webhook_security).
    """
    verify_telegram_request(request)
    result = handle_telegram_update(update)
    # Telegram expects a fast 200; long agent calls run synchronously here.
    return result


class PublishRequest(BaseModel):
    channel: str = "telegram"


@router.post("/publish/{content_id}")
async def publish_content(
    content_id: str,
    payload: PublishRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[str, Depends(webhook_rate_limit("webhooks-publish", 60))],
) -> dict:
    """Publish an approved content item to a channel (free channels only).

    telegram: posts to the configured chat. Other channels are stubbed for n8n
    (LinkedIn/Instagram require OAuth). HMAC-signed (amendment 4).
    """
    await verify_webhook_request(request)
    item = db.get(ContentItem, content_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content not found")
    if item.status not in ("approved", "published"):
        raise HTTPException(status_code=400, detail="Content must be approved first")

    if payload.channel == "telegram":
        text = f"*{item.title}*\n\n{item.body}"
        if item.cta:
            text += f"\n\n*CTA:* {item.cta}"
        sent = _telegram_api(
            "sendMessage",
            {"chat_id": get_settings().telegram_chat_id, "text": text, "parse_mode": "Markdown"},
        )
        if sent is None:
            raise HTTPException(
                status_code=400,
                detail="Telegram not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)",
            )
        item.status = "published"
        db.commit()
        return {"channel": "telegram", "published": True}

    if payload.channel == "email":
        subject = f"[TREEtiti] Published: {item.title}"
        html = email_html(
            f"<span class='badge'>PUBLISHED</span> {item.title}",
            [
                ("Platform", item.platform),
                ("Type", item.content_type),
                ("Body", f"<pre>{item.body}</pre>"),
                ("CTA", item.cta or "—"),
            ],
        )
        ok = send_email(subject, html)
        if not ok:
            raise HTTPException(
                status_code=400,
                detail="Email not configured (set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_TO)",
            )
        item.status = "published"
        db.commit()
        return {"channel": "email", "published": True}

    raise HTTPException(
        status_code=400,
        detail=f"Channel '{payload.channel}' is not wired yet — add it as an n8n workflow.",
    )


class NotifyRequest(BaseModel):
    subject: str
    title: str = ""
    rows: list[tuple[str, str]] = []  # (label, value) pairs
    text: str = ""


@router.post("/notify")
async def notify_email(
    payload: NotifyRequest,
    request: Request,
    _rl: Annotated[str, Depends(webhook_rate_limit("webhooks-notify", 60))],
) -> dict:
    """Send a brand-style email notification. Called by n8n workflows so they
    can notify you without Telegram (leads, daily report, content ready, …).
    HMAC-signed (amendment 4)."""
    await verify_webhook_request(request)
    html = email_html(payload.title or payload.subject, payload.rows)
    ok = send_email(payload.subject, html, body_text=payload.text)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="Email not configured (set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_TO)",
        )
    return {"sent": True, "to": get_settings().email_to}
