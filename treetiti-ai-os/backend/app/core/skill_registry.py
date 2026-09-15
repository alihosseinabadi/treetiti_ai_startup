"""TREEtiti AI Agency OS — Skill Registry (spec §17, §18).

Instead of hundreds of runtime agents, agents receive specialized, versioned
skills. Skills are dynamically loaded by task type and tag. The registry keeps
them queryable and versioned so the Artifact system can record which skill
versions produced an artifact.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Iterable

from app.core.permissions import can


@dataclass(frozen=True)
class SkillSpec:
    id: str
    version: str = "1.0"
    name: str = ""
    description: str = ""
    when_to_use: tuple[str, ...] = ()
    instructions: str = ""
    required_tools: tuple[str, ...] = ()
    required_models: tuple[str, ...] = ()
    input_schema: dict[str, Any] = field(default_factory=dict)
    output_schema: dict[str, Any] = field(default_factory=dict)
    quality_checks: tuple[str, ...] = ()
    enabled: bool = True

    @property
    def tags(self) -> frozenset[str]:
        return frozenset(self.when_to_use)

    def matches(self, tags: Iterable[str]) -> bool:
        wanted = set(tags)
        return bool(wanted & self.tags)


class SkillRegistry:
    def __init__(self, specs: Iterable[SkillSpec] | None = None) -> None:
        self._skills: dict[str, SkillSpec] = {}
        for spec in specs or ():
            self.register(spec)

    def register(self, spec: SkillSpec) -> None:
        self._skills[spec.id] = spec

    def get(self, skill_id: str) -> SkillSpec | None:
        return self._skills.get(skill_id)

    def all(self) -> list[SkillSpec]:
        return list(self._skills.values())

    def for_tags(self, tags: Iterable[str]) -> list[SkillSpec]:
        return [s for s in self._skills.values() if s.enabled and s.matches(tags)]

    def for_agent(self, agent_key: str, *, tags: Iterable[str] | None = None) -> list[SkillSpec]:
        """Skills a given agent is permitted to load (default: all registered)."""
        base = self.for_tags(tags or ())
        return [s for s in base if can(agent_key, "read_code") or s.id]

    def to_dicts(self) -> list[dict[str, Any]]:
        return [asdict(s) for s in sorted(self._skills.values(), key=lambda s: s.id)]


# ---------------------------------------------------------------------------
# Bundled skills from the spec's skill list (§17)
# ---------------------------------------------------------------------------

def _free_skills() -> list[SkillSpec]:
    return [
        SkillSpec(
            id="market_research",
            name="Market Research",
            when_to_use=("research", "market", "competitor", "trend"),
            required_tools=("http_search",),
            quality_checks=("structured evidence", "source links", "confidence scores"),
        ),
        SkillSpec(
            id="competitive_analysis",
            name="Competitive Analysis",
            when_to_use=("competitor", "benchmark"),
            required_tools=("http_search", "http_fetch"),
        ),
        SkillSpec(
            id="instagram_strategy",
            name="Instagram Strategy",
            when_to_use=("instagram", "reel", "social"),
        ),
        SkillSpec(
            id="content_strategy",
            name="Content Strategy",
            when_to_use=("content", "editorial"),
        ),
        SkillSpec(
            id="copywriting",
            name="Copywriting",
            when_to_use=("copy", "hook", "cta"),
        ),
        SkillSpec(
            id="ugc",
            name="UGC",
            when_to_use=("ugc", "lifestyle"),
        ),
        SkillSpec(
            id="growth",
            name="Growth",
            when_to_use=("growth", "acquisition"),
        ),
        SkillSpec(
            id="brand_strategy",
            name="Brand Strategy",
            when_to_use=("brand", "positioning"),
        ),
        SkillSpec(
            id="creative_direction",
            name="Creative Direction",
            when_to_use=("creative", "visual", "art"),
            required_models=("gemini-image",),
        ),
        SkillSpec(
            id="video_production",
            name="Video Production",
            when_to_use=("video", "reel", "motion"),
            required_tools=("ffmpeg",),
        ),
        SkillSpec(
            id="seo",
            name="SEO",
            when_to_use=("seo", "search"),
            required_tools=("http_search",),
        ),
        SkillSpec(
            id="copy_qa",
            name="Copy QA",
            when_to_use=("qa", "editor"),
        ),
        SkillSpec(
            id="software_architecture",
            name="Software Architecture",
            when_to_use=("architecture", "system", "backend"),
            required_models=("reasoning",),
        ),
        SkillSpec(
            id="sales_and_leads",
            name="Sales & Lead Generation",
            when_to_use=("sales", "lead", "crm"),
        ),
    ]


singleton: SkillRegistry | None = None


def get_registry() -> SkillRegistry:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = SkillRegistry(_free_skills())
    return singleton