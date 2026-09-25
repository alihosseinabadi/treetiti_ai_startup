"""Treetiti AI Marketing OS — FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.arena import start_arena, stop_arena
from app.auth import ensure_admin_user
from app.brain import seed_business_knowledge
from app.config import get_settings
from app.database import ensure_schema
from app.routers import agents, arena, auth, chat, content, directory, leads, memory, orchestrator, projects, webhooks
from app.scheduler import start_autopilot, stop_autopilot

logger = logging.getLogger("treetiti")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema()
    ensure_admin_user()
    seed_business_knowledge()
    start_arena()
    start_autopilot()
    logger.info("Treetiti AI Marketing OS ready (autopilot on, arena self-driving)")
    yield
    stop_arena()
    stop_autopilot()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.2.0",
        lifespan=lifespan,
    )

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Telegram-Bot-Api-Secret-Token"],
        max_age=600,
    )

    @app.get("/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "app": settings.app_name}

    api_prefix = settings.api_prefix
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(chat.router, prefix=api_prefix)
    app.include_router(memory.router, prefix=api_prefix)
    app.include_router(agents.router, prefix=api_prefix)
    app.include_router(arena.router, prefix=api_prefix)
    app.include_router(content.router, prefix=api_prefix)
    app.include_router(leads.router, prefix=api_prefix)
    app.include_router(directory.router, prefix=api_prefix)
    app.include_router(orchestrator.router, prefix=api_prefix)
    app.include_router(projects.router, prefix=api_prefix)
    app.include_router(webhooks.router, prefix=api_prefix)

    _mount_frontend(app, api_prefix)

    return app


def _mount_frontend(app: FastAPI, api_prefix: str) -> None:
    """Serve the built React dashboard from <repo>/frontend/dist, if present."""
    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    index = dist / "index.html"
    if not index.exists():
        logger.info("frontend/dist not found — API only (%s)", dist)
        return

    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    # Generated images live in <repo>/media and are served at /media/<file>.
    media_dir = Path(__file__).resolve().parents[2] / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str) -> FileResponse:
        # API routes are matched first; anything else serves the SPA shell.
        if full_path.startswith(api_prefix.strip("/")):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(index)


app = create_app()
