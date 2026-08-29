#!/usr/bin/env python3
"""Fail-fast consistency checks for the WebClip Git working tree.

The checker is intentionally network-free. It validates repository organization,
audit-number ownership and recovery/release documentation without interpreting
runtime implementation correctness.
"""

from __future__ import annotations

import json
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "project_docs"

CANONICAL_REGISTRY = DOCS / "AUDIT_REGISTRY.md"
DELTA_INDEX = DOCS / "AUDIT_DELTA_INDEX.md"
CONTROL_DOCS = [
    ROOT / "GITHUB_REPOSITORY_STATE.md",
    DOCS / "README_INDEX.md",
    DOCS / "RESTORE_PROMPT.md",
    DOCS / "BUILD_AND_RECOVERY_RULES.md",
    DOCS / "GITHUB_WORKFLOW.md",
    DOCS / "TEST_STATUS.md",
]

FORBIDDEN_CURRENT_PATHS = {
    ROOT / "DEEP_AUDIT_2026-08-25.md",
    ROOT / "QA_STATUS_0_9_9.md",
    ROOT / "PROJECT_RECOVERY.md",
    DOCS / "AUDIT_CONSOLIDATION_INDEX.md",
}
FORBIDDEN_TRACKED_SUFFIXES = {".zip", ".crx", ".pem", ".p12", ".pfx", ".key"}
FORBIDDEN_TRACKED_NAMES = {".env", "id_rsa", "id_ed25519"}

P_CODE = re.compile(r"\bP([012])-(\d{3})\b")
REGISTRY_ROW = re.compile(r"^\|\s*(P[012]-\d{3})\s*\|", re.MULTILINE)
INDEX_DELTA_ROW = re.compile(r"^-\s+`(AUDIT_DELTA_[A-Z0-9_\-]+\.md)`\s*$", re.MULTILINE)
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


@dataclass
class CheckResult:
    errors: list[str]
    warnings: list[str]

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def git_ls_files() -> list[str]:
    proc = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, check=True, stdout=subprocess.PIPE)
    return [p.decode("utf-8") for p in proc.stdout.split(b"\0") if p]


def check_required_structure(result: CheckResult) -> None:
    required = [
        CANONICAL_REGISTRY,
        DELTA_INDEX,
        DOCS / "AUDIT_EVIDENCE.md",
        DOCS / "AUDIT_HISTORY_INDEX.md",
        DOCS / "AUDIT_RETIRED_DELTA_EVIDENCE.md",
        DOCS / "AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md",
        DOCS / "AUDIT_FAMILY_URLSTATS_EVIDENCE.md",
        DOCS / "TEST_EVIDENCE.md",
        DOCS / "TEST_STATUS.md",
        DOCS / "BUILD_AND_RECOVERY_RULES.md",
        DOCS / "RESTORE_PROMPT.md",
        ROOT / "GITHUB_REPOSITORY_STATE.md",
        ROOT / "manifest.json",
    ]
    for path in required:
        if not path.is_file():
            result.error(f"required file missing: {path.relative_to(ROOT)}")

    for path in FORBIDDEN_CURRENT_PATHS:
        if path.exists():
            result.error(f"retired competing source returned to current tree: {path.relative_to(ROOT)}")

    if CANONICAL_REGISTRY.is_file() and "single current authority" not in read(CANONICAL_REGISTRY):
        result.error("AUDIT_REGISTRY.md no longer declares single current authority")

    compatibility = DOCS / "PRIORITIES_P0_P1_P2.md"
    if compatibility.is_file():
        text = read(compatibility)
        if "AUDIT_REGISTRY.md" not in text:
            result.error("legacy PRIORITIES compatibility file does not redirect to AUDIT_REGISTRY.md")
        if len(text.splitlines()) > 80:
            result.error("legacy PRIORITIES file has grown back into a competing registry")


def check_registry_numbering(result: CheckResult) -> None:
    if not CANONICAL_REGISTRY.is_file():
        return
    text = read(CANONICAL_REGISTRY)
    rows = REGISTRY_ROW.findall(text)
    seen: dict[str, int] = {}
    for code in rows:
        seen[code] = seen.get(code, 0) + 1
    duplicates = sorted(code for code, count in seen.items() if count > 1)
    if duplicates:
        result.error("duplicate canonical registry rows: " + ", ".join(duplicates))

    mandatory = {"P0-079", "P0-080"}
    mandatory.update(f"P1-{n:03d}" for n in range(195, 226))
    missing = sorted(mandatory - set(rows))
    if missing:
        result.error("mandatory late/reserved owners missing from registry rows: " + ", ".join(missing))

    if "P1-072…P1-131" not in text and "P1-072...P1-131" not in text:
        result.error("history-reserved P1-072…P1-131 range is no longer documented")
    if "P2-009" not in text or "P2-010" not in text:
        result.error("history-reserved P2-009/P2-010 are no longer documented")


