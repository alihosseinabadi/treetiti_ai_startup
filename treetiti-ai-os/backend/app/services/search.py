"""Treetiti AI Marketing OS — free web search & fetch service.

Lets the Market Research agent do real web research instead of relying only on
its static knowledge. Keyless by default:

- `search_web()`      -> DuckDuckGo HTML search (free, no key, real queries).
- `fetch_text()`      -> plain-text extraction of a page via urllib.

Both degrade gracefully: if a network call fails the research agent falls back
to its internal knowledge, so the pipeline never breaks.
"""

from __future__ import annotations

import logging
import re
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger("treetiti.search")

TIMEOUT = 20
MAX_RESULTS = 5

_UA = (
    "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0 "
    "(treetiti-ai-os marketing research)"
)


def search_web(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Free keyless general web search.

    Tries DuckDuckGo first, then Bing as a fallback (Bing returns clean HTML
    to plain requests and is rarely captcha-walled). Returns
    [{"title", "url", "snippet"}]. Empty list on any failure.
    """
    results = _search_duckduckgo(query, max_results)
    if results:
        return results
    return _search_bing(query, max_results)


def _search_duckduckgo(query: str, max_results: int) -> list[dict[str, str]]:
    q = urllib.parse.quote_plus(query)
    url = f"https://html.duckduckgo.com/html/?q={q}"
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        logger.warning("duckduckgo search failed for %r: %s", query, exc)
        return []

    results: list[dict[str, str]] = []
    blocks = re.findall(r'class="result__body[^"]*"[\s\S]*?(?=class="result__body|$)', html)
    if not blocks:  # fallback: split by result anchor
        blocks = re.findall(r'class="result[^"]*"[\s\S]*?(?=class="result\b|$)', html)

    for block in blocks[:max_results]:
        link_m = re.search(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        snip_m = re.search(r'class="result__snippet"[^>]*>([\s\S]*?)</a>', block, re.S)
        if not link_m:
            continue
        href = _clean_url(link_m.group(1))
        title = re.sub(r"<[^>]+>", "", link_m.group(2)).strip()
        snip = ""
        if snip_m:
            snip = re.sub(r"<[^>]+>", "", snip_m.group(1)).strip()
        if href:
            results.append({"title": title, "url": href, "snippet": snip})
        if len(results) >= max_results:
            break
    return results


def _search_bing(query: str, max_results: int) -> list[dict[str, str]]:
    q = urllib.parse.quote_plus(query)
    url = f"https://www.bing.com/search?q={q}&count={max_results}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": _UA, "Accept-Language": "en-US,en;q=0.9"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        logger.warning("bing search failed for %r: %s", query, exc)
        return []

    results: list[dict[str, str]] = []
    blocks = re.findall(r'<li class="b_algo"[\s\S]*?(?=<li class="b_algo"|$)', html)
    for block in blocks[:max_results]:
        link_m = re.search(r'href="(https?://[^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not link_m:
            continue
        href = link_m.group(1)
        if "bing.com/ck" in href:
            m = re.search(r"u=a1([^&]+)", href)
            if m:
                try:
                    href = urllib.parse.unquote(urllib.parse.unquote(m.group(1)))
                except Exception:  # noqa: BLE001
                    pass
        title = re.sub(r"<[^>]+>", "", link_m.group(2)).strip()
        snip_m = re.search(r'<p[^>]*>([\s\S]*?)</p>', block, re.S)
        snip = ""
        if snip_m:
            snip = re.sub(r"<[^>]+>", "", snip_m.group(1)).strip()
        if href.startswith("http"):
            results.append({"title": title, "url": href, "snippet": snip})
        if len(results) >= max_results:
            break
    return results


def _clean_url(href: str) -> str:
    """Resolve DuckDuckGo redirect wrapper to the real URL."""
    if href.startswith("//duckduckgo.com/l/"):
        m = re.search(r"uddg=([^&]+)", href)
        if m:
            try:
                return urllib.parse.unquote(m.group(1))
            except Exception:  # noqa: BLE001
                pass
    return href if href.startswith("http") else ""


def fetch_text(url: str, max_chars: int = 4000) -> str:
    """Fetch a page and return clean-ish plain text (first `max_chars`)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_text failed for %s: %s", url, exc)
        return ""
    if not raw:
        return ""
    text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", raw)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:max_chars]