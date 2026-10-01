"""Phase 0 security tests (amendments 1-4, 6).

Covers: fail-closed prod validation, org-aware JWT claims, default-deny
route allowlist, first-run /auth/setup, webhook HMAC + replay window,
rate limiting, leads honeypot/origin guards, and audit-log entries.

DB-touching tests use an isolated in-memory SQLite with ONLY the users
table (pgvector columns are never created here) plus dependency_overrides.
"""

from __future__ import annotations

import logging
import time

import jwt
import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main
from app import webhook_security
from app.auth import create_access_token, decode_token, require_role
from app.config import DEFAULT_ORG_ID, Settings, get_settings
from app.database import get_db
from app.default_deny import is_public_request
from app.models import Base, User
from app.rate_limit import (
    check_rate_limit,
    client_ip,
    reset_rate_limits,
)
from app.webhook_security import sign_webhook


@pytest.fixture(autouse=True)
def _clean_rate_limits():
    reset_rate_limits()
    yield
    reset_rate_limits()


# --------------------------------------------------------------------------
# validate_prod (amendment 3: fail closed)
# --------------------------------------------------------------------------

def _prod_settings(**over):
    base = dict(
        app_env="production",
        jwt_secret="x" * 64,
        admin_password="a-very-real-password-1",
        webhook_shared_secret="whsec-test-123",
        public_base_url="https://ai.treetiti.com",
    )
    base.update(over)
    return Settings(**base)


def test_prod_defaults_refuse_to_start():
    with pytest.raises(RuntimeError) as err:
        Settings(app_env="production", jwt_secret="x",
                 admin_password="", webhook_shared_secret="").validate_prod()
    assert "JWT" in str(err.value)


def test_prod_short_jwt_refused():
    with pytest.raises(RuntimeError):
        _prod_settings(jwt_secret="short").validate_prod()


def test_prod_missing_webhook_secret_refused():
    with pytest.raises(RuntimeError) as err:
        _prod_settings(webhook_shared_secret="").validate_prod()
    assert "WEBHOOK_SHARED_SECRET" in str(err.value)


def test_prod_placeholder_admin_password_refused():
    with pytest.raises(RuntimeError):
        _prod_settings(admin_password="change-me-in-prod").validate_prod()


def test_good_prod_passes():
    _prod_settings().validate_prod()  # must not raise


def test_dev_skips_validation():
    Settings(app_env="development").validate_prod()  # must not raise


# --------------------------------------------------------------------------
# org-aware JWT claims (amendment 1)
# --------------------------------------------------------------------------

def test_jwt_carries_org_claim():
    token = create_access_token("a@b.c", "admin")
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    assert payload["org_id"] == DEFAULT_ORG_ID
    assert payload["role"] == "admin"


def test_decode_token_ok():
    token = create_access_token("a@b.c", "viewer", org_id="org_x")
    assert decode_token(token)["org_id"] == "org_x"


def test_require_role_org_mismatch():
    from types import SimpleNamespace

    checker = require_role("admin")
    user = SimpleNamespace(role="admin", email="a@b.c",
                           org_id="org_a", db_org_id="org_b")
    with pytest.raises(HTTPException) as err:
        checker(user)
    assert err.value.status_code == 403


# --------------------------------------------------------------------------
# default-deny route test (amendment 1): every route is public-allowlisted
# or carries an auth dependency.
# --------------------------------------------------------------------------

def _route_has_auth(route: APIRoute) -> bool:
    seen: set[int] = set()

    def walk(dep) -> bool:
        if id(dep) in seen:
            return False
        seen.add(id(dep))
        call = getattr(dep, "call", None)
        name = ""
        if callable(call):
            name = getattr(call, "__qualname__", "") or str(call)
        text = name + repr(getattr(dep, "call", ""))
        if "get_current_user" in text or "require_role" in text:
            return True
        for sub in getattr(dep, "dependencies", []) or []:
            if walk(sub):
                return True
        return False

    for dep in list(getattr(route, "dependencies", []) or []):
        if walk(dep):
            return True
    dependant = getattr(route, "dependant", None)
    for dep in list(getattr(dependant, "dependencies", []) or []):
        if walk(dep):
            return True
    return False


def test_every_route_is_allowlisted_or_authenticated():
    offenders = []
    for route in main.app.routes:
        if not isinstance(route, APIRoute):
            continue
        methods = set(route.methods or ()) - {"HEAD", "OPTIONS"}
        for method in sorted(methods):
            if is_public_request(method, route.path):
                continue
            if not _route_has_auth(route):
                offenders.append(f"{method} {route.path}")
    assert not offenders, f"routes without auth: {offenders}"


