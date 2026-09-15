"""TREEtiti AI Marketing OS — LLM structured-scrape service (ScrapeGraphAI).

Lets the Market Research agent extract structured data from a page the same
way the open-source script described in .agents/skills/scrapegraphai does —
one user prompt + a source, returns a clean JSON dict, no selectors needed.

Designed to match the repo's graceful-degradation philosophy (see search.py):

- Uses `scrapegraphai` when it's installed (SmartScraperGraph + Playwright).
- Uses the configured `groq_key` when available, else a free Ollama/local model.
- Falls back to the plain-text `search.fetch_text()` when scrapegraphai or
  Playwright isn't installed, so the research pipeline never breaks.
"""

from __future__ import annotations

import logging
import shutil
from typing import Any

from app.config import get_settings
from app.services.search import fetch_text

logger = logging.getLogger("treetiti.scrape")

_TIMEOUT = 45

_SMARTER_PROMPT_HINT = (
    "Return a concise JSON object capturing the most important facts, numbers, "
    "figures, names, dates and actionable insights from this page."
)


def _scrapegraphai_available() -> bool:
    """True when scrapegraphai is importable AND a Playwright browser exists."""
    try:
        import scrapegraphai  # noqa: F401
    except Exception:  # noqa: BLE001
        return False
    path = None
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
        from playwright._impl._driver import compute_driver_executable  # noqa: PLC0415
        path = compute_driver_executable()
    except Exception:  # noqa: BLE001
        pass
    return path is not None or shutil.which("playwright") is not None


def _llm_config() -> dict[str, Any]:
    """Build the scrapegraphai graph_config llm block from settings."""
    settings = get_settings()
    if settings.groq_key:
        return {
            "api_key": settings.groq_key,
            "model": f"groq/{settings.groq_model}",
        }
    return {"model": "ollama/llama3.2", "model_tokens": 8192, "format": "json"}


def _scrape_with_scrapegraphai(
    url: str, prompt: str, max_chars: int
) -> dict[str, Any]:
    from scrapegraphai.graphs import SmartScraperGraph  # noqa: PLC0415

    graph_config = {
        "llm": _llm_config(),
        "verbose": False,
        "headless": True,
    }
    graph = SmartScraperGraph(prompt=prompt, source=url, config=graph_config)
    # run() returns a dict by default for these pipelines
    result: dict[str, Any] = graph.run() or {}
    return result


def scrape_page(
    url: str,
    prompt: str = "",
    max_chars: int = 4000,
) -> dict[str, Any]:
    """Return structured data extracted from `url`.

    Priority: ScrapeGraphAI (LLM extraction) -> plain-text fetch_text fallback.
    Never raises: on any failure returns {"url": url, "fallback": True, "text": ""}.
    """
    if not _scrapegraphai_available():
        logger.info("scrapegraphai not available for %s — using fetch_text", url)
        text = fetch_text(url, max_chars=max_chars)
        return {"url": url, "fallback": True, "method": "fetch_text", "text": text}

    text = fetch_text(url, max_chars=max(200, max_chars))
    # Small heuristic: if plain fetch already returns the page, scrapegraphai
    # still adds structure (the LLM decides), so prefer it for JS-heavy pages
    # and social/competitor pages where structure beats raw text.
    try:
        data = _scrape_with_scrapegraphai(
            url, prompt or _SMARTER_PROMPT_HINT, max_chars
        )
        data.setdefault("url", url)
        data.setdefault("method", "scrapegraphai")
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("scrapegraphai failed for %s (%s) — fetch_text fallback", url, exc)
        return {"url": url, "fallback": True, "method": "fetch_text", "text": text}