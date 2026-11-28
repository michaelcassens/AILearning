"""Command line: pdfa11y check | fix | scan-site | serve"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .evaluate import evaluate
from .remediate import FixOptions, remediate, read_alt_file, write_alt_template
from .report import batch_html, to_html, to_text


def _pdfs(paths):
    for p in paths:
        pp = Path(p)
        if pp.is_dir():
            yield from sorted(pp.rglob("*.pdf"))
        else:
            yield pp


def cmd_check(a) -> int:
    reports, worst = [], 0
    for p in _pdfs(a.paths):
        rep = evaluate(p, check_contrast=not a.no_contrast)
        reports.append(rep)
        worst = max(worst, 1 if rep.failures else 0)
        if a.json:
            continue
        print(to_text(rep, a.verbose) + "\n")
        if a.html:
            out = Path(a.html) if len(a.paths) == 1 and not Path(a.paths[0]).is_dir() else Path(a.html) / (p.stem + ".html")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(to_html(rep), encoding="utf-8")
    if a.json:
        print(json.dumps([r.to_dict() for r in reports], indent=2))
    if len(reports) > 1 and not a.json:
        avg = round(sum(r.score for r in reports) / len(reports))
        print(f"{len(reports)} files · average score {avg} · {sum(1 for r in reports if not r.failures)} without failures")
    return worst


def cmd_fix(a) -> int:
    src = Path(a.input)
    dst = Path(a.output) if a.output else src.with_name(src.stem + "_accessible.pdf")
    opts = FixOptions(lang=a.lang, title=a.title, author=a.author, retag=a.retag, ocr=not a.no_ocr,
                      ocr_lang=a.ocr_lang, bookmarks=a.bookmarks, check_contrast=not a.no_contrast,
                      claim_pdfua=a.claim_pdfua)
    if a.alt_text:
        opts.alt_text = read_alt_file(a.alt_text)
    if a.ai_alt:
        from .alttext import ClaudeAltProvider
        opts.alt_provider = ClaudeAltProvider(src.read_bytes())
    res = remediate(src, dst, opts)
    print(f"{src.name}: {res.before.score} → {res.after.score}/100  ({res.after.verdict_text})")
    print(f"Wrote {dst}\n")
    for t in res.actions:
        print(f"  + {t}")
    if res.notes:
        print("\nNeeds a human:")
        for n in res.notes:
            print(f"  ! {n}")
    left = res.remaining
    if left:
        print("\nStill open:")
        for f in left:
            print(f"  {f.status.upper():6} {f.title}" + (f" - {f.detail}" if f.detail else ""))
    if res.alt_template and any(not v["alt"] for v in res.alt_template.values()):
        alt_path = dst.with_suffix(".alt.json")
        write_alt_template(alt_path, res.alt_template, only_missing=True)
        print(f"\nFill in alt text in {alt_path} and re-run with --alt-text {alt_path}")
    if a.html:
        Path(a.html).write_text(to_html(res.after, res), encoding="utf-8")
        print(f"Report: {a.html}")
    return 1 if res.after.failures else 0


def cmd_scan(a) -> int:
    from .site import scan_site

    res = scan_site(a.url, max_pages=a.max_pages, max_pdfs=a.max_pdfs, check_contrast=a.contrast,
                    progress=(lambda m: print("  " + m, file=sys.stderr)) if a.verbose else None)
    s = res.summary()
    print(json.dumps(s, indent=2))
    if a.csv:
        Path(a.csv).write_text(res.to_csv(), encoding="utf-8")
    if a.html:
        Path(a.html).write_text(batch_html(res.results, f"PDF accessibility scan: {a.url}"), encoding="utf-8")
    return 0


def cmd_serve(a) -> int:
    from .webapp import create_app

    create_app().run(host=a.host, port=a.port)
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="pdfa11y", description="Evaluate and remediate PDF accessibility (WCAG 2.1 AA / PDF-UA).")
    ap.add_argument("--version", action="version", version=__version__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("check", help="score PDFs (files or folders)")
    c.add_argument("paths", nargs="+")
    c.add_argument("--json", action="store_true"); c.add_argument("--html", help="write HTML report (file, or folder for several)")
    c.add_argument("-v", "--verbose", action="store_true"); c.add_argument("--no-contrast", action="store_true")
    c.set_defaults(fn=cmd_check)

    f = sub.add_parser("fix", help="remediate a PDF into an accessible one")
    f.add_argument("input"); f.add_argument("-o", "--output")
    f.add_argument("--lang"); f.add_argument("--title"); f.add_argument("--author")
    f.add_argument("--alt-text", help="JSON file of figure alt text (see the .alt.json written by a previous run)")
    f.add_argument("--ai-alt", action="store_true", help="draft alt text with Claude (needs ANTHROPIC_API_KEY; images are sent to the API)")
    f.add_argument("--retag", action="store_true", help="discard existing tags and re-tag from layout")
    f.add_argument("--no-ocr", action="store_true"); f.add_argument("--ocr-lang", default="eng")
    f.add_argument("--bookmarks", choices=["auto", "always", "never"], default="auto")
    f.add_argument("--claim-pdfua", action="store_true", help="write the PDF/UA-1 identifier if no failures remain (validate first!)")
    f.add_argument("--no-contrast", action="store_true"); f.add_argument("--html", help="write before/after HTML report")
    f.set_defaults(fn=cmd_fix)

    s = sub.add_parser("scan-site", help="crawl a site and score every PDF it links to")
    s.add_argument("url"); s.add_argument("--max-pages", type=int, default=100); s.add_argument("--max-pdfs", type=int, default=200)
    s.add_argument("--csv"); s.add_argument("--html"); s.add_argument("--contrast", action="store_true", help="include (slower) contrast check")
    s.add_argument("-v", "--verbose", action="store_true"); s.set_defaults(fn=cmd_scan)

    w = sub.add_parser("serve", help="run the web upload UI")
    w.add_argument("--host", default="127.0.0.1"); w.add_argument("--port", type=int, default=8080); w.set_defaults(fn=cmd_serve)

    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
