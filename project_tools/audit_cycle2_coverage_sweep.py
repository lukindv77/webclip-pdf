#!/usr/bin/env python3
"""Deterministic guard for the current Cycle-2 Coverage Sweep checkpoint.

This is an audit-process checker, not a product-runtime test. It verifies that
Cycle-2 Matrix v2 keeps the complete C01..C46 denominator visible, records the
expected Change-Impact revalidation set, and preserves explicit platform-delta
states after T1/PD2, T2/PD3, T3/PD5+PD6 and T4/PD4 physical checkpoints.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

EXPECTED_REVALIDATION = {
    "C20",
    "C29",
    "C33",
    "C35",
}

EXPECTED_PD = {
    "PD1": "REVALIDATION-REQUIRED",
    "PD2": "ARTIFACT-COVERED / FINDING",
    "PD3": "ARTIFACT-COVERED / FINDING",
    "PD4": "ARTIFACT-COVERED / FINDING",
    "PD5": "ARTIFACT-COVERED / FINDING",
    "PD6": "ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)",
    "PD7": "OUT-OF-SCOPE (current stable target) / WATCH",
}

FAMILY_ROW_RE = re.compile(r"^\| (C\d{2}) \|", re.MULTILINE)


def fail(message: str) -> None:
    raise AssertionError(message)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        type=pathlib.Path,
        default=pathlib.Path(__file__).resolve().parents[1],
        help="Repository root (default: inferred from this script).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    matrix_path = args.repo_root / "project_docs" / "AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md"
    text = matrix_path.read_text(encoding="utf-8")

    rows = FAMILY_ROW_RE.findall(text)
    expected_rows = [f"C{i:02d}" for i in range(1, 47)]
    if rows != expected_rows:
        fail(f"family rows must be exactly sequential C01..C46; got {rows!r}")

    revalidation = set()
    for line in text.splitlines():
        if not line.startswith("| C"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 6:
            fail(f"malformed family matrix row: {line}")
        cid = cells[0]
        coverage = cells[5]
        if "REVALIDATION-REQUIRED" in coverage:
            revalidation.add(cid)
        if "NOT-TRIAGED" in coverage:
            fail(f"Cycle-2 sweep must not leave family NOT-TRIAGED: {cid}")

    if revalidation != EXPECTED_REVALIDATION:
        fail(
            "unexpected family revalidation set: "
            f"expected={sorted(EXPECTED_REVALIDATION)} got={sorted(revalidation)}"
        )

    for pd, required_state in EXPECTED_PD.items():
        matching = [line for line in text.splitlines() if line.startswith(f"| **{pd}** ")]
        if len(matching) != 1:
            fail(f"expected exactly one {pd} platform-delta row")
        if required_state not in matching[0]:
            fail(f"{pd} must preserve state {required_state!r}: {matching[0]}")

    required_fragments = [
        "families with terminal required evidence under current Cycle-2 Change Impact: **42**",
        "families with at least one new stable-browser variant requiring revalidation: **4**",
        "remaining revalidation set: **C20, C29, C33, C35**",
        "terminal finding platform-delta variants: **PD2, PD3, PD4, PD5 — `ARTIFACT-COVERED / FINDING`**",
        "terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**",
        "pending current-stable platform-delta variant: **PD1**",
        "**`DEEP-AUDIT-IN-PROGRESS`**",
        "local managed Chromium executable remains **144.0.7559.96**",
        "Completed deep-dive tranche — T1 / PD2",
        "Completed deep-dive tranche — T2 / PD3",
        "Completed deep-dive tranche — T3 / PD5+PD6",
        "Completed deep-dive tranche — T4 / PD4",
        "Next action: **T5 / PD1",
    ]
    for fragment in required_fragments:
        if fragment not in text:
            fail(f"missing required Cycle-2 checkpoint declaration: {fragment}")

    print(
        "cycle2 coverage sweep: OK; "
        f"families={len(rows)}, family_revalidation={len(revalidation)}, "
        "pd2=pd3=pd4=pd5=finding, pd6=virtual-pdf-pass-control, pending_pd=1"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError) as exc:
        print(f"cycle2 coverage sweep: FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
