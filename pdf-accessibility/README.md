# pdfa11y — PDF accessibility evaluator and remediator

Score PDFs against **WCAG 2.1 AA / PDF-UA**, crawl a site to measure every PDF on it, and turn an inaccessible
PDF into an accessible one (tags, headings, lists, tables, links, forms, metadata, bookmarks, OCR).

```bash
pip install -r requirements.txt            # optional: ocrmypdf (+ tesseract, ghostscript), anthropic

python -m pdfa11y check report.pdf                     # score + findings   (--json, --html out.html)
python -m pdfa11y check ./pdfs/                        # a whole folder
python -m pdfa11y fix report.pdf -o report_accessible.pdf --html before_after.html
python -m pdfa11y scan-site https://example.edu --html scan.html --csv scan.csv
python -m pdfa11y serve                                # web upload UI on :8080
python -m pytest tests                                 # 14 tests
```
Run from this folder (or `pip install -e .`-style by adding it to `PYTHONPATH`).

## What it checks (`pdfa11y/evaluate.py`)
Tagged structure · all content tagged or artifact · title + DisplayDocTitle · language · heading hierarchy ·
figure alt text · table headers · list structure · tag-tree validity · links tagged + described · form-field names
+ tagging · tab order · bookmarks (≥10 pages) · font embedding / ToUnicode · encryption blocking assistive tech ·
scanned pages (no text layer) · **colour contrast** (page is rendered and text regions are sampled).
Each finding carries WCAG success criteria, a PDF/UA reference, severity, pages, and whether it is auto-fixable.
Items only a person can judge (reading order, colour-only meaning, chart descriptions, OCR accuracy, tables the tool
could not see) are reported as **REVIEW** and never counted as passes. The verdict is deliberately honest:
*fails* / *needs human review* / *passes all automated checks* — automated checks cannot prove full accessibility.

## What `fix` does (`pdfa11y/remediate.py`, `tagger.py`)
* Auto-tags untagged PDFs by rewriting content streams: headings (font size/weight vs body text), paragraphs,
  lists (bullet/number markers), tables (column-aligned rows, first row = headers), figures, links (wrapping the link
  text), form fields; headers/footers/page numbers/rules/backgrounds become artifacts.
* Keeps existing tags when a PDF is already tagged (adds missing link/form/annotation elements; `--retag` to redo).
* Sets title, language (guessed unless `--lang`), DisplayDocTitle, XMP, tab order, link descriptions, form tooltips
  (from the visible label next to each field), bookmarks from headings, removes restrictive encryption.
* Scanned pages: OCR via `ocrmypdf` if installed, then tags the result.
* Alt text: `--alt-text file.json` (a fill-in sidecar `*.alt.json` is written for every figure lacking alt text), or
  `--ai-alt` to draft with Claude (needs `ANTHROPIC_API_KEY`; **images are sent to the API**; drafts are listed for review).
* `--claim-pdfua` writes the PDF/UA-1 identifier only when no failures remain — validate with veraPDF first.

## Verified against an independent validator
Outputs were checked with **veraPDF 1.28 (PDF/UA-1 profile)**: after `fix`, all structural rules pass (tags, MCIDs,
heading nesting, lists, tables, links, forms, artifacts, language, title, tab order, metadata). What veraPDF still
reports is exactly what the tool tells you it cannot do: missing alt text (needs a human/AI), non-embedded standard
fonts, and the PDF/UA identifier unless `--claim-pdfua`. One OCR'd sample passes PDF/UA-1 outright.
`tests/vera_summary.py` re-runs this check (`VERAPDF_CP="/path/to/verapdf/jars/*"`).

## Known limits (be aware before trusting a result)
* Reading order follows the content stream; multi-column pages are flagged for a human check.
* Tables: only simple, column-aligned, single-line-cell tables are detected; merged/wrapped cells need Acrobat's Table Editor.
* Lists whose bullets are drawn as vector shapes (e.g. Chrome "Print to PDF") are not detected.
* Vector charts become decorative artifacts (reported) — they need a Figure + alt text.
* Low-contrast text cannot be safely recoloured in a finished PDF; it is reported for fixing in the source.
* Text in Form XObjects is expanded into the page first; exotic producers may still fail on some pages (reported per page).
* Non-embedded fonts and missing ToUnicode maps cannot be fixed in place.
* Language is a stopword guess. The best fix is always an accessible source document (Word/InDesign export with tags).

## Layout
`content.py` page analysis (pdfminer + pikepdf) · `tagger.py` / `structure.py` tag-tree builder · `flatten.py` form
expansion · `evaluate.py` checks · `contrast.py` · `remediate.py` · `alttext.py` · `site.py` crawler · `report.py` ·
`webapp.py` Flask UI · `cli.py`.
