"""Treetiti AI Marketing OS — Image Generation Agent.

Turns content ideas into a professional image-generation prompt, then actually
generates the image (free — Google AI Studio Nano Banana / Gemini image model)
and stores it under /media so it can be served to the dashboard.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.llm import generate_image
from app.models import ImagePrompt

logger = logging.getLogger("treetiti.agents.image")

MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"


class ImageGenerationAgent(BaseAgent):
    model = "zai/glm-4.5-flash"  # verified free, fast creative prompting
    name = "Image Generation Agent"
    role = "visual art director"
    system_prompt = """\
You write world-class AI image prompts for Treetiti marketing visuals.
Style: premium, dark, cinematic, minimal — Apple/Linear/Stripe aesthetic.
Prompts must be ready for FLUX/gemini-image models."""

    def run(self, idea: str, style: str = "cinematic") -> dict[str, Any]:
        result = self.complete_json(
            f"""Write an image-generation prompt for this marketing idea:

IDEA: {idea}
STYLE: {style}

Respond ONLY with JSON:
{{
  "subject": "the main subject described precisely",
  "style": "{style}",
  "prompt": "the full professional prompt including subject, camera, lighting, style, composition and quality parameters (e.g. 8k, photorealistic, cinematic lighting, shallow depth of field)",
  "negative_prompt": "what to avoid",
  "width": 1024,
  "height": 1024
}}
""",
            temperature=0.7,
        )
        with SessionLocal() as db:
            row = ImagePrompt(
                subject=result.get("subject", idea),
                style=result.get("style", style),
                prompt=result.get("prompt", ""),
                negative_prompt=result.get("negative_prompt", ""),
                width=int(result.get("width", 1024)),
                height=int(result.get("height", 1024)),
                status="ready",
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            result["id"] = row.id

        # Generate the actual image (free) and save it to /media.
        try:
            img_bytes = generate_image(result.get("prompt") or idea)
            MEDIA_DIR.mkdir(parents=True, exist_ok=True)
            filename = f"img_{row.id}.png"
            (MEDIA_DIR / filename).write_bytes(img_bytes)
            result["image_url"] = f"/media/{filename}"
            with SessionLocal() as db:
                db_row = db.get(ImagePrompt, row.id)
                db_row.status = "generated"
                db_row.image_url = result["image_url"]
                db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("image generation failed: %s", exc)
            result["image_url"] = None
            with SessionLocal() as db:
                db_row = db.get(ImagePrompt, row.id)
                db_row.status = "failed"
                db.commit()
        return result

    def for_content_item(self, content_item_id: str, body: str) -> dict[str, Any]:
        """Generate a visual prompt for an existing content item."""
        result = self.run(body[:500])
        with SessionLocal() as db:
            row = db.get(ImagePrompt, result["id"])
            row.content_item_id = content_item_id
            db.commit()
        return result
