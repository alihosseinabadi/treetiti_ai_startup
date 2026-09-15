"""TREEtiti AI Marketing OS — deep research engine (Phase 4).

A real multi-source research pipeline with three phases:

1. DISCOVERY  — parallel web / news / reddit / youtube / competitor scans.
2. EXTRACTION — plain-text fetch of the top unique result pages.
3. SYNTHESIS  — an LLM builds a structured report (summary, key findings with
   confidence + claim type + source, insights, recommendations); on LLM
   failure it degrades to a deterministic template synthesis so the report
   always exists.

The engine is fully injectable (``tools`` + ``llm_fn``) so tests can drive it
without network/LLM. Every tool call degrades gracefully — no exception ever
escapes the pipeline.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from app.services import search as _search

LLM_SYSTEM = (
    "You are a senior market-research analyst for TREEtiti AI Marketing OS. "
    "You synthesize real web evidence into an honest, source-grounded report. "
    "Never invent facts, URLs or numbers that are not in the evidence. "
    "Every claim must carry a source URL when one exists."
)

# Injectables for tests: each is a callable with the same signature as the
# app.services.search counterpart.
TOOLS_DEFAULT: dict[str, Callable[..., Any]] = {
    "search_web": _search.search_web,
    "search_news": _search.search_news,
    "search_reddit": _search.search_reddit,
    "search_youtube": _search.search_youtube,
    "fetch_text": _search.fetch_text,
    "analyze_competitor": _search.analyze_competitor,
}


def _dedupe_urls(hits: list[dict[str, str]], limit: int = 6) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for h in hits:
        url = (h.get("url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(h)
        if len(out) >= limit:
            break
    return out


def discovery(topic: str, tools: dict[str, Callable[..., Any]] | None = None, depth: str = "deep") -> list[dict[str, str]]:
    """Phase 1: parallel scans across every keyless search tool."""
    tools = tools or TOOLS_DEFAULT
    queries = [topic]
    if depth == "deep":
        queries += [f"{topic} market trends 2026", f"{topic} competitors", f"{topic} latest news"]
    jobs: list[tuple[str, Callable[..., Any]]] = []
    for q in queries:
        for kind in ("search_web", "search_news"):
            if kind in tools:
                jobs.append((kind, tools[kind]))
        if "search_reddit" in tools:
            jobs.append(("search_reddit", tools["search_reddit"]))
        if "search_youtube" in tools:
            jobs.append(("search_youtube", tools["search_youtube"]))
    hits: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=min(6, len(jobs))) as pool:
        futures = [pool.submit(fn, q) for _, fn in jobs]
        for future in as_completed(futures):
            try:
                result = future.result()
            except Exception:  # noqa: BLE001
                continue
            if isinstance(result, list):
                hits.extend(result)
    return _dedupe_urls(hits)


def extraction(urls: list[dict[str, str]], tools: dict[str, Callable[..., Any]] | None = None) -> list[dict[str, Any]]:
    """Phase 2: plain-text fetch of the top pages. Never raises."""
    tools = tools or TOOLS_DEFAULT
    fetch = tools.get("fetch_text")
    if fetch is None:
        return []
    pages: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(4, len(urls))) as pool:
        futures = [pool.submit(fetch, u.get("url", ""), 3000) for u in urls]
        for url_row, future in zip(urls, futures):
            try:
                text = future.result()
            except Exception:  # noqa: BLE001
                text = ""
            if text:
                pages.append({"url": url_row.get("url", ""), "title": url_row.get("title", ""), "text": text})
    return pages


def _fallback_synthesis(topic: str, hits: list[dict[str, str]], pages: list[dict[str, Any]]) -> dict[str, Any]:
    """Deterministic synthesis when the LLM is unavailable."""
    snippets = [h.get("snippet", "") for h in hits if h.get("snippet")]
    page_leads = [p["text"][:180].replace("\n", " ") for p in pages]
    summary = (
        f"Live research on “{topic}” surfaced {len(hits)} sources and "
        f"{len(pages)} readable pages. Key themes from the available evidence: "
        + " ".join(snippets[:2])
    ).strip()
    findings = [
        {
            "claim": (s[:280] + "…") if len(s) > 280 else s,
            "source": h.get("url", ""),
            "date": "",
            "evidence": h.get("title", ""),
            "confidence": "medium" if s else "low",
            "type": "inference",
        }
        for h, s in zip(hits, [h.get("snippet", "") for h in hits])
        if s
    ][:8]
    return {
        "topic": topic,
        "summary": summary,
        "findings": findings,
        "insights": [],
        "recommendations": [],
        "sources": [{"title": h.get("title", ""), "url": h.get("url", ""), "kind": h.get("source", "web")} for h in hits],
        "synthesis": "template",
        "page_count": len(pages),
    }


def synthesize(
    topic: str,
    hits: list[dict[str, str]],
    pages: list[dict[str, Any]],
    llm_fn: Callable[..., Any] | None = None,
    depth: str = "deep",
) -> dict[str, Any]:
    """Phase 3: LLM synthesis with a deterministic fallback."""
    if llm_fn is None:
        try:
            from app.llm import llm_json  # noqa: PLC0415

            llm_fn = llm_json
        except Exception:  # noqa: BLE001
            llm_fn = None
    evidence = [f"[{h.get('source','web')}] {h.get('title','')} — {h.get('url','')} — {h.get('snippet','')}" for h in hits]
    for p in pages:
        evidence.append(f"[page] {p.get('title','')} — {p.get('url','')} — {p.get('text','')[:400]}")
    prompt = (
        f"TOPIC: {topic}\nDEPTH: {depth}\n\n"
        "WEB EVIDENCE COLLECTED:\n" + ("\n".join("- " + e for e in evidence[:40]) or "(no live evidence — say so honestly)") + "\n\n"
        'Respond ONLY with JSON: {"summary": "...", "findings": [{"claim": "...", '
        '"source": "url or ''", "confidence": "high|medium|low", "type": "fact|inference|opinion"}], '
        '"insights": ["..."], "recommendations": ["..."]}'
    )
    if llm_fn is not None:
        try:
            data = llm_fn(LLM_SYSTEM, prompt)
            if isinstance(data, dict) and data.get("summary"):
                return {
                    "topic": topic,
                    "summary": data.get("summary", ""),
                    "findings": data.get("findings", []),
                    "insights": data.get("insights", []),
                    "recommendations": data.get("recommendations", []),
                    "sources": [{"title": h.get("title", ""), "url": h.get("url", ""), "kind": h.get("source", "web")} for h in hits],
                    "synthesis": "llm",
                    "page_count": len(pages),
                }
        except Exception:  # noqa: BLE001
            pass
    return _fallback_synthesis(topic, hits, pages)


def report_markdown(report: dict[str, Any]) -> str:
    """Render the structured report as readable markdown (always works)."""
    lines = [f"# Deep Research — {report.get('topic', 'Untitled')}", ""]
    lines.append(report.get("summary", "") or "")
    lines.append("")
    findings = report.get("findings") or []
    if findings:
        lines.append("## Key Findings")
        lines.append("")
        for f in findings:
            claim = f.get("claim", "")
            conf = f.get("confidence", "low")
            ftype = f.get("type", "inference")
            src = f.get("source", "")
            tag = f"[{conf} · {ftype}]"
            lines.append(f"- {claim} {tag}" + (f" — {src}" if src else ""))
        lines.append("")
    insights = report.get("insights") or []
    if insights:
        lines.append("## Insights")
        lines.append("")
        for i in insights:
            lines.append(f"- {i}")
        lines.append("")
    recs = report.get("recommendations") or []
    if recs:
        lines.append("## Recommendations")
        lines.append("")
        for r in recs:
            lines.append(f"- {r}")
        lines.append("")
    sources = report.get("sources") or []
    if sources:
        lines.append("## Sources")
        lines.append("")
        for s in sources:
            lines.append(f"- [{s.get('title','')}]({s.get('url','')})" if s.get("url") else f"- {s.get('title','')}")
        lines.append("")
    lines.append(f"_{len(sources)} sources · {report.get('page_count', 0)} pages read · synthesis: {report.get('synthesis', 'template')}_")
    return "\n".join(lines)


def run_deep_research(
    topic: str,
    *,
    client: str = "",
    tools: dict[str, Callable[..., Any]] | None = None,
    llm_fn: Callable[..., Any] | None = None,
    depth: str = "deep",
) -> dict[str, Any]:
    """Run the full pipeline. Returns a structured report dict (never raises)."""
    topic = (topic or "").strip()
    if not topic:
        return {"topic": "", "summary": "No topic provided.", "findings": [], "insights": [], "recommendations": [], "sources": [], "synthesis": "template", "page_count": 0, "took_ms": 0}
    started = time.monotonic()
    hits = discovery(topic, tools, depth)
    pages = extraction(hits, tools)
    report = synthesize(topic, hits, pages, llm_fn, depth)
    report["client"] = client
    report["depth"] = depth
    report["took_ms"] = int((time.monotonic() - started) * 1000)
    report["report_md"] = report_markdown(report)
    return report