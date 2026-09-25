"""Treetiti OS orchestrator — deepseek-harness style plugin fan-out.

Inspired by https://github.com/deepseek-ai/deepseek-harness
("everything is a plugin"): every specialist agent is a plugin with a
manifest (label, triggers, needs). The orchestrator:

  1. Takes one goal from the WebUI chat (Chief of Staff).
  2. Plans steps: research -> brand gate -> producer fan-out -> editor QA.
  3. Detects missing slots per step and ASKS THE USER mid-task
     (pending_questions) instead of guessing — answers resume the run.
  4. Returns per-agent deliverables + a compiled dossier.

Runs are kept in-memory (no DB migration needed). Mounted at /orchestrator
via app/routers/orchestrator.py. Run dsh side-by-side with:
  npx @deepseek-ai/dsh web   # Web UI at http://127.0.0.1:3080
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field

logger = logging.getLogger("treetiti.harness")

# --- Plugin manifests: agent_key -> UI persona (matches picture sidebar) ---
PLUGINS: dict[str, dict] = {
    "campaign": {"label": "Chief of Staff", "color": "#7c3aed", "initials": "CS",
                 "blurb": "Plans the goal and coordinates every agent.",
                 "needs": []},
    "developer": {"label": "EA", "color": "#3b82f6", "initials": "EA",
                  "blurb": "Builds code, scripts and integrations.",
                  "needs": ["repo_or_stack"]},
    "leads": {"label": "Inbox Manager", "color": "#0ea5e9", "initials": "IM",
              "blurb": "Triages inbox, scores leads, drafts replies.",
              "needs": []},
    "sales": {"label": "Sales Outbound", "color": "#f59e0b", "initials": "SO",
              "blurb": "Outreach drafts queued for approval.",
              "needs": ["audience", "offer"]},
    "market_research": {"label": "Talent Scout", "color": "#92400e", "initials": "TS",
                        "blurb": "Researches market, competitors, candidates.",
                        "needs": []},
    "content": {"label": "Growth Marketer", "color": "#16a34a", "initials": "GM",
                "blurb": "Writes copy variants ready to review.",
                "needs": ["platform", "tone"]},
    "support": {"label": "Customer Support", "color": "#ef4444", "initials": "CS",
                "blurb": "Resolves tickets, escalates what matters.",
                "needs": []},
    "analytics": {"label": "Expense Manager", "color": "#f97316", "initials": "EM",
                  "blurb": "Receipts coded, spend explained.",
                  "needs": []},
    "invoices": {"label": "Invoice Collector", "color": "#eab308", "initials": "IC",
                 "blurb": "Pulls invoices from vendor portals.",
                 "needs": []},
    "brand": {"label": "Brand Guard", "color": "#8b5cf6", "initials": "BG",
              "blurb": "Gates voice consistency before anything ships.",
              "needs": []},
    "video": {"label": "Video Director", "color": "#ec4899", "initials": "VD",
              "blurb": "Scripts reels and cinematic spots.",
              "needs": ["topic"]},
    "image": {"label": "Visual Designer", "color": "#06b6d4", "initials": "VD",
              "blurb": "Hero images, posters, moodboards.",
              "needs": ["idea"]},
    "seo": {"label": "SEO Specialist", "color": "#22c55e", "initials": "SE",
            "blurb": "Meta, keywords, schema markup.",
            "needs": []},
    "editor": {"label": "Editor / QA", "color": "#64748b", "initials": "QA",
               "blurb": "Veto power: approves or sends back with notes.",
               "needs": []},
}

# Which real backend agent key serves each plugin (some personas share one).
PLUGIN_AGENT: dict[str, str] = {
    "campaign": "campaign", "developer": "developer", "leads": "sales",
    "sales": "sales", "market_research": "market_research",
    "content": "content", "support": "sales", "analytics": "analytics",
    "invoices": "analytics", "brand": "brand", "video": "video",
    "image": "image", "seo": "seo", "editor": "editor",
}

# Default plan template for any goal (harness-style pipeline).
PIPELINE = ["market_research", "brand", "content", "image", "video",
            "sales", "seo", "campaign", "analytics", "editor"]

QUESTION_TEXT: dict[str, str] = {
    "audience": "Who exactly is this for? (e.g. startup founders, CMOs)",
    "offer": "What is the offer / CTA? (e.g. free audit, demo call)",
    "platform": "Which platform should this target? (e.g. Instagram, LinkedIn, all)",
    "tone": "What tone? (e.g. luxury minimal, bold, friendly)",
    "topic": "What is the video topic in one line?",
    "idea": "Describe the visual idea in one line?",
    "repo_or_stack": "Which repo/stack should the code target?",
}


@dataclass
class Run:
    id: str
    goal: str
    project_id: str | None = None
    steps: list[str] = field(default_factory=list)
    answers: dict[str, str] = field(default_factory=dict)
    results: dict[str, str] = field(default_factory=dict)
    pending_questions: list[dict] = field(default_factory=list)
    status: str = "awaiting_answers"  # awaiting_answers | ready | done


RUNS: dict[str, Run] = {}


def _states() -> dict[str, dict]:
    """DB plugin states: key -> {enabled, kind, label, config}. Best-effort."""
    try:
        from app.database import SessionLocal
        from app.models import PluginState

        with SessionLocal() as db:
            return {r.key: {"enabled": r.enabled, "kind": r.kind,
                            "label": r.label, "config": r.config or {}}
                    for r in db.query(PluginState).all()}
    except Exception:  # noqa: BLE001
        return {}


def is_enabled(key: str) -> bool:
    if key == "campaign":  # orchestrator itself always stays on
        return True
    st = _states().get(key)
    return True if st is None else bool(st["enabled"])


def list_plugins() -> list[dict]:
    states = _states()
    rows = []
    for key, meta in PLUGINS.items():
        st = states.get(key, {})
        rows.append({"key": key, **meta, "needs": list(meta["needs"]),
                     "enabled": bool(st.get("enabled", True)),
                     "kind": st.get("kind", "builtin"),
                     "config": st.get("config", {})})
    for key, st in states.items():
        if key not in PLUGINS and st.get("kind") == "webhook":
            rows.append({"key": key, "label": st.get("label") or key,
                         "color": "#0ea5e9", "initials": "WH",
                         "blurb": "Custom webhook plugin.",
                         "needs": [], "enabled": bool(st.get("enabled", True)),
                         "kind": "webhook", "config": st.get("config", {})})
    return rows


def set_plugin(key: str, enabled: bool | None = None, label: str = "",
               kind: str = "builtin", config: dict | None = None) -> dict:
    from app.database import SessionLocal
    from app.models import PluginState

    with SessionLocal() as db:
        row = db.get(PluginState, key)
        if row is None:
            row = PluginState(key=key, label=label or PLUGINS.get(key, {}).get("label", key),
                              kind=kind, config=config or {}, enabled=True if enabled is None else enabled)
            db.add(row)
        else:
            if enabled is not None:
                row.enabled = enabled
            if label:
                row.label = label
            if config is not None:
                row.config = config
        db.commit()
        return {"key": row.key, "enabled": row.enabled, "kind": row.kind,
                "label": row.label, "config": row.config or {}}


def delete_plugin(key: str) -> bool:
    from app.database import SessionLocal
    from app.models import PluginState

    with SessionLocal() as db:
        row = db.get(PluginState, key)
        if row is None or row.kind != "webhook":
            return False
        db.delete(row)
        db.commit()
        return True


def _run_webhook(url: str, goal: str, answers: dict) -> str:
    import httpx

    r = httpx.post(url, json={"goal": goal, "answers": answers}, timeout=60)
    r.raise_for_status()
    try:
        data = r.json()
        return str(data.get("result") or data)[:3000]
    except Exception:  # noqa: BLE001
        return r.text[:3000]


def _wants_goal_text(goal: str, slot: str) -> bool:
    """Heuristic: if the goal already contains the slot, don't ask."""
    g = goal.lower()
    if slot == "platform" and any(w in g for w in
                                  ["instagram", "linkedin", "tiktok", "x ", "twitter", "all"]):
        return False
    if slot == "tone" and any(w in g for w in
                              ["luxury", "bold", "friendly", "minimal", "premium"]):
        return False
    if slot in ("topic", "idea") and len(goal.split()) > 6:
        return False
    return True


