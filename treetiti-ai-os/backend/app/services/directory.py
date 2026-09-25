"""Treetiti AI Marketing OS — Customer Service Directory orchestrator.

Turns a client's single link + 5 intake answers into a full agency-grade
deliverable set. Every specialist agent does its job "to perfection" for one
specific client, then the Editor/QA gate vets everything before it ships.

Flow (mirrors docs/CUSTOMER_SERVICE_DIRECTORY.md):

  intake (link + Q1..Q5)
    -> [1] Deep Research   (market_research + web search of the client's link)
    -> [2] Analyst         (analyze_research -> insight brief)
    -> [3] Brand gate      (gate_idea -> approved, refined angle)
    ->
    -> [4] Producer collective (content, image, video, sales, campaign, seo)
    -> [5] Editor/QA gate  (gate() veto on each deliverable)
    ->      assembled dossier stored on ClientProfile.dossier

Everything is optional-safe: if a stage fails the others still run, and the
raw client link text is always fed downstream so producers never hallucinate
the client's identity.
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents import get_agent
from app.database import SessionLocal
from app.models import ClientProfile
from app.services.search import fetch_text, search_web

logger = logging.getLogger("treetiti.directory")

# Which agents (agent_key -> run kwargs builder) make up the producer collective.
# Each receives the researched client profile so it speaks on-brand.
PRODUCERS: dict[str, str] = {
    "content": "content",
    "image": "image",
    "video": "video",
    "sales": "sales",
    "campaign": "campaign",
    "seo": "seo",
}


def _save(client: ClientProfile) -> None:
    """Persist a client row (works for both new and detached snapshots)."""
    with SessionLocal() as db:
        row = db.get(ClientProfile, client.id)
        if row is None:
            client.error = client.error or ""
            db.add(client)
        else:
            for field in ("name", "link", "business_line", "dream_customer",
                          "main_goal", "competitors", "desired_tone",
                          "profile", "dossier", "status", "error"):
                value = getattr(client, field)
                if field == "error" and value is None:
                    value = ""
                setattr(row, field, value)
        db.commit()


def _research_client(client: ClientProfile) -> dict[str, Any]:
    """Pull the client's page text + web findings into a research blob."""
    page = fetch_text(client.link, max_chars=4000)
    findings: list[str] = []
    if client.business_line:
        findings.append(f"[intake business] {client.business_line}")
    if client.dream_customer:
        findings.append(f"[intake customer] {client.dream_customer}")
    if client.competitors:
        findings.append(f"[intake competitors] {client.competitors}")

    query = client.business_line or client.name or "the client business"
    for res in search_web(f"{query} business", max_results=4):
        if res.get("snippet"):
            findings.append(f"[search] {res['snippet']}")

    return {
        "client_name": client.name or "the client",
        "link": client.link,
        "business_line": client.business_line,
        "dream_customer": client.dream_customer,
        "main_goal": client.main_goal,
        "competitors": client.competitors,
        "desired_tone": client.desired_tone,
        "site_text": page or "no text extracted from link",
        "findings": findings[:20] or ["No external signal — relying on intake + internal knowledge."],
    }


def _research_agent(client: ClientProfile, profile: dict[str, Any]) -> dict[str, Any]:
    """Stage 1: Market Research agent turns the profile into opportunities."""
    agent = get_agent("market_research")
    findings_block = "\n".join(f"- {f}" for f in profile["findings"])
    return agent.run(
        extra_context=(
            "This research is for an external CLIENT. Study the client's own "
            "business, its competitors and the best content angle for it. Base "
            "everything on the client site text and findings below; never invent.\n\n"
            f"CLIENT SITE TEXT:\n{profile['site_text']}\n\n"
            f"FINDINGS:\n{findings_block}"
        ),
        ideas=[profile.get("business_line") or profile["client_name"]],
        sources=[profile.get("link")] if profile.get("link") else [],
    )


def _analyst_brief(client: ClientProfile, opportunity: dict[str, Any]) -> dict[str, Any]:
    """Stage 2: Analytics agent turns research into a strategy insight brief."""
    agent = get_agent("analytics")
    return agent.analyze_research(opportunity)


def _brand_gate(client: ClientProfile, opportunity: dict[str, Any], brief: dict[str, Any]) -> dict[str, Any]:
    """Stage 3: Brand gate pre-flights the angle before writing."""
    agent = get_agent("brand")
    insight = (brief.get("insight") or {}) if isinstance(brief, dict) else {}
    return agent.gate_idea(
        trend=opportunity.get("content_opportunity", ""),
        content_opportunity=opportunity.get("content_opportunity", ""),
        target_customer=opportunity.get("target_customer", "") or insight.get("target_audience", ""),
    )


