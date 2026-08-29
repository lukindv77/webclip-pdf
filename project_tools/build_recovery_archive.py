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


def build() -> pathlib.Path:
    version, manifest = load_version()
    validate_docs()
    source_commit, source_tags = resolve_source_identity()
    RECOVERY_DIR.mkdir(parents=True, exist_ok=True)

    for old in RECOVERY_DIR.glob("WebClip_Project_Recovery_v*.zip"):
        old.unlink()

    output = RECOVERY_DIR / f"WebClip_Project_Recovery_v{version.replace('.', '_')}.zip"
    source_files = collect_source_files()
    doc_files = collect_doc_files()

    created_at = datetime.now(timezone.utc).isoformat()
    metadata = {
        "project": manifest.get("name", "WebClip PDF Prototype"),
        "version": version,
        "manifest_version": manifest.get("manifest_version"),
        "created_at_utc": created_at,
        "recovery_schema": 2,
        "artifact_role": "offline-disaster-recovery",
        "canonical_source": "git-commit",
        "source_commit": source_commit,
        "source_tags": source_tags,
        "source_tree_required_clean": True,
        "source_file_count": len(source_files),
        "doc_file_count": len(doc_files),
        "rule": (
            "The archive is a derived offline copy of source_commit. "
            "It is not a parallel source of truth and is not required inside "
            "the user-facing extension ZIP."
        ),
    }

    recovery_readme = f"""# WebClip Project Recovery {version}\n\nThis is a standalone offline/disaster-recovery artifact for WebClip PDF Prototype {version}.\n\nCanonical source identity: Git commit `{source_commit}`.\nTags pointing at that commit when the artifact was built: {", ".join(source_tags) if source_tags else "(none)"}.\n\n## Start here\n\n1. Read `BUILD_METADATA.json` and note `source_commit`.\n2. Verify `FILE_HASHES.sha256`.\n3. Read `project_docs/RESTORE_PROMPT.md` and `project_docs/README_INDEX.md`.\n4. If GitHub is available, restore/compare the exact Git commit first; that Git tree is canonical.\n5. If GitHub is unavailable, `source/` is the offline representation of that exact commit.\n6. After Git access returns, compare the offline tree/hashes and return to repository history.\n\nThis archive is not intended to be nested inside the user-facing extension ZIP.\nCreate a newer official recovery artifact only from a clean exact Git commit.\n"""

    hashes: list[str] = []

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr("RECOVERY_README.md", recovery_readme)
        zf.writestr("BUILD_METADATA.json", json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")

        for path in doc_files:
            rel = path.relative_to(DOCS_DIR)
            arc = pathlib.PurePosixPath("project_docs") / pathlib.PurePosixPath(rel.as_posix())
            zf.write(path, arc.as_posix())
            hashes.append(f"{sha256(path)}  {arc.as_posix()}")

        for path in source_files:
            rel = path.relative_to(ROOT)
            arc = pathlib.PurePosixPath("source") / pathlib.PurePosixPath(rel.as_posix())
            zf.write(path, arc.as_posix())
            hashes.append(f"{sha256(path)}  {arc.as_posix()}")

        zf.writestr("FILE_HASHES.sha256", "\n".join(hashes) + "\n")

    with zipfile.ZipFile(output, "r") as zf:
        names = set(zf.namelist())
        required = {
            "RECOVERY_README.md",
            "BUILD_METADATA.json",
            "FILE_HASHES.sha256",
            "source/manifest.json",
            "source/service-worker.js",
            "source/content.js",
            "source/project_tools/build_recovery_archive.py",
        }
        required.update(f"project_docs/{name}" for name in REQUIRED_DOCS)
        missing = sorted(required - names)
        if missing:
            raise RuntimeError("Recovery archive self-check failed; missing: " + ", ".join(missing))
        bad = zf.testzip()
        if bad:
            raise RuntimeError(f"Recovery archive CRC check failed at {bad}")

    print(output)
    return output


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
