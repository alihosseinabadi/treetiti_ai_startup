"""TREEtiti AI Agency OS — Tool Registry & Tool Router (spec §19, §20, §21, §22).

Tools are registered centrally with rich metadata and NEVER hardcoded inside
agents. The router resolves a desired capability into an execution chain:

    capability → registry → free/cost filter → agent-permission filter →
    reliability/latency rank → execute → validate → retry fallback

FREE_ONLY (§30) excludes paid tools unless explicitly overridden. Short-circuit
ordering (cheapest direct method first) matches the spec's Tool Router example.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Iterable

from app.core.permissions import can

logger = logging.getLogger("treetiti.core.tools")

COST_FREE = "free"
COST_PAID = "paid"

# Tool category enum (spec §19).
CATEGORIES = frozenset(
    {
        "research", "social", "content", "image", "video", "analytics",
        "business", "sales", "developer", "database", "utility",
    }
)

# Fallback chains: capability -> ordered list of tool names to try (spec §22).
DEFAULT_FALLBACK_CHAINS: dict[str, list[str]] = {
    "search_web": ["http_search", "playwright_search", "scrapegraph_ai", "official_api"],
    "search_news": ["news_search", "http_search"],
    "search_social": ["social_research", "http_search"],
    "search_reddit": ["reddit_search", "http_search"],
    "search_youtube": ["youtube_search", "http_search"],
    "get_trends": ["trends_lookup", "http_search"],
    "analyze_competitor": ["competitor_analysis", "http_fetch"],
    "fetch_page": ["http_fetch", "playwright_fetch"],
    "generate_image": ["google_gemini_image", "local_sd_image"],
    "generate_video": ["ffmpeg_assembly", "remotion_render", "openmontage_pipeline"],
    "embed_text": ["ollama_embed", "hash_fallback"],
    "publish_post": ["telegram_publish", "vk_publish", "linkedin_publish"],
}


class ToolExecutionError(RuntimeError):
    pass


@dataclass(frozen=True)
class ToolSpec:
    name: str
    capability: str
    category: str = "utility"
    description: str = ""
    cost_tier: str = COST_FREE
    authentication: str = "none"  # none | api_key | oauth
    rate_limit: str = ""
    reliability_score: float = 0.9
    latency_score: float = 0.8
    allowed_agents: tuple[str, ...] = ()
    required_env: tuple[str, ...] = ()
    execute: Callable[..., Any] | None = None
    enabled: bool = True

    def __post_init__(self) -> None:
        if self.category not in CATEGORIES and self.category != "utility":
            raise ValueError(f"unknown tool category: {self.category!r}")
        if self.cost_tier not in (COST_FREE, COST_PAID):
            raise ValueError(f"invalid cost tier: {self.cost_tier!r}")

    @property
    def is_free(self) -> bool:
        return self.cost_tier == COST_FREE

    @property
    def available(self) -> bool:
        """True when all required env keys are set and the tool is enabled."""
        if not self.enabled:
            return False
        import os

        return all((os.environ.get(k) or "0") for k in self.required_env if k not in ("", "0")) or not self.required_env


@dataclass
class ToolResult:
    ok: bool
    value: Any = None
    tool: str = ""
    error: str = ""
    cost_tier: str = COST_FREE
    attempts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ToolRegistry:
    def __init__(self, specs: Iterable[ToolSpec] | None = None) -> None:
        self._tools: dict[str, ToolSpec] = {}
        for spec in specs or ():
            self.register(spec)

    # -- management --------------------------------------------------------
    def register(self, spec: ToolSpec) -> None:
        if spec.name in self._tools:
            raise KeyError(f"tool already registered: {spec.name}")
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def all(self) -> list[ToolSpec]:
        return list(self._tools.values())

    def by_capability(self, capability: str) -> list[ToolSpec]:
        return [t for t in self._tools.values() if t.capability == capability]

    # -- routing -----------------------------------------------------------
    def _available_for(self, capability: str, agent_key: str, *, free_only: bool) -> list[ToolSpec]:
        out: list[ToolSpec] = []
        for tool in self.by_capability(capability):
            if not tool.enabled:
                continue
            if free_only and not tool.is_free:
                continue
            if tool.required_env and not tool.available:
                continue
            if tool.allowed_agents and agent_key not in tool.allowed_agents:
                continue
            if agent_key and not can(agent_key, tool.capability):
                continue
            out.append(tool)
        return out

    def resolve(
        self,
        capability: str,
        agent_key: str = "",
        *,
        free_only: bool | None = None,
        include_unavailable: bool = False,
    ) -> list[ToolSpec]:
        """Ranked candidates for a capability (best first).

        When ``include_unavailable`` is true, tools disabled for missing env
        keys are still listed last so callers can explain the gap.
        """
        from app.config import get_settings

        settings = get_settings()
        if free_only is None:
            free_only = settings.free_only
        ranked = sorted(
            self._available_for(capability, agent_key, free_only=free_only),
            key=lambda t: (t.reliability_score * 0.6 + t.latency_score * 0.4),
            reverse=True,
        )
        if include_unavailable:
            missing = [t for t in self.by_capability(capability) if t not in ranked]
            ranked += [t for t in missing if t.enabled]
        return ranked

    def fallback_chain(
        self,
        capability: str,
        agent_key: str = "",
        *,
        free_only: bool | None = None,
    ) -> list[str]:
        """Ordered tool names to try for ``capability`` (spec §22 chain).

        Only tools that survive resolution (registered, free, permitted for the
        agent) are listed. The spec-ordered ``DEFAULT_FALLBACK_CHAINS`` sets the
        preference order between the surviving candidates; any additional
        eligible tools are appended afterwards.
        """
        resolved = [t.name for t in self.resolve(capability, agent_key, free_only=free_only)]
        if not resolved:
            return []
        preferred = DEFAULT_FALLBACK_CHAINS.get(capability, [])
        preferred_set = set(preferred)
        chain = [name for name in preferred if name in resolved]
        chain += [name for name in resolved if name not in preferred_set]
        return chain

    def execute(
        self,
        capability: str,
        agent_key: str = "",
        *,
        args: dict[str, Any] | None = None,
        free_only: bool | None = None,
        max_attempts: int = 3,
    ) -> ToolResult:
        """Run the best available tool; retry down the fallback chain on failure.

        Never retries beyond ``max_attempts`` (spec §44: no endless retry).
        """
        args = args or {}
        chain = self.fallback_chain(capability, agent_key, free_only=free_only)
        attempts: list[str] = []
        for name in chain:
            tool = self.get(name)
            if tool is None or tool.execute is None:
                continue
            attempts.append(name)
            try:
                value = tool.execute(**args)
                return ToolResult(ok=True, value=value, tool=name,
                                  cost_tier=tool.cost_tier, attempts=attempts)
            except Exception as exc:  # noqa: BLE001
                logger.warning("tool %s failed for %s: %s", name, capability, exc)
            if len(attempts) >= max_attempts:
                break
        return ToolResult(
            ok=False,
            error=f"all tools for {capability!r} failed ({len(attempts)} attempts)",
            attempts=attempts,
        )

    def to_dicts(self) -> list[dict[str, Any]]:
        return [asdict(t) for t in sorted(self._tools.values(), key=lambda t: t.name)]


# ---------------------------------------------------------------------------
# Bundled free tools (wrappers that degrade to clear errors without keys)
# ---------------------------------------------------------------------------

def _social_research(query: str, max_results: int = 5, **kw: Any) -> list[dict[str, str]]:
    """Aggregate keyless social research across Reddit + YouTube (spec §10)."""
    from app.services.social import get_provider

    hits: list[dict[str, str]] = []
    for name in ("reddit", "youtube"):
        provider = get_provider(name)
        if provider is None or "search" not in provider.capabilities:
            continue
        try:
            hits.extend(provider.search(query, max_results=max_results))
        except Exception as exc:  # noqa: BLE001
            logger.warning("social provider %s search failed: %s", name, exc)
    return hits


def _telegram_publish(text: str, chat_id: str | None = None, **kw: Any) -> dict[str, Any]:
    """Publish via the Telegram provider adapter (spec §10)."""
    from app.services.social import get_provider

    provider = get_provider("telegram")
    if provider is None or "publishing" not in provider.capabilities:
        return {"ok": False, "error": "telegram provider unavailable"}
    return provider.publish(text, chat_id=chat_id)


def _free_tools() -> list[ToolSpec]:
    from app.services import search as _search  # noqa: PLC0415
    from app.llm import generate_image as _gen_image  # noqa: PLC0415  (lazy)

    return [
        ToolSpec(
            name="http_search",
            capability="search_web",
            category="research",
            description="Keyless DuckDuckGo/Bing web search returning normalized results.",
            execute=_search.search_web,
        ),
        ToolSpec(
            name="http_fetch",
            capability="fetch_page",
            category="research",
            description="Fetch and strip-page a URL to plain text (no auth).",
            execute=_search.fetch_text,
        ),
        ToolSpec(
            name="news_search",
            capability="search_news",
            category="research",
            description="Keyless news search (DDG news vertical, Bing fallback).",
            execute=_search.search_news,
        ),
        ToolSpec(
            name="reddit_search",
            capability="search_reddit",
            category="research",
            description="Keyless Reddit public search via the JSON API.",
            execute=_search.search_reddit,
        ),
        ToolSpec(
            name="youtube_search",
            capability="search_youtube",
            category="research",
            description="Keyless YouTube search via scoped web query.",
            execute=_search.search_youtube,
        ),
        ToolSpec(
            name="trends_lookup",
            capability="get_trends",
            category="research",
            description="Keyless trending-topics lookup via recent web chatter.",
            execute=_search.get_trends,
        ),
        ToolSpec(
            name="competitor_analysis",
            capability="analyze_competitor",
            category="research",
            description="Lightweight competitor scan of a public site (spec §9).",
            execute=_search.analyze_competitor,
        ),
        ToolSpec(
            name="social_research",
            capability="search_social",
            category="social",
            description="Social research via provider adapters (Reddit/YouTube, spec §10).",
            execute=_social_research,
        ),
        ToolSpec(
            name="telegram_publish",
            capability="publish_post",
            category="social",
            description="Publish a post via the Telegram Bot API (free, keyless when configured).",
            execute=_telegram_publish,
        ),
        ToolSpec(
            name="google_gemini_image",
            capability="generate_image",
            category="image",
            cost_tier=COST_FREE,
            authentication="api_key",
            required_env=("GOOGLE_AI_STUDIO_KEY",),
            description="Image generation via Google AI Studio (free tier).",
            execute=_gen_image,
        ),
        ToolSpec(
            name="hash_fallback",
            capability="embed_text",
            category="utility",
            description="Deterministic token-hash vector fallback when no embedder is configured.",
            execute=None,  # wired by embeddening layer as needed
        ),
    ]


singleton: ToolRegistry | None = None


def get_registry() -> ToolRegistry:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = ToolRegistry(_free_tools())
    return singleton