"""
Champ Compass — Email Helper
Sends notification emails via Resend (primary) or SMTP (fallback).
"""
import structlog
from backend.config import settings

log = structlog.get_logger()


# ── Public send functions ──────────────────────────────────────────────────────

async def send_advisor_notification_email(user_email: str, request_id: str) -> None:
    """Notify admin of a new Advisor Review request."""
    subject = "New Advisor Review Request — Champ Compass Dream Builder"
    body = (
        f"A new Advisor Review request has been received.\n\n"
        f"User Email: {user_email}\n"
        f"Request ID: {request_id}\n\n"
        f"Log in to the admin dashboard to schedule the session.\n\n"
        f"— Champ Compass System"
    )
    await _dispatch_email(subject, body, to=settings.admin_notification_email, reply_to=user_email)


async def send_welcome_email(user_email: str, business_name: str) -> None:
    """Send a welcome email to a new user after signup."""
    name = business_name or "there"
    subject = "Welcome to Champ Compass!"
    body = (
        f"Hi {name},\n\n"
        f"Welcome to Champ Compass! Your account is ready.\n\n"
        f"Here's what you can do right now:\n"
        f"  • Take the Cyber & AI Readiness Assessment\n"
        f"  • Explore business ideas with the Dream Builder\n"
        f"  • Get AI-powered advice on your results\n\n"
        f"Log in any time at: http://localhost\n\n"
        f"Questions? Reply to this email — we're happy to help.\n\n"
        f"— The Champ Compass Team\n"
        f"  Champtron Systems LLC"
    )
    await _dispatch_email(subject, body, to=user_email, reply_to=settings.admin_notification_email)


async def send_signup_notification_email(user_email: str, business_name: str, user_id: str) -> None:
    """Notify admin when a new user signs up."""
    subject = "New User Signup — Champ Compass"
    body = (
        f"A new user has signed up for Champ Compass.\n\n"
        f"Email: {user_email}\n"
        f"Business Name: {business_name or 'Not provided'}\n"
        f"User ID: {user_id}\n\n"
        f"View their account in the admin dashboard:\n"
        f"http://localhost/admin.html\n\n"
        f"— Champ Compass System"
    )
    await _dispatch_email(subject, body, to=settings.admin_notification_email, reply_to=user_email)


async def send_temp_password_email(user_email: str, temp_password: str) -> None:
    """Send a temporary password to a user after admin-triggered reset."""
    subject = "Your Temporary Password — Champ Compass"
    body = (
        f"Your Champ Compass password has been reset by an administrator.\n\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Please log in immediately and change your password.\n"
        f"Visit: http://localhost\n\n"
        f"— Champ Compass System"
    )
    await _dispatch_email(
        subject, body, to=user_email, reply_to=settings.admin_notification_email
    )


# ── Internal dispatch ──────────────────────────────────────────────────────────

async def _dispatch_email(
    subject: str, body: str, to: str, reply_to: str | None = None
) -> None:
    if settings.email_provider == "resend" and settings.resend_api_key:
        await _send_via_resend(subject, body, to=to, reply_to=reply_to)
    elif settings.smtp_host and settings.smtp_user:
        await _send_via_smtp(subject, body, to=to, reply_to=reply_to)
    else:
        log.warning("email_no_provider_configured", to=to, subject=subject)


async def _send_via_resend(
    subject: str, body: str, to: str, reply_to: str | None = None
) -> None:
    try:
        import httpx
        payload = {
            "from": settings.smtp_from_email,
            "to": [to],
            "subject": subject,
            "text": body,
        }
        if reply_to:
            payload["reply_to"] = reply_to
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10.0,
            )
        if resp.status_code not in (200, 201):
            log.error("resend_email_error", status=resp.status_code, body=resp.text[:200])
        else:
            log.info("email_sent_resend", to=to)
    except Exception as exc:
        log.error("resend_email_exception", error=str(exc))


async def _send_via_smtp(
    subject: str, body: str, to: str, reply_to: str | None = None
) -> None:
    import asyncio
    import smtplib
    from email.mime.text import MIMEText

    def _send():
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email
        msg["To"] = to
        if reply_to:
            msg["Reply-To"] = reply_to
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

    try:
        await asyncio.to_thread(_send)
        log.info("email_sent_smtp", to=to)
    except Exception as exc:
        log.error("smtp_email_exception", error=str(exc))
