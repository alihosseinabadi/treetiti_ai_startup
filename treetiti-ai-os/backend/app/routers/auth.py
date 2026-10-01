"""Auth routes: login, current user, first-run setup."""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import audit_log
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.rate_limit import client_ip, check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class SetupRequest(BaseModel):
    token: str = Field(..., min_length=32)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=12, max_length=256)


def _ip(request: Request) -> str:
    return client_ip(request, get_settings().trusted_proxies)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request,
          db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    check_rate_limit("auth-login", _ip(request), 30)
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        audit_log("auth.login", actor=payload.email, result="failure",
                  ip=_ip(request), reason="bad-credentials")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    audit_log("auth.login", actor=user.email, result="success", ip=_ip(request))
    return TokenResponse(
        access_token=create_access_token(user.email, user.role), role=user.role
    )


@router.post("/setup", status_code=201)
def first_run_setup(payload: SetupRequest, request: Request,
                    db: Annotated[Session, Depends(get_db)]) -> dict:
    """Create the first admin. Single-use by construction.

    Active ONLY while zero admins exist and ADMIN_SETUP_TOKEN is configured
    (>= 32 chars). Afterwards the route behaves as if it never existed
    (404). Token comparison is constant-time; the token is never logged.
    Rate-limited to 5 attempts/min per IP.
    """
    settings = get_settings()
    check_rate_limit("auth-setup", _ip(request), 5)
    configured = settings.admin_setup_token or ""
    if len(configured) < 32:
        audit_log("auth.setup", result="failure", ip=_ip(request),
                  reason="disabled")
        raise HTTPException(status_code=404, detail="Not found")
    if db.query(User).filter(User.role == "admin").first() is not None:
        audit_log("auth.setup", result="failure", ip=_ip(request),
                  reason="admin-exists")
        raise HTTPException(status_code=404, detail="Not found")
    if not hmac.compare_digest(payload.token, configured):
        audit_log("auth.setup", actor=payload.email, result="failure",
                  ip=_ip(request), reason="bad-token")
        raise HTTPException(status_code=403, detail="Invalid setup token")
    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(status_code=409, detail="User already exists")
    user = User(email=payload.email, password_hash=hash_password(payload.password),
                role="admin")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")
    db.refresh(user)
    audit_log("auth.setup", actor=user.email, result="success", ip=_ip(request))
    return {"email": user.email, "role": user.role}


@router.get("/me")
def me(user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))]) -> dict:
    return {"email": user.email, "role": user.role}
