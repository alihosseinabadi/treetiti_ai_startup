"""Shared-secret gate for public state-changing webhook endpoints.

Set WEBHOOK_SHARED_SECRET in .env to require the X-Webhook-Secret header on
POST /leads, POST /webhooks/publish and POST /webhooks/notify. Leave it empty
only for local development - never in production.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Header, HTTPException

from app.config import get_settings


def require_webhook_secret(x_webhook_secret: Optional[str]) -> None:
    """Raise 403 unless the caller sent the configured X-Webhook-Secret header."""
    settings = get_settings()
    expected = settings.webhook_shared_secret
    if expected and x_webhook_secret != expected:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-Webhook-Secret header",
        )


def webhook_secret_header() -> Optional[str]:
    """FastAPI dependency alias kept for readability in router signatures."""
    return None
