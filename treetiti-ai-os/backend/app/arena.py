"""Treetiti AI Marketing OS — self-driving model arena.

The system discovers every model exposed by the `opencode` CLI, keeps a
persistent Elo ranking in Postgres, and runs judge-evaluated battles in the
background between the current champion and random challengers. All AI work
(agents, chat, content) is then automatically routed to the current #1 model.

Inspired by arena.ai / LMArena leaderboards — except nobody has to pick the
winner: a judge model decides, so the arena improves itself.
"""

from __future__ import annotations

import logging
import os
import random
import shutil
import subprocess
import threading
import time
from datetime import datetime, timezone
from typing import Any

from app.database import SessionLocal
from app.llm import llm_battle
from app.models import ArenaBattle, ArenaModel

logger = logging.getLogger("treetiti.arena")

# How often the background arena runs a self-battle (seconds).
SELF_BATTLE_INTERVAL = int(os.environ.get("ARENA_SELF_BATTLE_INTERVAL", "180"))

# Evaluation question bank used for self-battles.
EVAL_QUESTIONS: list[str] = [
    "Explain why a premium B2B company should automate its sales follow-up. Be concise and persuasive.",
    "Write a short, high-end LinkedIn post announcing an AI agent that books meetings for luxury real estate firms.",
    "Summarize the value of AI agents in one punchy sentence a CEO would remember.",
    "Draft a 3-step plan for a business to stop losing leads to slow follow-up.",
]

# Fast, capable arena models. ONLY verified-working free models belong here —
# every model in this list was tested against the real opencode endpoint and
# returned OK. Paid/403 models (deepseek-v4-pro, gemini-*, claude-haiku, etc.)
# are excluded: they error out, spam the log and can never win anyway.
FAST_MODELS: list[str] = [
    "opencode/deepseek-v4-flash-free",
    "zai/glm-4.5-flash",
    "zai/glm-4.7-flash",
]

_worker: threading.Thread | None = None
_stop = threading.Event()
_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Model pool discovery
# ---------------------------------------------------------------------------

