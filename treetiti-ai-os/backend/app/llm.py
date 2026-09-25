"""Treetiti AI Marketing OS — LLM provider.

Connects the brain to the opencode runtime (the same agent system powering
this project) via `opencode run --format json`. Free — uses the user's
existing opencode configuration and models.

Fallback: Ollama (fully local, free) via the OpenAI-compatible API.

Usage:
    from app.llm import llm_complete, llm_json
    text = llm_complete("Summarize this trend...")
    data = llm_json('{"trend": "..."}')
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import subprocess
import threading
import time
import urllib.request
from typing import Any

from app.config import get_settings

logger = logging.getLogger("treetiti.llm")


# ---------------------------------------------------------------------------
# Model health registry (arena auto-failover)
# ---------------------------------------------------------------------------

_health_lock = threading.Lock()
_model_failures: dict[str, int] = {}  # model -> consecutive failures


def _reset_health() -> None:
    with _health_lock:
        _model_failures.clear()


def _mark_failure(model: str) -> None:
    with _health_lock:
        _model_failures[model] = _model_failures.get(model, 0) + 1
        logger.warning("model marked unhealthy (%d): %s", _model_failures[model], model)


def _mark_success(model: str) -> None:
    with _health_lock:
        _model_failures.pop(model, None)


def _is_unhealthy(model: str) -> bool:
    settings = get_settings()
    if not settings.battle_failover:
        return False
    with _health_lock:
        return _model_failures.get(model, 0) >= settings.battle_failover_threshold


def model_health() -> dict[str, dict]:
    """Current consecutive-failure counts per arena model (for the dashboard)."""
    settings = get_settings()
    with _health_lock:
        failures = {m: _model_failures.get(m, 0) for m in (settings.battle_model_a, settings.battle_model_b)}
    return {
        m: {
            "consecutive_failures": n,
            "unhealthy": n >= settings.battle_failover_threshold,
        }
        for m, n in failures.items()
    }


# ---------------------------------------------------------------------------
# opencode provider
# ---------------------------------------------------------------------------

def _opencode_available() -> bool:
    import shutil
    return shutil.which("opencode") is not None


def _extract_text_from_events(raw: str) -> str:
    """Parse `opencode run --format json` output (one JSON event per line)."""
    parts: list[str] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "text":
            text = event.get("part", {}).get("text", "")
            if text:
                parts.append(text)
        elif event.get("type") == "reasoning" and event.get("part", {}).get("text"):
            # surface reasoning when requested (content agents ignore it)
            pass
    return "\n".join(parts).strip()


def _opencode_complete(
    system: str,
    prompt: str,
    model: str,
    temperature: float,
    timeout: int,
) -> str:
    settings = get_settings()
    message = system
    if prompt:
        message += "\n\n" + prompt

    cmd = [
        "opencode", "run",
        "--format", "json",
        "--model", model,
        "--title", "treetiti-ai-os",
        message,
    ]
    if settings.environment != "development":
        cmd.append("--auto")

    logger.info("opencode call start (model=%s)", model)
    started = time.time()
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=settings.opencode_dir or ".",
        env={**os.environ, "NO_COLOR": "1"},
    )
    elapsed = time.time() - started
    logger.info("opencode call done in %.1fs (rc=%s)", elapsed, proc.returncode)

    if proc.returncode != 0:
        logger.error("opencode stderr: %s", proc.stderr[-2000:])
        raise RuntimeError(f"opencode exited with code {proc.returncode}")

    text = _extract_text_from_events(proc.stdout)
    if not text:
        raise RuntimeError("opencode returned no text output")
    return text


# ---------------------------------------------------------------------------
# ollama provider (free local fallback)
# ---------------------------------------------------------------------------

def _ollama_complete(
    system: str,
    prompt: str,
    model: str,
    temperature: float,
    timeout: int,
) -> str:
    settings = get_settings()
    url = settings.ollama_base_url.rstrip("/") + "/api/chat"
    body = {
        "model": model,
        "stream": False,
        "think": False,  # qwen3 thinking mode off → fast, direct answers
        "options": {"temperature": temperature},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode())
    content = payload.get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("ollama returned empty response")
    return content.strip()


def _pollinations_complete(
    system: str,
    prompt: str,
    model: str,
    temperature: float,
    timeout: int,
) -> str:
    """Keyless free brain (Pollinations): no signup, no key, rate-limited.

    Uses the OpenAI-compatible POST endpoint. Good enough to make every
    agent genuinely work out of the box; swap to groq/openrouter/google
    keys for higher limits (see .env-free-llms).
    """
    body = {
        "model": model or "openai",
        "temperature": temperature,
        "private": True,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    req = urllib.request.Request(
        "https://text.pollinations.ai/",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode()
    try:
        payload = json.loads(raw)
        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "") or raw
    except Exception:  # noqa: BLE001 — plain-text fallback
        content = raw
    content = (content or "").strip()
    if not content:
        raise RuntimeError("pollinations returned empty response")
    return content


# ---------------------------------------------------------------------------
# Free multi-provider dispatch (Google AI Studio, Groq, OpenRouter)
# All three expose OpenAI-compatible chat endpoints. Set the API keys in .env
# (GOOGLE_AI_STUDIO_KEY / GROQ_KEY / OPENROUTER_KEY) to use them.
# ---------------------------------------------------------------------------

# provider prefix -> (base URL, key field)
_PROVIDER_ENDPOINTS: dict[str, tuple[str, str]] = {
    "google": ("https://generativelanguage.googleapis.com/v1beta/openai/", "google_ai_studio_key"),
    "groq": ("https://api.groq.com/openai/v1", "groq_key"),
    "openrouter": ("https://openrouter.ai/api/v1", "openrouter_key"),
}


def _openai_compatible(
    system: str,
    prompt: str,
    provider: str,
    model: str,
    temperature: float,
    timeout: int,
    api_key: str = "",
) -> str:
    """Call an OpenAI-compatible chat endpoint for google/groq/openrouter."""
    from app.ratelimit import can_call, record_request

    settings = get_settings()
    base, key_field = _PROVIDER_ENDPOINTS[provider]
    if not api_key:
        api_key = getattr(settings, key_field, "") or ""
    if not api_key:
        raise RuntimeError(f"{provider} API key not set (env {key_field.upper()})")
    if not can_call(provider, api_key):
        raise RuntimeError(f"{provider} daily rate limit reached for this key")

    url = base.rstrip("/") + "/chat/completions"
    body = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://treetiti.ai"
        headers["X-Title"] = "Treetiti AI Marketing OS"

    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode())
    record_request(provider, api_key)
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:  # noqa: BLE001
        raise RuntimeError(f"{provider} returned no content: {str(payload)[:300]}") from exc
    if not content:
        raise RuntimeError(f"{provider} returned empty response")
    return content.strip()


def _dispatch_provider(
    system: str, prompt: str, model: str, temperature: float, timeout: int
) -> str | None:
    """Route prefixed model IDs to their free provider.

    Returns the text, or None if the model has no special prefix and should be
    handled by the opencode path.
    """
    prefix, _, rest = model.partition("/")
    if prefix not in _PROVIDER_ENDPOINTS:
        return None
    if prefix == "google":
        # Rotate across up to 3 Google keys on rate-limit / capacity.
        from app.ratelimit import google_keys_with_capacity, record_request

        settings = get_settings()
        resolved = rest if rest and "/" not in rest else settings.google_ai_studio_model
        keys = google_keys_with_capacity()
        if not keys:
            raise RuntimeError("google daily rate limits reached for all keys")
        if len(keys) > 1:
            # primary first, rotate on 429
            for key in keys:
                try:
                    return _openai_compatible(
                        system, prompt, "google", resolved, temperature, timeout, api_key=key
                    )
                except Exception as exc:  # noqa: BLE001
                    raw = (getattr(exc, "args", None) or ("",))[0] if exc.args else ""
                    if "429" in str(raw) or "rate" in str(exc).lower():
                        record_request("google", key)  # burn the key so we rotate
                        continue
                    raise
            raise RuntimeError("google all keys rejected with 429")
        return _openai_compatible(
            system, prompt, "google", resolved, temperature, timeout, api_key=keys[0]
        )
    return _openai_compatible(system, prompt, prefix, rest, temperature, timeout)


# ---------------------------------------------------------------------------
# Free image generation (Nano Banana / Gemini via Google AI Studio)
# Uses the same GOOGLE_AI_STUDIO_KEY. Returns raw PNG bytes.
# ---------------------------------------------------------------------------

def generate_image(
    prompt: str,
    *,
    size: str = "1024x1024",
    model: str | None = None,
    timeout: int = 120,
) -> bytes:
    """Generate an image with Google's free Nano Banana (Gemini) image model.

    Returns raw image bytes. Raises RuntimeError if no key or the API fails.
    """
    settings = get_settings()
    api_key = settings.google_ai_studio_key or ""
    if not api_key:
        raise RuntimeError("GOOGLE_AI_STUDIO_KEY not set — needed for image generation")
    image_model = model or settings.google_ai_studio_image_model
    url = "https://generativelanguage.googleapis.com/v1beta/openai/images/generations"
    body = {
        "model": image_model,
        "prompt": prompt,
        "n": 1,
        "size": size,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:  # type: ignore[attr-defined]
        detail = exc.read().decode(errors="replace")
        raise RuntimeError(f"image generation failed ({exc.code}): {detail[:300]}") from exc

    b64 = payload.get("data", [{}])[0].get("b64_json", "")
    if not b64:
        raise RuntimeError(f"image API returned no data: {str(payload)[:300]}")
    import base64

    return base64.b64decode(b64)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _arena_default() -> str | None:
    """Return the arena's #1 model, or None if the arena isn't ready."""
    try:
        from app.arena import champion

        top = champion()
        return top["model"] if top else None
    except Exception:  # noqa: BLE001
        return None


def llm_complete(
    system: str,
    prompt: str,
    *,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    timeout: int = 90,
) -> str:
    """Run a single completion through the configured brain provider."""
    settings = get_settings()
    provider = settings.llm_provider.lower()

    chosen = model or settings.opencode_model

    # Route prefixed agent models to free providers (google/groq/openrouter).
    dispatched = _dispatch_provider(system, prompt, chosen, temperature, timeout)
    if dispatched is not None:
        _mark_success(chosen)
        return dispatched

    if provider == "opencode":
        if not _opencode_available():
            raise RuntimeError(
                "opencode CLI not found on PATH. Set LLM_PROVIDER=ollama to "
                "use the free local fallback."
            )
        # Auto-select the arena champion when no model was specified.
        if not model:
            arena_default = _arena_default()
            if arena_default:
                chosen = arena_default
        # Arena auto-failover for opencode models: if the chosen model is
        # unhealthy, switch to the arena partner instead.
        if settings.battle_failover and not model and _is_unhealthy(chosen):
            for partner in (settings.battle_model_a, settings.battle_model_b):
                if partner != chosen and not _is_unhealthy(partner):
                    logger.warning("failover %s -> %s", chosen, partner)
                    chosen = partner
                    break
        try:
            text = _opencode_complete(system, prompt, chosen, temperature, timeout)
            _mark_success(chosen)
            return text
        except Exception as exc:  # noqa: BLE001
            _mark_failure(chosen)
            if settings.battle_failover and not model:
                for partner in (settings.battle_model_a, settings.battle_model_b):
                    if partner != chosen and not _is_unhealthy(partner):
                        logger.warning("failover after error %s -> %s", chosen, partner)
                        text = _opencode_complete(system, prompt, partner, temperature, timeout)
                        _mark_success(partner)
                        return text
            raise exc

    if provider == "ollama":
        chosen = model or settings.ollama_model
        return _ollama_complete(system, prompt, chosen, temperature, timeout)

    if provider == "pollinations":
        chosen = model or settings.pollinations_model
        try:
            text = _pollinations_complete(system, prompt, chosen, temperature, timeout)
            _mark_success(chosen)
            return text
        except Exception as exc:  # noqa: BLE001
            _mark_failure(chosen)
            raise exc

    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


def llm_provider_available() -> tuple[bool, str]:
    """(available, reason). False when no brain can run (no CLI, no keys, no ollama)."""
    settings = get_settings()
    provider = settings.llm_provider.lower()
    if provider == "opencode":
        if _opencode_available():
            return True, "opencode CLI"
        return False, "opencode CLI not found and no API keys set"
    if provider == "ollama":
        try:
            urllib.request.urlopen(settings.ollama_base_url.rstrip("/") + "/", timeout=3)
            return True, "ollama"
        except Exception:  # noqa: BLE001
            return False, "ollama not reachable"
    if provider == "pollinations":
        return True, "pollinations (keyless free tier)"
    return False, f"unknown provider {provider}"


def offline_reply(system: str, prompt: str) -> str:
    """Honest local fallback: surfaces brand memory instead of inventing an answer."""
    lines = [l.strip("- ").strip() for l in system.splitlines() if l.strip().startswith("-")]
    known = "\n".join(f"- {l}" for l in lines[:8]) or "- (brand memory is empty — add it via /memory)"
    return (
        "I'm running in OFFLINE mode right now (no LLM brain reachable: "
        f"{llm_provider_available()[1]}).\n\n"
        "Here's what I actually know from brand memory (no guessing):\n"
        f"{known}\n\n"
        "To get full answers, set one of: opencode CLI on PATH, "
        "LLM_PROVIDER=ollama with Ollama running, or a GOOGLE/GROQ/OPENROUTER key. "
        "Your message was stored and the team memory still works."
    )


def llm_complete_safe(system: str, prompt: str, **kwargs) -> tuple[str, bool]:
    """(text, offline). Never raises for missing providers — falls back honestly."""
    try:
        return llm_complete(system, prompt, **kwargs), False
    except Exception as exc:  # noqa: BLE001
        logger.warning("llm offline fallback: %s", exc)
        return offline_reply(system, prompt), True


def llm_json(
    system: str,
    prompt: str,
    *,
    model: str | None = None,
    temperature: float = 0.2,
    timeout: int = 90,
) -> dict[str, Any] | list[Any]:
    """Run a completion and parse the result as JSON.

    Resilient to the messy output free models sometimes produce: extracts the
    first JSON object/array (even inside code fences or wrapped in prose),
    repairs trailing commas, and falls back to a smart re-chunked retry.
    """
    system += (
        "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation, "
        "no code fences."
    )
    raw = llm_complete(
        system, prompt, model=model, temperature=temperature, timeout=timeout
    )

    parsed = _extract_json(raw)
    if parsed is not None:
        return parsed

    # Rescue attempt: retry once demanding strict single-line JSON.
    try:
        raw2 = llm_complete(
            system,
            prompt + "\n\n(Your previous answer was not valid JSON. Reply with a "
            "single compact JSON object. No words around it.)",
            model=model,
            temperature=0.0,
            timeout=timeout,
        )
        parsed = _extract_json(_strip_fences(raw2))
        if parsed is not None:
            return parsed
    except Exception:  # noqa: BLE001
        pass
    raise ValueError(f"model did not return valid JSON for {model!r}: {raw[:300]}")


def _strip_fences(text: str) -> str:
    """Remove one level of ```...``` or ```json ... ``` wrapping."""
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.startswith("json"):
            t = t[4:]
        t = t.strip()
    return t


def _extract_json(raw: str) -> dict[str, Any] | None:
    """Best-effort JSON extraction + repair. Returns None if unrecoverable."""
    candidates: list[str] = []

    # 1) try the raw text as-is
    candidates.append(raw)

    # 2) if wrapped in fences, try the fenced body
    fenced = _strip_fences(raw)
    if fenced != raw:
        candidates.append(fenced)
        # sometimes there are nested fences (```json\n```...\n```)
        candidates.append(_extract_largest_brace_group(fenced))

    # 3) always also try the largest brace group (protects against prose wrappers)
    candidates.append(_extract_largest_brace_group(raw))

    for candidate in candidates:
        if not candidate:
            continue
        repaired = _repair(candidate)
        try:
            obj = json.loads(repaired)
            if isinstance(obj, dict):
                return obj
            # A top-level JSON array is valid (content agent returns count items).
            # Only accept it when the candidate itself begins with `[`, so a
            # nested array (e.g. campaign.content_plan) never masks the object.
            if isinstance(obj, list) and repaired.lstrip().startswith("["):
                return obj
        except Exception:  # noqa: BLE001
            continue
    return None


def _extract_largest_brace_group(text: str) -> str:
    """Return the longest substring balanced between { and } (or [ and ])."""
    best = ""
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = text.find(open_ch)
        while start != -1:
            depth = 0
            end = len(text)
            for i in range(start, len(text)):
                if text[i] == open_ch:
                    depth += 1
                elif text[i] == close_ch:
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            segment = text[start:end]
            if len(segment) > len(best):
                best = segment
            start = text.find(open_ch, start + 1)
    return best


def _repair(text: str) -> str:
    """Make sloppy JSON parseable: strip trailing commas and stray trailing commas."""
    cleaned = text.strip()
    # Remove trailing commas before } or ] (common free-model slip).
    import re as _re

    cleaned = _re.sub(r",\s*([}\]])", r"\1", cleaned)
    # Replace Python-style booleans/None that the model sometimes emits.
    cleaned = _re.sub(r"\bTrue\b", "true", cleaned)
    cleaned = _re.sub(r"\bFalse\b", "false", cleaned)
    cleaned = _re.sub(r"\bNone\b", "null", cleaned)
    return cleaned


# ---------------------------------------------------------------------------
# Battle mode (arena): two models answer, a judge picks the winner
# ---------------------------------------------------------------------------

BattleResult = dict[str, Any]


def _run_one(
    system: str, prompt: str, model: str, timeout: int
) -> tuple[str, str]:
    """Run one model; returns (model, answer). Raises on failure."""
    try:
        answer = _opencode_complete(system, prompt, model, 0.6, timeout)
    except Exception as exc:  # noqa: BLE001
        # Fall back to the ollama path for `ollama/...` models.
        if model.startswith("ollama/"):
            try:
                answer = _ollama_complete(system, prompt, model.split("/", 1)[1], 0.6, timeout)
                _mark_success(model)
                return model, answer.strip()
            except Exception as ollama_exc:  # noqa: BLE001
                _mark_failure(model)
                raise
        _mark_failure(model)
        raise
    _mark_success(model)
    return model, answer.strip()


def llm_battle(
    system: str,
    prompt: str,
    *,
    model_a: str | None = None,
    model_b: str | None = None,
    judge_model: str | None = None,
    timeout: int = 90,
) -> BattleResult:
    """Run two models in parallel, then a judge picks the better answer.

    Returns:
      {"winner": <answer text>, "winner_model": <name>,
       "answers": [{"model":..., "answer":...}, ...],
       "judge": <judge rationale>}
    """
    settings = get_settings()
    a = model_a or settings.battle_model_a
    b = model_b or settings.battle_model_b
    judge = judge_model or settings.battle_judge_model

    # Auto-failover: if one model is unhealthy, skip the battle and let the
    # healthy model answer alone (no judge needed).
    if _is_unhealthy(a) and not _is_unhealthy(b):
        model, answer = _run_one(system, prompt, b, timeout)
        return {
            "winner": answer,
            "winner_model": model,
            "answers": [{"model": model, "answer": answer}],
            "judge": f"Auto-failover: {a} was unhealthy, {b} answered.",
            "failover": True,
            "skipped_model": a,
        }
    if _is_unhealthy(b) and not _is_unhealthy(a):
        model, answer = _run_one(system, prompt, a, timeout)
        return {
            "winner": answer,
            "winner_model": model,
            "answers": [{"model": model, "answer": answer}],
            "judge": f"Auto-failover: {b} was unhealthy, {a} answered.",
            "failover": True,
            "skipped_model": b,
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        fa = pool.submit(_run_one, system, prompt, a, timeout)
        fb = pool.submit(_run_one, system, prompt, b, timeout)
        results: dict[str, str] = {}
        for fut in (fa, fb):
            try:
                model, answer = fut.result()
                results[model] = answer
            except Exception as exc:  # noqa: BLE001
                logger.error("battle model failed: %s", exc)
        if not results:
            raise RuntimeError("both battle models failed")

    # Stable order: answers[0] is always model A, answers[1] always model B.
    answers = []
    for m in (a, b):
        if m in results:
            answers.append({"model": m, "answer": results[m]})

    judge_prompt = (
        f"You are an impartial arena judge. Two AI models answered the same "
        f"question. Pick the better answer (more accurate, on-brand, complete, "
        f"clear) and say which one wins and why, briefly.\n\n"
        f"--- Model A ({a}) ---\n{results.get(a, '(failed)')}\n\n"
        f"--- Model B ({b}) ---\n{results.get(b, '(failed)')}\n\n"
        f"Reply with ONLY: WINNER=<A or B>\nREASON=<one sentence>"
    )
    try:
        judge_text = llm_complete(
            "You are a strict, neutral arena judge.", judge_prompt,
            model=judge, temperature=0.2, timeout=min(timeout, 45),
        )
        _mark_success(judge)
    except Exception as exc:  # noqa: BLE001
        # Judge is best-effort: still return A/B so the user can pick.
        _mark_failure(judge)
        logger.warning("battle judge failed (returning A/B): %s", exc)
        judge_text = ""

    if not judge_text:
        winner_model = next(iter(results))
    elif "WINNER=B" in judge_text and b in results:
        chosen = b
        winner_model = chosen
    else:
        chosen = a if a in results else next(iter(results))
        winner_model = chosen

    return {
        "winner": results[winner_model],
        "winner_model": winner_model,
        "answers": answers,
        "judge": judge_text.strip(),
    }
