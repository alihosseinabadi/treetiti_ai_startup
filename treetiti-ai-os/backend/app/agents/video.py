"""TREEtiti AI Marketing OS — Video Director Agent.

Creates cinematic, Apple-style AI video concepts with shot-by-shot scenes,
camera directions, visual prompts and voiceover.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.llm import generate_video
from app.models import VideoConcept

from app.agents.prompts.video import SYSTEM_PROMPT

logger = logging.getLogger("treetiti.video")
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"


class VideoDirectorAgent(BaseAgent):
    model = "zai/glm-4.5-flash"  # verified free, fast structured output
    name = "Video Director Agent"
    role = "cinematic video director"
    system_prompt = SYSTEM_PROMPT

    def run(self, topic: str = "") -> dict[str, Any]:
        result = self.complete_json(
            f"""Create a cinematic AI video concept for TREEtiti.
TOPIC: {topic or "TREEtiti — AI agents for business automation"}

Respond ONLY with JSON:
{{
  "title": "video title",
  "concept": "the overall story in 2-3 sentences",
  "duration": "e.g. 00:30",
  "scenes": [
    {{
      "scene": "what happens in this shot",
      "camera": "camera direction (angle, movement, lens feel)",
      "visual_prompt": "detailed AI video generation prompt for this shot",
      "voiceover": "the voiceover line for this shot"
    }}
  ]
}}
Include 4-6 scenes. Respond ONLY with JSON.
""",
            temperature=0.8,
        )
        scenes = result.get("scenes", [])
        with SessionLocal() as db:
            db.add(
                VideoConcept(
                    title=result.get("title", "Untitled concept"),
                    concept=result.get("concept", ""),
                    duration=result.get("duration", "00:30"),
                    scenes=scenes,
                )
            )
            db.commit()

        # Generate the actual video (free via Agnes) and save it to /media.
        video_prompt = _video_prompt_from_scenes(result.get("concept", ""), scenes)
        try:
            video = generate_video(video_prompt, timeout=600)
            url = video.get("video_url", "")
            if url:
                MEDIA_DIR.mkdir(parents=True, exist_ok=True)
                filename = f"video_{result.get('title', 'concept').lower().replace(' ', '_')[:40]}.mp4"
                (MEDIA_DIR / filename).write_bytes(_download(url))
                result["video_url"] = f"/media/{filename}"
            else:
                result["video_url"] = url
            result["video_task"] = video.get("task_id")
            result["video_seconds"] = video.get("seconds")
        except Exception as exc:  # noqa: BLE001
            logger.warning("video generation failed: %s", exc)
            result["video_url"] = None
            result["video_error"] = str(exc)[:200]
        return result


def _video_prompt_from_scenes(concept: str, scenes: list[dict]) -> str:
    """Flatten the storyboard into one prompt Agnes Video can render."""
    parts = [concept] if concept else []
    for i, s in enumerate(scenes[:6], start=1):
        desc = s.get("visual_prompt") or s.get("scene") or ""
        cam = s.get("camera")
        parts.append(f"Shot {i}: {desc}" + (f", camera: {cam}" if cam else ""))
    return " ".join(parts)[:1500]


def _download(url: str, timeout: int = 180) -> bytes:
    """Fetch a video URL as bytes (std-lib only, mirrors llm.py image fetch)."""
    import urllib.request

    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read()
