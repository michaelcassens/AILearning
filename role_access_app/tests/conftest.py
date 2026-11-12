import re

import pytest

from roleapp import create_app, models
from roleapp.config import generate_keys

PASSWORD = "correct-horse-battery"


@pytest.fixture
def app(tmp_path):
    keys = generate_keys()
    app = create_app(
        {
            "TESTING": True,
            "DATABASE": str(tmp_path / "test.db"),
            "SECRET_KEY": keys["APP_SECRET_KEY"],
            "ENCRYPTION_KEYS": [keys["APP_ENCRYPTION_KEYS"]],
            "INDEX_KEY": keys["APP_INDEX_KEY"],
            "MAIL_BACKEND": "memory",
            "BASE_URL": "https://app.example.edu",
        }
    )
    with app.app_context():
        public = models.public_role_id()
        staff = models.create_role("Staff")
        faculty = models.create_role("Faculty")
        app.ids = {
            "public": public,
            "staff": staff,
            "faculty": faculty,
            "admin": models.create_user(
                "admin", PASSWORD, email="admin@example.edu", is_superuser=True
            ),
            "pub": models.create_user("pub", PASSWORD, email="pub@example.edu"),
            "staffer": models.create_user("staffer", PASSWORD, role_ids=[staff]),
            "c_public": models.create_content("Public note", "hello all", [public]),
            "c_staff": models.create_content(
                "Staff secret", "staff only text", [staff],
                media=(b"\x89PNG fake", "pic.png", "image/png"),
            ),
            "c_faculty": models.create_content("Faculty secret", "faculty text", [faculty]),
            "c_draft": models.create_content("Draft", "no roles", []),
            "c_html": models.create_content(
                "HTML file", "", [public],
                media=(b"<script>alert(1)</script>", "x.html", "text/html"),
            ),
        }
    yield app


class Client:
    """Test client that handles the CSRF token like a browser would."""

    def __init__(self, app):
        self.app = app
        self.http = app.test_client()

    def _token(self):
        with self.http.session_transaction() as sess:
            sess.setdefault("csrf", "test-csrf-token")
            return sess["csrf"]

    def get(self, *args, **kwargs):
        return self.http.get(*args, **kwargs)

    def post(self, url, data=None, csrf=True, **kwargs):
        data = dict(data or {})
        if csrf:
            data.setdefault("csrf_token", self._token())
        return self.http.post(url, data=data, **kwargs)

    def login(self, username, password=PASSWORD):
        return self.post("/login", {"username": username, "password": password})


@pytest.fixture
def client(app):
    return Client(app)


def login_as(app, username):
    c = Client(app)
    resp = c.login(username)
    assert resp.status_code == 302, resp.data
    return c


def extract_reset_path(body):
    return re.search(r"https://app\.example\.edu(/reset-password/\S+)", body).group(1)
