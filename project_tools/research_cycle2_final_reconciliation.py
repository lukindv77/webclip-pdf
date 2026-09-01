#!/usr/bin/env python3
"""Deterministic final-reconciliation guard for Cycle-2 deep-research coverage."""
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MATRIX = ROOT / "project_docs" / "RESEARCH_COVERAGE_CYCLE2_MATRIX_2026-08-31.md"
SYNTHESIS = ROOT / "project_docs" / "RESEARCH_COVERAGE_CYCLE2_FINAL_SYNTHESIS_2026-09-01.md"
RELEASE = ROOT / "project_docs" / "RELEASE_READINESS.md"
REGISTRY = ROOT / "project_docs" / "RESEARCH_REGISTRY.md"
EXTERNAL = ROOT / "project_docs" / "RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md"
CYCLE2_START = "2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8"
ROW_RE = re.compile(r"^\| (C\d{2}) \|", re.MULTILINE)


def fail(message: str) -> None:
    raise AssertionError(message)


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def main() -> int:
    matrix = read(MATRIX)
    synthesis = read(SYNTHESIS)
    release = read(RELEASE)
    registry = read(REGISTRY)
    external = read(EXTERNAL)

    rows = ROW_RE.findall(matrix)
    expected = [f"C{i:02d}" for i in range(1, 47)]
    if rows != expected:
        fail(f"Cycle-2 family rows must be exactly C01..C46; got {rows!r}")
    for forbidden in ("NOT-TRIAGED", "REVALIDATION-REQUIRED"):
        family_lines = [line for line in matrix.splitlines() if line.startswith("| C") and forbidden in line]
        if family_lines:
            fail(f"terminal matrix still contains {forbidden}: {family_lines}")

    required_matrix = [
        "families with terminal required evidence under current Cycle-2 Change Impact: **46**",
        "families with at least one new stable-browser variant requiring revalidation: **0**",
        "remaining revalidation set: **none**",
        "**`DEEP-RESEARCH-COVERAGE-COMPLETE`**",
        "C46 remains bounded `EXTERNAL-REQUIRED / UNKNOWN`",
        "PD1, PD2, PD3, PD4, PD5",
        "PD6",
        "PD7",
    ]
    for fragment in required_matrix:
        if fragment not in matrix:
            fail(f"missing final Matrix declaration: {fragment}")

    for cid in ("C17", "C37", "C41", "C42", "C44", "C46"):
        matching = [line for line in matrix.splitlines() if line.startswith(f"| {cid} ")]
        if len(matching) != 1 or "EXTERNAL" not in matching[0]:
            fail(f"{cid} must retain explicit external boundary")
    c46 = next(line for line in matrix.splitlines() if line.startswith("| C46 "))
    if "UNKNOWN" not in c46:
        fail("C46 must remain bounded UNKNOWN")

    required_synthesis = [
        "`DEEP-RESEARCH-COVERAGE-COMPLETE`",
        "`DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE` — **NO**",
        "`RELEASE-READY` — **NO**",
        "46/46 present and sequential",
        "material `REVALIDATION-REQUIRED`: **0**",
        "Final Cycle-2 statement: deep-research coverage is complete; critical finding closure and release readiness are not.",
    ]
    for fragment in required_synthesis:
        if fragment not in synthesis:
            fail(f"missing final synthesis declaration: {fragment}")

    if "**NOT READY.**" not in release:
        fail("release readiness must remain NOT READY")
    if "Date: 2026-08-31" not in external:
        fail("expected current Cycle-2 external baseline date 2026-08-31")

    for owner in ("P0-004", "P0-070", "P0-075", "P0-080", "P1-001", "P1-160", "P1-230"):
        if owner not in registry:
            fail(f"missing canonical owner used by Cycle-2 synthesis: {owner}")

    changed = subprocess.check_output(
        ["git", "diff", "--name-only", f"{CYCLE2_START}...HEAD"], cwd=ROOT, text=True
    ).splitlines()
    allowed_temp = ".github/workflows/research-cycle2-final-temp.yml"
    unexpected = [
        path for path in changed
        if not (path.startswith("project_docs/") or path.startswith("project_tools/") or path == allowed_temp)
    ]
    if unexpected:
        fail(f"Cycle-2 staleness gate found product/runtime/contract-adjacent changes: {unexpected}")
    if any(path.endswith("WEBCLIP_PDF_FIDELITY_CONTRACT.md") for path in changed):
        fail("fidelity contract changed during Cycle 2")

    print(
        "cycle2 final reconciliation: OK; families=46/46, revalidation=0, "
        "external=C17,C37,C41,C42,C44,C46, C46=bounded-UNKNOWN, "
        "coverage=complete, critical_closure=no, release_ready=no, runtime_staleness=none"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, subprocess.CalledProcessError) as exc:
        print(f"cycle2 final reconciliation: FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
