"""Transactional email service.

Swap _send_raw for an SMTP or SendGrid implementation in production.
Configure SMTP_HOST / SENDGRID_API_KEY in .env.saas.example.
"""
import logging
from typing import Any

from app.core.config import settings

log = logging.getLogger(__name__)


async def _send_raw(to: str, subject: str, text: str) -> None:
    """Send a plain-text email. Logs in development; replace in production."""
    if getattr(settings, "SMTP_HOST", None):
        import smtplib
        import asyncio

        def _smtp() -> None:
            with smtplib.SMTP(settings.SMTP_HOST, getattr(settings, "SMTP_PORT", 587)) as s:  # type: ignore[attr-defined]
                s.starttls()
                s.login(
                    getattr(settings, "SMTP_USER", ""),
                    getattr(settings, "SMTP_PASS", ""),
                )
                msg = (
                    f"From: {getattr(settings, 'EMAIL_FROM', 'noreply@yoursaas.com')}\n"
                    f"To: {to}\nSubject: {subject}\n\n{text}"
                )
                s.sendmail(getattr(settings, "SMTP_USER", ""), [to], msg)

        await asyncio.to_thread(_smtp)
    else:
        # Development fallback — log the email instead of sending it
        log.info("[EMAIL] to=%s subject=%r\n%s", to, subject, text)


async def send_verify_email(to: str, token: str) -> None:
    app_url = getattr(settings, "APP_URL", "https://app.yoursaas.com")
    link = f"{app_url}/verify-email?token={token}"
    await _send_raw(
        to=to,
        subject="Verify your email",
        text=(
            f"Click the link below to verify your email address:\n\n{link}\n\n"
            "This link expires in 24 hours."
        ),
    )


async def send_password_reset(to: str, token: str) -> None:
    app_url = getattr(settings, "APP_URL", "https://app.yoursaas.com")
    link = f"{app_url}/reset-password?token={token}"
    await _send_raw(
        to=to,
        subject="Reset your password",
        text=(
            f"Click the link below to reset your password:\n\n{link}\n\n"
            "This link expires in 1 hour. If you did not request a reset, ignore this email."
        ),
    )
