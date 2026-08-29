#!/usr/bin/env python3
"""Validate WebClip bootstrap/handoff context without creating a second source of truth."""

from __future__ import annotations

import json
import pathlib
import sys
from collections.abc import Mapping

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "project_docs"
MANIFEST = DOCS / "CONTEXT_MANIFEST.json"
RESTORE = DOCS / "RESTORE_PROMPT.md"
WORKFLOW = DOCS / "GITHUB_WORKFLOW.md"

EXPECTED_SCHEMA = "WEBCLIP_CONTEXT_MANIFEST_V1"
EXPECTED_TRIGGER = "Подготовь переход в новый чат"
EXPECTED_AUTHORITIES = {
    "audit_status": "project_docs/AUDIT_REGISTRY.md",
    "audit_navigation": "project_docs/AUDIT_DELTA_INDEX.md",
    "test_status": "project_docs/TEST_STATUS.md",
    "release_readiness": "project_docs/RELEASE_READINESS.md",
}
FORBIDDEN_CURRENT_RESTORE_MARKERS = (
    "читать `project_docs/AUDIT_DELTA_*.md`",
    "read `project_docs/AUDIT_DELTA_*.md`",
    "AUDIT_CONSOLIDATION_INDEX.md",
    "DOCUMENTATION_CONSISTENCY_AUDIT.md",
    "PROJECT_RECOVERY.md",
    "QA_STATUS_0_9_9.md",
)


def read_text(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def load_manifest(path: pathlib.Path = MANIFEST) -> dict:
    return json.loads(read_text(path))


def iter_declared_paths(value):
    if isinstance(value, str):
        if value.startswith(("project_docs/", ".github/", "project_tools/")) or value in {
            "GITHUB_REPOSITORY_STATE.md",
            "README.md",
            "manifest.json",
        }:
            yield value
    elif isinstance(value, Mapping):
        for item in value.values():
            yield from iter_declared_paths(item)
    elif isinstance(value, list):
        for item in value:
            yield from iter_declared_paths(item)


def validate_manifest(data: Mapping, root: pathlib.Path = ROOT) -> list[str]:
    errors: list[str] = []
    if data.get("schema") != EXPECTED_SCHEMA:
        errors.append(f"context manifest schema must be {EXPECTED_SCHEMA}")
    if data.get("repository") != "lukindv77/webclip-pdf":
        errors.append("context manifest repository identity drifted")
    if data.get("canonical_branch") != "main" or data.get("fresh_main_required") is not True:
        errors.append("context manifest must require fresh canonical main")

    authorities = data.get("authorities") or {}
    if authorities.get("source") != "fresh_main_head":
        errors.append("source authority must remain fresh_main_head")
    for key, expected in EXPECTED_AUTHORITIES.items():
        if authorities.get(key) != expected:
            errors.append(f"authority {key} must remain {expected}")

    handoff = data.get("handoff") or {}
    if handoff.get("trigger_phrase") != EXPECTED_TRIGGER:
        errors.append("handoff trigger phrase changed")
    if handoff.get("always_allowed_with_unfinished_work") is not True:
        errors.append("handoff must remain allowed with unfinished work")
    if handoff.get("never_infer_completion") is not True or handoff.get("never_auto_close_p_owner") is not True:
        errors.append("handoff must never infer completion or auto-close a P-owner")

    seen: set[str] = set()
    for rel in iter_declared_paths(data):
        if "*" in rel:
            continue
        if rel in seen:
            continue
        seen.add(rel)
        if not (root / rel).is_file():
            errors.append(f"declared context path missing: {rel}")

    return errors


def validate_restore_and_policy(restore_text: str, workflow_text: str) -> list[str]:
    errors: list[str] = []
    for marker in (
        "CONTEXT_MANIFEST.json",
        "AUDIT_REGISTRY.md",
        "AUDIT_DELTA_INDEX.md",
        "AUDIT_FAMILY_*_EVIDENCE.md",
        EXPECTED_TRIGGER,
    ):
        if marker not in restore_text:
            errors.append(f"RESTORE_PROMPT.md missing context marker: {marker}")

    for forbidden in FORBIDDEN_CURRENT_RESTORE_MARKERS:
        if forbidden.lower() in restore_text.lower():
            errors.append(f"RESTORE_PROMPT.md contains retired/currently-invalid instruction: {forbidden}")

    for marker in (
        EXPECTED_TRIGGER,
        "open Pull Request",
        "open Issue",
        "не закрывать P-owner",
        "CONTEXT_MANIFEST.json",
    ):
        if marker not in workflow_text:
            errors.append(f"GITHUB_WORKFLOW.md missing permanent handoff marker: {marker}")
    return errors


def validate_current_tree() -> list[str]:
    errors: list[str] = []
    for path in (MANIFEST, RESTORE, WORKFLOW):
        if not path.is_file():
            errors.append(f"required context file missing: {path.relative_to(ROOT)}")
    if errors:
        return errors

    try:
        data = load_manifest()
    except Exception as exc:
        return [f"cannot parse CONTEXT_MANIFEST.json: {exc}"]

    errors.extend(validate_manifest(data))
    errors.extend(validate_restore_and_policy(read_text(RESTORE), read_text(WORKFLOW)))
    return errors


def main() -> int:
    errors = validate_current_tree()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Context contract FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 1
    print("Context contract PASS: canonical bootstrap, handoff trigger and authority paths are coherent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
