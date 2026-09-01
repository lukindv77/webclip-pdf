#!/usr/bin/env python3
"""Deterministic provenance checks for staged audit-evidence compaction."""

from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_COMMIT = "73c92c3389790dc4fdf449373eb2392a729359f3"
CONSOLIDATED = ROOT / "project_docs" / "AUDIT_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md"

SOURCES = {
    "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md": "b36dc030b245ef39d150d5e8de561859f28ebc19",
    "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md": "aa7b484a30c7591ac2e15e0f0269ca6d229f09fa",
    "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md": "a06dca0fb4752fc4c6514f4069ea97e63cb91452",
}

RETIRED_CURRENT_PATHS = (
    ROOT / "project_docs" / "AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md",
    ROOT / "project_docs" / "AUDIT_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md",
)


def git_bytes(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=True, stdout=subprocess.PIPE
    ).stdout


def main() -> int:
    assert CONSOLIDATED.is_file(), f"missing consolidated evidence: {CONSOLIDATED.relative_to(ROOT)}"
    text = CONSOLIDATED.read_text(encoding="utf-8")

    for path, expected_blob in SOURCES.items():
        original = git_bytes("show", f"{SOURCE_COMMIT}:{path}")
        actual_blob = subprocess.run(
            ["git", "hash-object", "--stdin"],
            cwd=ROOT,
            check=True,
            input=original,
            stdout=subprocess.PIPE,
            text=False,
        ).stdout.decode("ascii").strip()
        assert actual_blob == expected_blob, (path, expected_blob, actual_blob)
        assert path in text, f"consolidated evidence lost source path ledger: {path}"
        assert expected_blob in text, f"consolidated evidence lost source blob ledger: {expected_blob}"

    for path in RETIRED_CURRENT_PATHS:
        assert not path.exists(), f"retired staged checkpoint returned to current tree: {path.relative_to(ROOT)}"

    for block in range(1, 57):
        marker = f"{block}. "
        assert marker in text, f"consolidated evidence missing block-preservation marker {block}"

    print("Staged evidence compaction provenance PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
