"""Build a tag tree for an untagged PDF by rewriting page content streams.

Strategy (layout analysis, no ML):
  * text-showing operators are grouped into lines, then paragraphs;
  * font size / weight relative to the body text decides heading levels;
  * bullet / number markers make lists;
  * repeated or page-number text in the top/bottom page margin is marked as an
    Artifact (pagination) so screen readers skip it;
  * raster images become Figure elements (alt text supplied separately);
  * vector rules, boxes and backgrounds become Artifacts;
  * link annotations become Link elements wrapping the text they cover.
Every piece of page content ends up either inside a structure element
(marked-content id) or inside an Artifact - which is what PDF/UA requires.
"""
from __future__ import annotations

import bisect
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Callable

import pikepdf
from pikepdf import Dictionary, Name, Operator

from .content import (
    AlignmentError, ImageRun, MinerDoc, PAINT_OPS, PATH_BUILD_OPS, PageContent,
    Run, SHOW_OPS, op_name, scan_coverage,
)
from .structure import StructBuilder

BULLETS = "•·▪◦‣⁃●○■□–—-*∙"
NUM_RE = re.compile(r"^\(?(\d{1,3}|[a-zA-Z]|[ivxlcdmIVXLCDM]{1,6})[.)]$")
PAGE_NUM_RE = re.compile(r"^(page\s*)?#(\s*(of|/)\s*#)?$|^-\s*#\s*-$")


@dataclass
class Heading:
    level: int
    text: str
    page: int  # 0-based
    y: float


@dataclass
class FigureInfo:
    key: str
    page: int  # 0-based
    bbox: tuple | None
    alt: str | None = None
    xobj_name: str | None = None


@dataclass
class TagOptions:
    alt_text: dict[str, str] = field(default_factory=dict)
    alt_provider: Callable[[FigureInfo], str | None] | None = None
    mark_pagination: bool = True


@dataclass
class TagResult:
    pages_tagged: int = 0
    pages_failed: list[tuple[int, str]] = field(default_factory=list)
    headings: list[Heading] = field(default_factory=list)
    figures: list[FigureInfo] = field(default_factory=list)
    possible_tables: list[int] = field(default_factory=list)  # 0-based pages
    table_notes: list[int] = field(default_factory=list)      # pages where a table was tagged (header row assumed)
    counts: Counter = field(default_factory=Counter)
    first_page_title: str | None = None
    last_heading_level: int = 0


# ---------------------------------------------------------------------------
# internal node model
# ---------------------------------------------------------------------------

@dataclass
class RunsKid:
    runs: list[Run]
    mcids: list[int] = field(default_factory=list)


@dataclass
class OpKid:  # a single non-text operator (image)
    op: int
    mcids: list[int] = field(default_factory=list)


@dataclass
class LinkKid:
    annot: pikepdf.Object
    runs: list[Run]
    mcids: list[int] = field(default_factory=list)


@dataclass
class Node:
    tag: str
    kids: list = field(default_factory=list)
    alt: str | None = None
    sort_y: float = 0.0
    widget: pikepdf.Object | None = None
    annot_tag: str | None = None
    attrs: dict | None = None


@dataclass
class Line:
    runs: list[Run]
    first_op: int = 0

    @property
    def text(self):
        return "".join(r.text for r in self.runs)

    @property
    def size(self):
        return max(r.size for r in self.runs)

    @property
    def bold(self):
        n = sum(len(r.text) for r in self.runs if r.bold)
        return n * 2 > max(1, sum(len(r.text) for r in self.runs))

    @property
    def groups(self) -> list[list[Run]]:
        """Runs merged into visual words/cells: some producers emit one operator per glyph."""
        out: list[list[Run]] = [[self.runs[0]]]
        for r in self.runs[1:]:
            if r.x0 - out[-1][-1].x1 < 1.2 * max(r.size, out[-1][-1].size):
                out[-1].append(r)
            else:
                out.append([r])
        return out

    @property
    def x0(self):
        return min(r.x0 for r in self.runs)

    @property
    def y0(self):
        return min(r.y0 for r in self.runs)

    @property
    def y1(self):
        return max(r.y1 for r in self.runs)


