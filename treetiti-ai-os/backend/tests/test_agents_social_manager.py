"""Unit tests for the Social Media Manager agent (Phase 4)."""

from __future__ import annotations

from unittest.mock import patch

from app.agents import AGENTS, get_agent
from app.agents.social_manager import SocialManagerAgent


def test_social_manager_registered():
    assert "social_manager" in AGENTS
    assert get_agent("social_manager").agent_key == "social_manager"


def test_social_manager_publishes_and_reports_honestly():
    agent = SocialManagerAgent()
    reports = [
        {"channel": "telegram", "ok": True, "detail": "posted"},
        {"channel": "vk", "ok": False, "detail": "VK_ACCESS_TOKEN unset"},
    ]
    with patch("app.agents.social_manager.publish_all", return_value=reports):
        result = agent.run(brief="launch post", channels=["telegram", "vk"])
    assert result["status"] == "published"
    assert result["published"][0]["channel"] == "telegram"
    assert result["drafts"][0]["reason"] == "VK_ACCESS_TOKEN unset"


def test_social_manager_all_fail_becomes_draft():
    agent = SocialManagerAgent()
    reports = [{"channel": "instagram", "ok": False, "detail": "not configured"}]
    with patch("app.agents.social_manager.publish_all", return_value=reports):
        result = agent.run(brief="post", channels=["instagram"])
    assert result["status"] == "drafted"
    assert result["published"] == []


def test_social_manager_without_channels_drafts():
    agent = SocialManagerAgent()
    with patch("app.agents.social_manager.publish_all", return_value=[]):
        result = agent.run(brief="post")
    assert result["status"] == "drafted"
    assert result["drafts"][0]["reason"] == "no channels requested"