"""Config tests: settings defaults for Telegram proxy / API base URL."""

from app.config import Settings


def test_telegram_defaults():
    s = Settings(_env_file=None)
    assert s.telegram_bot_token == ""
    assert s.telegram_chat_id == ""
    assert s.telegram_api_base_url == "https://api.telegram.org"
    assert s.telegram_proxy == ""
    assert s.public_base_url == "http://localhost:8000"


def test_telegram_custom_override(monkeypatch):
    monkeypatch.setenv("TELEGRAM_API_BASE_URL", "https://tg.example.com")
    monkeypatch.setenv("TELEGRAM_PROXY", "http://127.0.0.1:7890")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "12345")
    s = Settings(_env_file=None)
    assert s.telegram_api_base_url == "https://tg.example.com"
    assert s.telegram_proxy == "http://127.0.0.1:7890"
    assert s.telegram_chat_id == "12345"


def test_email_defaults():
    s = Settings(_env_file=None)
    assert s.smtp_host == ""
    assert s.smtp_port == 587
    assert s.smtp_username == ""
    assert s.smtp_password == ""
    assert s.email_from.startswith("Treetiti")
    assert s.email_to == ""


def test_email_custom_override(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.yandex.com")
    monkeypatch.setenv("SMTP_PORT", "465")
    monkeypatch.setenv("SMTP_USERNAME", "me@yandex.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-pass")
    monkeypatch.setenv("EMAIL_TO", "me@yandex.com")
    s = Settings(_env_file=None)
    assert s.smtp_host == "smtp.yandex.com"
    assert s.smtp_port == 465
    assert s.smtp_username == "me@yandex.com"
    assert s.smtp_password == "app-pass"
    assert s.email_to == "me@yandex.com"