@dataclass
class Wrap:
    start: int
    end: int
    tag: str                      # struct tag or "Artifact"
    props: Dictionary | None = None
    kid: object | None = None     # RunsKid / OpKid / LinkKid that owns this MCID
    mcid: int | None = None


# ---------------------------------------------------------------------------
# line / block analysis
# ---------------------------------------------------------------------------

def build_lines(runs: list[Run], show_ops: list[int]) -> list[Line]:
    lines: list[Line] = []
    cur: list[Run] = []
    for r in runs:
        if cur:
            p = cur[-1]
            tol = 0.35 * max(r.size, p.size)
            if abs(r.y0 - p.y0) <= tol and r.x0 >= p.x0 - 1:
                cur.append(r)
                continue
            lines.append(Line(cur, show_ops[cur[0].show_index]))
        cur = [r]
    if cur:
        lines.append(Line(cur, show_ops[cur[0].show_index]))
    return lines


def _norm(text: str) -> str:
    return " ".join(text.strip().lower().split())


def _pagenum_form(text: str) -> str:
    return re.sub(r"\d+", "#", _norm(text))


# pdfminer emits "(cid:N)" for glyphs it cannot map; a lone one that starts a
# line followed by more text is almost always a bullet symbol.
CID_RE = re.compile(r"^\(cid:\d+\)$")


def marker_of(line: Line):
    """Return (kind, separate_run) if the line starts with a list marker."""
    g = line.groups
    first = "".join(r.text for r in g[0]).strip()
    if first and len(g) > 1 and (first in BULLETS or CID_RE.match(first) or NUM_RE.match(first)):
        kind = "number" if NUM_RE.match(first) and first not in BULLETS else "bullet"
        return kind, True
    t = line.text.lstrip()
    if len(t) > 2 and t[0] in BULLETS and t[1] in " \t " and not (t[0] in "-*" and t[1:].strip()[:1].isdigit()):
        return "bullet", False
    m = re.match(r"^(\(?(\d{1,3}|[a-zA-Z])[.)])\s+\S", t)
    if m:
        return "number", False
    return None


def is_table_row(line: Line) -> bool:
    return len(line.groups) >= 3


def cells_of(line: Line):
    """Column cells (each a list of runs) when a line is clearly several columns, else None."""
    g = line.groups
    return g if len(g) >= 2 else None


def _aligned(prev, cur, tol: float = 8.0) -> bool:
    if len(prev) != len(cur):
        return False
    return all(abs(a[0].x0 - b[0].x0) <= tol or abs(a[-1].x1 - b[-1].x1) <= tol for a, b in zip(prev, cur))


def find_tables(lines: list[Line]) -> list[list[Line]]:
    """Groups of consecutive, column-aligned rows (rows are lines of >=2 separate cells)."""
    groups, cur = [], []

    def close():
        nonlocal cur
        if cur:
            ncols = len(cells_of(cur[0]))
            if (len(cur) >= 2 and ncols >= 3) or (len(cur) >= 3 and ncols >= 2):
                groups.append(cur)
        cur = []

    for ln in lines:
        cells = cells_of(ln)
        if cells is None:
            close()
            continue
        if cur:
            prev = cur[-1]
            gap = prev.y0 - ln.y0
            if not (0 < gap <= 3 * max(prev.size, ln.size) and _aligned(cells_of(prev), cells)):
                close()
        cur.append(ln)
    close()
    return groups


def _dominant(vals: list[tuple[float, int]]) -> float:
    c: Counter = Counter()
    for v, w in vals:
        c[round(v * 2) / 2] += w
    return c.most_common(1)[0][0] if c else 11.0


# ---------------------------------------------------------------------------
# the tagger
# ---------------------------------------------------------------------------

class _PagePlan:
    def __init__(self, index, page, ops, pc, show_ops, xobj_ops, xobj_kinds):
        self.index = index
        self.page = page
        self.ops = ops
        self.pc = pc
        self.show_ops = show_ops
        self.xobj_ops = xobj_ops
        self.xobj_kinds = xobj_kinds  # list of 'Image'|'Form'|'Inline'
        self.lines: list[Line] = []
        self.artifact_lines: set[int] = set()  # id(line)


