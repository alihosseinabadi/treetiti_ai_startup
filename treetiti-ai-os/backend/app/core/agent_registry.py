"""TREEtiti AI Marketing OS — Agent Registry (spec §32, plan §D).

The registry is the single source of truth for WHO works in the agency:

- the full 19-agent target matrix (name, role, department, build phase),
- which spec agents are implemented vs planned (``status``),
- each agent's model profile for capability-based model binding (spec §7),
- each agent's skill tags and permission surface.

The CEO / orchestrator consults ``resolve()`` to dynamically activate only the
agents a task actually needs (spec: "The CEO dynamically activates only what is
required"). This module is pure Python + offline-testable; it never imports the
agent classes so the registry stays usable before every Phase 2+ agent ships.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any, Iterable

logger = logging.getLogger("treetiti.core.agents")

# Departments (plan §D). Order matters for the team display.
DEPARTMENTS = ("exec", "research", "strategy", "production", "quality", "growth", "memory")

# Status values: planned (declared, not yet written) | implemented (class exists).
STATUS_PLANNED = "planned"
STATUS_IMPLEMENTED = "implemented"


@dataclass(frozen=True)
class AgentSpec:
    key: str
    name: str
    role: str
    department: str
    phase: int                          # build phase from §32 (1-5)
    model_profile: str = "reasoning"    # binds to config.router_models (§7)
    status: str = STATUS_PLANNED
    skills: tuple[str, ...] = ()
    capabilities: tuple[str, ...] = ()  # permission capability names (§32)

    def __post_init__(self) -> None:
        if self.department not in DEPARTMENTS:
            raise ValueError(f"unknown department: {self.department!r}")
        if self.status not in (STATUS_PLANNED, STATUS_IMPLEMENTED):
            raise ValueError(f"unknown status: {self.status!r}")
        if not self.key or not self.name:
            raise ValueError("agent key and name are required")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class AgentRegistry:
    def __init__(self, specs: Iterable[AgentSpec] | None = None) -> None:
        self._agents: dict[str, AgentSpec] = {}
        self._active: set[str] = set()
        for spec in specs or ():
            self.register(spec)

    # -- management --------------------------------------------------------
    def register(self, spec: AgentSpec) -> None:
        if spec.key in self._agents:
            raise KeyError(f"agent already registered: {spec.key}")
        self._agents[spec.key] = spec
        if spec.status == STATUS_IMPLEMENTED:
            self._active.add(spec.key)

    def get(self, key: str) -> AgentSpec | None:
        return self._agents.get(key)

    def all(self) -> list[AgentSpec]:
        return list(self._agents.values())

    def implemented(self) -> list[AgentSpec]:
        return [a for a in self._agents.values() if a.status == STATUS_IMPLEMENTED]

    def by_department(self, department: str) -> list[AgentSpec]:
        return [a for a in self._agents.values() if a.department == department]

    def to_dicts(self) -> list[dict[str, Any]]:
        return [a.to_dict() for a in sorted(self._agents.values(), key=lambda a: (a.department, a.phase))]

    # -- activation (spec: CEO activates only what is required) ---------------
    def activate(self, key: str) -> bool:
        """Mark an agent as active for this run. False when unknown."""
        if key not in self._agents:
            return False
        self._active.add(key)
        return True

    def deactivate(self, key: str) -> None:
        self._active.discard(key)

    def active(self) -> list[AgentSpec]:
        return [self._agents[k] for k in sorted(self._active) if k in self._agents]

    # -- resolution for a task -------------------------------------------------
    def resolve(self, *, capabilities: Iterable[str] | None = None,
                skills: Iterable[str] | None = None,
                department: str | None = None,
                implemented_only: bool = True) -> list[AgentSpec]:
        """Agents matching the requested signals (any-of semantics).

        Capabilities and skills use "any match": an agent that holds ANY of the
        requested capabilities or skills qualifies. Used by the CEO to assemble
        the team for a task — only implemented agents by default.
        """
        caps = set(capabilities or ())
        skills = set(skills or ())
        out: list[AgentSpec] = []
        for agent in self._agents.values():
            if implemented_only and agent.status != STATUS_IMPLEMENTED:
                continue
            if department and agent.department != department:
                continue
            if caps and not (caps & set(agent.capabilities)):
                continue
            if skills and not (skills & set(agent.skills)):
                continue
            out.append(agent)
        return out


# ---------------------------------------------------------------------------
# The 19-agent matrix (plan §D). Status reflects what exists in app/agents/.
# ---------------------------------------------------------------------------

def _matrix() -> list[AgentSpec]:
    return [
        AgentSpec(key="ceo", name="CEO / Orchestrator", role="Dynamic supervisor; activates the right team per task",
                  department="exec", phase=2, model_profile="strategy", status=STATUS_IMPLEMENTED,
                  skills=("brand_strategy",), capabilities=("orchestrate", "delegate", "approve_internal")),
        AgentSpec(key="strategist", name="Business Strategist", role="Market strategy, positioning, campaign concepts",
                  department="exec", phase=2, model_profile="strategy", status=STATUS_IMPLEMENTED,
                  skills=("brand_strategy", "content_strategy"), capabilities=("database_read",)),
        AgentSpec(key="market_research", name="Researcher", role="Evidence-sourced market research (web + social)",
                  department="research", phase=2, model_profile="research", status=STATUS_IMPLEMENTED,
                  skills=("market_research", "competitive_analysis"), capabilities=("search", "scrape", "fetch_url", "search_web", "search_news", "search_social", "search_reddit", "search_youtube", "get_trends", "analyze_competitor")),
AgentSpec(key="content_hunter", name="Content Hunter / Trend Scout", role="Finds trends, angles and content gaps",
                  department="research", phase=2, model_profile="research", status=STATUS_IMPLEMENTED,
                  skills=("market_research", "growth"), capabilities=("search", "search_news", "get_trends")),
AgentSpec(key="social_intel", name="Social / Competitor Intel", role="Monitors competitor & social signals",
                  department="research", phase=2, model_profile="research", status=STATUS_IMPLEMENTED,
                  skills=("competitive_analysis",), capabilities=("search_social", "search_reddit", "analyze_competitor")),
AgentSpec(key="content_strategist", name="Content Strategist", role="Editorial calendar, content pillars, briefing",
                  department="strategy", phase=2, model_profile="strategy", status=STATUS_IMPLEMENTED,
                  skills=("content_strategy",), capabilities=("database_read",)),
AgentSpec(key="creative_director", name="Creative Director", role="Visual identity, art direction, brand look",
                  department="strategy", phase=2, model_profile="reasoning", status=STATUS_IMPLEMENTED,
                  skills=("creative_direction", "brand_strategy"), capabilities=("design",)),
        AgentSpec(key="content", name="Copywriter", role="Hooks, copy, CTAs in the brand voice",
                  department="strategy", phase=2, model_profile="content", status=STATUS_IMPLEMENTED,
                  skills=("copywriting",), capabilities=("content_create",)),
        AgentSpec(key="social_manager", name="Social Media Manager", role="Publish + engage across platform adapters",
                  department="strategy", phase=4, model_profile="content", status=STATUS_IMPLEMENTED,
                  skills=("instagram_strategy", "ugc"), capabilities=("publish_post", "send_message")),
AgentSpec(key="td_creative_director", name="3D Creative Director", role="3D look direction, concepts, asset briefs",
                  department="production", phase=3, model_profile="reasoning", status=STATUS_IMPLEMENTED,
                  skills=("creative_direction",), capabilities=("design",)),
AgentSpec(key="td_asset_producer", name="3D Asset Producer", role="Builds 3D assets via Tripo/Meshy/Blender",
                  department="production", phase=3, model_profile="reasoning", status=STATUS_IMPLEMENTED,
                  skills=(), capabilities=()),
        AgentSpec(key="image", name="Image Producer", role="Image generation via multi-provider abstraction",
                  department="production", phase=3, model_profile="image", status=STATUS_IMPLEMENTED,
                  skills=("creative_direction",), capabilities=("image_generate", "generate_image")),
        AgentSpec(key="video", name="Video Director", role="Video direction, scripts, shot lists, assembly",
                  department="production", phase=3, model_profile="vision", status=STATUS_IMPLEMENTED,
                  skills=("video_production",), capabilities=("video_generate", "generate_video")),
AgentSpec(key="video_producer", name="Video Producer", role="Renders/assembles video via media providers",
                  department="production", phase=3, model_profile="vision", status=STATUS_IMPLEMENTED,
                  skills=("video_production",), capabilities=("generate_video",)),
AgentSpec(key="ugc_producer", name="UGC / Influencer Producer", role="UGC-style content (image+video+voice combo)",
                  department="production", phase=3, model_profile="content", status=STATUS_IMPLEMENTED,
                  skills=("ugc",), capabilities=("content_create", "image_generate", "video_generate")),
        AgentSpec(key="editor", name="QA / Brand Guardian", role="VETO-quality gate over every important output",
                  department="quality", phase=2, model_profile="qa", status=STATUS_IMPLEMENTED,
                  skills=("copy_qa",), capabilities=("approve_internal",)),
        AgentSpec(key="analytics", name="Analytics", role="WHY behind the numbers, insight reports",
                  department="growth", phase=4, model_profile="analytics", status=STATUS_IMPLEMENTED,
                  skills=("growth",), capabilities=("analytics", "database_read")),
        AgentSpec(key="growth_optimizer", name="Growth Optimizer", role="Learning loop: analyze → optimize → re-run",
                  department="growth", phase=4, model_profile="analytics", status=STATUS_IMPLEMENTED,
                  skills=("growth",), capabilities=("analytics",)),
        AgentSpec(key="brand", name="Brand Brain", role="Persistent business memory; every agent reads/writes",
                  department="memory", phase=2, model_profile="strategy", status=STATUS_IMPLEMENTED,
                  skills=("brand_strategy",), capabilities=("read_memory", "write_memory", "approve_internal")),
    ]


singleton: AgentRegistry | None = None


def get_registry() -> AgentRegistry:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = AgentRegistry(_matrix())
    return singleton
