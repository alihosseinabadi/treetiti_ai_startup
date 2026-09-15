"""Generate per-agent documentation from live introspection.

Writes, for every registered agent:

    docs/agents/<key>/SKILL.md   — the "super skill": role, expertise, I/O contract
    docs/agents/<key>/TOOLS.md   — capabilities, tools, data stores, approval gates
    docs/agents/<key>/API.md     — how to invoke it (REST, chat, scheduler)
    docs/agents/README.md        — index of every agent

Everything is read from the actual registry, class metadata, permissions table
and run() signatures — not hand-edited — so the docs stay in sync with the code.

Run from backend/:  .venv/bin/python3 -m app.agents.generate_docs
"""

from __future__ import annotations

import inspect
import json
import os
from typing import Any

from app.agents import AGENTS
from app.config import get_settings
from app.core.agent_registry import get_registry
from app.core.permissions import (
    CAPABILITIES,
    DEFAULT_PERMISSIONS,
    HUMAN_APPROVAL_REQUIRED,
)

DOCS_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "agents")

_CAP_DESC: dict[str, str] = {
    "search": "Web search across engines",
    "scrape": "Fetch + parse a page body",
    "database_read": "Read persisted tables (projects, campaigns, analytics…)",
    "fetch_url": "Fetch a URL's raw content",
    "content_create": "Author on-brand copy (hooks, captions, articles)",
    "image_generate": "Produce images via media services",
    "video_generate": "Produce video via media services",
    "design": "Visual direction / art direction",
    "lead_read": "Read lead records",
    "draft_message": "Draft a message to a lead/client",
    "send_message": "Send a message (human approval required)",
    "analytics": "Compute analytics snapshots from persisted data",
    "read_code": "Read source code",
    "modify_code": "Modify source code (human approval required)",
    "run_tests": "Run the test suite",
    "deploy": "Deploy (human approval required)",
    "orchestrate": "Activate and coordinate other agents",
    "delegate": "Hand a brief to a specialist agent",
    "approve_internal": "Approve internal deliverables (editor/QA veto)",
    "publish": "Publish content to a channel (human approval required)",
    "read_memory": "Read brand / team long-term memory",
    "write_memory": "Store findings into long-term memory",
    "schedule": "Create scheduled agent jobs",
    "search_web": "Search the web",
    "fetch_page": "Fetch a page body",
    "generate_image": "Generate an image",
    "generate_video": "Generate a video",
    "embed_text": "Embed text into the vector store",
    "publish_post": "Publish a post to a connected channel",
    "search_news": "Search news sources",
    "search_social": "Search social platforms",
    "search_reddit": "Search Reddit",
    "search_youtube": "Search YouTube",
    "get_trends": "Pull current trending topics",
    "analyze_competitor": "Analyze a competitor's presence",
}


def _fmt(params: list[tuple[str, Any]]) -> str:
    out = []
    for name, default in params:
        if default is inspect.Parameter.empty:
            out.append(f"- `{name}` (required)")
        else:
            out.append(f"- `{name}` (default `{default!r}`)")
    return "\n".join(out) or "_none_"


def _run_signature(agent: Any) -> list[tuple[str, Any]]:
    try:
        sig = inspect.signature(agent.run)
    except (ValueError, TypeError):
        return []
    return [
        (name, p.default)
        for name, p in sig.parameters.items()
        if name not in ("self", "kwargs") and p.kind != inspect.Parameter.VAR_KEYWORD
    ]


def _route_model(agent: Any) -> str:
    try:
        return agent._route_model()
    except Exception:  # noqa: BLE001
        return get_settings().router_models.get(agent.agent_key, "")


def _prompt_path(agent: Any) -> str:
    return f"backend/app/agents/prompts/{agent.agent_key}.py"


def _capabilities(agent: Any) -> set[str]:
    key = agent.agent_key or agent.name
    return DEFAULT_PERMISSIONS.get(key, set()) & CAPABILITIES


def _memories_written(key: str) -> list[str]:
    store: dict[str, list[str]] = {
        "market_research": ["content_opportunity"],
        "content_hunter": ["content_opportunity"],
        "social_intel": ["competitor_intel"],
        "strategist": ["strategy"],
        "content_strategist": ["content_strategy"],
        "creative_director": ["visual_identity"],
        "brand": ["brand_rules", "brand_memory"],
        "research": ["research", "content_opportunity"],
        "analytics": ["analytics"],
    }
    return store.get(key, [])


