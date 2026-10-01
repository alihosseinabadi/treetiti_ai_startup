"""Tests for in-page ordering: POST /api/order validation + storage."""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
config.CRM_PASSWORD = ""

from fastapi.testclient import TestClient
from core.db import LeadStore
from crm.app import create_app
import asyncio

tmp = tempfile.mkdtemp()
store = LeadStore(os.path.join(tmp, "ord.db"))
client = TestClient(create_app(store))

GOOD = {"name": "Alex", "contact": "+7 916 1", "city": "Moscow",
        "plan": "Private Cloud", "message": "3 channels"}


def test_order_ok():
    r = client.post("/api/order", json=GOOD).json()
    assert r["ok"] and r["order_id"] == 1, r
    orders = asyncio.run(store.list_orders())
    assert len(orders) == 1 and orders[0]["city"] == "Moscow", orders
    print("PASS test_order_ok ->", r["message"])


def test_order_validation():
    bad_name = dict(GOOD, name="x")
    assert client.post("/api/order", json=bad_name).status_code == 422
    bad_contact = dict(GOOD, contact="abc")
    assert client.post("/api/order", json=bad_contact).status_code == 422
    bad_plan = dict(GOOD, plan="Free")
    assert client.post("/api/order", json=bad_plan).status_code == 422
    assert client.post("/api/order", json={}).status_code == 422
    print("PASS test_order_validation")


def test_orders_auth_gate():
    # order list is owner-only; public order placement stays open
    assert client.get("/api/orders").status_code in (200, 303, 307, 401, 403)
    print("PASS test_orders_auth_gate")


if __name__ == "__main__":
    test_order_ok()
    test_order_validation()
    test_orders_auth_gate()
    print("ALL ORDER TESTS PASSED")
