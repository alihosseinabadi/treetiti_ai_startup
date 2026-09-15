"""TREEtiti AI Marketing OS — configuration.

All settings are read from environment variables (.env). Free & self-hosted.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "TREEtiti AI Marketing OS"
    api_prefix: str = "/api/v1"
    environment: str = "development"

    # --- Logging ---
    log_level: str = "INFO"

    # --- LLM Brain ---
    # Provider: "opencode" (default — the same agent runtime behind this system)
    #           or "ollama" (free local fallback)
    llm_provider: str = "opencode"

    # opencode brain
    opencode_model: str = "opencode/deepseek-v4-flash-free"
    opencode_dir: str = "."

    # --- FREE-ONLY policy (spec §30) ---
    # When true, paid providers are permanently excluded and the Model/Tool
    # routers raise a clear error instead of silently switching to a paid one.
    free_only: bool = True
    # Optional monthly budget (USD) for the later FREE_ONLY=false soft mode.
    monthly_budget: float = 0.0
    # When true, BaseAgent resolves models through the Model Router (capability
    # + free-cost filters) instead of the static per-agent map in agent_models.
    # ON since Phase 1: the core/ seed is green and the 9Router gateway is
    # wired, so agents pick capable models that all flow through the router.
    use_model_router: bool = True
    # Where versioned artifacts are written (see core/artifacts).
    artifact_dir: str = "treetiti-artifacts"
    # Health failover: after a model fails N consecutive times it is marked
    # unhealthy and the free-model chain skips it. Single-route, no battles.
    failover_threshold: int = 2

    # Seed the business brain (services, positioning, voice) into brand memory
    # on first startup so every agent is company-aware. Disable to skip.
    seed_knowledge: bool = True

    # Verified-working zero-key free models (tested against opencode endpoint).
    # Only these three returned OK; every "*:free" / "*-ultimate-free" model
    # on the marketing list returned 403 Forbidden.
    verified_free_models: dict[str, str] = {
        "deepseek-v4-flash-free": "opencode/deepseek-v4-flash-free",  # fast, reliable JSON
        "glm-4.5-flash": "zai/glm-4.5-flash",                       # fast, persuasive copy
        "glm-4.7-flash": "zai/glm-4.7-flash",                      # strongest reasoning
    }
    # Per-agent model assignment (source of truth for the 11-agent team).
    # Prefixes route to free providers:
    #   google/...       -> Google AI Studio (gemini-2.5-flash) [needs key]
    #   openrouter/...   -> OpenRouter free models (qwen coder, deepseek r1)
    #   zai,opencode/... -> opencode CLI (no key needed, geo-agnostic)
    # NOTE: opencode/... models are keyless and work from any region; google
    # and openrouter require keys that are geo-blocked for RU egress, so all
    # agents now default to keyless opencode models.
    agent_models: dict[str, str] = {
        # Research Agent  -> opencode (keyless, free)
        "market_research": "opencode/deepseek-v4-flash-free",
        # Coder Agent     -> opencode (keyless, free)
        "developer": "opencode/deepseek-v4-flash-free",
        # Content Maker   -> opencode (keyless, free)
        "content": "opencode/deepseek-v4-flash-free",
        # Analyst         -> opencode (keyless, free)
        "analytics": "opencode/deepseek-v4-flash-free",
        # Visual Designer -> opencode (keyless, free)
        "image": "opencode/deepseek-v4-flash-free",
        # Editor / QA     -> opencode (keyless, free)  [veto power]
        "editor": "opencode/deepseek-v4-flash-free",
        # SEO Specialist  -> opencode (keyless, free)
        "seo": "opencode/deepseek-v4-flash-free",
        # Kept from existing team:
        "brand": "opencode/deepseek-v4-flash-free",
        "video": "opencode/deepseek-v4-flash-free",
        "sales": "opencode/deepseek-v4-flash-free",
        "campaign": "opencode/deepseek-v4-flash-free",
    }
    # Failover keeps everything on keyless opencode models.
    agent_models_failover: dict[str, str] = {
        "developer": "opencode/deepseek-v4-flash-free",
        "analytics": "opencode/deepseek-v4-flash-free",
    }

    # Capability tier -> verified 9Router/OmniRoute model slug (spec §6 / §7).
    # This is the PRIMARY pool the Model Router ranks first; every slug flows
    # through the local gateway on 127.0.0.1:20128 (prefix "router/..." in the
    # dispatch chain). Each entry below was live-tested on 2026-09-06 and
    # returned HTTP 200.
    # Leg: C complex reasoning · B strong general · A fast / content.
    router_models: dict[str, str] = {
        # C — complex reasoning / planning / conflict (editor, qa-review)
        "reasoning": "auto/best-reasoning",
        # B — strong general (strategy, copy, research synthesis)
        "strategy": "auto/best-chat",
        "research": "auto/best-free",
        # A — fast (content, analytics, campaigns, chat)
        "content": "auto/best-coding",
        "analytics": "auto/best-coding",
        "campaign": "auto/best-coding",
        "json": "auto/best-coding",
        "fast": "auto/best-fast",
        # coding + QA lean strong general
        "coding": "auto/best-coding",
        "qa": "auto/best-free",
    }

    # Free-model chain (strongest -> weakest, verified-live first).
    #
    # IMPORTANT: Groq's compound model (groq/compound = llama-4-scout +
    # gpt-oss-120b) is the only VERIFIED-LIVE endpoint: HTTP 200 in ~1.4s.
    # Agnes "agnes-2.5-pro" is a reasoning model but the account is currently
    # OUT OF QUOTA (403 insufficient_user_quota). The 9Router/OmniRoute gateway
    # slugs used to lead, but when its upstreams are unhealthy it answers every
    # call with 502 + per-upstream error list, burning the chain budget before
    # any working provider is reached. Gateway slugs stay as fallbacks.
    free_model_chain: list[str] = [
        "groq/groq/compound",          # Groq Compound direct API — VERIFIED LIVE (~1.4s)
        "agnes/agnes-2.5-pro",         # Agnes hub direct (reasoning, quota exhausted 2026-09)
        "ghm/gpt-4.1-mini",            # GitHub Models (free premium via PAT)
        "nim/meta/llama-3.3-70b-instruct",  # NVIDIA NIM (free)
        "glm/glm-4-flash",             # Z.ai GLM free
        "cf/@cf/meta/llama-3.1-8b-instruct",  # Cloudflare Workers AI (free)
        "router/auto/best-coding",     # gateway — general (fallback)
        "router/auto/best-free",       # gateway — strong general
        "router/auto/best-reasoning",  # gateway — deep reasoning
        "router/auto/best-fast",       # gateway — speed-optimised
        "router/oc/mimo-v2.5-free",    # gateway — MiMo V2.5
        "opencode/deepseek-v4-flash-free",  # keyless last resort
    ]

    # ollama brain (fallback)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-r1:7b"
    ollama_fallback_model: str = "qwen3:8b"

    # --- Free multi-provider API keys (optional) ---
    # Set these to spread agents across free tiers and dodge rate limits.
    #   google_ai_studio_key -> powers gemini/... models
    #   groq_key             -> powers groq/... models (Llama, Qwen, etc.)
    #   openrouter_key       -> powers openrouter/... models (DeepSeek free, etc.)
    google_ai_studio_key: str = ""
    # Rotating Google keys for AI Studio free tier — the client rotates keys on
    # 429/rate-limit. Mirrors the design doc (GOOGLE_API_KEY_1..3).
    google_ai_studio_key_2: str = ""
    google_ai_studio_key_3: str = ""
    google_ai_studio_model: str = "gemini-3.6-flash"  # gemini-2.5-flash retired 2026-09
    # Image generation model — nano-banana-pro-preview = Google's free image model
    # on the same AI Studio key. Leave a space-separated fallback list.
    google_ai_studio_image_model: str = "nano-banana-pro-preview"
    groq_key: str = ""
    groq_model: str = "groq/compound"  # llama-3.3-70b-versatile retired; compound verified live 2026-09
    openrouter_key: str = ""
    openrouter_model: str = "qwen/qwen-2.5-coder-32b-instruct"
    # OpenRouter is WAF/geo-blocked on some networks ("Access denied by security
    # policy" — returned even for unauthenticated requests). Route OpenRouter
    # traffic through OPENROUTER_BASE_URL (a mirror / the local 9Router gateway)
    # and/or tunnel it via OPENROUTER_PROXY (mirrors TELEGRAM_PROXY).
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_proxy: str = ""
    # DeepInfra — text + image + video, OpenAI-compatible. Verified live.
    deepinfra_key: str = ""
    deepinfra_model: str = "deepseek-ai/DeepSeek-V3"
    # Agnes AI — OpenAI-compatible hub (image/video/audio). Verified live.
    agnes_key: str = ""
    agnes_base_url: str = "https://apihub.agnes-ai.com/v1"
    agnes_model: str = "agnes-2.5-pro"
    agnes_image_model: str = "agnes-image-2.1-flash"
    agnes_video_model: str = "agnes-video-v2.0"
    # 9Router — LOCAL gateway routing 100+ cloud models. IPv4 literal:
    # in this WSL env "localhost" resolves to ::1 where nothing listens.
    router_base_url: str = "http://127.0.0.1:20128/v1"
    router_key: str = ""
    # GitHub Models — free premium-model access via a GitHub PAT
    # (models.github.ai/inference: GPT-4.1, Claude, DeepSeek, Llama).
    github_models_key: str = ""
    github_models_model: str = "gpt-4.1-mini"
    # NVIDIA NIM — free NVIDIA-hosted Llama/Qwen/DeepSeek (build.nvidia.com).
    nim_key: str = ""
    nim_model: str = "meta/llama-3.3-70b-instruct"
    # Z.ai (Zhipu) — free GLM-4-Flash text + image/video (open.bigmodel.cn / api.z.ai).
    zai_key: str = ""
    zai_model: str = "glm-4-flash"
    # Cloudflare Workers AI — free 10k neurons/day on the edge.
    cf_key: str = ""
    cf_account_id: str = ""
    cf_model: str = "@cf/meta/llama-3.1-8b-instruct"
    # Per-key daily rate limits (requests) from the design doc. When a provider
    # key is exhausted the client fails over instead of erroring.
    rate_limit_openrouter_daily: int = 50
    rate_limit_groq_daily: int = 1440
    rate_limit_github_models_daily: int = 1000
    rate_limit_nim_daily: int = 2000
    rate_limit_zai_daily: int = 4000
    rate_limit_cf_daily: int = 10000

    # --- Database (PostgreSQL + pgvector) ---
    database_url: str = "postgresql+psycopg://treetiti:treetiti@localhost:5432/treetiti_ai_os"

    # --- Auth ---
    auth_passwordless: bool = False  # skip password check (dev/demo mode)
    auth_passwordless_login: str = "aalleeiiii"  # identifier accepted when passwordless
    admin_email: str = "admin@treetiti.com"
    admin_password: str = "change-me-in-prod"
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    # --- Webhook shared secret ---
    # When set, public state-changing webhooks (POST /leads,
    # /webhooks/publish, /webhooks/notify) require the X-Webhook-Secret
    # header to match. Leave empty ONLY for local development.
    webhook_shared_secret: str = ""

    # --- n8n ---
    n8n_url: str = "http://localhost:5678"
    n8n_api_key: str = ""

    # --- Email notifications (replaces/works alongside Telegram) ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = "TREEtiti AI <notify@treetiti.ai>"
    email_to: str = ""  # where notifications go (e.g. your Gmail)

    # --- Telegram (workflow notifications) ---
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    # Boss-only control: only these chat ids may issue commands / approve content.
    # Keep empty to allow everyone (for a public sales bot). When set to your own
    # chat id, the bot becomes a private command center and ignores others.
    telegram_boss_ids: str = ""
    # Telegram Bot API base URL. Override only for a mirror/gateway (e.g.
    # telebot mirror domains) or when the default is blocked in your region.
    telegram_api_base_url: str = "https://api.telegram.org"
    # Optional HTTP(S) proxy for Telegram traffic (e.g. http://user:pass@host:port
    # or http://127.0.0.1:8080). Useful when api.telegram.org is filtered.
    telegram_proxy: str = ""
    # Optional shared secret; when set, Telegram webhook requests must send it
    # as the X-Telegram-Bot-Api-Secret-Token header.
    telegram_webhook_secret: str = ""
    # Public URL under which this backend is reachable (used for the Telegram
    # webhook registration). e.g. https://ai.treetiti.com or an ngrok URL.
    public_base_url: str = "http://localhost:8000"

    # --- Social publishing (daily posts) ---
    # VK: free, no app approval. Token from https://vkhost.github.io (scope=wall).
    vk_access_token: str = ""
    # Optional: group id (without the minus) to post to a group wall instead of your own.
    vk_group_id: str = ""
    # LinkedIn: needs an OAuth app (https://www.linkedin.com/developers/apps).
    linkedin_access_token: str = ""
    # Author URN for the profile/company that posts, e.g. "urn:li:person:abcd" or "urn:li:organization:123".
    linkedin_author_urn: str = ""
    # Instagram (Meta Graph API): needs a Meta developer app + Instagram Business account.
    instagram_access_token: str = ""
    instagram_account_id: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