def strip_marked_content(ops):
    """Drop existing BMC/BDC/EMC (except optional-content /OC)."""
    out, stack = [], []
    for instr in ops:
        n = op_name(instr)
        if n in ("BMC", "BDC"):
            keep = str(instr.operands[0]) == "/OC"
            stack.append(keep)
            if keep:
                out.append(instr)
        elif n == "EMC":
            keep = stack.pop() if stack else False
            if keep:
                out.append(instr)
        else:
            out.append(instr)
    return out


def _form_has_text(page, name) -> bool:
    try:
        xo = page.resources.XObject[name]
        data = xo.read_bytes()
        return bool(re.search(rb"\b(Tj|TJ)\b", data))
    except Exception:
        return False


def _xobj_kind(page, name) -> str:
    try:
        return str(page.resources.XObject[name].get("/Subtype", "")).lstrip("/")
    except Exception:
        return "Image"


def _prepare_page(index, page, miner: MinerDoc) -> _PagePlan:
    ops = strip_marked_content(list(pikepdf.parse_content_stream(page)))
    show_ops, xobj_ops, kinds = [], [], []
    for i, ins in enumerate(ops):
        n = op_name(ins)
        if n in SHOW_OPS:
            show_ops.append(i)
        elif n == "BI":
            xobj_ops.append(i)
            kinds.append("Inline")
        elif n == "Do":
            xobj_ops.append(i)
            kinds.append(_xobj_kind(page, ins.operands[0]))
    pc = miner.page_content(index)
    if pc.n_show != len(show_ops) or pc.n_xobj != len(xobj_ops):
        raise AlignmentError(
            f"operator mismatch (text {pc.n_show}/{len(show_ops)}, xobjects {pc.n_xobj}/{len(xobj_ops)})"
        )
    plan = _PagePlan(index, page, ops, pc, show_ops, xobj_ops, kinds)
    plan.lines = _split_band_lines(build_lines(pc.runs, show_ops), pc, show_ops)
    return plan


def _split_band_lines(lines: list[Line], pc: PageContent, show_ops) -> list[Line]:
    """Footer/header text like "Report title ....... Page 3" is one visual line but
    two logical pieces; split at wide gaps so each piece can be judged alone."""
    out: list[Line] = []
    for ln in lines:
        if not _in_band(ln, pc) or len(ln.runs) < 2:
            out.append(ln)
            continue
        grp = [ln.runs[0]]
        for r in ln.runs[1:]:
            if r.x0 - grp[-1].x1 > 1.5 * ln.size:
                out.append(Line(grp, show_ops[grp[0].show_index]))
                grp = [r]
            else:
                grp.append(r)
        out.append(Line(grp, show_ops[grp[0].show_index]))
    return out


def _annots(page, subtype=None):
    out = []
    for a in page.obj.get("/Annots", []) or []:
        try:
            st = str(a.get("/Subtype", ""))
        except Exception:
            continue
        if subtype is None or st == subtype:
            out.append(a)
    return out


def _link_text_matches(run: Run, rect) -> str:
    """'full', 'partial' or '' depending on how much of the run the link covers."""
    x0, y0, x1, y1 = rect
    ox = min(run.x1, x1) - max(run.x0, x0)
    oy = min(run.y1, y1 + 2) - max(run.y0, y0 - 2)
    if ox <= 0 or oy <= 0:
        return ""
    w = max(run.x1 - run.x0, 0.01)
    if ox / w >= 0.85:
        return "full"
    return "partial" if ox / w > 0.05 else ""


