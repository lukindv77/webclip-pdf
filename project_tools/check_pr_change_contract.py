#!/usr/bin/env python3
"""Validate PR-level coupling between runtime changes, research ownership and tests.

This checker is intentionally local/network-free. In GitHub Actions it receives the
exact PR base/head SHAs and PR body, computes the changed-file set, and fails closed
when a product-runtime or canonical-research change is not accompanied by an explicit
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
PR_TEMPLATE = ROOT / ".github" / "pull_request_template.md"
P_CODE = re.compile(r"\bP[012]-\d{3}\b")
CHECKED = r"\[[xX]\]"
RESEARCH_NONE = re.compile(rf"^\s*-\s*{CHECKED}\s*`?research-impact:\s*none`?(?:\s|$)", re.MULTILINE | re.IGNORECASE)
RESEARCH_OWNER = re.compile(rf"^\s*-\s*{CHECKED}\s*`?research-impact:\s*owner`?(?:\s|$)", re.MULTILINE | re.IGNORECASE)
TEST_EXTERNAL_ONLY = re.compile(rf"^\s*-\s*{CHECKED}\s*`?test-impact:\s*external-only`?(?:\s|$)", re.MULTILINE | re.IGNORECASE)
RESEARCH_RATIONALE = re.compile(r"^\s*`?research-rationale:\s*(.*?)`?\s*$", re.MULTILINE | re.IGNORECASE)

RUNTIME_SUFFIXES = {".js", ".html", ".css", ".png", ".svg", ".ico", ".webp"}
RUNTIME_DIRS = {"assets", "icons"}
REGISTRY = "project_docs/RESEARCH_REGISTRY.md"
READINESS = "project_docs/RELEASE_READINESS.md"
TEST_STATUS = "project_docs/TEST_STATUS.md"
TEMPLATE_MARKERS = (
    "research-impact: none",
    "research-impact: owner",
    "research-rationale:",
    "test-impact: external-only",
    "P-owner(s) affected",
    "PR change-contract validation",
)


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


def is_research_evidence_path(path: str) -> bool:
    if path == REGISTRY or path == "project_docs/RESEARCH_HISTORY_INDEX.md":
        return True
    name = pathlib.PurePosixPath(path).name
    return path.startswith("project_docs/") and name.startswith("RESEARCH_") and name.endswith("_EVIDENCE.md")


def is_deterministic_test_path(path: str) -> bool:
    name = pathlib.PurePosixPath(path).name
    return path.startswith("project_tools/") and name.startswith("test_") and name.endswith(".js")


def selected(pattern: re.Pattern[str], body: str) -> bool:
    return bool(pattern.search(body or ""))


def research_rationale(body: str) -> str:
    match = RESEARCH_RATIONALE.search(body or "")
    if not match:
        return ""
    return match.group(1).strip().strip("`").strip()


def concrete_rationale(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized:
        return False
    if normalized in {"none", "n/a", "na", "not applicable", "not-applicable"}:
        return False
    if "replace with concrete rationale" in normalized:
        return False
    if re.fullmatch(r"[_<>.\-\s]+", value):
        return False
    return len(re.sub(r"\s+", " ", value).strip()) >= 12


def validate_template(text: str) -> list[str]:
    return [f"PR template missing machine-readable contract marker: {marker}" for marker in TEMPLATE_MARKERS if marker not in text]


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
    research_files = sorted(path for path in changed_set if is_research_evidence_path(path))
    deterministic_tests = sorted(path for path in changed_set if is_deterministic_test_path(path))
    registry_changed = REGISTRY in changed_set
    manifest_changed = "manifest.json" in changed_set

    impact_none = selected(RESEARCH_NONE, body)
    impact_owner = selected(RESEARCH_OWNER, body)
    external_only = selected(TEST_EXTERNAL_ONLY, body)
    rationale = research_rationale(body)

    if impact_none and impact_owner:
        errors.append("select exactly one research-impact declaration; both none and owner are checked")

    requires_research_declaration = bool(runtime or research_files)
    if requires_research_declaration and not (impact_none or impact_owner):
        errors.append("runtime/research change requires one checked declaration: research-impact: none OR research-impact: owner")

    if runtime and not concrete_rationale(rationale):
        errors.append("every runtime change requires a concrete non-placeholder research-rationale")

    if research_files and impact_none:
        errors.append("research-impact: none is inconsistent with changed canonical research registry/evidence files")

    codes = sorted(set(P_CODE.findall(body or "")))
    if impact_owner and not codes:
        errors.append("research-impact: owner requires at least one explicit P-code in the PR body")

    if impact_owner and not research_files:
        errors.append("research-impact: owner requires durable RESEARCH_REGISTRY/family/history evidence in the PR diff")

    if impact_owner and research_files and codes:
        evidence_text = "\n".join(texts.get(path, "") for path in research_files)
        if evidence_text and not any(code in evidence_text for code in codes):
            errors.append("none of the declared P-codes appears in the changed durable research evidence")

    if registry_changed and not impact_owner:
        errors.append("RESEARCH_REGISTRY.md change requires research-impact: owner")
    if registry_changed and len(research_files) < 2:
        errors.append("RESEARCH_REGISTRY.md change requires a second durable research evidence/history file in the same PR")

    if runtime and impact_owner:
        if deterministic_tests and external_only:
            errors.append("test-impact: external-only cannot be checked when deterministic tests are changed in the same PR")
        if not deterministic_tests and not external_only:
            errors.append(
                "runtime + research-impact: owner requires a changed deterministic project_tools/test_*.js "
                "or checked test-impact: external-only"
            )
        if deterministic_tests and not external_only and codes:
            test_text = "\n".join(texts.get(path, "") for path in deterministic_tests)
            missing_codes = [code for code in codes if code not in test_text]
            if missing_codes:
                errors.append(
                    "declared P-code(s) missing from changed deterministic test source: "
                    + ", ".join(missing_codes)
                )

    if external_only and not impact_owner:
        errors.append("test-impact: external-only is valid only with research-impact: owner")

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

    if not PR_TEMPLATE.is_file():
        print("ERROR: .github/pull_request_template.md is missing", file=sys.stderr)
        return 1
    structure_errors = validate_template(PR_TEMPLATE.read_text(encoding="utf-8"))
    if structure_errors:
        for error in structure_errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"PR change contract structure FAILED: {len(structure_errors)} error(s).", file=sys.stderr)
        return 1

    base = args.base or os.environ.get("PR_BASE_SHA", "").strip()
    head = args.head or os.environ.get("PR_HEAD_SHA", "").strip()
    if not base or not head:
        print("PR change contract structure PASS; exact PR diff not supplied, diff evaluation skipped.")
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
    research_count = sum(1 for path in changed if is_research_evidence_path(path))
    print(
        "PR change contract PASS: "
        f"changed={len(changed)}, runtime={runtime_count}, research={research_count}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
