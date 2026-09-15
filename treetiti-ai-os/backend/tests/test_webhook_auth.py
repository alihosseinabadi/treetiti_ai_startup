"""Tests for the WEBHOOK_SHARED_SECRET gate on public webhook endpoints."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from app import webhook_security


class _LockedSettings:
    webhook_shared_secret = "s3cret-value"


class _OpenSettings:
    webhook_shared_secret = ""


@pytest.fixture
def locked(monkeypatch):
    monkeypatch.setattr(webhook_security, "get_settings", lambda: _LockedSettings())


def test_missing_header_rejected(locked):
    with pytest.raises(HTTPException) as err:
        webhook_security.require_webhook_secret(None)
    assert err.value.status_code == 403


def test_wrong_header_rejected(locked):
    with pytest.raises(HTTPException) as err:
        webhook_security.require_webhook_secret("wrong")
    assert err.value.status_code == 403


def test_correct_header_accepted(locked):
    # Must not raise.
    webhook_security.require_webhook_secret("s3cret-value")


def test_open_when_secret_unset(monkeypatch):
    """Empty WEBHOOK_SHARED_SECRET keeps endpoints open (local dev mode)."""
    monkeypatch.setattr(webhook_security, "get_settings", lambda: _OpenSettings())
    # Must not raise.
    webhook_security.require_webhook_secret(None)
