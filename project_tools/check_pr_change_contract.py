#!/usr/bin/env python3
"""Validate PR-level coupling between runtime changes, audit ownership and tests.

This checker is intentionally local/network-free. In GitHub Actions it receives the
exact PR base/head SHAs and PR body, computes the changed-file set, and fails closed
when a product-runtime or canonical-audit change is not accompanied by an explicit
impact declaration and the required durable evidence.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import re
import subprocess
import sys
from collections.abc import Mapping, Sequence

ROOT = pathlib.Path(__file__).resolve().parents[1]
P_CODE = re.compile(r"\bP[012]-\d{3}\b")
CHECKED = r"\[[xX]\]"
AUDIT_NONE = re.compile(rf"^\s*-\s*{CHECKED}\s*`?audit-impact:\s*none`?\b", re.MULTILINE | re.IGNORECASE)
AUDIT_OWNER = re.compile(rf"^\s*-\s*{CHECKED}\s*`?audit-impact:\s*owner`?\b", re.MULTILINE | re.IGNORECASE)
TEST_EXTERNAL_ONLY = re.compile(rf"^\s*-\s*{CHECKED}\s*`?test-impact:\s*external-only`?\b", re.MULTILINE | re.IGNORECASE)

RUNTIME_SUFFIXES = {".js", ".html", ".css", ".png", ".svg", ".ico", ".webp"}
RUNTIME_DIRS = {"assets", "icons"}
REGISTRY = "project_docs/AUDIT_REGISTRY.md"
READINESS = "project_docs/RELEASE_READINESS.md"
TEST_STATUS = "project_docs/TEST_STATUS.md"


def run_git(*args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return proc.stdout


def changed_files(base: str, head: str) -> list[str]:
    output = run_git("diff", "--name-only", "--diff-filter=ACMRD", f"{base}...{head}")
    return [line.strip() for line in output.splitlines() if line.strip()]


def is_runtime_path(path: str) -> bool:
    p = pathlib.PurePosixPath(path)
    if path == "manifest.json":
        return True
    if len(p.parts) == 1 and p.suffix.lower() in RUNTIME_SUFFIXES:
        return True
    return bool(p.parts and p.parts[0] in RUNTIME_DIRS)


def is_audit_evidence_path(path: str) -> bool:
    if path == REGISTRY or path == "project_docs/AUDIT_HISTORY_INDEX.md":
        return True
    name = pathlib.PurePosixPath(path).name
    return path.startswith("project_docs/") and name.startswith("AUDIT_") and name.endswith("_EVIDENCE.md")


def is_deterministic_test_path(path: str) -> bool:
    name = pathlib.PurePosixPath(path).name
    return path.startswith("project_tools/") and name.startswith("test_") and name.endswith(".js")


def selected(pattern: re.Pattern[str], body: str) -> bool:
    return bool(pattern.search(body or ""))


def current_texts(paths: Sequence[str]) -> dict[str, str]:
    texts: dict[str, str] = {}
    for rel in paths:
        path = ROOT / rel
        if path.is_file():
            try:
                texts[rel] = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                pass
    return texts


def evaluate(changed: Sequence[str], body: str, texts: Mapping[str, str] | None = None) -> list[str]:
    changed_set = set(changed)
    texts = dict(texts or {})
    errors: list[str] = []

    runtime = sorted(path for path in changed_set if is_runtime_path(path))
    audit_files = sorted(path for path in changed_set if is_audit_evidence_path(path))
    deterministic_tests = sorted(path for path in changed_set if is_deterministic_test_path(path))
    registry_changed = REGISTRY in changed_set
    manifest_changed = "manifest.json" in changed_set

    impact_none = selected(AUDIT_NONE, body)
    impact_owner = selected(AUDIT_OWNER, body)
    external_only = selected(TEST_EXTERNAL_ONLY, body)

    if impact_none and impact_owner:
        errors.append("select exactly one audit-impact declaration; both none and owner are checked")

    requires_audit_declaration = bool(runtime or audit_files)
    if requires_audit_declaration and not (impact_none or impact_owner):
        errors.append("runtime/audit change requires one checked declaration: audit-impact: none OR audit-impact: owner")

    if audit_files and impact_none:
        errors.append("audit-impact: none is inconsistent with changed canonical audit registry/evidence files")

    codes = sorted(set(P_CODE.findall(body or "")))
    if impact_owner and not codes:
        errors.append("audit-impact: owner requires at least one explicit P-code in the PR body")

    if impact_owner and not audit_files:
        errors.append("audit-impact: owner requires durable AUDIT_REGISTRY/family/history evidence in the PR diff")

    if impact_owner and audit_files and codes:
        evidence_text = "\n".join(texts.get(path, "") for path in audit_files)
        if evidence_text and not any(code in evidence_text for code in codes):
            errors.append("none of the declared P-codes appears in the changed durable audit evidence")

    if registry_changed and not impact_owner:
        errors.append("AUDIT_REGISTRY.md change requires audit-impact: owner")
    if registry_changed and len(audit_files) < 2:
        errors.append("AUDIT_REGISTRY.md change requires a second durable audit evidence/history file in the same PR")

    if runtime and impact_owner and not deterministic_tests and not external_only:
        errors.append(
            "runtime + audit-impact: owner requires a changed deterministic project_tools/test_*.js "
            "or checked test-impact: external-only"
        )

    if external_only and not impact_owner:
        errors.append("test-impact: external-only is valid only with audit-impact: owner")

    if manifest_changed:
        missing = [path for path in (READINESS, TEST_STATUS) if path not in changed_set]
        if missing:
            errors.append("manifest.json change requires synchronized release/test truth: " + ", ".join(missing))

    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", help="exact PR base SHA")
    parser.add_argument("--head", help="exact PR head SHA")
    parser.add_argument("--body-file", help="optional file containing PR body")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base = args.base or os.environ.get("PR_BASE_SHA", "").strip()
    head = args.head or os.environ.get("PR_HEAD_SHA", "").strip()
    if not base or not head:
        print("PR change contract skipped: no exact PR base/head supplied.")
        return 0

    if args.body_file:
        body = pathlib.Path(args.body_file).read_text(encoding="utf-8")
    else:
        body = os.environ.get("PR_BODY", "")

    try:
        changed = changed_files(base, head)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: cannot compute exact PR diff: {exc}", file=sys.stderr)
        return 1

    texts = current_texts(changed)
    errors = evaluate(changed, body, texts)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"PR change contract FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 1

    runtime_count = sum(1 for path in changed if is_runtime_path(path))
    audit_count = sum(1 for path in changed if is_audit_evidence_path(path))
    print(
        "PR change contract PASS: "
        f"changed={len(changed)}, runtime={runtime_count}, audit={audit_count}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
