#!/usr/bin/env python3
"""Deterministic self-test for check_context_contract.py."""

from __future__ import annotations

import copy
import importlib.util
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHECKER = ROOT / "project_tools" / "check_context_contract.py"

spec = importlib.util.spec_from_file_location("check_context_contract", CHECKER)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def assert_has(errors: list[str], needle: str) -> None:
    if not any(needle in error for error in errors):
        raise AssertionError(f"expected error containing {needle!r}; got {errors!r}")


def main() -> None:
    current = module.validate_current_tree()
    if current:
        raise AssertionError(f"current tree context contract must pass: {current}")

    data = module.load_manifest()

    bad = copy.deepcopy(data)
    bad["authorities"]["research_status"] = "project_docs/PRIORITIES_P0_P1_P2.md"
    assert_has(module.validate_manifest(bad), "authority research_status")

    bad = copy.deepcopy(data)
    bad["handoff"]["trigger_phrase"] = "some other phrase"
    assert_has(module.validate_manifest(bad), "trigger phrase")

    bad = copy.deepcopy(data)
    bad["handoff"]["protocol_document"] = "project_docs/GITHUB_WORKFLOW.md"
    assert_has(module.validate_manifest(bad), "handoff protocol")

    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        bad = copy.deepcopy(data)
        bad["bootstrap"].append("project_docs/DOES_NOT_EXIST.md")
        errors = module.validate_manifest(bad, root=root)
        assert_has(errors, "declared context path missing")

    restore = (ROOT / "project_docs" / "RESTORE_PROMPT.md").read_text(encoding="utf-8")
    policy = (ROOT / "project_docs" / "CONTEXT_AUTOMATION_POLICY.md").read_text(encoding="utf-8")
    errors = module.validate_restore_and_policy(
        restore + "\nчитать `project_docs/RESEARCH_DELTA_*.md`\n",
        policy,
    )
    assert_has(errors, "retired/currently-invalid instruction")

    errors = module.validate_restore_and_policy(restore, policy.replace("14 постоянных правил автоматизации", "rules"))
    assert_has(errors, "permanent policy marker")

    print("Context contract self-test PASS.")


if __name__ == "__main__":
    main()
