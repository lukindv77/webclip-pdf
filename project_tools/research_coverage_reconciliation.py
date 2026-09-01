#!/usr/bin/env python3
"""Deterministic project-wide deep-research coverage reconciliation gate.

This is an research-process checker, not a product-runtime test. It verifies the durable
family-level Coverage Matrix terminality rules, the external-research freshness window,
and that the active coverage campaign did not invalidate its renderer evidence by changing
production runtime or the PDF fidelity contract after the reconstruction baseline.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "project_docs" / "RESEARCH_COVERAGE_RECONSTRUCTION_2026-08-30.md"
EXTERNAL_BASELINE_PATH = ROOT / "project_docs" / "RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-30.md"

RESEARCH_DATE = dt.date(2026, 8, 31)
COVERAGE_RECONSTRUCTION_BASE = "bcf310b13dd8584d2e0d66ae4007b511a859843d"
EXPECTED_IDS = [f"C{i:02d}" for i in range(1, 47)]
EXPLICIT_EXTERNAL_IDS = {"C17", "C37", "C41", "C42", "C44", "C46"}

# These are the production/browser-extension surfaces whose changes can stale renderer,
# physical-artifact or operation-lifecycle evidence. Research docs/tools are intentionally
# excluded from this set.
PRODUCTION_PATHS = {
    "content.js",
    "frame-agent.js",
    "journal-import-stream.js",
    "journal-text-filter.js",
    "journal.css",
    "journal.html",
    "journal.js",
    "manifest.json",
    "offscreen.html",
    "offscreen.js",
    "options.css",
    "options.html",
    "options.js",
    "popup.css",
    "popup.html",
    "popup.js",
    "prepared-save-as.js",
    "public-suffix.js",
    "public_suffix_list.dat",
    "service-worker.js",
    "yandex-auth-help.css",
    "yandex-auth-help.html",
    "yandex-auth-help.js",
}
FIDELITY_CONTRACT = "project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md"

ROW_RE = re.compile(r"^\|\s*(C\d{2})\s*\|(.*)$")
DATE_RE = re.compile(r"^Date:\s*(\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE)


def git(*args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return completed.stdout.strip()


def parse_matrix() -> list[dict[str, str]]:
    text = MATRIX_PATH.read_text(encoding="utf-8")
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        match = ROW_RE.match(line)
        if not match:
            continue
        cells = [match.group(1)] + [cell.strip() for cell in match.group(2).split("|")]
        # trailing table delimiter produces an empty last cell
        if cells and cells[-1] == "":
            cells.pop()
        if len(cells) != 7:
            raise AssertionError(f"unexpected matrix column count for {match.group(1)}: {len(cells)}")
        row_id, surface, core, required, evidence, coverage, owner = cells
        rows.append(
            {
                "id": row_id,
                "surface": surface,
                "core": core,
                "required": required,
                "evidence": evidence,
                "coverage": coverage,
                "owner": owner,
            }
        )
    return rows


def parse_external_date() -> dt.date:
    text = EXTERNAL_BASELINE_PATH.read_text(encoding="utf-8")
    match = DATE_RE.search(text)
    if not match:
        raise AssertionError("external baseline Date: YYYY-MM-DD not found")
    return dt.date.fromisoformat(match.group(1))


def main() -> None:
    rows = parse_matrix()
    ids = [row["id"] for row in rows]
    assert ids == EXPECTED_IDS, {"expected": EXPECTED_IDS, "actual": ids}

    missing_fields: list[str] = []
    nonterminal: list[dict[str, str]] = []
    external_mismatches: list[str] = []

    for row in rows:
        for field in ("surface", "core", "required", "evidence", "coverage", "owner"):
            if not row[field].strip():
                missing_fields.append(f"{row['id']}:{field}")

        coverage_upper = row["coverage"].upper()
        if any(marker in coverage_upper for marker in ("NOT-TRIAGED", "REVALIDATION-REQUIRED", "PARTIAL")):
            nonterminal.append({"id": row["id"], "coverage": row["coverage"]})
        if "UNKNOWN" in coverage_upper and "EXTERNAL-REQUIRED" not in coverage_upper:
            nonterminal.append({"id": row["id"], "coverage": row["coverage"]})

        if row["id"] in EXPLICIT_EXTERNAL_IDS and "EXTERNAL-REQUIRED" not in coverage_upper:
            external_mismatches.append(row["id"])

    assert not missing_fields, missing_fields
    assert not nonterminal, nonterminal
    assert not external_mismatches, external_mismatches

    external_date = parse_external_date()
    freshness_days = (RESEARCH_DATE - external_date).days
    assert 0 <= freshness_days <= 7, {"externalDate": external_date.isoformat(), "freshnessDays": freshness_days}

    changed = [
        line
        for line in git("diff", "--name-only", f"{COVERAGE_RECONSTRUCTION_BASE}..HEAD").splitlines()
        if line
    ]
    runtime_changed = sorted(path for path in changed if path in PRODUCTION_PATHS)
    fidelity_contract_changed = FIDELITY_CONTRACT in changed
    assert not runtime_changed, runtime_changed
    assert not fidelity_contract_changed, FIDELITY_CONTRACT

    external_rows = [row["id"] for row in rows if "EXTERNAL-REQUIRED" in row["coverage"].upper()]
    findings = [row["id"] for row in rows if "FINDING" in row["coverage"].upper()]
    unknowns = [row["id"] for row in rows if "UNKNOWN" in row["coverage"].upper()]

    print(
        json.dumps(
            {
                "ok": True,
                "researchDate": RESEARCH_DATE.isoformat(),
                "rowCount": len(rows),
                "firstRow": rows[0]["id"],
                "lastRow": rows[-1]["id"],
                "missingFields": missing_fields,
                "nonterminal": nonterminal,
                "externalRows": external_rows,
                "findingRows": findings,
                "unknownRows": unknowns,
                "externalBaselineDate": external_date.isoformat(),
                "externalFreshnessDays": freshness_days,
                "coverageReconstructionBase": COVERAGE_RECONSTRUCTION_BASE,
                "runtimeChanged": runtime_changed,
                "fidelityContractChanged": fidelity_contract_changed,
                "transitionCandidate": True,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
