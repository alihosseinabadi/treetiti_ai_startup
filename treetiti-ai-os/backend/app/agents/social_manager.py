"""TREEtiti AI Marketing OS — Social Media Manager (Phase 4).

Publishes approved content to social channels via the multi-channel publisher
and drafts authentic engagement replies. Never fabricates published state:
every channel result is reported as the publisher returns it, and a channel
that is not configured degrades to a draft, never a fake success.
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent
from app.models import ContentItem
from app.services.publisher import publish_all

from app.agents.prompts.social_manager import SYSTEM_PROMPT

logger = logging.getLogger("treetiti.agents.social_manager")


class SocialManagerAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Social Media Manager"
    role = "publish + engage across social channels"
    agent_key = "social_manager"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        channels: list[str] | None = None,
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Publish approved content, or draft the post + engagement plan."""
        channels = channels or []
        result: dict[str, Any] = {"source": "social_manager", "published": [], "drafts": []}
        if channels:
            item = ContentItem(
                title=brief[:160] or "TREEtiti update",
                body=extra_context or "",
            )
            for report in publish_all(item, channels=channels):
                ok, detail = bool(report.get("ok")), report.get("detail", "")
                if ok:
                    result["published"].append({"channel": report.get("channel"), "detail": detail})
                else:
                    result["drafts"].append({"channel": report.get("channel"), "reason": detail})
            result["status"] = "published" if result["published"] else "drafted"
        else:
            result["status"] = "drafted"
            result["drafts"].append({"channel": "any", "reason": "no channels requested"})
        return result


__all__ = ["SocialManagerAgent"]