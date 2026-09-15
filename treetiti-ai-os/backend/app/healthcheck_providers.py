"""TREEtiti AI OS — provider health check.

Tests every configured LLM provider + model with a real chat request and reports
status + latency. Run:  PYTHONPATH=. python app/healthcheck_providers.py
"""
import time
from app.config import get_settings
from app.llm import _dispatch_provider


def main() -> None:
    settings = get_settings()
    probes = [
        ("router/auto/best-coding", settings.router_key, "gateway general fast"),
        ("router/auto/best-free", settings.router_key, "gateway strong general"),
        ("router/auto/best-reasoning", settings.router_key, "gateway reasoning"),
        ("router/auto/best-fast", settings.router_key, "gateway speed"),
        ("router/oc/mimo-v2.5-free", settings.router_key, "MiMo V2.5 via gateway"),
        ("groq/groq/compound", settings.groq_key, "Groq flagship"),
        ("groq/qwen/qwen3.6-27b", settings.groq_key, "Groq Qwen"),
        ("groq/openai/gpt-oss-20b", settings.groq_key, "Groq GPT-OSS"),
        ("agnes/agnes-2.5-pro", settings.agnes_key, "hub pro"),
        ("google/gemini-3.6-flash", settings.google_ai_studio_key, "AI Studio"),
        ("deepinfra/deepseek-ai/DeepSeek-V3", settings.deepinfra_key, "flagship DI"),
        ("openrouter/deepseek/deepseek-v4-flash", settings.openrouter_key, "OR (WAF?)"),
        ("ghm/gpt-4.1-mini", settings.github_models_key, "GitHub Models free"),
        ("nim/meta/llama-3.3-70b-instruct", settings.nim_key, "NVIDIA NIM free"),
        ("glm/glm-4-flash", settings.zai_key, "Z.ai GLM free"),
        ("cf/@cf/meta/llama-3.1-8b-instruct", settings.cf_key, "Cloudflare free"),
    ]
    print(f"{'MODEL':<60} {'STATUS':<12} {'LATENCY':<10} NOTE")
    print("-" * 110)
    for model, key, note in probes:
        if not key:
            print(f"{model:<60} {'NO KEY':<12} {'-':<10} {note}")
            continue
        t0 = time.time()
        try:
            out = _dispatch_provider("you are a test bot", "reply with exactly: OK", model, 0.1, 60)
            ms = int((time.time() - t0) * 1000)
            ok = "OK" if out and "OK" in out else "ODD"
            print(f"{model:<60} {ok:<12} {ms:>4}ms  {note}  -> {out.strip()[:20]!r}")
        except Exception as exc:  # noqa: BLE001
            ms = int((time.time() - t0) * 1000)
            msg = str(exc).split("\n")[0][:70]
            print(f"{model:<60} {'FAIL':<12} {ms:>4}ms  {note}  {msg}")


if __name__ == "__main__":
    main()
