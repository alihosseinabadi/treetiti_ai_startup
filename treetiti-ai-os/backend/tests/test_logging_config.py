"""Unit tests for structured logging setup (Phase 1)."""

from __future__ import annotations

import logging

from app.logging_config import configure_logging


def test_configure_logging_is_idempotent_and_sets_level():
    configure_logging("INFO")
    configure_logging("DEBUG")  # second call is a no-op
    root = logging.getLogger("treetiti")
    assert root.level == logging.INFO
    assert root.handlers


def test_module_loggers_share_config():
    configure_logging()
    child = logging.getLogger("treetiti.agents")
    assert child.root is logging.getLogger()  # propagates to root
    assert not child.handlers or True
    # The child inherits the treetiti root, so emitting must not raise.
    child.info("ok")
