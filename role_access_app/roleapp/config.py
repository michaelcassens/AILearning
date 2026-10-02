import base64
import json
import os
import secrets
from datetime import timedelta

from cryptography.fernet import Fernet


KEY_NAMES = ("APP_SECRET_KEY", "APP_ENCRYPTION_KEYS", "APP_INDEX_KEY")


def generate_keys():
    return {
        "APP_SECRET_KEY": secrets.token_urlsafe(48),
        "APP_ENCRYPTION_KEYS": Fernet.generate_key().decode(),
        "APP_INDEX_KEY": base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
    }


def _env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_config(app, overrides=None):
    env = os.environ.get("APP_ENV", "development")
    production = env == "production"
    app.config.update(
        APP_ENV=env,
        DATABASE=os.environ.get("APP_DATABASE", os.path.join(app.instance_path, "app.db")),
        # Used to build password-reset links; never trust the Host header for that.
        BASE_URL=os.environ.get("APP_BASE_URL"),
        MAX_CONTENT_LENGTH=int(os.environ.get("APP_MAX_UPLOAD_MB", "25")) * 1024 * 1024,
        PASSWORD_MIN_LENGTH=12,
        RESET_TOKEN_MINUTES=30,
        MAX_FAILED_LOGINS=5,
        LOCKOUT_MINUTES=15,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=production,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
        MAIL_BACKEND=os.environ.get("MAIL_BACKEND", "smtp" if production else "console"),
        MAIL_SERVER=os.environ.get("MAIL_SERVER", "localhost"),
        MAIL_PORT=int(os.environ.get("MAIL_PORT", "587")),
        MAIL_USERNAME=os.environ.get("MAIL_USERNAME"),
        MAIL_PASSWORD=os.environ.get("MAIL_PASSWORD"),
        MAIL_USE_TLS=_env_bool("MAIL_USE_TLS", True),
        MAIL_FROM=os.environ.get("MAIL_FROM", "no-reply@example.edu"),
    )
    if overrides:
        app.config.update(overrides)
    _load_keys(app, production)
    if production and not app.config["BASE_URL"]:
        raise RuntimeError("APP_BASE_URL must be set in production (used for reset links).")


def _load_keys(app, production):
    if all(app.config.get(k) for k in ("SECRET_KEY", "ENCRYPTION_KEYS", "INDEX_KEY")):
        return  # supplied directly (e.g. by tests)
    keys = {name: os.environ.get(name) for name in KEY_NAMES}
    if not all(keys.values()):
        if production:
            raise RuntimeError(
                "APP_SECRET_KEY, APP_ENCRYPTION_KEYS and APP_INDEX_KEY must be set in production. "
                "Run `flask --app roleapp generate-keys`."
            )
        keys = _dev_keys(app)
    app.config["SECRET_KEY"] = keys["APP_SECRET_KEY"]
    # Comma-separated; the first key encrypts, every listed key can decrypt.
    app.config["ENCRYPTION_KEYS"] = [
        k.strip() for k in keys["APP_ENCRYPTION_KEYS"].split(",") if k.strip()
    ]
    app.config["INDEX_KEY"] = keys["APP_INDEX_KEY"]


def _dev_keys(app):
    """Development only: persist generated keys in instance/keys.json."""
    path = os.path.join(app.instance_path, "keys.json")
    if os.path.exists(path):
        with open(path) as fh:
            return json.load(fh)
    keys = generate_keys()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as fh:
        json.dump(keys, fh, indent=2)
    app.logger.warning("Generated development keys in %s. Do not use these in production.", path)
    return keys
