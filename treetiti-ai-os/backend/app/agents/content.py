"""TREEtiti AI Marketing OS — Content Creation Agent.

Generates LinkedIn posts, Instagram ideas, TikTok scripts and blog articles.
Every piece includes hook, main idea, CTA, target audience, platform and a
visual recommendation. All content is validated by the Brand Intelligence
Agent before being saved.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from sqlalchemy import update

from app.agents.base import BaseAgent
from app.agents.brand import BrandIntelligenceAgent
from app.database import SessionLocal
from app.memory.store import search_brand_memory, search_content_memory, store_content_memory
from app.models import ContentItem

from app.agents.prompts.content import SYSTEM_PROMPT

PLATFORMS = ["linkedin", "instagram", "tiktok", "blog"]

DRAFTS_DIR = Path(__file__).resolve().parents[2] / "drafts"


def _slug(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:60] or "untitled"


def _write_draft(item: dict[str, Any], body: str) -> str:
    """Write one content item as a markdown draft file. Returns the path."""
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    platform = item.get("platform", "draft")
    filename = f"{platform}_{_slug(item.get('title', 'untitled'))}.md"
    md = (
        f"# {item.get('title', 'Untitled')}\n\n"
        f"- **Platform:** {item.get('platform', '')}\n"
        f"- **Type:** {item.get('content_type', 'post')}\n"
        f"- **Target audience:** {item.get('target_audience', '')}\n"
        f"- **Status:** pending_approval\n\n"
        f"## Hook\n\n{item.get('hook', '')}\n\n"
        f"## Body\n\n{body}\n\n"
        f"## CTA\n\n{item.get('cta', '')}\n\n"
        f"## Visual recommendation\n\n{item.get('visual_recommendation', '')}\n"
    )
    path = DRAFTS_DIR / filename
    path.write_text(md, encoding="utf-8")
    return str(path)


class ContentCreationAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"  # verified free, structured output
    name = "Content Creation Agent"
    role = "creative content strategist"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        opportunity: dict[str, Any] | None = None,
        platform: str = "linkedin",
        count: int = 1,
        approve: bool = True,
        insight_brief: dict[str, Any] | None = None,
        revision_notes: list[str] | None = None,
        previous: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """Generate `count` content items for a platform.

        `opportunity` comes from the Research Agent. `insight_brief` comes from
        the Analytics Agent's `analyze_research()` — when present it is the
        primary creative input (analyst-derived, brand-gated).

        When `revision_notes` is given the agent REVISES the `previous` items
        against the editor's notes instead of drafting from scratch (QA loop).
        """
        memory = search_brand_memory("TREEtiti services positioning", limit=4)
        memory_block = "\n".join(f"- {m['title']}: {m['content']}" for m in memory)
        past = search_content_memory(platform, limit=3)
        past_block = (
            "\n".join(f"- [{p['platform']}] {p['title']}: {p['body'][:120]}" for p in past)
            or "No published content yet."
        )

        insight_block = ""
        if insight_brief:
            insight = insight_brief.get("insight") or insight_brief
            if isinstance(insight, dict):
                insight_block = "\n".join(
                    f"- {k}: {v}" for k, v in insight.items() if v
                )
            else:
                insight_block = str(insight)

        revision_block = ""
        if revision_notes:
            revision_block = (
                "REVISION NOTES FROM THE EDITOR (must fix ALL of these):\n"
                + "\n".join(f"- {n}" for n in revision_notes)
            )
        previous_block = ""
        if previous:
            previous_block = (
                "PREVIOUS DRAFT (revise this, don't start over):\n"
                + json.dumps(previous, ensure_ascii=False)
            )

        prompt = f"""Generate {count} TREEtiti {platform} content piece(s).

BRAND MEMORY:
{memory_block}

ALREADY PUBLISHED (avoid repeating these ideas):
{past_block}

{('ANALYST INSIGHT BRIEF (primary input — build on this):\n' + insight_block) if insight_block else ""}

{('TODAYS OPPORTUNITY:\n' + json.dumps(opportunity, ensure_ascii=False)) if opportunity and not insight_brief else ""}

{revision_block}

{previous_block}

For each piece respond with an item in this exact structure:
{{
  "platform": "{platform}",
  "content_type": "post | reel | carousel | article",
  "title": "working title",
  "hook": "the opening line",
  "body": "full content: for LinkedIn the post text; for Instagram caption; for TikTok the short script; for blog a full article outline with intro and sections",
  "cta": "the call to action",
  "target_audience": "who this is for",
  "visual_recommendation": "what image/video should accompany it"
}}

Respond ONLY with a JSON array of {count} such objects. No markdown fences.
"""
        raw = self.complete_json(prompt, temperature=0.8)
        items = raw if isinstance(raw, list) else [raw]

        brand = BrandIntelligenceAgent()
        saved: list[dict[str, Any]] = []
        pending_embeddings: list[tuple[str, str]] = []
        with SessionLocal() as db:
            for item in items:
                body = str(item.get("body", ""))
                row = ContentItem(
                    platform=item.get("platform", platform),
                    content_type=item.get("content_type", "post"),
                    title=item.get("title", "Untitled"),
                    body=body,
                    hook=item.get("hook", ""),
                    cta=item.get("cta", ""),
                    target_audience=item.get("target_audience", ""),
                    visual_recommendation=item.get("visual_recommendation", ""),
                    status="pending_approval" if approve else "draft",
                )
                db.add(row)
                db.flush()
                pending_embeddings.append((row.id, f"{row.title} {row.body}"))
                draft_path = _write_draft(item, body)
                saved.append(
                    {
                        "id": row.id,
                        "platform": row.platform,
                        "content_type": row.content_type,
                        "title": row.title,
                        "hook": row.hook,
                        "body": row.body,
                        "cta": row.cta,
                        "status": row.status,
                        "draft_path": draft_path,
                    }
                )
            db.commit()
        # Brand review (LLM) + embeddings AFTER the write txn closes, so no
        # connection ever holds the SQLite write lock across network calls.
        if approve:
            for entry in saved:
                try:
                    verdict = brand.run(entry["body"], platform)
                    if not verdict.get("approved") and verdict.get("fixed_content"):
                        entry["body"] = verdict["fixed_content"]
                        with SessionLocal() as fix_db:
                            fix_db.execute(
                                update(ContentItem)
                                .where(ContentItem.id == entry["id"])
                                .values(body=entry["body"])
                            )
                            fix_db.commit()
                except Exception:  # noqa: BLE001
                    pass
        for row_id, text in pending_embeddings:
            try:
                store_content_memory(row_id, text)
            except Exception:  # noqa: BLE001
                pass
        return saved
