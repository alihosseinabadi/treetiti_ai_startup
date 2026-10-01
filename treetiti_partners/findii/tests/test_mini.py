"""Tests for Telegram Mini App auth + routes + landing page.

    python tests/test_mini.py
Needs fastapi + httpx (TestClient). No network, no bot token needed
except a dummy one for signing test vectors.
"""
import hashlib
import hmac
import json
import os
import sys
import tempfile
import time
from urllib.parse import urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crm.mini_auth import validate_init_data

TOKEN = "123456:TESTTOKEN"


def sign(payload: dict) -> str:
    check = "\n".join(f"{k}={v}" for k, v in sorted(payload.items()))
    secret = hmac.new(b"WebAppData", TOKEN.encode(), hashlib.sha256).digest()
    return hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()


def make_init(user_id=7, age=100):
    payload = {
        "auth_date": str(int(time.time()) - age),
        "query_id": "abc",
        "user": json.dumps({"id": user_id, "first_name": "Ali"}, separators=(",", ":")),
    }
    return urlencode({**payload, "hash": sign(payload)})


def test_valid_init_data():
    out = validate_init_data(make_init(), TOKEN)
    assert out["user"]["id"] == 7, out


def test_tampered_rejected():
    init = make_init()
    bad = init.replace("first_name", "first_namX").replace("Ali", "Bob")
    try:
        validate_init_data(bad, TOKEN)
    except ValueError:
        print("PASS test_tampered_rejected")
        return
    raise AssertionError("tampered payload accepted!")


def test_expired_rejected():
    try:
        validate_init_data(make_init(age=100000), TOKEN)
    except ValueError as e:
        assert "expired" in str(e), e
        print("PASS test_expired_rejected")
        return
    raise AssertionError("expired payload accepted!")


def test_wrong_token_rejected():
    try:
        validate_init_data(make_init(), "other:token")
    except ValueError:
        print("PASS test_wrong_token_rejected")
        return
    raise AssertionError("wrong-token payload accepted!")


def test_routes():
    from fastapi.testclient import TestClient
    from core.db import LeadStore
    from core.models import Lead
    from crm.app import create_app
    import config
    config.TELEGRAM_TOKEN = TOKEN
    config.CRM_PASSWORD = ""  # board auth off; mini uses initData

    tmp = tempfile.mkdtemp()
    store = LeadStore(os.path.join(tmp, "mini.db"))
    import asyncio
    lead = Lead(source_chat_id=1, message_id=1, source="telegram",
                is_real_estate=True, deal_type="rent", property_type="apartment",
                city="Moscow", price=80000, contact="+7 916 1",
                raw_text="rent Tverskaya 1", score=75)
    asyncio.run(store.save_lead(lead))

    client = TestClient(create_app(store))
    assert client.get("/landing").status_code == 200
    assert "FindII" in client.get("/landing").text
    assert client.get("/mini").status_code == 200
    assert "telegram-web-app.js" in client.get("/mini").text

    # no initData → 401
    assert client.get("/mini/api/init").status_code == 401
    headers = {"X-Telegram-InitData": make_init()}
    init = client.get("/mini/api/init", headers=headers).json()
    assert init["ok"] and init["stats"]["total"] == 1, init
    leads = client.get("/mini/api/leads", headers=headers).json()
    assert len(leads) == 1 and leads[0]["city"] == "Moscow", leads
    r = client.post("/mini/api/mark", headers=headers,
                    json={"id": leads[0]["id"], "status": "contacted"})
    assert r.json() == {"ok": True}, r.text
    r = client.post("/mini/api/mark", headers=headers,
                    json={"id": 999999, "status": "won"})
    assert r.status_code == 404
    r = client.post("/mini/api/mark", headers=headers,
                    json={"id": 1, "status": "nope"})
    assert r.status_code == 422
    print("PASS test_routes")


if __name__ == "__main__":
    test_valid_init_data()
    print("PASS test_valid_init_data")
    test_tampered_rejected()
    test_expired_rejected()
    test_wrong_token_rejected()
    test_routes()
    print("ALL MINI TESTS PASSED")
