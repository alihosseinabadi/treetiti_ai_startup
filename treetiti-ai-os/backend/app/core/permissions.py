"""TREEtiti AI Agency OS — agent permissions.

Every agent carries an explicit capability matrix (spec §32). A capability is a
coarse action name (e.g. ``publish``, ``send_message``, ``modify_code``). The
matrix decides what each agent may do with TOOLS, what side effects it may make,
and whether human approval is required — independent of who wrote the agent.

Tools are validated against the matrix at the Tool Router (core/tool_registry)
and at orchestration time (core/permissions.check).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

# Canonical capability names (spec §32 + tool categories §19).
CAPABILITIES = frozenset(
    {
        # research surface
        "search", "scrape", "database_read", "fetch_url",
        # content surface
        "content_create", "image_generate", "video_generate", "design",
        # business surface
        "lead_read", "draft_message", "send_message", "analytics",
        # engineering surface
        "read_code", "modify_code", "run_tests", "deploy",
        # system surface
        "orchestrate", "delegate", "approve_internal", "publish",
        "read_memory", "write_memory", "schedule",
        # tool capability names checked by the Tool Router (spec §19 / §32).
        # Kept in the same namespace so `can()` stays strict about typos while
        # accepting the capabilities tools actually declare.
        "search_web", "fetch_page", "generate_image", "generate_video",
        "embed_text", "publish_post",
        # research tool stack (spec §9) + social research (spec §10)
        "search_news", "search_social", "search_reddit", "search_youtube",
        "get_trends", "analyze_competitor",
    }
)

# Default per-agent capability matrix (spec §32, plus the extra agents already
# in the codebase: brand, video, seo, campaign).
DEFAULT_PERMISSIONS: dict[str, set[str]] = {
    "ceo": {"orchestrate", "delegate", "approve_internal", "read_memory", "write_memory", "schedule"},
    "market_research": {"search", "scrape", "database_read", "fetch_url", "search_web", "fetch_page", "search_news", "search_social", "search_reddit", "search_youtube", "get_trends", "analyze_competitor", "read_memory", "write_memory"},
    "research": {"search", "scrape", "database_read", "fetch_url", "search_web", "fetch_page", "search_news", "search_social", "search_reddit", "search_youtube", "get_trends", "analyze_competitor", "read_memory", "write_memory"},
    "analytics": {"database_read", "read_memory", "write_memory", "analytics"},
    "strategy": {"read_memory", "write_memory", "database_read"},
    "campaign": {"read_memory", "write_memory", "database_read", "schedule"},
    "content": {"content_create", "image_generate", "video_generate", "generate_image", "generate_video", "search_web", "search_news", "search_social", "search_reddit", "search_youtube", "get_trends", "read_memory", "write_memory"},
    "brand": {"read_memory", "write_memory", "design", "approve_internal"},
    "image": {"image_generate", "generate_image", "read_memory", "design"},
    "video": {"video_generate", "image_generate", "generate_video", "read_memory", "design"},
    "editor": {"read_memory", "approve_internal", "content_create"},
    "qa": {"approve_internal", "read_memory"},
    "seo": {"search", "search_web", "search_news", "get_trends", "analyze_competitor", "database_read", "read_memory", "write_memory"},
    "sales": {"lead_read", "draft_message", "read_memory", "write_memory"},
    "developer": {"read_code", "modify_code", "run_tests", "read_memory", "write_memory"},
}

# Capabilities that ALWAYS require explicit human approval, regardless of agent.
HUMAN_APPROVAL_REQUIRED: frozenset[str] = frozenset(
    {"publish", "send_message", "deploy", "modify_code"}
)


class PermissionDeniedError(PermissionError):
    """Raised when an agent attempts a capability it does not hold."""


def can(agent_key: str, capability: str, *, permissions: dict[str, set[str]] | None = None) -> bool:
    """True when ``agent_key`` holds ``capability``."""
    if capability not in CAPABILITIES:
        raise ValueError(f"unknown capability: {capability!r}")
    table = permissions if permissions is not None else DEFAULT_PERMISSIONS
    return capability in table.get(agent_key, set())


def require(agent_key: str, capability: str, *, permissions: dict[str, set[str]] | None = None) -> None:
    """Raise :class:`PermissionDeniedError` when the agent lacks the capability."""
    if not can(agent_key, capability, permissions=permissions):
        raise PermissionDeniedError(f"agent {agent_key!r} is not allowed to {capability!r}")


def require_human_approval(capability: str) -> bool:
    """True when ``capability`` always needs a human gate before execution."""
    return capability in HUMAN_APPROVAL_REQUIRED


def capabilities_of(agent_key: str, *, permissions: dict[str, set[str]] | None = None) -> set[str]:
    """Return the capability set an agent actually holds (never a superset)."""
    table = permissions if permissions is not None else DEFAULT_PERMISSIONS
    wanted = table.get(agent_key, set())
    return wanted & CAPABILITIES


@dataclass
class AgentPermissions:
    """Rich permission record attached to an agent at runtime (spec §32)."""

    agent_key: str
    capabilities: set[str] = field(default_factory=set)
    # Human-in-the-loop: capabilities below need a human approve step (overrides
    # the global HUMAN_APPROVAL_REQUIRED with an empty set to lift the default).
    human_approval: set[str] = field(default_factory=lambda: set(HUMAN_APPROVAL_REQUIRED))
    # Explicit denials always win, even if the capability is listed otherwise.
    denied: set[str] = field(default_factory=set)

    def __post_init__(self) -> None:
        self.capabilities = self.capabilities & CAPABILITIES
        self.denied = self.denied & CAPABILITIES
        self.human_approval = self.human_approval & CAPABILITIES

    def allow(self, capability: str) -> bool:
        if capability in self.denied:
            return False
        if capability not in self.capabilities:
            return False
        return True

    def needs_human(self, capability: str) -> bool:
        return capability in self.human_approval

    @classmethod
    def from_defaults(cls, agent_key: str) -> "AgentPermissions":
        return cls(agent_key=agent_key, capabilities=DEFAULT_PERMISSIONS.get(agent_key, set()))

    def to_dict(self) -> dict:
        return {
            "agent": self.agent_key,
            "capabilities": sorted(self.capabilities),
            "human_approval": sorted(self.human_approval),
            "denied": sorted(self.denied),
        }


def load_all() -> dict[str, AgentPermissions]:
    """Build the permission record for every defined agent (spec §32 table)."""
    out: dict[str, AgentPermissions] = {}
    for key, caps in DEFAULT_PERMISSIONS.items():
        record = AgentPermissions.from_defaults(key)
        record.capabilities = caps & CAPABILITIES
        out[key] = record
    # Sales may draft but never send without approval; developer may modify only
    # with approval; CEO delegates but never publishes externally.
    out["sales"].denied.add("send_message")
    out["developer"].needs_human("deploy")
    return out


def summary() -> list[dict]:
    """Friendly matrix for the dashboard/agent listing."""
    return [p.to_dict() for p in sorted(load_all().values(), key=lambda p: p.agent_key)]


def validate_request(agent_key: str, capability: str, *, permissions: Iterable[AgentPermissions] | None = None) -> None:
    """Entry point used by tools/orchestrator before executing an action.

    Raises PermissionDeniedError when the capability is not held. Callers must
    separately arrange a human approval step when ``needs_human`` is true.
    """
    table = {p.agent_key: p for p in (permissions or ())} if permissions else {
        p.agent_key: p for p in load_all().values()
    }
    record = table.get(agent_key)
    if record is None or not record.allow(capability):
        raise PermissionDeniedError(f"agent {agent_key!r} is not allowed to {capability!r}")