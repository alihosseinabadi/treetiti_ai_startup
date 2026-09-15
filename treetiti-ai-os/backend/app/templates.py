"""TREEtiti AI Marketing OS — executable template engine (Phase 3).

A template is a real blueprint: installing one creates actual OS objects —
a configured Mission, recurring ScheduledJobs and (optionally) a Project — so
the workspace is wired up, not just labelled. Installs are marked on the rows
(``missions.source_template``, schedule ``payload.template_id``) so the catalog
can report installed state and uninstall can archive everything created by a
template for a client.

All functions take an injected ``db`` session so the catalog install/uninstall
logic is testable without a real database (same pattern as app/os_commands.py).
"""

from __future__ import annotations

import logging

from app.agents import get_agent
from app.models import Mission, Project, ScheduledJob

logger = logging.getLogger("treetiti.templates")

CATALOG: list[dict] = [
    {
        "id": "ig-leads",
        "name": "Instagram Lead Generation Engine",
        "category": "Marketing",
        "description": "Attract, qualify and hand off Instagram leads to sales automatically.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Instagram, CRM connector",
        "capabilities": ["Research", "Content", "Social", "Analytics"],
        "quality": "Proven",
        "version": "2.1",
        "brief": "Run an Instagram lead-generation mission: research the audience, create a content plan, publish daily, and report leads weekly.",
        "mission": {
            "goal": "Generate qualified Instagram leads every week: research the audience, plan and publish content daily, then report and hand off new leads.",
            "cadence": "daily",
            "daily_time": "09:00",
            "weekly_day": "friday",
            "config": {
                "platforms": ["instagram"],
                "competitors": [],
                "audience": "Instagram audience that matches the ideal client profile",
                "brand_notes": "Focus on reels and story-driven lifestyle content.",
            },
        },
        "schedules": [
            {"name": "IG — trend & opportunity scan", "agent": "content_hunter", "job_type": "daily", "schedule_time": "09:00", "payload": {"prompt": "Scan Instagram trends and save content opportunities for the Instagram lead mission."}},
            {"name": "IG — daily content", "agent": "content", "job_type": "daily", "schedule_time": "10:00", "payload": {"platform": "instagram", "count": 2}},
            {"name": "IG — publish approved", "agent": "social_manager", "job_type": "daily", "schedule_time": "11:30", "payload": {"channels": ["instagram"]}},
        ],
        "project": {"name": "Instagram Lead Generation", "description": "Autopilot mission for Instagram lead acquisition."},
    },
    {
        "id": "weekly-report",
        "name": "Weekly Marketing Report",
        "category": "Analytics",
        "description": "Compile weekly performance across channels into one clean report.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Analytics snapshots",
        "capabilities": ["Analytics", "Docs", "Strategy"],
        "quality": "Proven",
        "version": "1.4",
        "brief": "Every Monday, analyze last week's performance across channels and produce a summary report with recommendations.",
        "mission": {
            "goal": "Every Monday, compile last week's performance across all channels into one clean report with next-week recommendations.",
            "cadence": "weekly",
            "daily_time": "08:00",
            "weekly_day": "monday",
            "config": {"platforms": [], "competitors": [], "audience": "Leadership", "brand_notes": "Keep the report skimmable: one page of numbers, one page of recommendations."},
        },
        "schedules": [
            {"name": "Weekly — analytics snapshot", "agent": "analytics", "job_type": "daily", "schedule_time": "07:00", "payload": {"prompt": "Record a daily analytics snapshot for the weekly report mission."}},
        ],
        "project": None,
    },
    {
        "id": "competitor-watch",
        "name": "Competitor Monitoring",
        "category": "Research",
        "description": "Track competitor moves, pricing and campaigns continuously.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Web research",
        "capabilities": ["Research", "Social Intel", "Strategy"],
        "quality": "Proven",
        "version": "1.0",
        "brief": "Monitor competitors every day: capture their social posts, campaigns and changes, and summarize what matters.",
        "mission": {
            "goal": "Continuously monitor competitors: capture social posts, campaigns and positioning changes daily and summarize what matters.",
            "cadence": "daily",
            "daily_time": "08:00",
            "weekly_day": "monday",
            "config": {"platforms": ["instagram", "linkedin"], "competitors": [], "audience": "Strategy team", "brand_notes": "Flag any price change or new campaign immediately."},
        },
        "schedules": [
            {"name": "Competitor — social intel", "agent": "social_intel", "job_type": "daily", "schedule_time": "08:00", "payload": {"prompt": "Capture competitor social posts and campaigns for the competitor watch mission."}},
        ],
        "project": None,
    },
    {
        "id": "landing-page",
        "name": "Landing Page System",
        "category": "Website",
        "description": "Brief → sitemap → copy → design → live preview pipeline.",
        "source": "TREEtiti website skill",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Website builder",
        "capabilities": ["Content", "Design", "Coding"],
        "quality": "Proven",
        "version": "1.2",
        "brief": "Build a professional landing page from a brief: define structure, write copy, create visuals and produce a preview.",
        "mission": {
            "goal": "Produce a professional landing page from a brief: define structure, write on-brand copy, create visuals and deliver a preview.",
            "cadence": "weekly",
            "daily_time": "10:00",
            "weekly_day": "wednesday",
            "config": {"platforms": ["website"], "competitors": [], "audience": "Prospects", "brand_notes": "Mobile-first, clear single CTA per section."},
        },
        "schedules": [
            {"name": "Landing — content drafts", "agent": "content", "job_type": "interval", "interval_minutes": 2880, "payload": {"platform": "website", "count": 1}},
        ],
        "project": None,
    },
    {
        "id": "content-pillar",
        "name": "Content Pillar Engine",
        "category": "Content",
        "description": "Turn one idea into a month of pillar content.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Content strategy",
        "capabilities": ["Strategy", "Content", "SEO"],
        "quality": "Proven",
        "version": "3.0",
        "brief": "Create a content strategy around a chosen pillar, then produce a month of posts across platforms.",
        "mission": {
            "goal": "Build a content strategy around a chosen pillar and produce a month of posts across platforms.",
            "cadence": "daily",
            "daily_time": "09:00",
            "weekly_day": "monday",
            "config": {"platforms": ["linkedin", "instagram", "x"], "competitors": [], "audience": "Pillar audience", "brand_notes": "Repurpose each pillar into 3+ platform variations."},
        },
        "schedules": [
            {"name": "Pillar — editorial planning", "agent": "content_strategist", "job_type": "daily", "schedule_time": "09:00", "payload": {"prompt": "Refresh the editorial calendar for the content pillar mission."}},
            {"name": "Pillar — daily posts", "agent": "content", "job_type": "daily", "schedule_time": "10:30", "payload": {"count": 3}},
        ],
        "project": None,
    },
    {
        "id": "reel-factory",
        "name": "Reel Factory",
        "category": "Video",
        "description": "Batch-generate short-form video scripts and visuals.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Video producer",
        "capabilities": ["Content", "Video", "QA"],
        "quality": "Proven",
        "version": "1.1",
        "brief": "Produce short-form video concepts: write scripts, storyboard, generate visuals and produce reels.",
        "mission": {
            "goal": "Produce short-form video concepts weekly: scripts, storyboards, visuals and rendered reels.",
            "cadence": "weekly",
            "daily_time": "11:00",
            "weekly_day": "tuesday",
            "config": {"platforms": ["instagram", "tiktok"], "competitors": [], "audience": "Gen-Z lifestyle viewers", "brand_notes": "Hook in the first 2 seconds, captions always on."},
        },
        "schedules": [
            {"name": "Reels — video concepts", "agent": "video", "job_type": "interval", "interval_minutes": 4320, "payload": {"topic": "short-form reel concepts for this week"}},
        ],
        "project": None,
    },
    {
        "id": "daily-social",
        "name": "Daily Social Autopilot",
        "category": "Social",
        "description": "Publish approved content across channels on schedule.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Social manager",
        "capabilities": ["Content", "Social", "Publishing"],
        "quality": "Proven",
        "version": "2.3",
        "brief": "Run daily social publishing: create content, get it approved, and publish to connected channels.",
        "mission": {
            "goal": "Run daily social publishing: create content, route through approvals, and publish to connected channels.",
            "cadence": "daily",
            "daily_time": "08:30",
            "weekly_day": "monday",
            "config": {"platforms": ["linkedin", "instagram", "x"], "competitors": [], "audience": "Follow base", "brand_notes": "Nothing publishes without approval."},
        },
        "schedules": [
            {"name": "Social — daily content", "agent": "content", "job_type": "daily", "schedule_time": "08:30", "payload": {"count": 3}},
            {"name": "Social — publish approved", "agent": "social_manager", "job_type": "daily", "schedule_time": "12:00", "payload": {"channels": ["linkedin", "instagram", "x"]}},
        ],
        "project": None,
    },
    {
        "id": "research-agent",
        "name": "Research Agent Loop",
        "category": "Agents",
        "description": "Continuous market and competitor intelligence gathering.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Research agent",
        "capabilities": ["Research", "Memory"],
        "quality": "Proven",
        "version": "1.0",
        "brief": "Continuously research our market and competitors, saving findings to company memory.",
        "mission": {
            "goal": "Continuously research our market and competitors, saving findings to company memory.",
            "cadence": "daily",
            "daily_time": "07:30",
            "weekly_day": "monday",
            "config": {"platforms": [], "competitors": [], "audience": "Company memory", "brand_notes": "Every finding is saved as a memory entry with source."},
        },
        "schedules": [
            {"name": "Research — market loop", "agent": "market_research", "job_type": "daily", "schedule_time": "07:30", "payload": {"prompt": "Scan the market and save opportunities to company memory."}},
        ],
        "project": None,
    },
    {
        "id": "campaign-launch",
        "name": "Campaign Launch Kit",
        "category": "Marketing",
        "description": "End-to-end campaign: strategy, creative, media, publish.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "CEO team",
        "capabilities": ["Strategy", "Creative", "Content", "Media"],
        "quality": "Proven",
        "version": "1.6",
        "brief": "Launch a full marketing campaign: research, positioning, creative direction, content, media and publishing.",
        "mission": {
            "goal": "Launch a full marketing campaign end-to-end: research, positioning, creative direction, content, media and publishing.",
            "cadence": "weekly",
            "daily_time": "09:00",
            "weekly_day": "monday",
            "config": {"platforms": ["linkedin", "instagram", "x"], "competitors": [], "audience": "Campaign target", "brand_notes": "Use the CEO pipeline: research → strategy → creative → content → media."},
        },
        "schedules": [
            {"name": "Campaign — CEO weekly cycle", "agent": "ceo", "job_type": "daily", "schedule_time": "09:00", "payload": {"prompt": "Run the campaign-launch pipeline for this week."}},
        ],
        "project": {"name": "Campaign Launch", "description": "Full campaign production project."},
    },
    {
        "id": "webhook-automation",
        "name": "Webhook Automation",
        "category": "Automation",
        "description": "React to incoming webhooks with automatic agent work.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Review",
        "deps": "Webhooks",
        "capabilities": ["Automation", "Agents"],
        "quality": "New",
        "version": "0.9",
        "brief": "Set up automation that reacts to incoming webhook events with a configured agent workflow.",
        "mission": {
            "goal": "React to incoming webhook events with a configured agent workflow.",
            "cadence": "weekly",
            "daily_time": "10:00",
            "weekly_day": "thursday",
            "config": {"platforms": [], "competitors": [], "audience": "Inbound events", "brand_notes": "Inspect webhook payloads before any publish action."},
        },
        "schedules": [
            {"name": "Webhook — workflow runner", "agent": "ceo", "job_type": "interval", "interval_minutes": 1440, "payload": {"prompt": "Process pending webhook events and dispatch agent work."}},
        ],
        "project": None,
    },
    {
        "id": "lead-scoring",
        "name": "Lead Scoring & Follow-up",
        "category": "Sales",
        "description": "Score inbound leads and prepare follow-up replies.",
        "source": "TREEtiti internal blueprint",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "CRM, Lead store",
        "capabilities": ["Sales", "Analytics"],
        "quality": "Proven",
        "version": "1.0",
        "brief": "Analyze incoming leads, score them by fit and intent, and prepare suggested replies.",
        "mission": {
            "goal": "Analyze every inbound lead, score by fit and intent, and prepare a suggested reply.",
            "cadence": "daily",
            "daily_time": "09:30",
            "weekly_day": "friday",
            "config": {"platforms": [], "competitors": [], "audience": "Inbound leads", "brand_notes": "Reply within 24h of capture."},
        },
        "schedules": [
            {"name": "Leads — scoring run", "agent": "sales", "job_type": "interval", "interval_minutes": 360, "payload": {"prompt": "Score new leads and prepare suggested replies."}},
        ],
        "project": None,
    },
    {
        "id": "brand-vision",
        "name": "Brand Visual Identity",
        "category": "Design",
        "description": "Moodboards, palette, typography and creative direction.",
        "source": "TREEtiti creative skill",
        "license": "TREEtiti OS",
        "security": "Verified",
        "deps": "Creative director",
        "capabilities": ["Design", "Strategy"],
        "quality": "Proven",
        "version": "1.0",
        "brief": "Define a brand's visual identity: creative direction, mood, palette, typography and image directives.",
        "mission": {
            "goal": "Define a brand's visual identity: creative direction, mood, palette, typography and image directives.",
            "cadence": "weekly",
            "daily_time": "10:00",
            "weekly_day": "monday",
            "config": {"platforms": [], "competitors": [], "audience": "Design team", "brand_notes": "Deliver as a visual identity package saved to memory."},
        },
        "schedules": [
            {"name": "Brand — creative direction", "agent": "creative_director", "job_type": "interval", "interval_minutes": 10080, "payload": {"prompt": "Refresh the brand's visual identity package."}},
        ],
        "project": None,
    },
]

