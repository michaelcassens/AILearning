# Role Access App

A small web app where people sign in and see only the content (text and/or media)
their roles allow. Superusers see everything and are the only ones who can manage
users, roles and content. Everything stored in the database is encrypted.

Built with Python, Flask and SQLite (a relational database). Two dependencies:
`Flask` and `cryptography`.

## The access rule

| Who | What they see | Can manage users / roles / content? |
| --- | --- | --- |
| **Superuser** | Every item, whatever its roles (including untagged drafts) | Yes: create, edit, delete |
| **User with roles** (e.g. Staff) | Items tagged **Public** plus items tagged with any of their roles | No |
| **Public-only user** (no extra roles) | Items tagged **Public** only | No |
| Not signed in | Nothing, only the sign-in page | No |

* Each content item is tagged with zero or more roles. A user can see it if they
  hold **any** of those roles.
* **Public** is a built-in role that every signed-in user has automatically.
* An item with no roles is visible to superusers only, which is handy for drafts.
* The check lives in one place, `models.can_view()` / `models.list_content_for()`.
  Media downloads go through the same check, and hidden items return 404 so users
  can't probe which items exist.

## Database design

```
users ──< user_roles >── roles ──< content_roles >── content
  │                                                    (title, text, media file)
  └──< password_resets
```

| Table | Purpose |
| --- | --- |
| `users` | username, email, password hash, `is_superuser`, `is_active`, lockout counters |
| `roles` | role name and description; `Public` is built in |
| `user_roles` | which roles each user holds (many-to-many) |
| `content` | title, text body, optional media file (stored in the DB) |
| `content_roles` | which roles may see each item (many-to-many) |
| `password_resets` | one-time, expiring reset tokens (only their SHA-256 hash is stored) |

## Encryption

* **Every human-readable value is encrypted** before it reaches the database:
  usernames, emails, role names and descriptions, content titles, text, media
  bytes, file names and file types. This uses Fernet (AES + HMAC, authenticated),
  so tampered data is rejected rather than silently decrypted.
* **Passwords are hashed, not encrypted** (scrypt via Werkzeug). Nobody, not even
  a superuser, can read a password back. That's why "forgot password" sends a
  reset link instead of the old password.
* **Lookups without plaintext:** to find a user by username or email, and to keep
  role names unique, the app stores a *blind index*: a keyed HMAC of the value
  made with a separate key. The database never holds the real value.
* **What stays readable:** numeric IDs, the links between tables, yes/no flags
  and timestamps. The app needs these to run queries, and none of them reveal
  the content.
* **Keys are kept out of the database** and loaded from environment variables
  (see below). Someone who copies the `.db` file alone can't read it.
* `flask --app roleapp rotate-keys` re-encrypts everything with a new key.

If you also want the whole file encrypted (including the IDs and timestamps),
switch the SQLite driver to SQLCipher or run on PostgreSQL with encrypted
storage. The app-level encryption above still applies on top of that.

## Getting started

```bash
cd role_access_app
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create the first superuser (asks for a password)
flask --app roleapp create-superuser

# Optional: example roles, content and three demo users (passwords are printed)
flask --app roleapp seed-demo

flask --app roleapp run
```

Open http://127.0.0.1:5000 and sign in. In development, keys are generated into
`instance/keys.json` automatically and reset emails are printed to the terminal
instead of being sent.

## Using it (superuser)

* **Users → Add user:** username, password, optional email (needed for password
  resets), roles, and whether they're a superuser or active. **Edit** changes any
  of these, including setting a new password. **Delete** removes the account.
  You can't delete yourself or remove the last active superuser.
* **Roles:** add, rename, describe or delete roles. Deleting a role removes it
  from every user and item.
* **Manage content:** add a title, text, a media file (image, audio, video, PDF or
  anything else) and tick the roles that may see it.

## Forgot password

1. On the sign-in page, choose **Forgot your password?** and enter a username or
   email.
2. If the account has an email address on file, it gets a one-time link that
   expires in 30 minutes. The page shows the same message either way, so it
   can't be used to find out who has an account.
3. Choosing a new password signs the user out of all other sessions.

Users without an email on file need a superuser to set a new password for them.
Signed-in users can also change their own password under **Password**.

## Running in production

```bash
flask --app roleapp generate-keys   # store these in your secret manager
```

| Variable | Purpose |
| --- | --- |
| `APP_ENV=production` | Requires the keys below, secure cookies, and SMTP email |
| `APP_SECRET_KEY` | Signs session cookies |
| `APP_ENCRYPTION_KEYS` | Comma-separated Fernet keys; the first one encrypts, all of them decrypt |
| `APP_INDEX_KEY` | Key for blind indexes. Don't change it after data exists. |
| `APP_BASE_URL` | e.g. `https://access.example.edu`, used to build reset links |
| `APP_DATABASE` | Path to the SQLite file (default `instance/app.db`) |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_TLS`, `MAIL_FROM` | SMTP for reset emails |
| `APP_MAX_UPLOAD_MB` | Largest upload allowed (default 25) |

Run it behind HTTPS with a real WSGI server, e.g. `gunicorn "roleapp:create_app()"`.
**Back up your keys.** If you lose them, the data can't be decrypted.

## Security features

* Passwords hashed with scrypt, at least 12 characters
* Account locks for 15 minutes after 5 failed sign-ins; the error message is the
  same for wrong usernames, so it doesn't reveal which accounts exist
* CSRF tokens on every form; HttpOnly, SameSite session cookies that expire after 8 hours
* Sessions end everywhere when a password changes
* Content-Security-Policy and other security headers; uploaded HTML or SVG is
  always downloaded, never displayed, so it can't run scripts
* Safe redirects after sign-in (no open redirects)

## Tests

```bash
pip install pytest
pytest
```

The tests cover what each kind of user can see, admin access being limited to
superusers, user, role and content create/edit/delete, lockout, CSRF, the full
password-reset flow, and a check that no plaintext appears in the raw database file.
