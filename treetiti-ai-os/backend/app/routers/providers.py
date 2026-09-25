"""TREEtiti AI Agency OS — provider routes (health/usage, plan §L).

    GET /api/v1/providers          provider capability registry + key status
    GET /api/v1/providers/models   the routed model catalog (registry)
    GET /api/v1/providers/health   live probe through 9Router (cached ~30s)
    GET /api/v1/providers/usage    today's per-provider request usage

Health probes make one tiny chat request per capability tier through the
gateway and report status + latency — the same path every agent uses.
"""

from __future__ import annotations

import threading
import time
from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.core.model_registry import get_registry
from app.core.provider_capability import provider_list
from app.models import User
from app.ratelimit import daily_limit, requests_used
from app.config import get_settings

router = APIRouter(prefix="/providers", tags=["providers"])

# -- cached health probes -----------------------------------------------------
_cache_lock = threading.Lock()
_health_cache: dict[str, object] = {"at": 0.0, "results": []}
_HEALTH_TTL_S = 30.0


def _probe_models() -> list[str]:
    s = get_settings()
    # One model per capability tier (deduped), all flowing through the gateway.
    slugs = list(dict.fromkeys(s.router_models.values()))
    return [f"router/{slug}" for slug in slugs]


def run_health_probes(*, force: bool = False) -> list[dict]:
    """Probe every routed tier model through the gateway (cached TTL)."""
    global _health_cache  # noqa: PLW0603
    now = time.monotonic()
    if not force and (now - _health_cache["at"]) < _HEALTH_TTL_S:
        return _health_cache["results"]

    from app.llm import llm_complete

    results: list[dict] = []
    for model in _probe_models():
        t0 = time.perf_counter()
        try:
            out = llm_complete(
                "You are a test probe. Reply with exactly: OK",
                "Reply with exactly: OK",
                model=model,
                timeout=20,
            )
            ok = bool(out and out.strip().upper().startswith("OK"))
            results.append(
                {
                    "model": model,
                    "status": "ok" if ok else "degraded",
                    "latency_ms": int((time.perf_counter() - t0) * 1000),
                    "error": "" if ok else f"unexpected reply: {out[:80]!r}",
                }
            )
        except Exception as exc:  # noqa: BLE001
            results.append(
                {
                    "model": model,
                    "status": "down",
                    "latency_ms": int((time.perf_counter() - t0) * 1000),
                    "error": str(exc).split("\n")[0][:160],
                }
            )
    with _cache_lock:
        _health_cache = {"at": now, "results": results}
    return results


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
def providers(_: Annotated[User, Depends(get_current_user)]) -> dict:
    """Provider capability registry + which keys are configured."""
    return {"providers": provider_list()}


@router.get("/models")
def models(_: Annotated[User, Depends(get_current_user)]) -> dict:
    """The routed model catalog — every model the OS knows about."""
    reg = get_registry()
    return {"models": reg.to_dicts()}


@router.get("/health")
def health(_: Annotated[User, Depends(get_current_user)], force: bool = False) -> dict:
    """Live gateway health probe per capability tier (cached 30s)."""
    return {
        "gateway": get_settings().router_base_url,
        "checked_at": time.time(),
        "results": run_health_probes(force=force),
    }


@router.get("/usage")
def usage(_: Annotated[User, Depends(get_current_user)]) -> dict:
    """Today's per-provider request usage vs daily limits."""
    s = get_settings()
    rows: list[dict] = []
    for provider, key_field in (
        ("groq", "groq_key"),
        ("openrouter", "openrouter_key"),
        ("google", "google_ai_studio_key"),
        ("router", "router_key"),
        ("cerebras", "cerebras_key"),
        ("cohere", "cohere_key"),
        ("deepseek", "deepseek_key"),
        ("mistral", "mistral_key"),
        ("sambanova", "sambanova_key"),
        ("requesty", "requesty_key"),
        ("omnirouter", "omnirouter_key"),
        ("pollinations", "pollinations_key"),
    ):
        secret = getattr(s, key_field, "") or ""
        if not secret:
            continue
        rows.append(
            {
                "provider": provider,
                "requests": requests_used(provider, secret),
                "daily_limit": daily_limit(provider),
            }
        )
    return {"date": time.strftime("%Y-%m-%d", time.gmtime()), "usage": rows}


@router.post("/health/probe")
def probe(_: Annotated[User, Depends(get_current_user)]) -> dict:
    """Force a fresh gateway health probe."""
    return {
        "gateway": get_settings().router_base_url,
        "checked_at": time.time(),
        "results": run_health_probes(force=True),
    }