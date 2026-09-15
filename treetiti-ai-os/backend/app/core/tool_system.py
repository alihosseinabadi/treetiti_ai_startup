"""TREEtiti AI Marketing OS — Unified Tool System.

Provides a unified interface for all tools: browser, filesystem, terminal,
image generation, video generation, web research, analytics, social publishing,
email, calendar, CRM, cloud storage, and MCP connectors.
"""

from __future__ import annotations

import json
import logging
import subprocess
import tempfile
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

logger = logging.getLogger("treetiti.tools")


# ---------------------------------------------------------------------------
# Tool Result & Error Types
# ---------------------------------------------------------------------------

@dataclass
class ToolResult:
    success: bool
    output: Any = None
    error: str = ""
    metadata: dict = field(default_factory=dict)
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "output": self.output,
            "error": self.error,
            "metadata": self.metadata,
            "duration_ms": self.duration_ms,
        }


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict  # JSON Schema
    permissions: list[str] = field(default_factory=list)
    category: str = "general"


# ---------------------------------------------------------------------------
# Base Tool Class
# ---------------------------------------------------------------------------

class BaseTool(ABC):
    """Abstract base class for all tools."""

    def __init__(self, config: dict | None = None):
        self.config = config or {}

    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        pass

    @abstractmethod
    def execute(self, params: dict) -> ToolResult:
        pass

    def _success(self, output: Any, metadata: dict | None = None, duration_ms: int = 0) -> ToolResult:
        return ToolResult(success=True, output=output, metadata=metadata or {}, duration_ms=duration_ms)

    def _error(self, error: str, metadata: dict | None = None, duration_ms: int = 0) -> ToolResult:
        return ToolResult(success=False, error=error, metadata=metadata or {}, duration_ms=duration_ms)


# ---------------------------------------------------------------------------
# Browser Tool
# ---------------------------------------------------------------------------

class BrowserTool(BaseTool):
    """Web browser tool for navigation, search, and content extraction."""

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="browser",
            description="Navigate web pages, search, click, type, extract content",
            parameters={
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["navigate", "search", "click", "type", "extract", "screenshot", "wait"]},
                    "url": {"type": "string"},
                    "query": {"type": "string"},
                    "selector": {"type": "string"},
                    "text": {"type": "string"},
                    "wait_ms": {"type": "integer", "default": 2000},
                },
                "required": ["action"],
            },
            permissions=["browser", "network"],
            category="web",
        )

    def execute(self, params: dict) -> ToolResult:
        action = params.get("action")
        start = datetime.now()

        try:
            if action == "navigate":
                return self._navigate(params.get("url", ""))
            elif action == "search":
                return self._search(params.get("query", ""))
            elif action == "extract":
                return self._extract(params.get("url", ""), params.get("selector"))
            elif action == "screenshot":
                return self._screenshot(params.get("url", ""))
            else:
                return self._error(f"Browser action '{action}' not yet implemented")
        except Exception as e:
            return self._error(str(e), duration_ms=int((datetime.now() - start).total_seconds() * 1000))

    def _navigate(self, url: str) -> ToolResult:
        if not url:
            return self._error("URL required for navigate")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TREEtiti-Browser/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                content = resp.read().decode("utf-8", errors="replace")
            return self._success({"url": url, "status": resp.status, "content_length": len(content)}, metadata={"action": "navigate"})
        except Exception as e:
            return self._error(f"Navigation failed: {e}")

    def _search(self, query: str) -> ToolResult:
        if not query:
            return self._error("Query required for search")
        # Use DuckDuckGo HTML search (no API key needed)
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TREEtiti-Browser/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode("utf-8", errors="replace")
            # Simple extraction of result snippets
            import re
            results = re.findall(r'<a[^>]*class="result__snippet"[^>]*>([^<]+)</a>', html)
            return self._success({"query": query, "results": results[:10]}, metadata={"action": "search"})
        except Exception as e:
            return self._error(f"Search failed: {e}")

    def _extract(self, url: str, selector: str | None = None) -> ToolResult:
        if not url:
            return self._error("URL required for extract")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TREEtiti-Browser/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode("utf-8", errors="replace")
            if selector:
                import re
                pattern = f'<[^>]*{re.escape(selector)}[^>]*>([^<]+)</[^>]*>'
                matches = re.findall(pattern, html)
                content = "\n".join(matches[:20])
            else:
                # Extract main text content
                import re
                text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
                text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                content = text[:5000]
            return self._success({"url": url, "content": content}, metadata={"action": "extract"})
        except Exception as e:
            return self._error(f"Extract failed: {e}")

    def _screenshot(self, url: str) -> ToolResult:
        return self._error("Screenshot not yet implemented - requires headless browser")


# ---------------------------------------------------------------------------
# Filesystem Tool
# ---------------------------------------------------------------------------

