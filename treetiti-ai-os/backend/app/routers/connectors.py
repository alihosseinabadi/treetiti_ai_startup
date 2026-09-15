"""TREEtiti AI Marketing OS — API Connectors routes (Phase 5).

    GET  /api/v1/connectors                    catalog (auto-seeded, DB-backed)
    POST /api/v1/connectors/{id}/configure      save keys
    POST /api/v1/connectors/{id}/test           run a connectivity probe
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.connectors import configure_connector, list_connectors, test_connector
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/connectors", tags=["connectors"])


class ConnectorConfig(BaseModel):
    config: dict[str, str] = Field(default_factory=dict)


@router.get("")
def list_all(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return {"connectors": list_connectors(db)}


@router.post("/{connector_id}/configure")
def configure(
    connector_id: str,
    body: ConnectorConfig,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        return {"connector": configure_connector(connector_id, body.config, db)}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None


@router.post("/{connector_id}/test")
def test(
    connector_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        return {"connector": test_connector(connector_id, db)}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None