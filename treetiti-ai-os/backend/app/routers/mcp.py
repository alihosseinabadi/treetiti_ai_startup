"""MCP (Model Context Protocol) Router for external tool servers."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import McpServer, User

router = APIRouter(prefix="/mcp", tags=["mcp"])


class McpServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    transport: str = Field(default="stdio", pattern="^(stdio|sse|http)$")
    command: str = Field(default="")
    args: list[str] = Field(default_factory=list)
    url: str = Field(default="")
    tools: list[dict] = Field(default_factory=list)


class McpServerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    transport: str | None = Field(default=None, pattern="^(stdio|sse|http)$")
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None
    tools: list[dict] | None = None
    status: str | None = Field(default=None, pattern="^(registered|reachable|unreachable)$")


class McpServerResponse(BaseModel):
    id: str
    name: str
    transport: str
    command: str
    args: list[str]
    url: str
    tools: list[dict]
    status: str
    last_error: str
    last_checked_at: str | None
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class McpToolCall(BaseModel):
    name: str = Field(..., min_length=1)
    arguments: dict = Field(default_factory=dict)


@router.get("", response_model=list[McpServerResponse])
def list_mcp_servers(
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[McpServerResponse]:
    servers = db.query(McpServer).order_by(McpServer.created_at.desc()).all()
    return [
        McpServerResponse(
            id=s.id,
            name=s.name,
            transport=s.transport,
            command=s.command,
            args=s.args,
            url=s.url,
            tools=s.tools,
            status=s.status,
            last_error=s.last_error,
            last_checked_at=s.last_checked_at.isoformat() if s.last_checked_at else "",
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        for s in servers
    ]


@router.post("", response_model=McpServerResponse, status_code=201)
def register_mcp_server(
    payload: McpServerCreate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> McpServerResponse:
    server = McpServer(
        name=payload.name,
        transport=payload.transport,
        command=payload.command,
        args=payload.args,
        url=payload.url,
        tools=payload.tools,
        status="registered",
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return McpServerResponse(
        id=server.id,
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
        status=server.status,
        last_error=server.last_error,
        last_checked_at=server.last_checked_at.isoformat() if server.last_checked_at else "",
        created_at=server.created_at.isoformat() if server.created_at else "",
    )


@router.get("/{server_id}", response_model=McpServerResponse)
def get_mcp_server(
    server_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor", "viewer"))],
    db: Annotated[Session, Depends(get_db)],
) -> McpServerResponse:
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        raise HTTPException(404, "MCP server not found")
    return McpServerResponse(
        id=server.id,
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
        status=server.status,
        last_error=server.last_error,
        last_checked_at=server.last_checked_at.isoformat() if server.last_checked_at else "",
        created_at=server.created_at.isoformat() if server.created_at else "",
    )


@router.patch("/{server_id}", response_model=McpServerResponse)
def update_mcp_server(
    server_id: str,
    payload: McpServerUpdate,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> McpServerResponse:
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        raise HTTPException(404, "MCP server not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(server, key, value)
    db.commit()
    db.refresh(server)

    return McpServerResponse(
        id=server.id,
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
        status=server.status,
        last_error=server.last_error,
        last_checked_at=server.last_checked_at.isoformat() if server.last_checked_at else "",
        created_at=server.created_at.isoformat() if server.created_at else "",
    )


@router.post("/{server_id}/probe", response_model=McpServerResponse)
async def probe_mcp_server(
    server_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> McpServerResponse:
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        raise HTTPException(404, "MCP server not found")

    # Probe the server
    import asyncio
    from app.core.tool_system import MCPConnector, MCPServerConfig

    config = MCPServerConfig(
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
    )

    connector = MCPConnector(config)
    try:
        connected = await connector.connect()
        server.status = "reachable" if connected else "unreachable"
        server.last_error = ""
    except Exception as e:
        server.status = "unreachable"
        server.last_error = str(e)

    server.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(server)

    return McpServerResponse(
        id=server.id,
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
        status=server.status,
        last_error=server.last_error,
        last_checked_at=server.last_checked_at.isoformat() if server.last_checked_at else "",
        created_at=server.created_at.isoformat() if server.created_at else "",
    )


@router.post("/{server_id}/tools/call")
async def call_mcp_tool(
    server_id: str,
    payload: McpToolCall,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        raise HTTPException(404, "MCP server not found")

    if server.status != "reachable":
        raise HTTPException(400, "MCP server not reachable")

    from app.core.tool_system import MCPConnector, MCPServerConfig
    import asyncio

    config = MCPServerConfig(
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        tools=server.tools,
    )

    connector = MCPConnector(config)
    try:
        await connector.connect()
        result = await connector.call_tool(payload.name, payload.arguments)
        return result
    except Exception as e:
        raise HTTPException(500, f"Tool call failed: {e}")
    finally:
        await connector.disconnect()


@router.delete("/{server_id}")
def delete_mcp_server(
    server_id: str,
    user: Annotated[User, Depends(require_role("admin", "editor"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        raise HTTPException(404, "MCP server not found")
    db.delete(server)
    db.commit()
    return {"deleted": server_id}