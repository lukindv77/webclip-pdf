#!/usr/bin/env python3
"""Deterministic guard for the Cycle-2 Coverage Sweep checkpoint.

This is an audit-process checker, not a product-runtime test. It verifies that
Cycle-2 Matrix v2 keeps the complete C01..C46 denominator visible, records the
expected Change-Impact revalidation set, and preserves explicit platform-delta
states established by the 2026-08-31 sweep.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

EXPECTED_REVALIDATION = {
    "C02",
    "C03",
    "C05",
    "C07",
    "C14",
    "C16",
    "C18",
    "C20",
    "C25",
    "C27",
    "C28",
    "C29",
    "C32",
    "C33",
    "C35",
}

EXPECTED_PD = {
    "PD1": "REVALIDATION-REQUIRED",
    "PD2": "REVALIDATION-REQUIRED",
    "PD3": "REVALIDATION-REQUIRED",
    "PD4": "REVALIDATION-REQUIRED",
    "PD5": "REVALIDATION-REQUIRED",
    "PD6": "REVALIDATION-REQUIRED",
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
        "families carrying forward terminal required evidence: **31**",
        "families with at least one new stable-browser variant requiring revalidation: **15**",
        "**`DEEP-AUDIT-IN-PROGRESS`**",
        "Chromium executable is **144.0.7559.96**",
        "First deep-dive tranche envelope — T1",
    ]
    for fragment in required_fragments:
        if fragment not in text:
            fail(f"missing required Cycle-2 sweep declaration: {fragment}")

    print(
        "cycle2 coverage sweep: OK; "
        f"families={len(rows)}, carry_forward={len(rows) - len(revalidation)}, "
        f"revalidation={len(revalidation)}, pd_variants={len(EXPECTED_PD)}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError) as exc:
        print(f"cycle2 coverage sweep: FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
