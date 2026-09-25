"""Treetiti AI Marketing OS — boss command center (Telegram).

Turns the owner's Telegram chat into a private command center:

- Ignores everyone who is not the boss (when TELEGRAM_BOSS_IDS is set).
- Lets the boss preview, approve, reject, or publish content with one command.
- Optionally runs agents on demand (e.g. /run pipeline).

Commands (boss chat only):
  /status            -> health + pending counts + last run
  /pending           -> content awaiting approval
  /show <id>         -> read a full draft before approving
  /publish <id>      -> post to all configured channels now
  /approve <id>      -> alias for /publish
  /reject <id>       -> mark content rejected
  /run <agent>       -> run a scheduler agent now (default: pipeline)
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.database import SessionLocal
from app.models import AgentRun, ContentItem, ScheduledJob
from app.services.publisher import publish_all
from app.services.social import _telegram_api

logger = logging.getLogger("treetiti.boss")


def _boss_ids() -> set[str]:
    raw = get_settings().telegram_boss_ids
    return {x.strip() for x in raw.split(",") if x.strip()}


def is_boss(chat_id: Any) -> bool:
    """True if `chat_id` is allowed to control the system."""
    ids = _boss_ids()
    if not ids:
        # Restriction not configured -> public assistant, anyone may talk.
        return True
    return str(chat_id) in ids


def _msg(text: str, chat_id: Any) -> None:
    _telegram_api(
        "sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    )


def request_approval(item: ContentItem) -> None:
    """Notify the boss that `item` is ready for review, without publishing.

    Sends the full draft plus the exact /approve command to run. Safe no-op when
    the boss chat is not configured.
    """
    settings = get_settings()
    chat_id = settings.telegram_boss_ids.split(",")[0].strip() if settings.telegram_boss_ids else ""
    if not chat_id:
        logger.info("no boss chat configured; content '%s' left as pending_approval", item.id[:8])
        return
    _msg(
        f"🧾 <b>Ready for your review</b> — <code>{item.id[:8]}</code>\n"
        f"<i>{item.platform} · {item.content_type} · {item.status}</i>\n\n"
        f"{item.body}\n\n"
        f"👉 /approve {item.id[:8]} to publish to all channels\n"
        f"👉 /reject {item.id[:8]} to discard\n"
        f"👉 /show {item.id[:8]} for the full draft again",
        chat_id,
    )


def _find_content(prefix: str) -> ContentItem | None:
    with SessionLocal() as db:
        for i in db.query(ContentItem).all():
            if i.id.startswith(prefix.strip()):
                return i
    return None


def _do_publish(arg: str, chat_id: Any) -> str:
    item = _find_content(arg)
    if item is None:
        return "Content not found. Use /pending to see ids."
    results = publish_all(item)  # to every configured channel
    ok = [r["channel"] for r in results if r["ok"]]
    failed = [r for r in results if not r["ok"]]
    lines = [f"🚀 Publishing <b>{item.title}</b>"]
    if ok:
        lines.append("Posted to: " + ", ".join(ok))
    for f in failed:
        lines.append(f"⚠️ {f['channel']}: {f['detail']}")
    with SessionLocal() as db:
        row = db.get(ContentItem, item.id)
        row.status = "published" if ok else "pending_approval"
        db.commit()
    return "\n".join(lines)


def handle_boss(text: str, chat_id: Any) -> str:
    parts = text.strip().split()
    cmd = parts[0].lstrip("/").lower()
    args = parts[1:]

    if cmd in ("start", "help"):
        return (
            "👑 <b>Treetiti boss console</b>\n"
            "/status — system health + upcoming jobs\n"
            "/pending — content awaiting approval\n"
            "/show &lt;id&gt; — read the full draft\n"
            "/publish &lt;id&gt; — post to all channels now\n"
            "/approve &lt;id&gt; — same as /publish\n"
            "/reject &lt;id&gt; — mark rejected\n"
            "/campaign &lt;goal&gt; — plan a full branding campaign\n"
            "/debug &lt;bug or error&gt; — Software Engineer diagnoses it\n"
            "/build &lt;feature&gt; — Software Engineer designs the system\n"
            "/remember &lt;important fact&gt; — store long-term memory\n"
            "/memory &lt;topic&gt; — recall what the team knows\n"
            "/ask &lt;anything&gt; — auto-route prompt to the best agent\n"
            "/review &lt;content&gt; — Editor/QA grades &amp; approves/rejects\n"
            "/seo &lt;content&gt; — get the SEO plan\n"
            "/run pipeline — trigger pipeline immediately"
        )

    if cmd == "status":
        with SessionLocal() as db:
            pending = (
                db.query(ContentItem)
                .filter(ContentItem.status.in_(["pending_approval", "draft"]))
                .count()
            )
            jobs = (
                db.query(ScheduledJob)
                .filter(ScheduledJob.enabled.is_(True))
                .order_by(ScheduledJob.schedule_time)
                .all()
            )
            run = db.query(AgentRun).order_by(AgentRun.started_at.desc()).first()
        if jobs:
            job_line = "\n".join(f"  • {j.agent} — {j.schedule_time}" for j in jobs)
        else:
            job_line = "  (none enabled)"
        last = (
            f"{run.agent} · {run.status} · {run.started_at.strftime('%H:%M')}"
            if run
            else "no runs yet"
        )
        return (
            f"👑 <b>Treetiti status</b>\n"
            f"Content waiting for approval: {pending}\n"
            f"\n<b>Scheduled jobs:</b>\n{job_line}\n"
            f"\n<b>Last run:</b> {last}"
        )

    if cmd == "pending":
        with SessionLocal() as db:
            items = (
                db.query(ContentItem)
                .filter(ContentItem.status.in_(["pending_approval", "draft", "approved"]))
                .order_by(ContentItem.created_at.desc())
                .limit(8)
                .all()
            )
        if not items:
            return "No pending content. All clear ✓"
        lines = [f"🧾 <b>Pending ({len(items)})</b>"]
        for i in items:
            lines.append(
                f"• <code>{i.id[:8]}</code> — {i.title[:40]} [<i>{i.status}</i>]"
            )
        lines.append("\nUse /show &lt;id&gt; then /approve &lt;id&gt;.")
        return "\n".join(lines)

    if cmd == "show":
        if not parts:
            return "Usage: /show <id>"
        item = _find_content(parts[0])
        if item is None:
            return "Content not found."
        return (
            f"📄 <b>{item.title}</b>\n"
            f"<i>{item.platform} · {item.content_type} · {item.status}</i>\n\n"
            f"{item.body}\n\n"
            f"ℹ️ <code>{item.id[:8]}</code> — /approve {item.id[:8]} to publish"
        )

    if cmd in ("publish", "approve"):
        if not parts:
            return f"Usage: /{cmd} <id>"
        return _do_publish(parts[0], chat_id)

    if cmd == "reject":
        if not parts:
            return "Usage: /reject <id>"
        item = _find_content(parts[0])
        if item is None:
            return "Content not found."
        with SessionLocal() as db:
            row = db.get(ContentItem, item.id)
            row.status = "rejected"
            db.commit()
        return f"❌ Rejected: {item.title}"

    if cmd == "run":
        agent = parts[0] if parts else "pipeline"
        from app.scheduler import run_agent

        try:
            run, result = run_agent(agent, {}, "manual")
            return f"⚙️ Ran <b>{agent}</b> → status <b>{run.status}</b>\n{str(result)[:500]}"
        except Exception as exc:  # noqa: BLE001
            return f"Run failed: {exc}"

    if cmd == "debug":
        # /debug <describe the bug or error>  -> Software Engineer Agent
        if not text[6:].strip():
            return "Usage: /debug <describe the bug, error or stack trace>"
        from app.scheduler import run_agent

        try:
            run, result = run_agent(
                "developer", {"issue": text[6:].strip(), "category": "debug"}, "manual"
            )
            return (
                f"🔧 <b>Debug analysis</b>\n"
                f"{str(result)[:2000]}"
            )
        except Exception as exc:  # noqa: BLE001
            return f"Debug failed: {exc}"

    if cmd == "build":
        # /build <describe the system or feature you want>  -> Engineer designs it
        if not text[6:].strip():
            return "Usage: /build <describe the system or feature to design>"
        from app.scheduler import run_agent

        try:
            run, result = run_agent(
                "developer", {"issue": text[6:].strip(), "category": "build"}, "manual"
            )
            return (
                f"🛠️ <b>Build plan</b>\n"
                f"{str(result)[:2000]}"
            )
        except Exception as exc:  # noqa: BLE001
            return f"Build failed: {exc}"

    if cmd == "campaign":
        # /campaign <goal> -> Campaign Intelligence plans a full campaign
        if not text[9:].strip():
            return "Usage: /campaign <goal> — e.g. /campaign launch our UGC cinematic service"
        from app.scheduler import run_agent

        try:
            run, result = run_agent(
                "campaign", {"objective": text[9:].strip(), "category": "campaign"}, "manual"
            )
            return (
                f"📣 <b>Campaign planned</b>\n"
                f"{str(result)[:2000]}"
            )
        except Exception as exc:  # noqa: BLE001
            return f"Campaign failed: {exc}"

    if cmd == "remember":
        # /remember <important fact/goal/preference> -> store long-term memory
        if not text[9:].strip():
            return "Usage: /remember <important fact, goal or preference>"
        from app.memory.store import store_memory

        try:
            mid = store_memory(text[9:].strip(), kind="fact", source="telegram")
            return f"🧠 Remembered <code>{mid[:8]}</code>. It will inform all agents."
        except Exception as exc:  # noqa: BLE001
            return f"Remember failed: {exc}"

    if cmd == "memory":
        # /memory <topic> -> recall relevant stored memory
        if not text[7:].strip():
            return "Usage: /memory <topic> — recall what the team knows"
        from app.memory.store import search_memory

        try:
            hits = search_memory(text[7:].strip(), limit=5)
            if not hits:
                return "No stored memory for that topic yet."
            lines = [f"🧠 <b>Memory for: {text[7:].strip()}</b>"]
            for m in hits:
                lines.append(
                    f"• [{m['kind']}] {m['title']}: {m['content'][:200]}"
                )
            return "\n".join(lines)
        except Exception as exc:  # noqa: BLE001
            return f"Memory recall failed: {exc}"

    if cmd == "ask":
        # /ask <anything> -> auto-route prompt to the best agent (prompt-adaptive)
        if not text[5:].strip():
            return "Usage: /ask <anything> — I'll pick the right agent automatically"
        from app.agents import get_agent
        from app.dispatcher import dispatch

        try:
            agent_key, payload = dispatch(text[5:].strip())
            result = get_agent(agent_key).run(**payload)
            rendered = str(result)[:1800]
            return f"🤖 Routed to <b>{agent_key}</b>\n\n{rendered}"
        except Exception as exc:  # noqa: BLE001
            return f"Auto-route failed: {exc}"

    if cmd == "review":
        # /review <content> -> Editor/QA gates it (veto power)
        if not text[8:].strip():
            return "Usage: /review <content> — the Editor grades and approves/rejects it"
        from app.agents import get_agent

        try:
            verdict = get_agent("editor").run(content=text[8:].strip(), deliverable_type="content")
            status = verdict.get("status", "rejected").upper()
            scores = verdict.get("scores", {})
            notes = "; ".join(verdict.get("revision_notes", [])) or "none"
            flags = "; ".join(verdict.get("hallucination_flags", [])) or "none"
            return (
                f"🧑‍💼 <b>Editor verdict: {status}</b>\n"
                f"accuracy={scores.get('accuracy')} voice={scores.get('voice_consistency')} "
                f"clarity={scores.get('clarity')} engagement={scores.get('engagement')} "
                f"seo={scores.get('seo_readiness')} overall={scores.get('overall')}\n"
                f"Notes: {notes}\n"
                f"Flags: {flags}"
            )
        except Exception as exc:  # noqa: BLE001
            return f"Editor review failed: {exc}"

    if cmd == "seo":
        # /seo <content> -> SEO Specialist optimizes it
        if not text[5:].strip():
            return "Usage: /seo <content> — get the SEO plan for it"
        from app.agents import get_agent

        try:
            plan = get_agent("seo").run(content=text[5:].strip())
            kw = plan.get("target_keywords", {})
            return (
                f"🔎 <b>SEO plan</b>\n"
                f"Meta title: {plan.get('meta_title', '')[:60]}\n"
                f"Meta description: {plan.get('meta_description', '')[:160]}\n"
                f"Primary keyword: {kw.get('primary', '')}\n"
                f"Secondary: {', '.join(kw.get('secondary', []))}\n"
                f"Readability target: {plan.get('readability_target', '')}"
            )
        except Exception as exc:  # noqa: BLE001
            return f"SEO plan failed: {exc}"

    return f"Unknown command <code>{cmd}</code>. Try /help."


__all__ = ["is_boss", "handle_boss", "request_approval"]