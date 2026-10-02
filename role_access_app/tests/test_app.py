import sqlite3

from roleapp import models

from .conftest import PASSWORD, Client, extract_reset_path, login_as


# --------------------------------------------------------------------------- visibility

def titles(resp):
    return {t for t in ["Public note", "Staff secret", "Faculty secret", "Draft", "HTML file"]
            if t.encode() in resp.data}


def test_anonymous_is_redirected_to_login(client):
    resp = client.get("/")
    assert resp.status_code == 302 and "/login" in resp.headers["Location"]


def test_public_only_user_sees_only_public(app):
    c = login_as(app, "pub")
    assert titles(c.get("/")) == {"Public note", "HTML file"}


def test_role_user_sees_public_and_own_role(app):
    c = login_as(app, "staffer")
    assert titles(c.get("/")) == {"Public note", "Staff secret", "HTML file"}


def test_superuser_sees_everything_including_untagged(app):
    c = login_as(app, "admin")
    assert titles(c.get("/")) == {"Public note", "Staff secret", "Faculty secret", "Draft", "HTML file"}


def test_direct_access_to_hidden_item_and_media_is_404(app):
    c = login_as(app, "pub")
    ids = app.ids
    assert c.get(f"/content/{ids['c_staff']}").status_code == 404
    assert c.get(f"/content/{ids['c_staff']}/media").status_code == 404
    assert c.get(f"/content/{ids['c_draft']}").status_code == 404
    assert c.get(f"/content/{ids['c_public']}").status_code == 200


def test_media_served_to_allowed_user(app):
    c = login_as(app, "staffer")
    resp = c.get(f"/content/{app.ids['c_staff']}/media")
    assert resp.status_code == 200
    assert resp.data == b"\x89PNG fake"
    assert resp.mimetype == "image/png"


def test_html_media_is_forced_to_download(app):
    c = login_as(app, "pub")
    resp = c.get(f"/content/{app.ids['c_html']}/media")
    assert resp.mimetype == "application/octet-stream"
    assert resp.headers["Content-Disposition"].startswith("attachment")


def test_role_change_takes_effect_immediately(app):
    c = login_as(app, "pub")
    assert c.get(f"/content/{app.ids['c_faculty']}").status_code == 404
    with app.app_context():
        u = models.get_user(app.ids["pub"])
        models.update_user(u.id, u.username, u.email, [app.ids["faculty"]], False, True)
    assert c.get(f"/content/{app.ids['c_faculty']}").status_code == 200


# --------------------------------------------------------------------------- admin

def test_non_superuser_cannot_reach_admin(app):
    c = login_as(app, "staffer")
    for url in ["/admin/users", "/admin/roles", "/admin/content", "/admin/users/new"]:
        assert c.get(url).status_code == 403
    resp = c.post("/admin/users/new", {"username": "x", "password": "p" * 20, "confirm": "p" * 20})
    assert resp.status_code == 403
    resp = c.post(f"/admin/users/{app.ids['admin']}/delete")
    assert resp.status_code == 403
    with app.app_context():
        assert models.find_user_by_login("x") is None
        assert models.get_user(app.ids["admin"]) is not None


def test_superuser_user_crud(app):
    c = login_as(app, "admin")
    resp = c.post("/admin/users/new", {
        "username": "newbie", "email": "n@example.edu", "password": "p" * 12,
        "confirm": "p" * 12, "roles": [str(app.ids["faculty"])], "is_active": "1",
    })
    assert resp.status_code == 302
    with app.app_context():
        user = models.find_user_by_login("newbie")
        assert user.role_ids == {app.ids["faculty"]} and not user.is_superuser

    nc = Client(app)
    assert nc.login("newbie", "p" * 12).status_code == 302
    assert titles(nc.get("/")) == {"Public note", "Faculty secret", "HTML file"}

    resp = c.post(f"/admin/users/{user.id}/edit", {
        "username": "newbie2", "email": "", "roles": [str(app.ids["staff"])], "is_active": "1",
    })
    assert resp.status_code == 302
    with app.app_context():
        user = models.get_user(user.id)
        assert user.username == "newbie2" and user.email is None
        assert user.role_ids == {app.ids["staff"]}

    assert c.post(f"/admin/users/{user.id}/delete").status_code == 302
    with app.app_context():
        assert models.get_user(user.id) is None


def test_duplicate_username_rejected(app):
    c = login_as(app, "admin")
    resp = c.post("/admin/users/new", {
        "username": "PUB", "password": "p" * 12, "confirm": "p" * 12, "is_active": "1",
    })
    assert resp.status_code == 200 and b"already in use" in resp.data


