#!/usr/bin/env python3
"""Deterministic self-test for check_repository_consistency.py."""

from __future__ import annotations

import pathlib
import re
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "project_tools"))

import check_repository_consistency as rc  # noqa: E402


def run_registry_check() -> rc.CheckResult:
    result = rc.CheckResult(errors=[], warnings=[])
    rc.check_registry_numbering(result)
    return result


def main() -> int:
    original_path = rc.CANONICAL_REGISTRY
    original_text = original_path.read_text(encoding="utf-8")

    baseline = run_registry_check()
    assert not baseline.errors, baseline.errors

    try:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = pathlib.Path(tmp) / "AUDIT_REGISTRY.md"
            rc.CANONICAL_REGISTRY = fixture

            for code in ("P1-226", "P1-227", "P1-228", "P1-229", "P1-230"):
                pattern = re.compile(rf"^\|\s*{re.escape(code)}\s*\|.*(?:\n|$)", re.MULTILINE)
                modified, count = pattern.subn("", original_text, count=1)
                assert count == 1, f"fixture could not remove canonical row {code}"
                fixture.write_text(modified, encoding="utf-8")

                result = run_registry_check()
                assert any(code in error for error in result.errors), (
                    code,
                    result.errors,
                )
    finally:
        rc.CANONICAL_REGISTRY = original_path

    print("Repository consistency self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
