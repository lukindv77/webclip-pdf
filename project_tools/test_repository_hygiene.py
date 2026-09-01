#!/usr/bin/env python3
"""Deterministic self-test for check_repository_hygiene.py."""

from __future__ import annotations

import pathlib
import tempfile

import check_repository_hygiene as hygiene


INDEX_HEADER = "# Audit family navigation index\n\n"


def make_fixture(root: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path]:
    docs = root / "project_docs"
    workflows = root / ".github" / "workflows"
    docs.mkdir(parents=True)
    workflows.mkdir(parents=True)
    (docs / "AUDIT_DELTA_INDEX.md").write_text(INDEX_HEADER, encoding="utf-8")
    for name in hygiene.PERMANENT_WORKFLOWS:
        (workflows / name).write_text("name: fixture\n", encoding="utf-8")
    return docs, workflows


def assert_error(errors: list[str], needle: str) -> None:
    assert any(needle in error for error in errors), (needle, errors)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        docs, workflows = make_fixture(root)
        assert hygiene.inspect_tree(root) == []

        (docs / "AUDIT_DELTA_ONE.md").write_text("P1-001\n", encoding="utf-8")
        (docs / "AUDIT_DELTA_TWO.md").write_text("P1-003\n", encoding="utf-8")
        assert_error(hygiene.inspect_tree(root), "more than one temporary AUDIT_DELTA")
        (docs / "AUDIT_DELTA_ONE.md").unlink()
        (docs / "AUDIT_DELTA_TWO.md").unlink()

        stage_a = "AUDIT_ALPHA_STAGE2_2026-09-01_EVIDENCE.md"
        (docs / stage_a).write_text("checkpoint\n", encoding="utf-8")
        assert_error(hygiene.inspect_tree(root), "not indexed")
        (docs / "AUDIT_DELTA_INDEX.md").write_text(INDEX_HEADER + f"- `{stage_a}`\n", encoding="utf-8")
        assert hygiene.inspect_tree(root) == []

        stage_b = "AUDIT_BETA_STAGE2_2026-09-01_EVIDENCE.md"
        (docs / stage_b).write_text("checkpoint\n", encoding="utf-8")
        (docs / "AUDIT_DELTA_INDEX.md").write_text(
            INDEX_HEADER + f"- `{stage_a}`\n- `{stage_b}`\n", encoding="utf-8"
        )
        assert_error(hygiene.inspect_tree(root), "more than one active staged evidence family")
        (docs / stage_a).unlink()
        (docs / stage_b).unlink()

        legacy = "AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md"
        assert legacy in hygiene.LEGACY_STAGED_FILES
        (docs / legacy).write_text("legacy checkpoint\n", encoding="utf-8")
        (docs / "AUDIT_DELTA_INDEX.md").write_text(INDEX_HEADER + f"- `{legacy}`\n", encoding="utf-8")
        assert hygiene.inspect_tree(root) == []

        legacy_extension = "AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE4_2026-09-02_EVIDENCE.md"
        (docs / legacy_extension).write_text("new checkpoint\n", encoding="utf-8")
        (docs / "AUDIT_DELTA_INDEX.md").write_text(
            INDEX_HEADER + f"- `{legacy}`\n- `{legacy_extension}`\n", encoding="utf-8"
        )
        assert_error(hygiene.inspect_tree(root), "frozen legacy staged family gained a new checkpoint")
        (docs / legacy).unlink()
        (docs / legacy_extension).unlink()
        (docs / "AUDIT_DELTA_INDEX.md").write_text(INDEX_HEADER, encoding="utf-8")

        (workflows / "temporary-browser-evidence.yml").write_text("name: temp\n", encoding="utf-8")
        assert_error(hygiene.inspect_tree(root), "temporary/unapproved workflow")
        (workflows / "temporary-browser-evidence.yml").unlink()

        (workflows / "release-gate.yml").unlink()
        assert_error(hygiene.inspect_tree(root), "required permanent workflow missing")

    print("Repository hygiene self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
