import os

import click
from flask import Flask

from . import admin, auth, db, models, views
from .config import generate_keys, load_config
from .crypto import FieldCrypto
from .security import add_security_headers, csrf_token, load_logged_in_user, verify_csrf


def create_app(config=None):
    app = Flask(__name__, instance_relative_config=True)
    os.makedirs(app.instance_path, exist_ok=True)
    load_config(app, config)
    app.extensions["crypto"] = FieldCrypto(app.config["ENCRYPTION_KEYS"], app.config["INDEX_KEY"])

    db.init_app(app)
    app.before_request(verify_csrf)
    app.before_request(load_logged_in_user)
    app.after_request(add_security_headers)
    app.jinja_env.globals["csrf_token"] = csrf_token

    app.register_blueprint(auth.bp)
    app.register_blueprint(views.bp)
    app.register_blueprint(admin.bp)

    with app.app_context():
        db.init_db()

    _register_cli(app)
    return app


def _register_cli(app):
    @app.cli.command("generate-keys")
    def generate_keys_command():
        """Print a fresh set of keys to put in your environment / secret store."""
        for name, value in generate_keys().items():
            click.echo(f"{name}={value}")

    @app.cli.command("create-superuser")
    @click.option("--username", prompt=True)
    @click.option("--email", prompt="Email (for password resets)", default="")
    @click.password_option()
    def create_superuser(username, email, password):
        """Create a superuser. Needed once, to log in for the first time."""
        minimum = app.config["PASSWORD_MIN_LENGTH"]
        if len(password) < minimum:
            raise click.ClickException(f"Password must be at least {minimum} characters.")
        try:
            models.create_user(username, password, email=email or None, is_superuser=True)
        except ValueError as exc:
            raise click.ClickException(str(exc)) from None
        click.echo(f"Superuser '{username}' created.")

    @app.cli.command("seed-demo")
    def seed_demo():
        """Load example roles, users and content to try the app out."""
        from .demo import seed

        for line in seed():
            click.echo(line)

    @app.cli.command("rotate-keys")
    def rotate_keys():
        """Re-encrypt every value with the first key in APP_ENCRYPTION_KEYS.

        Put the new key first, keep the old one after it, run this, then
        remove the old key."""
        crypto = app.extensions["crypto"]
        conn = db.get_db()
        with conn:
            for table, columns in db.ENCRYPTED_COLUMNS.items():
                for row in conn.execute(f"SELECT id, {', '.join(columns)} FROM {table}").fetchall():
                    values = [crypto.rotate(row[c]) for c in columns]
                    assignments = ", ".join(f"{c} = ?" for c in columns)
                    conn.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*values, row["id"]))
        click.echo("All encrypted values now use the primary key.")
