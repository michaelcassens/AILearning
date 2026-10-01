"""Superuser-only administration: users, roles and content (create, edit, delete)."""
from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for

from . import models
from .auth import validate_password
from .security import superuser_required

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.before_request
@superuser_required
def _guard():
    """Every route in this blueprint requires a superuser."""


def _selected_role_ids():
    return [int(r) for r in request.form.getlist("roles") if r.isdigit()]


@bp.route("/")
def index():
    return redirect(url_for("admin.users"))


# --------------------------------------------------------------------------- users

@bp.route("/users")
def users():
    roles = {r.id: r for r in models.list_roles()}
    return render_template("admin/users.html", users=models.list_users(), roles=roles)


@bp.route("/users/new", methods=["GET", "POST"])
def user_new():
    form = request.form
    if request.method == "POST":
        username = form.get("username", "").strip()
        password = form.get("password", "")
        error = None if username else "Username is required."
        error = error or validate_password(password, form.get("confirm", ""))
        if not error:
            try:
                models.create_user(
                    username,
                    password,
                    email=form.get("email"),
                    role_ids=_selected_role_ids(),
                    is_superuser=bool(form.get("is_superuser")),
                    is_active=bool(form.get("is_active")),
                )
            except ValueError as exc:
                error = str(exc)
            else:
                flash(f"User '{username}' created.", "info")
                return redirect(url_for("admin.users"))
        flash(error, "error")
    return render_template("admin/user_form.html", user=None, roles=models.list_roles())


@bp.route("/users/<int:user_id>/edit", methods=["GET", "POST"])
def user_edit(user_id):
    user = models.get_user(user_id) or abort(404)
    form = request.form
    if request.method == "POST":
        username = form.get("username", "").strip()
        password = form.get("password", "")
        is_superuser = bool(form.get("is_superuser"))
        is_active = bool(form.get("is_active"))
        error = None if username else "Username is required."
        if password and not error:
            error = validate_password(password, form.get("confirm", ""))
        if (
            not error
            and user.is_superuser
            and (not is_superuser or not is_active)
            and models.count_active_superusers(excluding=user.id) == 0
        ):
            error = "You can't remove or deactivate the last active superuser."
        if not error:
            try:
                models.update_user(
                    user.id,
                    username,
                    form.get("email"),
                    _selected_role_ids(),
                    is_superuser,
                    is_active,
                    password=password or None,
                )
            except ValueError as exc:
                error = str(exc)
            else:
                flash(f"User '{username}' updated.", "info")
                return redirect(url_for("admin.users"))
        flash(error, "error")
    return render_template("admin/user_form.html", user=user, roles=models.list_roles())


@bp.route("/users/<int:user_id>/delete", methods=["POST"])
def user_delete(user_id):
    user = models.get_user(user_id) or abort(404)
    if user.id == g.user.id:
        flash("You can't delete your own account.", "error")
    elif user.is_superuser and models.count_active_superusers(excluding=user.id) == 0:
        flash("You can't delete the last active superuser.", "error")
    else:
        models.delete_user(user.id)
        flash(f"User '{user.username}' deleted.", "info")
    return redirect(url_for("admin.users"))


# --------------------------------------------------------------------------- roles

@bp.route("/roles")
def roles():
    return render_template("admin/roles.html", roles=models.list_roles())


@bp.route("/roles/new", methods=["GET", "POST"])
def role_new():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if not name:
            flash("Role name is required.", "error")
        else:
            try:
                models.create_role(name, request.form.get("description", "").strip())
            except ValueError as exc:
                flash(str(exc), "error")
            else:
                flash(f"Role '{name}' created.", "info")
                return redirect(url_for("admin.roles"))
    return render_template("admin/role_form.html", role=None)


@bp.route("/roles/<int:role_id>/edit", methods=["GET", "POST"])
def role_edit(role_id):
    role = models.get_role(role_id) or abort(404)
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if not name:
            flash("Role name is required.", "error")
        else:
            try:
                models.update_role(role.id, name, request.form.get("description", "").strip())
            except ValueError as exc:
                flash(str(exc), "error")
            else:
                flash(f"Role '{name}' updated.", "info")
                return redirect(url_for("admin.roles"))
    return render_template("admin/role_form.html", role=role)


@bp.route("/roles/<int:role_id>/delete", methods=["POST"])
def role_delete(role_id):
    try:
        models.delete_role(role_id)
    except LookupError:
        abort(404)
    except ValueError as exc:
        flash(str(exc), "error")
    else:
        flash("Role deleted.", "info")
    return redirect(url_for("admin.roles"))


# --------------------------------------------------------------------------- content

def _uploaded_media():
    upload = request.files.get("media")
    if not upload or not upload.filename:
        return None
    data = upload.read()
    if not data:
        return None
    return data, upload.filename, upload.mimetype or "application/octet-stream"


@bp.route("/content")
def content():
    roles = {r.id: r for r in models.list_roles()}
    return render_template("admin/content.html", items=models.list_all_content(), roles=roles)


@bp.route("/content/new", methods=["GET", "POST"])
def content_new():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        body = request.form.get("body", "")
        media = _uploaded_media()
        if not title:
            flash("Title is required.", "error")
        elif not body.strip() and media is None:
            flash("Add some text, a media file, or both.", "error")
        else:
            models.create_content(title, body, _selected_role_ids(), media, created_by=g.user.id)
            flash(f"'{title}' created.", "info")
            return redirect(url_for("admin.content"))
    return render_template("admin/content_form.html", item=None, roles=models.list_roles())


@bp.route("/content/<int:content_id>/edit", methods=["GET", "POST"])
def content_edit(content_id):
    item = models.get_content(content_id) or abort(404)
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        body = request.form.get("body", "")
        media = _uploaded_media()
        remove_media = bool(request.form.get("remove_media"))
        keeps_media = media is not None or (item.has_media and not remove_media)
        if not title:
            flash("Title is required.", "error")
        elif not body.strip() and not keeps_media:
            flash("Add some text, a media file, or both.", "error")
        else:
            models.update_content(
                item.id, title, body, _selected_role_ids(), media, remove_media=remove_media
            )
            flash(f"'{title}' updated.", "info")
            return redirect(url_for("admin.content"))
    return render_template("admin/content_form.html", item=item, roles=models.list_roles())


@bp.route("/content/<int:content_id>/delete", methods=["POST"])
def content_delete(content_id):
    models.get_content(content_id) or abort(404)
    models.delete_content(content_id)
    flash("Content deleted.", "info")
    return redirect(url_for("admin.content"))