def build_skill(key: str, agent: Any, spec: Any, model: str) -> str:
    params = _run_signature(agent)
    triggers = {
        "market_research": "“research this market”, “who is the audience for …”",
        "content": "“write a caption for …”, “draft a post about …”",
        "image": "“create an image of …”, “/image …”",
        "video": "“make a video about …”, “/video …”",
        "brand": "“what is our brand voice”, “how should we sound”",
        "campaign": "“plan a campaign for …”, “campaign ideas”",
        "seo": "“optimize this for SEO”, “keywords for …”",
        "analytics": "“how did our content perform”, “analytics report”",
        "developer": "“debug this”, “fix this bug”",
        "sales": "“draft a message to lead …”",
        "ceo": "“run the whole team on …”, “what did we do today”",
        "social_manager": "“publish the approved posts”",
        "editor": "“review this content”, “QA check”",
        "content_hunter": "“what's trending”, “find content gaps”",
        "social_intel": "“what are competitors posting”",
        "strategist": "“position us against …”, “strategy for …”",
        "content_strategist": "“content pillars”, “editorial calendar”",
        "creative_director": "“art direction for the brand”",
        "td_creative_director": "“3D look direction”, “3D concept”",
        "td_asset_producer": "“build plan for this 3D asset”",
        "video_producer": "“produce this video”",
        "ugc_producer": "“creator-style content pack”",
        "growth_optimizer": "“what should we scale or stop”",
    }
    memories = _memories_written(key)
    parts = [
        f"# {spec.name} — super skill",
        "",
        f"> **agent key:** `{key}`  ·  **department:** {spec.department}  ·  "
        f"**build phase:** {spec.phase}  ·  **status:** {spec.status}",
        "",
        f"**Role:** {spec.role}",
        "",
        "## Mission",
        "",
        f"The `{key}` agent is TREEtiti's {spec.role.lower()}."
        + (
            " It executes one brief per `run()` call and reports a structured "
            "result that the CEO, the scheduler and the chat layer can consume."
            if not key == "ceo"
            else " It is the orchestrator: it reads a single brief, activates only "
            "the specialists the task needs, and reports the whole team's output."
        ),
        "",
        "## Expertise areas",
        "",
        *(f"- {s}" for s in (spec.skills or ())),
        "",
        "## Input contract — `run()`",
        "",
        _fmt(params),
        "",
        "> `_BRIEF_PARAMS` (task queue) maps a single `brief` string onto the first "
        "accepted parameter, so any caller can pass `brief`.",
        "",
        "## Output contract",
        "",
        "Returns a JSON-serializable `dict` (or a string for the conversational "
        "agents). Producers always include a `status` field; failures degrade to "
        "`spec_only`/`failed` instead of raising, so pipelines never crash.",
        "",
        "## When to use it",
        "",
        f"- {triggers.get(key, 'any task that needs this agent')}",
        f"- The CEO routes to it via the LangGraph DAG (`STAGE_TO_AGENT`) and the "
        f"scheduler via `scheduler.HANDLERS[\"{key}\"]`.",
        "",
        "## Runtime",
        "",
        f"- **class:** `{type(agent).__module__}.{type(agent).__name__}`",
        f"- **model profile:** `{spec.model_profile}`  ·  **routed model:** `{model}`",
        f"- **system prompt:** `{_prompt_path(agent)}`",
        f"- **memories written:** {', '.join(f'`{m}`' for m in memories) or '_none_'}",
        "",
    ]
    return "\n".join(parts)


def build_tools(key: str, agent: Any, spec: Any, model: str) -> str:
    caps = sorted(_capabilities(agent))
    human = sorted(set(caps) & set(HUMAN_APPROVAL_REQUIRED))
    parts = [
        f"# {spec.name} — tools & capabilities",
        "",
        f"Agent `{key}` holds **{len(caps)}** of the {len(CAPABILITIES)} canonical "
        "capabilities. Every capability is checked by "
        "`core.permissions.can()` at runtime.",
        "",
        "## Capabilities",
        "",
    ]
    parts.extend(f"- `{c}` — {_CAP_DESC.get(c, c)}" for c in caps)
    human_line = (
        f"- {', '.join(f'`{c}`' for c in human)}"
        if human
        else "- none of this agent's capabilities require a human gate."
    )
    parts += [
        "",
        "## Human-in-the-loop",
        "",
        human_line,
    ]
    if human:
        parts += [
            "These capabilities always need an explicit human approval step before "
            "they execute (`approvals` table, decide endpoint).",
        ]
    parts += [
        "",
        "## Data stores",
        "",
        f"- reads: brand memory, team memory, persisted tables "
        f"(`database_read` = {'yes' if 'database_read' in caps else 'no'})",
        f"- writes: {', '.join(f'`{m}`' for m in _memories_written(key)) or '_none_'}",
        "",
    ]
    return "\n".join(parts)


