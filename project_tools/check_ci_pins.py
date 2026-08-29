#!/usr/bin/env python3
"""Fail closed on mutable CI dependencies, write-capable workflows, or noisy Dependabot scope."""

from __future__ import annotations

import pathlib
import re
import sys
from collections.abc import Mapping

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
DEPENDABOT = ROOT / ".github" / "dependabot.yml"
USES = re.compile(r"^\s*-?\s*uses:\s*([^\s#]+)", re.MULTILINE)
FULL_SHA = re.compile(r"^[0-9a-fA-F]{40}$")
WRITE_PERMISSION = re.compile(r"^\s+[A-Za-z0-9_-]+:\s*write\s*$", re.MULTILINE)
MUTATING_GH_API = re.compile(r"\bgh\s+api\b[^\n]*--method\s+(POST|PUT|PATCH|DELETE)\b", re.IGNORECASE)

EXPECTED_TOOL_VERSIONS = {
    "python-version": "3.12.14",
    "node-version": "22.23.2",
}

DEPENDABOT_MARKERS = (
    'package-ecosystem: "github-actions"',
    'directory: "/"',
    'interval: "monthly"',
    'open-pull-requests-limit: 1',
    "github-actions:",
    '- "*"',
)


def evaluate(workflows: Mapping[str, str]) -> list[str]:
    errors: list[str] = []
    for name, text in sorted(workflows.items()):
        if "runs-on: ubuntu-latest" in text:
            errors.append(f"{name}: mutable runner alias ubuntu-latest is forbidden; pin ubuntu-24.04")

        if WRITE_PERMISSION.search(text):
            errors.append(f"{name}: workflow permissions must remain read-only; '*: write' detected")
        if MUTATING_GH_API.search(text):
            errors.append(f"{name}: mutating 'gh api --method ...' command is forbidden in permanent workflows")

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


def evaluate_dependabot(text: str) -> list[str]:
    errors: list[str] = []
    for marker in DEPENDABOT_MARKERS:
        if marker not in text:
            errors.append(f"dependabot.yml missing low-noise GitHub Actions marker: {marker}")

    ecosystems = re.findall(r"package-ecosystem:\s*[\"']?([^\"'\s]+)", text)
    unexpected = sorted(set(ecosystems) - {"github-actions"})
    if unexpected:
        errors.append("dependabot.yml must monitor only github-actions; unexpected ecosystem(s): " + ", ".join(unexpected))

    if text.count("package-ecosystem:") != 1:
        errors.append("dependabot.yml must contain exactly one update ecosystem to avoid dependency-PR sprawl")

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

    if not DEPENDABOT.is_file():
        errors.append(".github/dependabot.yml is missing")
    else:
        errors.extend(evaluate_dependabot(DEPENDABOT.read_text(encoding="utf-8")))

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"CI/supply-chain hygiene FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 1

    print(
        f"CI/supply-chain hygiene PASS: {len(workflows)} workflow(s), "
        "external actions immutable, permissions read-only, Dependabot low-noise."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
