"""Unit tests for Phase-2 research/strategy agents (spec §32)."""

from __future__ import annotations

from unittest.mock import patch

from app.agents import AGENTS, get_agent
from app.agents.content_hunter import ContentHunterAgent
from app.agents.social_intel import SocialIntelAgent
from app.agents.strategist import BusinessStrategistAgent
from app.agents.content_strategist import ContentStrategistAgent
from app.agents.creative_director import CreativeDirectorAgent


def test_new_agents_registered_in_runtime():
    for key in ("content_hunter", "social_intel", "strategist", "content_strategist", "creative_director"):
        assert key in AGENTS


def test_agent_keys_assigned():
    assert get_agent("content_hunter").agent_key == "content_hunter"
    assert get_agent("social_intel").agent_key == "social_intel"
    assert get_agent("strategist").agent_key == "strategist"
    assert get_agent("content_strategist").agent_key == "content_strategist"
    assert get_agent("creative_director").agent_key == "creative_director"


def test_content_hunter_scan_degrades_when_adapters_empty():
    """No live signal → empty scans, no exception."""
    agent = ContentHunterAgent()
    with patch("app.services.search.search_news", return_value=[]), \
         patch("app.services.search.search_reddit", return_value=[]), \
         patch("app.services.search.search_youtube", return_value=[]), \
         patch("app.services.search.get_trends", return_value=[]):
        signals = agent._scan(["AI marketing"])
    assert signals["news"] == []
    assert signals["trends"] == []


def test_content_hunter_run_with_mocked_llm():
    agent = ContentHunterAgent()
    expected = {
        "trend": "AI agents for SMBs",
        "angle": "show real ROI",
        "why_now": "budget season",
        "content_gap": "nobody proves ROI",
        "recommended_format": "blog",
    }
    with patch.object(agent, "complete_json", return_value=dict(expected)), \
         patch.object(agent, "_scan", return_value={"news": [], "reddit": [], "youtube": [], "trends": []}), \
         patch("app.agents.content_hunter.store_brand_memory"):
        result = agent.run(brief="test brief")
    assert result["trend"] == "AI agents for SMBs"
    assert result["recommended_format"] == "blog"
    assert "test brief" in result["queries"]


def test_social_intel_gather_degrades():
    agent = SocialIntelAgent()
    with patch("app.services.search.analyze_competitor", return_value={"error": "down"}), \
         patch("app.services.search.search_reddit", return_value=[]), \
         patch("app.services.search.search_youtube", return_value=[]):
        data = agent._gather(["https://example.com"])
    assert data["competitors"] == []
    assert data["social"]["reddit"] == []


def test_social_intel_run_with_mocked_llm():
    agent = SocialIntelAgent()
    expected = {
        "competitor_moves": ["X launched a UGC push"],
        "audience_voice": ["people want proof"],
        "gaps": ["no one shows outcomes"],
        "positioning_recommendation": "lead with results",
        "intel_summary": "focus on proof",
    }
    with patch.object(agent, "complete_json", return_value=dict(expected)), \
         patch.object(agent, "_gather", return_value={"competitors": [], "social": {"reddit": [], "youtube": []}}):
        result = agent.run(brief="watch AI agencies")
    assert result["intel_summary"] == "focus on proof"
    assert result["competitors_scanned"] == []


def test_strategist_run_with_mocked_llm():
    agent = BusinessStrategistAgent()
    expected = {
        "objective": "launch",
        "target_audience": "founders",
        "thesis": "proof wins",
        "positioning": "results not hype",
        "campaign_concept": {"title": "Proof Wins", "idea": "case studies", "channels": ["linkedin"]},
    }
    with patch.object(agent, "complete_json", return_value=expected):
        result = agent.run(brief="launch campaign")
    assert result["campaign_concept"]["title"] == "Proof Wins"
    assert result["positioning"] == "results not hype"


def test_strategist_works_without_brief():
    """No brief → defaults to a sensible awareness objective."""
    agent = BusinessStrategistAgent()
    with patch.object(agent, "complete_json", return_value={"objective": "x", "campaign_concept": {"title": "t"}}):
        result = agent.run()
    assert result["objective"] == "x"


def test_content_strategist_run_with_mocked_llm():
    agent = ContentStrategistAgent()
    expected = {
        "content_pillars": [{"name": "AI Proof", "why": "shows ROI"}],
        "editorial_calendar": [{"title": "Case study 1", "pillar": "AI Proof", "platform": "linkedin"}],
        "creative_briefs": {"copywriter": "write proof-led copy", "creative_director": "minimal data visuals"},
    }
    with patch.object(agent, "complete_json", return_value=expected), \
         patch("app.agents.content_strategist.store_brand_memory"):
        result = agent.run(brief="position TREEtiti")
    assert result["content_pillars"][0]["name"] == "AI Proof"
    assert result["creative_briefs"]["copywriter"]


def test_creative_director_run_with_mocked_llm():
    agent = CreativeDirectorAgent()
    expected = {
        "mood": "precise, cinematic, confident",
        "palette": {"primary": "#000000", "accent": "#ffffff", "background": "#f5f5f7"},
        "typography": {"display": "geometric sans", "body": "clean sans"},
        "cinematic_language": {"lighting": "soft directional", "depth": "layered", "motion": "slow precise"},
        "composition_rules": ["big negative space"],
        "image_directive": "minimal product shots",
        "video_directive": "slow cinematic pans",
    }
    with patch.object(agent, "complete_json", return_value=expected), \
         patch("app.agents.creative_director.store_brand_memory"):
        result = agent.run(brief="premium launch")
    assert result["mood"] == "precise, cinematic, confident"
    assert result["image_directive"] == "minimal product shots"