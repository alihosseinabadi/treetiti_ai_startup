"""TREEtiti AI Marketing OS — agent base class."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

from app.config import get_settings
from app.llm import llm_complete, llm_json

logger = logging.getLogger("treetiti.agents")


class BaseAgent(ABC):
    """Every AI employee shares a name, role, system prompt and run method."""

    name: str = "agent"
    role: str = ""
    system_prompt: str = ""
    # Which opencode model powers this agent, chosen by its power needs.
    # Ranked weakest → strongest: agents that produce quick, low-stakes output
    # use a lighter model; strategic/analytical agents use a stronger one.
    # Prefixes route to free providers:
    #   google/...  -> Google AI Studio (GOOGLE_AI_STUDIO_KEY)
    #   groq/...    -> Groq (GROQ_KEY)
    #   openrouter/... -> OpenRouter (OPENROUTER_KEY)
    #   everything else -> opencode CLI (zai/opencode=free accounts)
    # The real per-agent assignment lives in settings.agent_models (design doc);
    # this class default is only a fallback when a key isn't in the config.
    model: str = "opencode/deepseek-v4-flash-free"
    # If the configured model's provider key is missing, fall back to this model
    # so agents never break (free opencode model, no key needed).
    fallback_model: str = "opencode/deepseek-v4-flash-free"
    # Agent key used to look up settings.agent_models / agent_models_failover.
    agent_key: str = ""

    # --- core OS hooks (spec §30, §32, §41) ---------------------------------
    @property
    def permissions(self):  # noqa: ANN202
        """This agent's capability matrix (lazy, cached per key)."""
        from app.core.permissions import AgentPermissions  # noqa: PLC0415

        return AgentPermissions.from_defaults(self.agent_key or self.name)

    def _route_model(self) -> str:
        """Model Router path (spec §29) — only when use_model_router=True."""
        settings = get_settings()
        if not settings.use_model_router:
            return self._resolved_model()
        try:
            from app.core.model_registry import TaskSpec, get_registry as model_get_registry  # noqa: PLC0415

            profile = {
                "content": "content", "market_research": "research", "research": "research",
                "analytics": "analytics", "campaign": "campaign", "strategy": "strategy",
                "editor": "qa", "qa": "qa", "seo": "research",
                "image": "image", "video": "vision", "brand": "strategy",
                "sales": "content", "developer": "coding",
            }.get(self.agent_key, "reasoning")
            chosen = model_get_registry().pick_for_profile(profile).model
            return chosen
        except Exception as exc:  # noqa: BLE001
            logger.warning("model router unavailable (%s) — using static map", exc)
            return self._resolved_model()

    def _emit_run(self, event_type: str, *, extra: dict[str, Any] | None = None) -> None:
        try:
            from app.core.events import emit  # noqa: PLC0415

            emit(
                event_type,
                source=self.agent_key or self.name,
                payload={
                    "model": self._route_model(),
                    **(extra or {}),
                },
            )
        except Exception:  # noqa: BLE001  (never break agent execution on events)
            pass

    def _resolved_model(self) -> str:
        """Prefer the design-doc model map; fall back to the class default."""
        if self.agent_key:
            try:
                s = get_settings()
                return s.agent_models.get(self.agent_key, self.model)
            except Exception:  # noqa: BLE001
                return self.model
        return self.model

    def _resolved_fallback(self) -> str:
        if self.agent_key:
            try:
                s = get_settings()
                return s.agent_models_failover.get(self.agent_key, self.fallback_model)
            except Exception:  # noqa: BLE001
                return self.fallback_model
        return self.fallback_model

    def _system(self) -> str:
        base = f"You are {self.name}, the {self.role} of TREEtiti. {self.system_prompt}"
        # Owner-given per-agent instructions (Phase 6) override the stock persona.
        try:
            from app.agent_instructions import instructions_for  # noqa: PLC0415

            custom = instructions_for(self.agent_key or self.name)
            if custom:
                base = (
                    f"{base}\n\nOWNER DIRECTIVE (the company owner told you this — "
                    f"follow it over everything above):\n{custom}"
                )
        except Exception:  # noqa: BLE001  (never break agents on instruction lookup)
            pass
        return base

    def _try_complete(self, system: str, prompt: str, model: str, temperature: float, json_mode: bool) -> Any:
        if json_mode:
            return llm_json(system, prompt, model=model, temperature=temperature)
        return llm_complete(system, prompt, model=model, temperature=temperature)

    def complete(self, prompt: str, temperature: float = 0.7) -> str:
        system = self._system()
        model = self._route_model()
        fallback = self._resolved_fallback()
        try:
            text = self._try_complete(system, prompt, model, temperature, False)
            self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True})
            return text
        except Exception:  # noqa: BLE001
            if fallback and fallback != model:
                logger.warning("%s: %s failed, falling back to %s", self.name, model, fallback)
                text = self._try_complete(system, prompt, fallback, temperature, False)
                self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True})
                return text
            self._emit_run("AGENT_RUN_FINISHED", extra={"ok": False})
            raise

    def deliberate(
        self,
        prompt: str,
        *,
        temperature: float = 0.4,
        refine_rounds: int = 1,
        focus: str = "",
    ) -> str:
        """Draft → self-critique → refine deliberation loop.

        Produces near-frontier-quality output from a lightweight model by making
        the agent (a) draft, (b) ruthlessly critique its own draft against the
        focus criteria, then (c) rewrite fixing every raised weakness. This is
        the same "think before you ship" pattern that makes Kimi-class models
        strong — emulated here with explicit agent steps.

        Bounded: at most ``refine_rounds`` critique+rewrite passes. Degrades
        gracefully: any failure returns the last good draft, never raises.
        """
        system = self._system()
        model = self._route_model()
        fallback = self._resolved_fallback()

        def one_call(sys: str, p: str, temp: float) -> str:
            try:
                return self._try_complete(sys, p, model, temp, False)
            except Exception:  # noqa: BLE001
                if fallback and fallback != model:
                    return self._try_complete(sys, p, fallback, temp, False)
                raise

        criteria = focus or "accuracy, clarity, persuasiveness, structure, and brand fit"
        draft = one_call(system, prompt, temperature)
        for rnd in range(max(0, refine_rounds)):
            try:
                critique = one_call(
                    system,
                    f"{prompt}\n\nDRAFT:\n{draft}\n\n"
                    f"You are a ruthless critic. Judge the draft against: {criteria}. "
                    "List the 3-7 most important concrete weaknesses as numbered points. "
                    "Be specific and actionable — no praise.",
                    0.2,
                )
                draft = one_call(
                    system,
                    f"{prompt}\n\nPREVIOUS DRAFT:\n{draft}\n\nCRITIQUE:\n{critique}\n\n"
                    "Rewrite the deliverable fixing EVERY weakness the critique raised. "
                    "Keep whatever already works. Return only the final deliverable.",
                    0.3,
                )
            except Exception as exc:  # noqa: BLE001 — deliberation must never break the agent
                logger.warning("%s: deliberation round %d degraded: %s", self.name, rnd + 1, exc)
                break
        self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True, "refined": True})
        return draft

    def super_deliberate(
        self,
        prompt: str,
        *,
        temperature: float = 0.4,
        think: str = "deep",
        focus: str = "",
        on_stage: Callable[[str, str], None] | None = None,
        model: str | None = None,
    ) -> tuple[str, list[dict]]:
        """Next-level deliberation with a visible thinking trail.

        Levels:
          plain — one direct answer, no extra thinking budget.
          deep  — draft → ruthless self-critique → rewrite (old ``deliberate``).
          super — decompose → draft → critique → refine → verify → finalize.
                  The agent first plans the highest-value angles, then ships an
                  idea, attacks it, rewrites it, then checks the rewrite against
                  the original request and closes any remaining gaps.

        Every intermediate stage is reported to ``on_stage(stage, note)`` and
        returned as a list of {stage, note} dicts so the UI can render the
        agent's thinking live. Degrades gracefully at every step: a failed
        stage falls back to the last good text, never raises.
        """
        system = self._system()
        chosen = model or self._route_model()
        fallback = self._resolved_fallback()

        def one_call(sys: str, p: str, temp: float) -> str:
            try:
                return self._try_complete(sys, p, chosen, temp, False)
            except Exception:  # noqa: BLE001
                if fallback and fallback != chosen:
                    return self._try_complete(sys, p, fallback, temp, False)
                raise

        def note(stage: str, text: str) -> dict:
            record = {"stage": stage, "note": text[:500]}
            if on_stage:
                try:
                    on_stage(stage, text[:240])
                except Exception:  # noqa: BLE001 — never let a UI callback break thinking
                    pass
            return record

        stages: list[dict] = []
        criteria = focus or "accuracy, clarity, persuasiveness, structure, and brand fit"

        if think == "plain":
            try:
                return one_call(system, prompt, temperature), []
            except Exception:  # noqa: BLE001
                return "", []

        if think == "super":
            # 1) Decompose: plan the highest-value angles BEFORE drafting.
            try:
                plan = one_call(
                    system,
                    f"{prompt}\n\nBefore answering, list the 3-6 highest-value angles, "
                    f"risks, or sections this deliverable needs, as short numbered lines. "
                    f"No preamble.",
                    0.3,
                )
                stages.append(note("planning", plan))
            except Exception as exc:  # noqa: BLE001
                logger.warning("%s: super-thinking plan degraded: %s", self.name, exc)
                plan = ""

        try:
            draft = one_call(system, prompt, temperature)
            stages.append(note("drafting", draft))
        except Exception:  # noqa: BLE001
            logger.warning("%s: super-thinking draft failed", self.name)
            return "", stages

        try:
            critique = one_call(
                system,
                f"{prompt}\n\nDRAFT:\n{draft}\n\n"
                f"You are a ruthless critic. Judge the draft against: {criteria}. "
                "List the 4-8 most important concrete weaknesses as numbered points. "
                "Be specific and actionable — no praise.",
                0.2,
            )
            stages.append(note("critiquing", critique))
        except Exception:  # noqa: BLE001
            critique = ""

        try:
            draft = one_call(
                system,
                f"{prompt}\n\nPREVIOUS DRAFT:\n{draft}\n\nCRITIQUE:\n{critique or 'none'}\n\n"
                "Rewrite the deliverable fixing EVERY weakness the critique raised. "
                "Keep whatever already works. Return only the final deliverable.",
                0.3,
            )
            stages.append(note("refining", draft))
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s: super-thinking refine degraded: %s", self.name, exc)
            return draft, stages

        if think == "super":
            # 2) Verify: does the rewrite still answer the ORIGINAL ask?
            try:
                gaps = one_call(
                    system,
                    f"ORIGINAL REQUEST:\n{prompt}\n\nCURRENT DELIVERABLE:\n{draft}\n\n"
                    f"Judge against: {criteria}. Does the deliverable fully answer the "
                    "original request? List only the real remaining gaps (or 'No remaining gaps.').",
                    0.2,
                )
                stages.append(note("verifying", gaps))
            except Exception:  # noqa: BLE001
                gaps = ""
            if gaps and "no remaining" not in gaps.lower():
                try:
                    draft = one_call(
                        system,
                        f"ORIGINAL REQUEST:\n{prompt}\n\nDELIVERABLE:\n{draft}\n\n"
                        f"REMAINING GAPS:\n{gaps}\n\n"
                        "Final pass: fix the remaining gaps, keep everything that works, "
                        "and return only the finished deliverable.",
                        0.3,
                    )
                    stages.append(note("finalizing", draft))
                except Exception as exc:  # noqa: BLE001
                    logger.warning("%s: super-thinking final pass degraded: %s", self.name, exc)

        self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True, "refined": True, "think": think})
        return draft, stages
    def complete_json(self, prompt: str, temperature: float = 0.2) -> dict[str, Any]:
        system = self._system()
        model = self._route_model()
        fallback = self._resolved_fallback()
        try:
            data = self._try_complete(system, prompt, model, temperature, True)
            self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True})
            return data
        except Exception:  # noqa: BLE001
            if fallback and fallback != model:
                logger.warning("%s: %s failed, falling back to %s", self.name, model, fallback)
                data = self._try_complete(system, prompt, fallback, temperature, True)
                self._emit_run("AGENT_RUN_FINISHED", extra={"ok": True})
                return data
            self._emit_run("AGENT_RUN_FINISHED", extra={"ok": False})
            raise

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError
