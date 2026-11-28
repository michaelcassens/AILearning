"""Fix what can be fixed automatically and say plainly what cannot."""
from __future__ import annotations

import io
import json
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pikepdf
from pikepdf import Dictionary, Name, NumberTree

from . import content, structure
from .flatten import flatten_forms
from .evaluate import BOOKMARK_MIN_PAGES, BAD_TITLE_RE, doc_title, evaluate, has_real_structure, is_tagged, walk_structure
from .model import Report
from .tagger import FigureInfo, Heading, TagOptions, TagResult, tag_pdf

LANG3 = {"eng": "en-US", "spa": "es-ES", "fra": "fr-FR", "fre": "fr-FR", "deu": "de-DE", "ger": "de-DE", "por": "pt-BR", "ita": "it-IT"}
STOPWORDS = {
    "en-US": "the and of to in is that for with as on are this be by or from at it an which have not was".split(),
    "es-ES": "el la de que y en los se del las un por con para una su al lo como más pero sus".split(),
    "fr-FR": "le la les de des et en un une du que est pour qui dans par sur au avec ne se pas plus".split(),
    "de-DE": "der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch".split(),
    "pt-BR": "de a o que e do da em um para é com não uma os no se na por mais as dos como mas".split(),
    "it-IT": "di e il la che in un per è con non una sono le da del si della come ma più al".split(),
}


@dataclass
class FixOptions:
    lang: str | None = None
    title: str | None = None
    author: str | None = None
    alt_text: dict[str, str] = field(default_factory=dict)
    alt_provider: object = None          # callable(FigureInfo) -> str | None
    retag: bool = False                  # discard existing tags and re-tag from layout
    ocr: bool = True
    ocr_lang: str = "eng"
    bookmarks: str = "auto"              # auto | always | never
    check_contrast: bool = True
    claim_pdfua: bool = False            # write the PDF/UA-1 identifier (only if no failures remain)


@dataclass
class FixResult:
    output: Path | None
    before: Report
    after: Report
    actions: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)       # things done that need human review
    alt_template: dict[str, dict] = field(default_factory=dict)
    data: bytes = b""

    @property
    def remaining(self):
        return [f for f in self.after.findings if f.status in ("fail", "warn", "manual")]


def detect_language(text: str) -> str:
    """Best-effort guess; low confidence falls back to en-US (and the caller flags it)."""
    words = [w for w in re.findall(r"[a-zA-ZÀ-ÿ]+", text.lower()) if len(w) > 1]
    if len(words) < 25:
        return "en-US"
    c = Counter(words)
    scores = {lang: sum(c[w] for w in sw if len(w) > 1) for lang, sw in STOPWORDS.items()}
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    (best, bs), (_, second) = ranked[0], ranked[1]
    if bs >= 0.03 * len(words) and bs >= 1.5 * max(second, 1):
        return best
    return "en-US"


def _sample_text(miner: content.MinerDoc, n_pages: int) -> str:
    out = []
    for i in range(min(3, n_pages)):
        try:
            pc = miner.page_content(i)
            out.append(" ".join(r.text for r in pc.runs))
        except Exception:
            pass
    return " ".join(out)


def _humanize(name: str) -> str:
    name = re.sub(r"[\[\]\.]+", " ", name)
    name = re.sub(r"([a-z])([A-Z])", r"\1 \2", name).replace("_", " ").replace("-", " ")
    return " ".join(name.split()).capitalize()


def _guess_label(runs, rect) -> str:
    x0, y0, x1, y1 = rect
    cy = (y0 + y1) / 2
    best, best_d = None, 1e9
    for r in runs:
        if r.x1 <= x0 + 2 and r.y0 - 3 <= cy <= r.y1 + 3:          # label to the left
            d = x0 - r.x1
        elif r.y0 >= y1 - 2 and r.x0 <= x1 and r.x1 >= x0 - 20:    # label above
            d = (r.y0 - y1) * 2 + 40
        else:
            continue
        if d < best_d and r.text.strip():
            best, best_d = r, d
    if best is not None and best_d < 200:
        return best.text.strip().rstrip(":*").strip()
    return ""


