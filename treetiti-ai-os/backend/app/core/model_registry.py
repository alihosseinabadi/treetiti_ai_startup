"""TREEtiti AI Agency OS — Model Registry & dynamic Model Router (spec §23, §29, §30).

The registry is a pool of models with rich metadata (cost tier, context length,
tool-calling, structured output, vision, quality/latency/reliability scores,
quota). The router picks the best available model for a task by filtering:

    TASK → capabilities → registry → free/cost filter → context filter →
    tool-call/JSON/vision filters → quality/latency/quota rank → MODEL

FREE_ONLY policy (§30): when enabled, paid models are permanently excluded and a
clear error is raised (never a silent switch to paid) when no free model fits.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Iterable

from app.config import get_settings

logger = logging.getLogger("treetiti.core.models")

COST_FREE = "free"
COST_PAID = "paid"

# Provider prefix -> (provider name, cost tier default)
_PROVIDER_TIERS = {
    "opencode": COST_FREE,
    "zai": COST_FREE,
    "ollama": COST_FREE,
    "google": COST_FREE,
    "groq": COST_FREE,
    "ghm": COST_FREE,
    "nim": COST_FREE,
    "glm": COST_FREE,
    "cf": COST_FREE,
    "openrouter": COST_PAID,  # `:free` variants override this below
}

_TASK_PROFILES = {
    "reasoning": {"min_quality": 0.85, "tool_calling": True, "json": True, "vision": False},
    "research": {"min_quality": 0.7, "tool_calling": False, "json": True, "vision": False},
    "strategy": {"min_quality": 0.8, "tool_calling": False, "json": True, "vision": False},
    "analytics": {"min_quality": 0.75, "tool_calling": False, "json": True, "vision": False},
    "campaign": {"min_quality": 0.75, "tool_calling": False, "json": True, "vision": False},
    "content": {"min_quality": 0.7, "tool_calling": False, "json": True, "vision": False},
    "json": {"min_quality": 0.7, "tool_calling": False, "json": True, "vision": False},
    "coding": {"min_quality": 0.85, "tool_calling": True, "json": False, "vision": False},
    "qa": {"min_quality": 0.7, "tool_calling": False, "json": True, "vision": False},
    "vision": {"min_quality": 0.6, "tool_calling": False, "json": False, "vision": True},
    "image": {"min_quality": 0.6, "tool_calling": False, "json": False, "vision": True},
    "fast": {"min_quality": 0.5, "tool_calling": False, "json": False, "vision": False},
}


# Verified-live fast models (tested 2026-09-06 via OmniRoute gateway + direct).
FAST_MODELS = (
    "auto/best-coding",        # OmniRoute gateway — general fast
    "auto/best-free",          # OmniRoute gateway — strong general
    "auto/best-reasoning",     # OmniRoute gateway — reasoning
    "auto/best-fast",          # OmniRoute gateway — speed-optimised
    "oc/mimo-v2.5-free",       # OmniRoute gateway — MiMo V2.5
    "groq/compound",           # Groq direct — current flagship
    "groq/compound-mini",      # Groq direct — lightweight
    "qwen/qwen3.6-27b",       # Groq direct — Qwen
    "openai/gpt-oss-20b",     # Groq direct — GPT-OSS
    "agnes-2.5-pro",          # Agnes direct
)

class FreeTierUnavailableError(RuntimeError):
    """Raised when FREE_ONLY is on and no eligible free model exists (§30)."""


@dataclass(frozen=True)
class ModelSpec:
    model: str
    provider: str = "opencode"
    cost_tier: str = COST_FREE
    context_length: int = 0
    tool_calling: bool = True
    structured_output: bool = True
    vision: bool = False
    quality_score: float = 0.7
    latency_score: float = 0.8
    reliability_score: float = 0.9
    quota_remaining: int = -1  # -1 = unknown/unlimited
    notes: str = ""

    @property
    def label(self) -> str:
        return self.model

    @property
    def is_free(self) -> bool:
        return self.cost_tier == COST_FREE


@dataclass(frozen=True)
class TaskSpec:
    profile: str = "reasoning"
    capabilities: frozenset[str] = frozenset()
    tool_calling: bool | None = None
    structured_output: bool | None = None
    vision: bool | None = None
    min_quality: float = 0.0
    max_context: int = 0
    quota_required: bool = False
    allow_paid: bool | None = None
    exclude: frozenset[str] = frozenset()

    @classmethod
    def for_profile(cls, profile: str, **overrides: Any) -> "TaskSpec":
        base = _TASK_PROFILES.get(profile, _TASK_PROFILES["reasoning"])
        return cls(
            profile=profile,
            tool_calling=overrides.pop("tool_calling", base["tool_calling"]),
            structured_output=overrides.pop("json", base["json"]),
            vision=overrides.pop("vision", base["vision"]),
            min_quality=overrides.pop("min_quality", base["min_quality"]),
            **overrides,
        )


@dataclass
class RankedChoice:
    spec: ModelSpec
    score: float

    @property
    def model(self) -> str:
        return self.spec.model


class ModelRegistry:
    """Central pool of known models (spec §23, §29)."""

    def __init__(self, specs: Iterable[ModelSpec] | None = None) -> None:
        self._models: dict[str, ModelSpec] = {}
        for spec in specs or ():
            self.register(spec)

    # -- management --------------------------------------------------------
    def register(self, spec: ModelSpec) -> None:
        self._models[spec.model] = spec

    def register_legacy(self, model: str, provider: str | None = None, **meta: Any) -> None:
        """Register from a plain model string (helper for config/arena seeding)."""
        self.register(ModelSpec(model=model, provider=provider or _provider_of(model), **meta))

    def unregister(self, model: str) -> None:
        self._models.pop(model, None)

    def all(self) -> list[ModelSpec]:
        return list(self._models.values())

    def get(self, model: str) -> ModelSpec | None:
        return self._models.get(model)

    def enabled(self) -> list[ModelSpec]:
        return list(self._models.values())

    # -- filtering ---------------------------------------------------------
    def _eligible(self, task: TaskSpec) -> list[ModelSpec]:
        settings = get_settings()
        free_only = settings.free_only if task.allow_paid is None else not task.allow_paid
        out: list[ModelSpec] = []
        for spec in self._models.values():
            if spec.model in task.exclude:
                continue
            if free_only and not spec.is_free:
                continue
            if spec.quality_score < task.min_quality:
                continue
            if task.max_context and spec.context_length and spec.context_length < task.max_context:
                continue
            if task.tool_calling and not spec.tool_calling:
                continue
            if task.structured_output and not spec.structured_output:
                continue
            if task.vision and not spec.vision:
                continue
            if task.quota_required and spec.quota_remaining == 0:
                continue
            out.append(spec)
        return out

    def rank(self, task: TaskSpec) -> list[RankedChoice]:
        """Rank eligible models by a weighted quality/latency/reliability score."""
        candidates = self._eligible(task)
        ranked = sorted(
            candidates,
            key=lambda s: _rank_score(s, task),
            reverse=True,
        )
        return [RankedChoice(spec=s, score=_rank_score(s, task)) for s in ranked]

    def pick(self, task: TaskSpec, *, free_only: bool | None = None) -> RankedChoice:
        """Best candidate; raises FreeTierUnavailableError when none qualify."""
        settings = get_settings()
        if free_only is None:
            free_only = settings.free_only
        if free_only and not _has_free(self._models.values()):
            raise FreeTierUnavailableError(
                "FREE_ONLY=true but the registry contains no free model for this task."
            )
        ranked = self.rank(task)
        if not ranked:
            mode = "FREE_ONLY=true" if free_only else "paid models allowed"
            raise FreeTierUnavailableError(
                f"no model satisfies the task {task.profile!r} under {mode}. "
                "Refusing to silently fall back to a paid provider."
            )
        return ranked[0]

    def pick_for_profile(self, profile: str, *, free_only: bool | None = None) -> RankedChoice:
        """Pick for a named profile, honouring the config tier table first.

        Spec §7: an agent declares a capability profile and the router binds it
        to the configured ``router_models[profile]`` slug. The configured slug is
        returned when it satisfies the task filters; otherwise the pool ranking
        is used as the safety net (and raises as usual when nothing qualifies).
        """
        settings = get_settings()
        if free_only is None:
            free_only = settings.free_only
        task = TaskSpec.for_profile(profile)
        slug = settings.router_models.get(profile)
        if slug:
            spec = self._models.get(f"router/{slug}")
            if spec is not None and spec.model not in task.exclude:
                cost_ok = spec.is_free or not (free_only or (settings.free_only if task.allow_paid is None else not task.allow_paid))
                caps_ok = (
                    spec.quality_score >= task.min_quality
                    and (not task.tool_calling or spec.tool_calling)
                    and (not task.structured_output or spec.structured_output)
                    and (not task.vision or spec.vision)
                )
                if cost_ok and caps_ok:
                    return RankedChoice(spec=spec, score=_rank_score(spec, task))
        return self.pick(task, free_only=free_only)

    # -- quota tracking ----------------------------------------------------
    def record_quota_used(self, model: str, *, n: int = 1) -> None:
        spec = self._models.get(model)
        if spec and spec.quota_remaining > 0:
            remaining = max(0, spec.quota_remaining - n)
            self.register(ModelSpec(**{**asdict(spec), "quota_remaining": remaining}))

    def to_dicts(self) -> list[dict[str, Any]]:
        return [asdict(s) for s in sorted(self._models.values(), key=lambda m: m.model)]


def _provider_of(model: str) -> str:
    prefix, _, _ = model.partition("/")
    return prefix if prefix else "opencode"


def _rank_score(spec: ModelSpec, task: TaskSpec) -> float:
    # Quality is the primary rank axis; latency/reliability break ties (§23).
    wq, wl, wr = (0.6, 0.2, 0.2)
    return (
        spec.quality_score * wq
        + spec.latency_score * wl
        + spec.reliability_score * wr
    )


def _has_free(specs: Iterable[ModelSpec]) -> bool:
    return any(s.is_free for s in specs)


def build_default_registry(seed: dict[str, str] | None = None) -> ModelRegistry:
    """Seed the registry from settings (agent_models + verified free)."""
    settings = get_settings()
    reg = ModelRegistry()

    seed_items: dict[str, str] = {}
    seed_items.update(settings.verified_free_models)
    seed_items.update(seed or {})
    for key, model in seed_items.items():
        reg.register_legacy(
            model,
            cost_tier=_openrouter_free_cost(model),
            structured_output=True,
        )
    # 9Router gateway pool (spec §4/§29): capability-tied slugs rank first so
    # every picked model flows through the gateway. High quality + reliability,
    # slightly slower latency (gateway hop) — quality still wins the rank axis.
    for _profile, model in settings.router_models.items():
        reg.register_legacy(
            f"router/{model}",
            cost_tier=COST_FREE,
            structured_output=True,
            quality_score=0.92,
            latency_score=0.6,
            reliability_score=0.95,
        )
    # Config default brain model.
    if settings.opencode_model:
        reg.register_legacy(settings.opencode_model, structured_output=True)
    # Key-gated free models (GitHub Models, NVIDIA NIM, Z.ai, Cloudflare).
    _free_models = {
        "ghm-gpt4.1-mini": f"ghm/{settings.github_models_model or 'gpt-4.1-mini'}",
        "nim-llama": f"nim/{settings.nim_model or 'meta/llama-3.3-70b-instruct'}",
        "glm-flash": f"glm/{settings.zai_model or 'glm-4-flash'}",
        "cf-llama": f"cf/{settings.cf_model or '@cf/meta/llama-3.1-8b-instruct'}",
    }
    for key, model in _free_models.items():
        reg.register_legacy(
            model,
            cost_tier=_openrouter_free_cost(model),
            structured_output=True,
            quality_score=0.8,
            latency_score=0.7,
            reliability_score=0.85,
        )
    # Arena fast models (already whitelisted free).
    for model in FAST_MODELS:
        reg.register_legacy(model, cost_tier=_openrouter_free_cost(model), structured_output=True)
    return reg


def _openrouter_free_cost(model: str) -> str:
    if "/" in model and (model.endswith(":free") or ":free/" in model):
        return COST_FREE
    if model.startswith("openrouter/"):
        return COST_PAID
    return COST_FREE


singleton: ModelRegistry | None = None


def get_registry(seed: dict[str, str] | None = None) -> ModelRegistry:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = build_default_registry(seed)
    return singleton