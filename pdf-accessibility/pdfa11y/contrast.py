"""Colour-contrast checking by rendering pages and sampling text regions."""
from __future__ import annotations

import io

import numpy as np
import pypdfium2 as pdfium
from pdfminer.layout import LTChar, LTTextLine, LAParams

from .content import BOLD_RE, MinerDoc

SCALE = 2.0


def luminance(rgb) -> float:
    c = np.asarray(rgb, dtype=float) / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])


def ratio(a, b) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _lines(layout):
    for o in layout:
        if isinstance(o, LTTextLine):
            yield o
        elif hasattr(o, "__iter__"):
            yield from _lines(o)


def check_document(data: bytes, page_indexes: list[int]) -> dict:
    pdf = pdfium.PdfDocument(data)
    md = MinerDoc(data)
    failures, unreliable, checked = [], 0, 0
    for pi in page_indexes:
        page = pdf[pi]
        if page.get_rotation() != 0:
            continue
        mb, cb = page.get_mediabox(), page.get_cropbox()
        if tuple(round(v, 1) for v in mb) != tuple(round(v, 1) for v in cb):
            continue
        w_pt, h_pt = page.get_size()
        img = page.render(scale=SCALE).to_numpy()[:, :, :3]
        H, W = img.shape[:2]
        layout = md.layout(pi, LAParams())
        checked += 1
        for ln in _lines(layout):
            text = ln.get_text().strip()
            if len(text) < 2:
                continue
            chars = [c for c in ln if isinstance(c, LTChar)]
            if not chars:
                continue
            size = float(np.median([c.size for c in chars]))
            bold = any(BOLD_RE.search(c.fontname or "") for c in chars)
            x0, y0, x1, y1 = ln.bbox
            px0, px1 = int(max(0, x0 * SCALE)), int(min(W, np.ceil(x1 * SCALE)))
            py0, py1 = int(max(0, (h_pt - y1) * SCALE)), int(min(H, np.ceil((h_pt - y0) * SCALE)))
            if px1 - px0 < 3 or py1 - py0 < 3:
                continue
            reg = img[py0:py1, px0:px1].reshape(-1, 3)
            packed = (reg[:, 0].astype(np.int64) << 16) | (reg[:, 1].astype(np.int64) << 8) | reg[:, 2]
            vals, counts = np.unique(packed, return_counts=True)
            top = int(vals[counts.argmax()])
            bg = np.array([(top >> 16) & 255, (top >> 8) & 255, top & 255])
            dist = np.abs(reg.astype(int) - bg).sum(axis=1)
            if dist.max() < 60:       # nothing visible (invisible OCR text, etc.)
                continue
            if counts.max() / len(packed) < 0.35:  # busy background (photo / gradient)
                unreliable += 1
                continue
            k = max(3, int(0.03 * len(dist)))
            fg = reg[np.argsort(dist)[-k:]].mean(axis=0)
            r = ratio(fg, bg)
            large = size >= 18 or (bold and size >= 14)
            need = 3.0 if large else 4.5
            if r < need - 0.05:
                failures.append({"page": pi + 1, "text": text, "ratio": r, "need": need,
                                 "fg": "#%02x%02x%02x" % tuple(int(v) for v in fg),
                                 "bg": "#%02x%02x%02x" % tuple(int(v) for v in bg)})
    return {"failures": failures, "unreliable": unreliable, "pages_checked": checked}
