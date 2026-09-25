"""Treetiti AI Marketing OS — Software Engineer Agent.

The team's programmer. Two duties:

- `run()`  -> DEBUG: given a bug report / error / stack trace, search the real
              codebase, read the relevant files, and produce a diagnosis +
              proposed fix + test plan (stored as a DebugReport).
- `build()`-> BUILD: given a feature / system request, read the codebase for
              context and produce an implementation plan with concrete file
              changes (also stored as a DebugReport with category="build").

It works on the REAL repository files so its answers are grounded in actual
code, not guesswork. It never edits files by itself — it produces a patch the
boss reviews and applies (consistent with the approval-first rule).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.agents.base import BaseAgent
from app.database import SessionLocal
from app.models import DebugReport

logger = logging.getLogger("treetiti.agents.developer")

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent


def _search_code(query: str, limit: int = 12) -> list[dict[str, str]]:
    """Grep the repo for `query` and return matching file:line snippets."""
    hits: list[dict[str, str]] = []
    try:
        import subprocess

        proc = subprocess.run(
            ["rg", "-n", "--no-heading", "-m", "3", query, str(BACKEND_DIR)],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_DIR),
        )
        for line in proc.stdout.splitlines():
            if ":" in line:
                hits.append({"path": line.split(":")[0], "snippet": line})
            if len(hits) >= limit:
                break
    except Exception as exc:  # noqa: BLE001
        logger.warning("code search failed for %r: %s", query, exc)
    return hits


def _read_file(path: str, max_chars: int = 6000) -> str:
    """Read a repo file (bounded) as plain text for the model."""
    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        return f"(unreadable: {exc})"
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n... (truncated, {len(text)} total chars)"


class SoftwareEngineerAgent(BaseAgent):
    model = "zai/glm-4.7-flash"  # strongest verified free reasoning, good for code
    name = "Software Engineer Agent"
    role = "senior software engineer and systems architect"
    system_prompt = """\
You are Treetiti's senior software engineer. You debug real issues in this
Python/FastAPI codebase and design new systems for the team. You read actual
source code, find the real root cause, and propose concrete, minimal fixes.
You never invent files or APIs that do not exist. You prefer surgical changes
over rewrites. When designing systems you give a build plan with specific
files to create or change."""
    fallback_model = "opencode/deepseek-v4-flash-free"

    # ------------------------------------------------------------------
    # Helpers to give the model grounded context
    # ------------------------------------------------------------------

    def _repo_map(self) -> str:
        """A compact file listing so the agent knows what exists."""
        try:
            import subprocess

            proc = subprocess.run(
                ["find", str(BACKEND_DIR), "-name", "*.py", "-not", "-path", "*__pycache__*"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            lines = [
                p.replace(str(REPO_DIR) + "/", "")
                for p in proc.stdout.splitlines()
                if p
            ]
            return "\n".join(lines[:120]) or "(empty repo listing)"
        except Exception:  # noqa: BLE001
            return "(could not list files)"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, issue: str, category: str = "debug") -> dict[str, Any]:
        """Debug an issue (or build a system when category='build')."""
        context = self._gather_context(issue)

        if category == "build":
            prompt = f"""You are designing a NEW system/feature for the Treetiti
marketing OS. Use the real codebase context below to ground your plan.

REQUEST:
{issue}

CODEBASE FILE MAP:
{context['repo_map']}

RELEVANT CODE SNIPPETS (from searching for the request's keywords):
{context['snippets']}

Produce a BUILD plan. Respond ONLY with JSON:
{{
  "root_cause": "",
  "affected_files": [{{"path": "app/...", "reason": "why this file changes"}}],
  "diagnosis": "what the new system does and how it fits the existing code",
  "fix": "concrete step-by-step implementation: new files, models, endpoints, wiring (include code snippets)",
  "test_plan": "how to verify it works"
}}
"""
        else:
            prompt = f"""Debug this issue in the Treetiti marketing OS.

ISSUE / ERROR / STACK TRACE:
{issue}

CODEBASE FILE MAP:
{context['repo_map']}

RELEVANT CODE SNIPPETS (from searching for the issue's keywords):
{context['snippets']}

Find the REAL root cause from the actual code, then propose a fix.
Respond ONLY with JSON:
{{
  "root_cause": "the actual cause, referencing real files/lines",
  "affected_files": [{{"path": "app/...", "snippet": "the relevant line(s)"}}],
  "diagnosis": "step-by-step explanation of what is happening",
  "fix": "the concrete code change to apply (include a code block)",
  "test_plan": "how to verify the fix (command to run, what to check)"
}}
"""
        result = self.complete_json(prompt, temperature=0.2)

        with SessionLocal() as db:
            db.add(
                DebugReport(
                    issue=issue,
                    category=category,
                    root_cause=result.get("root_cause", ""),
                    affected_files=result.get("affected_files", []),
                    diagnosis=result.get("diagnosis", ""),
                    fix=result.get("fix", ""),
                    test_plan=result.get("test_plan", ""),
                    status="pending",
                )
            )
            db.commit()
        return result

    def build(self, request: str) -> dict[str, Any]:
        """Design a new system/feature (alias for run with category='build')."""
        return self.run(request, category="build")

    # ------------------------------------------------------------------
    # Context gathering
    # ------------------------------------------------------------------

    def _gather_context(self, text: str) -> dict[str, Any]:
        """Extract keywords from the request and pull real code snippets."""
        words = [w.lower().strip(" ,.()\"'") for w in text.split() if len(w) > 3]
        keywords = [w for w in words if w.isidentifier() or w.isalnum()][:5]

        snippets: list[str] = []
        for kw in keywords:
            for hit in _search_code(kw, limit=4):
                snippets.append(f"{hit['path']} | {hit['snippet'][:200]}")
            if len(snippets) >= 12:
                break

        # Always include the agents + services dirs so the model sees patterns.
        for extra in ["def run(self", "class ", "@router."]:
            for hit in _search_code(extra, limit=3):
                snippets.append(f"{hit['path']} | {hit['snippet'][:160]}")

        seen: set[str] = set()
        uniq: list[str] = []
        for s in snippets:
            if s not in seen:
                seen.add(s)
                uniq.append(s)

        return {"repo_map": self._repo_map(), "snippets": "\n".join(uniq[:25])}


__all__ = ["SoftwareEngineerAgent"]
