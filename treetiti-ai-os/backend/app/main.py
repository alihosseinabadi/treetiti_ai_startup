"""TREEtiti AI Marketing OS — FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.auth import ensure_admin_user
from app.brain import seed_business_knowledge
from app.config import get_settings
from app.database import ensure_schema
from app.default_deny import DefaultDenyMiddleware
from app.logging_config import configure_logging
from app.routers import (
    agents, approvals, assets, auth, campaigns, chat,
    clients, connectors, content, directory, leads, mcp, memory, missions,
    orchestrator, projects, providers, research, routines, talk,
    tasks, templates, teammates, webhooks,
)
from app.routers.projects import seed_primary_project
from app.scheduler import start_autopilot, stop_autopilot

logger = logging.getLogger("treetiti")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    get_settings().validate_prod()
    ensure_schema()
    ensure_admin_user()
    seed_business_knowledge()
    seed_primary_project()
    # start_autopilot()  # Disabled for dev
    logger.info("TREEtiti AI Marketing OS ready (autopilot on)")
    yield
    # stop_autopilot()  # Disabled for dev


def create_app() -> FastAPI:
    settings = get_settings()
    prod = settings.is_prod
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        # Amendment 3: no interactive docs in production.
        docs_url=None if prod else "/docs",
        redoc_url=None if prod else "/redoc",
        openapi_url=None if prod else "/openapi.json",
    )

    # Default-deny runs INSIDE CORS (added first = innermost) so CORS
    # preflights are answered before auth is evaluated.
    app.add_middleware(DefaultDenyMiddleware)

    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://localhost:5678",
        settings.public_base_url.rstrip("/"),
    ]
    if prod and ("*" in cors_origins or not settings.public_base_url.startswith("https://")):
        raise RuntimeError(
            "Refusing to start in production: CORS must not be '*' and "
            "PUBLIC_BASE_URL must be https"
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Webhook-Secret", "X-Telegram-Bot-Api-Secret-Token"],
    )

    @app.get("/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "app": settings.app_name}

    @app.get("/os", tags=["system"], include_in_schema=False)
    def os_dashboard():
        """Serve the static HTML OS dashboard (same-origin, no CORS needed)."""
        from fastapi.responses import FileResponse

        html = Path(__file__).resolve().parents[2] / "os_dashboard.html"
        return FileResponse(str(html), media_type="text/html",
                            headers={"Cache-Control": "no-store"})

    api_prefix = settings.api_prefix
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(chat.router, prefix=api_prefix)
    app.include_router(memory.router, prefix=api_prefix)
    app.include_router(agents.router, prefix=api_prefix)
    app.include_router(content.router, prefix=api_prefix)
    app.include_router(leads.router, prefix=api_prefix)
    app.include_router(directory.router, prefix=api_prefix)
    app.include_router(webhooks.router, prefix=api_prefix)
    app.include_router(tasks.router, prefix=api_prefix)
    app.include_router(tasks.stream_router, prefix=api_prefix)
    app.include_router(providers.router, prefix=api_prefix)
    app.include_router(projects.router, prefix=api_prefix)
    app.include_router(assets.router, prefix=api_prefix)
    app.include_router(campaigns.router, prefix=api_prefix)
    app.include_router(approvals.router, prefix=api_prefix)
    app.include_router(missions.router, prefix=api_prefix)
    app.include_router(orchestrator.router, prefix=api_prefix)
    app.include_router(clients.router, prefix=api_prefix)
    app.include_router(templates.router, prefix=api_prefix)
    app.include_router(routines.router, prefix=api_prefix)
    app.include_router(research.router, prefix=api_prefix)
    app.include_router(connectors.router, prefix=api_prefix)
    app.include_router(mcp.router, prefix=api_prefix)
    app.include_router(teammates.router, prefix=api_prefix)
    app.include_router(talk.router, prefix=api_prefix)

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
