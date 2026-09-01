#!/usr/bin/env python3
"""Verify historical final-delta provenance without reproducing retired wording."""
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED_BLOB = "438bf6a4b2e3318d0efcfb97ef778da30f2f0faa"
RETIRED_PATH = ROOT / "project_docs" / "RESEARCH_RETIRED_DELTA_EVIDENCE.md"


def main() -> int:
    subprocess.run(["git", "cat-file", "-e", f"{EXPECTED_BLOB}^{{blob}}"], cwd=ROOT, check=True)
    assert RETIRED_PATH.is_file(), RETIRED_PATH
    text = RETIRED_PATH.read_text(encoding="utf-8")
    assert EXPECTED_BLOB in text, "historical source blob identity missing from retired evidence"
    print(f"Final research delta retirement provenance PASS: blob={EXPECTED_BLOB}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
