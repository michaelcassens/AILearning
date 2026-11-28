"""Evaluate a PDF against WCAG 2.1 AA / PDF-UA style checks."""
from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

import pikepdf

from . import content
from .model import Finding, Report
from .structure import HEADING_TYPES, STANDARD_TYPES

LANG_RE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
BAD_TITLE_RE = re.compile(r"(^untitled|\.(pdf|docx?|pptx?|xlsx?|indd|tmp)$|^microsoft (word|powerpoint|excel) - |^document\d*$|^slide 1$)", re.I)
BAD_ALT_RE = re.compile(r"^(image|picture|photo|graphic|figure|logo|img|untitled)?\s*\d*$|\.(png|jpe?g|gif|tiff?|bmp)$", re.I)
BAD_LINK_RE = re.compile(r"^(click here|here|link|read more|more|learn more|this|click)$", re.I)
BOOKMARK_MIN_PAGES = 10


# ---------------------------------------------------------------------------
# structure tree walking
# ---------------------------------------------------------------------------

class Elem:
    __slots__ = ("raw", "std", "page", "alt", "actual", "parent", "kids", "attrs", "mcids", "objrs", "depth")

    def __init__(self, raw, std, page, alt, actual, parent, attrs, depth):
        self.raw, self.std, self.page, self.alt, self.actual = raw, std, page, alt, actual
        self.parent, self.attrs, self.depth = parent, attrs, depth
        self.kids: list[Elem] = []
        self.mcids: list[int] = []
        self.objrs: list = []


def walk_structure(pdf: pikepdf.Pdf, limit: int = 300_000):
    """Return (elements, role_map, problems) for the document's structure tree."""
    root = pdf.Root.get("/StructTreeRoot")
    if root is None:
        return [], {}, []
    role_map = {}
    rm = root.get("/RoleMap")
    if rm is not None:
        for k, v in rm.items():
            role_map[str(k).lstrip("/")] = str(v).lstrip("/")
    page_index = {p.obj.objgen: i for i, p in enumerate(pdf.pages)}
    elems: list[Elem] = []
    problems: list[str] = []
    seen: set = set()

    def std_type(raw: str) -> str:
        t, hops = raw, 0
        while t not in STANDARD_TYPES and t in role_map and hops < 10:
            t, hops = role_map[t], hops + 1
        return t

    def visit(node, parent: Elem | None, inherited_page, depth):
        if len(elems) > limit:
            return
        if isinstance(node, (int, pikepdf.Object)) and not isinstance(node, pikepdf.Dictionary) and not isinstance(node, pikepdf.Array):
            try:
                if parent is not None:
                    parent.mcids.append(int(node))
            except Exception:
                pass
            return
        if isinstance(node, pikepdf.Array):
            for k in node:
                visit(k, parent, inherited_page, depth)
            return
        if not isinstance(node, pikepdf.Dictionary):
            return
        og = getattr(node, "objgen", (0, 0))
        if og != (0, 0):
            if og in seen:
                problems.append("cycle or shared structure element")
                return
            seen.add(og)
        t = str(node.get("/Type", ""))
        if t == "/MCR":
            if parent is not None:
                parent.mcids.append(int(node.get("/MCID", -1)))
            return
        if t == "/OBJR":
            if parent is not None:
                parent.objrs.append(node.get("/Obj"))
            return
        if "/S" not in node:
            return
        raw = str(node.S).lstrip("/")
        pg = inherited_page
        if "/Pg" in node:
            pg = page_index.get(node.Pg.objgen, inherited_page)
        alt = str(node.Alt) if "/Alt" in node else None
        actual = str(node.ActualText) if "/ActualText" in node else None
        attrs = node.get("/A")
        e = Elem(raw, std_type(raw), pg, alt, actual, parent, attrs, depth)
        if parent is not None:
            parent.kids.append(e)
        elems.append(e)
        k = node.get("/K")
        if k is not None:
            visit(k, e, pg, depth + 1)

    k = root.get("/K")
    if k is not None:
        visit(k, None, None, 0)
    return elems, role_map, problems


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _page_label(pages) -> str:
    pages = sorted(set(pages))
    if len(pages) > 12:
        return ", ".join(map(str, pages[:12])) + f" … (+{len(pages) - 12} more)"
    return ", ".join(map(str, pages))


