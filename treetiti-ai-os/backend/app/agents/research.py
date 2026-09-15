"""TREEtiti AI Marketing OS — Market Research Agent.

Daily: finds AI industry trends, analyzes competitors, identifies business
problems and generates content opportunities for TREEtiti.

Now search-driven: the agent accepts IDEAS (what the owner wants to explore)
and SOURCES (places to check), runs a real web search, synthesizes findings
and stores a richer opportunity record. If no API/search is reachable it
degrades to reasoning from its own knowledge — the pipeline never breaks.
"""

from __future__ import annotations

import json
from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.models import ResearchOpportunity
from app.services.scrape import scrape_page
from app.services.search import fetch_text, search_web

from app.agents.prompts.research import SYSTEM_PROMPT

DEFAULT_SOURCES = [
    "https://techcrunch.com",
    "https://venturebeat.com",
    "https://theinformation.com",
    "https://hbr.org",
    "https://news.ycombinator.com",
]


class MarketResearchAgent(BaseAgent):
    model = "zai/glm-4.7-flash"  # strongest verified free reasoning for daily batch
    name = "Market Research Agent"
    role = "market intelligence analyst"
    system_prompt = SYSTEM_PROMPT

    def _research(
        self, ideas: list[str], sources: list[str], scrape_urls: list[str] | None = None
    ) -> dict[str, Any]:
        """Gather real web evidence from the given ideas + sources.

        Returns {"searched": [str], "findings": [...]} — always populated.
        `scrape_urls` are deep-read with ScrapeGraphAI (structured LLM
        extraction); if the library is unavailable we fall back to plain text.
        """
        topics = [i for i in ideas if i] or [
            "AI agents for business automation",
            "CRM automation 2026 trends",
            "AI marketing strategy B2B",
        ]
        findings: list[str] = []
        searched: list[str] = []

        for topic in topics:
            results = search_web(topic, max_results=3)
            searched.append(topic)
            for r in results:
                snippet = (r.get("snippet") or "").strip()
                if snippet:
                    findings.append(f"[{topic}] {snippet}")

        # Deep-read up to 3 latest sources for more signal.
        for url in sources[:3]:
            text = fetch_text(url, max_chars=2000)
            if text:
                findings.append(f"[source {url}] {text[:800]}")

        # Structured LLM scrape of the pages the owner explicitly asked about.
        for url in (scrape_urls or [])[:3]:
            data = scrape_page(url, max_chars=2500)
            if data.get("fallback"):
                if data.get("text"):
                    findings.append(f"[scraped {url}] {data['text'][:800]}")
            else:
                summary = json.dumps(data, ensure_ascii=False)[:1200]
                findings.append(f"[scrapegraphai {url}] {summary}")

        if not findings:
            findings = [
                "No live web signal available — relying on internal knowledge."
            ]
        return {"searched": searched, "findings": findings[:20]}


    def run(
        self,
        extra_context: str = "",
        ideas: list[str] | None = None,
        sources: list[str] | None = None,
        scrape_urls: list[str] | None = None,
    ) -> dict[str, Any]:
        ideas = ideas or []
        sources = sources or DEFAULT_SOURCES

        research = self._research(ideas, sources, scrape_urls)

        result = self.complete_json(
            f"""Today's date: use current date.

Produce TODAY'S top opportunity for TREEtiti to create content about.

OWNER IDEAS TO EXPLORE: {", ".join(ideas) or "none provided"}
SOURCES CHECKED: {", ".join(research['searched'])}

WEB RESEARCH FINDINGS (ground your answer in these):
{chr(10).join('- ' + f for f in research['findings'])}

{extra_context or ""}

Respond ONLY with JSON:
{{
  "trend": "the AI trend relevant right now",
  "business_problem": "a real business problem this trend solves",
  "content_opportunity": "the exact content angle TREEtiti should publish",
  "target_customer": "which customer segment (e.g. startup founders, SMB owners)",
  "sources": ["list of urls/sources the finding came from"]
}}
""",
            temperature=0.5,
        )
        # Persist the ideas the owner asked to explore so downstream agents know.
        result["ideas"] = ideas
        result["sources_checked"] = research["searched"]
        if not result.get("sources"):
            result["sources"] = research["searched"]

        with SessionLocal() as db:
            db.add(
                ResearchOpportunity(
                    trend=result.get("trend", ""),
                    business_problem=result.get("business_problem", ""),
                    content_opportunity=result.get("content_opportunity", ""),
                    target_customer=result.get("target_customer", ""),
                    extra={
                        "ideas": result.get("ideas", []),
                        "sources": result.get("sources", []),
                        "sources_checked": result.get("sources_checked", []),
                    },
                )
            )
            db.commit()
        return result