"""Unit tests for core.model_registry: Model Pool + Router + FREE_ONLY (spec §23, §29, §30)."""

from __future__ import annotations

import pytest

from app.core.model_registry import (
    FreeTierUnavailableError,
    ModelRegistry,
    ModelSpec,
    TaskSpec,
)

FREE_MODEL = ModelSpec(
    model="opencode/deepseek-v4-flash-free",
    provider="opencode",
    cost_tier="free",
    context_length=131072,
    tool_calling=True,
    structured_output=True,
    quality_score=0.91,
    latency_score=0.89,
    reliability_score=0.95,
)


def _registry() -> ModelRegistry:
    reg = ModelRegistry([FREE_MODEL])
    reg.register(
        ModelSpec(
            model="paid/diamond",
            cost_tier="paid",
            structured_output=True,
            tool_calling=True,
            quality_score=0.99,
        )
    )
    reg.register(
        ModelSpec(
            model="free/vision",
            cost_tier="free",
            vision=True,
            structured_output=False,
            quality_score=0.6,
        )
    )
    # Second free reasoning-capable model so exclusion still has an eligible
    # candidate (free/vision cannot satisfy a reasoning task).
    reg.register(
        ModelSpec(
            model="free/thinker",
            cost_tier="free",
            structured_output=True,
            tool_calling=True,
            quality_score=0.88,
        )
    )
    return reg


def test_register_and_get():
    reg = _registry()
    assert reg.get("paid/diamond") is not None
    assert reg.get("nope") is None


def test_free_only_excludes_paid():
    reg = _registry()
    task = TaskSpec.for_profile("reasoning", allow_paid=False)
    ranked = reg.rank(task)
    assert all(r.spec.is_free for r in ranked)


def test_free_only_raises_when_no_free_model():
    reg = ModelRegistry(
        [
            ModelSpec(
                model="paid/only",
                cost_tier="paid",
                structured_output=True,
                tool_calling=True,
            )
        ]
    )
    with pytest.raises(FreeTierUnavailableError):
        reg.pick(TaskSpec.for_profile("reasoning"), free_only=True)


def test_allows_paid_when_flag_off():
    reg = _registry()
    picked = reg.pick(TaskSpec.for_profile("reasoning", allow_paid=True))
    assert picked.model == "paid/diamond"  # higher quality wins


def test_vision_requirement_filters():
    reg = _registry()
    task = TaskSpec.for_profile("vision")
    picked = reg.pick(task, free_only=True)
    assert picked.spec.vision is True
    assert picked.model == "free/vision"


def test_json_requirement_keeps_structured():
    reg = _registry()
    task = TaskSpec.for_profile("json")
    for choice in reg.rank(task):
        assert choice.spec.structured_output is True


def test_exclude_filter():
    reg = _registry()
    task = TaskSpec.for_profile("reasoning", exclude=frozenset({"opencode/deepseek-v4-flash-free"}))
    picked = reg.pick(task, free_only=True)
    # deepseek excluded; paid/diamond filtered by FREE_ONLY; free/vision cannot
    # do reasoning (no structured output) -> next-best free reasoning model wins.
    assert picked.model == "free/thinker"


def test_quota_tracking():
    reg = _registry()
    spec = ModelSpec(
        model="free/lowquota",
        cost_tier="free",
        structured_output=True,
        quota_remaining=3,
    )
    reg.register(spec)
    task = TaskSpec.for_profile("json", quota_required=True)
    assert reg.rank(task)  # available while quota > 0
    reg.record_quota_used("free/lowquota", n=3)
    assert reg.get("free/lowquota").quota_remaining == 0
    assert reg.pick(TaskSpec.for_profile("json", quota_required=True), free_only=True).model != "free/lowquota"


def test_rank_orders_by_quality():
    reg = ModelRegistry(
        [
            ModelSpec(model="m1", cost_tier="free", quality_score=0.5, structured_output=True),
            ModelSpec(model="m2", cost_tier="free", quality_score=0.9, structured_output=True),
        ]
    )
    ranked = reg.rank(TaskSpec.for_profile("json"))
    assert ranked[0].model == "m2"