def check_delta_index(result: CheckResult) -> None:
    if not DELTA_INDEX.is_file():
        return
    index_text = read(DELTA_INDEX)
    indexed = set(INDEX_DELTA_ROW.findall(index_text))
    actual = {p.name for p in DOCS.glob("AUDIT_DELTA_*.md") if p.name != "AUDIT_DELTA_INDEX.md"}

    missing_from_index = sorted(actual - indexed)
    missing_from_tree = sorted(indexed - actual)
    if missing_from_index:
        result.error("current audit deltas missing from AUDIT_DELTA_INDEX.md: " + ", ".join(missing_from_index))
    if missing_from_tree:
        result.error("AUDIT_DELTA_INDEX.md references non-current delta files: " + ", ".join(missing_from_tree))

    for name in sorted(actual):
        if not P_CODE.search(read(DOCS / name)):
            result.error(f"audit delta has no P-code owner/reference: project_docs/{name}")


def check_tracked_artifacts(result: CheckResult) -> None:
    try:
        tracked = git_ls_files()
    except (OSError, subprocess.CalledProcessError) as exc:
        result.error(f"cannot enumerate tracked files with git: {exc}")
        return

    for rel in tracked:
        path = pathlib.PurePosixPath(rel)
        suffix = path.suffix.lower()
        name = path.name.lower()
        if suffix in FORBIDDEN_TRACKED_SUFFIXES or name in FORBIDDEN_TRACKED_NAMES:
            result.error(f"forbidden binary/secret-like artifact is tracked: {rel}")
        if name.endswith(".zip.b64") or ("handoff" in name and name.endswith(".b64")):
            result.error(f"embedded base64 archive is tracked: {rel}")


def check_release_truth(result: CheckResult) -> None:
    manifest_path = ROOT / "manifest.json"
    if not manifest_path.is_file():
        return
    try:
        manifest = json.loads(read(manifest_path))
    except Exception as exc:
        result.error(f"manifest.json is not valid JSON: {exc}")
        return

    version = str(manifest.get("version", "")).strip()
    if not version:
        result.error("manifest.json has no version")
        return

    state = read(ROOT / "GITHUB_REPOSITORY_STATE.md") if (ROOT / "GITHUB_REPOSITORY_STATE.md").is_file() else ""
    test_status = read(DOCS / "TEST_STATUS.md") if (DOCS / "TEST_STATUS.md").is_file() else ""
    if version not in state:
        result.error(f"GITHUB_REPOSITORY_STATE.md does not mention manifest version {version}")
    if version not in test_status:
        result.error(f"TEST_STATUS.md does not mention manifest version {version}")
    if "88/88" in test_status and "histor" not in test_status.lower():
        result.error("TEST_STATUS.md mentions 88/88 without clearly classifying it as historical evidence")


def check_control_doc_links(result: CheckResult) -> None:
    for doc in CONTROL_DOCS:
        if not doc.is_file():
            continue
        text = read(doc)
        for raw_target in MARKDOWN_LINK.findall(text):
            target = raw_target.strip().split()[0].strip("<>\"")
            if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            target = target.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            resolved = (doc.parent / target).resolve()
            try:
                resolved.relative_to(ROOT.resolve())
            except ValueError:
                result.warn(f"external/parent relative markdown link not checked: {doc.relative_to(ROOT)} -> {raw_target}")
                continue
            if not resolved.exists():
                result.error(f"broken local markdown link: {doc.relative_to(ROOT)} -> {raw_target}")


def check_canonical_references(result: CheckResult) -> None:
    required_refs = {
        ROOT / "GITHUB_REPOSITORY_STATE.md": ["project_docs/AUDIT_REGISTRY.md", "project_docs/TEST_STATUS.md"],
        DOCS / "RESTORE_PROMPT.md": ["AUDIT_REGISTRY.md", "TEST_STATUS.md"],
        DOCS / "README_INDEX.md": ["AUDIT_REGISTRY.md", "BUILD_AND_RECOVERY_RULES.md"],
    }
    for path, refs in required_refs.items():
        if not path.is_file():
            continue
        text = read(path)
        for ref in refs:
            if ref not in text:
                result.error(f"canonical control reference missing: {path.relative_to(ROOT)} -> {ref}")


def main() -> int:
    result = CheckResult(errors=[], warnings=[])
    check_required_structure(result)
    check_registry_numbering(result)
    check_delta_index(result)
    check_tracked_artifacts(result)
    check_release_truth(result)
    check_control_doc_links(result)
    check_canonical_references(result)

    for warning in result.warnings:
        print(f"WARNING: {warning}")
    for error in result.errors:
        print(f"ERROR: {error}", file=sys.stderr)

    if result.errors:
        print(f"Repository consistency FAILED: {len(result.errors)} error(s), {len(result.warnings)} warning(s).", file=sys.stderr)
        return 1

    print(f"Repository consistency PASS: 0 errors, {len(result.warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
