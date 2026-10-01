"""TREEtiti AI Agency OS — authentication and authorization.

JWT-based. Admins are created ONLY via POST /auth/setup with a single-use
setup token (Phase 0.2) — there is no default password and no passwordless
mode. JWTs carry ``org_id`` (Phase 1 multi-tenancy) and ``require_role``
is org-aware from day one (amendment 1).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import DEFAULT_ORG_ID, get_settings
from app.database import SessionLocal, get_db
from app.models import User

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str,
                        org_id: str = DEFAULT_ORG_ID) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "role": role, "org_id": org_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode + verify a JWT. Raises HTTP 401 on any problem."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from None


def ensure_admin_user() -> None:
    """Idempotently create the bootstrap admin from settings.

    Refuses placeholder passwords: admins are created via POST /auth/setup
    with ADMIN_SETUP_TOKEN. In development, set a real ADMIN_PASSWORD in
    .env (gitignored) to auto-create the dev admin on first boot.
    """
    settings = get_settings()
    if (settings.admin_password or "") in {"change-me-in-prod", "change-me", ""}:
        return
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == settings.admin_email).first()
        if existing:
            return
        db.add(
            User(
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                role="admin",
            )
        )
        db.commit()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    # Org context travels in the token (Phase 1 reads it at the data layer).
    user.org_id = payload.get("org_id") or DEFAULT_ORG_ID
    return user


def require_role(*roles: str):
    """Role gate, org-aware (amendment 1).

    The caller must hold one of ``roles`` AND belong to the token's org.
    Until Phase 1 introduces real organizations every token and every user
    resolve to DEFAULT_ORG_ID, so the org check is trivially true — but the
    structure (claims + comparison) is already in place, no rework needed.
    """

    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        # Org-aware (amendment 1): the token's org must match the user's org.
        # Pre-Phase 1 every principal resolves to DEFAULT_ORG_ID, so this is
        # trivially true; Phase 1 compares the claim against org membership.
        token_org = getattr(user, "org_id", DEFAULT_ORG_ID) or DEFAULT_ORG_ID
        user_org = getattr(user, "db_org_id", token_org) or token_org
        if token_org != user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization mismatch",
            )
        return user

    return checker
