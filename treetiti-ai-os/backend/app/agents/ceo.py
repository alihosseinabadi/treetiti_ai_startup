"""TREEtiti AI Marketing OS — CEO / Orchestrator Agent (Phase 2, spec §32).

The CEO is the dynamic supervisor of the agency. It never does the work
itself: given a task brief it consults the Agent Registry, resolves exactly the
agents the task requires (spec: "The CEO dynamically activates only what is
required"), assembles them into the canonical agency DAG and executes that DAG
through the LangGraph orchestrator. Stages whose agent is not implemented (or
not resolved for this task) are skipped — the run never breaks.

This agent deliberately contains no marketing-domain logic: strategy lives in
the specialist agents it delegates to. Its job is WHO, WHEN and in what ORDER.
"""

from __future__ import annotations

import inspect
import json
import logging
from typing import Any, Iterable

from app.agents.base import BaseAgent
from app.core.langgraph_orchestrator import default_stages
from app.core.workflow import Workflow, WorkflowEngine

from app.agents.prompts.ceo import SYSTEM_PROMPT

logger = logging.getLogger("treetiti.agents.ceo")

# Canonical agency stage -> runtime agent key (spec §0/§51 pipeline).
# Stages whose agent is still planned (phase 3-5) simply never get a runner,
# so the graph skips them until the team is built out.
STAGE_TO_AGENT: dict[str, str] = {
    "research": "market_research",
    "analytics": "analytics",
    "campaign": "campaign",
    "strategy": "strategist",
    "editorial": "content_strategist",
    "creative": "creative_director",
    "content": "content",
    "image": "image",
    "video": "video",
    "qa": "editor",
    "publish": "social_manager",
    "learning": "growth_optimizer",
}

# When an agent's run() has no `brief` parameter, the CEO hands the brief to
# the first of these parameters the agent accepts.
_BRIEF_PARAMS = ("content", "extra_context", "issue", "idea", "topic")

# QA return loop (§44): how many times rejected content may be routed back to
# the content agent for revision before the editor's veto stands.
MAX_QA_ATTEMPTS = 3

# The final stage synthesizes everything the team produced into ONE polished
# deliverable (draft → critique → refine) instead of returning raw stage dumps.
SYNTHESIS_AGENT = "strategist"


