#!/usr/bin/env python3
"""Deterministic guard for the current Cycle-2 Coverage Sweep checkpoint.

This is an audit-process checker, not a product-runtime test. It verifies that
Cycle-2 Matrix v2 keeps the complete C01..C46 denominator visible, has no
remaining current-stable Change-Impact revalidation cells after T1..T5, and
preserves explicit platform-delta states and the pending final-reconciliation
campaign gate.
"""
from __future__ import annotations
import argparse
import pathlib
import re
import sys

EXPECTED_REVALIDATION: set[str] = set()
EXPECTED_PD = {
    "PD1": "ARTIFACT-COVERED / FINDING",
    "PD2": "ARTIFACT-COVERED / FINDING",
    "PD3": "ARTIFACT-COVERED / FINDING",
    "PD4": "ARTIFACT-COVERED / FINDING",
    "PD5": "ARTIFACT-COVERED / FINDING",
    "PD6": "ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)",
    "PD7": "OUT-OF-SCOPE (current stable target) / WATCH",
}
FAMILY_ROW_RE = re.compile(r"^\| (C\d{2}) \|", re.MULTILINE)

def fail(message: str) -> None: raise AssertionError(message)

def parse_args() -> argparse.Namespace:
    p=argparse.ArgumentParser();p.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]);return p.parse_args()

def main() -> int:
    args=parse_args();path=args.repo_root/'project_docs'/'AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md';text=path.read_text(encoding='utf-8')
    rows=FAMILY_ROW_RE.findall(text);expected=[f'C{i:02d}' for i in range(1,47)]
    if rows!=expected:fail(f'family rows must be exactly sequential C01..C46; got {rows!r}')
    revalidation=set()
    for line in text.splitlines():
        if not line.startswith('| C'):continue
        cells=[cell.strip() for cell in line.strip().strip('|').split('|')]
        if len(cells)<6:fail(f'malformed family matrix row: {line}')
        cid,coverage=cells[0],cells[5]
        if 'REVALIDATION-REQUIRED' in coverage:revalidation.add(cid)
        if 'NOT-TRIAGED' in coverage:fail(f'Cycle-2 sweep must not leave family NOT-TRIAGED: {cid}')
    if revalidation!=EXPECTED_REVALIDATION:fail(f'unexpected family revalidation set: expected={sorted(EXPECTED_REVALIDATION)} got={sorted(revalidation)}')
    for pd,state in EXPECTED_PD.items():
        matching=[line for line in text.splitlines() if line.startswith(f'| **{pd}** ')]
        if len(matching)!=1:fail(f'expected exactly one {pd} platform-delta row')
        if state not in matching[0]:fail(f'{pd} must preserve state {state!r}: {matching[0]}')
    required=[
        'families with terminal required evidence under current Cycle-2 Change Impact: **46**',
        'families with at least one new stable-browser variant requiring revalidation: **0**',
        'remaining revalidation set: **none**',
        'terminal finding platform-delta variants: **PD1, PD2, PD3, PD4, PD5 — `ARTIFACT-COVERED / FINDING`**',
        'terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**',
        'pending current-stable platform-delta variants: **none**',
        '**`DEEP-AUDIT-IN-PROGRESS`**',
        'final reconciliation pending',
        'local managed Chromium executable remains **144.0.7559.96**',
        'Completed deep-dive tranche — T1 / PD2',
        'Completed deep-dive tranche — T2 / PD3',
        'Completed deep-dive tranche — T3 / PD5+PD6',
        'Completed deep-dive tranche — T4 / PD4',
        'Completed deep-dive tranche — T5 / PD1',
        'Next action: **Cycle-2 final reconciliation / synthesis**',
    ]
    for fragment in required:
        if fragment not in text:fail(f'missing required Cycle-2 checkpoint declaration: {fragment}')
    print('cycle2 coverage sweep: OK; families=46, family_revalidation=0, pd1=pd2=pd3=pd4=pd5=finding, pd6=virtual-pdf-pass-control, pending_pd=0, final_reconciliation=pending')
    return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (AssertionError,OSError) as exc:
        print(f'cycle2 coverage sweep: FAIL: {exc}',file=sys.stderr);raise SystemExit(1)
