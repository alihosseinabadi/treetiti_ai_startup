"""TREEtiti AI Marketing OS — LLM provider.

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

import json
import logging
import os
import re
import subprocess
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Iterator

from app.config import get_settings

logger = logging.getLogger("treetiti.llm")


# ---------------------------------------------------------------------------
# Model health registry (free-model chain failover)
# ---------------------------------------------------------------------------

_health_lock = threading.Lock()
_model_failures: dict[str, int] = {}  # model -> consecutive failures
_model_unhealthy_until: dict[str, float] = {}  # model -> epoch seconds benched until
# After a model trips the failure threshold it is benched for this long, then
# allowed back into the chain. Without a cooldown, one transient blip (a single
# 502 or timeout) sidelined an otherwise healthy model for the whole process
# lifetime, because nothing ever cleared the counter (spec section 17).
_COOLDOWN_SECONDS = 300
_chain_guard = threading.local()  # re-entrancy guard for the free-model chain
_CHAIN_CANDIDATE_TIMEOUT = 60  # seconds per model — Agnes reasoning model needs 30-60s


def _chain_guard_set() -> bool:
    return getattr(_chain_guard, "active", False)


class _ChainGuard:
    def __enter__(self):
        _chain_guard.active = True

    def __exit__(self, *a):
        _chain_guard.active = False


def _reset_health() -> None:
    with _health_lock:
        _model_failures.clear()
        _model_unhealthy_until.clear()


def _mark_failure(model: str) -> None:
    with _health_lock:
        n = _model_failures.get(model, 0) + 1
        _model_failures[model] = n
        if n >= get_settings().failover_threshold:
            _model_unhealthy_until[model] = time.time() + _COOLDOWN_SECONDS
        logger.warning("model marked unhealthy (%d): %s", _model_failures[model], model)


def _mark_success(model: str) -> None:
    with _health_lock:
        _model_failures.pop(model, None)
        _model_unhealthy_until.pop(model, None)


def _is_unhealthy(model: str) -> bool:
    settings = get_settings()
    with _health_lock:
        until = _model_unhealthy_until.get(model, 0.0)
        if until > 0:
            if time.time() < until:
                return True
            # Cooldown expired: let the model back into the chain (spec 17).
            _model_unhealthy_until.pop(model, None)
            _model_failures.pop(model, None)
            return False
        # No cooldown recorded (pre-threshold or legacy state): raw counter.
        return _model_failures.get(model, 0) >= settings.failover_threshold


def model_health() -> dict[str, dict]:
    """Current consecutive-failure counts per model (for the dashboard)."""
    settings = get_settings()
    with _health_lock:
        failures = dict(_model_failures)
        untils = dict(_model_unhealthy_until)
        now = time.time()
    return {
        m: {
            "consecutive_failures": n,
            "unhealthy": max(0.0, untils.get(m, 0.0) - now) > 0 or n >= settings.failover_threshold,
            "cooldown_remaining_s": max(0, int(untils.get(m, 0.0) - now)),
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
    # DeepInfra (text/image/video), Agnes AI hub, and the local 9Router gateway —
    # all OpenAI-compatible. Key from settings.agnes_key / router_key / deepinfra_key.
    "deepinfra": ("https://api.deepinfra.com/v1/openai", "deepinfra_key"),
    "agnes": ("https://apihub.agnes-ai.com/v1", "agnes_key"),
    "router": ("http://127.0.0.1:20128/v1", "router_key"),
    # GitHub Models (GPT-4.1 / Claude / DeepSeek free pool) — needs a PAT.
    "ghm": ("https://models.github.ai/inference", "github_models_key"),
    # NVIDIA NIM (Llama/Qwen/DeepSeek free on NVIDIA GPUs).
    "nim": ("https://integrate.api.nvidia.com/v1", "nim_key"),
    # Z.ai (GLM-4-Flash, free text + image).
    "glm": ("https://api.z.ai/api/paas/v4", "zai_key"),
    # Cloudflare Workers AI — base URL needs the account id (built below).
    "cf": ("https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1", "cf_key"),
    # Extra OpenAI-compatible providers (keys shared with the treetiti/.env pool).
    "cerebras": ("https://api.cerebras.ai/v1", "cerebras_key"),
    "cohere": ("https://api.cohere.com/compatibility/v1", "cohere_key"),
    "deepseek": ("https://api.deepseek.com/v1", "deepseek_key"),
    "mistral": ("https://api.mistral.ai/v1", "mistral_key"),
    "sambanova": ("https://api.sambanova.ai/v1", "sambanova_key"),
    "requesty": ("https://router.requesty.ai/v1", "requesty_key"),
    "omnirouter": ("http://127.0.0.1:20128/v1", "omnirouter_key"),
    "pollinations": ("https://text.pollinations.ai/openai", "pollinations_key"),
}


def _loads_openai(text: str) -> dict[str, Any]:
    """Parse an OpenAI-style response body.

    The local 9Router gateway (and some proxies) append a trailing stream
    marker (``data: [DONE]``) to a normal JSON response — harmless, but it makes
    a plain ``json.loads`` throw ``Extra data``. Fall back to the first balanced
    JSON object when the raw body does not parse cleanly.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


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
    # Honor overridable base URLs from settings (Agnes hub, local 9Router,
    # OpenRouter mirror/gateway).
    if provider == "agnes":
        base = settings.agnes_base_url
    elif provider == "router":
        base = settings.router_base_url
    elif provider == "openrouter":
        base = settings.openrouter_base_url
    elif provider == "requesty":
        base = settings.requesty_base_url
    elif provider == "omnirouter":
        base = settings.omnirouter_base_url
    elif provider == "cf":
        # Workers AI endpoint is namespaced per account:
        # /client/v4/accounts/{ACCOUNT_ID}/ai/v1
        if not settings.cf_account_id:
            raise RuntimeError("cf account id not set (env CF_ACCOUNT_ID)")
        base = base.replace("{account_id}", settings.cf_account_id)
    if not api_key:
        api_key = getattr(settings, key_field, "") or ""
    if not api_key:
        raise RuntimeError(f"{provider} API key not set (env {key_field.upper()})")
    if not can_call(provider, api_key):
        raise RuntimeError(f"{provider} daily rate limit reached for this key")

    url = base.rstrip("/") + "/chat/completions"
    body: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    # Agnes 2.5-pro is a reasoning model that burns tokens on
    # reasoning_content before producing the final content. Without an
    # explicit max_tokens the API may cap at a low default (e.g. 20)
    # leaving content empty. Set a generous ceiling so the model has room
    # to finish its chain-of-thought AND produce a real answer.
    if provider == "agnes":
        body["max_tokens"] = 4096
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        # Some providers (e.g. Groq) reject urllib's default python-urllib
        # User-Agent with 403; send a browser-like UA so all endpoints accept us.
        "User-Agent": "TREEtiti-AI-OS/1.0",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://treetiti.ai"
        headers["X-Title"] = "TREEtiti AI Marketing OS"

    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=headers, method="POST"
    )
    # Optional VPN proxy for WAF/geo-blocked networks (mirrors TELEGRAM_PROXY).
    proxy = settings.openrouter_proxy if provider == "openrouter" else ""
    if proxy:
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({"http": proxy, "https": proxy})
        )
        with opener.open(req, timeout=timeout) as resp:
            payload = _loads_openai(resp.read().decode())
    else:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = _loads_openai(resp.read().decode())
    record_request(provider, api_key)
    try:
        msg = payload["choices"][0]["message"]
        content = msg.get("content", "")
        # Agnes 2.5-pro is a reasoning model. In some cases (token budget
        # exhausted during chain-of-thought) the API returns an empty
        # ``content`` and the full reasoning in ``reasoning_content``. Use
        # that as a graceful fallback so the chat never returns nothing.
        if not content and msg.get("reasoning_content"):
            content = msg["reasoning_content"]
    except (KeyError, IndexError, TypeError) as exc:  # noqa: BLE001
        raise RuntimeError(f"{provider} returned no content: {str(payload)[:300]}") from exc
    if not content:
        raise RuntimeError(f"{provider} returned empty response")
    return content.strip()


