"""CEO information layer.

The CEO (TREEtiti or Customer) answers conversational questions from REAL
system state, not from memory of a static prompt. Every function here reads
the persisted tables (tasks, task_events, agent_runs, missions, mission_runs,
projects, campaigns, content_items, media_assets, analytics_snapshots,
approvals) and returns a compact, human-readable summary block the CEO prompt
can ground on.

Design rules (spec §11-§13):
- Never make the LLM search raw tables; these functions do it.
- Everything degrades gracefully: if the DB is unavailable, return an empty
  string / "no data" so the chat never breaks.
- Context scoping: "tree" = the company's own work; "customer:<name>" = only
  that client's work (missions/projects/approvals/tasks mentioning it).
"""

from __future__ import annotations

import datetime as _dt
import logging

logger = logging.getLogger("treetiti.ceo_intel")


def _ctx_name(context: str) -> str:
    if context.startswith("customer:"):
        return context[len("customer:") :]
    return ""


def _task_scoped(task, ctx: str) -> bool:
    """Is a persisted task relevant to this context?"""
    if ctx.startswith("customer:"):
        name = _ctx_name(ctx)
        hay = " ".join(
            [
                task.label or "",
                str(task.payload or {}),
                str(task.result or {}),
            ]
        ).lower()
        return name.lower() in hay
    return True


def _workspace_keys(ws: dict) -> list[str]:
    if not ws:
        return []
    return [k for k in ("intel", "strategy", "calendar", "content", "assets", "results") if ws.get(k)]


# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------

def get_today_summary(db, context: str) -> str:
    """What completed today (tasks + agent runs + content + assets)."""
    try:
        today = _dt.date.today().isoformat()
        lines: list[str] = []
        from app.models import AgentRun, ContentItem, MediaAsset, TaskRecord

        tasks = (
            db.query(TaskRecord)
            .filter(TaskRecord.status == "completed", TaskRecord.finished_at.isnot(None))
            .order_by(TaskRecord.finished_at.desc())
            .limit(60)
            .all()
        )
        done = [t for t in tasks if _scoped(t, context) and (t.finished_at or _dt.datetime.now()).isoformat()[:10] == today]
        if done:
            lines.append(f"- completed tasks ({len(done)}): " + "; ".join(t.label[:80] for t in done[:8]))

        runs = (
            db.query(AgentRun)
            .filter(AgentRun.status == "success")
            .order_by(AgentRun.finished_at.desc())
            .limit(60)
            .all()
        )
        runs_today = [
            r
            for r in runs
            if (r.finished_at or _dt.datetime.now()).isoformat()[:10] == today
        ]
        if runs_today:
            names: dict[str, int] = {}
            for r in runs_today:
                names[r.agent] = names.get(r.agent, 0) + 1
            lines.append(
                "- agent runs: " + ", ".join(f"{k} ({v})" for k, v in names.items())
            )

        assets = (
            db.query(MediaAsset)
            .order_by(MediaAsset.created_at.desc())
            .limit(40)
            .all()
        )
        assets_today = [a for a in assets if a.created_at and a.created_at.isoformat()[:10] == today]
        if assets_today:
            lines.append(
                "- assets: " + ", ".join(f"{a.kind} {a.title[:40]}" for a in assets_today[:6])
            )

        content = (
            db.query(ContentItem)
            .order_by(ContentItem.created_at.desc())
            .limit(40)
            .all()
        )
        content_today = [
            c
            for c in content
            if getattr(c, "created_at", None)
            and c.created_at.isoformat()[:10] == today
        ]
        if content_today:
            lines.append(
                "- content: " + ", ".join(f"{c.platform}: {c.title[:40]}" for c in content_today[:6])
            )

        return "\n".join(lines) or "No completed work today yet."
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_today_summary failed: %s", exc)
        return ""


def get_recent_activity(db, context: str, limit: int = 12) -> str:
    """Recent completed work + agent runs across the last few days."""
    try:
        from app.models import AgentRun, TaskRecord

        tasks = (
            db.query(TaskRecord)
            .filter(TaskRecord.status == "completed", TaskRecord.finished_at.isnot(None))
            .order_by(TaskRecord.finished_at.desc())
            .limit(limit)
            .all()
        )
        lines = [
            f"- task: {t.label[:90]} (finished {_fmt(t.finished_at)})"
            for t in tasks
            if _scoped(t, context)
        ]
        runs = (
            db.query(AgentRun)
            .filter(AgentRun.status == "success")
            .order_by(AgentRun.finished_at.desc())
            .limit(limit)
            .all()
        )
        lines += [
            f"- {r.agent}: {r.summary[:100] or r.job_type}"
            for r in runs
            if r.finished_at and (r.finished_at.isoformat()[:10] >= _dt.date.today().isoformat())
        ]
        return "\n".join(lines[:limit]) or "No recent activity."
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_recent_activity failed: %s", exc)
        return ""


