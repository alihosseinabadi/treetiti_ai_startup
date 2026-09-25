"""Treetiti AI Marketing OS — email notifications.

Sends brand-style emails via SMTP (stdlib only). Used by the n8n workflows and
the publish endpoint to notify the owner about leads, content approvals and
daily reports — a Telegram-free alternative for filtered networks.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import get_settings

logger = logging.getLogger("treetiti.email")


def send_email(subject: str, body_html: str, body_text: str = "") -> bool:
    """Send a notification email. Returns True on success.

    Uses SMTP_* settings. Gmail example:
      SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USERNAME=<your gmail>,
      SMTP_PASSWORD=<app password>, EMAIL_TO=<your gmail>
    """
    settings = get_settings()
    if not (settings.smtp_host and settings.email_to):
        logger.info("SMTP not configured; skipping email '%s'", subject)
        return False

    # EMAIL_FROM may be "Name <email>" or a bare address.
    from_addr = settings.email_from
    if "<" in from_addr and from_addr.rstrip().endswith(">"):
        name, _, addr = from_addr.rpartition("<")
        from_addr = (name.strip(), addr.rstrip(">"))

    msg = MIMEText(body_html, "html", "utf-8")
    if body_text:
        msg["Subject"] = subject
        msg["From"] = formataddr(from_addr)
        msg["To"] = settings.email_to
        alt = MIMEText(body_text, "plain", "utf-8")
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr(from_addr)
        msg["To"] = settings.email_to
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))
    else:
        msg["Subject"] = subject
        msg["From"] = formataddr(from_addr)
        msg["To"] = settings.email_to

    try:
        # Port 465 = implicit TLS (e.g. Gmail). Port 587 = STARTTLS.
        if int(settings.smtp_port) == 465:
            server_ctx = smtplib.SMTP_SSL(settings.smtp_host, 465, timeout=30)
        else:
            server_ctx = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)
        with server_ctx as server:
            server.ehlo()
            if int(settings.smtp_port) == 587:
                server.starttls()
                server.ehlo()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
        logger.info("email sent: %s -> %s", subject, settings.email_to)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("email send failed (%s): %s", subject, exc)
        return False


# --- helpers to build on-brand HTML emails ---

_STYLE = """\
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
       background:#09090b;color:#fafafa;padding:24px;margin:0;}
  .card{max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;
        border-radius:16px;padding:28px;}
  h1{font-size:20px;margin:0 0 12px;color:#34d399;}
  p{line-height:1.6;color:#e4e4e7;margin:8px 0;}
  .label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;
         background:#34d399;color:#09090b;font-weight:600;}
  pre{background:#09090b;border:1px solid #27272a;border-radius:10px;padding:12px;
      overflow-x:auto;font-size:13px;color:#d4d4d8;}
  .foot{margin-top:20px;font-size:12px;color:#52525b;}
</style>
"""


def email_html(title: str, rows: list[tuple[str, str]]) -> str:
    """Build a minimal premium HTML email from (label, value) rows."""
    body = "\n".join(
        f'<p><span class="label">{label}</span><br/>{value}</p>' for label, value in rows
    )
    return f"<!doctype html><html><head>{_STYLE}</head><body><div class='card'><h1>{title}</h1>{body}</div></body></html>"