def _dispatch_chain(
    system: str, prompt: str, temperature: float, timeout: int, skip: str = ""
) -> str | None:
    """Try the free-model chain in order (strongest -> weakest) until one works.

    Returns the first successful text, or None if every model in the chain
    failed. Used as failover when an agent's primary model errors.

    Re-entrancy guard: ``_dispatch_provider`` falls back into this chain when a
    model errors, so without a guard a failing chain would recurse infinitely.
    """
    if _chain_guard_set():
        return None
    with _ChainGuard():
        settings = get_settings()
        # The keyless opencode CLI is the most reliable fallback (local, no
        # network) — try it first when it's available and healthy, then walk
        # the free models. Skip immediately when it has already failed enough
        # times (the exit-code-1 loop wastes ~4-11s per attempt).
        if _opencode_available() and not _is_unhealthy(settings.opencode_model):
            try:
                out = _dispatch_provider(
                    system, prompt, settings.opencode_model, temperature, min(timeout, _CHAIN_CANDIDATE_TIMEOUT)
                )
                if out is not None:
                    logger.warning("chain fallback used: %s", settings.opencode_model)
                    _mark_success(settings.opencode_model)
                    return out
            except Exception as exc:  # noqa: BLE001
                _mark_failure(settings.opencode_model)
                logger.warning("chain opencode fallback failed: %s", str(exc)[:120])
        for candidate in settings.free_model_chain:
            if candidate == skip:
                continue
            if _is_unhealthy(candidate):
                continue
            # A dead/slow network must not stall the whole chain: each
            # candidate gets a short budget so a down provider is skipped in
            # seconds, not minutes, before the next fallback is tried.
            try:
                out = _dispatch_provider(
                    system,
                    prompt,
                    candidate,
                    temperature,
                    min(timeout, _CHAIN_CANDIDATE_TIMEOUT),
                )
                if out is not None:
                    logger.warning("chain fallback used: %s", candidate)
                    _mark_success(candidate)
                    return out
            except Exception as exc:  # noqa: BLE001
                _mark_failure(candidate)
                logger.warning("chain model %s failed: %s", candidate, str(exc)[:120])
        return None


def _dispatch_provider(
    system: str, prompt: str, model: str, temperature: float, timeout: int
) -> str | None:
    """Route prefixed model IDs to their free provider.

    Returns the text, or None if the model has no special prefix and should be
    handled by the opencode path.
    """
    prefix, _, rest = model.partition("/")
    if prefix not in _PROVIDER_ENDPOINTS:
        # The keyless opencode CLI is a valid chain member too — but it only
        # understands its own model ids (opencode/...). Treat it like a provider
        # so the chain can reach it without a separate full walk afterwards.
        if prefix == "opencode":
            if not _opencode_available():
                return None
            try:
                out = _opencode_complete(system, prompt, model, temperature, timeout)
                _mark_success(model)
                return out
            except Exception:
                _mark_failure(model)
                raise
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
        try:
            return _openai_compatible(
                system, prompt, "google", resolved, temperature, timeout, api_key=keys[0]
            )
        except Exception:  # noqa: BLE001  (fall through the free chain)
            _mark_failure(model)
            return _dispatch_chain(system, prompt, temperature, timeout, skip=model)
    try:
        return _openai_compatible(system, prompt, prefix, rest, temperature, timeout)
    except Exception as exc:  # noqa: BLE001
        # Primary provider/model failed -> record it, then walk the free chain.
        # Recording matters: without it a dead primary was retried on every
        # single call forever, never benched (spec section 17).
        _mark_failure(model)
        logger.warning("provider %s failed (%s) — trying free chain", prefix, str(exc)[:120])
        return _dispatch_chain(system, prompt, temperature, timeout, skip=model)


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
    """Generate an image. Returns raw PNG/JPEG bytes.

    Order of providers:
      1. Google AI Studio (nano-banana-pro-preview) — needs key.
      2. Agnes AI (agnes-image-2.1-flash) — needs AGNES_KEY (verified live).
    Raises RuntimeError if every provider is unavailable.
    """
    import base64

    settings = get_settings()

    # 1) Google (free Nano Banana) when a key exists.
    if settings.google_ai_studio_key:
        try:
            return _generate_image_google(prompt, size=size, model=model, timeout=timeout)
        except Exception as exc:  # noqa: BLE001
            logger.warning("google image gen failed, falling back to agnes: %s", exc)

    # 2) Agnes AI — OpenAI-compatible image endpoint (returns a download URL).
    if settings.agnes_key:
        return _generate_image_agnes(prompt, size=size, model=model, timeout=timeout)

    raise RuntimeError(
        "no image provider configured — set GOOGLE_AI_STUDIO_KEY or AGNES_KEY"
    )


def _generate_image_google(
    prompt: str,
    *,
    size: str = "1024x1024",
    model: str | None = None,
    timeout: int = 120,
) -> bytes:
    """Generate an image with Google's free Nano Banana (Gemini) image model."""
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
        raise RuntimeError(f"google image API returned no data: {str(payload)[:300]}")
    return base64.b64decode(b64)


def _generate_image_agnes(
    prompt: str,
    *,
    size: str = "1024x1024",
    model: str | None = None,
    timeout: int = 180,
) -> bytes:
    """Generate an image via Agnes AI. Agnes returns a download URL, so we fetch
    the bytes ourselves. Returns raw image bytes.
    """
    import base64

    settings = get_settings()
    api_key = settings.agnes_key or ""
    if not api_key:
        raise RuntimeError("AGNES_KEY not set — needed for image generation")
    image_model = model or settings.agnes_image_model
    url = settings.agnes_base_url.rstrip("/") + "/images/generations"
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
        raise RuntimeError(f"agnes image generation failed ({exc.code}): {detail[:300]}") from exc

    img_url = payload.get("data", [{}])[0].get("url", "")
    if img_url:
        with urllib.request.urlopen(img_url, timeout=timeout) as resp:
            return resp.read()

    b64 = payload.get("data", [{}])[0].get("b64_json", "")
    if not b64:
        raise RuntimeError(f"agnes image API returned no data: {str(payload)[:300]}")
    return base64.b64decode(b64)


# ---------------------------------------------------------------------------
# Free video generation (Agnes Video V2.0 — asynchronous task API)
# ---------------------------------------------------------------------------

