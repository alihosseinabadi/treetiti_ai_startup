"""TREEtiti AI Agency OS — Artifact system & versioning (spec §33, §34, §37).

Everything important an agent produces becomes a versioned Artifact with full
provenance (created_by_agent, model, skill/tool versions, parent lineage). This
makes the whole agency answerable to "why did we create this content?".

Storage: content-addressed JSON files under a data directory (default
``./treetiti-artifacts``, override with ``ARTIFACT_DIR``). Versions are never
overwritten — QA rejection produces v2, v3… on the same artifact id.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

logger = logging.getLogger("treetiti.core.artifacts")

ARTIFACT_TYPES = frozenset(
    {
        "ResearchArtifact", "InsightArtifact", "StrategyArtifact", "CampaignArtifact",
        "ContentArtifact", "CreativeBriefArtifact", "ImageArtifact", "VideoArtifact",
        "QAArtifact", "ApprovalArtifact", "AnalyticsArtifact", "LearningArtifact",
    }
)


@dataclass
class Artifact:
    id: str
    type: str
    version: int = 1
    parent_id: str = ""
    created_by_agent: str = ""
    model: str = ""
    skill_versions: list[dict] = field(default_factory=list)
    tool_versions: list[dict] = field(default_factory=list)
    prompt_version: str = ""
    status: str = "draft"        # draft | passed | failed | approved | published
    quality_score: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: dict[str, Any] = field(default_factory=dict)

    def validated(self) -> "Artifact":
        if self.type not in ARTIFACT_TYPES:
            raise ValueError(f"unknown artifact type: {self.type!r}")
        if not self.id:
            raise ValueError("artifact id is required")
        return self

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ArtifactStore:
    def __init__(self, root: str | os.PathLike | None = None) -> None:
        self.root = Path(root or os.environ.get("ARTIFACT_DIR", "treetiti-artifacts"))
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._by_id: dict[str, list[Artifact]] = {}

    # -- I/O ----------------------------------------------------------------
    def _path(self, artifact: Artifact) -> Path:
        return self.root / f"{artifact.id}.v{artifact.version}.json"

    def _write(self, artifact: Artifact) -> Path:
        path = self._path(artifact)
        path.write_text(json.dumps(artifact.to_dict(), ensure_ascii=False, indent=2))
        return path

    # -- save / revision ------------------------------------------------------
    def save(self, artifact: Artifact) -> Artifact:
        artifact.validated()
        with self._lock:
            existing = self._by_id.setdefault(artifact.id, [])
            if existing:
                artifact.version = max(a.version for a in existing) + 1
            existing.append(artifact)
            self._write(artifact)
        logger.info("artifact saved: %s v%d", artifact.id, artifact.version)
        return artifact

    def new(
        self,
        *,
        artifact_type: str,
        agent: str = "",
        model: str = "",
        parent_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> Artifact:
        return Artifact(
            id=uuid.uuid4().hex,
            type=artifact_type,
            parent_id=parent_id,
            created_by_agent=agent,
            model=model,
            payload=payload or {},
        )

    # -- revisions (spec §34: QA reject → new version, old kept) ----------------
    def revise(
        self,
        artifact_id: str,
        *,
        feedback: str = "",
        quality_score: float = 0.0,
        payload: dict[str, Any] | None = None,
    ) -> Artifact | None:
        """Create the next version of an artifact from QA feedback."""
        current = self.latest(artifact_id)
        if current is None:
            return None
        revised = Artifact(
            id=current.id,
            type=current.type,
            parent_id=current.parent_id,
            created_by_agent=current.created_by_agent,
            model=current.model,
            skill_versions=list(current.skill_versions),
            tool_versions=list(current.tool_versions),
            prompt_version=current.prompt_version,
            status="revision",
            payload={**current.payload, **(payload or {}), "_qa_feedback": feedback},
        )
        return self.save(revised)

    # -- reads ----------------------------------------------------------------
    def latest(self, artifact_id: str) -> Artifact | None:
        versions = self._by_id.get(artifact_id)
        if not versions:
            return None
        return max(versions, key=lambda a: a.version)

    def versions(self, artifact_id: str) -> list[Artifact]:
        return self._by_id.get(artifact_id, [])

    def all(self) -> list[Artifact]:
        return [a for vs in self._by_id.values() for a in vs]

    # -- provenance (spec §33 "Why did we create this?") ------------------------
    def lineage(self, artifact_id: str) -> list[Artifact]:
        """Parent chain from the oldest ancestor to the current artifact."""
        chain: list[Artifact] = []
        seen: set[str] = set()
        current = self.latest(artifact_id)
        while current is not None and current.id not in seen:
            chain.insert(0, current)
            seen.add(current.id)
            if not current.parent_id:
                break
            current = self.latest(current.parent_id)
        return chain

    def to_dicts(self, *, artifact_type: str | None = None) -> list[dict[str, Any]]:
        pool = self.all()
        if artifact_type:
            pool = [a for a in pool if a.type == artifact_type]
        pool.sort(key=lambda a: (a.id, a.version))
        return [a.to_dict() for a in pool]


singleton: ArtifactStore | None = None


def get_store(root: str | os.PathLike | None = None) -> ArtifactStore:
    global singleton  # noqa: PLW0603
    if singleton is None:
        singleton = ArtifactStore(root)
    return singleton