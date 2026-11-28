"""Page content analysis shared by the evaluator and the tagger.

Two views of a page's content stream are combined:

* pikepdf gives the exact operator list (what we rewrite when tagging);
* pdfminer's interpreter gives decoded Unicode text, fonts, sizes and
  positions.  We subclass its interpreter so every text-showing operator can
  be tied back to its ordinal position in the operator list.
"""
from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass, field
from statistics import median

import pikepdf
from pdfminer.layout import LAParams, LTChar, LTContainer, LTImage, LTFigure
from pdfminer.pdfdevice import PDFDevice  # noqa: F401
from pdfminer.converter import PDFPageAggregator
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFPageInterpreter, PDFResourceManager
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser

logging.getLogger("pdfminer").setLevel(logging.ERROR)

SHOW_OPS = {"Tj", "TJ", "'", '"'}
PAINT_OPS = {"S", "s", "f", "F", "f*", "B", "B*", "b", "b*", "sh"}
PATH_BUILD_OPS = {"m", "l", "c", "v", "y", "h", "re"}
BOLD_RE = re.compile(r"bold|black|heavy|semibold|demi|extrabold", re.I)


class AlignmentError(RuntimeError):
    """pdfminer and pikepdf disagree about the page's operators."""


def op_name(instr) -> str:
    if isinstance(instr, pikepdf.ContentStreamInlineImage):
        return "BI"
    return str(instr.operator)


# ---------------------------------------------------------------------------
# Marked-content coverage (used by the evaluator)
# ---------------------------------------------------------------------------

@dataclass
class Coverage:
    tagged_text: int = 0
    artifact_text: int = 0
    untagged_text: int = 0
    tagged_images: int = 0
    artifact_images: int = 0
    untagged_images: int = 0
    untagged_paths: int = 0
    text_ops: int = 0
    invisible_text_ops: int = 0
    image_ops: int = 0
    path_ops: int = 0
    mcids: set = field(default_factory=set)


def _xobj_subtype(resources, name) -> str:
    try:
        xo = resources.XObject[name]
        return str(xo.get("/Subtype", ""))
    except Exception:
        return ""


def scan_coverage(page: pikepdf.Page) -> Coverage:
    cov = Coverage()
    try:
        ops = pikepdf.parse_content_stream(page)
    except Exception:
        return cov
    _scan(cov, ops, page.resources, [], 0, top=True)
    return cov


def _scan(cov: Coverage, ops, resources, stack, depth, top):
    """Walk an operator list; Form XObjects are entered with the caller's
    marked-content state so text inside a tagged form counts as tagged."""
    base = len(stack)
    render_mode = 0

    def state():
        if any(t == "/Artifact" for t, _ in stack):
            return "artifact"
        if any(m for _, m in stack):
            return "tagged"
        return "untagged"

    for instr in ops:
        name = op_name(instr)
        if name in ("BMC", "BDC"):
            tag = str(instr.operands[0])
            mcid = False
            if name == "BDC" and len(instr.operands) > 1:
                props = instr.operands[1]
                if isinstance(props, pikepdf.Dictionary) and "/MCID" in props:
                    mcid = True
                    if top:
                        cov.mcids.add(int(props["/MCID"]))
                elif isinstance(props, pikepdf.Name):
                    try:
                        p = resources.Properties[props]
                        if "/MCID" in p:
                            mcid = True
                            if top:
                                cov.mcids.add(int(p["/MCID"]))
                    except Exception:
                        pass
            stack.append((tag, mcid))
        elif name == "EMC":
            if len(stack) > base:
                stack.pop()
        elif name == "Tr":
            try:
                render_mode = int(instr.operands[0])
            except Exception:
                pass
        elif name in SHOW_OPS:
            cov.text_ops += 1
            if render_mode == 3:
                cov.invisible_text_ops += 1
            s = state()
            if s == "tagged":
                cov.tagged_text += 1
            elif s == "artifact":
                cov.artifact_text += 1
            else:
                cov.untagged_text += 1
        elif name == "BI" or (name == "Do" and _xobj_subtype(resources, instr.operands[0]) == "/Image"):
            cov.image_ops += 1
            s = state()
            if s == "tagged":
                cov.tagged_images += 1
            elif s == "artifact":
                cov.artifact_images += 1
            else:
                cov.untagged_images += 1
        elif name == "Do":
            if _xobj_subtype(resources, instr.operands[0]) == "/Form" and depth < 6:
                try:
                    xo = resources.XObject[instr.operands[0]]
                    fres = xo.get("/Resources") or resources
                    _scan(cov, pikepdf.parse_content_stream(xo), fres, stack, depth + 1, top=False)
                except Exception:
                    pass
        elif name in PAINT_OPS:
            cov.path_ops += 1
            if state() == "untagged":
                cov.untagged_paths += 1


