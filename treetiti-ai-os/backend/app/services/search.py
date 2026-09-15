"""TREEtiti AI Marketing OS — free web search & fetch service.

Lets the Market Research agent do real web research instead of relying only on
its static knowledge. Keyless by default:

- `search_web()`      -> DuckDuckGo HTML search (free, no key, real queries).
- `fetch_text()`      -> plain-text extraction of a page via urllib.

Both degrade gracefully: if a network call fails the research agent falls back
to its internal knowledge, so the pipeline never breaks.
"""

from __future__ import annotations

import json
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


# ---------------------------------------------------------------------------
# Research tool stack (spec §9): keyless, degrade gracefully to [] / ""
# ---------------------------------------------------------------------------

_JSON_TIMEOUT = 25


def _get_json(url: str) -> dict[str, Any] | list[Any] | None:
    """GET a JSON endpoint keylessly. None on any failure (never raises)."""
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=_JSON_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("json fetch failed for %s: %s", url, exc)
        return None


def search_news(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Keyless news search. Returns [{"title", "url", "snippet", "source"}].

    Degrades to a general web search when no news vertical is reachable, and to
    [] when everything fails — the research agent then relies on its knowledge.
    """
    q = urllib.parse.quote_plus(query)
    url = f"https://html.duckduckgo.com/html/?q={q}&iar=news"
    html = _get_html(url)
    if not html:
        return _search_bing(f"{query} news", max_results)
    results: list[dict[str, str]] = []
    for block in re.findall(r'class="result__body[^"]*"[\s\S]*?(?=class="result__body|$)', html)[:max_results]:
        link_m = re.search(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        snip_m = re.search(r'class="result__snippet"[^>]*>([\s\S]*?)</a>', block, re.S)
        if not link_m:
            continue
        href = _clean_url(link_m.group(1))
        title = re.sub(r"<[^>]+>", "", link_m.group(2)).strip()
        snip = re.sub(r"<[^>]+>", "", snip_m.group(1)).strip() if snip_m else ""
        source_m = re.search(r'<a[^>]*class="result__url"[^>]*>([^<]+)</a>', block)
        source = re.sub(r"^https?://", "", source_m.group(1)).strip().rstrip("/") if source_m else ""
        if href:
            results.append({"title": title, "url": href, "snippet": snip, "source": source})
        if len(results) >= max_results:
            break
    return results or _search_bing(f"{query} news", max_results)


def _get_html(url: str) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        logger.warning("html fetch failed for %s: %s", url, exc)
        return ""


def search_reddit(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Keyless Reddit public search via the JSON API.

    Returns [{"title", "url", "snippet", "source"}] using subreddit + title.
    Empty list on failure (Reddit blocks some egress; degrade gracefully).
    """
    q = urllib.parse.quote_plus(query)
    payload = _get_json(f"https://www.reddit.com/search.json?q={q}&limit={max_results}")
    if not isinstance(payload, dict):
        return []
    out: list[dict[str, str]] = []
    for child in (payload.get("data") or {}).get("children") or []:
        data = child.get("data") or {}
        title = data.get("title") or ""
        url = data.get("url") or ""
        permalink = data.get("permalink") or ""
        sub = data.get("subreddit") or ""
        snippet = (data.get("selftext") or "")[:200].replace("\n", " ").strip()
        if not title or not url:
            continue
        out.append({
            "title": title,
            "url": f"https://www.reddit.com{permalink}" if permalink else url,
            "snippet": snippet,
            "source": f"r/{sub}",
        })
        if len(out) >= max_results:
            break
    return out


def search_youtube(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Keyless YouTube search via a scoped web query.

    YouTube's own search page is JS-rendered, so we use a general web search
    restricted to youtube.com and normalize the hits. Returns
    [{"title", "url", "snippet", "source"}] or [] on failure.
    """
    scoped = search_web(f"site:youtube.com {query}", max_results)
    return [
        {
            "title": r["title"],
            "url": r["url"],
            "snippet": r["snippet"],
            "source": "youtube",
        }
        for r in scoped
        if "youtube.com/watch" in r["url"] or "youtu.be" in r["url"]
    ][:max_results]


def get_trends(query: str = "", max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Keyless trending-topics lookup.

    No public keyless trends API exists, so this surfaces recent relevant web
    chatter via the general search (normalized shape) — good enough for a
    Content Hunter to spot angles. Returns [] on failure.
    """
    q = query or "trending topics today"
    hits = search_web(q, max_results)
    return [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"], "source": "trends"}
        for r in hits
    ]


def analyze_competitor(competitor_url: str, max_chars: int = 3000) -> dict[str, Any]:
    """Lightweight competitor scan (spec §9 `analyze_competitor`).

    Fetches the site text, guesses its top pages (about/contact/blog paths),
    and returns a structured summary. Never raises; on failure returns a dict
    with ``error`` so agents can fall back to their knowledge.
    """
    text = fetch_text(competitor_url, max_chars=max_chars)
    if not text:
        return {"url": competitor_url, "error": "could not fetch competitor site"}
    pages: list[str] = []
    for path in ("/about", "/about-us", "/contact", "/services", "/blog"):
        page = fetch_text(competitor_url.rstrip("/") + path, max_chars=1200)
        if page:
            pages.append({"path": path, "text_preview": page[:600]})
    return {
        "url": competitor_url,
        "home_preview": text[:1200],
        "pages": pages,
        "word_count": len(text.split()),
    }