def test_public_allowlist_spot_checks():
    assert is_public_request("GET", "/health")
    assert is_public_request("GET", "/os")
    assert is_public_request("GET", "/docs")
    assert is_public_request("POST", "/api/v1/auth/login")
    assert is_public_request("POST", "/api/v1/auth/setup")
    assert is_public_request("POST", "/api/v1/leads")
    assert is_public_request("POST", "/api/v1/webhooks/notify")
    assert not is_public_request("GET", "/api/v1/projects")
    assert not is_public_request("POST", "/api/v1/projects")
    assert not is_public_request("DELETE", "/api/v1/auth/me")


# --------------------------------------------------------------------------
# DB-backed fixtures (isolated sqlite, users table only)
# --------------------------------------------------------------------------

@pytest.fixture
def db_session():
    # StaticPool: one shared connection, otherwise each pooled connection
    # sees a fresh empty :memory: database ("no such table").
    engine = create_engine("sqlite://",
                           connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine, tables=[User.__table__])
    maker = sessionmaker(bind=engine)
    db = maker()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture
def client(monkeypatch, db_session):
    monkeypatch.setattr(main, "ensure_schema", lambda: None)
    monkeypatch.setattr(main, "ensure_admin_user", lambda: None)
    monkeypatch.setattr(main, "seed_business_knowledge", lambda: 0)
    monkeypatch.setattr(main, "seed_primary_project", lambda: None)
    monkeypatch.setattr(main, "start_autopilot", lambda: None)
    monkeypatch.setattr(main, "stop_autopilot", lambda: None)

    def _override():
        try:
            yield db_session
        finally:
            pass

    main.app.dependency_overrides[get_db] = _override
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()


@pytest.fixture
def setup_env(monkeypatch):
    """Configure a 40-char setup token for /auth/setup tests."""
    token = "t" * 40

    class _S:
        admin_setup_token = token
        trusted_proxies = ""
        is_prod = False

    import app.routers.auth as auth_router

    monkeypatch.setattr(auth_router, "get_settings", lambda: _S())
    return token


# --------------------------------------------------------------------------
# /auth/setup (amendment 2)
# --------------------------------------------------------------------------

def test_setup_disabled_without_token(client, monkeypatch):
    import app.routers.auth as auth_router

    class _S:
        admin_setup_token = ""
        trusted_proxies = ""
        is_prod = False

    monkeypatch.setattr(auth_router, "get_settings", lambda: _S())
    r = client.post("/api/v1/auth/setup", json={
        "token": "t" * 40, "email": "root@x.io", "password": "long-enough-pw"})
    assert r.status_code == 404


def test_setup_bad_token_rejected(client, setup_env):
    r = client.post("/api/v1/auth/setup", json={
        "token": "z" * 40, "email": "root@x.io", "password": "long-enough-pw"})
    assert r.status_code == 403


def test_setup_weak_password_rejected(client, setup_env):
    r = client.post("/api/v1/auth/setup", json={
        "token": setup_env, "email": "root@x.io", "password": "short"})
    assert r.status_code == 422


