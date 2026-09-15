"""TREEtiti AI Marketing OS — structured logging setup (Phase 1).

Centralises log configuration: one console handler with a consistent format,
level from ``LOG_LEVEL``, and a stable ``treetiti`` namespace so every module
logger flows through the same config. Uvicorn/uvicorn.access are aligned to the
same level to keep startup output clean.

Import this module once at app startup (``configure_logging()``); module-level
``logging.getLogger("treetiti.*")`` calls then inherit the setup.
"""

from __future__ import annotations

import logging
import sys

_configured = False


def configure_logging(level: str | None = None) -> None:
    """Configure the ``treetiti`` root logger + console handler once.

    Idempotent: later calls are no-ops so repeated startup code is safe.
    """
    global _configured  # noqa: PLW0603
    if _configured:
        return
    from app.config import get_settings

    level = (level or get_settings().log_level).upper()
    root = logging.getLogger("treetiti")
    root.setLevel(level)
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s",
                datefmt="%H:%M:%S",
            )
        )
        root.addHandler(handler)
    # Keep framework loggers from drowning the treetiti output at debug level.
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(getattr(logging, level, logging.INFO))
    _configured = True