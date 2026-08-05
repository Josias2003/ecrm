import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_email(to_email: str | None, subject: str, body: str) -> bool:
    if not to_email or "@" not in to_email:
        return False
    if not settings.SMTP_HOST:
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
    return True