def test_setup_success_then_login_then_gone(client, setup_env, db_session):
    r = client.post("/api/v1/auth/setup", json={
        "token": setup_env, "email": "root@x.io",
        "password": "a-strong-password-1"})
    assert r.status_code == 201
    assert r.json()["role"] == "admin"
    # login works with the new credential
    r = client.post("/api/v1/auth/login", json={
        "email": "root@x.io", "password": "a-strong-password-1"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    # single-use: an admin now exists -> 404
    r = client.post("/api/v1/auth/setup", json={
        "token": setup_env, "email": "other@x.io",
        "password": "another-strong-pw"})
    assert r.status_code == 404


def test_setup_rate_limited(client, setup_env):
    for _ in range(5):
        client.post("/api/v1/auth/setup", json={
            "token": "z" * 40, "email": "r@x.io",
            "password": "long-enough-pw"})
    r = client.post("/api/v1/auth/setup", json={
        "token": "z" * 40, "email": "r@x.io",
        "password": "long-enough-pw"})
    assert r.status_code == 429


def test_setup_token_never_logged(client, setup_env, caplog):
    marker = "tok-" + "q" * 36
    with caplog.at_level(logging.INFO, logger="treetiti.audit"):
        client.post("/api/v1/auth/setup", json={
            "token": marker, "email": "r@x.io",
            "password": "long-enough-pw"})
    assert marker not in caplog.text


# --------------------------------------------------------------------------
# webhook HMAC (amendment 4)
# --------------------------------------------------------------------------

def _hmac_env(monkeypatch, secret="whsec-live-9", prod=False):
    class _S:
        webhook_shared_secret = secret
        trusted_proxies = ""
        is_prod = prod

    monkeypatch.setattr(webhook_security, "get_settings", lambda: _S())
    return secret


def test_hmac_roundtrip_via_notify(client, monkeypatch):
    import json as _json

    secret = _hmac_env(monkeypatch)
    import time as _time

    ts = int(_time.time())
    # notify needs SMTP configured -> go through HMAC then fail at email
    # config with 400, which PROVES the signature was accepted.
    body = _json.dumps({"subject": "hi"}).encode()
    sig = sign_webhook(secret, ts, body)
    r = client.post("/api/v1/webhooks/notify", content=body,
                    headers={"Content-Type": "application/json",
                             "X-Webhook-Timestamp": str(ts),
                             "X-Webhook-Signature": sig})
    assert r.status_code == 400  # email unconfigured, not 403


def test_hmac_bad_signature_rejected(client, monkeypatch):
    secret = _hmac_env(monkeypatch)
    import time as _time

    ts = int(_time.time())
    r = client.post("/api/v1/webhooks/notify", json={"subject": "hi"},
                    headers={"X-Webhook-Timestamp": str(ts),
                             "X-Webhook-Signature": "0" * 64})
    assert r.status_code == 403
    _ = secret


def test_hmac_stale_timestamp_rejected(client, monkeypatch):
    import time as _time

    secret = _hmac_env(monkeypatch)
    ts = int(_time.time()) - 3600
    body = b'{"subject": "hi"}'
    sig = sign_webhook(secret, ts, body)
    r = client.post("/api/v1/webhooks/notify", content=body,
                    headers={"Content-Type": "application/json",
                             "X-Webhook-Timestamp": str(ts),
                             "X-Webhook-Signature": sig})
    assert r.status_code == 403


def test_hmac_prod_fail_closed_without_secret(client, monkeypatch):
    _hmac_env(monkeypatch, secret="", prod=True)
    r = client.post("/api/v1/webhooks/notify", json={"subject": "hi"})
    assert r.status_code == 403


# --------------------------------------------------------------------------
# rate limiting (amendment 4)
# --------------------------------------------------------------------------

def test_fixed_window_blocks_overflow():
    for _ in range(3):
        check_rate_limit("t-scope", "1.2.3.4", 3)
    with pytest.raises(HTTPException) as err:
        check_rate_limit("t-scope", "1.2.3.4", 3)
    assert err.value.status_code == 429


def test_xff_spoof_ignored_from_untrusted():
    from starlette.requests import Request

    scope = {"type": "http", "headers": [(b"x-forwarded-for", b"1.2.3.4")],
             "client": ("9.9.9.9", 1234)}
    assert client_ip(Request(scope), "") == "9.9.9.9"


def test_xff_honored_from_trusted_proxy():
    from starlette.requests import Request

    scope = {"type": "http", "headers": [(b"x-forwarded-for", b"1.2.3.4, 5.6.7.8")],
             "client": ("9.9.9.9", 1234)}
    assert client_ip(Request(scope), "9.9.9.0/24") == "1.2.3.4"


# --------------------------------------------------------------------------
# leads public-form guards (amendment 4)
# --------------------------------------------------------------------------

def test_leads_honeypot_rejected(client):
    r = client.post("/api/v1/leads", json={
        "email": "bot@spam.io", "website": "http://spam.io"})
    assert r.status_code == 403


def test_leads_bad_origin_rejected(client):
    r = client.post("/api/v1/leads", json={"email": "a@b.io"},
                    headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


def test_leads_rate_limited(client):
    for _ in range(10):
        client.post("/api/v1/leads", json={
            "email": "bot@spam.io", "website": "x"})
    r = client.post("/api/v1/leads", json={
        "email": "bot@spam.io", "website": "x"})
    assert r.status_code == 429


# --------------------------------------------------------------------------
# audit log (amendment 6)
# --------------------------------------------------------------------------

def test_audit_on_failed_login(client, db_session, caplog):
    with caplog.at_level(logging.INFO, logger="treetiti.audit"):
        r = client.post("/api/v1/auth/login", json={
            "email": "nobody@x.io", "password": "whatever-password"})
    assert r.status_code == 401
    assert "action=auth.login" in caplog.text
    assert "result=failure" in caplog.text
    assert "whatever-password" not in caplog.text


def test_audit_on_hmac_rejection(client, monkeypatch, caplog):
    _hmac_env(monkeypatch)
    import time as _time

    with caplog.at_level(logging.INFO, logger="treetiti.audit"):
        client.post("/api/v1/webhooks/notify", json={"subject": "hi"},
                    headers={"X-Webhook-Timestamp": str(int(_time.time())),
                             "X-Webhook-Signature": "0" * 64})
    assert "action=webhook.auth" in caplog.text
