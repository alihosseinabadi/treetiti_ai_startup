"""Unit tests for the LLM provider (opencode/ollama parsing)."""

from __future__ import annotations

import pytest

from app.llm import _extract_text_from_events, llm_json


def test_extract_text_from_events_multiple_lines():
    raw = "\n".join(
        [
            '{"type":"text","sessionID":"s1","part":{"type":"text","text":"Hello"}}',
            '{"type":"reasoning","part":{"type":"text","text":"think..."}}',
            '{"type":"text","sessionID":"s1","part":{"type":"text","text":" world"}}',
            "not json at all",
            "",
        ]
    )
    assert _extract_text_from_events(raw) == "Hello\n world"


def test_extract_text_empty():
    assert _extract_text_from_events("") == ""
    assert _extract_text_from_events("junk\n") == ""


def test_llm_json_strips_code_fence(monkeypatch):
    monkeypatch.setattr(
        "app.llm.llm_complete",
        lambda *a, **k: '```json\n{"trend": "AI agents"}\n```',
    )
    assert llm_json("sys", "prompt") == {"trend": "AI agents"}


def test_llm_json_plain(monkeypatch):
    monkeypatch.setattr(
        "app.llm.llm_complete", lambda *a, **k: '{"score": 88}'
    )
    assert llm_json("sys", "prompt") == {"score": 88}


def test_llm_json_invalid_raises(monkeypatch):
    monkeypatch.setattr("app.llm.llm_complete", lambda *a, **k: "not json")
    with pytest.raises(Exception):
        llm_json("sys", "prompt")


def test_failover_skips_unhealthy_model(monkeypatch):
    from app import llm

    llm._reset_health()
    llm._mark_failure("opencode/deepseek-v4-flash-free")
    llm._mark_failure("opencode/deepseek-v4-flash-free")

    called = []
    monkeypatch.setattr(llm, "_run_one", lambda sys_, prompt, model, timeout: (model, f"ans {model}") and called.append(model) or (model, f"ans {model}"))

    result = llm.llm_battle(
        "sys", "prompt",
        model_a="opencode/deepseek-v4-flash-free",
        model_b="zai/glm-4.7-flash",
        judge_model="opencode/deepseek-v4-flash-free",
    )

    assert called == ["zai/glm-4.7-flash"]  # only the healthy model runs
    assert result["failover"] is True
    assert result["skipped_model"] == "opencode/deepseek-v4-flash-free"
    assert result["winner_model"] == "zai/glm-4.7-flash"
    assert len(result["answers"]) == 1


def test_battle_runs_both_when_healthy(monkeypatch):
    from app import llm

    llm._reset_health()
    called = []
    monkeypatch.setattr(
        llm, "_run_one",
        lambda sys_, prompt, model, timeout: called.append(model) or (model, f"ans {model}"),
    )
    monkeypatch.setattr(llm, "llm_complete", lambda *a, **k: "WINNER=A\nREASON=ok")

    result = llm.llm_battle(
        "sys", "prompt",
        model_a="opencode/deepseek-v4-flash-free",
        model_b="zai/glm-4.7-flash",
        judge_model="opencode/deepseek-v4-flash-free",
    )

    assert set(called) == {"opencode/deepseek-v4-flash-free", "zai/glm-4.7-flash"}
    assert result.get("failover") in (None, False)
    assert len(result["answers"]) == 2


def test_model_health_reports_threshold(monkeypatch):
    from app import llm

    llm._reset_health()
    llm._mark_failure("opencode/deepseek-v4-flash-free")
    health = llm.model_health()
    assert health["opencode/deepseek-v4-flash-free"]["consecutive_failures"] == 1
    assert health["opencode/deepseek-v4-flash-free"]["unhealthy"] is False
    llm._mark_failure("opencode/deepseek-v4-flash-free")
    health = llm.model_health()
    assert health["opencode/deepseek-v4-flash-free"]["unhealthy"] is True