def get_active_work(db, context: str) -> str:
    """What is currently running or queued (live workforce)."""
    try:
        from app.models import TaskRecord

        tasks = (
            db.query(TaskRecord)
            .filter(TaskRecord.status.in_(["queued", "running"]))
            .order_by(TaskRecord.created_at.desc())
            .limit(15)
            .all()
        )
        lines = [
            f"- {t.label[:80]} ({t.status})"
            for t in tasks
            if _scoped(t, context)
        ]
        return "\n".join(lines) or "Nothing running right now."
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_active_work failed: %s", exc)
        return ""


def get_blocked_work(db, context: str) -> str:
    """Failed tasks, failing agent runs, stale integrations."""
    try:
        from app.models import AgentRun, TaskRecord

        lines: list[str] = []
        tasks = (
            db.query(TaskRecord)
            .filter(TaskRecord.status == "failed")
            .order_by(TaskRecord.finished_at.desc())
            .limit(10)
            .all()
        )
        lines += [
            f"- task failed: {t.label[:80]} — {t.error[:80]}"
            for t in tasks
            if _scoped(t, context)
        ]
        runs = (
            db.query(AgentRun)
            .filter(AgentRun.status == "failed")
            .order_by(AgentRun.finished_at.desc())
            .limit(10)
            .all()
        )
        lines += [
            f"- agent failed: {r.agent} — {r.error[:80]}"
            for r in runs
            if r.finished_at
        ]
        return "\n".join(lines[:8]) or "Nothing blocked."
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_blocked_work failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Projects / missions
# ---------------------------------------------------------------------------

def get_project_status(db, context: str, name: str | None = None) -> str:
    """Real state of one project (or all) — campaigns, content, assets, tasks."""
    try:
        from app.models import Campaign, ContentItem, MediaAsset, Project

        q = db.query(Project)
        if _ctx_name(context):
            q = q.filter(Project.client == _ctx_name(context))
        if name:
            q = q.filter(Project.name.ilike(f"%{name}%"))
        projects = q.order_by(Project.created_at.desc()).limit(20).all()
        if not projects:
            return "No project found with that name." if name else "No projects yet."

        blocks: list[str] = []
        for p in projects:
            campaigns = db.query(Campaign).filter(Campaign.title.ilike(f"%{p.name}%")).all() or []
            content = (
                db.query(ContentItem)
                .order_by(ContentItem.created_at.desc())
                .limit(30)
                .all()
            )
            content_in = [c for c in content if p.name.lower() in (c.title or "").lower()]
            assets = (
                db.query(MediaAsset)
                .filter(MediaAsset.project_id == p.id)
                .order_by(MediaAsset.created_at.desc())
                .limit(20)
                .all()
            )
            lines = [f"- {p.name} [{p.status}]"]
            if campaigns:
                lines += [
                    f"  campaign {c.title} [{c.status}]"
                    for c in campaigns[:3]
                ]
            if content_in:
                lines += [
                    f"  content {c.platform}: {c.title[:50]} [{c.status}]"
                    for c in content_in[:4]
                ]
            if assets:
                lines += [
                    f"  asset {a.kind}: {a.title[:50]}"
                    for a in assets[:4]
                ]
            blocks.append("\n".join(lines))
        return "\n".join(blocks)
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_project_status failed: %s", exc)
        return ""


def get_mission_status(db, context: str) -> str:
    """Current missions and their last cycle, for this context."""
    try:
        from app.models import Mission, MissionRun

        q = db.query(Mission)
        if _ctx_name(context):
            q = q.filter(Mission.client == _ctx_name(context))
        missions = q.order_by(Mission.updated_at.desc()).limit(20).all()
        if not missions:
            return "No active missions."

        lines: list[str] = []
        for m in missions:
            last = (
                db.query(MissionRun)
                .filter(MissionRun.mission_id == m.id)
                .order_by(MissionRun.started_at.desc())
                .first()
            )
            ws = getattr(m, "workspace", None) or {}
            revealed = _workspace_keys(ws)
            lines.append(
                f"- {m.name} [{m.status}, {m.cadence}]: {m.goal[:70]}"
                + (f" | workspace: {', '.join(revealed)}" if revealed else "")
                + (f" | last cycle: {last.cycle_type} {last.status}" if last else "")
            )
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_mission_status failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Approvals / assets / analytics
# ---------------------------------------------------------------------------

