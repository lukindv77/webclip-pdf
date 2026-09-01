#!/usr/bin/env python3
"""Fail-closed current-tree hygiene checks for repository growth control.

This checker deliberately validates only invariants that can be proven from the
checked-out Git tree. GitHub-remote invariants (branch count, open PR purpose,
merge settings) remain part of the fresh-start operational review documented in
project_docs/GITHUB_WORKFLOW.md.
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "project_docs"
WORKFLOWS = ROOT / ".github" / "workflows"
DELTA_INDEX = DOCS / "AUDIT_DELTA_INDEX.md"

PERMANENT_WORKFLOWS = {
    "repository-integrity.yml",
    "release-gate.yml",
}

# Frozen staged checkpoints that pre-date the 2026-09-01 steady-state hygiene
# contract. They are historical cleanup debt, not active working series. Their
# exact names are grandfathered only so the new guard can prevent further growth
# without forcing unrelated lossless compaction into this policy PR.
LEGACY_STAGED_FILES = {
    "AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_FOCUS_INTERACTION_STATE_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_FOCUS_INTERACTION_STATE_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE4_2026-08-30_EVIDENCE.md",
    "AUDIT_RESPONSIVE_IMAGE_CAPTURE_IDENTITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_RESPONSIVE_IMAGE_CAPTURE_IDENTITY_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_TEMPORAL_RENDER_STATE_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_TEMPORAL_RENDER_STATE_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md",
    "AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md",
    "AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md",
}

STAGED_RE = re.compile(
    r"^(?P<family>AUDIT_.+)_STAGE\d+_\d{4}-\d{2}-\d{2}_EVIDENCE\.md$"
)
LEGACY_STAGED_FAMILIES = {
    STAGED_RE.match(name).group("family")
    for name in LEGACY_STAGED_FILES
    if STAGED_RE.match(name)
}


def inspect_tree(root: pathlib.Path) -> list[str]:
    docs = root / "project_docs"
    workflows = root / ".github" / "workflows"
    index = docs / "AUDIT_DELTA_INDEX.md"
    errors: list[str] = []

    if not index.is_file():
        return ["repository hygiene: project_docs/AUDIT_DELTA_INDEX.md is missing"]

    index_text = index.read_text(encoding="utf-8")

    deltas = sorted(
        p.name
        for p in docs.glob("AUDIT_DELTA_*.md")
        if p.name != "AUDIT_DELTA_INDEX.md"
    )
    if len(deltas) > 1:
        errors.append(
            "repository hygiene: more than one temporary AUDIT_DELTA is retained: "
            + ", ".join(deltas)
        )

    active_staged: list[tuple[str, str]] = []
    for path in sorted(docs.glob("AUDIT_*_STAGE*_EVIDENCE.md")):
        match = STAGED_RE.match(path.name)
        if not match:
            errors.append(
                f"repository hygiene: staged evidence path has unsupported naming: project_docs/{path.name}"
            )
            continue

        family = match.group("family")
        if path.name not in index_text:
            errors.append(
                f"repository hygiene: staged checkpoint is not indexed in AUDIT_DELTA_INDEX.md: {path.name}"
            )

        if path.name in LEGACY_STAGED_FILES:
            continue
        if family in LEGACY_STAGED_FAMILIES:
            errors.append(
                f"repository hygiene: frozen legacy staged family gained a new checkpoint: {path.name}"
            )
            continue
        active_staged.append((family, path.name))

    active_families = sorted({family for family, _ in active_staged})
    if len(active_families) > 1:
        errors.append(
            "repository hygiene: more than one active staged evidence family is retained: "
            + ", ".join(active_families)
        )

    actual_workflows = sorted(
        p.name
        for p in workflows.iterdir()
        if p.is_file() and p.suffix.lower() in {".yml", ".yaml"}
    ) if workflows.is_dir() else []
    unexpected = sorted(set(actual_workflows) - PERMANENT_WORKFLOWS)
    missing = sorted(PERMANENT_WORKFLOWS - set(actual_workflows))
    if unexpected:
        errors.append(
            "repository hygiene: temporary/unapproved workflow remains in mergeable current tree: "
            + ", ".join(unexpected)
        )
    if missing:
        errors.append(
            "repository hygiene: required permanent workflow missing: " + ", ".join(missing)
        )

    return errors


def main() -> int:
    errors = inspect_tree(ROOT)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        print(f"Repository hygiene FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 1
    print("Repository hygiene PASS: temporary evidence/workflow growth is bounded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
