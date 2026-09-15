"""TREEtiti AI Agency OS — multi-layered QA gate (spec §35, §44).

Deterministic checks (schema, required fields, limits, forbidden terms, format,
duplicates) run first and cheap. LLM-based checks (brand alignment, strategic
relevance, visual consistency) are pluggable. The gate is BLOCKING: a failed
verdict returns revision notes and stops the pipeline — agents must revise
instead of shipping bad output downstream.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Iterable

from app.core.events import QA_FAILED, QA_PASSED, emit

Rule = Callable[[dict[str, Any]], list[str]]  # payload -> list of problems


@dataclass
class GateVerdict:
    passed: bool
    problems: list[str] = field(default_factory=list)
    scores: dict[str, float] = field(default_factory=dict)
    stage: str = "qa"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def revision_notes(self) -> list[str]:
        return ["-" + p for p in self.problems]


def _require_fields(*fields: str) -> Rule:
    def rule(payload: dict[str, Any]) -> list[str]:
        missing = [f for f in fields if not payload.get(f)]
        return [f"missing required field: {f}" for f in missing]

    return rule


def _max_length(field_name: str, limit: int) -> Rule:
    def rule(payload: dict[str, Any]) -> list[str]:
        value = payload.get(field_name, "")
        if value and len(value) > limit:
            return [f"{field_name} exceeds {limit} chars ({len(value)})"]
        return []

    return rule


def _forbidden_terms(*terms: str) -> Rule:
    pattern = re.compile("|".join(re.escape(t) for t in terms), re.IGNORECASE)

    def rule(payload: dict[str, Any]) -> list[str]:
        blob = " ".join(str(v) for v in payload.values())
        hits = [t for t in terms if pattern.search(blob)]
        return [f"forbidden term used: {t}" for t in hits]

    return rule


def _json_schema_like(payload: dict[str, Any], required: dict[str, Any]) -> Rule:
    """Minimal schema check: required keys with expected python types."""

    def rule(data: dict[str, Any]) -> list[str]:
        problems: list[str] = []
        for key, expected in required.items():
            value = data.get(key)
            if value is None:
                problems.append(f"missing field: {key}")
                continue
            if expected == list and not isinstance(value, list):
                problems.append(f"{key} must be a list")
            if expected == dict and not isinstance(value, dict):
                problems.append(f"{key} must be an object")
            if expected == str and not isinstance(value, str):
                problems.append(f"{key} must be a string")
            if expected == int and not isinstance(value, (int, float)):
                problems.append(f"{key} must be a number")
        return problems

    return rule


class QualityGate:
    """Ordered rule set. A payload passes only when every rule is clean."""

    def __init__(self, rules: Iterable[Rule] | None = None, *, stage: str = "qa") -> None:
        self._rules: list[tuple[str, Rule]] = []
        self.stage = stage
        for rule in rules or ():
            self.add(rule)

    def add(self, rule: Rule, *, name: str = "") -> None:
        self._rules.append((name or getattr(rule, "__name__", "rule"), rule))

    def evaluate(self, payload: dict[str, Any], *, workflow_id: str = "") -> GateVerdict:
        problems: list[str] = []
        for name, rule in self._rules:
            try:
                problems.extend(rule(payload))
            except Exception as exc:  # noqa: BLE001
                problems.append(f"rule {name!r} crashed: {exc}")
        verdict = GateVerdict(
            passed=not problems,
            problems=problems,
            scores={"deterministic": 0.0 if problems else 1.0},
            stage=self.stage,
        )
        emit(QA_PASSED if verdict.passed else QA_FAILED,
             source=self.stage,
             payload={"passed": verdict.passed, "problems": problems},
             workflow_id=workflow_id)
        return verdict

    def require(
        self,
        payload: dict[str, Any],
        *,
        workflow_id: str = "",
        producer: str = "",
        revision: Callable[[str, list[str], float], Any] | None = None,
    ) -> tuple[bool, GateVerdict]:
        """Blocking evaluate: returns (accepted, verdict).

        When ``revision`` is provided and the gate fails, it is called with the
        artifact id, revision notes and a score so versions can be created
        (spec §34) instead of silently discarding work.
        """
        verdict = self.evaluate(payload, workflow_id=workflow_id)
        if verdict.passed:
            return True, verdict
        if revision is not None and producer:
            artifact_id = payload.get("artifact_id") or payload.get("id")
            revision(str(artifact_id or ""), verdict.revision_notes, 0.0)
        return False, verdict


# ---------------------------------------------------------------------------
# Standard gates reused across the agency
# ---------------------------------------------------------------------------

_FORBIDDEN = ("buy now", "act fast", "limited time", "100% guaranteed", "no risk")

CONTENT_GATE = QualityGate(
    [
        _require_fields("title", "body", "hook", "cta"),
        _max_length("title", 120),
        _max_length("body", 5000),
        _forbidden_terms(*_FORBIDDEN),
    ],
    stage="content_qa",
)

CREATIVE_BRIEF_GATE = QualityGate(
    [
        _require_fields("platform", "format", "objective", "hook", "message", "audience"),
        _json_schema_like(
            {},
            {
                "platform": str, "format": str, "objective": str,
                "hook": str, "message": str, "audience": str,
                "scene_count": int,
            },
        ),
    ],
    stage="creative_brief_qa",
)

VIDEO_MANIFEST_GATE = QualityGate(
    [
        _require_fields("duration", "aspect_ratio", "scenes"),
        _json_schema_like({}, {"scenes": list, "duration": int}),
    ],
    stage="video_manifest_qa",
)


def run_all(payload: dict[str, Any], gates: Iterable[QualityGate]) -> list[GateVerdict]:
    return [g.evaluate(payload) for g in gates]