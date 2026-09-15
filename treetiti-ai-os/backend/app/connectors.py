"""TREEtiti AI Marketing OS — API Connectors registry (Phase 5).

Separates API-based external-service connectors (Telegram, WhatsApp, Google,
webhooks, n8n, …) from MCP servers (see app/mcp.py). Each connector declares its
category, capabilities and the config keys it needs. Connectors are persisted
per slug; the catalog auto-seeds on first list. Probes degrade gracefully and
are injectable for tests — a connector probe never raises.
"""

from __future__ import annotations

import json
import logging
import shutil
import urllib.parse
import urllib.request
from typing import Any, Callable

from app.models import Connector

logger = logging.getLogger("treetiti.connectors")

CATALOG: list[dict[str, Any]] = [
    {
        "id": "telegram",
        "name": "Telegram",
        "category": "Chat & Publishing",
        "description": "Bot API publishing + inbound lead capture. Needs a bot token.",
        "capabilities": ["publishing", "chat", "lead_capture"],
        "config_keys": ["bot_token", "chat_id"],
        "config_hint": {"bot_token": "<from @BotFather>", "chat_id": "@channel or chat id"},
    },
    {
        "id": "whatsapp",
        "name": "WhatsApp",
        "category": "Chat & Publishing",
        "description": "WhatsApp Business messaging. Needs an API key / account.",
        "capabilities": ["chat", "lead_capture"],
        "config_keys": ["api_key", "phone_id"],
        "config_hint": {"api_key": "<provider key>", "phone_id": "phone number id"},
    },
    {
        "id": "vk",
        "name": "VK",
        "category": "Social",
        "description": "VKontakte wall publishing. Needs an access token.",
        "capabilities": ["publishing"],
        "config_keys": ["access_token", "group_id"],
        "config_hint": {"access_token": "<vk token>", "group_id": "-<group id>"},
    },
    {
        "id": "linkedin",
        "name": "LinkedIn",
        "category": "Social",
        "description": "LinkedIn company-page publishing. Needs OAuth token.",
        "capabilities": ["publishing"],
        "config_keys": ["access_token", "company_id"],
        "config_hint": {"access_token": "<oauth token>", "company_id": "urn:li:organization:<id>"},
    },
    {
        "id": "instagram",
        "name": "Instagram",
        "category": "Social",
        "description": "Instagram public research + publishing (needs Graph API).",
        "capabilities": ["research", "publishing"],
        "config_keys": ["access_token", "business_account_id"],
        "config_hint": {"access_token": "<graph token>", "business_account_id": "<account id>"},
    },
    {
        "id": "google",
        "name": "Google Workspace",
        "category": "Productivity",
        "description": "Gmail + Calendar + Drive. Needs a service/key.",
        "capabilities": ["email", "calendar", "drive"],
        "config_keys": ["api_key", "calendar_id"],
        "config_hint": {"api_key": "<gcp key>", "calendar_id": "primary"},
    },
    {
        "id": "n8n",
        "name": "n8n",
        "category": "Automation",
        "description": "Self-hosted workflow automation via webhook URL.",
        "capabilities": ["workflow", "webhook"],
        "config_keys": ["webhook_url"],
        "config_hint": {"webhook_url": "https://n8n.example.com/webhook/<id>"},
    },
    {
        "id": "webhook",
        "name": "Generic Webhook",
        "category": "Automation",
        "description": "POST JSON to any endpoint (Zapier, Make, custom).",
        "capabilities": ["webhook"],
        "config_keys": ["url", "secret"],
        "config_hint": {"url": "https://.../hooks/...", "secret": "optional"},
    },
    {
        "id": "supabase",
        "name": "Supabase",
        "category": "Data",
        "description": "Postgres + storage backend used by this OS.",
        "capabilities": ["database", "storage", "auth"],
        "config_keys": ["url", "service_key"],
        "config_hint": {"url": "https://<project>.supabase.co", "service_key": "<service role key>"},
    },
]


def _connector_dict(c: Connector) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "category": c.category,
        "description": c.description,
        "capabilities": c.capabilities,
        "configured": bool(c.configured),
        "last_status": c.last_status,
        "last_error": c.last_error or "",
        "last_checked_at": c.last_checked_at.isoformat() if c.last_checked_at else None,
        "config_keys": _catalog_hint(c.id).get("config_keys", []),
    }


def _catalog_hint(connector_id: str) -> dict[str, Any]:
    for spec in CATALOG:
        if spec["id"] == connector_id:
            return spec
    return {}


def sync_connector_catalog(db) -> int:
    """Ensure every catalog connector exists in the DB. Returns created count."""
    created = 0
    for spec in CATALOG:
        row = db.get(Connector, spec["id"])
        if row is None:
            db.add(
                Connector(
                    id=spec["id"],
                    name=spec["name"],
                    category=spec["category"],
                    description=spec["description"],
                    capabilities=spec["capabilities"],
                    config={},
                    configured=False,
                    last_status="missing",
                )
            )
            created += 1
    if created:
        db.commit()
    return created


def list_connectors(db) -> list[dict[str, Any]]:
    sync_connector_catalog(db)
    rows = db.query(Connector).order_by(Connector.category).all()
    return [_connector_dict(c) for c in rows]


def configure_connector(connector_id: str, config: dict[str, Any], db) -> dict[str, Any]:
    sync_connector_catalog(db)
    row = db.get(Connector, connector_id)
    if row is None:
        raise KeyError(f"unknown connector {connector_id!r}")
    merged = dict(row.config or {})
    merged.update({k: (v or "").strip() for k, v in (config or {}).items() if isinstance(v, str)})
    row.config = merged
    row.configured = bool(merged)
    row.last_status = "configured" if row.configured else "missing"
    row.last_error = ""
    db.commit()
    db.refresh(row)
    return _connector_dict(row)


def _default_probe(c: Connector) -> dict[str, Any]:
    """Honest connectivity probe. No probe ever raises.

    - telegram: really calls Bot API getMe when a token is saved.
    - everything else: reports configured state (config saved, API verify is
      out of scope for keyless providers).
    """
    config = c.config or {}
    if c.id == "telegram" and config.get("bot_token"):
        try:
            url = f"https://api.telegram.org/bot{config['bot_token']}/getMe"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=8) as resp:
                payload = json.loads(resp.read().decode())
            if payload.get("ok"):
                bot = (payload.get("result") or {}).get("username", "bot")
                return {"status": "ok", "message": f"Telegram bot @{bot} reachable", "latency_ms": 0}
            return {"status": "error", "message": "telegram rejected token"}
        except Exception as exc:  # noqa: BLE001
            return {"status": "error", "message": f"telegram probe failed: {exc}"[:300]}
    if c.configured:
        return {"status": "ok", "message": "configured (API verify not available keyless)"}
    return {"status": "missing", "message": "not configured — add the required keys"}


def test_connector(
    connector_id: str,
    db,
    probe: Callable[[Connector], dict[str, Any]] | None = None,
) -> dict[str, Any]:
    sync_connector_catalog(db)
    row = db.get(Connector, connector_id)
    if row is None:
        raise KeyError(f"unknown connector {connector_id!r}")
    result = (probe or _default_probe)(row)
    row.last_status = result.get("status", "missing")
    row.last_error = result.get("message", "")
    row.last_checked_at = _now_utc()
    db.commit()
    db.refresh(row)
    out = _connector_dict(row)
    out["last_status"] = row.last_status
    out["last_error"] = row.last_error
    return out


def _now_utc():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


def _binary_on_path(name: str) -> bool:
    return bool(shutil.which(name))