def _producer_kwargs(key: str, profile: dict[str, Any], client: ClientProfile) -> dict[str, Any]:
    goal = client.main_goal or "grow the business"
    base = (
        f"[CLIENT CONTEXT] Business = {profile.get('business_line') or 'n/a'} | "
        f"Audience = {profile.get('dream_customer') or 'their customers'} | "
        f"Goal = {goal} | Tone = {profile.get('desired_tone') or 'premium'}."
    )
    if key == "content":
        return {
            "opportunity": {"request": f"{base}\nWrite client content that speaks to {profile.get('dream_customer')}."},
            "platform": "all",
        }
    if key == "image":
        return {
            "idea": f"{base}\nCreate a hero visual concept matching {profile.get('business_line')} {profile.get('desired_tone')} tone.",
            "style": "cinematic",
        }
    if key == "video":
        return {"topic": f"{base}\nStoryboard a short brand video for {profile.get('business_line')}."}
    if key == "sales":
        return {
            "lead": {
                "name": profile.get("client_name") or "Prospect",
                "company": profile.get("business_line") or "",
                "note": f"{base}\nwrite an outreach message.",
                "message": "",
            }
        }
    if key == "campaign":
        return {"objective": f"{base}\nBuild a launch campaign for {profile.get('business_line')} targeting {profile.get('dream_customer')}."}
    if key == "seo":
        return {"content": f"{base}\nProduce an on-page SEO plan for {profile.get('business_line')}."}
    return {}


def _serialise(value: Any) -> Any:
    """Normalise an agent output to JSON-safe shape."""
    if isinstance(value, dict):
        return {k: _serialise(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialise(v) for v in value]
    return str(value)


def _produce(profile: dict[str, Any], client: ClientProfile) -> dict[str, Any]:
    """Stage 4: every specialist agent produces its deliverable."""
    deliverables: dict[str, Any] = {}
    for key in PRODUCERS:
        try:
            kwargs = _producer_kwargs(key, profile, client)
            raw = get_agent(PRODUCERS[key]).run(**kwargs)
            deliverables[key] = _serialise(raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("producer %s failed for client %s: %s", key, client.id, exc)
            deliverables[key] = {"status": "failed", "error": str(exc)[:300]}
    return deliverables


def _gate_deliverables(deliverables: dict[str, Any]) -> dict[str, Any]:
    """Stage 5: Editor/QA vetoes each deliverable."""
    editor = get_agent("editor")
    gate_report: dict[str, Any] = {}
    for key, value in deliverables.items():
        if not isinstance(value, dict) or value.get("status") == "failed":
            gate_report[key] = {"gate": "skipped", "reason": "producer failed"}
            continue
        text = "\n".join(str(v) for v in value.values() if isinstance(v, str)) or str(value)
        try:
            gate_report[key] = editor.gate(text, key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("editor gate failed for %s: %s", key, exc)
            gate_report[key] = {"status": "rejected", "scores": {}, "revision_notes": [f"editor error: {exc}"]}
    return gate_report


def onboard_client(
    *,
    link: str,
    name: str = "",
    business_line: str = "",
    dream_customer: str = "",
    main_goal: str = "",
    competitors: str = "",
    desired_tone: str = "",
) -> ClientProfile:
    """Create the client row (work is run in `run_directory`)."""
    with SessionLocal() as db:
        row = ClientProfile(
            name=name or "Client",
            link=link,
            business_line=business_line,
            dream_customer=dream_customer,
            main_goal=main_goal,
            competitors=competitors,
            desired_tone=desired_tone or "premium",
            profile={},
            dossier={},
            status="onboarding",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row


def run_directory(client_id: str) -> ClientProfile:
    """Execute the full Directory workflow for a client."""
    with SessionLocal() as db:
        row = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
        if row is None:
            raise ValueError(f"client not found: {client_id}")
        snapshot = ClientProfile(
            id=row.id, link=row.link, name=row.name,
            business_line=row.business_line, dream_customer=row.dream_customer,
            main_goal=row.main_goal, competitors=row.competitors,
            desired_tone=row.desired_tone, status="researching",
            profile={}, dossier={}, error="",
        )
        row.status = "researching"
        db.commit()

    try:
        profile = _research_client(snapshot)
        opportunity = _research_agent(snapshot, profile)
        brief = _analyst_brief(snapshot, opportunity)
        gate = _brand_gate(snapshot, opportunity, brief)

        profile["opportunity"] = opportunity
        profile["analyst_brief"] = brief
        profile["brand_gate"] = gate

        snapshot.profile = profile
        snapshot.status = "producing"
        _save(snapshot)

        deliverables = _produce(profile, snapshot)
        qa = _gate_deliverables(deliverables)

        dossier = {
            "profile": profile,
            "deliverables": deliverables,
            "qa_report": qa,
            "status": "ready",
        }
        snapshot.dossier = dossier
        snapshot.status = "ready"
        snapshot.error = ""
        _save(snapshot)
        return snapshot
    except Exception as exc:  # noqa: BLE001
        logger.exception("directory run failed for %s", client_id)
        snapshot.status = "failed"
        snapshot.error = str(exc)[:500]
        _save(snapshot)
        return snapshot


def get_directory(client_id: str) -> ClientProfile | None:
    with SessionLocal() as db:
        return db.query(ClientProfile).filter(ClientProfile.id == client_id).first()


def list_directories(limit: int = 50) -> list[ClientProfile]:
    with SessionLocal() as db:
        return db.query(ClientProfile).order_by(ClientProfile.created_at.desc()).limit(limit).all()


__all__ = ["onboard_client", "run_directory", "get_directory", "list_directories"]