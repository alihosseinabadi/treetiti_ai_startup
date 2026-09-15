"""Unit tests for Phase-3 production agents (spec §32)."""

from __future__ import annotations

from unittest.mock import patch

from app.agents import AGENTS, get_agent
from app.agents.td_creative_director import TD3DCreativeDirectorAgent
from app.agents.td_asset_producer import TDAssetProducerAgent
from app.agents.video_producer import VideoProducerAgent
from app.agents.ugc_producer import UGCProducerAgent


def test_phase3_agents_registered_in_runtime():
    for key in ("td_creative_director", "td_asset_producer", "video_producer", "ugc_producer"):
        assert key in AGENTS


def test_phase3_agent_keys_assigned():
    assert get_agent("td_creative_director").agent_key == "td_creative_director"
    assert get_agent("td_asset_producer").agent_key == "td_asset_producer"
    assert get_agent("video_producer").agent_key == "video_producer"
    assert get_agent("ugc_producer").agent_key == "ugc_producer"


def test_td_creative_director_run_with_mocked_llm():
    agent = TD3DCreativeDirectorAgent()
    expected = {
        "concept": "soft geometric hero",
        "geometry_style": "soft, faceted",
        "materials": ["glass", "brushed aluminum"],
        "lighting": "studio softbox",
        "color_palette": ["#000000", "#f5f5f7"],
        "asset_briefs": [{"asset": "pedestal", "detail": "faceted glass", "purpose": "hero scene"}],
    }
    with patch.object(agent, "complete_json", return_value=expected):
        result = agent.run(brief="premium 3D showcase")
    assert result["concept"] == "soft geometric hero"
    assert result["asset_briefs"][0]["asset"] == "pedestal"


def test_td_asset_producer_run_with_mocked_llm():
    agent = TDAssetProducerAgent()
    expected = {
        "asset": "pedestal",
        "approach": "blender",
        "generation_prompt": "faceted glass pedestal",
        "blender_spec": {"geometry": "cylinder + bevel", "materials": ["glass"], "lighting": "softbox", "export": "GLB"},
        "status": "ready",
    }
    with patch.object(agent, "complete_json", return_value=dict(expected)):
        result = agent.run(brief="hero asset")
    assert result["status"] == "ready"
    assert result["approach"] == "blender"


def test_td_asset_producer_defaults_status():
    agent = TDAssetProducerAgent()
    with patch.object(agent, "complete_json", return_value={"asset": "x", "approach": "tripo"}):
        result = agent.run()
    assert result["status"] == "ready"


def test_video_producer_degrades_to_spec_when_render_fails():
    agent = VideoProducerAgent()
    with patch.object(agent, "complete_json", return_value={"title": "x"}), \
         patch("app.agents.video_producer.generate_video", side_effect=RuntimeError("provider down")):
        result = agent.run(brief="film", scenes=[{"scene": "open", "visual_prompt": "slow pan"}])
    assert result["status"] == "spec_only"
    assert "provider down" in result["error"]
    assert "slow pan" in result["storyboard"]


def test_video_producer_no_scenes_still_works():
    agent = VideoProducerAgent()
    with patch("app.agents.video_producer.generate_video", side_effect=RuntimeError("down")):
        result = agent.run(brief="brand film")
    assert result["status"] == "spec_only"
    assert result["storyboard"] == "(no shot list — generate from brief)"


def test_ugc_producer_run_with_mocked_llm():
    agent = UGCProducerAgent()
    expected = {
        "ugc_angle": "a founder showing real results",
        "images": [{"scene": "desk, natural light", "prompt": "phone-shot desk"}],
        "videos": [{"scene": "talking to camera", "voiceover": "this changed everything", "prompt": "handheld"}],
        "voice_direction": "warm, conversational",
        "asset_status": "ready",
    }
    with patch.object(agent, "complete_json", return_value=expected):
        result = agent.run(brief="creator launch")
    assert result["asset_status"] == "ready"
    assert result["videos"][0]["voiceover"]