def _field_root_name(a) -> str:
    node = a
    parts = []
    while node is not None:
        if "/T" in node:
            parts.append(str(node.T))
        node = node.get("/Parent")
    return ".".join(reversed(parts))


def _best_title(pdf, tag: TagResult | None, src_name: str) -> str:
    if tag and tag.headings:
        first = [h for h in tag.headings if h.page == 0] or tag.headings
        h = sorted(first, key=lambda h: h.level)[0]
        t = " ".join(h.text.split())
        if 3 <= len(t) <= 150:
            return t
    stem = Path(src_name).stem
    return " ".join(re.sub(r"[_\-]+", " ", stem).split()).title() or "Untitled document"


def _set_title(pdf: pikepdf.Pdf, title: str, lang: str):
    pdf.docinfo["/Title"] = pikepdf.String(title)
    with pdf.open_metadata(set_pikepdf_as_editor=False, update_docinfo=False) as m:
        m["dc:title"] = title
        m["dc:language"] = [lang]
    vp = pdf.Root.get("/ViewerPreferences")
    if vp is None:
        pdf.Root.ViewerPreferences = Dictionary(DisplayDocTitle=True)
    else:
        vp.DisplayDocTitle = True


def _build_bookmarks(pdf: pikepdf.Pdf, headings: list[Heading]):
    if not headings:
        return 0
    from pikepdf import OutlineItem, PageLocation

    with pdf.open_outline() as outline:
        outline.root.clear()
        stack: list[tuple[int, list]] = [(0, outline.root)]
        for h in headings:
            item = OutlineItem(" ".join(h.text.split())[:200], h.page, PageLocation.XYZ, left=0, top=max(h.y + 10, 0))
            while stack and stack[-1][0] >= h.level:
                stack.pop()
            parent = stack[-1][1] if stack else outline.root
            parent.append(item)
            stack.append((h.level, item.children))
    return len(headings)


def _attach_annots_to_existing_tree(pdf: pikepdf.Pdf) -> int:
    """Add Link/Form/Annot elements for annotations missing from an existing tree."""
    root = pdf.Root.StructTreeRoot
    elems, _, _ = walk_structure(pdf)
    tagged = set()
    for e in elems:
        for o in e.objrs:
            try:
                tagged.add(o.objgen)
            except Exception:
                pass
    doc = root.K[0] if isinstance(root.K, pikepdf.Array) else root.K
    if not isinstance(doc, pikepdf.Dictionary):
        return 0
    if "/ParentTree" not in root:
        root.ParentTree = NumberTree.new(pdf).obj
    nt = NumberTree(root.ParentTree)
    next_key = int(root.get("/ParentTreeNextKey", 0))
    n = 0
    for page in pdf.pages:
        for a in page.obj.get("/Annots", []) or []:
            st = str(a.get("/Subtype", ""))
            if st in ("/Popup", "/TrapNet", "/PrinterMark") or a.objgen in tagged:
                continue
            tag = {"/Link": "Link", "/Widget": "Form"}.get(st, "Annot")
            e = pdf.make_indirect(Dictionary(Type=Name.StructElem, S=Name("/" + tag), P=doc, Pg=page.obj))
            e.K = pikepdf.Array([Dictionary(Type=Name.OBJR, Obj=a, Pg=page.obj)])
            if "/K" not in doc:
                doc.K = pikepdf.Array([e])
            elif isinstance(doc.K, pikepdf.Array):
                doc.K.append(e)
            else:
                doc.K = pikepdf.Array([doc.K, e])
            a.StructParent = next_key
            nt[next_key] = e
            next_key += 1
            n += 1
            if tag == "Link" and "/Contents" not in a:
                uri = a.get("/A", {}).get("/URI") if a.get("/A") is not None else None
                if uri is not None:
                    a.Contents = pikepdf.String(str(uri))
                    e.Alt = pikepdf.String(str(uri))
    root.ParentTreeNextKey = next_key
    return n


