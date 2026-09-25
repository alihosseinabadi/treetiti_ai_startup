"""Treetiti AI Marketing OS — agent base class."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

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
        return f"You are {self.name}, the {self.role} of Treetiti. {self.system_prompt}"

    def _try_complete(self, system: str, prompt: str, model: str, temperature: float, json_mode: bool) -> Any:
        if json_mode:
            return llm_json(system, prompt, model=model, temperature=temperature)
        return llm_complete(system, prompt, model=model, temperature=temperature)

    def _provider_fallback(self, system: str, prompt: str, temperature: float, json_mode: bool) -> Any:
        """Last resort: the configured llm_provider (e.g. keyless pollinations).

        Per-agent models may point at key-gated providers or a missing CLI;
        this keeps every agent genuinely working out of the box.
        """
        from app.llm import llm_complete as _raw_complete, llm_json as _raw_json

        if json_mode:
            return _raw_json(system, prompt, model=None, temperature=temperature)
        return _raw_complete(system, prompt, model=None, temperature=temperature)

    def complete(self, prompt: str, temperature: float = 0.7) -> str:
        system = self._system()
        model = self._resolved_model()
        fallback = self._resolved_fallback()
        try:
            return self._try_complete(system, prompt, model, temperature, False)
        except Exception:  # noqa: BLE001
            if fallback and fallback != model:
                logger.warning("%s: %s failed, falling back to %s", self.name, model, fallback)
                try:
                    return self._try_complete(system, prompt, fallback, temperature, False)
                except Exception:  # noqa: BLE001
                    pass
            logger.warning("%s: routed models unavailable, using llm_provider", self.name)
            return self._provider_fallback(system, prompt, temperature, False)

    def complete_json(self, prompt: str, temperature: float = 0.2) -> dict[str, Any]:
        system = self._system()
        model = self._resolved_model()
        fallback = self._resolved_fallback()
        try:
            return self._try_complete(system, prompt, model, temperature, True)
        except Exception:  # noqa: BLE001
            if fallback and fallback != model:
                logger.warning("%s: %s failed, falling back to %s", self.name, model, fallback)
                try:
                    return self._try_complete(system, prompt, fallback, temperature, True)
                except Exception:  # noqa: BLE001
                    pass
            logger.warning("%s: routed models unavailable, using llm_provider", self.name)
            return self._provider_fallback(system, prompt, temperature, True)

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError
