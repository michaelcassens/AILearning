"""Data access layer. All encryption/decryption happens here, so the rest of
the app only ever sees plaintext dataclasses."""
import hashlib
import secrets
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from flask import current_app
from werkzeug.security import generate_password_hash

from .db import get_db

PUBLIC_ROLE_NAME = "Public"


def _crypto():
    return current_app.extensions["crypto"]


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat(timespec="seconds")


@dataclass
class Role:
    id: int
    name: str
    description: str
    is_builtin: bool


@dataclass
class User:
    id: int
    username: str
    email: str | None
    password_hash: str
    is_superuser: bool
    is_active: bool
    failed_logins: int
    locked_until: datetime | None
    created_at: str
    role_ids: set = field(default_factory=set)

    @property
    def is_locked(self):
        return self.locked_until is not None and self.locked_until > _now()


@dataclass
class Content:
    id: int
    title: str
    body: str | None
    media_name: str | None
    media_type: str | None
    created_at: str
    updated_at: str
    role_ids: set = field(default_factory=set)
    media: bytes | None = None

    @property
    def has_media(self):
        return self.media_name is not None


# --------------------------------------------------------------------------- roles

def ensure_public_role():
    db = get_db()
    if db.execute("SELECT 1 FROM roles WHERE is_builtin = 1").fetchone() is None:
        c = _crypto()
        with db:
            db.execute(
                "INSERT INTO roles (name_enc, name_idx, description_enc, is_builtin) VALUES (?, ?, ?, 1)",
                (
                    c.encrypt(PUBLIC_ROLE_NAME),
                    c.blind_index(PUBLIC_ROLE_NAME),
                    c.encrypt("Visible to every signed-in user."),
                ),
            )


def public_role_id():
    return get_db().execute("SELECT id FROM roles WHERE is_builtin = 1").fetchone()["id"]


def _role_from_row(row):
    c = _crypto()
    return Role(
        id=row["id"],
        name=c.decrypt(row["name_enc"]),
        description=c.decrypt(row["description_enc"]) or "",
        is_builtin=bool(row["is_builtin"]),
    )


def list_roles():
    rows = get_db().execute("SELECT * FROM roles").fetchall()
    roles = [_role_from_row(r) for r in rows]
    # Names are encrypted, so sort after decrypting. Public always first.
    return sorted(roles, key=lambda r: (not r.is_builtin, r.name.casefold()))


def get_role(role_id):
    row = get_db().execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
    return _role_from_row(row) if row else None


def create_role(name, description=""):
    c = _crypto()
    db = get_db()
    try:
        with db:
            cur = db.execute(
                "INSERT INTO roles (name_enc, name_idx, description_enc) VALUES (?, ?, ?)",
                (c.encrypt(name), c.blind_index(name), c.encrypt(description)),
            )
    except sqlite3.IntegrityError:
        raise ValueError(f"A role named '{name}' already exists.") from None
    return cur.lastrowid


def update_role(role_id, name, description=""):
    role = get_role(role_id)
    if role is None:
        raise LookupError("Role not found.")
    if role.is_builtin and name.strip().casefold() != role.name.casefold():
        raise ValueError("The built-in Public role cannot be renamed.")
    c = _crypto()
    db = get_db()
    try:
        with db:
            db.execute(
                "UPDATE roles SET name_enc = ?, name_idx = ?, description_enc = ? WHERE id = ?",
                (c.encrypt(name), c.blind_index(name), c.encrypt(description), role_id),
            )
    except sqlite3.IntegrityError:
        raise ValueError(f"A role named '{name}' already exists.") from None


def delete_role(role_id):
    role = get_role(role_id)
    if role is None:
        raise LookupError("Role not found.")
    if role.is_builtin:
        raise ValueError("The built-in Public role cannot be deleted.")
    db = get_db()
    with db:
        db.execute("DELETE FROM roles WHERE id = ?", (role_id,))


def _valid_role_ids(role_ids):
    existing = {r["id"] for r in get_db().execute("SELECT id FROM roles").fetchall()}
    return {int(r) for r in role_ids} & existing


# --------------------------------------------------------------------------- users

def _user_from_row(row):
    c = _crypto()
    role_ids = {
        r["role_id"]
        for r in get_db().execute("SELECT role_id FROM user_roles WHERE user_id = ?", (row["id"],))
    }
    return User(
        id=row["id"],
        username=c.decrypt(row["username_enc"]),
        email=c.decrypt(row["email_enc"]),
        password_hash=row["password_hash"],
        is_superuser=bool(row["is_superuser"]),
        is_active=bool(row["is_active"]),
        failed_logins=row["failed_logins"],
        locked_until=datetime.fromisoformat(row["locked_until"]) if row["locked_until"] else None,
        created_at=row["created_at"],
        role_ids=role_ids,
    )


