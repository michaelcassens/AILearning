import hmac
import secrets
from functools import wraps
from urllib.parse import urlparse

from flask import abort, current_app, g, redirect, request, session, url_for

from . import models


def password_fingerprint(user):
    """Stored in the session; changes whenever the password hash changes,
    which signs the user out everywhere after a password reset."""
    return current_app.extensions["crypto"].fingerprint(user.password_hash)


def load_logged_in_user():
    g.user = None
    user_id = session.get("uid")
    if user_id is None:
        return
    user = models.get_user(user_id)
    if (
        user is not None
        and user.is_active
        and hmac.compare_digest(session.get("pwv", ""), password_fingerprint(user))
    ):
        g.user = user
    else:
        session.clear()


def log_in(user):
    session.clear()  # prevent session fixation
    session.permanent = True
    session["uid"] = user.id
    session["pwv"] = password_fingerprint(user)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if g.user is None:
            return redirect(url_for("auth.login", next=request.full_path))
        return view(*args, **kwargs)

    return wrapped


def superuser_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if g.user is None:
            return redirect(url_for("auth.login", next=request.full_path))
        if not g.user.is_superuser:
            abort(403)
        return view(*args, **kwargs)

    return wrapped


def safe_next(target):
    """Only allow redirects back to a path on this site."""
    if not target or not target.startswith("/") or target.startswith("//") or "\\" in target:
        return None
    parsed = urlparse(target)
    return target if not parsed.scheme and not parsed.netloc else None


# --------------------------------------------------------------------------- CSRF

def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def verify_csrf():
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    sent = request.form.get("csrf_token", "")
    expected = session.get("csrf", "")
    if not expected or not hmac.compare_digest(sent, expected):
        abort(400, "Invalid or missing CSRF token. Reload the page and try again.")


def add_security_headers(response):
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data:; media-src 'self'; object-src 'none'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    # Keeps reset tokens in URLs from leaking through the Referer header.
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if g.get("user") is not None:
        response.headers.setdefault("Cache-Control", "no-store")
    return response