def _ensure_link_contents(pdf: pikepdf.Pdf, miner) -> int:
    n = 0
    for i, p in enumerate(pdf.pages):
        links = [a for a in (p.obj.get("/Annots") or []) if str(a.get("/Subtype", "")) == "/Link"
                 and not ("/Contents" in a and str(a.Contents).strip())]
        if not links:
            continue
        try:
            runs = miner.page_content(i).runs
        except Exception:
            runs = []
        for a in links:
            txt = ""
            if "/Rect" in a:
                x0, y0, x1, y1 = [float(v) for v in a.Rect]
                x0, x1, y0, y1 = min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1)
                hit = [r for r in runs if min(r.x1, x1) - max(r.x0, x0) > 0.5 * (r.x1 - r.x0)
                       and min(r.y1, y1 + 2) - max(r.y0, y0 - 2) > 0]
                txt = " ".join(r.text.strip() for r in hit).strip()
            if not txt:
                act = a.get("/A")
                if act is not None and "/URI" in act:
                    txt = str(act.URI)
                elif act is not None and "/D" in act:
                    txt = "Link to another part of the document"
            if txt:
                a.Contents = pikepdf.String(txt[:300])
                n += 1
    return n


def _apply_alt_to_existing(pdf: pikepdf.Pdf, alt: dict[str, str]) -> int:
    if not alt:
        return 0
    root = pdf.Root.StructTreeRoot
    page_index = {p.obj.objgen: i for i, p in enumerate(pdf.pages)}
    counters: Counter = Counter()
    n = 0

    def visit(node, page):
        nonlocal n
        if isinstance(node, pikepdf.Array):
            for k in node:
                visit(k, page)
        elif isinstance(node, pikepdf.Dictionary) and "/S" in node:
            pg = page_index.get(node.Pg.objgen, page) if "/Pg" in node else page
            if str(node.S) == "/Figure" and pg is not None:
                counters[pg] += 1
                key = f"p{pg + 1}-f{counters[pg]}"
                if key in alt and alt[key].strip() and "/Alt" not in node:
                    node.Alt = pikepdf.String(alt[key].strip())
                    n += 1
            if "/K" in node:
                visit(node.K, pg)

    visit(root.get("/K"), None)
    return n


def _try_ocr(src: bytes, lang: str) -> bytes | None:
    exe = shutil.which("ocrmypdf")
    if not exe or not shutil.which("tesseract"):
        return None
    with tempfile.TemporaryDirectory() as td:
        i, o = Path(td, "in.pdf"), Path(td, "out.pdf")
        i.write_bytes(src)
        r = subprocess.run([exe, "--skip-text", "--language", lang, "--output-type", "pdf", str(i), str(o)],
                           capture_output=True, text=True, timeout=1800)
        if r.returncode in (0, 6) and o.exists():  # 6 = already has text
            return o.read_bytes()
    return None


