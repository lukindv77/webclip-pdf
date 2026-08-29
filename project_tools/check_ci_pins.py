#!/usr/bin/env python3
"""Fail closed if GitHub Actions workflows use mutable external action refs."""

from __future__ import annotations

import pathlib
import re
import sys
from collections.abc import Mapping

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
USES = re.compile(r"^\s*-?\s*uses:\s*([^\s#]+)", re.MULTILINE)
FULL_SHA = re.compile(r"^[0-9a-fA-F]{40}$")

EXPECTED_TOOL_VERSIONS = {
    "python-version": "3.12.14",
    "node-version": "22.23.2",
}


def evaluate(workflows: Mapping[str, str]) -> list[str]:
    errors: list[str] = []
    for name, text in sorted(workflows.items()):
        if "runs-on: ubuntu-latest" in text:
            errors.append(f"{name}: mutable runner alias ubuntu-latest is forbidden; pin ubuntu-24.04")

        for use in USES.findall(text):
            if use.startswith("./"):
                continue
            if "@" not in use:
                errors.append(f"{name}: external action has no ref: {use}")
                continue
            action, ref = use.rsplit("@", 1)
            if not FULL_SHA.fullmatch(ref):
                errors.append(f"{name}: external action must use full commit SHA, not mutable ref: {action}@{ref}")

        for key, expected in EXPECTED_TOOL_VERSIONS.items():
            marker = f"{key}: '{expected}'"
            if key in text and marker not in text:
                errors.append(f"{name}: {key} must be exact {expected}")

    return errors


def load_workflows() -> dict[str, str]:
    if not WORKFLOWS.is_dir():
        return {}
    return {
        path.relative_to(ROOT).as_posix(): path.read_text(encoding="utf-8")
        for path in sorted(WORKFLOWS.glob("*.y*ml"))
        if path.is_file()
    }


def main() -> int:
    workflows = load_workflows()
    if not workflows:
        print("ERROR: no GitHub Actions workflows found", file=sys.stderr)
        return 1
    errors = evaluate(workflows)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"CI pin check FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 1
    print(f"CI pin check PASS: {len(workflows)} workflow(s), all external actions immutable.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
