"""Tests for the public product surface: /api/public-stats + /api/try.

    python tests/test_sandbox.py
No network. Uses regex provider + temp DB only.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
config.CRM_PASSWORD = ""

from fastapi.testclient import TestClient
from core.db import LeadStore
from core.models import Lead
from crm.app import create_app
import asyncio

tmp = tempfile.mkdtemp()
store = LeadStore(os.path.join(tmp, "sb.db"))
lead = Lead(source_chat_id=1, message_id=1, source="telegram",
            is_real_estate=True, deal_type="rent", score=85)
asyncio.run(store.save_lead(lead))
client = TestClient(create_app(store))

SAMPLE = ("Sdayotsya 2k kvartira, Tverskaya 1, Moscow. "
          "+7 916 111-22-33, 80000 RUB, 45 m2")


def test_public_stats():
    r = client.get("/api/public-stats").json()
    assert r["leads"] == 1 and r["hot"] == 1, r
    assert "maps" in r and "map_buildings" in r, r
    print("PASS test_public_stats")


def test_try_extract():
    r = client.post("/api/try", json={"text": SAMPLE}).json()
    assert r["sandbox"] is True and r["saved"] is False, r
    assert r["is_real_estate"] is True, r
    assert r["contact"] and "916" in r["contact"], r
    assert r["score"] > 0 and r["score_reasons"], r
    print("PASS test_try_extract -> score", r["score"], "|", r["contact"])


def test_try_validation():
    assert client.post("/api/try", json={"text": "hi"}).status_code == 422
    assert client.post("/api/try", json={"text": "x" * 5000}).status_code == 422
    assert client.post("/api/try", json={}).status_code == 422
    print("PASS test_try_validation")


def test_try_nothing_saved():
    n0 = client.get("/api/public-stats").json()["leads"]
    client.post("/api/try", json={"text": SAMPLE})
    assert client.get("/api/public-stats").json()["leads"] == n0
    print("PASS test_try_nothing_saved")


if __name__ == "__main__":
    test_public_stats()
    test_try_extract()
    test_try_validation()
    test_try_nothing_saved()
    print("ALL SANDBOX TESTS PASSED")