def tag_pdf(pdf: pikepdf.Pdf, miner: MinerDoc, opts: TagOptions | None = None) -> tuple[StructBuilder, TagResult]:
    opts = opts or TagOptions()
    res = TagResult()
    sb = StructBuilder(pdf)
    pages = list(pdf.pages)
    plans: dict[int, _PagePlan] = {}
    for i, page in enumerate(pages):
        try:
            plans[i] = _prepare_page(i, page, miner)
        except Exception as e:  # noqa: BLE001
            res.pages_failed.append((i, f"{type(e).__name__}: {e}"))

    # ---- document-wide statistics --------------------------------------
    n_pages = len(pages)
    band_counts: Counter = Counter()
    for pl in plans.values():
        seen = set()
        for ln in pl.lines:
            if _in_band(ln, pl.pc):
                seen.add(_band_key(ln, pl.pc))
        band_counts.update(seen)
    repeat_threshold = max(2, math.ceil(n_pages * 0.5))

    for pl in plans.values():
        for ln in pl.lines:
            if not opts.mark_pagination or not _in_band(ln, pl.pc):
                continue
            nt = _band_key(ln, pl.pc)
            if PAGE_NUM_RE.match(_pagenum_form(ln.text)) or (n_pages >= 2 and band_counts[nt] >= repeat_threshold and len(nt) < 125):
                pl.artifact_lines.add(id(ln))

    body_vals = [
        (ln.size, len(ln.text)) for pl in plans.values() for ln in pl.lines
        if id(ln) not in pl.artifact_lines
    ]
    body = _dominant(body_vals)

    def heading_style(ln: Line):
        t = ln.text.strip()
        if not t or not any(ch.isalpha() for ch in t) or len(t) > 130 or marker_of(ln):
            return None
        big = ln.size >= body * 1.12
        boldhead = ln.bold and ln.size >= body * 0.95 and len(ln.groups) == 1
        if big or boldhead:
            return (round(ln.size * 2) / 2, ln.bold)
        return None

    styles = sorted({s for pl in plans.values() for ln in pl.lines
                     if id(ln) not in pl.artifact_lines and (s := heading_style(ln))},
                    key=lambda s: (-s[0], not s[1]))
    # a bold line the same size as the body only counts when body is not bold
    level_of = {s: min(i + 1, 6) for i, s in enumerate(styles)}

    # ---- per-page node construction + content rewrite -------------------
    for i, page in enumerate(pages):
        if i not in plans:
            continue
        pl = plans[i]
        try:
            nodes, wraps = _plan_page(pl, body, heading_style, level_of, opts, res)
        except Exception as e:  # noqa: BLE001
            res.pages_failed.append((i, f"{type(e).__name__}: {e}"))
            continue
        _apply_page(pdf, sb, pl, nodes, wraps, res)
        res.pages_tagged += 1
    res.pages_failed.sort()
    return sb, res


def _band_key(ln: Line, pc: PageContent) -> str:
    """Top and bottom margins are counted separately, so a title that is also
    used as a running footer is still recognised as a title on page 1."""
    return ("T:" if ln.y1 > pc.height * 0.5 else "B:") + _norm(ln.text)


def _in_band(ln: Line, pc: PageContent) -> bool:
    return ln.y1 > pc.height * 0.91 or ln.y0 < pc.height * 0.09


