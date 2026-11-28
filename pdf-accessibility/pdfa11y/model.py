"""Data model and scoring for accessibility reports."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any

# Weight of a check in the 0-100 score.
SEVERITY_WEIGHT = {"critical": 10, "serious": 6, "moderate": 3, "minor": 1}

# status:
#   pass   - check ran, no problem found
#   fail   - definite problem
#   warn   - probable / advisory problem (half credit)
#   manual - a human has to look (not scored, always listed)
#   na     - not applicable to this document
STATUSES = ("pass", "fail", "warn", "manual", "na")


@dataclass
class Finding:
    id: str
    title: str
    status: str
    severity: str = "moderate"
    wcag: list[str] = field(default_factory=list)  # e.g. ["1.3.1"]
    pdfua: str = ""  # Matterhorn / PDF-UA reference, informational
    detail: str = ""
    pages: list[int] = field(default_factory=list)  # 1-based
    fix: str = "manual"  # "auto" | "assisted" | "manual"
    how_to_fix: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Report:
    source: str
    pages: int = 0
    findings: list[Finding] = field(default_factory=list)
    facts: dict[str, Any] = field(default_factory=dict)

    # -- scoring ---------------------------------------------------------
    @property
    def score(self) -> int:
        got = total = 0.0
        for f in self.findings:
            if f.status in ("na", "manual"):
                continue
            w = SEVERITY_WEIGHT.get(f.severity, 3)
            total += w
            if f.status == "pass":
                got += w
            elif f.status == "warn":
                got += w * 0.5
        return 100 if total == 0 else round(100 * got / total)

    @property
    def failures(self) -> list[Finding]:
        return [f for f in self.findings if f.status == "fail"]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.status == "warn"]

    @property
    def manual(self) -> list[Finding]:
        return [f for f in self.findings if f.status == "manual"]

    @property
    def verdict(self) -> str:
        """Honest verdict: automated checks can disprove accessibility but
        never fully prove it."""
        if self.failures:
            return "fails"
        if self.warnings or self.manual:
            return "needs-review"
        return "passes"

    @property
    def verdict_text(self) -> str:
        return {
            "fails": "Fails automated checks",
            "needs-review": "Passes automated failures; human review still needed",
            "passes": "Passes all automated checks",
        }[self.verdict]

    def get(self, finding_id: str) -> Finding | None:
        return next((f for f in self.findings if f.id == finding_id), None)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "pages": self.pages,
            "score": self.score,
            "verdict": self.verdict,
            "verdict_text": self.verdict_text,
            "counts": {s: sum(1 for f in self.findings if f.status == s) for s in STATUSES},
            "findings": [f.to_dict() for f in self.findings],
            "facts": self.facts,
        }
