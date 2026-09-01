#!/usr/bin/env python3
"""Verify byte-for-byte retirement of the final temporary audit delta."""

from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_COMMIT = "feadab448ef05163cee7815b7f7644e3ee4ebf92"
SOURCE_PATH = "project_docs/AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md"
EXPECTED_BLOB = "438bf6a4b2e3318d0efcfb97ef778da30f2f0faa"
RETIRED_PATH = ROOT / "project_docs" / "AUDIT_RETIRED_DELTA_EVIDENCE.md"
BEGIN = "<!-- BEGIN VERBATIM AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md -->\n"
END = "<!-- END VERBATIM AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md -->"


def git_bytes(*args: str, input_bytes: bytes | None = None) -> bytes:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        input=input_bytes,
        stdout=subprocess.PIPE,
    ).stdout


def main() -> int:
    assert not (ROOT / SOURCE_PATH).exists(), "retired standalone delta returned to current tree"

    source = git_bytes("show", f"{SOURCE_COMMIT}:{SOURCE_PATH}")
    blob = git_bytes("hash-object", "--stdin", input_bytes=source).decode("ascii").strip()
    assert blob == EXPECTED_BLOB, (blob, EXPECTED_BLOB)

    retired = RETIRED_PATH.read_bytes()
    begin = BEGIN.encode("utf-8")
    end = END.encode("utf-8")
    start = retired.find(begin)
    assert start >= 0, "verbatim retirement BEGIN marker missing"
    start += len(begin)
    finish = retired.find(end, start)
    assert finish >= 0, "verbatim retirement END marker missing"
    embedded = retired[start:finish]

    assert embedded == source, "retired source differs byte-for-byte from historical delta"
    print(f"Final audit delta retirement PASS: bytes={len(source)}, blob={blob}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