def _plan_page(pl: _PagePlan, body, heading_style, level_of, opts, res):
    ops, pc = pl.ops, pl.pc
    names = [op_name(x) for x in ops]
    page = pl.page

    # ---- items occupying the stream (show ops, xobjects, painted paths) ----
    occupied: set[int] = set(pl.show_ops) | set(pl.xobj_ops)
    paths: list[tuple[int, int]] = []
    start = None
    for i, n in enumerate(names):
        if n in PATH_BUILD_OPS:
            if start is None:
                start = i
        elif n in ("W", "W*"):
            pass
        elif n in PAINT_OPS:
            s = start if (start is not None and n != "sh") else i
            paths.append((s, i))
            occupied.update(range(s, i + 1))
            start = None
        elif n == "n":
            start = None
        else:
            start = None

    wraps: list[Wrap] = []
    nodes: list[Node] = []
    cov = scan_coverage(page)
    ocr_page = bool(cov.text_ops) and cov.invisible_text_ops == cov.text_ops

    # unrendered show ops (no glyphs) and form XObjects
    rendered = {r.show_index for r in pc.runs}
    for k, op_i in enumerate(pl.show_ops):
        if k not in rendered:
            wraps.append(Wrap(op_i, op_i, "Artifact"))
    imgs = {im.xobj_index: im for im in pc.images}
    fig_n = 0
    events: list[tuple[int, str, object]] = []
    for ln in pl.lines:
        if id(ln) in pl.artifact_lines:
            sub = "Footer" if ln.y1 < pc.height * 0.5 else "Header"
            for grp in _runs_ranges(ln.runs, pl.show_ops):
                wraps.append(Wrap(grp[0], grp[1], "Artifact", Dictionary(Type=Name.Pagination, Subtype=Name("/" + sub)),
                                  kid=("artifact-runs", [r for r in ln.runs if grp[0] <= pl.show_ops[r.show_index] <= grp[1]])))
            res.counts["artifact-lines"] += 1
        else:
            events.append((ln.first_op, "line", ln))
    for k, op_i in enumerate(pl.xobj_ops):
        kind = pl.xobj_kinds[k]
        if kind == "Form":
            name = ops[op_i].operands[0]
            if _form_has_text(page, name):
                res.pages_failed.append((pl.index, "text inside a Form XObject is not tagged"))
            else:
                wraps.append(Wrap(op_i, op_i, "Artifact"))
            continue
        im = imgs.get(k)
        bb = im.bbox if im else None
        if bb is not None and ocr_page and (bb[2] - bb[0]) * (bb[3] - bb[1]) >= 0.8 * pc.width * pc.height:
            wraps.append(Wrap(op_i, op_i, "Artifact"))
            res.counts["ocr-background"] += 1
            continue
        if bb is not None:
            area = (bb[2] - bb[0]) * (bb[3] - bb[1])
            if area < 0.0008 * pc.width * pc.height or min(bb[2] - bb[0], bb[3] - bb[1]) < 6:
                wraps.append(Wrap(op_i, op_i, "Artifact"))
                res.counts["decorative-images"] += 1
                continue
        events.append((op_i, "image", (op_i, bb, ops[op_i].operands[0] if kind == "Image" else None)))
    for s, e in paths:
        wraps.append(Wrap(s, e, "Artifact"))
        res.counts["artifacts-paths"] += 1
    events.sort(key=lambda t: t[0])

    # ---- links: map runs -> annotation ---------------------------------
    links = _annots(page, "/Link")
    link_rect = {id(a): [float(v) for v in a.Rect] for a in links if "/Rect" in a}
    run_link: dict[int, tuple[pikepdf.Object, str]] = {}
    for a in links:
        rect = link_rect.get(id(a))
        if not rect:
            continue
        rect = [min(rect[0], rect[2]), min(rect[1], rect[3]), max(rect[0], rect[2]), max(rect[1], rect[3])]
        link_rect[id(a)] = rect
        for ev in events:
            if ev[1] != "line":
                continue
            for r in ev[2].runs:
                m = _link_text_matches(r, rect)
                if m and r.show_index not in run_link:
                    run_link[r.show_index] = (a, m)

    claimed_links: set[int] = set()

    def para_kids(runs: list[Run]):
        kids, buf = [], []

        def flush():
            nonlocal buf
            if buf:
                kids.append(RunsKid(buf))
                buf = []

        i = 0
        while i < len(runs):
            r = runs[i]
            lk = run_link.get(r.show_index)
            if lk and lk[1] == "full" and id(lk[0]) not in claimed_links:
                flush()
                grp = [r]
                while i + 1 < len(runs) and run_link.get(runs[i + 1].show_index, (None,))[0] is lk[0] \
                        and run_link[runs[i + 1].show_index][1] == "full":
                    i += 1
                    grp.append(runs[i])
                claimed_links.add(id(lk[0]))
                kids.append(LinkKid(lk[0], grp))
            else:
                buf.append(r)
            i += 1
        flush()
        return kids

    # ---- group events into blocks --------------------------------------
    block_lines: list[Line] = []
    last_ev_kind = None

    def new_para_needed(prev: Line, ln: Line) -> bool:
        gap = prev.y0 - ln.y0
        return gap <= 0 or gap > 1.6 * max(prev.size, ln.size) or abs(prev.size - ln.size) > 0.6

    def flush_block(lines: list[Line]):
        if not lines:
            return
        runs = [r for ln in lines for r in ln.runs]
        n = Node("P", para_kids(runs), sort_y=lines[0].y1)
        nodes.append(n)
        res.counts["paragraphs"] += 1

    items_buf: list[tuple[str, Line, bool]] = []  # pending list items
    list_state = {"kind": None, "x": None, "items": []}

    def flush_list():
        items = list_state["items"]
        if not items:
            return
        if len(items) >= 2:
            lnode = Node("L", sort_y=items[0][0][0].y1)
            for lines, sep in items:
                li = Node("LI")
                first = lines[0]
                if sep and len(first.groups) > 1:
                    li.kids.append(Node("Lbl", [RunsKid(first.groups[0])]))
                    rest = [r for g in first.groups[1:] for r in g] + [r for ln in lines[1:] for r in ln.runs]
                    body_runs = rest
                else:
                    body_runs = [r for ln in lines for r in ln.runs]
                li.kids.append(Node("LBody", para_kids(body_runs)))
                lnode.kids.append(li)
            nodes.append(lnode)
            res.counts["lists"] += 1
        else:  # lone marker line: just a paragraph
            lines, _ = items[0]
            nodes.append(Node("P", para_kids([r for ln in lines for r in ln.runs]), sort_y=lines[0].y1))
            res.counts["paragraphs"] += 1
        list_state.update(kind=None, x=None, items=[])

    def flush_all():
        nonlocal block_lines
        flush_list()
        flush_block(block_lines)
        block_lines = []

    heading_lines: list[tuple[Line, int]] = []

    def flush_heading():
        nonlocal heading_lines
        if not heading_lines:
            return
        lvl = min(heading_lines[0][1], res.last_heading_level + 1)  # never skip a level
        res.last_heading_level = lvl
        runs = [r for ln, _ in heading_lines for r in ln.runs]
        text = " ".join(" ".join(ln.text.split()) for ln, _ in heading_lines)
        nodes.append(Node(f"H{lvl}", para_kids(runs), sort_y=heading_lines[0][0].y1))
        res.headings.append(Heading(lvl, text, pl.index, heading_lines[0][0].y1))
        res.counts["headings"] += 1
        heading_lines = []

    prev_line: Line | None = None
    table_run = 0
    page_lines = [p for _, k, p in events if k == "line"]
    table_groups = {id(g[0]): g for g in find_tables(page_lines)}
    in_table: set[int] = {id(l) for g in table_groups.values() for l in g}
    for _, kind, payload in events:
        if kind == "image":
            flush_heading(); flush_all()
            op_i, bb, xname = payload
            fig_n += 1
            key = f"p{pl.index + 1}-f{fig_n}"
            fi = FigureInfo(key, pl.index, bb, None, str(xname) if xname else None)
            alt = opts.alt_text.get(key)
            if alt is None and opts.alt_provider:
                try:
                    alt = opts.alt_provider(fi)
                except Exception:  # noqa: BLE001
                    alt = None
            fi.alt = alt
            res.figures.append(fi)
            node = Node("Figure", [OpKid(op_i)], alt=alt or None, sort_y=bb[3] if bb else 0)
            nodes.append(node)
            prev_line = None
            continue
        ln: Line = payload
        if id(ln) in table_groups:
            flush_heading(); flush_all()
            rows = table_groups[id(ln)]
            tnode = Node("Table", sort_y=rows[0].y1)
            for ri, row in enumerate(rows):
                tr = Node("TR")
                for grp in cells_of(row):
                    cell = Node("TH" if ri == 0 else "TD", [RunsKid(grp)])
                    if ri == 0:
                        cell.attrs = {"Scope": "Column"}
                    tr.kids.append(cell)
                tnode.kids.append(tr)
            nodes.append(tnode)
            res.counts["tables"] += 1
            res.table_notes.append(pl.index)
            prev_line = rows[-1]
            continue
        if id(ln) in in_table:
            continue
        table_run = table_run + 1 if is_table_row(ln) else 0
        if table_run == 3 and pl.index not in res.possible_tables:
            res.possible_tables.append(pl.index)
        hs = heading_style(ln)
        mk = marker_of(ln)
        if hs and not mk:
            flush_list(); flush_block(block_lines); block_lines = []
            lvl = level_of.get(hs, 6)
            if heading_lines and heading_lines[0][1] == lvl and prev_line is not None \
                    and 0 < prev_line.y0 - ln.y0 <= 1.6 * ln.size:
                heading_lines.append((ln, lvl))
            else:
                flush_heading()
                heading_lines = [(ln, lvl)]
            prev_line = ln
            continue
        flush_heading()
        if mk:
            kind_m, sep = mk
            flush_block(block_lines); block_lines = []
            if list_state["items"] and (list_state["kind"] != kind_m or abs(list_state["x"] - ln.x0) > 8):
                flush_list()
            if not list_state["items"]:
                list_state.update(kind=kind_m, x=ln.x0)
            list_state["items"].append(([ln], sep))
        elif list_state["items"]:
            last_lines = list_state["items"][-1][0]
            if prev_line is not None and 0 < prev_line.y0 - ln.y0 <= 1.6 * ln.size and ln.x0 >= list_state["x"] - 1:
                last_lines.append(ln)
            else:
                flush_list()
                block_lines = [ln]
        else:
            if block_lines and not new_para_needed(block_lines[-1], ln):
                block_lines.append(ln)
            else:
                flush_block(block_lines)
                block_lines = [ln]
        prev_line = ln
    flush_heading(); flush_all()

    # ---- form fields & other annotations (placed by vertical position) ----
    for a in _annots(page):
        st = str(a.get("/Subtype", ""))
        if st == "/Widget":
            top = max(float(a.Rect[1]), float(a.Rect[3])) if "/Rect" in a else 0
            n = Node("Form", widget=a, sort_y=top)
        elif st in ("/Link", "/Popup", "/TrapNet", "/PrinterMark"):
            continue
        else:
            top = max(float(a.Rect[1]), float(a.Rect[3])) if "/Rect" in a else 0
            n = Node("Annot", widget=a, sort_y=top)
        pos = next((j for j, x in enumerate(nodes) if x.sort_y < top - 1), len(nodes))
        nodes.insert(pos, n)

    # links not matched to text: OBJR-only Link node
    for a in links:
        if id(a) in claimed_links:
            continue
        rect = link_rect.get(id(a))
        top = rect[3] if rect else 0
        ln_node = Node("Link", widget=a, sort_y=top)
        # prefer the paragraph that overlaps the link
        host = None
        for nd in nodes:
            for k in nd.kids:
                if isinstance(k, RunsKid) and rect and any(_link_text_matches(r, rect) for r in k.runs):
                    host = nd
                    break
            if host:
                break
        if host is not None and host.tag == "P":
            host.kids.append(ln_node)
        else:
            pos = next((j for j, x in enumerate(nodes) if x.sort_y < top - 1), len(nodes))
            nodes.insert(pos, ln_node)

    # ---- turn run-based kids into concrete marked-content ranges --------
    occ_other = occupied
    rn_wraps: list[Wrap] = []

    def collect(node):
        for k in node.kids:
            if isinstance(k, Node):
                collect(k)
            else:
                yield_kids.append(k)

    yield_kids: list = []
    for nd in nodes:
        collect(nd)
    for k in yield_kids:
        if isinstance(k, (RunsKid, LinkKid)):
            tag = "Span" if isinstance(k, RunsKid) else "Link"
            for a_, b_ in _runs_ranges(k.runs, pl.show_ops, names=names, occupied=occ_other):
                rn_wraps.append(Wrap(a_, b_, tag, kid=k))
        elif isinstance(k, OpKid):
            rn_wraps.append(Wrap(k.op, k.op, "Figure", kid=k))
    wraps.extend(rn_wraps)
    return nodes, wraps


