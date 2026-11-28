"""Inline Form XObjects that carry text or images into the page content stream.

Some producers (OCRmyPDF, imposition tools, some print drivers) put page
content inside Form XObjects.  Tagging works on the page stream, so we expand
those forms in place.  Resource names are renamed to avoid collisions.
"""
from __future__ import annotations

import re

import pikepdf
from pikepdf import Dictionary, Name, Operator

from .content import op_name

CATEGORIES = ("Font", "XObject", "ExtGState", "ColorSpace", "Pattern", "Shading", "Properties")
_CONTENT_RE = re.compile(rb"\b(Tj|TJ|Do|BI)\b")
MAX_DEPTH = 4


def _ins(operands, operator):
    return pikepdf.ContentStreamInstruction(list(operands), Operator(operator))


def _rename(ins, mapping):
    n = op_name(ins)
    ops = list(ins.operands)

    def m(cat, nm):
        return Name(mapping.get((cat, str(nm)), str(nm)))

    try:
        if n == "Tf" and ops:
            ops[0] = m("Font", ops[0])
        elif n == "Do" and ops:
            ops[0] = m("XObject", ops[0])
        elif n == "gs" and ops:
            ops[0] = m("ExtGState", ops[0])
        elif n in ("cs", "CS") and ops:
            ops[0] = m("ColorSpace", ops[0])
        elif n in ("scn", "SCN") and ops and isinstance(ops[-1], pikepdf.Name):
            ops[-1] = m("Pattern", ops[-1])
        elif n == "sh" and ops:
            ops[0] = m("Shading", ops[0])
        elif n == "BDC" and len(ops) > 1 and isinstance(ops[1], pikepdf.Name):
            ops[1] = m("Properties", ops[1])
        else:
            return ins
    except Exception:
        return ins
    return _ins(ops, n)


def flatten_forms(pdf: pikepdf.Pdf) -> int:
    inlined = 0
    counter = 0
    for page in pdf.pages:
        res = page.resources
        try:
            xobjs = res.get("/XObject")
        except Exception:
            xobjs = None
        if not xobjs or not any(str(x.get("/Subtype", "")) == "/Form" for x in xobjs.values()):
            continue
        # own, mutable copy of the resources
        own = Dictionary()
        for k, v in res.items():
            own[k] = pikepdf.Dictionary({kk: vv for kk, vv in v.items()}) if isinstance(v, pikepdf.Dictionary) else v
        page.obj.Resources = own

        ops = list(pikepdf.parse_content_stream(page))
        changed = False
        for _ in range(MAX_DEPTH):
            out, did = [], False
            for ins in ops:
                if op_name(ins) == "Do":
                    name = ins.operands[0]
                    xo = own.get("/XObject", {}).get(name) if "/XObject" in own else None
                    if xo is not None and str(xo.get("/Subtype", "")) == "/Form" and _CONTENT_RE.search(xo.read_bytes()):
                        counter += 1
                        tag = f"_ff{counter}"
                        fres = xo.get("/Resources")
                        mapping = {}
                        if fres is not None:
                            for cat in CATEGORIES:
                                sub = fres.get("/" + cat)
                                if sub is None:
                                    continue
                                if "/" + cat not in own:
                                    own["/" + cat] = Dictionary()
                                for nm, val in sub.items():
                                    new = str(nm).lstrip("/") + tag
                                    own["/" + cat][Name("/" + new)] = val
                                    mapping[(cat, str(nm))] = "/" + new
                        body = [_rename(i, mapping) for i in pikepdf.parse_content_stream(xo)]
                        out.append(_ins([], "q"))
                        mx = xo.get("/Matrix")
                        if mx is not None and [float(v) for v in mx] != [1, 0, 0, 1, 0, 0]:
                            out.append(_ins([float(v) for v in mx], "cm"))
                        bb = xo.get("/BBox")
                        if bb is not None:
                            x0, y0, x1, y1 = [float(v) for v in bb]
                            out.append(_ins([x0, y0, x1 - x0, y1 - y0], "re"))
                            out.append(_ins([], "W"))
                            out.append(_ins([], "n"))
                        out.extend(body)
                        out.append(_ins([], "Q"))
                        did = changed = True
                        inlined += 1
                        continue
                out.append(ins)
            ops = out
            if not did:
                break
        if changed:
            page.obj.Contents = pdf.make_stream(pikepdf.unparse_content_stream(ops))
    return inlined
