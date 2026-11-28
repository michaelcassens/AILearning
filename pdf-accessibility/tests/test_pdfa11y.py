import io, json, sys, threading, http.server, functools
from pathlib import Path
import pikepdf, pytest

sys.path.insert(0, str(Path(__file__).parent))
import make_samples
from pdfa11y.evaluate import evaluate
from pdfa11y.remediate import FixOptions, remediate


@pytest.fixture(scope="module")
def samples(tmp_path_factory):
    d = tmp_path_factory.mktemp("samples")
    s = make_samples.make_all(d)
    s["ocrlike"] = make_samples.make_ocr_like(d / "ocrlike.pdf")
    return s


def ids(rep, status):
    return {f.id for f in rep.findings if f.status == status}


def test_untagged_pdf_fails_core_checks(samples):
    rep = evaluate(samples["report"])
    assert rep.verdict == "fails" and rep.score < 40
    assert {"tagged", "lang", "title-display", "links-tagged", "tab-order", "contrast"} <= ids(rep, "fail")


def test_report_fix_passes_structural_checks(samples, tmp_path):
    res = remediate(samples["report"], tmp_path / "o.pdf")
    after = res.after
    # only alt text (needs a human/AI), contrast (source fix) may remain failing
    assert ids(after, "fail") <= {"figures-alt", "contrast"}
    assert after.get("tagged").status == "pass" and after.get("content-tagged").status == "pass"
    assert after.get("headings").status == "pass" and after.get("links-tagged").status == "pass"
    assert res.after.score > res.before.score + 40
    with pikepdf.open(tmp_path / "o.pdf") as pdf:
        assert str(pdf.Root.Lang) == "en-US"
        assert "Campus Sustainability" in str(pdf.docinfo.Title)


def test_alt_text_sidecar_roundtrip(samples, tmp_path):
    res = remediate(samples["report"], tmp_path / "o.pdf")
    assert "p1-f1" in res.alt_template
    res2 = remediate(samples["report"], tmp_path / "o2.pdf",
                     FixOptions(alt_text={"p1-f1": "Bar chart of three values"}, check_contrast=False))
    assert res2.after.get("figures-alt").status == "pass"


def test_ai_alt_provider_with_fake_client(samples, tmp_path):
    from pdfa11y.alttext import ClaudeAltProvider

    class Block: type = "text"; text = "A bar chart with three bars."
    class Resp: stop_reason = "end_turn"; content = [Block()]
    calls = []
    class Msgs:
        def create(self, **kw):
            calls.append(kw); return Resp()
    class Client: messages = Msgs()

    prov = ClaudeAltProvider(Path(samples["report"]).read_bytes(), client=Client())
    res = remediate(samples["report"], tmp_path / "o.pdf", FixOptions(alt_provider=prov, check_contrast=False))
    assert res.after.get("figures-alt").status == "pass"
    img = calls[0]["messages"][0]["content"][0]
    assert img["type"] == "image" and img["source"]["media_type"] == "image/png"


def test_form_fix(samples, tmp_path):
    res = remediate(samples["form"], tmp_path / "o.pdf")
    assert res.after.get("forms-labels").status == "pass" and res.after.get("forms-tagged").status == "pass"
    with pikepdf.open(tmp_path / "o.pdf") as pdf:
        tus = {str(a.TU) for a in pdf.pages[0].Annots}
        assert "Full name" in tus  # taken from the visible label


def test_long_doc_gets_bookmarks(samples, tmp_path):
    res = remediate(samples["long"], tmp_path / "o.pdf")
    assert res.after.get("bookmarks").status == "pass"


def test_ocr_text_layer_page(samples, tmp_path):
    res = remediate(samples["ocrlike"], tmp_path / "o.pdf")
    assert res.after.get("content-tagged").status == "pass"
    assert res.after.get("ocr-proofread").status == "manual"


def test_scanned_pdf_flagged_and_ocr_when_available(samples, tmp_path):
    assert evaluate(samples["scanned"]).get("text").status == "fail"
    import shutil
    res = remediate(samples["scanned"], tmp_path / "o.pdf")
    if shutil.which("ocrmypdf") and shutil.which("tesseract"):
        assert res.after.get("text").status == "pass"
    else:
        assert any("OCR" in n for n in res.notes)


def test_existing_tags_are_kept(samples, tmp_path):
    first = remediate(samples["report"], tmp_path / "a.pdf", FixOptions(check_contrast=False))
    second = remediate(tmp_path / "a.pdf", tmp_path / "b.pdf", FixOptions(check_contrast=False))
    assert any("Kept the existing tag tree" in a for a in second.actions)
    assert second.after.get("tagged").status == "pass"


def test_output_is_valid_pdf(samples, tmp_path):
    remediate(samples["report"], tmp_path / "o.pdf")
    with pikepdf.open(tmp_path / "o.pdf") as pdf:
        assert not pdf.check_pdf_syntax()
    from pypdf import PdfReader
    assert "Campus Sustainability Report" in PdfReader(tmp_path / "o.pdf").pages[0].extract_text()


def test_site_scan(samples, tmp_path):
    import shutil
    from pdfa11y.site import scan_site
    root = tmp_path / "site"; root.mkdir()
    shutil.copy(samples["report"], root / "a.pdf"); shutil.copy(samples["form"], root / "b.pdf")
    (root / "index.html").write_text('<a href="a.pdf">A</a> <a href="sub.html">s</a>')
    (root / "sub.html").write_text('<a href="b.pdf">B</a>')
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        res = scan_site(f"http://127.0.0.1:{srv.server_port}/index.html", delay=0)
    finally:
        srv.shutdown()
    s = res.summary()
    assert s["pdfs_found"] == 2 and s["pdfs_evaluated"] == 2 and s["pages_crawled"] >= 2
    assert "url,score" in res.to_csv()


def test_webapp(samples):
    from pdfa11y.webapp import create_app
    c = create_app().test_client()
    assert c.get("/").status_code == 200
    r = c.post("/upload", data={"mode": "fix", "file": (io.BytesIO(Path(samples["form"]).read_bytes()), "form.pdf")},
               content_type="multipart/form-data")
    assert r.status_code == 200 and b"Download the accessible PDF" in r.data
    assert c.post("/upload", data={"file": (io.BytesIO(b"nope"), "x.pdf")}, content_type="multipart/form-data").status_code == 400


def test_table_gets_header_cells(tmp_path):
    p = make_samples.make_table(tmp_path / "t.pdf")
    res = remediate(p, tmp_path / "o.pdf", FixOptions(check_contrast=False))
    assert res.after.get("tables").status == "pass"
    from pdfa11y.evaluate import walk_structure
    with pikepdf.open(tmp_path / "o.pdf") as pdf:
        elems, _, _ = walk_structure(pdf)
    kinds = [e.std for e in elems]
    assert kinds.count("Table") == 1 and kinds.count("TR") == 4 and kinds.count("TH") == 3 and kinds.count("TD") == 9
    assert [e.std for e in elems if e.std.startswith("H") and e.std[1:].isdigit()] == ["H1"]


def test_language_detection():
    from pdfa11y.remediate import detect_language
    en = "The committee reviewed the proposal and the results of the survey that were collected from students across the campus " * 2
    es = "El comité revisó la propuesta y los resultados de la encuesta que se recopilaron de los estudiantes en el campus para la universidad " * 2
    assert detect_language(en) == "en-US" and detect_language(es) == "es-ES"
    assert detect_language("short") == "en-US"