def _runs_ranges(runs: list[Run], show_ops: list[int], names=None, occupied=None):
    """Op ranges covering `runs`, split so that every range is valid for BDC/EMC."""
    if not runs:
        return []
    ops = [show_ops[r.show_index] for r in runs]
    if names is None:
        return [(ops[0], ops[-1])] if len(ops) == 1 else [(o, o) for o in ops]
    own = set(ops)
    n = len(names)

    def valid(a, b):
        bt = q = 0
        for i in range(a, b + 1):
            nm = names[i]
            if nm == "BT":
                bt += 1
            elif nm == "ET":
                bt -= 1
            elif nm == "q":
                q += 1
            elif nm == "Q":
                q -= 1
            if bt < 0 or q < 0:
                return False
        if bt or q:
            return False
        return all((i not in occupied) or (i in own) for i in range(a, b + 1))

    def best(a, b):
        if valid(a, b):
            return (a, b)
        j = a
        while j >= 0 and names[j] != "BT":
            j -= 1
        k = b
        while k < n and names[k] != "ET":
            k += 1
        a2 = j if j >= 0 and all(i not in occupied or i in own for i in range(j, a)) else a
        b2 = k if k < n and all(i not in occupied or i in own for i in range(b + 1, k + 1)) else b
        if (a2, b2) != (a, b) and valid(a2, b2):
            return (a2, b2)
        return None

    out = []
    # try everything at once, then contiguous chunks, then single operators
    r = best(ops[0], ops[-1])
    if r:
        return [r]
    chunk = [ops[0]]
    chunks = []
    for o, r_ in zip(ops[1:], runs[1:]):
        chunks.append(chunk) if False else None
        chunk.append(o)
    # contiguous-in-stream chunks (no foreign item in between)
    chunks, cur = [], [ops[0]]
    for o in ops[1:]:
        if all((i not in occupied) or (i in own) for i in range(cur[-1] + 1, o)):
            cur.append(o)
        else:
            chunks.append(cur)
            cur = [o]
    chunks.append(cur)
    for ch in chunks:
        r = best(ch[0], ch[-1]) if len(ch) > 1 else None
        if r:
            out.append(r)
        else:
            out.extend((o, o) for o in ch)
    return out


