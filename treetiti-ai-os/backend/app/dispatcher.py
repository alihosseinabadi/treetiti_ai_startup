"""Treetiti AI Marketing OS — prompt router / agent dispatcher.

Reads a free-text prompt and automatically decides WHICH employee should handle
it and WHAT the task is — so nobody needs to remember slash commands. The
router is prompt-adaptive: it tries instant keyword routing first, then lets a
fast LLM classify the intent, and finally falls back to a sensible default.

Routing table (keyword first pass):
  video / reel / cinematic / spot     -> video  (topic)
  image / visual / poster / graphic / photo / logo -> image (idea)
  write / blog / ad copy / email / caption / post  -> content (brief)
  fix / bug / debug / error / script / code / build / feature -> developer
  competitor / market / trend / swot / industry   -> market_research
  sales / funnel / follow up / lead   -> sales
  brand / voice / positioning / audit -> brand
  analytics / report / data / metric / kpi -> analytics
  campaign / launch / strategy        -> campaign
  default                             -> LLM-classified or brand
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents import AGENTS
from app.llm import llm_complete

logger = logging.getLogger("treetiti.dispatcher")

# keyword -> agent key (first matching keyword in the prompt wins)
# Editor/SEO-specific triggers are listed FIRST so they beat generic content
# keywords (e.g. "seo optimize my post" must route to seo, not content).
KEYWORD_ROUTES: list[tuple[str, str]] = [
    ("meta title", "seo"),
    ("meta description", "seo"),
    ("schema markup", "seo"),
    ("json-ld", "seo"),
    ("optimize for search", "seo"),
    ("seo", "seo"),
    ("keyword", "seo"),
    ("approve", "editor"),
    ("reject", "editor"),
    ("quality", "editor"),
    ("review", "editor"),
    ("proofread", "editor"),
    ("edit this", "editor"),
    ("qa", "editor"),
    ("reel", "video"),
    ("cinematic", "video"),
    ("video", "video"),
    ("spot", "video"),
    ("poster", "image"),
    ("logo", "image"),
    ("graphic", "image"),
    ("photo", "image"),
    ("visual", "image"),
    ("image", "image"),
    ("caption", "content"),
    ("blog", "content"),
    ("ad copy", "content"),
    ("email sequence", "content"),
    ("landing page copy", "content"),
    ("copy", "content"),
    ("write", "content"),
    ("post", "content"),
    ("script", "developer"),
    ("bug", "developer"),
    ("debug", "developer"),
    ("error", "developer"),
    ("fix", "developer"),
    ("code", "developer"),
    ("build", "developer"),
    ("feature", "developer"),
    ("competitor", "market_research"),
    ("swot", "market_research"),
    ("market", "market_research"),
    ("trend", "market_research"),
    ("industry", "market_research"),
    ("sales", "sales"),
    ("funnel", "sales"),
    ("follow up", "sales"),
    ("lead", "sales"),
    ("outreach", "sales"),
    ("brand", "brand"),
    ("voice", "brand"),
    ("positioning", "brand"),
    ("audit", "brand"),
    ("message house", "brand"),
    ("kpi", "analytics"),
    ("metric", "analytics"),
    ("data", "analytics"),
    ("report", "analytics"),
    ("analytics", "analytics"),
    ("forecast", "analytics"),
    ("campaign", "campaign"),
    ("launch", "campaign"),
    ("strategy", "campaign"),
]

DEFAULT_AGENT = "campaign"


def route_prompt(prompt: str) -> str:
    """First pass: instant keyword routing. Returns an agent key or ''."""
    text = " " + prompt.lower() + " "
    for keyword, agent in KEYWORD_ROUTES:
        if keyword in text:
            return agent
    return ""


def detect_agent(prompt: str) -> str:
    """Second pass: let a fast LLM choose the best agent for an open prompt."""
    agents = ", ".join(sorted(AGENTS))
    system = (
        "You are Treetiti's dispatcher. Choose the single best specialist agent "
        "for the incoming request. Respond with ONLY the agent key, no "
        "explanation. If it is a general business question, pick 'campaign'."
    )
    user = (
        f"Available agents: {agents}\n"
        "Agent purposes:\n"
        "- campaign: launch plans, marketing strategy, positioning strategy\n"
        "- developer: write code, fix a bug, build a script or system\n"
        "- content: blog posts, ad copy, emails, captions, landing copy\n"
        "- image: posters, logos, graphics, hero images, mood boards\n"
        "- video: reels, cinematic shots, video spots, storyboards\n"
        "- market_research: competitor research, market size, trends, swot\n"
        "- sales: outreach messages, funnels, lead follow-up\n"
        "- brand: brand voice, positioning, messaging, tone audits\n"
        "- analytics: interpret data, build reports, forecasts, dashboards\n"
        "- editor: final QA review, approve/reject a deliverable\n"
        "- seo: meta titles, keywords, schema markup, search optimization\n"
        f"\nRequest: {prompt}\n"
        "Reply with exactly one agent key:"
    )
    try:
        reply = llm_complete(system, user, temperature=0.0)
        reply_key = reply.strip().lower().strip("`.,!?")
        if reply_key in AGENTS:
            return reply_key
        for key in AGENTS:
            if key in reply_key:
                return key
    except Exception as exc:  # noqa: BLE001
        logger.warning("detect_agent failed, using default: %s", exc)
    return DEFAULT_AGENT


def dispatch(prompt: str) -> tuple[str, dict[str, Any]]:
    """Route a prompt to an agent key + kwargs matching that agent's run() sig.

    Note: the returned kwargs are passed to `AGENTS[key].run(**kwargs)`. For
    open-ended narrative prompts we also include a generic 'request' key so an
    agent can add the user's wording to its own inputs.
    """
    key = route_prompt(prompt) or detect_agent(prompt)
    payload: dict[str, Any] = {}
    if key == "campaign":
        payload = {"objective": prompt}
    elif key == "developer":
        payload = {"issue": prompt, "category": "build"}
    elif key == "content":
        payload = {"opportunity": {"request": prompt}, "platform": "all"}
    elif key == "image":
        payload = {"idea": prompt, "style": "cinematic"}
    elif key == "video":
        payload = {"topic": prompt}
    elif key == "market_research":
        payload = {"extra_context": prompt}
    elif key == "sales":
        payload = {"lead": {"name": "Prospect", "note": prompt}}
    elif key == "brand":
        payload = {"content": prompt, "platform": "all"}
    elif key == "analytics":
        payload = {"report_data": {"request": prompt}}
    elif key == "editor":
        payload = {"content": prompt, "deliverable_type": "content"}
    elif key == "seo":
        payload = {"content": prompt}
    return key, payload


__all__ = ["route_prompt", "detect_agent", "dispatch"]