def test_cannot_delete_self_or_demote_last_superuser(app):
    c = login_as(app, "admin")
    c.post(f"/admin/users/{app.ids['admin']}/delete")
    resp = c.post(f"/admin/users/{app.ids['admin']}/edit", {
        "username": "admin", "email": "admin@example.edu", "is_active": "1",
    })
    assert b"last active superuser" in resp.data
    with app.app_context():
        assert models.get_user(app.ids["admin"]).is_superuser


def test_superuser_content_and_role_crud(app):
    c = login_as(app, "admin")
    c.post("/admin/roles/new", {"name": "Students", "description": "Enrolled"})
    with app.app_context():
        students = next(r for r in models.list_roles() if r.name == "Students")

    from io import BytesIO
    resp = c.post("/admin/content/new", {
        "title": "Syllabus", "body": "Week 1", "roles": [str(students.id)],
        "media": (BytesIO(b"%PDF-1.4 data"), "syllabus.pdf", "application/pdf"),
    }, content_type="multipart/form-data")
    assert resp.status_code == 302
    with app.app_context():
        item = next(i for i in models.list_all_content() if i.title == "Syllabus")
        assert item.role_ids == {students.id} and item.media_name == "syllabus.pdf"

    c.post(f"/admin/content/{item.id}/edit", {
        "title": "Syllabus v2", "body": "Week 1-2", "roles": [str(app.ids["public"])],
        "remove_media": "1",
    })
    with app.app_context():
        item = models.get_content(item.id)
        assert item.title == "Syllabus v2" and not item.has_media
        assert item.role_ids == {app.ids["public"]}

    c.post(f"/admin/content/{item.id}/delete")
    c.post(f"/admin/roles/{students.id}/delete")
    with app.app_context():
        assert models.get_content(item.id) is None
        assert models.get_role(students.id) is None


def test_public_role_cannot_be_deleted(app):
    c = login_as(app, "admin")
    c.post(f"/admin/roles/{app.ids['public']}/delete")
    with app.app_context():
        assert models.get_role(app.ids["public"]) is not None


# --------------------------------------------------------------------------- auth

def test_wrong_password_and_lockout(app):
    c = Client(app)
    for _ in range(app.config["MAX_FAILED_LOGINS"]):
        assert c.login("pub", "wrong-password").status_code == 200
    # Locked now, even with the right password.
    assert c.login("pub").status_code == 200
    with app.app_context():
        assert models.get_user(app.ids["pub"]).is_locked


def test_login_with_email_case_insensitive(app):
    assert Client(app).login("PUB@example.edu").status_code == 302


def test_disabled_user_cannot_login(app):
    with app.app_context():
        u = models.get_user(app.ids["pub"])
        models.update_user(u.id, u.username, u.email, [], False, False)
    assert Client(app).login("pub").status_code == 200


def test_post_without_csrf_rejected(app):
    c = Client(app)
    assert c.post("/login", {"username": "pub", "password": PASSWORD}, csrf=False).status_code == 400


def test_open_redirect_blocked(app):
    c = Client(app)
    resp = c.post("/login?next=//evil.example.com", {"username": "pub", "password": PASSWORD})
    assert resp.headers["Location"] == "/"


def test_forgot_password_flow(app):
    c = Client(app)
    c.post("/forgot-password", {"identifier": "pub"})
    outbox = app.extensions["outbox"]
    assert len(outbox) == 1 and outbox[0]["to"] == "pub@example.edu"
    path = extract_reset_path(outbox[0]["body"])

    assert c.get(path).status_code == 200
    resp = c.post(path, {"password": "brand-new-password", "confirm": "brand-new-password"})
    assert resp.status_code == 302
    assert Client(app).login("pub", "brand-new-password").status_code == 302
    assert Client(app).login("pub", PASSWORD).status_code == 200
    # Single use.
    assert c.get(path).status_code == 302


def test_forgot_password_does_not_reveal_accounts(app):
    c = Client(app)
    a = c.post("/forgot-password", {"identifier": "nobody"}, follow_redirects=True)
    b = c.post("/forgot-password", {"identifier": "pub"}, follow_redirects=True)
    assert a.data == b.data


def test_password_reset_signs_out_other_sessions(app):
    c = login_as(app, "pub")
    assert c.get("/").status_code == 200
    with app.app_context():
        models.set_password(app.ids["pub"], "another-long-password")
    assert c.get("/").status_code == 302


# --------------------------------------------------------------------------- encryption

def test_database_contains_no_plaintext(app):
    raw = open(app.config["DATABASE"], "rb").read()
    for secret in [b"staff only text", b"Staff secret", b"pub@example.edu", b"staffer",
                   b"Faculty", b"pic.png", b"\x89PNG fake", b"<script>"]:
        assert secret not in raw, secret
    conn = sqlite3.connect(app.config["DATABASE"])
    hashes = [r[0] for r in conn.execute("SELECT password_hash FROM users")]
    assert all(h.startswith(("scrypt:", "pbkdf2:")) for h in hashes)
