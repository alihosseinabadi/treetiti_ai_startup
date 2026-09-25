"""Treetiti AI Marketing OS — Video Director Agent.

Creates cinematic, Apple-style AI video concepts with shot-by-shot scenes,
camera directions, visual prompts and voiceover.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.models import VideoConcept


class VideoDirectorAgent(BaseAgent):
    model = "zai/glm-4.5-flash"  # verified free, fast structured output
    name = "Video Director Agent"
    role = "cinematic video director"
    system_prompt = """\
You direct high-end cinematic AI video for Treetiti.
Style: Apple-style technology advertising. Dark premium visuals, dramatic
lighting, slow confident camera moves, minimal text, powerful voiceover.
Every concept is a complete shot list ready for an AI video generator."""

    def run(self, topic: str = "") -> dict[str, Any]:
        result = self.complete_json(
            f"""Create a cinematic AI video concept for Treetiti.
TOPIC: {topic or "Treetiti — AI agents for business automation"}

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
        with SessionLocal() as db:
            db.add(
                VideoConcept(
                    title=result.get("title", "Untitled concept"),
                    concept=result.get("concept", ""),
                    duration=result.get("duration", "00:30"),
                    scenes=result.get("scenes", []),
                )
            )
            db.commit()
        return result
