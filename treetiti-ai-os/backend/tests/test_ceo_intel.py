"""CEO intel layer — real-state retrieval for the conversational brain."""

import datetime as _dt

from unittest.mock import MagicMock

from app import ceo_intel as intel


def _task(status="completed", label="ceo: build marketing plan", finished=None, payload=None, result=None):
    if finished is None:
        finished = _dt.date.today().isoformat() + "T09:00:00"
    t = MagicMock()
    t.status = status
    t.label = label
    t.finished_at = _dt.datetime.fromisoformat(finished)
    t.created_at = __import__("datetime").datetime.fromisoformat(finished)
    t.payload = payload or {}
    t.result = result or {}
    t.error = ""
    return t


def test_today_summary_groups_completed_work():
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
        _task(label="ceo: research competitors"),
        _task(label="analytics: q2 report"),
    ]
    out = intel.get_today_summary(db, "tree")
    assert "completed tasks (2)" in out
    assert "research competitors" in out


def test_recent_activity_degrades_to_no_data():
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    out = intel.get_recent_activity(db, "tree")
    assert "No recent activity" in out


def test_blocked_work_reports_failures():
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
        _task(status="failed", label="publish: instagram post", finished="2026-08-15T08:00:00")
    ]
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.side_effect = None
    out = intel.get_blocked_work(db, "tree")
    assert "failed" in out


def test_intel_never_raises_on_broken_db():
    class Boom:
        def query(self, *a, **k):
            raise RuntimeError("db down")

    assert intel.get_today_summary(Boom(), "tree") == ""
    assert intel.get_active_work(Boom(), "tree") == ""
    assert intel.get_pending_approvals(Boom(), "tree") == ""
    assert intel.get_mission_status(Boom(), "tree") == ""