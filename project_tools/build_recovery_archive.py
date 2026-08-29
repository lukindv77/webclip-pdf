#!/usr/bin/env python3
"""Build a standalone WebClip offline recovery artifact.

The Git commit is the canonical source identity. This archive is an optional
offline/disaster-recovery representation of one clean commit and is not meant
to be nested inside the user-facing extension ZIP.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess
import sys
import zipfile
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "manifest.json"
DOCS_DIR = ROOT / "project_docs"
RECOVERY_DIR = ROOT / "project_recovery"

REQUIRED_DOCS = [
    "README_INDEX.md",
    "PROJECT_OVERVIEW.md",
    "USER_REQUIREMENTS.md",
    "ARCHITECTURE.md",
    "DECISIONS_AND_RATIONALE.md",
    "CHANGELOG_AND_RATIONALE.md",
    "AUDIT_REGISTRY.md",
    "AUDIT_DELTA_INDEX.md",
    "AUDIT_HISTORY_INDEX.md",
    "AUDIT_CHANGE_WORKFLOW.md",
    "TEST_STATUS.md",
    "RELEASE_READINESS.md",
    "RELEASE_HISTORY_INDEX.md",
    "DATA_MODELS.md",
    "ASSISTANT_NOTES_AND_LIMITATIONS.md",
    "TEST_PLAN.md",
    "BUILD_AND_RECOVERY_RULES.md",
    "GITHUB_WORKFLOW.md",
    "RESTORE_PROMPT.md",
]

EXCLUDED_TOP_SUFFIXES = {".zip", ".crx", ".pem"}
EXCLUDED_TOP_NAMES = {".DS_Store"}


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_version() -> tuple[str, dict]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    version = str(manifest.get("version", "")).strip()
    if not version:
        raise RuntimeError("manifest.json does not contain a version")
    return version, manifest


def run_git(*args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return proc.stdout.strip()


def resolve_source_identity() -> tuple[str, list[str]]:
    try:
        commit = run_git("rev-parse", "HEAD")
        status = run_git("status", "--porcelain", "--untracked-files=normal")
    except (OSError, subprocess.CalledProcessError) as exc:
        raise RuntimeError(
            "Official recovery artifact requires a Git checkout so exact source "
            "commit identity can be proven."
        ) from exc

    if len(commit) != 40 or any(ch not in "0123456789abcdefABCDEF" for ch in commit):
        raise RuntimeError(f"Unexpected Git commit identity: {commit!r}")
    if status:
        raise RuntimeError(
            "Refusing to build an official recovery artifact from a dirty Git tree. "
            "Commit/stash/remove all changes first."
        )

    tags = [line.strip() for line in run_git("tag", "--points-at", "HEAD").splitlines() if line.strip()]
    return commit.lower(), tags


def validate_docs() -> None:
    missing = [name for name in REQUIRED_DOCS if not (DOCS_DIR / name).is_file()]
    if missing:
        raise RuntimeError(f"Missing required recovery docs: {', '.join(missing)}")


def collect_source_files() -> list[pathlib.Path]:
    files: list[pathlib.Path] = []

    for path in ROOT.iterdir():
        if not path.is_file():
            continue
        if path.name in EXCLUDED_TOP_NAMES or path.suffix.lower() in EXCLUDED_TOP_SUFFIXES:
            continue
        files.append(path)

    tools = ROOT / "project_tools"
    if tools.is_dir():
        files.extend(p for p in tools.rglob("*") if p.is_file() and "__pycache__" not in p.parts)

    return sorted(set(files), key=lambda p: p.as_posix().lower())


def collect_doc_files() -> list[pathlib.Path]:
    return sorted((p for p in DOCS_DIR.rglob("*") if p.is_file()), key=lambda p: p.as_posix().lower())


def write_recovery_readme(path: pathlib.Path, version: str, source_commit: str, source_tags: list[str]) -> None:
    tags_text = ", ".join(source_tags) if source_tags else "none"
    path.write_text(
        "# WebClip offline recovery artifact\n\n"
        f"Runtime version: `{version}`\n\n"
        f"Canonical source commit: `{source_commit}`\n\n"
        f"Tags pointing at source commit when built: `{tags_text}`\n\n"
        "This ZIP is a derived offline/disaster-recovery copy of the exact clean Git commit above. "
        "The Git commit remains the canonical source identity. Do not treat this ZIP as a parallel "
        "mutable source of truth.\n",
        encoding="utf-8",
    )


def build() -> pathlib.Path:
    version, manifest = load_version()
    source_commit, source_tags = resolve_source_identity()
    validate_docs()

    RECOVERY_DIR.mkdir(parents=True, exist_ok=True)
    version_slug = version.replace(".", "_")
    out = RECOVERY_DIR / f"WebClip_Project_Recovery_v{version_slug}.zip"
    temp_readme = RECOVERY_DIR / "RECOVERY_README.md"
    write_recovery_readme(temp_readme, version, source_commit, source_tags)

    source_files = collect_source_files()
    doc_files = collect_doc_files()
    all_files = source_files + doc_files + [temp_readme]

    file_manifest: list[dict[str, str | int]] = []
    for path in all_files:
        if path == temp_readme:
            archive_name = "RECOVERY_README.md"
        else:
            archive_name = path.relative_to(ROOT).as_posix()
        file_manifest.append(
            {
                "path": archive_name,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )

    metadata = {
        "schema": 2,
        "artifact_role": "offline-disaster-recovery",
        "canonical_source": "git-commit",
        "runtime_version": version,
        "manifest_version": manifest.get("version"),
        "source_commit": source_commit,
        "source_tags": source_tags,
        "source_tree_requirement": "clean",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "files": file_manifest,
    }

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in all_files:
            if path == temp_readme:
                archive_name = "RECOVERY_README.md"
            else:
                archive_name = path.relative_to(ROOT).as_posix()
            zf.write(path, archive_name)
        zf.writestr("RECOVERY_METADATA.json", json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")

    temp_readme.unlink(missing_ok=True)
    print(out)
    return out


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print(f"Recovery build failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
