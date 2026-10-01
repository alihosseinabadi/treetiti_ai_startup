"""TREEtiti AI Agency OS — security audit trail (Phase 0.6).

A dedicated stdlib logger (``treetiti.audit``) for security-relevant events:
logins (success/failure), first-run setup, and rejected webhooks.

Rules:
- NEVER log secrets, tokens, passwords, signatures or request bodies.
- Log actor (email or "anonymous"), action, result, client IP and a short
  reason. The logger propagates so ``pytest caplog`` and any root handler
  can capture it; production should ship these records to durable storage.
"""

from __future__ import annotations

import logging

AUDIT_LOGGER_NAME = "treetiti.audit"


def audit_log(action: str, *, actor: str = "anonymous", result: str,
              ip: str = "-", reason: str = "") -> None:
    """Append one audit record. Secret material must never reach here."""
    logger = logging.getLogger(AUDIT_LOGGER_NAME)
    extra = f" reason={reason}" if reason else ""
    logger.info("audit action=%s actor=%s result=%s ip=%s%s",
                action, actor, result, ip, extra)