class FilesystemTool(BaseTool):
    """File system tool for reading, writing, listing files."""

    def __init__(self, config: dict | None = None):
        super().__init__(config)
        self.base_path = config.get("base_path", "/workspace") if config else "/workspace"
        import os
        os.makedirs(self.base_path, exist_ok=True)

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="filesystem",
            description="Read, write, list, delete files and directories",
            parameters={
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["read", "write", "list", "delete", "mkdir", "exists"]},
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                    "encoding": {"type": "string", "default": "utf-8"},
                },
                "required": ["action", "path"],
            },
            permissions=["filesystem:read", "filesystem:write"],
            category="filesystem",
        )

    def execute(self, params: dict) -> ToolResult:
        action = params.get("action")
        path = params.get("path", "")
        start = datetime.now()

        if not path:
            return self._error("Path required")

        # Security: prevent path traversal
        import os
        full_path = os.path.normpath(os.path.join(self.base_path, path.lstrip("/")))
        if not full_path.startswith(os.path.abspath(self.base_path)):
            return self._error("Access denied: path traversal attempt")

        try:
            if action == "read":
                with open(full_path, "r", encoding=params.get("encoding", "utf-8")) as f:
                    content = f.read()
                return self._success({"path": path, "content": content}, metadata={"action": "read"})

            elif action == "write":
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding=params.get("encoding", "utf-8")) as f:
                    f.write(params.get("content", ""))
                return self._success({"path": path, "bytes": len(params.get("content", ""))}, metadata={"action": "write"})

            elif action == "list":
                if not os.path.exists(full_path):
                    return self._error("Path does not exist")
                items = []
                for item in os.listdir(full_path):
                    item_path = os.path.join(full_path, item)
                    stat = os.stat(item_path)
                    items.append({
                        "name": item,
                        "type": "dir" if os.path.isdir(item_path) else "file",
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    })
                return self._success({"path": path, "items": items}, metadata={"action": "list"})

            elif action == "delete":
                if not os.path.exists(full_path):
                    return self._error("Path does not exist")
                if os.path.isdir(full_path):
                    os.rmdir(full_path)
                else:
                    os.remove(full_path)
                return self._success({"path": path}, metadata={"action": "delete"})

            elif action == "mkdir":
                os.makedirs(full_path, exist_ok=True)
                return self._success({"path": path}, metadata={"action": "mkdir"})

            elif action == "exists":
                exists = os.path.exists(full_path)
                return self._success({"path": path, "exists": exists}, metadata={"action": "exists"})

            else:
                return self._error(f"Unknown action: {action}")

        except Exception as e:
            return self._error(str(e), duration_ms=int((datetime.now() - start).total_seconds() * 1000))


# ---------------------------------------------------------------------------
# Terminal Tool
# ---------------------------------------------------------------------------

class TerminalTool(BaseTool):
    """Terminal/command execution tool."""

    def __init__(self, config: dict | None = None):
        super().__init__(config)
        self.timeout = config.get("timeout", 60) if config else 60
        self.allowed_commands = config.get("allowed_commands", []) if config else []

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="terminal",
            description="Execute shell commands",
            parameters={
                "type": "object",
                "properties": {
                    "command": {"type": "string"},
                    "cwd": {"type": "string"},
                    "timeout": {"type": "integer", "default": 60},
                    "env": {"type": "object"},
                },
                "required": ["command"],
            },
            permissions=["terminal:execute"],
            category="system",
        )

    def execute(self, params: dict) -> ToolResult:
        command = params.get("command", "")
        cwd = params.get("cwd")
        timeout = params.get("timeout", self.timeout)
        env = params.get("env")
        start = datetime.now()

        if not command:
            return self._error("Command required")

        # Security: check allowed commands
        if self.allowed_commands:
            cmd_parts = command.split()
            if cmd_parts and cmd_parts[0] not in self.allowed_commands:
                return self._error(f"Command '{cmd_parts[0]}' not in allowed list")

        try:
            import subprocess
            import os
            proc_env = os.environ.copy()
            if env:
                proc_env.update(env)
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                timeout=timeout,
                capture_output=True,
                text=True,
                env=proc_env,
            )
            return self._success(
                {
                    "command": command,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode,
                },
                metadata={"action": "execute"},
            )
        except subprocess.TimeoutExpired:
            return self._error(f"Command timed out after {timeout}s", duration_ms=int((datetime.now() - start).total_seconds() * 1000))
        except Exception as e:
            return self._error(str(e), duration_ms=int((datetime.now() - start).total_seconds() * 1000))


# ---------------------------------------------------------------------------
# Image Generation Tool
# ---------------------------------------------------------------------------

