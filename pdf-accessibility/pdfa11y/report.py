"""Plain-text and HTML rendering of reports (the HTML report is itself accessible)."""
from __future__ import annotations

import html
from datetime import date

from .model import Report

ICON = {"pass": "PASS", "fail": "FAIL", "warn": "WARN", "manual": "REVIEW", "na": "N/A"}
ORDER = {"fail": 0, "warn": 1, "manual": 2, "pass": 3, "na": 4}


def to_text(rep: Report, verbose: bool = False) -> str:
    c = rep.to_dict()["counts"]
    out = [f"{rep.source}", f"  Score {rep.score}/100 - {rep.verdict_text}",
           f"  {c['fail']} failed, {c['warn']} warnings, {c['manual']} need human review, {c['pass']} passed", ""]
    for f in sorted(rep.findings, key=lambda f: (ORDER[f.status], f.severity)):
        if f.status in ("pass", "na") and not verbose:
            continue
        pg = f"  [pages {', '.join(map(str, f.pages[:8]))}{'…' if len(f.pages) > 8 else ''}]" if f.pages else ""
        out.append(f"  {ICON[f.status]:6} {f.title}  (WCAG {', '.join(f.wcag) or '-'}){pg}")
        if f.detail:
            out.append(f"         {f.detail}")
        if f.how_to_fix and f.status in ("fail", "warn"):
            out.append(f"         Fix: {f.how_to_fix}  [{f.fix}]")
    return "\n".join(out)


CSS = """
:root{--bg:#fff;--fg:#222;--muted:#555;--line:#d0d0d0;--fail:#8a1c1c;--warn:#7a4b00;--ok:#14532d;--rev:#1f3a8a;--card:#f7f7f7}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--muted:#bbb;--line:#444;--fail:#ff9d9d;--warn:#ffd28a;--ok:#8fe0ae;--rev:#a9c1ff;--card:#222}}
body{font:16px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:1rem 16px 3rem}
main{max-width:60rem;margin:auto}h1{font-size:1.6rem}h2{font-size:1.2rem;margin-top:2rem}
.score{font-size:2.5rem;font-weight:700}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1rem;margin:.75rem 0}
table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left;vertical-align:top}
th{background:var(--card)}.fail{color:var(--fail)}.warn{color:var(--warn)}.pass{color:var(--ok)}.manual{color:var(--rev)}
.tag{font-weight:700;white-space:nowrap}small,.muted{color:var(--muted)}a{color:inherit}
"""


def _rows(rep: Report) -> str:
    rows = []
    for f in sorted(rep.findings, key=lambda f: (ORDER[f.status], f.severity)):
        pg = ", ".join(map(str, f.pages[:12])) + ("…" if len(f.pages) > 12 else "")
        detail = html.escape(f.detail)
        if f.how_to_fix and f.status in ("fail", "warn"):
            detail += f"<br><small>Fix: {html.escape(f.how_to_fix)} ({f.fix})</small>"
        rows.append(f"<tr><td><span class='tag {f.status}'>{ICON[f.status]}</span></td><td>{html.escape(f.title)}</td>"
                    f"<td>{html.escape(', '.join(f.wcag))}</td><td>{html.escape(pg)}</td><td>{detail}</td></tr>")
    return "\n".join(rows)


def to_html(rep: Report, fix=None) -> str:
    c = rep.to_dict()["counts"]
    extra = ""
    if fix is not None:
        acts = "".join(f"<li>{html.escape(a)}</li>" for a in fix.actions) or "<li>No automatic changes were needed.</li>"
        notes = "".join(f"<li>{html.escape(n)}</li>" for n in fix.notes)
        extra = (f"<h2>What was changed</h2><div class='card'><p>Score: {fix.before.score} → <strong>{fix.after.score}</strong>"
                 f" ({html.escape(fix.after.verdict_text)})</p><ul>{acts}</ul></div>")
        if notes:
            extra += f"<h2>Needs a human</h2><div class='card'><ul>{notes}</ul></div>"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDF accessibility report</title><style>{CSS}</style></head><body><main>
<h1>PDF accessibility report</h1><p class="muted">{html.escape(rep.source)} · {rep.pages} page(s) · {date.today().isoformat()}</p>
<div class="card"><div class="score">{rep.score}<small>/100</small></div><p><strong>{html.escape(rep.verdict_text)}</strong></p>
<p>{c['fail']} failed · {c['warn']} warnings · {c['manual']} need human review · {c['pass']} passed</p>
<p class="muted">Automated checks can show a PDF is inaccessible but cannot prove it is fully accessible; items marked REVIEW need a person.</p></div>
{extra}<h2>All checks</h2><table><caption class="muted">WCAG 2.1 AA / PDF-UA checks, worst first</caption>
<thead><tr><th scope="col">Result</th><th scope="col">Check</th><th scope="col">WCAG</th><th scope="col">Pages</th><th scope="col">Details</th></tr></thead>
<tbody>{_rows(rep)}</tbody></table></main></body></html>"""


def batch_html(results: list[dict], title: str = "PDF accessibility scan") -> str:
    """results: [{url, score, verdict, fails, warns, manual, top_issues, error}]"""
    n = len(results)
    ok = [r for r in results if not r.get("error")]
    avg = round(sum(r["score"] for r in ok) / len(ok)) if ok else 0
    passing = sum(1 for r in ok if r["verdict"] != "fails")
    rows = "".join(
        f"<tr><td><a href='{html.escape(r['url'])}'>{html.escape(r['url'])}</a></td>"
        + (f"<td colspan='4'>Could not be evaluated: {html.escape(r['error'])}</td></tr>" if r.get("error") else
           f"<td>{r['score']}</td><td class='{ 'fail' if r['verdict']=='fails' else 'manual'}'>{html.escape(r['verdict_text'])}</td>"
           f"<td>{r['fails']}</td><td>{html.escape('; '.join(r['top_issues'][:3]))}</td></tr>")
        for r in sorted(results, key=lambda r: r.get("score", -1)))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>{CSS}</style></head><body><main><h1>{html.escape(title)}</h1>
<div class="card"><p><span class="score">{passing}</span> of {n} PDFs have no automated failures · average score <strong>{avg}</strong>/100</p></div>
<table><caption class="muted">Lowest scores first</caption><thead><tr><th scope="col">PDF</th><th scope="col">Score</th><th scope="col">Verdict</th><th scope="col">Failures</th><th scope="col">Main problems</th></tr></thead>
<tbody>{rows}</tbody></table></main></body></html>"""
