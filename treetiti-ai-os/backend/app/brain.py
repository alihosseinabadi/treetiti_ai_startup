"""Treetiti AI Marketing OS — business brain seed.

On first run, this populates the brand memory with Treetiti's real services and
business model so EVERY agent is deeply aware of what the company actually does
— not a generic chatbot, a company-aware intelligence.

Seeding is idempotent: entries are only added if a non-seed entry covering the
same title does not already exist.
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.database import SessionLocal
from app.models import BrandMemory
from app.memory.store import store_brand_memory

logger = logging.getLogger("treetiti.brain")

SERVICE_MEMORY: dict[str, list[tuple[str, str]]] = {
    "services": [
        (
            "UGC Branding & Marketing",
            "Treetiti builds UGC (user-generated content) branding and marketing systems: "
            "creator seeding, social-proof engines, branded UGC asset libraries, and "
            "campaigns that get real customers talking about the brand.",
        ),
        (
            "Cinematic Shots System",
            "Treetiti produces a premium cinematic shots system: Apple-style photo/video "
            "production, dramatic lighting, slow confident camera moves, shot direction "
            "and a branded visual language for products and companies.",
        ),
        (
            "AI Marketing AI",
            "Treetiti uses AI-powered marketing: automated campaigns, funnels, AI "
            "sales assistants, lead nurturing and marketing automation that runs on "
            "autopilot.",
        ),
        (
            "Intelligent Data Science & Analytics",
            "Treetiti provides intelligent data science and analytics: data pipelines, "
            "lead scoring, campaign attribution, dashboards and actionable intelligence "
            "the team uses to decide where to invest next.",
        ),
        (
            "AI Websites & Apps",
            "Treetiti builds AI-powered websites and apps — both AI-driven builds and "
            "business automation web/app products.",
        ),
        (
            "Full Branding & Campaign Management",
            "Treetiti manages complete branding and campaigns: brand strategy, positioning, "
            "message house, and full campaign execution across platforms from launch to "
            "reporting.",
        ),
    ],
    "positioning": [
        (
            "Positioning",
            "Treetiti is a premium AI agency that blends creative branding (UGC, cinematic) "
            "with intelligent data science and AI automation to run complete branding and "
            "marketing campaigns for B2B and consumer brands.",
        )
    ],
    "customers": [
        (
            "Target customers",
            "B2B decision-makers: startup founders, CMOs, brand managers, marketing leads — "
            "and consumer brands that need premium UGC and cinematic content plus AI-driven "
            "marketing.",
        )
    ],
    "voice": [
        (
            "Brand voice",
            "Premium, futuristic, minimal, confident — Apple / Linear / Stripe inspired. "
            "Clear, direct, high-end. No hype, no fluff, no emoji spam. Every claim must be "
            "believable and specific.",
        ),
        (
            "Why brands choose us",
            "We combine real creative craft (UGC, cinematic shots) with data science and AI "
            "automation — a rare full-stack branding + technology partner, not just an agency "
            "or just a tool.",
        ),
    ],
}


def seed_business_knowledge() -> int:
    """Idempotently seed the business brain. Returns number of entries added."""
    if not get_settings().seed_knowledge:
        logger.info("knowledge seeding disabled (SEED_KNOWLEDGE=false)")
        return 0

    added = 0
    with SessionLocal() as db:
        existing_titles = {m.title for m in db.query(BrandMemory).all()}
    for category, entries in SERVICE_MEMORY.items():
        for title, content in entries:
            if title in existing_titles:
                continue
            try:
                store_brand_memory(category, title, content, source="seed")
                added += 1
                logger.info("seeded brand memory: [%s] %s", category, title)
            except Exception as exc:  # noqa: BLE001
                logger.warning("seed [%s] %s failed: %s", category, title, exc)
    return added


def existing_titles(db) -> set[str]:
    return {m.title for m in db.query(BrandMemory).all()}