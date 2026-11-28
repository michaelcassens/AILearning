"""Helpers for building a PDF structure tree (the 'tags') with pikepdf."""
from __future__ import annotations

import pikepdf
from pikepdf import Array, Dictionary, Name, NumberTree

STANDARD_TYPES = {
    "Document", "DocumentFragment", "Part", "Art", "Sect", "Div", "BlockQuote",
    "Caption", "TOC", "TOCI", "Index", "NonStruct", "Private", "P", "H",
    "H1", "H2", "H3", "H4", "H5", "H6", "L", "LI", "Lbl", "LBody", "Table",
    "TR", "TH", "TD", "THead", "TBody", "TFoot", "Span", "Quote", "Note",
    "Reference", "BibEntry", "Code", "Link", "Annot", "Ruby", "RB", "RT",
    "RP", "Warichu", "WT", "WP", "Figure", "Formula", "Form",
}
HEADING_TYPES = {"H", "H1", "H2", "H3", "H4", "H5", "H6"}


class StructBuilder:
    """Creates StructTreeRoot / StructElem objects and the ParentTree."""

    def __init__(self, pdf: pikepdf.Pdf):
        self.pdf = pdf
        self.root = pdf.make_indirect(Dictionary(Type=Name.StructTreeRoot))
        self.doc = self.elem("Document", self.root)
        self.root.K = self.doc
        self._next_key = 0
        self._parent_entries: dict[int, object] = {}
        self._page_arrays: dict[int, list] = {}

    # -- elements --------------------------------------------------------
    def elem(self, tag: str, parent, page=None, alt: str | None = None, **extra):
        d = Dictionary(Type=Name.StructElem, S=Name("/" + tag), P=parent)
        if page is not None:
            d.Pg = page.obj
        if alt:
            d.Alt = pikepdf.String(alt)
        for k, v in extra.items():
            d[Name("/" + k)] = v
        e = self.pdf.make_indirect(d)
        if parent is not None and parent is not self.root:
            self._append_kid(parent, e)
        return e

    @staticmethod
    def _append_kid(parent, kid):
        if "/K" not in parent:
            parent.K = Array([kid])
        else:
            k = parent.K
            if isinstance(k, Array):
                k.append(kid)
            else:  # single kid -> promote to array
                parent.K = Array([k, kid])

    # -- keys / parent tree ------------------------------------------------
    def new_key(self) -> int:
        k = self._next_key
        self._next_key += 1
        return k

    def page_key(self, page) -> int:
        pid = page.obj.objgen
        if pid not in self._page_arrays:
            key = self.new_key()
            page.obj.StructParents = key
            self._page_arrays[pid] = [key, []]
        return self._page_arrays[pid][0]

    def add_mcid(self, elem, page, mcid: int):
        """Attach marked-content id `mcid` on `page` as a child of `elem`."""
        self.page_key(page)
        if "/Pg" not in elem:
            elem.Pg = page.obj
        if elem.Pg.objgen == page.obj.objgen:
            self._append_kid(elem, mcid)
        else:
            self._append_kid(elem, Dictionary(Type=Name.MCR, Pg=page.obj, MCID=mcid))
        arr = self._page_arrays[page.obj.objgen][1]
        while len(arr) <= mcid:
            arr.append(None)
        arr[mcid] = elem

    def add_objr(self, elem, page, annot):
        """Attach an annotation (link / widget) to `elem` via an OBJR."""
        key = self.new_key()
        annot.StructParent = key
        objr = Dictionary(Type=Name.OBJR, Obj=annot)
        if page is not None:
            objr.Pg = page.obj
        self._append_kid(elem, objr)
        self._parent_entries[key] = elem

    def finish(self):
        nt = NumberTree.new(self.pdf)
        for key, arr in self._page_arrays.values():
            nt[key] = Array(list(arr))  # None -> PDF null (unused MCID slot)
        for key, elem in self._parent_entries.items():
            nt[key] = elem
        self.root.ParentTree = nt.obj
        self.root.ParentTreeNextKey = self._next_key
        return self.root


def install(pdf: pikepdf.Pdf, builder: StructBuilder, lang: str | None = None):
    root = builder.finish()
    pdf.Root.StructTreeRoot = root
    pdf.Root.MarkInfo = Dictionary(Marked=True)
    if lang:
        pdf.Root.Lang = pikepdf.String(lang)
