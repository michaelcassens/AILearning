from flask import (
    Blueprint,
    current_app,
    flash,
    g,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

from . import models
from .mailer import send_mail
from .security import log_in, login_required, safe_next

bp = Blueprint("auth", __name__)

GENERIC_LOGIN_ERROR = "Invalid username or password, or the account is locked."
_dummy_hash = None


def validate_password(password, confirm):
    minimum = current_app.config["PASSWORD_MIN_LENGTH"]
    if len(password) < minimum:
        return f"Password must be at least {minimum} characters."
    if password != confirm:
        return "Passwords do not match."
    return None


def _check_against_dummy(password):
    """Spend the same time hashing when the user doesn't exist, so response
    timing doesn't reveal which usernames are valid."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = generate_password_hash("dummy-password-for-timing")
    check_password_hash(_dummy_hash, password)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if g.user:
        return redirect(url_for("views.dashboard"))
    if request.method == "POST":
        identifier = request.form.get("username", "")
        password = request.form.get("password", "")
        user = models.find_user_by_login(identifier)
        if user is None:
            _check_against_dummy(password)
        elif user.is_active and not user.is_locked:
            if check_password_hash(user.password_hash, password):
                models.clear_failed_logins(user.id)
                log_in(user)
                return redirect(safe_next(request.args.get("next")) or url_for("views.dashboard"))
            models.record_failed_login(user.id)
        else:
            _check_against_dummy(password)
        flash(GENERIC_LOGIN_ERROR, "error")
    return render_template("login.html")


@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("You have been signed out.", "info")
    return redirect(url_for("auth.login"))


@bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        user = models.find_user_by_login(request.form.get("identifier", ""))
        if user and user.is_active:
            if user.email:
                token = models.create_reset_token(user.id)
                base = current_app.config["BASE_URL"]
                path = url_for("auth.reset_password", token=token)
                link = base.rstrip("/") + path if base else url_for(
                    "auth.reset_password", token=token, _external=True
                )
                minutes = current_app.config["RESET_TOKEN_MINUTES"]
                send_mail(
                    user.email,
                    "Reset your password",
                    f"Hello {user.username},\n\n"
                    f"Use this link to choose a new password. It expires in {minutes} minutes "
                    f"and can only be used once:\n\n{link}\n\n"
                    "If you didn't ask for this, you can ignore this email.",
                )
            else:
                current_app.logger.warning(
                    "Password reset requested for user id %s, who has no email on file.", user.id
                )
        # Same answer either way so this page can't be used to discover accounts.
        flash(
            "If that account exists and has an email address on file, a reset link has been sent. "
            "Otherwise, contact an administrator.",
            "info",
        )
        return redirect(url_for("auth.login"))
    return render_template("forgot_password.html")


@bp.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    user = models.user_for_reset_token(token)
    if user is None:
        flash("That reset link is invalid or has expired. Please request a new one.", "error")
        return redirect(url_for("auth.forgot_password"))
    if request.method == "POST":
        password = request.form.get("password", "")
        error = validate_password(password, request.form.get("confirm", ""))
        if error:
            flash(error, "error")
        else:
            models.set_password(user.id, password)
            flash("Your password has been changed. Please sign in.", "info")
            return redirect(url_for("auth.login"))
    return render_template("reset_password.html")


@bp.route("/account/password", methods=["GET", "POST"])
@login_required
def change_password():
    if request.method == "POST":
        if not check_password_hash(g.user.password_hash, request.form.get("current", "")):
            flash("Your current password is incorrect.", "error")
        else:
            password = request.form.get("password", "")
            error = validate_password(password, request.form.get("confirm", ""))
            if error:
                flash(error, "error")
            else:
                models.set_password(g.user.id, password)
                log_in(models.get_user(g.user.id))  # keep this session, end all others
                flash("Your password has been changed.", "info")
                return redirect(url_for("views.dashboard"))
    return render_template("change_password.html")