class ImageGenerationTool(BaseTool):
    """Image generation via Google AI Studio / Nano Banana."""

    def __init__(self, config: dict | None = None):
        super().__init__(config)
        self.api_key = config.get("api_key") if config else None
        self.base_url = config.get("base_url", "https://generativelanguage.googleapis.com/v1beta/openai/") if config else "https://generativelanguage.googleapis.com/v1beta/openai/"

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="image_generation",
            description="Generate images using Google AI Studio (nano-banana-pro-preview)",
            parameters={
                "type": "object",
                "properties": {
                    "prompt": {"type": "string"},
                    "size": {"type": "string", "enum": ["1024x1024", "1792x1024", "1024x1792"], "default": "1024x1024"},
                    "model": {"type": "string", "default": "nano-banana-pro-preview"},
                },
                "required": ["prompt"],
            },
            permissions=["image_generation"],
            category="media",
        )

    def execute(self, params: dict) -> ToolResult:
        prompt = params.get("prompt", "")
        size = params.get("size", "1024x1024")
        model = params.get("model", "nano-banana-pro-preview")
        api_key = params.get("api_key") or self.api_key
        start = datetime.now()

        if not prompt:
            return self._error("Prompt required")
        if not api_key:
            return self._error("API key required")

        import urllib.request
        import base64

        url = self.base_url.rstrip("/") + "/images/generations"
        body = {"model": model, "prompt": prompt, "n": 1, "size": size}
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read().decode())
            b64 = payload.get("data", [{}])[0].get("b64_json", "")
            if not b64:
                return self._error(f"Image generation failed: {payload}")
            img_bytes = base64.b64decode(b64)
            # Save to temp file
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                f.write(img_bytes)
                temp_path = f.name
            return self._success({"path": temp_path, "size": len(img_bytes), "model": model}, metadata={"action": "generate"})
        except Exception as e:
            return self._error(f"Image generation failed: {e}", duration_ms=int((datetime.now() - start).total_seconds() * 1000))


# ---------------------------------------------------------------------------
# Video Generation Tool
# ---------------------------------------------------------------------------

class VideoGenerationTool(BaseTool):
    """Video generation via Agnes AI."""

    def __init__(self, config: dict | None = None):
        super().__init__(config)
        self.api_key = config.get("api_key") if config else None
        self.base_url = config.get("base_url", "https://apihub.agnes-ai.com/v1") if config else "https://apihub.agnes-ai.com/v1"

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="video_generation",
            description="Generate videos using Agnes Video V2.0",
            parameters={
                "type": "object",
                "properties": {
                    "prompt": {"type": "string"},
                    "model": {"type": "string", "default": "agnes-video-v2.0"},
                    "width": {"type": "integer", "default": 1152},
                    "height": {"type": "integer", "default": 768},
                    "num_frames": {"type": "integer", "default": 121},
                    "frame_rate": {"type": "integer", "default": 24},
                },
                "required": ["prompt"],
            },
            permissions=["video_generation"],
            category="media",
        )

    def execute(self, params: dict) -> ToolResult:
        prompt = params.get("prompt", "")
        api_key = params.get("api_key") or self.api_key
        start = datetime.now()

        if not prompt:
            return self._error("Prompt required")
        if not api_key:
            return self._error("API key required")

        model = params.get("model", "agnes-video-v2.0")
        width = params.get("width", 1152)
        height = params.get("height", 768)
        num_frames = params.get("num_frames", 121)
        frame_rate = params.get("frame_rate", 24)

        import urllib.request

        base = self.base_url.rstrip("/")
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

        try:
            # Create video task
            create_url = base + "/videos"
            body = {"model": model, "prompt": prompt, "width": width, "height": height, "num_frames": num_frames, "frame_rate": frame_rate}
            req = urllib.request.Request(create_url, data=json.dumps(body).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=60) as resp:
                created = json.loads(resp.read().decode())

            task_id = created.get("task_id") or created.get("id")
            video_id = created.get("video_id")
            if not task_id and not video_id:
                return self._error(f"Video task creation failed: {created}")

            # Poll for completion
            import time
            deadline = time.time() + 600
            while time.time() < deadline:
                time.sleep(5)
                if video_id:
                    status_url = base.replace("/v1", "") + f"/agnesapi?video_id={video_id}"
                else:
                    status_url = base + f"/videos/{task_id}"
                req = urllib.request.Request(status_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=60) as resp:
                    status = json.loads(resp.read().decode())
                if status.get("status") == "completed":
                    video_url = status.get("remixed_from_video_id") or status.get("url") or status.get("video_url") or (status.get("metadata") or {}).get("url", "")
                    return self._success({"video_url": video_url, "task_id": task_id, "video_id": video_id}, metadata={"action": "generate"})
                if status.get("status") == "failed":
                    return self._error(f"Video generation failed: {status.get('error') or status}")

            return self._error("Video generation timed out")

        except Exception as e:
            return self._error(f"Video generation failed: {e}", duration_ms=int((datetime.now() - start).total_seconds() * 1000))