def discover_models() -> list[str]:
    """Return the list of models exposed by the opencode CLI (best-effort)."""
    if shutil.which("opencode") is None:
        return []
    try:
        proc = subprocess.run(
            ["opencode", "models"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception:  # noqa: BLE001
        logger.exception("failed to list opencode models")
        return []
    names: list[str] = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        if any(ch in line for ch in ("opencode/", "zai/", "ollama/")):
            names.append(line)
    # de-dupe, keep order
    seen: set[str] = set()
    unique = [n for n in names if not (n in seen or seen.add(n))]
    return unique


def sync_pool() -> dict[str, int]:
    """Add any newly discovered models to the DB pool. Returns counts."""
    discovered = discover_models()
    if not discovered:
        return {"discovered": 0, "total": 0, "models": []}
    with SessionLocal() as db:
        existing = {m.model for m in db.query(ArenaModel).all()}
        added = 0
        for name in discovered:
            if name not in existing:
                db.add(ArenaModel(model=name, provider=name.split("/", 1)[0]))
                added += 1
        db.commit()
        total = db.query(ArenaModel).count()
        models = [m.model for m in db.query(ArenaModel).order_by(ArenaModel.elo.desc()).all()]
    return {"discovered": len(discovered), "added": added, "total": total, "models": models}


def get_pool() -> list[ArenaModel]:
    with SessionLocal() as db:
        return db.query(ArenaModel).filter(ArenaModel.enabled.is_(True)).all()


def _fast_pool() -> list[ArenaModel]:
    """Only the fast, capable models — used for self-battles and the champion."""
    fast = set(FAST_MODELS)
    with SessionLocal() as db:
        return (
            db.query(ArenaModel)
            .filter(ArenaModel.enabled.is_(True), ArenaModel.model.in_(fast))
            .all()
        )


def _fast_leaderboard() -> list[dict[str, Any]]:
    """Leaderboard restricted to the fast, capable models."""
    fast = set(FAST_MODELS)
    with SessionLocal() as db:
        rows = (
            db.query(ArenaModel)
            .filter(ArenaModel.enabled.is_(True), ArenaModel.model.in_(fast))
            .order_by(ArenaModel.elo.desc())
            .all()
        )
        return [
            {
                "model": r.model,
                "provider": r.provider,
                "elo": round(r.elo, 1),
                "wins": r.wins,
                "losses": r.losses,
                "battles": r.battles,
                "enabled": r.enabled,
                "last_battle_at": r.last_battle_at.isoformat() if r.last_battle_at else None,
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Elo rating
# ---------------------------------------------------------------------------

def _expected(ra: float, rb: float) -> float:
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))


def _apply_elo(a: ArenaModel, b: ArenaModel, winner: str, k: int = 32) -> None:
    ea = _expected(a.elo, b.elo)
    eb = _expected(b.elo, a.elo)
    if winner == a.model:
        a.elo += k * (1 - ea)
        b.elo += k * (0 - eb)
        a.wins += 1
        b.losses += 1
    elif winner == b.model:
        b.elo += k * (1 - eb)
        a.elo += k * (0 - ea)
        b.wins += 1
        a.losses += 1
    a.battles += 1
    b.battles += 1


# ---------------------------------------------------------------------------
# Battles
# ---------------------------------------------------------------------------

def run_battle(
    model_a: str,
    model_b: str,
    question: str | None = None,
    *,
    automatic: bool = True,
) -> dict[str, Any]:
    """Run one judge battle, persist the outcome and update Elo."""
    question = question or random.choice(EVAL_QUESTIONS)
    system = (
        "You are Treetiti's AI Marketing Employee. You answer with the "
        "Treetiti brand voice: premium, futuristic, minimal, confident, B2B. "
        "Keep answers clear, direct and high-end."
    )
    result = llm_battle(system, question, model_a=model_a, model_b=model_b)
    winner = result.get("winner_model") or model_a
    judge = result.get("judge", "")

    with SessionLocal() as db:
        a = db.query(ArenaModel).filter(ArenaModel.model == model_a).first()
        b = db.query(ArenaModel).filter(ArenaModel.model == model_b).first()
        if a is not None and b is not None:
            _apply_elo(a, b, winner)
            a.last_battle_at = _now()
            b.last_battle_at = _now()
        db.add(
            ArenaBattle(
                model_a=model_a,
                model_b=model_b,
                winner=winner,
                question=question,
                judge=judge[:2000],
                automatic=automatic,
            )
        )
        db.commit()

    return {
        "model_a": model_a,
        "model_b": model_b,
        "winner": winner,
        "winner_model": winner,
        "question": question,
        "judge": judge,
    }


def _random_challenger(exclude: str) -> str | None:
    pool = _fast_pool()
    candidates = [m.model for m in pool if m.model != exclude]
    return random.choice(candidates) if candidates else None


def run_self_battle() -> dict[str, Any]:
    """Champion vs a random challenger — the arena improving itself."""
    ranking = _fast_leaderboard()
    if len(ranking) < 2:
        return {"skipped": True, "reason": "need at least 2 fast models"}
    champion = ranking[0]["model"]
    challenger = _random_challenger(champion) or ranking[1]["model"]
    return run_battle(champion, challenger, automatic=True)


def champion() -> dict[str, Any] | None:
    """The current #1 fast capable model — where all AI work is routed by default.

    Always ranks within the fast pool so default AI work never routes to a heavy
    frontier model that queues up and 503s the gateway. Until the arena has
    ranked anyone (all Elo tied), fall back to the configured default model.
    """
    ranking = _fast_leaderboard()
    if not ranking:
        return None
    top = ranking[0]
    if all(r["battles"] == 0 for r in ranking):
        from app.config import get_settings

        default = get_settings().opencode_model
        for r in ranking:
            if r["model"] == default:
                top = r
                break
    return top


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def leaderboard(limit: int = 50) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        rows = (
            db.query(ArenaModel)
            .filter(ArenaModel.enabled.is_(True))
            .order_by(ArenaModel.elo.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "model": r.model,
                "provider": r.provider,
                "elo": round(r.elo, 1),
                "wins": r.wins,
                "losses": r.losses,
                "battles": r.battles,
                "enabled": r.enabled,
                "last_battle_at": r.last_battle_at.isoformat() if r.last_battle_at else None,
            }
            for r in rows
        ]


def recent_battles(limit: int = 20) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        rows = (
            db.query(ArenaBattle)
            .order_by(ArenaBattle.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "model_a": r.model_a,
                "model_b": r.model_b,
                "winner": r.winner,
                "question": r.question,
                "judge": r.judge,
                "automatic": r.automatic,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Background self-driving loop
# ---------------------------------------------------------------------------

def _loop() -> None:
    logger.info("self-driving arena worker started (interval %ss)", SELF_BATTLE_INTERVAL)
    while not _stop.is_set():
        try:
            sync_pool()
            result = run_self_battle()
            if result.get("skipped"):
                logger.info("arena self-battle skipped: %s", result["reason"])
            else:
                logger.info(
                    "arena self-battle: %s vs %s -> %s",
                    result["model_a"],
                    result["model_b"],
                    result["winner"],
                )
        except Exception:  # noqa: BLE001
            logger.exception("arena self-battle failed")
        _stop.wait(SELF_BATTLE_INTERVAL)


def start_arena() -> None:
    """Sync the pool and start the background self-driving worker (idempotent).

    Only meaningful when the brain provider is opencode (arena ranks cloud
    models). With a local ollama provider there is a single local model — no
    Elo ranking needed — so the worker stays idle.
    """
    global _worker
    try:
        sync_pool()
    except Exception:  # noqa: BLE001
        logger.exception("arena pool sync failed at startup")
    if _worker is not None and _worker.is_alive():
        return
    try:
        from app.config import get_settings

        if get_settings().llm_provider.lower() != "opencode":
            logger.info("arena worker idle (LLM_PROVIDER is not opencode)")
            return
    except Exception:  # noqa: BLE001
        pass
    _stop.clear()
    _worker = threading.Thread(target=_loop, daemon=True, name="treetiti-arena")
    _worker.start()


def stop_arena() -> None:
    global _worker
    _stop.set()
    if _worker is not None:
        _worker.join(timeout=5)
        _worker = None