_BY_ID = {t["id"]: t for t in CATALOG}


def get_template(template_id: str) -> dict:
    if template_id not in _BY_ID:
        raise KeyError(f"Unknown template '{template_id}'")
    return _BY_ID[template_id]


def _mission_dict(m: Mission) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "client": m.client,
        "goal": m.goal,
        "status": m.status,
        "cadence": m.cadence,
        "daily_time": m.daily_time,
        "weekly_day": m.weekly_day,
        "config": m.config or {},
        "source_template": getattr(m, "source_template", "") or "",
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def list_catalog(db, client: str = "") -> list[dict]:
    """Catalog with per-client installed counts (non-archived missions)."""
    missions = db.query(Mission).all()
    counts: dict[str, int] = {}
    for m in missions:
        src = getattr(m, "source_template", "") or ""
        if src and m.client == client and getattr(m, "status", "") != "archived":
            counts[src] = counts.get(src, 0) + 1
    out = []
    for tpl in CATALOG:
        item = {k: tpl[k] for k in ("id", "name", "category", "description", "source", "license", "security", "deps", "capabilities", "quality", "version", "brief")}
        item["installed"] = counts.get(tpl["id"], 0)
        out.append(item)
    return out


def install_template(template_id: str, client: str, db) -> dict:
    """Create the real OS objects a template declares. Returns a summary."""
    tpl = get_template(template_id)
    client = (client or "").strip()
    goal = tpl["mission"]["goal"]
    if client:
        goal = f"{goal} Client: {client}."

    project_id = ""
    project_out = None
    proj_spec = tpl.get("project")
    if proj_spec:
        project = Project(
            name=proj_spec["name"],
            client=client,
            description=proj_spec.get("description", ""),
            status="active",
        )
        db.add(project)
        db.commit()
        project_id = project.id or ""
        project_out = {"id": project_id, "name": proj_spec["name"], "client": client}

    config = dict(tpl["mission"].get("config") or {})
    if project_id:
        config["project_id"] = project_id

    mission = Mission(
        name=tpl["name"],
        client=client,
        goal=goal,
        cadence=tpl["mission"].get("cadence", "daily"),
        daily_time=tpl["mission"].get("daily_time", "09:00"),
        weekly_day=tpl["mission"].get("weekly_day", "monday"),
        config=config,
        workspace={"revealed": []},
        status="active",
        source_template=template_id,
    )
    db.add(mission)
    db.commit()

    schedules_out: list[dict] = []
    added_jobs: list[ScheduledJob] = []
    for spec in tpl.get("schedules", []):
        agent = spec["agent"]
        try:
            get_agent(agent)
        except KeyError as exc:
            logger.warning("template %s declares unknown agent %r — skipping schedule", template_id, agent)
            continue
        job = ScheduledJob(
            name=spec["name"],
            agent=agent,
            job_type=spec.get("job_type", "daily"),
            schedule_time=spec.get("schedule_time", "09:00"),
            interval_minutes=spec.get("interval_minutes", 60),
            enabled=True,
            client=client,
            project_id=project_id,
            payload={**(spec.get("payload") or {}), "template_id": template_id, "mission_id": mission.id},
        )
        db.add(job)
        added_jobs.append(job)
    db.commit()
    for job in added_jobs:
        schedules_out.append(
            {
                "id": job.id,
                "name": job.name,
                "agent": job.agent,
                "job_type": job.job_type,
                "schedule_time": job.schedule_time,
                "enabled": job.enabled,
            }
        )

    return {
        "template_id": template_id,
        "client": client,
        "mission": _mission_dict(mission),
        "schedules": schedules_out,
        "project": project_out,
    }


def uninstall_template(template_id: str, client: str, db) -> dict:
    """Archive everything a template installed for this client (soft)."""
    get_template(template_id)  # validate
    client = (client or "").strip()
    mission_count = 0
    for m in db.query(Mission).all():
        if (
            getattr(m, "source_template", "") == template_id
            and m.client == client
            and getattr(m, "status", "") != "archived"
        ):
            m.status = "archived"
            mission_count += 1
    job_count = 0
    for j in db.query(ScheduledJob).all():
        payload = j.payload or {}
        if j.client == client and payload.get("template_id") == template_id and not j.archived:
            j.archived = True
            j.enabled = False
            job_count += 1
    db.commit()
    return {"template_id": template_id, "client": client, "missions_archived": mission_count, "schedules_archived": job_count}