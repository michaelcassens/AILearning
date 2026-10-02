import smtplib
from email.message import EmailMessage

from flask import current_app


def send_mail(to, subject, body):
    cfg = current_app.config
    backend = cfg["MAIL_BACKEND"]
    if backend == "memory":  # tests
        current_app.extensions.setdefault("outbox", []).append(
            {"to": to, "subject": subject, "body": body}
        )
        return
    if backend == "console":  # local development only
        current_app.logger.warning("EMAIL to %s | %s\n%s", to, subject, body)
        return

    msg = EmailMessage()
    msg["From"] = cfg["MAIL_FROM"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"], timeout=15) as smtp:
        if cfg["MAIL_USE_TLS"]:
            smtp.starttls()
        if cfg["MAIL_USERNAME"]:
            smtp.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
        smtp.send_message(msg)
