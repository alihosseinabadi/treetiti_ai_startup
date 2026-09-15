"""Executable template engine (Phase 3) acceptance tests.

Uses a fake in-memory database (same FakeDb pattern as test_os_commands.py)
so no real DB/network is required.
"""

from __future__ import annotations

import pytest

from app.models import Mission, Project, ScheduledJob
from app.templates import CATALOG, get_template, install_template, list_catalog, uninstall_template


class FakeRow:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self):
        self.rows: dict[type, list] = {}

    def query(self, model):
        return FakeQuery(self.rows.get(model, []))

    def get(self, model, key):
        for r in self.rows.get(model, []):
            if getattr(r, "id", None) == key:
                return r
        return None

    def add(self, obj):
        if not getattr(obj, "id", None):
            obj.id = f"id-{len(self.rows.get(type(obj), [])) + 1}"
        self.rows.setdefault(type(obj), []).append(obj)

    def commit(self):
        pass


def test_catalog_lists_all_templates():
    db = FakeDb()
    out = list_catalog(db, "")
    assert len(out) == len(CATALOG)
    ids = {t["id"] for t in out}
    assert {"ig-leads", "weekly-report", "campaign-launch"} <= ids
    assert all("installed" in t for t in out)


def test_catalog_reports_installed_count_per_client():
    db = FakeDb()
    db.rows[Mission] = [
        FakeRow(id="m-1", client="Acme", source_template="ig-leads", status="active"),
        FakeRow(id="m-2", client="Acme", source_template="ig-leads", status="archived"),
        FakeRow(id="m-3", client="Other", source_template="ig-leads", status="active"),
    ]
    out = {t["id"]: t["installed"] for t in list_catalog(db, "Acme")}
    assert out["ig-leads"] == 1  # archived excluded


def test_install_creates_mission_schedules_and_project():
    db = FakeDb()
    res = install_template("ig-leads", "Acme", db)
    assert res["mission"]["name"] == "Instagram Lead Generation Engine"
    assert res["mission"]["client"] == "Acme"
    assert res["mission"]["status"] == "active"
    assert res["mission"]["source_template"] == "ig-leads"
    assert "Client: Acme" in res["mission"]["goal"]
    missions = db.rows[Mission]
    assert len(missions) == 1
    assert missions[0].config.get("platforms") == ["instagram"]
    assert len(res["schedules"]) == 3
    assert len(db.rows[ScheduledJob]) == 3
    assert res["project"] is not None
    assert len(db.rows[Project]) == 1
    for job in db.rows[ScheduledJob]:
        assert job.client == "Acme"
        assert job.payload.get("template_id") == "ig-leads"
        assert job.payload.get("mission_id") == missions[0].id


def test_install_without_project():
    db = FakeDb()
    res = install_template("weekly-report", "", db)
    assert res["project"] is None
    assert res["mission"]["client"] == ""
    assert "Client:" not in res["mission"]["goal"]


def test_install_unknown_template_raises():
    db = FakeDb()
    with pytest.raises(KeyError):
        install_template("nope", "", db)


def test_install_skips_schedules_with_unknown_agent():
    db = FakeDb()
    tpl = dict(get_template("ig-leads"))
    tpl["schedules"] = [dict(tpl["schedules"][0])] + [{"name": "bad", "agent": "zzz_none", "job_type": "daily", "schedule_time": "09:00", "payload": {}}]
    db.rows[Mission] = []
    # Patch the module catalog lookup used by install_template.
    import app.templates as mod

    original = mod._BY_ID
    mod._BY_ID = {**original, "ig-leads": tpl}
    try:
        res = install_template("ig-leads", "", db)
        assert len(res["schedules"]) == 1  # bad schedule skipped
        assert len(db.rows[ScheduledJob]) == 1
    finally:
        mod._BY_ID = original


def test_uninstall_archives_missions_and_schedules():
    db = FakeDb()
    install_template("ig-leads", "Acme", db)
    res = uninstall_template("ig-leads", "Acme", db)
    assert res["missions_archived"] == 1
    assert res["schedules_archived"] == 3
    assert db.rows[Mission][0].status == "archived"
    for job in db.rows[ScheduledJob]:
        assert job.archived is True
        assert job.enabled is False


def test_uninstall_is_client_scoped():
    db = FakeDb()
    install_template("ig-leads", "Acme", db)
    res = uninstall_template("ig-leads", "Other", db)
    assert res["missions_archived"] == 0
    assert res["schedules_archived"] == 0
    assert db.rows[Mission][0].status == "active"


def test_uninstall_unknown_template_raises():
    db = FakeDb()
    with pytest.raises(KeyError):
        uninstall_template("nope", "", db)