def build_api(key: str, agent: Any, spec: Any, model: str) -> str:
    params = _run_signature(agent)
    body = json.dumps(
        {"agent": key, "payload": {"brief": "…"}},
        ensure_ascii=False,
        separators=(",", ": "),
    )
    payload = {
        name: "…" for name, default in params if default is inspect.Parameter.empty
    }
    payload.setdefault("brief", "…")
    example = {"agent": key, "payload": payload}
    example_json = json.dumps(example, ensure_ascii=False, indent=2)
    parts = [
        f"# {spec.name} — API reference",
        "",
        f"Agent key: `{key}` · routed model: `{model}`",
        "",
        "## 1. REST — run on the background queue",
        "",
        "```bash",
        "curl -X POST $BASE/api/v1/agents/run \\",
        "  -H 'Authorization: Bearer $TOKEN' \\",
        "  -H 'Content-Type: application/json' \\",
        f"  -d {body!r}",
        "```",
        "",
        "Returns `{agent, task_id, status}` immediately; the agent runs on the "
        "worker thread and progress streams on the global SSE feed (`/stream`) "
        "and on `GET /api/v1/tasks/{id}/events`.",
        "",
        "## 2. Poll the result",
        "",
        "```bash",
        "curl $BASE/api/v1/tasks/$TASK_ID -H 'Authorization: Bearer $TOKEN'",
        "```",
        "",
        "Statuses: `queued → running → completed | failed | cancelled`. "
        "On completion `result` holds the agent's output dict.",
        "",
        "## 3. From chat",
        "",
        f"- `/agent {key} <prompt>` — runs it live in a chat session.",
        "- The CEO delegates to it when a brief matches its specialty.",
        "- The scheduler runs it on a cadence via `scheduler.HANDLERS`.",
        "",
        "## 4. Accepts",
        "",
        _fmt(params),
        "",
        "## 5. Example payload",
        "",
        "```json",
        example_json,
        "```",
        "",
    ]
    return "\n".join(parts)


def build_index(rows: list[tuple[str, Any, Any]]) -> str:
    parts = [
        "# TREEtiti agent docs",
        "",
        "Introspected from the live agent registry + permissions table. "
        "Regenerate with:",
        "",
        "```bash",
        "cd backend && .venv/bin/python3 -m app.agents.generate_docs",
        "```",
        "",
        "| key | agent | department | phase | model profile | docs |",
        "|---|---|---|---|---|---|",
    ]
    for key, agent, spec in rows:
        parts.append(
            f"| `{key}` | {spec.name} | {spec.department} | {spec.phase} | "
            f"{spec.model_profile} | "
            f"[SKILL]({key}/SKILL.md) · [TOOLS]({key}/TOOLS.md) · [API]({key}/API.md) |"
        )
    parts.append("")
    return "\n".join(parts)


def main() -> None:
    registry = get_registry()
    rows: list[tuple[str, Any, Any]] = []
    for key in sorted(AGENTS):
        spec = registry.get(key)
        agent = AGENTS[key]
        if spec is None:
            print(f"skip {key}: no registry spec")
            continue
        model = _route_model(agent)
        key_dir = os.path.join(DOCS_ROOT, key)
        os.makedirs(key_dir, exist_ok=True)
        for fname, fn in (
            ("SKILL.md", build_skill),
            ("TOOLS.md", build_tools),
            ("API.md", build_api),
        ):
            path = os.path.join(key_dir, fname)
            with open(path, "w") as fh:
                fh.write(fn(key, agent, spec, model))
        rows.append((key, agent, spec))
        print(f"wrote docs/agents/{key}/")

    with open(os.path.join(DOCS_ROOT, "README.md"), "w") as fh:
        fh.write(build_index(rows))
    print(f"wrote docs/agents/README.md ({len(rows)} agents)")


if __name__ == "__main__":
    main()