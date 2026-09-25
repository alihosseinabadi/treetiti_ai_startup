"""Auth routes: login and current user."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, verify_password
from app.config import get_settings
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    settings = get_settings()
    # Passwordless mode (dev/demo): accept the configured identifier with any password.
    if settings.auth_passwordless and payload.email == settings.auth_passwordless_login:
        user = db.query(User).filter(User.role == "admin").order_by(User.created_at).first()
        if user is None:
            raise HTTPException(status_code=401, detail="No admin user exists")
        return TokenResponse(
            access_token=create_access_token(user.email, user.role), role=user.role
        )
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(user.email, user.role), role=user.role
    )


@router.get("/me")
def me(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {"email": user.email, "role": user.role}