def get_pending_approvals(db, context: str) -> str:
    try:
        from app.models import Approval

        approvals = (
            db.query(Approval)
            .filter(Approval.status == "pending")
            .order_by(Approval.created_at.desc())
            .limit(20)
            .all()
        )
        if not approvals:
            return "No pending approvals."
        lines = []
        for a in approvals:
            payload = a.payload or {}
            client = payload.get("client") or ""
            if _ctx_name(context) and client and client.lower() != _ctx_name(context).lower():
                continue
            lines.append(f"- {a.kind}: {a.title} — {a.summary[:80]}")
        return "\n".join(lines) or "No pending approvals for this workspace."
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_pending_approvals failed: %s", exc)
        return ""


def get_recent_assets(db, context: str, limit: int = 8) -> str:
    try:
        from app.models import MediaAsset

        assets = (
            db.query(MediaAsset)
            .order_by(MediaAsset.created_at.desc())
            .limit(limit)
            .all()
        )
        if not assets:
            return "No assets generated yet."
        return "\n".join(
            f"- {a.kind}: {a.title[:60]} ({a.creator_agent or 'agent'})"
            for a in assets
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_recent_assets failed: %s", exc)
        return ""


def get_recent_analytics(db, context: str) -> str:
    try:
        from app.models import AnalyticsSnapshot

        snaps = (
            db.query(AnalyticsSnapshot)
            .order_by(AnalyticsSnapshot.created_at.desc())
            .limit(6)
            .all()
        )
        if not snaps:
            return "No analytics snapshots yet."
        lines = []
        for s in snaps:
            report = s.report or {}
            lines.append(
                f"- {s.date}: "
                + ", ".join(
                    f"{k}: {str(v)[:60]}"
                    for k, v in list(report.items())[:4]
                )
            )
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_recent_analytics failed: %s", exc)
        return ""


def get_agent_activity(db, context: str, limit: int = 10) -> str:
    """What the specialist agents did recently (compact)."""
    try:
        from app.models import AgentRun

        runs = (
            db.query(AgentRun)
            .order_by(AgentRun.finished_at.desc())
            .limit(limit)
            .all()
        )
        if not runs:
            return "No agent runs yet."
        return "\n".join(
            f"- {r.agent}: {r.summary[:90] or r.job_type} [{r.status}]"
            for r in runs
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_agent_activity failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Workspace / customer
# ---------------------------------------------------------------------------

def get_workspace_context(db, context: str) -> str:
    """What this workspace IS — company or a specific customer."""
    from app.routers.chat import _customer_context_block

    if context.startswith("customer:"):
        name = _ctx_name(context)
        return _customer_context_block(name)
    return "TREEtiti Company — the AI Marketing OS company workspace."


def get_daily_digest(db, context: str) -> str:
    """Combined brief for 'what happened' queries (used by intent matcher)."""
    blocks = [
        ("TODAY", get_today_summary(db, context)),
        ("ACTIVE WORK", get_active_work(db, context)),
        ("MISSIONS", get_mission_status(db, context)),
        ("PENDING APPROVALS", get_pending_approvals(db, context)),
        ("BLOCKED", get_blocked_work(db, context)),
        ("RECENT ANALYTICS", get_recent_analytics(db, context)),
    ]
    return "\n\n".join(f"{label}:\n{body}" for label, body in blocks if body)


def get_provider_status(db, context: str) -> str:
    """Every LLM provider + whether its key is configured (no secrets)."""
    try:
        from app.core.provider_capability import provider_list

        rows = provider_list()
        if not rows:
            return "No LLM providers registered."
        lines = []
        for p in rows:
            state = "KEY OK" if p.get("key_configured") else "no key"
            lines.append(
                f"- {p.get('name')} ({p.get('prefix')}, {p.get('cost_tier')}): {state}"
            )
        on = sum(1 for p in rows if p.get("key_configured"))
        lines.append(f"Configured: {on}/{len(rows)} providers.")
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_provider_status failed: %s", exc)
        return ""


def _scoped(task, context: str) -> bool:
    return _task_scoped(task, context)


def _fmt(dt) -> str:
    if not dt:
        return "recently"
    try:
        return dt.strftime("%H:%M") if dt.date() == _dt.date.today() else dt.strftime("%b %d")
    except Exception:  # noqa: BLE001
        return "recently"