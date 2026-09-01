#!/usr/bin/env python3
"""Deterministic guard for the final Cycle-2 Coverage Matrix checkpoint."""
from __future__ import annotations
import argparse
import pathlib
import re
import sys

EXPECTED_PD = {
    "PD1": "ARTIFACT-COVERED / FINDING",
    "PD2": "ARTIFACT-COVERED / FINDING",
    "PD3": "ARTIFACT-COVERED / FINDING",
    "PD4": "ARTIFACT-COVERED / FINDING",
    "PD5": "ARTIFACT-COVERED / FINDING",
    "PD6": "ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)",
    "PD7": "OUT-OF-SCOPE (current stable target) / WATCH",
}
ROW_RE = re.compile(r"^\| (C\d{2}) \|", re.MULTILINE)


def fail(message: str) -> None:
    raise AssertionError(message)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--repo-root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    return p.parse_args()


def main() -> int:
    root = parse_args().repo_root
    text = (root / "project_docs" / "AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md").read_text(encoding="utf-8")
    synthesis = root / "project_docs" / "AUDIT_COVERAGE_CYCLE2_FINAL_SYNTHESIS_2026-09-01.md"
    rows = ROW_RE.findall(text)
    expected = [f"C{i:02d}" for i in range(1, 47)]
    if rows != expected:
        fail(f"family rows must be exactly sequential C01..C46; got {rows!r}")
    family_lines = [line for line in text.splitlines() if line.startswith("| C")]
    for forbidden in ("NOT-TRIAGED", "REVALIDATION-REQUIRED"):
        bad = [line for line in family_lines if forbidden in line]
        if bad:
            fail(f"final Cycle-2 Matrix contains {forbidden}: {bad}")
    for pd, state in EXPECTED_PD.items():
        matching = [line for line in text.splitlines() if line.startswith(f"| **{pd}** ")]
        if len(matching) != 1:
            fail(f"expected exactly one {pd} row")
        if state not in matching[0]:
            fail(f"{pd} must preserve state {state!r}: {matching[0]}")
    required = [
        "families with terminal required evidence under current Cycle-2 Change Impact: **46**",
        "families with at least one new stable-browser variant requiring revalidation: **0**",
        "remaining revalidation set: **none**",
        "terminal finding platform-delta variants: **PD1, PD2, PD3, PD4, PD5 — `ARTIFACT-COVERED / FINDING`**",
        "terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**",
        "pending current-stable platform-delta variants: **none**",
        "C46 remains bounded `EXTERNAL-REQUIRED / UNKNOWN`",
        "**`DEEP-AUDIT-COVERAGE-COMPLETE`**",
        "`DEEP-AUDIT-CRITICAL-CLOSURE-COMPLETE` — **not claimed**",
        "`RELEASE-READY` — **not claimed**",
    ]
    for fragment in required:
        if fragment not in text:
            fail(f"missing final Cycle-2 declaration: {fragment}")
    if not synthesis.is_file():
        fail("final Cycle-2 synthesis document is missing")
    print("cycle2 coverage sweep: OK; families=46, revalidation=0, pd1-pd5=finding, pd6=bounded-pass, pd7=watch, coverage=complete")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError) as exc:
        print(f"cycle2 coverage sweep: FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
