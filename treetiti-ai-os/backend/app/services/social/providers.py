"""TREEtiti AI Marketing OS — SocialProvider abstraction (spec §10).

Each platform gets an adapter that declares the *capabilities* it actually
supports: profile, posts, publishing, analytics, comments, search, and public
content research. No adapter is assumed to support every capability — agents
MUST check ``provider.capabilities`` before calling a method (spec §10:
"Do not assume every platform supports every capability").

Keyless by design in Phase 1: publishing/analytics adapters that need OAuth or
paid keys degrade to explicit ``UnsupportedCapabilityError`` (never fake data).
Public research capabilities (search, posts, public content research) work
where a free keyless endpoint exists.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("treetiti.social.providers")

# Canonical capability names (spec §10).
SOCIAL_CAPABILITIES = frozenset(
    {"profile", "posts", "publishing", "analytics", "comments", "search", "research"}
)


class UnsupportedCapabilityError(NotImplementedError):
    """Raised when an adapter does not support a capability (spec §10)."""


@dataclass
class SocialProvider:
    """Base class + capability contract for a social platform adapter."""

    name: str
    display_name: str = ""
    capabilities: set[str] = field(default_factory=set)

    def __post_init__(self) -> None:
        self.capabilities = self.capabilities & SOCIAL_CAPABILITIES
        self.display_name = self.display_name or self.name

    # -- capability guard ---------------------------------------------------
    def _require(self, capability: str) -> None:
        if capability not in self.capabilities:
            raise UnsupportedCapabilityError(
                f"{self.name} does not support {capability!r}; "
                f"supported={sorted(self.capabilities)}"
            )

    # -- default implementations (override per adapter) ----------------------
    def profile(self, **kw: Any) -> dict[str, Any]:
        """Fetch public profile info. Raises UnsupportedCapabilityError when absent."""
        self._require("profile")
        raise UnsupportedCapabilityError(
            f"{self.name} has not implemented profile()"
        )

    def posts(self, **kw: Any) -> list[dict[str, Any]]:
        """Fetch recent public posts. Raises UnsupportedCapabilityError when absent."""
        self._require("posts")
        raise UnsupportedCapabilityError(f"{self.name} has not implemented posts()")

    def search(self, query: str, **kw: Any) -> list[dict[str, Any]]:
        """Public content search. Raises UnsupportedCapabilityError when absent."""
        self._require("search")
        raise UnsupportedCapabilityError(f"{self.name} has not implemented search()")

    def publish(self, **kw: Any) -> dict[str, Any]:
        """Publish content. Requires OAuth/paid keys → usually unsupported in Phase 1."""
        self._require("publishing")
        raise UnsupportedCapabilityError(
            f"{self.name} publishing requires OAuth credentials not configured"
        )

    def analytics(self, **kw: Any) -> dict[str, Any]:
        """Account analytics. Requires paid API access → usually unsupported."""
        self._require("analytics")
        raise UnsupportedCapabilityError(
            f"{self.name} analytics requires paid API access not configured"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "capabilities": sorted(self.capabilities),
        }


class RedditProvider(SocialProvider):
    """Reddit — keyless public search/posts via the JSON API."""

    def __init__(self) -> None:
        super().__init__(
            name="reddit",
            display_name="Reddit",
            capabilities={"search", "posts", "research", "profile"},
        )

    def search(self, query: str, max_results: int = 5, **kw: Any) -> list[dict[str, Any]]:
        from app.services.search import search_reddit

        return search_reddit(query, max_results=max_results)


class YouTubeProvider(SocialProvider):
    """YouTube — public research/search keyless via scoped web search."""

    def __init__(self) -> None:
        super().__init__(
            name="youtube",
            display_name="YouTube",
            capabilities={"search", "research"},
        )

    def search(self, query: str, max_results: int = 5, **kw: Any) -> list[dict[str, Any]]:
        from app.services.search import search_youtube

        return search_youtube(query, max_results=max_results)


class TelegramProvider(SocialProvider):
    """Telegram — real publishing via the Bot API when configured (spec §10 note).

    Telegram isn't in the spec's canonical list but is the one self-hosted
    channel that actually supports publishing free of charge.
    """

    def __init__(self) -> None:
        super().__init__(
            name="telegram",
            display_name="Telegram",
            capabilities={"publishing"},
        )

    def publish(self, text: str, chat_id: str | None = None, **kw: Any) -> dict[str, Any]:
        from app.services.social import telegram_send_message

        result = telegram_send_message(text, chat_id=chat_id)
        if result is None:
            return {"ok": False, "error": "telegram not configured"}
        return {"ok": bool(result.get("ok")), "message_id": result.get("result", {}).get("message_id")}


class InstagramProvider(SocialProvider):
    def __init__(self) -> None:
        super().__init__(name="instagram", display_name="Instagram", capabilities={"research"})


class TikTokProvider(SocialProvider):
    def __init__(self) -> None:
        super().__init__(name="tiktok", display_name="TikTok", capabilities={"research"})


class LinkedInProvider(SocialProvider):
    def __init__(self) -> None:
        super().__init__(name="linkedin", display_name="LinkedIn", capabilities={"research"})


class XProvider(SocialProvider):
    def __init__(self) -> None:
        super().__init__(name="x", display_name="X", capabilities={"research"})


_PROVIDERS: dict[str, SocialProvider] = {
    p.name: p
    for p in (
        RedditProvider(),
        YouTubeProvider(),
        TelegramProvider(),
        InstagramProvider(),
        TikTokProvider(),
        LinkedInProvider(),
        XProvider(),
    )
}


def get_provider(name: str) -> SocialProvider | None:
    """Fetch an adapter by name, or None when unknown."""
    return _PROVIDERS.get(name.lower())


def list_providers() -> list[dict[str, Any]]:
    return [p.to_dict() for p in _PROVIDERS.values()]