def doc_title(pdf: pikepdf.Pdf) -> str:
    try:
        t = pdf.docinfo.get("/Title")
        t = str(t).strip() if t is not None else ""
    except Exception:
        t = ""
    if not t:
        try:
            with pdf.open_metadata() as m:
                t = (m.get("dc:title") or "").strip()
        except Exception:
            t = ""
    return t


def is_tagged(pdf: pikepdf.Pdf) -> bool:
    mi = pdf.Root.get("/MarkInfo")
    return bool(mi is not None and mi.get("/Marked", False) and "/StructTreeRoot" in pdf.Root)


def has_real_structure(elems: list[Elem]) -> bool:
    """True when the tag tree carries more than an empty Document shell."""
    return any(e.std not in ("Document", "Part", "Sect", "Div", "NonStruct") for e in elems) and \
        sum(len(e.mcids) for e in elems) > 0


# ---------------------------------------------------------------------------
# the evaluator
# ---------------------------------------------------------------------------

def evaluate(path: str | Path | bytes, *, check_contrast: bool = True, max_contrast_pages: int = 40,
             source: str | None = None) -> Report:
    if isinstance(path, (bytes, bytearray)):
        data = bytes(path)
        src = source or "<memory>"
    else:
        data = Path(path).read_bytes()
        src = source or str(path)
    rep = Report(source=src)
    add = rep.findings.append

    # ---- open ------------------------------------------------------------
    try:
        import io
        pdf = pikepdf.open(io.BytesIO(data))
    except pikepdf.PasswordError:
        add(Finding("openable", "Document can be opened", "fail", "critical", ["1.1.1"], "",
                    "The PDF requires a password to open, so assistive technology cannot read it.", fix="manual",
                    how_to_fix="Remove the open password, or supply it to the remediation tool."))
        return rep
    except Exception as e:  # noqa: BLE001
        add(Finding("openable", "Document can be opened", "fail", "critical", [], "",
                    f"The file is not a readable PDF: {e}", fix="manual"))
        return rep

    n_pages = len(pdf.pages)
    rep.pages = n_pages
    page_ids = {p.obj.objgen: i for i, p in enumerate(pdf.pages)}

    # ---- security --------------------------------------------------------
    enc = pdf.is_encrypted
    blocks_ax = False
    if enc:
        try:
            blocks_ax = not pdf.allow.accessibility
        except Exception:
            blocks_ax = False
    add(Finding("security", "Security settings allow assistive technology", "fail" if blocks_ax else "pass",
                "critical", ["1.1.1", "4.1.2"], "PDF/UA 7.16",
                "Encryption settings prevent text extraction for accessibility." if blocks_ax else "",
                fix="auto" if blocks_ax else "auto",
                how_to_fix="Remove the owner-password restriction on content extraction for accessibility."))

    # ---- structure facts -------------------------------------------------
    elems, role_map, problems = walk_structure(pdf)
    tagged = is_tagged(pdf)
    real = has_real_structure(elems)
    rep.facts.update(tagged=tagged, struct_elements=len(elems), encrypted=enc,
                     title=doc_title(pdf), lang=str(pdf.Root.get("/Lang", "")) or None)

    # ---- per-page content scan --------------------------------------------
    covs = [content.scan_coverage(p) for p in pdf.pages]
    text_pages = [i for i, c in enumerate(covs) if c.text_ops and c.invisible_text_ops < c.text_ops]
    ocr_pages = [i for i, c in enumerate(covs) if c.invisible_text_ops and c.invisible_text_ops == c.text_ops]
    image_only = [i + 1 for i, c in enumerate(covs) if not c.text_ops and c.image_ops]
    blank = [i + 1 for i, c in enumerate(covs) if not c.text_ops and not c.image_ops and not c.path_ops]
    rep.facts.update(image_only_pages=image_only, ocr_text_layer_pages=[i + 1 for i in ocr_pages])

    if image_only:
        add(Finding("text", "Pages contain real, searchable text", "fail", "critical", ["1.1.1", "1.4.5"], "PDF/UA 7.1",
                    f"{len(image_only)} page(s) are images with no text layer (scanned?).",
                    image_only, "assisted",
                    "Run OCR to add a text layer, then tag. The remediation tool does this when Tesseract/ocrmypdf is installed."))
    else:
        add(Finding("text", "Pages contain real, searchable text", "pass" if (text_pages or ocr_pages or n_pages == 0) else "na",
                    "critical", ["1.1.1", "1.4.5"], "PDF/UA 7.1"))

    if ocr_pages:
        add(Finding("ocr-proofread", "OCR text layer is accurate", "manual", "serious", ["1.1.1"], "",
                    "These pages are scanned images with an OCR text layer; OCR errors are common, so proofread it.",
                    [i + 1 for i in ocr_pages], "manual"))

    # ---- tagged ------------------------------------------------------------
    if not tagged or not real:
        why = "No structure tree (untagged PDF)." if not tagged else "The tag tree is empty or holds no content."
        add(Finding("tagged", "Document is tagged", "fail", "critical", ["1.3.1", "4.1.2"], "PDF/UA 7.1",
                    why + " Screen readers cannot tell headings, lists or reading order.", fix="auto",
                    how_to_fix="Auto-tag from layout (this tool), or re-export from the source document with tagging on."))
    else:
        add(Finding("tagged", "Document is tagged", "pass", "critical", ["1.3.1", "4.1.2"], "PDF/UA 7.1"))

    # ---- untagged content --------------------------------------------------
    bad = [i + 1 for i, c in enumerate(covs)
           if c.untagged_text or c.untagged_images or c.untagged_paths]
    if tagged and real:
        n_bad = sum(covs[i - 1].untagged_text + covs[i - 1].untagged_images + covs[i - 1].untagged_paths for i in bad)
        add(Finding("content-tagged", "All content is tagged or marked as artifact",
                    "fail" if bad else "pass", "critical", ["1.3.1"], "PDF/UA 7.1",
                    f"{n_bad} untagged content item(s) on {len(bad)} page(s)." if bad else "",
                    bad, "auto", "Re-tag the document so every text, image and graphic is in a tag or an artifact."))
        # orphan MCIDs: referenced in tree but absent from page
        orphans = []
        by_page: dict[int, set[int]] = {}
        for e in elems:
            if e.page is not None:
                by_page.setdefault(e.page, set()).update(m for m in e.mcids if m >= 0)
        for pg, mc in by_page.items():
            missing = mc - covs[pg].mcids
            if missing:
                orphans.append(pg + 1)
        if orphans:
            add(Finding("mcid-orphans", "Tags point at content that exists", "warn", "moderate", ["1.3.1"], "PDF/UA 7.1",
                        "Some tags reference marked content that is not on the page.", orphans, "auto"))
    elif n_pages:
        add(Finding("content-tagged", "All content is tagged or marked as artifact", "fail", "critical", ["1.3.1"],
                    "PDF/UA 7.1", "Untagged document: no content is tagged.", fix="auto"))

    # ---- title / language ---------------------------------------------------
    title = doc_title(pdf)
    vp = pdf.Root.get("/ViewerPreferences")
    display_title = bool(vp is not None and vp.get("/DisplayDocTitle", False))
    if not title:
        add(Finding("title", "Document has a title", "fail", "serious", ["2.4.2"], "PDF/UA 7.1-10",
                    "No title in document properties.", fix="auto",
                    how_to_fix="Set a descriptive title in the document properties."))
    elif BAD_TITLE_RE.search(title):
        add(Finding("title", "Document has a title", "warn", "serious", ["2.4.2"], "PDF/UA 7.1-10",
                    f'Title "{title}" looks like a filename or application default.', fix="assisted",
                    how_to_fix="Replace with a short descriptive title."))
    else:
        add(Finding("title", "Document has a title", "pass", "serious", ["2.4.2"], "PDF/UA 7.1-10"))
    add(Finding("title-display", "Window shows the title, not the filename",
                "pass" if display_title else "fail", "moderate", ["2.4.2"], "PDF/UA 7.1-10",
                "" if display_title else "ViewerPreferences/DisplayDocTitle is not true.", fix="auto"))

    lang = str(pdf.Root.get("/Lang", "")).strip()
    if not lang:
        add(Finding("lang", "Document language is set", "fail", "serious", ["3.1.1"], "PDF/UA 7.2-34",
                    "No /Lang on the document.", fix="auto", how_to_fix="Set the primary language (e.g. en-US)."))
    elif not LANG_RE.match(lang):
        add(Finding("lang", "Document language is set", "fail", "serious", ["3.1.1"], "PDF/UA 7.2-34",
                    f'"{lang}" is not a valid language tag.', fix="auto"))
    else:
        add(Finding("lang", "Document language is set", "pass", "serious", ["3.1.1"], "PDF/UA 7.2-34"))

    # ---- headings ------------------------------------------------------------
    heads = [e for e in elems if e.std in HEADING_TYPES]
    levels = [int(e.std[1]) if len(e.std) == 2 else 1 for e in heads]
    skips = []
    prev = 0
    for e, lv in zip(heads, levels):
        if lv > prev + 1 and prev != 0:
            skips.append((e.page + 1 if e.page is not None else 0, prev, lv))
        elif prev == 0 and lv > 1:
            skips.append((e.page + 1 if e.page is not None else 0, 0, lv))
        prev = lv
    rep.facts["headings"] = len(heads)
    if tagged and real:
        if not heads and (n_pages >= 2 or sum(c.text_ops for c in covs) > 40):
            add(Finding("headings", "Headings structure the document", "fail", "serious", ["1.3.1", "2.4.6", "2.4.10"],
                        "PDF/UA 7.4", "The document has no heading tags, so users cannot navigate by section.",
                        fix="assisted", how_to_fix="Tag section titles as H1-H6 (auto-detected from font size/weight)."))
        elif skips:
            msg = "; ".join(f"p.{p}: H{a} → H{b}" if a else f"p.{p}: first heading is H{b}" for p, a, b in skips[:6])
            add(Finding("headings", "Headings structure the document", "fail", "serious", ["1.3.1", "2.4.6"],
                        "PDF/UA 7.4.2", f"Heading levels skip or do not start at H1 ({msg}).",
                        sorted({s[0] for s in skips}), "assisted", "Fix levels so each is at most one deeper than the last."))
        else:
            add(Finding("headings", "Headings structure the document", "pass" if heads else "na", "serious",
                        ["1.3.1", "2.4.6"], "PDF/UA 7.4"))
        if any(e.std == "H" for e in heads) and any(e.std in HEADING_TYPES - {"H"} for e in heads):
            add(Finding("headings-mixed", "Headings use one scheme (H vs H1-H6)", "fail", "moderate", ["1.3.1"],
                        "PDF/UA 7.4.4", "Both unnumbered H and numbered H1-H6 are used.", fix="manual"))

    # ---- figures ---------------------------------------------------------------
    figs = [e for e in elems if e.std == "Figure"]
    if tagged and real:
        no_alt = [e for e in figs if not (e.alt and e.alt.strip()) and not (e.actual and e.actual.strip())]
        if figs or any(c.image_ops for c in covs):
            if no_alt:
                add(Finding("figures-alt", "Images have text alternatives", "fail", "critical", ["1.1.1"],
                            "PDF/UA 7.3", f"{len(no_alt)} of {len(figs)} figure(s) have no alt text.",
                            sorted({e.page + 1 for e in no_alt if e.page is not None}), "assisted",
                            "Add alt text (the tool can draft it with an AI model for review, or read a sidecar file)."))
            else:
                add(Finding("figures-alt", "Images have text alternatives", "pass", "critical", ["1.1.1"], "PDF/UA 7.3"))
            weak = [e for e in figs if e.alt and BAD_ALT_RE.search(e.alt.strip())]
            if weak:
                add(Finding("figures-alt-quality", "Alt text is meaningful", "warn", "moderate", ["1.1.1"], "",
                            f"{len(weak)} figure(s) have alt text that looks like a filename or placeholder.",
                            sorted({e.page + 1 for e in weak if e.page is not None}), "manual"))
        else:
            add(Finding("figures-alt", "Images have text alternatives", "na", "critical", ["1.1.1"], "PDF/UA 7.3"))
    elif any(c.image_ops for c in covs):
        add(Finding("figures-alt", "Images have text alternatives", "fail", "critical", ["1.1.1"], "PDF/UA 7.3",
                    "Images present but the document is untagged, so none have alt text.",
                    [i + 1 for i, c in enumerate(covs) if c.image_ops], "assisted"))

    # ---- tables ------------------------------------------------------------------
    tables = [e for e in elems if e.std == "Table"]
    def _descend(e):
        for k in e.kids:
            yield k
            yield from _descend(k)
    bad_tables = []
    for t in tables:
        types = {d.std for d in _descend(t)}
        if "TH" not in types:
            bad_tables.append(t)
    rep.facts["tables"] = len(tables)
    if tables:
        add(Finding("tables", "Data tables have header cells", "fail" if bad_tables else "pass", "serious",
                    ["1.3.1"], "PDF/UA 7.5",
                    f"{len(bad_tables)} of {len(tables)} table(s) have no TH header cells." if bad_tables else "",
                    sorted({t.page + 1 for t in bad_tables if t.page is not None}), "assisted",
                    "Mark the header row/column as TH (with Scope)."))

    # ---- lists ---------------------------------------------------------------------
    bad_lists = []
    for e in elems:
        if e.std == "L" and any(k.std not in ("LI", "L", "Caption") for k in e.kids):
            bad_lists.append(e)
        if e.std == "LI" and e.parent is not None and e.parent.std != "L":
            bad_lists.append(e)
    if any(e.std == "L" for e in elems) or bad_lists:
        add(Finding("lists", "Lists are tagged correctly", "fail" if bad_lists else "pass", "moderate",
                    ["1.3.1"], "PDF/UA 7.6", "L must contain only LI items, each in L." if bad_lists else "",
                    sorted({e.page + 1 for e in bad_lists if e.page is not None}), "manual"))

    # ---- structure validity -----------------------------------------------------------
    unknown = Counter(e.raw for e in elems if e.std not in STANDARD_TYPES)
    if tagged and real:
        if unknown or problems:
            bits = []
            if unknown:
                bits.append("non-standard tags without a RoleMap: " + ", ".join(f"{k} ×{v}" for k, v in unknown.most_common(5)))
            if problems:
                bits.append(problems[0])
            add(Finding("struct-valid", "Tag tree is well-formed", "fail", "moderate", ["4.1.1", "1.3.1"],
                        "PDF/UA 7.1", "; ".join(bits), fix="manual"))
        else:
            add(Finding("struct-valid", "Tag tree is well-formed", "pass", "moderate", ["4.1.1", "1.3.1"], "PDF/UA 7.1"))

    # ---- annotations: links, forms, tab order ---------------------------------------
    tagged_objs = set()
    for e in elems:
        for o in e.objrs:
            try:
                tagged_objs.add(o.objgen)
            except Exception:
                pass
    links, widgets, others = [], [], []
    tab_missing = []
    for i, p in enumerate(pdf.pages):
        ann = p.obj.get("/Annots")
        if not ann:
            continue
        vis = [a for a in ann if str(a.get("/Subtype", "")) not in ("/Popup", "/TrapNet", "/PrinterMark")]
        if vis and str(p.obj.get("/Tabs", "")) != "/S":
            tab_missing.append(i + 1)
        for a in vis:
            st = str(a.get("/Subtype", ""))
            rec = (i, a)
            (links if st == "/Link" else widgets if st == "/Widget" else others).append(rec)

    if links:
        untagged = [i + 1 for i, a in links if a.objgen not in tagged_objs]
        add(Finding("links-tagged", "Links are tagged as links", "fail" if untagged else "pass", "serious",
                    ["2.4.4", "4.1.2"], "PDF/UA 7.18.5",
                    f"{len(untagged)} of {len(links)} link(s) are not in the tag tree." if untagged else "",
                    sorted(set(untagged)), "auto"))
        nameless = [i + 1 for i, a in links if not ("/Contents" in a and str(a.Contents).strip())]
        add(Finding("links-named", "Links have accessible descriptions", "fail" if nameless else "pass", "serious",
                    ["2.4.4"], "PDF/UA 7.18.5",
                    f"{len(nameless)} link(s) have no /Contents description." if nameless else "",
                    sorted(set(nameless)), "auto"))
    if widgets:
        no_tu = [i + 1 for i, a in widgets if not _field_name(a)]
        add(Finding("forms-labels", "Form fields have accessible names", "fail" if no_tu else "pass", "critical",
                    ["1.3.1", "3.3.2", "4.1.2"], "PDF/UA 7.18.4",
                    f"{len(no_tu)} field(s) have no tooltip (/TU)." if no_tu else "",
                    sorted(set(no_tu)), "assisted", "Give every field a descriptive tooltip."))
        un = [i + 1 for i, a in widgets if a.objgen not in tagged_objs]
        add(Finding("forms-tagged", "Form fields are in the tag tree", "fail" if un else "pass", "serious",
                    ["1.3.1", "4.1.2"], "PDF/UA 7.18.4",
                    f"{len(un)} field(s) are not tagged as Form elements." if un else "", sorted(set(un)), "auto"))
    if others:
        un = [i + 1 for i, a in others if a.objgen not in tagged_objs]
        add(Finding("annots-tagged", "Other annotations are tagged", "fail" if un else "pass", "moderate",
                    ["1.3.1"], "PDF/UA 7.18.1", sorted(set(un)) and f"{len(un)} untagged annotation(s)." or "",
                    sorted(set(un)), "auto"))
    if links or widgets or others:
        add(Finding("tab-order", "Tab order follows the structure", "fail" if tab_missing else "pass", "moderate",
                    ["2.4.3"], "PDF/UA 7.18.3",
                    f"{len(tab_missing)} page(s) with annotations lack /Tabs /S." if tab_missing else "",
                    tab_missing, "auto"))

    # ---- navigation -------------------------------------------------------------------------
    has_outline = bool(pdf.Root.get("/Outlines") is not None and pdf.Root.Outlines.get("/First") is not None)
    if n_pages >= BOOKMARK_MIN_PAGES:
        add(Finding("bookmarks", "Long document has bookmarks", "pass" if has_outline else "fail", "moderate",
                    ["2.4.5"], "PDF/UA 7.18.x", "" if has_outline else f"{n_pages} pages and no bookmarks.",
                    fix="auto", how_to_fix="Generate bookmarks from headings."))

    # ---- fonts ---------------------------------------------------------------------------------
    unembedded, no_unicode = set(), set()
    seen_fonts = set()
    for i, p in enumerate(pdf.pages):
        try:
            fonts = p.resources.get("/Font", {})
        except Exception:
            fonts = {}
        for _, f in fonts.items():
            try:
                og = f.objgen
                if og in seen_fonts:
                    continue
                seen_fonts.add(og)
                st = str(f.get("/Subtype", ""))
                if st == "/Type3":
                    continue
                desc = f.get("/FontDescriptor")
                if st == "/Type0":
                    df = f.DescendantFonts[0]
                    desc = df.get("/FontDescriptor")
                emb = desc is not None and any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3"))
                if not emb:
                    unembedded.add(str(f.get("/BaseFont", "?")).lstrip("/"))
                if st == "/Type0" and "/ToUnicode" not in f:
                    no_unicode.add(str(f.get("/BaseFont", "?")).lstrip("/"))
            except Exception:
                continue
    if no_unicode:
        add(Finding("fonts-unicode", "Text maps to Unicode (copy/search/read aloud)", "fail", "critical", ["1.1.1", "1.3.1"],
                    "PDF/UA 7.21.7", "Fonts without a ToUnicode map: " + ", ".join(sorted(no_unicode)[:5]) +
                    ". Screen readers may read gibberish.", fix="manual",
                    how_to_fix="Re-export from the source with embedded fonts, or OCR the pages."))
    if unembedded:
        add(Finding("fonts-embedded", "Fonts are embedded", "warn", "minor", [], "PDF/UA 7.21.4.1",
                    "Not embedded: " + ", ".join(sorted(unembedded)[:6]), fix="manual",
                    how_to_fix="Re-export with fonts embedded (PDF/UA requires it; WCAG does not)."))
    elif seen_fonts:
        add(Finding("fonts-embedded", "Fonts are embedded", "pass", "minor", [], "PDF/UA 7.21.4.1"))

    # ---- colour contrast ---------------------------------------------------------------------------
    if check_contrast and text_pages:
        try:
            from .contrast import check_document

            cres = check_document(data, [i for i in text_pages][:max_contrast_pages])
            rep.facts["contrast_pages_checked"] = cres["pages_checked"]
            if cres["failures"]:
                pages = sorted({f["page"] for f in cres["failures"]})
                ex = cres["failures"][0]
                add(Finding("contrast", "Text meets 4.5:1 contrast (3:1 for large text)", "fail", "serious",
                            ["1.4.3"], "", f'{len(cres["failures"])} text line(s) are too light, e.g. "{ex["text"][:50]}" '
                            f'at {ex["ratio"]:.1f}:1 on page {ex["page"]}.', pages, "manual",
                            "Darken the text colour in the source document and re-export (recolouring a PDF in place is unreliable)."))
            else:
                add(Finding("contrast", "Text meets 4.5:1 contrast (3:1 for large text)", "pass", "serious", ["1.4.3"], ""))
            if cres["unreliable"]:
                add(Finding("contrast-images", "Text over images/gradients has enough contrast", "manual", "moderate",
                            ["1.4.3"], "", f'{cres["unreliable"]} text line(s) sit on non-uniform backgrounds; verify visually.',
                            fix="manual"))
        except Exception as e:  # noqa: BLE001
            add(Finding("contrast", "Text meets 4.5:1 contrast (3:1 for large text)", "manual", "serious", ["1.4.3"], "",
                        f"Automatic contrast check could not run ({type(e).__name__}).", fix="manual"))

    # ---- things only a person can judge --------------------------------------------------------------
    if tagged and real and n_pages:
        multi = _multi_column_pages(data, text_pages[:40])
        add(Finding("reading-order", "Reading order matches the visual order", "manual", "serious", ["1.3.2"],
                    "PDF/UA 7.2",
                    "Automated tagging follows the content stream. " +
                    (f"Pages that look multi-column and need a check: {_page_label([p + 1 for p in multi])}." if multi else
                     "Spot-check with a screen reader or Acrobat's Reading Order view."), [p + 1 for p in multi], "manual"))
    if any(c.image_ops for c in covs) or any(c.path_ops > 40 for c in covs):
        add(Finding("images-of-text", "Charts and images don't carry unique text", "manual", "moderate",
                    ["1.4.5", "1.1.1"], "", "Charts/diagrams need a text description of their data and key takeaway.",
                    [i + 1 for i, c in enumerate(covs) if c.image_ops or c.path_ops > 40], "manual"))
    add(Finding("color-only", "Colour is not the only way information is conveyed", "manual", "moderate",
                ["1.4.1"], "", "Check charts, status indicators and links for non-colour cues.", fix="manual"))
    add(Finding("language-parts", "Passages in other languages are marked", "manual", "minor",
                ["3.1.2"], "", "Mark foreign-language passages with a /Lang on their tag.", fix="manual"))
    if any(c.path_ops > 25 and c.text_ops > 30 for c in covs):
        add(Finding("tables-visual", "Visual tables are tagged as tables", "manual", "serious", ["1.3.1"], "",
                    "Pages with many ruled lines may contain tables that need Table/TR/TH/TD tags.",
                    [i + 1 for i, c in enumerate(covs) if c.path_ops > 25 and c.text_ops > 30], "manual",
                    "Tag tables in Acrobat (Table Editor) or re-export from the source."))
    return rep


def _field_name(a) -> str:
    try:
        node = a
        while node is not None:
            if "/TU" in node and str(node.TU).strip():
                return str(node.TU).strip()
            node = node.get("/Parent")
    except Exception:
        pass
    return ""


def _has_tagged_text(a, elems) -> bool:
    def any_text(e) -> bool:
        return bool(e.mcids or e.alt) or any(any_text(k) for k in e.kids)

    for e in elems:
        if any(getattr(o, "objgen", None) == a.objgen for o in e.objrs):
            if any_text(e):
                return True
    return False


def _multi_column_pages(data: bytes, pages: list[int]) -> list[int]:
    out = []
    try:
        md = content.MinerDoc(data)
        for i in pages:
            lay = md.layout(i)
            boxes = [b for b in lay if hasattr(b, "get_text") and len(b.get_text().strip()) > 60]
            if len(boxes) < 2:
                continue
            width = lay.width
            left = [b for b in boxes if b.x1 < width * 0.55]
            right = [b for b in boxes if b.x0 > width * 0.45]
            overlap = any(l.y0 < r.y1 and r.y0 < l.y1 for l in left for r in right)
            if left and right and overlap:
                out.append(i)
    except Exception:
        pass
    return out
