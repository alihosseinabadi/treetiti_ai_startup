"""Unit tests for the autopilot scheduler (due-check + run tracking)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.scheduler import DEFAULT_JOBS, _job_due
from app.models import ScheduledJob


def _make_job(
    job_type: str = "daily",
    schedule_time: str = "09:00",
    interval_minutes: int = 60,
    enabled: bool = True,
    last_run_at=None,
) -> ScheduledJob:
    return ScheduledJob(
        agent="content",
        job_type=job_type,
        schedule_time=schedule_time,
        interval_minutes=interval_minutes,
        enabled=enabled,
        last_run_at=last_run_at,
        payload={},
    )


def test_default_jobs_are_reasonable():
    assert len(DEFAULT_JOBS) >= 4
    agents = {j["agent"] for j in DEFAULT_JOBS}
    # pipeline supersedes standalone market_research (research->analytics->brand->content)
    assert {"pipeline", "content", "sales", "analytics"} <= agents
    for job in DEFAULT_JOBS:
        assert job["enabled"] in (True, False)


def test_daily_job_due_when_never_run():
    now = datetime(2026, 8, 2, 10, 0, tzinfo=timezone.utc)
    job = _make_job(job_type="daily", schedule_time="09:00")
    assert _job_due(job, now) is True


def test_daily_job_not_due_before_time():
    now = datetime(2026, 8, 2, 8, 0, tzinfo=timezone.utc)
    job = _make_job(job_type="daily", schedule_time="09:00")
    assert _job_due(job, now) is False


def test_daily_job_not_due_twice_same_day():
    last = datetime(2026, 8, 2, 9, 30, tzinfo=timezone.utc)
    now = datetime(2026, 8, 2, 14, 0, tzinfo=timezone.utc)
    job = _make_job(job_type="daily", schedule_time="09:00", last_run_at=last)
    assert _job_due(job, now) is False


def test_daily_job_due_next_day():
    last = datetime(2026, 8, 2, 9, 30, tzinfo=timezone.utc)
    now = datetime(2026, 8, 3, 9, 30, tzinfo=timezone.utc)
    job = _make_job(job_type="daily", schedule_time="09:00", last_run_at=last)
    assert _job_due(job, now) is True


def test_interval_job_due_after_interval():
    last = datetime(2026, 8, 2, 8, 0, tzinfo=timezone.utc)
    now = last + timedelta(minutes=60, seconds=1)
    job = _make_job(job_type="interval", interval_minutes=60, last_run_at=last)
    assert _job_due(job, now) is True


def test_interval_job_not_due_early():
    last = datetime(2026, 8, 2, 8, 0, tzinfo=timezone.utc)
    now = last + timedelta(minutes=59)
    job = _make_job(job_type="interval", interval_minutes=60, last_run_at=last)
    assert _job_due(job, now) is False


def test_disabled_job_never_due():
    now = datetime(2026, 8, 2, 10, 0, tzinfo=timezone.utc)
    job = _make_job(job_type="daily", schedule_time="09:00", enabled=False)
    assert _job_due(job, now) is False
