"""Unit tests for the Growth Optimizer agent (Phase 4)."""

from __future__ import annotations

from unittest.mock import patch

from app.agents import AGENTS, get_agent
from app.agents.growth_optimizer import GrowthOptimizerAgent


def test_growth_optimizer_registered():
    assert "growth_optimizer" in AGENTS
    assert get_agent("growth_optimizer").agent_key == "growth_optimizer"


def test_growth_optimizer_run_with_mocked_llm():
    agent = GrowthOptimizerAgent()
    expected = {
        "learnings": [{"finding": "video beats static 2:1", "confidence": "high"}],
        "keep": ["cinematic video"],
        "stop": ["static banners"],
        "scale": ["video retargeting"],
        "experiments": [{"hypothesis": "shorter hooks lift CTR", "metric": "CTR", "variants": ["A", "B"]}],
        "next_cycle": "double video budget",
    }
    with patch.object(agent, "complete_json", return_value=expected):
        result = agent.run(brief="next cycle", analytics_report="CTR up 20% on video")
    assert result["learnings"][0]["confidence"] == "high"
    assert result["experiments"][0]["metric"] == "CTR"


def test_growth_optimizer_defaults_empty_lists():
    agent = GrowthOptimizerAgent()
    with patch.object(agent, "complete_json", return_value={}):
        result = agent.run()
    assert result["learnings"] == []
    assert result["experiments"] == []