def _apply_page(pdf, sb: StructBuilder, pl: _PagePlan, nodes: list[Node], wraps: list[Wrap], res: TagResult):
    page = pl.page
    wraps.sort(key=lambda w: (w.start, -w.end))
    # drop overlapping wraps (keep the first)
    clean, last_end = [], -1
    for w in wraps:
        if w.start > last_end:
            clean.append(w)
            last_end = w.end
        else:
            res.counts["dropped-overlap"] += 1
    mcid = 0
    begins: dict[int, list] = {}
    ends: dict[int, int] = {}
    for w in clean:
        if w.tag == "Artifact":
            if w.props is not None:
                ins = pikepdf.ContentStreamInstruction([Name.Artifact, w.props], Operator("BDC"))
            else:
                ins = pikepdf.ContentStreamInstruction([Name.Artifact], Operator("BMC"))
        else:
            w.mcid = mcid
            mcid += 1
            if w.kid is not None:
                w.kid.mcids.append(w.mcid)
            ins = pikepdf.ContentStreamInstruction([Name("/" + w.tag), Dictionary(MCID=w.mcid)], Operator("BDC"))
        begins.setdefault(w.start, []).append(ins)
        ends[w.end] = ends.get(w.end, 0) + 1
    out = []
    emc = pikepdf.ContentStreamInstruction([], Operator("EMC"))
    for i, ins in enumerate(pl.ops):
        out.extend(begins.get(i, []))
        out.append(ins)
        for _ in range(ends.get(i, 0)):
            out.append(emc)
    page.obj.Contents = pdf.make_stream(pikepdf.unparse_content_stream(out))

    def emit(node: Node, parent):
        if node.widget is not None:
            e = sb.elem(node.tag, parent, page=page)
            sb.add_objr(e, page, node.widget)
            if node.tag == "Link":
                txt = _annot_name(node.widget)
                if txt:
                    e.Alt = pikepdf.String(txt)
                    if "/Contents" not in node.widget:
                        node.widget.Contents = pikepdf.String(txt)
            return
        e = sb.elem(node.tag, parent, page=page, alt=node.alt)
        if node.attrs:
            e.A = Dictionary(O=Name.Table, **{k: Name("/" + v) for k, v in node.attrs.items()})
        for k in node.kids:
            if isinstance(k, Node):
                emit(k, e)
            elif isinstance(k, LinkKid):
                le = sb.elem("Link", e, page=page)
                for m in k.mcids:
                    sb.add_mcid(le, page, m)
                sb.add_objr(le, page, k.annot)
                txt = "".join(r.text for r in k.runs).strip()
                if "/Contents" not in k.annot and txt:
                    k.annot.Contents = pikepdf.String(txt)
            else:
                for m in k.mcids:
                    sb.add_mcid(e, page, m)

    for nd in nodes:
        emit(nd, sb.doc)


def _annot_name(annot) -> str:
    try:
        if "/Contents" in annot:
            return str(annot.Contents)
        a = annot.get("/A")
        if a is not None and "/URI" in a:
            return str(a.URI)
    except Exception:
        pass
    return ""
