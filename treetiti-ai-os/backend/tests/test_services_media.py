"""Unit tests for media services + voice (plan §L)."""

from __future__ import annotations

from unittest.mock import patch

from app.services.media import produce_image, produce_video, produce_3d
from app.services.media.image import MEDIA_DIR as IMG_DIR
from app.services.media.video import MEDIA_DIR as VID_DIR
from app.services.voice import synthesize_speech


def test_produce_image_saves_bytes():
    with patch("app.services.media.image.generate_image", return_value=b"\x89PNG\r\n"), \
         patch("app.services.media.image.MEDIA_DIR", IMG_DIR):
        result = produce_image("a hero shot")
    assert result["status"] == "generated"
    assert result["url"].startswith("/media/image_")
    assert result["bytes"] == 6


def test_produce_image_degrades_on_failure():
    with patch("app.services.media.image.generate_image", side_effect=RuntimeError("no provider")):
        result = produce_image("x")
    assert result["status"] == "failed"
    assert "no provider" in result["error"]


def test_produce_video_saves_bytes():
    video = {"video_url": "https://example.test/v.mp4", "task_id": "t1", "seconds": 4}
    with patch("app.services.media.video.generate_video", return_value=video), \
         patch("app.services.media.video._download", return_value=b"\x00video"), \
         patch("app.services.media.video.MEDIA_DIR", VID_DIR):
        result = produce_video("slow pan", filename="hero.mp4")
    assert result["status"] == "generated"
    assert result["url"] == "/media/hero.mp4"
    assert result["task_id"] == "t1"


def test_produce_video_degrades_on_failure():
    with patch("app.services.media.video.generate_video", side_effect=RuntimeError("down")):
        result = produce_video("x")
    assert result["status"] == "failed"
    assert "down" in result["error"]


def test_produce_3d_returns_spec():
    result = produce_3d("glass pedestal", provider="blender")
    assert result["status"] == "spec_ready"
    assert result["kind"] == "3d"
    assert result["render_ready"] is False


def test_voice_spec_when_no_key():
    with patch("app.services.voice.get_settings") as mk:
        s = mk.return_value
        s.agnes_key = ""
        s.agnes_base_url = "https://apihub.agnes-ai.com/v1"
        result = synthesize_speech("hello world")
    assert result["status"] == "spec_only"
    assert "no AGNES_KEY" in result["spec"]["note"]