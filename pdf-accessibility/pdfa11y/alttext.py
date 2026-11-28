"""Draft figure alt text with a Claude vision model (optional, needs ANTHROPIC_API_KEY).

AI-drafted alt text is a *draft*: the remediation report lists every figure that got
one so a person can review it.  Nothing is sent anywhere unless you opt in
(--ai-alt on the CLI, or constructing this provider yourself).
"""
from __future__ import annotations

import base64
import io

import pypdfium2 as pdfium

from .tagger import FigureInfo

MODEL = "claude-opus-5-5"
PROMPT = (
    "You are writing alt text for a PDF so screen-reader users get the same information as sighted readers. "
    "Describe this image in one or two plain sentences (under 250 characters). For a chart or graph, state the "
    "type, what is measured and the key takeaway. If it is mostly text, transcribe the text. If it is purely "
    "decorative (a border, spacer, or ornament), reply with exactly: DECORATIVE. Do not start with 'Image of'. "
    "Reply with the alt text only."
)


def render_figure_png(pdf_bytes: bytes, fig: FigureInfo, scale: float = 2.0, max_side: int = 1568) -> bytes | None:
    doc = pdfium.PdfDocument(pdf_bytes)
    page = doc[fig.page]
    w_pt, h_pt = page.get_size()
    img = page.render(scale=scale).to_pil()
    if fig.bbox:
        x0, y0, x1, y1 = fig.bbox
        box = (max(0, int(x0 * scale)), max(0, int((h_pt - y1) * scale)),
               min(img.width, int(x1 * scale)), min(img.height, int((h_pt - y0) * scale)))
        if box[2] - box[0] > 4 and box[3] - box[1] > 4:
            img = img.crop(box)
    img.thumbnail((max_side, max_side))
    out = io.BytesIO()
    img.convert("RGB").save(out, "PNG")
    return out.getvalue()


class ClaudeAltProvider:
    """callable(FigureInfo) -> alt text | None.  `pdf_bytes` is the document being tagged."""

    def __init__(self, pdf_bytes: bytes, client=None, model: str = MODEL):
        if client is None:
            import anthropic  # imported lazily so the package works without it

            client = anthropic.Anthropic()
        self.client, self.model, self.pdf_bytes = client, model, pdf_bytes

    def __call__(self, fig: FigureInfo) -> str | None:
        png = render_figure_png(self.pdf_bytes, fig)
        if not png:
            return None
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=400,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                             "data": base64.b64encode(png).decode()}},
                {"type": "text", "text": PROMPT},
            ]}],
        )
        if getattr(resp, "stop_reason", None) == "refusal":
            return None
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        if not text or text.upper().startswith("DECORATIVE"):
            return None
        return text[:500]