# ---------------------------------------------------------------------------
# pdfminer-instrumented interpretation (used by the tagger)
# ---------------------------------------------------------------------------

@dataclass
class Run:
    """One text-showing operator."""
    show_index: int          # ordinal among top-level show operators
    text: str
    size: float
    bold: bool
    font: str
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass
class ImageRun:
    xobj_index: int          # ordinal among top-level Do/inline-image operators
    bbox: tuple[float, float, float, float] | None


@dataclass
class PageContent:
    width: float
    height: float
    runs: list[Run]
    images: list[ImageRun]
    n_show: int
    n_xobj: int


def _flatten(objs):
    for o in objs:
        yield o
        if isinstance(o, LTContainer):
            yield from _flatten(o)


class _Interp(PDFPageInterpreter):
    def __init__(self, rsrcmgr, device):
        super().__init__(rsrcmgr, device)
        self.depth = 0
        self.show_count = 0
        self.xobj_count = 0
        self.runs: list[Run] = []
        self.images: list[ImageRun] = []

    def render_contents(self, resources, streams, ctm=(1, 0, 0, 1, 0, 0)):
        self.depth += 1
        try:
            super().render_contents(resources, streams, ctm)
        finally:
            self.depth -= 1

    def _capture(self, fn):
        cont = self.device.cur_item
        before = len(cont._objs)
        fn()
        return list(_flatten(cont._objs[before:]))

    def do_TJ(self, seq):
        if self.depth != 1:
            return super().do_TJ(seq)
        idx = self.show_count
        self.show_count += 1
        new = self._capture(lambda: super(_Interp, self).do_TJ(seq))
        chars = [o for o in new if isinstance(o, LTChar)]
        if chars:
            txt = "".join(c.get_text() for c in chars)
            size = median(c.size for c in chars)
            fonts = [c.fontname for c in chars]
            font = max(set(fonts), key=fonts.count)
            self.runs.append(Run(
                idx, txt, float(size), bool(BOLD_RE.search(font or "")), font or "",
                min(c.x0 for c in chars), min(c.y0 for c in chars),
                max(c.x1 for c in chars), max(c.y1 for c in chars),
            ))

    def do_Do(self, xobjid_arg):
        if self.depth != 1:
            return super().do_Do(xobjid_arg)
        idx = self.xobj_count
        self.xobj_count += 1
        new = self._capture(lambda: super(_Interp, self).do_Do(xobjid_arg))
        imgs = [o for o in new if isinstance(o, LTImage)]
        if imgs:
            self.images.append(ImageRun(idx, tuple(imgs[0].bbox)))

    def do_EI(self, obj):
        if self.depth != 1:
            return super().do_EI(obj)
        idx = self.xobj_count
        self.xobj_count += 1
        new = self._capture(lambda: super(_Interp, self).do_EI(obj))
        imgs = [o for o in new if isinstance(o, LTImage)]
        if imgs:
            self.images.append(ImageRun(idx, tuple(imgs[0].bbox)))


class MinerDoc:
    """pdfminer view of a PDF held in memory."""

    def __init__(self, data: bytes):
        self.data = data
        self.fp = io.BytesIO(data)
        self.doc = PDFDocument(PDFParser(self.fp))
        self.pages = list(PDFPage.create_pages(self.doc))

    def page_content(self, index: int) -> PageContent:
        rsrc = PDFResourceManager()
        dev = PDFPageAggregator(rsrc, laparams=None)
        interp = _Interp(rsrc, dev)
        page = self.pages[index]
        interp.process_page(page)
        lt = dev.get_result()
        return PageContent(lt.width, lt.height, interp.runs, interp.images,
                           interp.show_count, interp.xobj_count)

    def layout(self, index: int, laparams: LAParams | None = None):
        from pdfminer.converter import PDFPageAggregator as Agg

        rsrc = PDFResourceManager()
        dev = Agg(rsrc, laparams=laparams or LAParams())
        interp = PDFPageInterpreter(rsrc, dev)
        interp.process_page(self.pages[index])
        return dev.get_result()


def pdf_bytes(pdf: pikepdf.Pdf) -> bytes:
    b = io.BytesIO()
    pdf.save(b)
    return b.getvalue()
