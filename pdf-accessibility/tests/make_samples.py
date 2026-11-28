"""Generate deliberately inaccessible sample PDFs for tests and demos."""
from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

LOREM = (
    "Accessible documents let everyone read, search and navigate content with "
    "the tools that work for them, including screen readers, magnifiers and "
    "voice control software. "
)


def _wrap(c, text, x, y, width, font="Helvetica", size=11, leading=14):
    words, line = text.split(), ""
    for w in words:
        trial = (line + " " + w).strip()
        if c.stringWidth(trial, font, size) > width:
            c.drawString(x, y, line)
            y -= leading
            line = w
        else:
            line = trial
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def _png(w=240, h=120, scanned_text=None) -> bytes:
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    if scanned_text:
        d.text((20, 20), scanned_text, fill="black")
    else:
        d.rectangle([20, 60, 60, 110], fill=(30, 80, 160))
        d.rectangle([90, 30, 130, 110], fill=(200, 60, 60))
        d.rectangle([160, 80, 200, 110], fill=(60, 160, 90))
    b = io.BytesIO()
    img.save(b, "PNG")
    return b.getvalue()


def make_report(path: Path, pages: int = 3) -> Path:
    """Untagged, no title/lang: headings by font size only."""
    c = canvas.Canvas(str(path), pagesize=letter)  # no title -> 'untitled'
    W, H = letter
    for p in range(1, pages + 1):
        y = H - 72
        if p == 1:
            c.setFont("Helvetica-Bold", 24)
            c.drawString(72, y, "Campus Sustainability Report")
            y -= 40
        c.setFont("Helvetica-Bold", 16)
        c.drawString(72, y, f"Section {p}: Findings")
        y -= 26
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.black)
        for _ in range(3):
            y = _wrap(c, LOREM * 2, 72, y, W - 144)
            y -= 8
        c.setFont("Helvetica-Bold", 13)
        c.drawString(72, y, "Key actions")
        y -= 20
        c.setFont("Helvetica", 11)
        for item in ("Reduce energy use in residence halls", "Expand composting to all dining areas", "Publish quarterly metrics online"):
            c.drawString(72, y, "•")
            c.drawString(90, y, item)
            y -= 16
        y -= 10
        if p == 1:
            from reportlab.lib.utils import ImageReader

            c.drawImage(ImageReader(io.BytesIO(_png())), 72, y - 120, width=240, height=120)
            y -= 140
            c.setFont("Helvetica", 11)
            c.drawString(72, y, "Read more on our website")
            c.linkURL("https://example.edu/sustainability", (72, y - 3, 200, y + 11))
            y -= 22
            # low-contrast text (light gray on white)
            c.setFillColor(colors.HexColor("#BBBBBB"))
            c.drawString(72, y, "Fine print: data collected during the 2024 academic year.")
            c.setFillColor(colors.black)
        # footer / page number
        c.setFont("Helvetica", 9)
        c.drawString(72, 36, "Campus Sustainability Report")
        c.drawRightString(W - 72, 36, f"Page {p}")
        c.showPage()
    c.save()
    return path


def make_form(path: Path) -> Path:
    c = canvas.Canvas(str(path), pagesize=letter)
    W, H = letter
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, H - 72, "Event Registration")
    c.setFont("Helvetica", 11)
    c.drawString(72, H - 110, "Full name")
    c.acroForm.textfield(name="full_name", x=160, y=H - 116, width=200, height=18, borderStyle="solid")
    c.drawString(72, H - 140, "Email")
    c.acroForm.textfield(name="email", x=160, y=H - 146, width=200, height=18, tooltip="Email address")
    c.drawString(72, H - 170, "Attending")
    c.acroForm.checkbox(name="attending", x=160, y=H - 176, size=14)
    c.save()
    return path


def make_scanned(path: Path) -> Path:
    """Image-only page: no text layer at all."""
    from reportlab.lib.utils import ImageReader

    c = canvas.Canvas(str(path), pagesize=letter)
    W, H = letter
    c.drawImage(ImageReader(io.BytesIO(_png(600, 400, "SCANNED MEMO - no text layer"))), 0, H - 400, width=W, height=400)
    c.save()
    return path


def make_all(outdir: Path) -> dict[str, Path]:
    outdir.mkdir(parents=True, exist_ok=True)
    return {
        "report": make_report(outdir / "report.pdf"),
        "long": make_report(outdir / "long.pdf", pages=12),
        "form": make_form(outdir / "form.pdf"),
        "scanned": make_scanned(outdir / "scanned.pdf"),
    }


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "samples")
    for k, v in make_all(out).items():
        print(k, v)


def make_ocr_like(path: Path) -> Path:
    """Page image with an invisible text layer (what OCR output looks like)."""
    from reportlab.lib.utils import ImageReader

    c = canvas.Canvas(str(path), pagesize=letter)
    W, H = letter
    c.drawImage(ImageReader(io.BytesIO(_png(600, 400, "MEMO"))), 0, 0, width=W, height=H)
    t = c.beginText(72, H - 100)
    t.setTextRenderMode(3)
    t.setFont("Helvetica", 14)
    t.textLine("Memo to all staff about the new accessibility policy")
    c.drawText(t)
    c.save()
    return path


def make_table(path: Path) -> Path:
    c = canvas.Canvas(str(path), pagesize=letter)
    W, H = letter
    c.setFont("Helvetica-Bold", 20)
    c.drawString(72, H - 72, "Budget Summary")
    y = H - 120
    rows = [("Area", "Q2", "Q3"), ("Advising", "120", "150"), ("Library", "80", "85"), ("IT", "200", "210")]
    for i, row in enumerate(rows):
        c.setFont("Helvetica-Bold" if i == 0 else "Helvetica", 11)
        for x, cell in zip((72, 250, 330), row):
            c.drawString(x, y, cell)
        y -= 18
    c.save()
    return path
