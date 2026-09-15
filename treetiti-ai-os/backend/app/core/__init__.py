"""TREEtiti AI Agency OS — core OS layer (spec §17-§44).

Central registries and engines that make the agency behave like a system, not a
collection of chatbots:

    AGENTS  +  SKILLS  +  TOOLS  +  MODELS  +  WORKFLOWS
    + MEMORY + ARTIFACTS + QA + APPROVAL + ANALYTICS + LEARNING

Importing ``app.core`` must never require a live database or network — every
module here is pure-Python so the OS layer is unit-testable offline.
"""

from __future__ import annotations

from app.core import artifacts, events, model_registry, permissions, qa, skill_registry, tool_registry, workflow

# Re-export the public singletons for convenience
from app.core.events import bus, emit
from app.core.permissions import can, require, require_human_approval
from app.core.model_registry import (
    FreeTierUnavailableError,
    ModelRegistry,
    ModelSpec,
    TaskSpec,
    get_registry as model_get_registry,
)
from app.core.tool_registry import ToolRegistry, ToolResult, ToolSpec, get_registry as tool_get_registry
from app.core.skill_registry import SkillRegistry, SkillSpec, get_registry as skill_get_registry
from app.core.workflow import Workflow, WorkflowEngine, get_engine
from app.core.artifacts import Artifact, ArtifactStore, get_store
from app.core.qa import QualityGate, GateVerdict

__all__ = [
    "artifacts", "events", "model_registry", "permissions", "qa",
    "skill_registry", "tool_registry", "workflow",
    "bus", "emit",
    "can", "require", "require_human_approval",
    "FreeTierUnavailableError",
    "ModelRegistry", "ModelSpec", "TaskSpec", "model_get_registry",
    "ToolRegistry", "ToolResult", "ToolSpec", "tool_get_registry",
    "SkillRegistry", "SkillSpec", "skill_get_registry",
    "Workflow", "WorkflowEngine", "get_engine",
    "Artifact", "ArtifactStore", "get_store",
    "QualityGate", "GateVerdict",
]