def remediate(src: str | Path | bytes, dst: str | Path | None, opts: FixOptions | None = None,
              source_name: str | None = None) -> FixResult:
    opts = opts or FixOptions()
    if isinstance(src, (bytes, bytearray)):
        data, name = bytes(src), source_name or "document.pdf"
    else:
        data, name = Path(src).read_bytes(), source_name or Path(src).name
    before = evaluate(data, check_contrast=opts.check_contrast, source=name)
    actions: list[str] = []
    notes: list[str] = []

    try:
        pdf = pikepdf.open(io.BytesIO(data))
    except pikepdf.PasswordError:
        raise RuntimeError("The PDF is password-protected; remove the password first.")
    if pdf.is_encrypted:
        actions.append("Removed encryption/permission restrictions so assistive technology can read the file")

    # ---- OCR for scanned pages ---------------------------------------------
    if before.facts.get("image_only_pages"):
        out = _try_ocr(data, opts.ocr_lang) if opts.ocr else None
        if out:
            data = out
            pdf = pikepdf.open(io.BytesIO(data))
            actions.append(f"Ran OCR on {len(before.facts['image_only_pages'])} scanned page(s)")
            notes.append("OCR text was generated automatically; proofread it against the page images.")
        else:
            notes.append("Scanned pages found but OCR is not available (install tesseract + ocrmypdf); "
                         "these pages remain inaccessible.")

    # ---- tags ------------------------------------------------------------------
    elems, _, _ = walk_structure(pdf)
    existing_ok = is_tagged(pdf) and has_real_structure(elems)
    if not existing_ok or opts.retag:
        n_fl = flatten_forms(pdf)
        if n_fl:
            actions.append(f"Expanded {n_fl} Form XObject(s) into the page content so they can be tagged")
    miner = content.MinerDoc(content.pdf_bytes(pdf))
    tag_res: TagResult | None = None
    if existing_ok and not opts.retag:
        actions.append("Kept the existing tag tree")
        n = _attach_annots_to_existing_tree(pdf)
        if n:
            actions.append(f"Added {n} link/form/annotation element(s) to the existing tag tree")
        a = _apply_alt_to_existing(pdf, opts.alt_text)
        if a:
            actions.append(f"Applied alt text to {a} existing figure(s)")
        fig_headings: list[Heading] = []
    else:
        if "/StructTreeRoot" in pdf.Root:
            del pdf.Root["/StructTreeRoot"]
        for p in pdf.pages:
            if "/StructParents" in p.obj:
                del p.obj["/StructParents"]
        topts = TagOptions(alt_text=opts.alt_text, alt_provider=opts.alt_provider)
        sb, tag_res = tag_pdf(pdf, miner, topts)
        lang_for_tags = opts.lang
        structure.install(pdf, sb, lang_for_tags)
        c = tag_res.counts
        actions.append(
            f"Tagged {tag_res.pages_tagged} page(s): {c['headings']} heading(s), {c['paragraphs']} paragraph(s), "
            f"{c['lists']} list(s), {len(tag_res.figures)} figure(s); {c['artifact-lines']} header/footer line(s) "
            f"and {c['artifacts-paths']} graphic(s) marked as artifacts")
        for pg, why in tag_res.pages_failed:
            notes.append(f"Page {pg + 1} could not be fully tagged ({why}).")
        for pg in tag_res.possible_tables:
            notes.append(f"Page {pg + 1} looks like it contains a table. It was tagged as paragraphs; "
                         "tag it as a Table (Acrobat Table Editor) so rows/columns are announced.")
        fig_headings = tag_res.headings
        if any(f.alt for f in tag_res.figures):
            ai = sum(1 for f in tag_res.figures if f.alt)
            actions.append(f"Added alt text to {ai} figure(s)")
        for f in tag_res.figures:
            if f.alt and opts.alt_provider is not None and f.key not in opts.alt_text:
                notes.append(f"Alt text for {f.key} was drafted by AI: review it.")
        missing = [f for f in tag_res.figures if not f.alt]
        if missing:
            notes.append(f"{len(missing)} figure(s) need alt text. Fill in the alt-text file and re-run with --alt-text, "
                         "or use --ai-alt to draft it.")
    if tag_res is not None:
        if tag_res.counts["artifacts-paths"]:
            notes.append(f"{tag_res.counts['artifacts-paths']} vector graphic(s) (borders, rules, backgrounds, possibly charts) "
                         "were marked decorative so screen readers skip them. If any chart or diagram carries information, "
                         "it needs a Figure tag with alt text (Acrobat) or an accessible source.")
        for pg in sorted(set(tag_res.table_notes)):
            notes.append(f"Page {pg + 1}: table(s) were tagged from column alignment with the first row as headers; verify.")
    n_lc = _ensure_link_contents(pdf, miner)
    if n_lc:
        actions.append(f"Added accessible descriptions to {n_lc} link(s)")

    # ---- language -------------------------------------------------------------------
    lang = opts.lang or str(pdf.Root.get("/Lang", "")).strip()
    lang = LANG3.get(lang.lower(), lang)
    if not lang:
        lang = detect_language(_sample_text(miner, len(pdf.pages)))
        actions.append(f"Set document language to {lang} (guessed from the text; override with --lang)")
        notes.append(f"Document language was guessed as {lang}; set --lang if that is wrong.")
    elif opts.lang:
        actions.append(f"Set document language to {lang}")
    pdf.Root.Lang = pikepdf.String(lang)

    # ---- title / metadata ----------------------------------------------------------------
    cur = doc_title(pdf)
    if opts.title:
        title = opts.title
    elif cur and not BAD_TITLE_RE.search(cur):
        title = cur
    else:
        title = _best_title(pdf, tag_res, name)
    if title != cur:
        actions.append(f'Set document title to "{title}"')
        if not opts.title:
            notes.append(f'Title was derived automatically ("{title}"); confirm it is descriptive.')
    _set_title(pdf, title, lang)
    if opts.author:
        pdf.docinfo["/Author"] = pikepdf.String(opts.author)
    pdf.Root.MarkInfo = Dictionary(Marked=True)

    # ---- page-level: tab order -----------------------------------------------------------------
    n_tabs = 0
    for p in pdf.pages:
        if p.obj.get("/Annots"):
            if str(p.obj.get("/Tabs", "")) != "/S":
                p.obj.Tabs = Name.S
                n_tabs += 1
    if n_tabs:
        actions.append(f"Set tab order to follow structure on {n_tabs} page(s)")

    # ---- forms: tooltips ------------------------------------------------------------------------------
    n_tu = 0
    for i, p in enumerate(pdf.pages):
        widgets = [a for a in (p.obj.get("/Annots") or []) if str(a.get("/Subtype", "")) == "/Widget"]
        if not widgets:
            continue
        try:
            runs = miner.page_content(i).runs
        except Exception:
            runs = []
        for a in widgets:
            node, have = a, False
            while node is not None:
                if "/TU" in node and str(node.TU).strip():
                    have = True
                    break
                node = node.get("/Parent")
            if have:
                continue
            label = _guess_label(runs, [float(v) for v in a.Rect]) if "/Rect" in a else ""
            label = label or _humanize(_field_root_name(a)) or "Form field"
            a.TU = pikepdf.String(label)
            n_tu += 1
    if n_tu:
        actions.append(f"Added tooltips (accessible names) to {n_tu} form field(s) from nearby labels/names")
        notes.append("Form-field tooltips were inferred from nearby text or field names; confirm they read well.")

    # ---- bookmarks ----------------------------------------------------------------------------------------
    want_bm = opts.bookmarks == "always" or (opts.bookmarks == "auto" and len(pdf.pages) >= BOOKMARK_MIN_PAGES)
    has_outline = pdf.Root.get("/Outlines") is not None and pdf.Root.Outlines.get("/First") is not None
    if want_bm and not has_outline and fig_headings:
        n = _build_bookmarks(pdf, fig_headings)
        actions.append(f"Created {n} bookmark(s) from headings")

    # ---- save + re-evaluate ----------------------------------------------------------------------------------
    buf = io.BytesIO()
    pdf.save(buf)
    out_bytes = buf.getvalue()
    if dst is not None:
        Path(dst).parent.mkdir(parents=True, exist_ok=True)
        Path(dst).write_bytes(out_bytes)
    after = evaluate(out_bytes, check_contrast=opts.check_contrast, source=str(dst or name))
    alt_template = {}
    if tag_res is not None:
        alt_template = {f.key: {"page": f.page + 1, "bbox": list(f.bbox) if f.bbox else None, "alt": f.alt or ""}
                        for f in tag_res.figures}
    # surface the reasons the remaining items need a human
    for f in after.findings:
        if f.id == "contrast" and f.status == "fail":
            notes.append("Low-contrast text cannot be recoloured safely in a finished PDF; fix it in the source document.")
    if opts.claim_pdfua and not after.failures:
        p2 = pikepdf.open(io.BytesIO(out_bytes))
        with p2.open_metadata(set_pikepdf_as_editor=False, update_docinfo=False) as m:
            m["pdfuaid:part"] = "1"
        b2 = io.BytesIO()
        p2.save(b2)
        out_bytes = b2.getvalue()
        if dst is not None:
            Path(dst).write_bytes(out_bytes)
        actions.append("Added the PDF/UA-1 identifier (validate with veraPDF before relying on it)")
    return FixResult(Path(dst) if dst else None, before, after, actions, notes, alt_template, out_bytes)


def write_alt_template(path: str | Path, template: dict[str, dict], only_missing: bool = False):
    items = {k: v for k, v in template.items() if not (only_missing and v.get("alt"))}
    Path(path).write_text(json.dumps(items, indent=2), encoding="utf-8")


def read_alt_file(path: str | Path) -> dict[str, str]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    out = {}
    for k, v in raw.items():
        a = v.get("alt") if isinstance(v, dict) else v
        if a and str(a).strip():
            out[k] = str(a).strip()
    return out