class CEOAgent(BaseAgent):
    name = "CEO"
    role = "Chief Executive Officer / orchestrator"
    agent_key = "ceo"
    system_prompt = SYSTEM_PROMPT

    # -- team assembly ------------------------------------------------------

    def resolve_team(
        self,
        *,
        capabilities: Iterable[str] | None = None,
        skills: Iterable[str] | None = None,
        department: str | None = None,
        implemented_only: bool = True,
    ) -> list[dict[str, Any]]:
        """Agents required for this task (spec: activate only what is needed)."""
        from app.core.agent_registry import get_registry

        specs = get_registry().resolve(
            capabilities=capabilities,
            skills=skills,
            department=department,
            implemented_only=implemented_only,
        )
        return [s.to_dict() for s in specs]

    def build_workflow(
        self,
        *,
        brief: str,
        team_keys: Iterable[str] | None = None,
        inputs: dict[str, Any] | None = None,
        stages: list[tuple[str, Iterable[str]]] | None = None,
        task_id: str | None = None,
    ) -> Workflow:
        """Assemble a LangGraph workflow: register runners for team agents."""
        from app.agents import get_agent

        engine = WorkflowEngine()
        team = set(team_keys or ())
        for stage, agent_key in STAGE_TO_AGENT.items():
            if team_keys is not None and agent_key not in team:
                continue
            try:
                agent = get_agent(agent_key)
            except KeyError:
                logger.info("stage %s -> agent %r not implemented; skipped", stage, agent_key)
                continue

            if stage == "qa":
                # QA return loop (§44): rejected content routes back to the
                # content agent with the editor's notes, up to MAX_QA_ATTEMPTS.
                # The editor keeps VETO; the pipeline never ships unapproved work.
                def qa_runner(
                    wf: Workflow,
                    name: str,
                    merged: dict[str, Any],
                    _agent=agent,
                ) -> dict[str, Any]:
                    return self._run_qa_loop(wf, name, merged, _agent, task_id=task_id)

                engine.register(stage, qa_runner)
                continue

            def runner(wf: Workflow, name: str, merged: dict[str, Any], _agent=agent, _agent_key=agent_key) -> dict[str, Any]:
                # Hand each agent only the kwargs its run() actually accepts.
                accepted = set(inspect.signature(_agent.run).parameters)
                candidate = {
                    **wf.inputs,
                    "brief": merged.get("brief", ""),
                    "stage": name,
                }
                kwargs = {k: v for k, v in candidate.items() if k in accepted}
                brief_text = candidate.get("brief")
                if "brief" not in accepted and brief_text:
                    target = next((p for p in _BRIEF_PARAMS if p in accepted), None)
                    if target:
                        kwargs[target] = brief_text
                self._emit_stage(task_id, name, _agent_key, "started")
                try:
                    result = _agent.run(**kwargs)
                    self._emit_stage(task_id, name, _agent_key, "completed")
                except Exception as exc:  # noqa: BLE001
                    self._emit_stage(task_id, name, _agent_key, "failed", str(exc))
                    raise
                return result if isinstance(result, dict) else {"result": result}

            engine.register(stage, runner)

        wf = engine.create(
            wtype=f"agency:{brief[:40]}",
            stages=[name for name, _ in (stages or default_stages())],
        )
        wf.inputs["brief"] = brief
        if inputs:
            wf.inputs.update(inputs)
        self._engine = engine
        return wf

    # -- live progress (ONE CHAT, spec §12) -----------------------------------

    @staticmethod
    def _emit_stage(
        task_id: str | None,
        stage: str,
        agent_key: str,
        phase: str,
        note: str = "",
    ) -> None:
        """Emit a per-stage progress event so the UI can show the team working.

        When this CEO run belongs to a background task (``task_id`` set), the
        event is tagged with that id and shows up on the task's SSE stream.
        """
        from app.core.events import emit
        from app.core.task_queue import AGENT_COMPLETED, AGENT_FAILED, AGENT_STARTED

        name = {
            "started": AGENT_STARTED,
            "completed": AGENT_COMPLETED,
            "failed": AGENT_FAILED,
        }.get(phase, AGENT_STARTED)
        emit(
            name,
            source=agent_key,
            correlation_id=task_id,
            payload={
                "task_id": task_id,
                "agent": agent_key,
                "stage": stage,
                "phase": phase,
                "note": note,
            },
        )

    @staticmethod
    def _emit_handoff(
        task_id: str | None,
        from_agent: str,
        to_agent: str,
        note: str = "",
    ) -> None:
        """Emit an agent handoff event for UI visualization."""
        from app.core.events import emit

        emit(
            "agent.handoff",
            source=from_agent,
            correlation_id=task_id,
            payload={
                "task_id": task_id,
                "from": from_agent,
                "to": to_agent,
                "note": note,
            },
        )

    def _run_qa_loop(
        self,
        wf: Workflow,
        name: str,
        merged: dict[str, Any],
        editor: Any,
        *,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        """QA stage runner implementing the return loop (§44).

        Reviews the content output with the editor agent. If the editor REJECTS,
        the loop re-runs the content agent with the editor's revision notes and
        re-QAs, up to ``MAX_QA_ATTEMPTS``. The editor keeps VETO: after the last
        attempt the rejection stands and the pipeline must not publish.
        """
        from app.core.events import emit
        from app.core.task_queue import AGENT_COMPLETED, AGENT_FAILED, AGENT_STARTED

        content_payload = wf.outputs.get("content")
        content_items = content_payload.get("result") if isinstance(content_payload, dict) else content_payload
        if not isinstance(content_items, list):
            content_items = []

        emit(
            AGENT_STARTED,
            source="editor",
            correlation_id=task_id,
            payload={"task_id": task_id, "agent": "editor", "stage": "qa", "phase": "started"},
        )

        verdict: dict[str, Any] = {}
        notes: list[str] = []
        for attempt in range(1, MAX_QA_ATTEMPTS + 1):
            payload = json.dumps(content_items, ensure_ascii=False) if content_items else "(no content produced)"
            verdict = editor.run(content=payload)
            status = str(verdict.get("status", "")).lower()
            notes = [str(n) for n in (verdict.get("revision_notes") or [])]

            if status == "approved":
                emit(
                    AGENT_COMPLETED,
                    source="editor",
                    correlation_id=task_id,
                    payload={"task_id": task_id, "agent": "editor", "stage": "qa", "phase": "completed", "note": "QA passed"},
                )
                return {
                    "result": verdict,
                    "status": "approved",
                    "attempts": attempt,
                    "content": content_items,
                }

            # Rejected -> route back to the content agent with revision notes.
            emit(
                AGENT_FAILED,
                source="editor",
                correlation_id=task_id,
                payload={
                    "task_id": task_id,
                    "agent": "editor",
                    "stage": "qa",
                    "phase": "failed",
                    "note": "QA rejected — returning to content for revision",
                    "revision_notes": notes,
                },
            )
            if attempt >= MAX_QA_ATTEMPTS:
                break

            content_items = self._revise_content(wf, content_items, notes, task_id=task_id)

        return {
            "result": verdict,
            "status": "rejected",
            "attempts": MAX_QA_ATTEMPTS,
            "revision_notes": notes,
            "content": content_items,
        }

    def _revise_content(
        self,
        wf: Workflow,
        content_items: list[dict[str, Any]],
        notes: list[str],
        *,
        task_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Re-run the content agent against the editor's revision notes."""
        from app.agents import get_agent
        from app.core.task_queue import AGENT_STARTED, AGENT_COMPLETED, AGENT_FAILED

        try:
            content_agent = get_agent("content")
        except KeyError:
            return content_items

        # Best-guess platform from the items (fall back to LinkedIn).
        platforms = {str(i.get("platform", "")).strip() for i in content_items if i.get("platform")}
        platform = next(iter(platforms), "linkedin") if len(platforms) == 1 else "linkedin"
        # Keep the creative inputs the content agent accepts.
        accepted = set(inspect.signature(content_agent.run).parameters)
        kwargs = {
            k: v for k, v in wf.inputs.items()
            if k in accepted and v is not None
        }
        kwargs.setdefault("platform", platform)
        kwargs.setdefault("count", max(len(content_items), 1))
        kwargs["previous"] = content_items
        kwargs["revision_notes"] = notes

        self._emit_stage(task_id, "content", "content", "started", note="revising after QA reject")
        try:
            revised = content_agent.run(**kwargs)
            self._emit_stage(task_id, "content", "content", "completed", note="revision complete")
        except Exception as exc:  # noqa: BLE001
            self._emit_stage(task_id, "content", "content", "failed", str(exc))
            return content_items
        wf.outputs["content"] = {"result": revised}
        return revised

    # -- final deliverable synthesis -----------------------------------------

    @staticmethod
    def _digest_outputs(wf: Workflow) -> str:
        """Compact, human-readable digest of every completed stage output."""
        lines: list[str] = []
        for stage, payload in wf.outputs.items():
            if not payload:
                continue
            if isinstance(payload, dict):
                payload = payload.get("result", payload)
            text = json.dumps(payload, ensure_ascii=False, default=str)
            lines.append(f"### {stage}\n{text[:1200]}")
        return "\n\n".join(lines)

    def _synthesize(
        self,
        wf: Workflow,
        *,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        """Merge every stage output into ONE polished final deliverable.

        The strategist drafts an executive summary + full deliverable, then
        self-critiques and refines it (deliberation loop) so the result reads
        like it came from a frontier model rather than a raw agent dump. Falls
        back to the digest when the LLM is unreachable — the run never breaks.
        """
        from app.agents import get_agent

        self._emit_stage(task_id, "synthesis", SYNTHESIS_AGENT, "started", note="merging team output")
        digest = self._digest_outputs(wf)
        if not digest.strip():
            self._emit_stage(task_id, "synthesis", SYNTHESIS_AGENT, "completed", note="nothing to synthesize")
            return {"result": "", "digest": ""}

        try:
            agent = get_agent(SYNTHESIS_AGENT)
            prompt = (
                f"The TREEtiti team completed the brief: {wf.inputs.get('brief', '')}\n\n"
                f"RAW TEAM OUTPUT (each stage's results):\n\n{digest}\n\n"
                "Produce the FINAL DELIVERABLE: an executive summary (what was done, "
                "key results, recommendations), then the polished content/artifacts "
                "the client should use. Base everything ONLY on the team output — "
                "do not invent facts. Structure with clear markdown headings."
            )
            final = agent.deliberate(prompt, refine_rounds=1)
            self._emit_stage(task_id, "synthesis", SYNTHESIS_AGENT, "completed", note="deliverable synthesized")
            return {"result": final, "digest": digest}
        except Exception as exc:  # noqa: BLE001 — never break the run on synthesis
            logger.warning("synthesis degraded (%s) — returning raw digest", str(exc)[:120])
            self._emit_stage(task_id, "synthesis", SYNTHESIS_AGENT, "completed", note="raw digest (LLM unavailable)")
            return {"result": digest, "digest": digest}

    # -- main entry ---------------------------------------------------------

    def run(
        self,
        brief: str = "",
        *,
        capabilities: Iterable[str] | None = None,
        skills: Iterable[str] | None = None,
        department: str | None = None,
        team_keys: Iterable[str] | None = None,
        inputs: dict[str, Any] | None = None,
        stages: list[tuple[str, Iterable[str]]] | None = None,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        """Execute a task: resolve the team, run the DAG, report the outcome.

        Without an explicit team, the CEO resolves from the task's capability /
        skill / department signals (falling back to the whole implemented team).
        Returns a run report: team, per-stage statuses and the workflow state.
        """
        from app.core.agent_registry import get_registry

        registry = get_registry()
        if team_keys is not None:
            team_keys = set(team_keys)
        elif capabilities or skills or department:
            specs = registry.resolve(
                capabilities=capabilities, skills=skills, department=department
            )
            team_keys = {s.key for s in specs}
        else:
            team_keys = {s.key for s in registry.implemented()}
        team = [
            s.to_dict()
            for s in registry.all()
            if s.key in team_keys
        ]

        wf = self.build_workflow(brief=brief, team_keys=team_keys, inputs=inputs, stages=stages, task_id=task_id)

        # Emit handoffs for sequential stage transitions (for UI visualization)
        if task_id and stages:
            stage_names = [name for name, _ in stages]
            stage_to_agent = {stage: STAGE_TO_AGENT.get(stage) for stage in stage_names if STAGE_TO_AGENT.get(stage)}
            prev_agent = None
            for stage_name in stage_names:
                agent = stage_to_agent.get(stage_name)
                if agent and prev_agent and agent != prev_agent:
                    self._emit_handoff(task_id, prev_agent, agent, f"Stage transition: {stage_name}")
                if agent:
                    prev_agent = agent

        self._engine.run_langgraph(wf, inputs=inputs)

        synthesis = self._synthesize(wf, task_id=task_id)
        wf.outputs["synthesis"] = synthesis

        state = wf.to_dict()
        report = {
            "brief": brief,
            "team": [t["key"] for t in team],
            "team_details": team,
            "status": wf.status,
            "stages": [
                {"name": s["name"], "status": s["status"]}
                for s in state.get("stages", [])
            ],
            "outputs": {k: v for k, v in wf.outputs.items()},
            "deliverable": synthesis.get("result", ""),
        }
        logger.info("CEO run %s: team=%s status=%s", wf.id, report["team"], wf.status)
        return report


__all__ = ["CEOAgent", "STAGE_TO_AGENT"]