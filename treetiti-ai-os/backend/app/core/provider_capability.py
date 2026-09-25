"""TREEtiti AI Agency OS — provider capability registry (spec §21, §23, §29).

Static, offline metadata about every LLM/media provider: which capabilities it
offers (llm, image, video, voice, 3d, search), its cost tier, whether a key is
configured, and where requests go. This is the "provider capability registry +
tier binding" from the plan (§L) — health probing lives in
``app/routers/providers.py`` and hits the live gateway.

Pure-Python and offline-testable: no database, no network.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.config import get_settings

# Capability names (spec §6 / §7 vocabulary).
CAP_LLM = "llm"
CAP_IMAGE = "image"
CAP_VIDEO = "video"
CAP_VOICE = "voice"
CAP_3D = "3d"
CAP_SEARCH = "search"


@dataclass(frozen=True)
class ProviderSpec:
    prefix: str
    name: str
    capabilities: frozenset[str]
    cost_tier: str  # free | paid
    key_field: str  # settings attribute holding the key
    base_url: str = ""
    enabled: bool = True
    notes: str = ""

    def to_dict(self, *, key_configured: bool) -> dict[str, Any]:
        return {
            "prefix": self.prefix,
            "name": self.name,
            "capabilities": sorted(self.capabilities),
            "cost_tier": self.cost_tier,
            "enabled": self.enabled,
            "key_configured": key_configured,
            "base_url": self.base_url,
            "notes": self.notes,
        }


def _cap(spec: dict[str, Any]) -> frozenset[str]:
    return frozenset(spec.get("capabilities", []))


def provider_specs() -> dict[str, ProviderSpec]:
    """Static provider inventory keyed by prefix.

    Gateway-backed prefixes (cbai, kimchi, ds, kimi, gh, bzl, ollama) are only
    reachable through 9Router, so they expose no key here — key_configured
    reflects the gateway being up instead (see ``routers/providers.py``).
    """
    return {
        "router": ProviderSpec(
            prefix="router",
            name="9Router (local gateway)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="router_key",
            enabled=True,
            notes="All production LLM traffic flows through the gateway (spec §4).",
        ),
        "groq": ProviderSpec(
            prefix="groq",
            name="Groq",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="groq_key",
            enabled=True,
            notes="Fast Llama/Qwen — content, analytics, JSON, fast tier.",
        ),
        "openrouter": ProviderSpec(
            prefix="openrouter",
            name="OpenRouter",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="openrouter_key",
            enabled=True,
            notes="Free-tier DeepSeek/Qwen; geo-blocked for RU egress.",
        ),
        "google": ProviderSpec(
            prefix="google",
            name="Google AI Studio (Gemini)",
            capabilities=_cap({"capabilities": [CAP_LLM, CAP_IMAGE]}),
            cost_tier="free",
            key_field="google_ai_studio_key",
            enabled=True,
            notes="Gemini flash LLM + Nano Banana image; key rotation across 3 keys.",
        ),
        "deepinfra": ProviderSpec(
            prefix="deepinfra",
            name="DeepInfra",
            capabilities=_cap({"capabilities": [CAP_LLM, CAP_IMAGE]}),
            cost_tier="paid",
            key_field="deepinfra_key",
            enabled=True,
            notes="DeepSeek-V3, Llama-3.3-70B, FLUX-2; needs balance (was 402).",
        ),
        "ghm": ProviderSpec(
            prefix="ghm",
            name="GitHub Models",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="github_models_key",
            base_url="https://models.github.ai/inference",
            enabled=True,
            notes="Free GPT-4.1/Claude/DeepSeek/Llama via GitHub PAT.",
        ),
        "nim": ProviderSpec(
            prefix="nim",
            name="NVIDIA NIM",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="nim_key",
            base_url="https://integrate.api.nvidia.com/v1",
            enabled=True,
            notes="NVIDIA-hosted Llama/Qwen/DeepSeek, free API key.",
        ),
        "glm": ProviderSpec(
            prefix="glm",
            name="Z.ai (GLM)",
            capabilities=_cap({"capabilities": [CAP_LLM, CAP_IMAGE]}),
            cost_tier="free",
            key_field="zai_key",
            base_url="https://api.z.ai/api/paas/v4",
            enabled=True,
            notes="Free GLM-4-Flash text + image/video.",
        ),
        "cf": ProviderSpec(
            prefix="cf",
            name="Cloudflare Workers AI",
            capabilities=_cap({"capabilities": [CAP_LLM, CAP_IMAGE]}),
            cost_tier="free",
            key_field="cf_key",
            base_url="https://api.cloudflare.com/client/v4",
            enabled=True,
            notes="10k free neurons/day on the edge (NeMoGuard/Llama/DeepSeek).",
        ),
        "agnes": ProviderSpec(
            prefix="agnes",
            name="Agnes AI Hub",
            capabilities=_cap({"capabilities": [CAP_LLM, CAP_IMAGE, CAP_VIDEO]}),
            cost_tier="free",
            key_field="agnes_key",
            base_url="https://apihub.agnes-ai.com/v1",
            enabled=True,
            notes="Text + image + async video generation.",
        ),
        "cerebras": ProviderSpec(
            prefix="cerebras",
            name="Cerebras",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="cerebras_key",
            base_url="https://api.cerebras.ai/v1",
            enabled=True,
            notes="Ultra-fast Llama inference, OpenAI-compatible.",
        ),
        "cohere": ProviderSpec(
            prefix="cohere",
            name="Cohere",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="cohere_key",
            base_url="https://api.cohere.com/compatibility/v1",
            enabled=True,
            notes="Command R/R+ via the OpenAI compatibility endpoint.",
        ),
        "deepseek": ProviderSpec(
            prefix="deepseek",
            name="DeepSeek",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="deepseek_key",
            base_url="https://api.deepseek.com/v1",
            enabled=True,
            notes="DeepSeek-V3 chat, OpenAI-compatible.",
        ),
        "mistral": ProviderSpec(
            prefix="mistral",
            name="Mistral",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="mistral_key",
            base_url="https://api.mistral.ai/v1",
            enabled=True,
            notes="Mistral Small/Large, OpenAI-compatible.",
        ),
        "sambanova": ProviderSpec(
            prefix="sambanova",
            name="SambaNova",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="sambanova_key",
            base_url="https://api.sambanova.ai/v1",
            enabled=True,
            notes="Free-tier Llama/Qwen, OpenAI-compatible.",
        ),
        "requesty": ProviderSpec(
            prefix="requesty",
            name="Requesty",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="requesty_key",
            base_url="https://router.requesty.ai/v1",
            enabled=True,
            notes="Multi-provider router, OpenAI-compatible.",
        ),
        "omnirouter": ProviderSpec(
            prefix="omnirouter",
            name="OmniRoute Gateway",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="omnirouter_key",
            base_url="http://127.0.0.1:20128/v1",
            enabled=True,
            notes="Local gateway key (OMNIROUTER_API_KEY); override base for cloud.",
        ),
        "pollinations": ProviderSpec(
            prefix="pollinations",
            name="Pollinations",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="pollinations_key",
            base_url="https://text.pollinations.ai/openai",
            enabled=True,
            notes="Free community tier, OpenAI-compatible.",
        ),
        "ollama": ProviderSpec(
            prefix="ollama",
            name="Ollama (local)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="",
            base_url="http://localhost:11434",
            enabled=True,
            notes="Local fallback: gpt-oss:120b, deepseek-r1:7b.",
        ),
        "cbai": ProviderSpec(
            prefix="cbai",
            name="CodeBuddy (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="",
            enabled=True,
            notes="Gateway flagship — glm-5.2 reasoning tier.",
        ),
        "kimchi": ProviderSpec(
            prefix="kimchi",
            name="Kimchi (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="free",
            key_field="",
            enabled=True,
            notes="minimax-m3 / deepseek-v4-flash research + QA tiers.",
        ),
        "ds": ProviderSpec(
            prefix="ds",
            name="DeepSeek (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="",
            enabled=False,
            notes="402 insufficient balance — disabled.",
        ),
        "kimi": ProviderSpec(
            prefix="kimi",
            name="Kimi (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="",
            enabled=False,
            notes="402 can't verify membership — disabled.",
        ),
        "gh": ProviderSpec(
            prefix="gh",
            name="GitHub Models (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="",
            enabled=False,
            notes="403 access denied (GitHub retired model APIs) — disabled.",
        ),
        "bzl": ProviderSpec(
            prefix="bzl",
            name="BazaarLink (via 9Router)",
            capabilities=_cap({"capabilities": [CAP_LLM]}),
            cost_tier="paid",
            key_field="",
            enabled=True,
            notes="Free models OK when not saturated; paid needs credit.",
        ),
    }


def key_configured(spec: ProviderSpec) -> bool:
    """True when the provider has a usable key in settings (or needs none)."""
    if not spec.key_field:
        return True
    settings = get_settings()
    return bool((getattr(settings, spec.key_field, "") or "").strip())


def provider_list() -> list[dict[str, Any]]:
    """Provider metadata for the dashboard, with key-configured status."""
    return [
        spec.to_dict(key_configured=key_configured(spec))
        for spec in provider_specs().values()
        if spec.enabled
    ]