def generate_video(
    prompt: str,
    *,
    model: str | None = None,
    width: int = 1152,
    height: int = 768,
    num_frames: int = 121,
    frame_rate: int = 24,
    poll_interval: int = 5,
    timeout: int = 600,
) -> dict[str, Any]:
    """Generate a video via Agnes Video V2.0 (async task API).

    POST /v1/videos -> returns task_id/video_id (status "queued"), then we poll
    GET /agnesapi?video_id=... until status == "completed" or timeout.

    Returns dict with video_url, status, task_id, seconds, size. Raises
    RuntimeError if no AGNES_KEY, the task fails, or generation times out.
    """
    settings = get_settings()
    api_key = settings.agnes_key or ""
    if not api_key:
        raise RuntimeError("AGNES_KEY not set — needed for video generation")
    video_model = model or "agnes-video-v2.0"
    base = settings.agnes_base_url.rstrip("/")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    # 1) Create the task.
    create_url = base + "/videos"
    body = {
        "model": video_model,
        "prompt": prompt,
        "width": width,
        "height": height,
        "num_frames": num_frames,
        "frame_rate": frame_rate,
    }
    req = urllib.request.Request(
        create_url, data=json.dumps(body).encode(), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            created = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:  # type: ignore[attr-defined]
        detail = exc.read().decode(errors="replace")
        raise RuntimeError(f"agnes video task create failed ({exc.code}): {detail[:300]}") from exc
    task_id = created.get("task_id") or created.get("id")
    video_id = created.get("video_id")
    if not task_id and not video_id:
        raise RuntimeError(f"agnes video API returned no task id: {str(created)[:300]}")
    logger.info("agnes video task queued: task_id=%s status=%s", task_id, created.get("status"))

    # 2) Poll until completed.
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        time.sleep(poll_interval)
        status = _agnes_video_status(video_id, task_id, headers, base)
        if status is None:
            continue
        if status.get("status") == "completed":
            video_url = status.get("remixed_from_video_id") or status.get("url") or status.get("video_url")
            if not video_url:
                # Some responses nest it in metadata.url.
                video_url = (status.get("metadata") or {}).get("url", "")
            return {
                "video_url": video_url,
                "status": "completed",
                "task_id": task_id,
                "video_id": video_id,
                "seconds": status.get("seconds"),
                "size": status.get("size"),
            }
        if status.get("status") == "failed":
            raise RuntimeError(f"agnes video task failed: {status.get('error') or status}")

    raise RuntimeError(f"agnes video generation timed out after {timeout}s (task {task_id})")


def _agnes_video_status(
    video_id: str | None, task_id: str | None, headers: dict, base: str
) -> dict[str, Any] | None:
    """Fetch one video-task status update. Returns None if the fetch hiccups."""
    if video_id:
        url = base.replace("/v1", "") + f"/agnesapi?video_id={video_id}"
    else:
        url = base + f"/videos/{task_id}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001
        logger.warning("agnes video poll failed: %s", str(exc)[:120])
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _default_model() -> str:
    """The capability-ranked default model, else the static configured default.

    Shared by llm_complete and llm_stream so both resolve the same model.
    """
    settings = get_settings()
    if settings.use_model_router:
        try:
            from app.core.model_registry import get_registry as model_get_registry  # noqa: PLC0415

            picked = model_get_registry().pick_for_profile("reasoning").model
            if picked:
                return picked
        except Exception as exc:  # noqa: BLE001
            logger.warning("model router default unavailable (%s) — using static default", str(exc)[:120])
    return settings.opencode_model


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

    # Spec §29: with the Model Router enabled, a caller that does not pin a
    # model gets the capability-ranked pick (which flows through 9Router).
    # The static default (opencode CLI) stays as the dev-only fallback.
    chosen = model or _default_model()

    # Route prefixed agent models to free providers (google/groq/openrouter).
    dispatched = _dispatch_provider(system, prompt, chosen, temperature, timeout)
    if dispatched is not None:
        _mark_success(chosen)
        return dispatched

    if provider == "opencode":
        if not _opencode_available():
            # No CLI: don't die here — walk the free-model chain instead so
            # registry picks (auto/..., router/...) still resolve to a live
            # provider instead of raising "opencode CLI not found".
            chained = _dispatch_chain(system, prompt, temperature, timeout)
            if chained is not None:
                return chained
            raise RuntimeError(
                "opencode CLI not found on PATH. Set LLM_PROVIDER=ollama to "
                "use the free local fallback."
            )
        # The CLI only understands opencode model ids. A caller that pinned a
        # prefixed free-provider model (router/..., groq/...) whose whole chain
        # failed must not hand that id to the CLI — use the configured default.
        if chosen.split("/", 1)[0] in _PROVIDER_ENDPOINTS:
            chosen = settings.opencode_model
        try:
            text = _opencode_complete(system, prompt, chosen, temperature, timeout)
            _mark_success(chosen)
            return text
        except Exception as exc:  # noqa: BLE001
            _mark_failure(chosen)
            # Free-model chain: on error, fall through the next free models.
            chained = _dispatch_chain(system, prompt, temperature, timeout)
            if chained is not None:
                return chained
            raise exc

    if provider == "ollama":
        chosen = model or settings.ollama_model
        return _ollama_complete(system, prompt, chosen, temperature, timeout)

    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


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
# Streaming (spec section 18) — real incremental deltas, never a faked replay.
#
# Verified against the 9Router gateway on 2026-09-15: auto/best-coding and
# auto/best-free emit genuine SSE deltas (first token ~2.0s, then ~70 content
# chunks spread over ~2.6s), so progressive output is real, not simulated.
# ---------------------------------------------------------------------------


def _provider_base_and_key(provider: str) -> tuple[str, str]:
    """Resolve an OpenAI-compatible provider's base URL and configured key."""
    settings = get_settings()
    base, key_field = _PROVIDER_ENDPOINTS[provider]
    if provider == "agnes":
        base = settings.agnes_base_url
    elif provider == "router":
        base = settings.router_base_url
    elif provider == "openrouter":
        base = settings.openrouter_base_url
    elif provider == "requesty":
        base = settings.requesty_base_url
    elif provider == "omnirouter":
        base = settings.omnirouter_base_url
    return base, (getattr(settings, key_field, "") or "")


def _openai_stream(
    system: str,
    prompt: str,
    provider: str,
    model: str,
    temperature: float,
    timeout: int,
) -> Iterator[str]:
    """Yield content deltas from an OpenAI-compatible SSE endpoint."""
    import httpx  # local import keeps module import cost unchanged

    from app.ratelimit import can_call, record_request

    base, api_key = _provider_base_and_key(provider)
    if not api_key:
        raise RuntimeError(f"{provider} API key not set")
    if not can_call(provider, api_key):
        raise RuntimeError(f"{provider} daily rate limit reached for this key")

    url = base.rstrip("/") + "/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "TREEtiti-AI-OS/1.0",
        "Accept": "text/event-stream",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://treetiti.ai"
        headers["X-Title"] = "TREEtiti AI Marketing OS"
    body: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "stream": True,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    with httpx.stream("POST", url, json=body, headers=headers, timeout=timeout) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if not line or not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                frame = json.loads(data)
            except json.JSONDecodeError:
                continue
            # Usage-only frames carry an EMPTY choices list; indexing [0]
            # blindly raises IndexError (observed on the 9Router gateway).
            choices = frame.get("choices") or []
            if not choices:
                continue
            choice = choices[0]
            piece = (choice.get("delta") or {}).get("content")
            if not piece:
                piece = (choice.get("message") or {}).get("content")
            if piece:
                yield piece
    record_request(provider, api_key)


def llm_stream(
    system: str,
    prompt: str,
    *,
    model: str | None = None,
    temperature: float = 0.7,
    timeout: int = 180,
) -> Iterator[str]:
    """Yield a completion progressively, as the model produces it (spec 18).

    Real SSE streaming when the resolved provider supports it. Falls back to a
    single chunk from ``llm_complete`` for providers with no SSE endpoint (the
    opencode CLI, Ollama), and to the free-model chain when the stream dies
    before emitting anything — so a caller always receives the answer.

    Never fakes streaming by replaying a finished answer with artificial delays.
    """
    chosen = model or _default_model()
    provider, _, rest = chosen.partition("/")
    if provider in _PROVIDER_ENDPOINTS:
        emitted = False
        try:
            for piece in _openai_stream(system, prompt, provider, rest, temperature, timeout):
                emitted = True
                yield piece
            if not emitted:
                raise RuntimeError(f"{chosen} streamed no content")
            _mark_success(chosen)
            return
        except Exception as exc:  # noqa: BLE001
            _mark_failure(chosen)
            if emitted:
                # Deltas already reached the user; do not duplicate the answer.
                logger.warning("stream interrupted on %s: %s", chosen, str(exc)[:120])
                return
            logger.warning("stream failed on %s (%s) — trying free chain", chosen, str(exc)[:120])
            chained = _dispatch_chain(system, prompt, temperature, timeout, skip=chosen)
            if chained is not None:
                yield chained
                return
            raise
    # Providers without an SSE endpoint (opencode CLI, Ollama).
    yield llm_complete(system, prompt, model=chosen, temperature=temperature, timeout=timeout)
