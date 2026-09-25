"""Treetiti AI Marketing OS — autonomous agent scheduler (autopilot).

A background daemon thread wakes every few seconds and runs the enabled
ScheduledJob rows at their configured time (daily) or interval. Every run is
recorded in AgentRun so the dashboard shows exactly what each AI employee did
and when — "agents constantly do their jobs at specific times".

Manual runs (POST /agents/run) are recorded too, with job_type="manual".
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, time, timedelta, timezone
from typing import Any, Callable

from app.agents import get_agent
from app.database import SessionLocal
from app.models import AgentRun, ContentItem, Lead, ResearchOpportunity, ScheduledJob
from app.services.pipeline import run_research_pipeline
from app.services.report import build_daily_report
from app.services.social import notify

logger = logging.getLogger("treetiti.scheduler")

TICK_SECONDS = 20

_worker: threading.Thread | None = None
_stop = threading.Event()
_inflight: set[str] = set()
_inflight_lock = threading.Lock()

DEFAULT_JOBS: list[dict[str, Any]] = [
    {
        "agent": "pipeline",
        "job_type": "daily",
        "schedule_time": "08:00",
        "interval_minutes": 60,
        "enabled": True,
        "payload": {
            "platform": "linkedin",
            "count": 1,
            "approve": True,
            "ideas": [],
            "sources": [],
        },
    },
    {
        "agent": "content",
        "job_type": "daily",
        "schedule_time": "09:00",
        "interval_minutes": 60,
        "enabled": True,
        "payload": {"platform": "linkedin", "count": 1, "approve": True},
    },
    {
        "agent": "publish",
        "job_type": "daily",
        "schedule_time": "09:30",
        "interval_minutes": 60,
        "enabled": True,
        "payload": {"count": 1, "channels": ["telegram", "vk", "linkedin", "instagram"]},
    },
    {
        "agent": "sales",
        "job_type": "interval",
        "schedule_time": "10:00",
        "interval_minutes": 60,
        "enabled": True,
        "payload": {},
    },
    {
        "agent": "analytics",
        "job_type": "daily",
        "schedule_time": "18:00",
        "interval_minutes": 60,
        "enabled": True,
        "payload": {},
    },
    {
        "agent": "video",
        "job_type": "daily",
        "schedule_time": "12:00",
        "interval_minutes": 60,
        "enabled": False,
        "payload": {},
    },
    {
        "agent": "image",
        "job_type": "daily",
        "schedule_time": "12:30",
        "interval_minutes": 60,
        "enabled": False,
        "payload": {},
    },
]


# ---------------------------------------------------------------------------
# Job handlers — build the right payload for each agent
# ---------------------------------------------------------------------------

def _latest_opportunity() -> dict[str, Any] | None:
    with SessionLocal() as db:
        opp = (
            db.query(ResearchOpportunity)
            .order_by(ResearchOpportunity.created_at.desc())
            .first()
        )
        if opp is None:
            return None
        return {
            "trend": opp.trend,
            "business_problem": opp.business_problem,
            "content_opportunity": opp.content_opportunity,
            "target_customer": opp.target_customer,
        }


def _run_content(payload: dict[str, Any]) -> str:
    opportunity = _latest_opportunity()
    items = get_agent("content").run(
        opportunity=opportunity,
        platform=payload.get("platform", "linkedin"),
        count=int(payload.get("count", 1)),
        approve=bool(payload.get("approve", True)),
    )
    titles = "; ".join(i.get("title", "untitled") for i in items)
    return f"Generated {len(items)} content item(s): {titles}"


def _run_publish(payload: dict[str, Any]) -> str:
    """Surface content for the boss to approve (NOT auto-publish).

    Under boss control we never push to channels on our own. We list the newest
    drafts/pending items and ping the owner; publication happens only when the
    boss replies /approve <id> from Telegram.
    """
    from app.services.boss import request_approval
    from app.services.publisher import publish_all
    settings = get_settings()

    with SessionLocal() as db:
        items = (
            db.query(ContentItem)
            .filter(ContentItem.status.in_(["approved", "pending_approval", "draft"]))
            .order_by(ContentItem.created_at.desc())
            .limit(int(payload.get("count", 1)))
            .all()
        )
    if not items:
        return "No content to publish"

    lines: list[str] = []
    for item in items:
        if settings.telegram_boss_ids and not item.status == "published":
            # Boss-control mode: never auto-post. Request approval instead.
            request_approval(item)
            lines.append(f"'{item.title}' awaiting approval")
            continue
        # Fallback (boss control off): publish approved/pending directly.
        results = publish_all(item, channels=payload.get("channels"))
        ok = [r["channel"] for r in results if r["ok"]]
        failed = [f"{r['channel']}:{r['detail']}" for r in results if not r["ok"]]
        lines.append(f"'{item.title}' -> {', '.join(ok) if ok else 'nothing'}")
        if failed:
            lines.append(f"   skipped: {'; '.join(failed)}")
        if ok:
            item.status = "published"
            item.published_at = datetime.now(timezone.utc)
            db.commit()
    return "\n".join(lines)


def _run_daily_report(payload: dict[str, Any]) -> str:
    """Build the daily report and push a summary to the Telegram channel."""
    result = build_daily_report()
    content = result.get("content", {})
    leads = result.get("leads", {})
    summary = (
        f"📊 <b>Treetiti daily report</b> ({result.get('date', '')})\n"
        f"Content: {content.get('total', 0)} total · "
        f"{content.get('pending_approval', 0)} pending · "
        f"{content.get('published', 0)} published\n"
        f"Leads: {leads.get('total', 0)} total · "
        f"{leads.get('qualified', 0)} qualified"
    )
    top = result.get("top_opportunities") or []
    if top:
        summary += "\n\nTop trend: " + top[0].get("trend", "")
    telegram_text = summary.replace("\n", "\n")
    notify("Treetiti daily report", telegram_text.replace("<b>", "").replace("</b>", ""))
    return "Daily report: " + str(result["summary"])


def _run_pipeline(payload: dict[str, Any]) -> str:
    """Run the full research -> analytics -> brand gate -> content pipeline."""
    result = run_research_pipeline(
        ideas=payload.get("ideas", []),
        sources=payload.get("sources", []),
        platform=payload.get("platform", "linkedin"),
        count=int(payload.get("count", 1)),
        approve=bool(payload.get("approve", True)),
        extra_context=payload.get("extra_context", ""),
    )
    gate = result["brand_gate"]
    summary = (
        f"Pipeline: research='{result['research']['trend']}' | "
        f"angle='{result['analytics']['recommended_angle']}' | "
        f"brand={gate['approved']} (score {gate['score']}) | "
        f"content={result['content']['count']} item(s): "
        f"{'; '.join(result['content']['titles'])}"
    )
    telegram_text = (
        f"🧭 <b>Treetiti research pipeline</b>\n"
        f"{result['research']['trend']}\n"
        f"Angle: {result['analytics']['recommended_angle']}\n"
        f"Brand: {'approved' if gate['approved'] else 'rejected'} (score {gate['score']})\n"
        f"Content: {', '.join(result['content']['titles'])}"
    )
    notify(
        "Treetiti research pipeline",
        f"{result['research']['trend']} | {result['analytics']['recommended_angle']} | "
        f"brand={gate['approved']} (score {gate['score']})",
        telegram_text=telegram_text,
    )
    return summary


def _run_sales_sweep(payload: dict[str, Any]) -> str:
    """Qualify every lead that has no score yet (Sales Agent)."""
    with SessionLocal() as db:
        leads = (
            db.query(Lead)
            .filter(Lead.score == 0)
            .order_by(Lead.created_at.desc())
            .limit(20)
            .all()
        )
    if not leads:
        return "No unscored leads to qualify"
    scored = 0
    sales = get_agent("sales")
    for lead in leads:
        verdict = sales.run(
            {
                "name": lead.name,
                "email": lead.email,
                "company": lead.company,
                "message": lead.message,
            }
        )
        with SessionLocal() as db:
            row = db.get(Lead, lead.id)
            row.score = int(verdict.get("score", 50))
            row.customer_type = verdict.get("customer_type", "smb")
            row.recommended_package = verdict.get("recommended_package", "")
            row.suggested_reply = verdict.get("suggested_reply", "")
            db.commit()
        scored += 1
    return f"Qualified {scored} lead(s) with the Sales Agent"


HANDLERS: dict[str, Callable[[dict[str, Any]], str]] = {
    "market_research": lambda p: "Stored new opportunity: " + str(
        get_agent("market_research").run(
            ideas=p.get("ideas", []),
            sources=p.get("sources", []),
            extra_context=p.get("extra_context", ""),
        )["content_opportunity"]
    ),
    "pipeline": lambda p: _run_pipeline(p),
    "content": _run_content,
    "publish": _run_publish,
    "sales": _run_sales_sweep,
    "analytics": lambda p: _run_daily_report(),
    "video": lambda p: "Video concept: " + str(get_agent("video").run(topic=p.get("topic", ""))["title"]),
    "image": lambda p: "Image prompt: " + str(
        get_agent("image").run(idea=p.get("idea", "Treetiti AI marketing system"), style=p.get("style", "cinematic"))["subject"]
    ),
    "developer": lambda p: _run_developer(p),
    "campaign": lambda p: _run_campaign(p),
    "editor": lambda p: _run_editor(p),
    "seo": lambda p: _run_seo(p),
}


def _run_campaign(payload: dict[str, Any]) -> str:
    """Plan a full branding campaign with the Campaign Intelligence Agent."""
    objective = payload.get("objective") or payload.get("issue") or payload.get("request") or ""
    if not objective:
        return "No objective provided — pass payload.objective"
    result = get_agent("campaign").plan_campaign(
        objective=objective,
        target_audience=payload.get("target_audience", ""),
        extra_context=payload.get("extra_context", ""),
    )
    house = len(result.get("message_house", []))
    plan = len(result.get("content_plan", []))
    return (
        f"Campaign planned: {result.get('title', 'untitled')} | "
        f"{house} platforms | {plan} content pieces | "
        f"objective: {result.get('objective', '')[:200]}"
    )


def _run_developer(payload: dict[str, Any]) -> str:
    """Debug an issue or build a system with the Software Engineer Agent."""
    category = payload.get("category", "debug")
    issue = payload.get("issue") or payload.get("request") or payload.get("error") or ""
    if not issue:
        return "No issue provided — pass payload.issue"
    result = get_agent("developer").run(issue, category=category)
    cause = result.get("root_cause", "") or result.get("diagnosis", "")
    return (
        f"[{category}] {issue[:120]}\n"
        f"Root cause: {cause[:300]}\n"
        f"Files: {len(result.get('affected_files', []))} affected"
    )


def _run_editor(payload: dict[str, Any]) -> str:
    """Final QA gate with the Editor/QA Agent (veto power)."""
    content = payload.get("content") or payload.get("request") or "No content to review"
    verdict = get_agent("editor").run(
        content=content,
        deliverable_type=payload.get("deliverable_type", "content"),
        platform=payload.get("platform", ""),
    )
    scores = verdict.get("scores", {})
    status = verdict.get("status", "rejected")
    return (
        f"<b>{status.upper()}</b> (overall {scores.get('overall', '?')}/10)\n"
        f"accuracy={scores.get('accuracy')} voice={scores.get('voice_consistency')} "
        f"clarity={scores.get('clarity')} engagement={scores.get('engagement')} "
        f"seo={scores.get('seo_readiness')}\n"
        f"Notes: {'; '.join(verdict.get('revision_notes', [])) or 'none'}\n"
        f"Flags: {'; '.join(verdict.get('hallucination_flags', [])) or 'none'}"
    )


def _run_seo(payload: dict[str, Any]) -> str:
    """Generate an SEO plan with the SEO Specialist Agent."""
    content = payload.get("content") or payload.get("request") or ""
    if not content:
        return "No content provided — pass payload.content"
    plan = get_agent("seo").run(content=content)
    kw = plan.get("target_keywords", {})
    return (
        f"Meta title: {plan.get('meta_title', '')[:60]}\n"
        f"Meta description: {plan.get('meta_description', '')[:160]}\n"
        f"Primary keyword: {kw.get('primary', '')}\n"
        f"Secondary: {', '.join(kw.get('secondary', []))}\n"
        f"Schema: {str(plan.get('schema_markup'))[:120]}\n"
        f"Readability target: {plan.get('readability_target', '')}"
    )


# ---------------------------------------------------------------------------
# Run tracking
# ---------------------------------------------------------------------------

def record_run(agent: str, job_type: str, fn: Callable[[], Any]) -> tuple[AgentRun, Any]:
    """Execute `fn`, persist the outcome as an AgentRun, return (run, result)."""
    started = datetime.now(timezone.utc)
    run = AgentRun(agent=agent, job_type=job_type, status="running")
    with SessionLocal() as db:
        db.add(run)
        db.commit()
        run_id = run.id
    try:
        result = fn()
        status = "success"
        summary = str(result)[:2000]
        error = ""
    except Exception as exc:  # noqa: BLE001
        logger.exception("agent %s run failed", agent)
        status = "failed"
        summary = ""
        error = str(exc)[:2000]
        result = None
    finished = datetime.now(timezone.utc)
    duration_ms = int((finished - started).total_seconds() * 1000)
    with SessionLocal() as db:
        run = db.get(AgentRun, run_id)
        run.status = status
        run.summary = summary
        run.error = error
        run.finished_at = finished
        run.duration_ms = duration_ms
        db.commit()
    return run, result


def run_agent(agent: str, payload: dict[str, Any], job_type: str = "manual") -> tuple[AgentRun, Any]:
    """Run an agent by key with the given payload (manual or scheduled)."""
    handler = HANDLERS.get(agent)
    if handler is None:
        raise ValueError(f"No autopilot handler for agent '{agent}'")
    return record_run(agent, job_type, lambda: handler(payload or {}))


def _run_scheduled(job: ScheduledJob) -> None:
    job_id = job.id
    try:
        run, _ = run_agent(job.agent, job.payload or {}, job.job_type)
        logger.info("scheduled job %s finished: %s (%s)", job.agent, run.summary, run.status)
    finally:
        with SessionLocal() as db:
            row = db.get(ScheduledJob, job_id)
            if row is not None:
                row.last_run_at = datetime.now(timezone.utc)
                db.commit()
        with _inflight_lock:
            _inflight.discard(job_id)


def _job_due(job: ScheduledJob, now: datetime) -> bool:
    if not job.enabled:
        return False
    if job.job_type == "interval":
        if job.last_run_at is None:
            return True
        last = job.last_run_at.replace(tzinfo=timezone.utc)
        return now - last >= timedelta(minutes=max(job.interval_minutes or 60, 1))
    # daily: run once per calendar day, after schedule_time
    if job.last_run_at is not None:
        last = job.last_run_at.replace(tzinfo=timezone.utc)
        if last.date() == now.date():
            return False
    try:
        hh, mm = (job.schedule_time or "09:00").split(":")
        due_time = time(int(hh), int(mm))
    except ValueError:
        due_time = time(9, 0)
    return now.time() >= due_time


def _tick() -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        jobs = db.query(ScheduledJob).all()
        due = [j for j in jobs if _job_due(j, now) and j.id not in _inflight]
    for job in due:
        with _inflight_lock:
            _inflight.add(job.id)
        threading.Thread(target=_run_scheduled, args=(job,), daemon=True).start()
    # reap finished inflight ids (they removed themselves on completion)


def _worker_loop() -> None:
    logger.info("autopilot worker started (tick %ss)", TICK_SECONDS)
    while not _stop.is_set():
        try:
            _tick()
        except Exception:  # noqa: BLE001
            logger.exception("autopilot tick failed")
        _stop.wait(TICK_SECONDS)


def start_autopilot() -> None:
    """Seed default jobs and start the background worker (idempotent)."""
    global _worker
    _seed_default_jobs()
    if _worker is not None and _worker.is_alive():
        return
    _stop.clear()
    _worker = threading.Thread(target=_worker_loop, daemon=True, name="treetiti-autopilot")
    _worker.start()


def stop_autopilot() -> None:
    global _worker
    _stop.set()
    if _worker is not None:
        _worker.join(timeout=5)
        _worker = None


def _seed_default_jobs() -> None:
    with SessionLocal() as db:
        existing = {j.agent: j for j in db.query(ScheduledJob).all()}
        added = 0
        for job in DEFAULT_JOBS:
            row = existing.get(job["agent"])
            if row is None:
                db.add(ScheduledJob(**job))
                added += 1
        db.commit()
        if added:
            logger.info("seeded %d new default autopilot job(s)", added)
