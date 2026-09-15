"""TREEtiti AI Marketing OS — voice / text-to-speech service (plan §L).

Uses the OpenAI-compatible speech endpoint on the Agnes hub (or any provider
that mirrors /v1/audio/speech). Degrades to a spec when no TTS provider is
configured, so the UGC/voice pipeline never hard-fails.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from pathlib import Path
from typing import Any

from app.config import get_settings

logger = logging.getLogger("treetiti.services.voice")
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"

VOICE_MODEL = "agnes-tts-v1"


def synthesize_speech(
    text: str,
    *,
    voice: str = "alloy",
    filename: str = "voiceover.mp3",
    timeout: int = 120,
) -> dict[str, Any]:
    """Convert text to speech. Returns bytes saved under /media.

    ``status`` is one of "generated" | "failed" | "spec_only". When no key is
    configured we return a spec the caller can queue.
    """
    settings = get_settings()
    result: dict[str, Any] = {"kind": "audio", "text": text[:500], "voice": voice, "status": "generated"}
    api_key = settings.agnes_key or ""
    if not api_key:
        result["status"] = "spec_only"
        result["spec"] = {
            "model": VOICE_MODEL,
            "voice": voice,
            "text": text[:500],
            "note": "no AGNES_KEY — queue for later synthesis",
        }
        return result

    url = settings.agnes_base_url.rstrip("/") + "/audio/speech"
    body = {"model": VOICE_MODEL, "input": text, "voice": voice}
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            audio = resp.read()
    except Exception as exc:  # noqa: BLE001
        logger.warning("voice synthesis failed: %s", exc)
        result["status"] = "failed"
        result["error"] = str(exc)[:200]
        return result

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / filename).write_bytes(audio)
    result["url"] = f"/media/{filename}"
    result["bytes"] = len(audio)
    result["filename"] = filename
    return result