#!/usr/bin/env python3
"""Deterministic self-test for check_pr_change_contract.py."""

from __future__ import annotations

import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
MODULE_PATH = HERE / "check_pr_change_contract.py"
spec = importlib.util.spec_from_file_location("check_pr_change_contract", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load check_pr_change_contract.py")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def expect_pass(name: str, changed: list[str], body: str, texts: dict[str, str] | None = None) -> None:
    errors = module.evaluate(changed, body, texts or {})
    if errors:
        raise AssertionError(f"{name}: expected PASS, got {errors}")


def expect_fail(name: str, changed: list[str], body: str, needle: str, texts: dict[str, str] | None = None) -> None:
    errors = module.evaluate(changed, body, texts or {})
    if not errors:
        raise AssertionError(f"{name}: expected failure")
    if not any(needle in error for error in errors):
        raise AssertionError(f"{name}: expected {needle!r}, got {errors}")


def main() -> None:
    valid_template = "\n".join(module.TEMPLATE_MARKERS)
    if module.validate_template(valid_template):
        raise AssertionError("template markers should pass")
    template_errors = module.validate_template("audit-impact: none")
    if not template_errors or not any("audit-impact: owner" in error for error in template_errors):
        raise AssertionError(f"missing template marker was not detected: {template_errors}")

    expect_pass("docs-only", ["README.md"], "")

    expect_fail(
        "runtime-needs-declaration",
        ["content.js"],
        "",
        "requires one checked declaration",
    )

    expect_pass(
        "runtime-no-audit-impact",
        ["content.js"],
        "- [x] `audit-impact: none`\n",
    )

    owner_body = "- [x] `audit-impact: owner`\nP-owner(s): P0-070\n"
    owner_evidence = {"project_docs/AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md": "P0-070 exact generation evidence"}
    expect_pass(
        "runtime-owner-with-test",
        [
            "content.js",
            "project_tools/test_p0_070_generation.js",
            "project_docs/AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md",
        ],
        owner_body,
        owner_evidence,
    )

    expect_fail(
        "runtime-owner-needs-test",
        ["content.js", "project_docs/AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md"],
        owner_body,
        "requires a changed deterministic",
        owner_evidence,
    )

    expect_pass(
        "runtime-owner-external-only",
        ["content.js", "project_docs/AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md"],
        owner_body + "- [x] `test-impact: external-only`\n",
        owner_evidence,
    )

    expect_fail(
        "audit-file-cannot-declare-none",
        ["project_docs/AUDIT_HISTORY_INDEX.md"],
        "- [x] `audit-impact: none`\n",
        "inconsistent",
        {"project_docs/AUDIT_HISTORY_INDEX.md": "P1-001 correction"},
    )

    expect_fail(
        "registry-needs-second-evidence",
        ["project_docs/AUDIT_REGISTRY.md"],
        "- [x] `audit-impact: owner`\nP1-225\n",
        "requires a second durable",
        {"project_docs/AUDIT_REGISTRY.md": "P1-225"},
    )

    expect_pass(
        "registry-with-family-evidence",
        ["project_docs/AUDIT_REGISTRY.md", "project_docs/AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md"],
        "- [x] `audit-impact: owner`\nP1-225\n",
        {
            "project_docs/AUDIT_REGISTRY.md": "P1-225",
            "project_docs/AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md": "P1-225 pending-save generation",
        },
    )

    expect_fail(
        "manifest-needs-release-truth",
        ["manifest.json"],
        "- [x] `audit-impact: none`\n",
        "requires synchronized release/test truth",
    )

    expect_pass(
        "manifest-with-release-truth",
        ["manifest.json", "project_docs/RELEASE_READINESS.md", "project_docs/TEST_STATUS.md"],
        "- [x] `audit-impact: none`\n",
    )

    print("PR change contract self-test PASS")


if __name__ == "__main__":
    main()
