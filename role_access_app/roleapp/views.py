import io

from flask import Blueprint, abort, g, render_template, send_file

from . import models
from .security import login_required

bp = Blueprint("views", __name__)

# Only these types are shown inline; anything else is forced to download so an
# uploaded HTML/SVG file can never run script in this site's origin.
INLINE_PREFIXES = ("image/", "audio/", "video/")
INLINE_EXACT = {"application/pdf"}
NEVER_INLINE = {"image/svg+xml"}


def media_kind(mimetype):
    if not mimetype or mimetype in NEVER_INLINE:
        return "file"
    for prefix in INLINE_PREFIXES:
        if mimetype.startswith(prefix):
            return prefix.rstrip("/")
    return "pdf" if mimetype in INLINE_EXACT else "file"


def _visible_or_404(content_id, include_media=False):
    item = models.get_content(content_id, include_media=include_media)
    # 404 rather than 403 so users can't probe which items exist.
    if item is None or not models.can_view(g.user, item):
        abort(404)
    return item


@bp.route("/")
@login_required
def dashboard():
    items = models.list_content_for(g.user)
    roles = {r.id: r for r in models.list_roles()}
    return render_template(
        "dashboard.html",
        items=items,
        roles=roles,
        my_role_ids=models.effective_role_ids(g.user),
        media_kind=media_kind,
    )


@bp.route("/content/<int:content_id>")
@login_required
def content_detail(content_id):
    item = _visible_or_404(content_id)
    roles = {r.id: r for r in models.list_roles()}
    return render_template("content_detail.html", item=item, roles=roles, media_kind=media_kind)


@bp.route("/content/<int:content_id>/media")
@login_required
def content_media(content_id):
    item = _visible_or_404(content_id, include_media=True)
    if item.media is None:
        abort(404)
    kind = media_kind(item.media_type)
    inline = kind != "file"
    response = send_file(
        io.BytesIO(item.media),
        mimetype=item.media_type if inline else "application/octet-stream",
        as_attachment=not inline,
        download_name=item.media_name or "download",
        max_age=0,
    )
    response.headers["Cache-Control"] = "private, no-store"
    return response
