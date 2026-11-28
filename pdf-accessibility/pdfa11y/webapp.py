"""Small Flask UI: upload a PDF, see the report, download the accessible version."""
from __future__ import annotations

import io
import os
import uuid
from collections import OrderedDict

from flask import Flask, Response, abort, redirect, render_template_string, request, send_file, url_for

from .remediate import FixOptions, remediate
from .report import CSS, to_html
from .evaluate import evaluate

MAX_MB = int(os.environ.get("PDFA11Y_MAX_MB", "50"))
PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDF accessibility checker</title><style>{{css|safe}}label{display:block;margin:.8rem 0 .2rem;font-weight:600}
input,select,button{font:inherit;padding:.5rem;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
button{background:var(--fg);color:var(--bg);cursor:pointer;margin-top:1rem}:focus-visible{outline:3px solid #2563eb;outline-offset:2px}</style></head>
<body><main><h1>PDF accessibility checker</h1>
<p>Upload a PDF to score it against WCAG 2.1 AA / PDF-UA, or let the tool make an accessible copy.
Files are kept in memory for one hour and then discarded.</p>
<form method="post" action="{{url_for('upload')}}" enctype="multipart/form-data">
<label for="f">PDF file (max {{max_mb}} MB)</label><input id="f" name="file" type="file" accept="application/pdf,.pdf" required>
<label for="m">What would you like to do?</label>
<select id="m" name="mode"><option value="fix">Check and make an accessible copy</option><option value="check">Check only</option></select>
<label for="l">Document language (optional, e.g. en-US)</label><input id="l" name="lang" maxlength="12">
<button type="submit">Start</button></form></main></body></html>"""

STORE: "OrderedDict[str, tuple[float, bytes, str]]" = OrderedDict()


def create_app() -> Flask:
    import time

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_MB * 1024 * 1024

    def purge():
        cutoff = time.time() - 3600
        for k in [k for k, v in STORE.items() if v[0] < cutoff]:
            STORE.pop(k, None)

    @app.get("/")
    def index():
        return render_template_string(PAGE, css=CSS, max_mb=MAX_MB)

    @app.get("/healthz")
    def health():
        return "ok"

    @app.post("/upload")
    def upload():
        purge()
        f = request.files.get("file")
        if not f or not f.filename:
            abort(400, "No file uploaded")
        data = f.read()
        if not data.startswith(b"%PDF-"):
            abort(400, "That does not look like a PDF")
        name = os.path.basename(f.filename)
        if request.form.get("mode") == "check":
            rep = evaluate(data, source=name)
            return Response(to_html(rep), mimetype="text/html")
        lang = (request.form.get("lang") or "").strip() or None
        res = remediate(data, None, FixOptions(lang=lang), source_name=name)
        out_bytes = res.data
        key = uuid.uuid4().hex
        STORE[key] = (time.time(), out_bytes, os.path.splitext(name)[0] + "_accessible.pdf")
        page = to_html(res.after, res).replace(
            "<h2>All checks</h2>",
            f"<p><a href='{url_for('download', key=key)}'><strong>Download the accessible PDF</strong></a></p><h2>All checks</h2>")
        return Response(page, mimetype="text/html")

    @app.get("/download/<key>")
    def download(key):
        item = STORE.get(key)
        if not item:
            abort(404)
        return send_file(io.BytesIO(item[1]), mimetype="application/pdf", as_attachment=True, download_name=item[2])

    return app
