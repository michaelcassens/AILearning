import sqlite3

from flask import current_app, g

# Every human-readable value is stored as an encrypted BLOB (*_enc).
# *_idx columns hold keyed HMAC "blind indexes" so we can look values up and
# enforce uniqueness without storing them in plaintext.
SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
    id              INTEGER PRIMARY KEY,
    name_enc        BLOB NOT NULL,
    name_idx        TEXT NOT NULL UNIQUE,
    description_enc BLOB,
    is_builtin      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY,
    username_enc   BLOB NOT NULL,
    username_idx   TEXT NOT NULL UNIQUE,
    email_enc      BLOB,
    email_idx      TEXT UNIQUE,
    password_hash  TEXT NOT NULL,
    is_superuser   INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    failed_logins  INTEGER NOT NULL DEFAULT 0,
    locked_until   TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS content (
    id              INTEGER PRIMARY KEY,
    title_enc       BLOB NOT NULL,
    body_enc        BLOB,
    media_enc       BLOB,
    media_name_enc  BLOB,
    media_type_enc  BLOB,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_roles (
    content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, role_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_content_roles_role ON content_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
"""

# Encrypted columns per table, used by key rotation.
ENCRYPTED_COLUMNS = {
    "roles": ["name_enc", "description_enc"],
    "users": ["username_enc", "email_enc"],
    "content": ["title_enc", "body_enc", "media_enc", "media_name_enc", "media_type_enc"],
}


def get_db():
    if "db" not in g:
        conn = sqlite3.connect(current_app.config["DATABASE"])
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    from . import models

    db = get_db()
    db.executescript(SCHEMA)
    models.ensure_public_role()


def init_app(app):
    app.teardown_appcontext(close_db)
