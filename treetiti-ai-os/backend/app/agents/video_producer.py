"""TREEtiti AI Marketing OS — Video Producer (Phase 3).

Renders/assembles video via the media provider abstraction. Takes a Video
Director's concept, flattens the storyboard into a generation prompt, and
returns a download URL or a concrete render spec when no provider is live.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.agents.base import BaseAgent
from app.llm import generate_video

from app.agents.prompts.video_producer import SYSTEM_PROMPT

logger = logging.getLogger("treetiti.agents.video_producer")
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"


def _download(url: str, timeout: int = 180) -> bytes:
    import urllib.request

    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read()


class VideoProducerAgent(BaseAgent):
    model = "opencode/deepseek-v4-flash-free"
    name = "Video Producer"
    role = "video render and assembly lead"
    agent_key = "video_producer"
    system_prompt = SYSTEM_PROMPT

    def run(
        self,
        brief: str = "",
        concept: str = "",
        scenes: list[dict[str, Any]] | None = None,
        extra_context: str = "",
    ) -> dict[str, Any]:
        """Render a video from a concept + shot list, or produce a spec."""
        scenes = scenes or []
        storyboard = "\n".join(
            f"Shot {i+1}: {s.get('visual_prompt') or s.get('scene', '')}"
            for i, s in enumerate(scenes[:6])
        )
        result: dict[str, Any] = {
            "source": "video_producer",
            "concept": concept or brief or "cinematic TREEtiti brand film",
            "storyboard": storyboard or "(no shot list — generate from brief)",
        }
        prompt = f"{result['concept']}. {storyboard}"[:1500]
        try:
            video = generate_video(prompt, timeout=600)
            url = video.get("video_url", "")
            if url:
                MEDIA_DIR.mkdir(parents=True, exist_ok=True)
                filename = "video_produced.mp4"
                (MEDIA_DIR / filename).write_bytes(_download(url))
                result["video_url"] = f"/media/{filename}"
                result["status"] = "rendered"
            else:
                result["video_url"] = url
                result["task_id"] = video.get("task_id")
                result["seconds"] = video.get("seconds")
                result["status"] = "rendered"
        except Exception as exc:  # noqa: BLE001
            logger.warning("video render failed: %s", exc)
            result["status"] = "spec_only"
            result["error"] = str(exc)[:200]
        return result


__all__ = ["VideoProducerAgent"]