def get_user(user_id):
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _user_from_row(row) if row else None


def find_user_by_login(identifier):
    """Look a user up by username or email via the blind indexes."""
    if not identifier or not identifier.strip():
        return None
    idx = _crypto().blind_index(identifier)
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE username_idx = ?", (idx,)).fetchone()
    if row is None:
        row = db.execute("SELECT * FROM users WHERE email_idx = ?", (idx,)).fetchone()
    return _user_from_row(row) if row else None


def list_users():
    users = [_user_from_row(r) for r in get_db().execute("SELECT * FROM users").fetchall()]
    return sorted(users, key=lambda u: u.username.casefold())


def count_active_superusers(excluding=None):
    row = get_db().execute(
        "SELECT COUNT(*) AS n FROM users WHERE is_superuser = 1 AND is_active = 1 AND id != ?",
        (excluding or -1,),
    ).fetchone()
    return row["n"]


def _email_fields(email):
    c = _crypto()
    email = (email or "").strip() or None
    return (c.encrypt(email), c.blind_index(email) if email else None)


def create_user(username, password, email=None, role_ids=(), is_superuser=False, is_active=True):
    c = _crypto()
    db = get_db()
    now = _iso(_now())
    email_enc, email_idx = _email_fields(email)
    try:
        with db:
            cur = db.execute(
                """INSERT INTO users (username_enc, username_idx, email_enc, email_idx, password_hash,
                                      is_superuser, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    c.encrypt(username.strip()),
                    c.blind_index(username),
                    email_enc,
                    email_idx,
                    generate_password_hash(password),
                    int(is_superuser),
                    int(is_active),
                    now,
                    now,
                ),
            )
            _set_user_roles(cur.lastrowid, role_ids)
    except sqlite3.IntegrityError:
        raise ValueError("That username or email is already in use.") from None
    return cur.lastrowid


def _set_user_roles(user_id, role_ids):
    db = get_db()
    db.execute("DELETE FROM user_roles WHERE user_id = ?", (user_id,))
    # Public is implicit for everyone, so it is never stored per user.
    ids = _valid_role_ids(role_ids) - {public_role_id()}
    db.executemany(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [(user_id, r) for r in ids]
    )


def update_user(user_id, username, email, role_ids, is_superuser, is_active, password=None):
    c = _crypto()
    db = get_db()
    email_enc, email_idx = _email_fields(email)
    try:
        with db:
            db.execute(
                """UPDATE users SET username_enc = ?, username_idx = ?, email_enc = ?, email_idx = ?,
                                    is_superuser = ?, is_active = ?, updated_at = ?
                   WHERE id = ?""",
                (
                    c.encrypt(username.strip()),
                    c.blind_index(username),
                    email_enc,
                    email_idx,
                    int(is_superuser),
                    int(is_active),
                    _iso(_now()),
                    user_id,
                ),
            )
            _set_user_roles(user_id, role_ids)
    except sqlite3.IntegrityError:
        raise ValueError("That username or email is already in use.") from None
    if password:
        set_password(user_id, password)


def delete_user(user_id):
    db = get_db()
    with db:
        db.execute("DELETE FROM users WHERE id = ?", (user_id,))


def set_password(user_id, password):
    """Set a new password, clear any lockout and burn outstanding reset links."""
    db = get_db()
    with db:
        db.execute(
            """UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ?
               WHERE id = ?""",
            (generate_password_hash(password), _iso(_now()), user_id),
        )
        db.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))


def record_failed_login(user_id):
    cfg = current_app.config
    db = get_db()
    with db:
        db.execute("UPDATE users SET failed_logins = failed_logins + 1 WHERE id = ?", (user_id,))
        row = db.execute("SELECT failed_logins FROM users WHERE id = ?", (user_id,)).fetchone()
        if row["failed_logins"] >= cfg["MAX_FAILED_LOGINS"]:
            until = _now() + timedelta(minutes=cfg["LOCKOUT_MINUTES"])
            db.execute(
                "UPDATE users SET failed_logins = 0, locked_until = ? WHERE id = ?",
                (_iso(until), user_id),
            )


def clear_failed_logins(user_id):
    db = get_db()
    with db:
        db.execute(
            "UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", (user_id,)
        )


# --------------------------------------------------------------------------- password reset

def _token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def create_reset_token(user_id):
    """Returns the raw token. Only its SHA-256 hash is stored."""
    token = secrets.token_urlsafe(32)
    expires = _now() + timedelta(minutes=current_app.config["RESET_TOKEN_MINUTES"])
    db = get_db()
    with db:
        db.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
        db.execute(
            "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
            (user_id, _token_hash(token), _iso(expires)),
        )
    return token


def user_for_reset_token(token):
    row = get_db().execute(
        "SELECT user_id, expires_at FROM password_resets WHERE token_hash = ? AND used = 0",
        (_token_hash(token),),
    ).fetchone()
    if row is None or datetime.fromisoformat(row["expires_at"]) < _now():
        return None
    user = get_user(row["user_id"])
    return user if user and user.is_active else None


# --------------------------------------------------------------------------- content

def _content_role_ids(content_id):
    return {
        r["role_id"]
        for r in get_db().execute(
            "SELECT role_id FROM content_roles WHERE content_id = ?", (content_id,)
        )
    }


def _content_from_row(row, include_media=False):
    c = _crypto()
    return Content(
        id=row["id"],
        title=c.decrypt(row["title_enc"]),
        body=c.decrypt(row["body_enc"]),
        media_name=c.decrypt(row["media_name_enc"]),
        media_type=c.decrypt(row["media_type_enc"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        role_ids=_content_role_ids(row["id"]),
        media=c.decrypt_bytes(row["media_enc"]) if include_media else None,
    )


_CONTENT_COLS = "id, title_enc, body_enc, media_name_enc, media_type_enc, created_at, updated_at"


def get_content(content_id, include_media=False):
    cols = _CONTENT_COLS + (", media_enc" if include_media else "")
    row = get_db().execute(f"SELECT {cols} FROM content WHERE id = ?", (content_id,)).fetchone()
    return _content_from_row(row, include_media) if row else None


def list_all_content():
    rows = get_db().execute(
        f"SELECT {_CONTENT_COLS} FROM content ORDER BY updated_at DESC, id DESC"
    ).fetchall()
    return [_content_from_row(r) for r in rows]


def effective_role_ids(user):
    return set(user.role_ids) | {public_role_id()}


def can_view(user, content):
    """THE access rule: superusers see everything; everyone else needs to hold
    at least one of the roles the item is tagged with."""
    if user is None:
        return False
    if user.is_superuser:
        return True
    return bool(content.role_ids & effective_role_ids(user))


def list_content_for(user):
    if user.is_superuser:
        return list_all_content()
    role_ids = sorted(effective_role_ids(user))
    placeholders = ",".join("?" * len(role_ids))
    rows = get_db().execute(
        f"""SELECT {_CONTENT_COLS} FROM content
            WHERE id IN (SELECT content_id FROM content_roles WHERE role_id IN ({placeholders}))
            ORDER BY updated_at DESC, id DESC""",
        role_ids,
    ).fetchall()
    return [_content_from_row(r) for r in rows]


def _set_content_roles(content_id, role_ids):
    db = get_db()
    db.execute("DELETE FROM content_roles WHERE content_id = ?", (content_id,))
    db.executemany(
        "INSERT INTO content_roles (content_id, role_id) VALUES (?, ?)",
        [(content_id, r) for r in _valid_role_ids(role_ids)],
    )


def create_content(title, body, role_ids, media=None, created_by=None):
    """``media`` is an optional (bytes, filename, mimetype) tuple."""
    c = _crypto()
    data, name, mimetype = media or (None, None, None)
    now = _iso(_now())
    db = get_db()
    with db:
        cur = db.execute(
            """INSERT INTO content (title_enc, body_enc, media_enc, media_name_enc, media_type_enc,
                                    created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                c.encrypt(title),
                c.encrypt(body or None),
                c.encrypt_bytes(data),
                c.encrypt(name),
                c.encrypt(mimetype),
                created_by,
                now,
                now,
            ),
        )
        _set_content_roles(cur.lastrowid, role_ids)
    return cur.lastrowid


def update_content(content_id, title, body, role_ids, media=None, remove_media=False):
    c = _crypto()
    db = get_db()
    with db:
        db.execute(
            "UPDATE content SET title_enc = ?, body_enc = ?, updated_at = ? WHERE id = ?",
            (c.encrypt(title), c.encrypt(body or None), _iso(_now()), content_id),
        )
        if media or remove_media:
            data, name, mimetype = media or (None, None, None)
            db.execute(
                """UPDATE content SET media_enc = ?, media_name_enc = ?, media_type_enc = ?
                   WHERE id = ?""",
                (c.encrypt_bytes(data), c.encrypt(name), c.encrypt(mimetype), content_id),
            )
        _set_content_roles(content_id, role_ids)


def delete_content(content_id):
    db = get_db()
    with db:
        db.execute("DELETE FROM content WHERE id = ?", (content_id,))