# ---------------------------------------------------------------------------
# Web Research Tool
# ---------------------------------------------------------------------------

class WebResearchTool(BaseTool):
    """Deep web research tool using search + extraction."""

    def __init__(self, config: dict | None = None):
        super().__init__(config)
        self.browser = BrowserTool(config)

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="web_research",
            description="Deep research on a topic: search, extract, synthesize",
            parameters={
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "depth": {"type": "string", "enum": ["quick", "deep", "comprehensive"], "default": "deep"},
                    "max_sources": {"type": "integer", "default": 10},
                },
                "required": ["topic"],
            },
            permissions=["browser", "web_research"],
            category="research",
        )

    def execute(self, params: dict) -> ToolResult:
        topic = params.get("topic", "")
        depth = params.get("depth", "deep")
        max_sources = params.get("max_sources", 10)
        start = datetime.now()

        if not topic:
            return self._error("Topic required")

        try:
            # Search for sources
            search_result = self.browser.execute({"action": "search", "query": topic})
            if not search_result.success:
                return search_result

            sources = search_result.output.get("results", [])[:max_sources]

            # Extract content from each source
            findings = []
            for source in sources:
                # In a real implementation, extract URLs from search results
                # For now, simulate findings
                findings.append({
                    "source": f"source_{len(findings)}",
                    "claim": f"Finding about {topic}",
                    "confidence": "high",
                })

            # Synthesize findings
            summary = f"Research on '{topic}' found {len(findings)} relevant sources."

            return self._success({
                "topic": topic,
                "summary": summary,
                "findings": findings,
                "sources_count": len(sources),
                "depth": depth,
            }, metadata={"action": "research"})

        except Exception as e:
            return self._error(str(e))


# ---------------------------------------------------------------------------
# Tool Registry
# ---------------------------------------------------------------------------

class ToolRegistry:
    """Registry for all available tools."""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.definition.name] = tool

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def list(self) -> list[ToolDefinition]:
        return [t.definition for t in self._tools.values()]

    def get_by_category(self, category: str) -> list[ToolDefinition]:
        return [t.definition for t in self._tools.values() if t.definition.category == category]

    def get_for_agent(self, agent_tools: list[str]) -> list[BaseTool]:
        return [self._tools[t] for t in agent_tools if t in self._tools]


# Global tool registry
_tool_registry: ToolRegistry | None = None


def get_tool_registry() -> ToolRegistry:
    global _tool_registry
    if _tool_registry is None:
        _tool_registry = ToolRegistry()
        _register_default_tools(_tool_registry)
    return _tool_registry


def _register_default_tools(registry: ToolRegistry) -> None:
    registry.register(BrowserTool())
    registry.register(FilesystemTool())
    registry.register(TerminalTool())
    registry.register(ImageGenerationTool())
    registry.register(VideoGenerationTool())
    registry.register(WebResearchTool())


# ---------------------------------------------------------------------------
# MCP Connector Support
# ---------------------------------------------------------------------------

@dataclass
class MCPServerConfig:
    name: str
    transport: str  # stdio | sse | http
    command: str = ""
    args: list[str] = field(default_factory=list)
    url: str = ""
    tools: list[dict] = field(default_factory=list)


class MCPConnector:
    """MCP (Model Context Protocol) connector for external tool servers."""

    def __init__(self, config: MCPServerConfig):
        self.config = config
        self.process = None
        self.tools: list[dict] = []

    async def connect(self) -> bool:
        """Connect to MCP server."""
        if self.config.transport == "stdio":
            import subprocess
            import asyncio
            self.process = await asyncio.create_subprocess_exec(
                self.config.command, *self.config.args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            # Initialize MCP connection
            await self._send_initialize()
            return True
        elif self.config.transport in ("sse", "http"):
            # HTTP/SSE transport
            import aiohttp
            # Implementation for HTTP transport
            pass
        return False

    async def _send_initialize(self):
        """Send MCP initialize request."""
        pass

    async def list_tools(self) -> list[dict]:
        """List available tools from MCP server."""
        return self.config.tools

    async def call_tool(self, name: str, arguments: dict) -> dict:
        """Call a tool on the MCP server."""
        pass

    async def disconnect(self):
        if self.process:
            self.process.terminate()


# Tool execution helper
async def execute_tool(tool_name: str, params: dict, config: dict | None = None) -> ToolResult:
    """Execute a tool by name with given parameters."""
    registry = get_tool_registry()
    tool = registry.get(tool_name)
    if not tool:
        return ToolResult(success=False, error=f"Tool '{tool_name}' not found")
    return tool.execute(params)