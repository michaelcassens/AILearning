"""Crawl a website, find its PDFs and score them."""
from __future__ import annotations

import csv
import io
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, deque
from dataclasses import dataclass, field
from html.parser import HTMLParser

from .evaluate import evaluate

UA = "pdfa11y-scanner/0.1 (accessibility audit)"


class _Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("a", "link", "area"):
            for k, v in attrs:
                if k == "href" and v:
                    self.links.append(v)


def _get(url: str, timeout: int = 20, max_bytes: int = 60_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        ctype = r.headers.get("Content-Type", "")
        data = r.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("file too large")
        return data, ctype, r.geturl()


def _norm(u: str) -> str:
    u, _ = urllib.parse.urldefrag(u)
    return u


@dataclass
class ScanResult:
    pages_crawled: int = 0
    pdf_urls: list[str] = field(default_factory=list)
    results: list[dict] = field(default_factory=list)

    def summary(self) -> dict:
        ok = [r for r in self.results if not r.get("error")]
        issues: Counter = Counter()
        for r in ok:
            issues.update(r["failed_ids"])
        return {
            "pages_crawled": self.pages_crawled,
            "pdfs_found": len(self.pdf_urls),
            "pdfs_evaluated": len(ok),
            "pdfs_without_failures": sum(1 for r in ok if r["verdict"] != "fails"),
            "average_score": round(sum(r["score"] for r in ok) / len(ok)) if ok else None,
            "most_common_failures": issues.most_common(8),
        }

    def to_csv(self) -> str:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["url", "score", "verdict", "failures", "warnings", "needs_review", "pages", "failed_checks", "error"])
        for r in self.results:
            w.writerow([r["url"], r.get("score", ""), r.get("verdict", ""), r.get("fails", ""), r.get("warns", ""),
                        r.get("manual", ""), r.get("pages", ""), " ".join(r.get("failed_ids", [])), r.get("error", "")])
        return buf.getvalue()


def scan_site(start_url: str, *, max_pages: int = 100, max_pdfs: int = 200, delay: float = 0.3,
              same_host_only: bool = True, check_contrast: bool = False, progress=None) -> ScanResult:
    """Breadth-first crawl of HTML pages from `start_url`; evaluate every PDF linked."""
    out = ScanResult()
    host = urllib.parse.urlparse(start_url).netloc
    seen, queue, pdfs = {_norm(start_url)}, deque([_norm(start_url)]), []
    say = progress or (lambda m: None)
    while queue and out.pages_crawled < max_pages and len(pdfs) < max_pdfs:
        url = queue.popleft()
        try:
            data, ctype, final = _get(url)
        except Exception as e:  # noqa: BLE001
            say(f"skip {url}: {e}")
            continue
        out.pages_crawled += 1
        if "pdf" in ctype.lower() or data[:5] == b"%PDF-":
            pdfs.append((final, data))
            continue
        if "html" not in ctype.lower():
            continue
        p = _Links()
        try:
            p.feed(data.decode("utf-8", "replace"))
        except Exception:
            pass
        for href in p.links:
            u = _norm(urllib.parse.urljoin(final, href))
            parts = urllib.parse.urlparse(u)
            if parts.scheme not in ("http", "https") or u in seen:
                continue
            if same_host_only and parts.netloc != host and not parts.path.lower().endswith(".pdf"):
                continue
            seen.add(u)
            if parts.path.lower().endswith(".pdf"):
                try:
                    d, ct, fin = _get(u)
                    pdfs.append((fin, d))
                    say(f"found PDF {u}")
                except Exception as e:  # noqa: BLE001
                    out.results.append({"url": u, "error": str(e)})
            else:
                queue.append(u)
        time.sleep(delay)
    for url, data in pdfs[:max_pdfs]:
        out.pdf_urls.append(url)
        try:
            rep = evaluate(data, check_contrast=check_contrast, source=url)
            out.results.append({
                "url": url, "score": rep.score, "verdict": rep.verdict, "verdict_text": rep.verdict_text,
                "fails": len(rep.failures), "warns": len(rep.warnings), "manual": len(rep.manual),
                "pages": rep.pages, "failed_ids": [f.id for f in rep.failures],
                "top_issues": [f.title for f in sorted(rep.failures, key=lambda f: f.severity)],
            })
        except Exception as e:  # noqa: BLE001
            out.results.append({"url": url, "error": f"{type(e).__name__}: {e}"})
        say(f"evaluated {url}")
    return out
