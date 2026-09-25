"""Treetiti AI Marketing OS — configuration.

All settings are read from environment variables (.env). Free & self-hosted.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "Treetiti AI Marketing OS"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://treetiti.com,https://www.treetiti.com"

    # --- LLM Brain ---
    # Provider: "opencode" (default — the same agent runtime behind this system),
    #           "ollama" (free local fallback) or "pollinations" (keyless free tier)
    llm_provider: str = "opencode"

    # opencode brain
    opencode_model: str = "opencode/deepseek-v4-flash-free"
    opencode_dir: str = "."
    # Battle mode: two models answer, a judge picks the winner.
    battle_mode: bool = False
    battle_model_a: str = "opencode/deepseek-v4-flash-free"
    battle_model_b: str = "zai/glm-4.7-flash"
    battle_judge_model: str = "zai/glm-4.5-flash"
    # Arena auto-failover: when a model fails N times in a row it is marked
    # unhealthy and the arena automatically switches to the other model.
    battle_failover: bool = True
    battle_failover_threshold: int = 2

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
        "market_research": "opencode/deepseek-v4-flash-free",
        "developer": "opencode/qwen3-coder-free",
        "content": "zai/glm-4.5-flash",
        "analytics": "opencode/deepseek-v4-flash-free",
        "image": "zai/glm-4.7-flash",
        "editor": "zai/glm-4.7-flash",
        "seo": "opencode/deepseek-v4-flash-free",
        "brand": "zai/glm-4.5-flash",
        "video": "zai/glm-4.5-flash",
        "sales": "zai/glm-4.5-flash",
        "campaign": "zai/glm-4.7-flash",
    }
    # Failover per agent (editor has no failover by design – veto must be reliable).
    agent_models_failover: dict[str, str] = {
        "market_research": "zai/glm-4.5-flash",
        "developer": "opencode/deepseek-v4-flash-free",
        "content": "opencode/deepseek-v4-flash-free",
        "analytics": "zai/glm-4.5-flash",
        "image": "opencode/deepseek-v4-flash-free",
        "seo": "zai/glm-4.5-flash",
        "brand": "opencode/deepseek-v4-flash-free",
        "video": "opencode/deepseek-v4-flash-free",
        "sales": "opencode/deepseek-v4-flash-free",
        "campaign": "opencode/deepseek-v4-flash-free",
    }

    # ollama brain (fallback)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-r1:7b"
    ollama_fallback_model: str = "qwen3:8b"

    # pollinations brain (keyless free tier — no signup, works out of the box)
    pollinations_model: str = "openai"

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
    google_ai_studio_model: str = "gemini-2.5-flash"
    # Image generation model (Nano Banana = Google's free image model on the
    # same AI Studio key). Leave a space-separated fallback list.
    google_ai_studio_image_model: str = "gemini-2.5-flash-image"
    groq_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_key: str = ""
    openrouter_model: str = "deepseek/deepseek-v4-flash:free"
    # Per-key daily rate limits (requests) from the design doc. When a provider
    # key is exhausted the client fails over instead of erroring.
    rate_limit_openrouter_daily: int = 50
    rate_limit_groq_daily: int = 1440

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

    # --- n8n ---
    n8n_url: str = "http://localhost:5678"
    n8n_api_key: str = ""

    # --- Email notifications (replaces/works alongside Telegram) ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = "Treetiti AI <notify@treetiti.ai>"
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
