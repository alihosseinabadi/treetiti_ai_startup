"""Treetiti AI Marketing OS — SEO Specialist Agent.

Optimizes every piece of content for discoverability: meta titles/descriptions,
keyword clusters, schema markup (JSON-LD), internal links and image alt text.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent


class SEOAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "SEO Specialist Agent"
    role = "search-engine-optimization specialist"
    system_prompt = (
        "You make every Treetiti piece discoverable and rank-worthy. "
        "Meta titles 50-60 chars, meta descriptions 150-160 chars, keyword "
        "hierarchy (primary / secondary / long-tail), JSON-LD schema, internal "
        "links and image alt text. Mobile-first."
    )

    def run(self, content: str) -> dict[str, Any]:
        return self.complete_json(
            f"""Analyze the Treetiti content below and return a complete SEO
implementation plan as JSON.

CONTENT:
---
{content}
---

Respond ONLY with JSON:
{{
  "meta_title": "50-60 chars",
  "meta_description": "150-160 chars",
  "target_keywords": {{
    "primary": "one primary keyword",
    "secondary": ["2-3 secondary"],
    "long_tail": ["3-5 long-tail phrases"]
  }},
  "schema_markup": {{"@type": "Article", "headline": "", "description": ""}},
  "internal_links": ["2-3 suggested internal link anchors"],
  "image_alt_texts": ["alt text suggestions for visuals"],
  "content_optimizations": ["specific tweaks, e.g. add H2 for X, bold Y"],
  "readability_target": "8th grade"
}}
""",
            temperature=0.2,
        )


__all__ = ["SEOAgent"]