def plan_run(goal: str, project_id: str | None = None) -> Run:
    steps = [s for s in PIPELINE if is_enabled(s)]
    run = Run(id=str(uuid.uuid4())[:8], goal=goal, project_id=project_id, steps=steps)
    questions: list[dict] = []
    for step in run.steps:
        for slot in PLUGINS[step]["needs"]:
            if slot not in run.answers and _wants_goal_text(goal, slot):
                questions.append({
                    "step": step,
                    "agent": PLUGINS[step]["label"],
                    "slot": slot,
                    "question": QUESTION_TEXT[slot],
                })
    run.pending_questions = questions
    run.status = "ready" if not questions else "awaiting_answers"
    RUNS[run.id] = run
    return run


def answer_run(run_id: str, answers: dict[str, str]) -> Run:
    run = RUNS[run_id]
    run.answers.update({k: v for k, v in answers.items() if v.strip()})
    answered = set(run.answers)
    run.pending_questions = [q for q in run.pending_questions
                             if q["slot"] not in answered]
    if not run.pending_questions:
        run.status = "ready"
    RUNS[run.id] = run
    return run


def execute_run(run_id: str) -> Run:
    """Fan out to real backend agents. Never raises — failures become notes."""
    from app.agents import get_agent
    from app.dispatcher import dispatch as dispatch_payload

    run = RUNS[run_id]
    states = _states()
    for step in run.steps:
        if not is_enabled(step):
            run.results[step] = "(plugin disabled — skipped)"
            continue
        st = states.get(step, {})
        if st.get("kind") == "webhook" and st.get("config", {}).get("url"):
            try:
                run.results[step] = _run_webhook(st["config"]["url"], run.goal, run.answers)
            except Exception as exc:  # noqa: BLE001
                run.results[step] = f"(webhook plugin failed: {exc})"
            continue
        agent_key = PLUGIN_AGENT[step]
        try:
            _, payload = dispatch_payload(f"{run.goal} [{step}]")
            # inject user answers into payload where the agent accepts them
            for slot, val in run.answers.items():
                payload.setdefault(slot, val)
            out = get_agent(agent_key).run(**payload)
            run.results[step] = str(out)[:3000]
        except Exception as exc:  # noqa: BLE001
            logger.warning("harness step %s failed: %s", step, exc)
            run.results[step] = f"(agent unavailable in demo: {exc})"
    run.status = "done"
    # Remember the dossier inside the project (ChatGPT-style project memory).
    if run.project_id:
        try:
            from app.memory.store import store_memory

            summary = "; ".join(
                f"{PLUGINS[s]['label']}: {str(run.results.get(s, ''))[:200]}"
                for s in run.steps if run.results.get(s))
            store_memory(f"Dossier for goal '{run.goal}': {summary}"[:4000],
                         kind="report", title=f"Dossier: {run.goal[:80]}",
                         source="orchestrator", project_id=run.project_id)
        except Exception:  # noqa: BLE001
            logger.warning("dossier memory save failed")
    return run


def run_to_dict(run: Run) -> dict:
    states = _states()
    return {
        "run_id": run.id, "goal": run.goal, "status": run.status,
        "project_id": run.project_id,
        "steps": [{"key": s, **PLUGINS[s],
                   "enabled": is_enabled(s),
                   "result": run.results.get(s)} for s in run.steps
                  if s in PLUGINS],
        "pending_questions": run.pending_questions,
    }
