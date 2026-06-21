"""
SmallBiz Advisor — Email Helper
Sends admin notification emails for advisor review requests.
Uses Resend (primary) or falls back to SMTP.
"""
import structlog
from backend.config import settings

log = structlog.get_logger()


async def send_advisor_notification_email(user_email: str, request_id: str) -> None:
    """
    Send an email to the admin notifying them of a new advisor review request.
    Tries Resend first, falls back to SMTP if configured.
    Logs errors but does NOT raise — caller handles gracefully.
    """
    subject = "New Advisor Review Request — SmallBiz Dream Builder"
    body = (
        f"A new Advisor Review request has been received.\n\n"
        f"User Email: {user_email}\n"
        f"Request ID: {request_id}\n\n"
        f"Please log in to the admin dashboard to schedule the session.\n\n"
        f"— SmallBiz Advisor System"
    )

    if settings.email_provider == "resend" and settings.resend_api_key:
        await _send_via_resend(subject, body, user_email)
    elif settings.smtp_host and settings.smtp_user:
        await _send_via_smtp(subject, body, user_email)
    else:
        log.warning("email_no_provider_configured", request_id=request_id)


async def _send_via_resend(subject: str, body: str, user_email: str) -> None:
    """Send via Resend API."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.smtp_from_email,
                    "to": [settings.admin_notification_email],
                    "subject": subject,
                    "text": body,
                    "reply_to": user_email,
                },
                timeout=10.0,
            )
            if resp.status_code not in (200, 201):
                log.error("resend_email_error", status=resp.status_code, body=resp.text[:200])
            else:
                log.info("advisor_email_sent_resend", to=settings.admin_notification_email)
    except Exception as exc:
        log.error("resend_email_exception", error=str(exc))


async def _send_via_smtp(subject: str, body: str, user_email: str) -> None:
    """Send via SMTP using smtplib (sync, in thread)."""
    import asyncio
    import smtplib
    from email.mime.text import MIMEText

    def _send():
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email
        msg["To"] = settings.admin_notification_email
        msg["Reply-To"] = user_email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

    try:
        await asyncio.to_thread(_send)
        log.info("advisor_email_sent_smtp", to=settings.admin_notification_email)
    except Exception as exc:
        log.error("smtp_email_exception", error=str(exc))
