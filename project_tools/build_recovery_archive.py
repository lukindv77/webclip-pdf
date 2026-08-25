#!/usr/bin/env python3
"""Build the mandatory WebClip project recovery archive.

Run this AFTER all source/docs changes and BEFORE creating the user-facing build ZIP.
The generated archive intentionally excludes itself to avoid recursion.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
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
    "PRIORITIES_P0_P1_P2.md",
    "DATA_MODELS.md",
    "ASSISTANT_NOTES_AND_LIMITATIONS.md",
    "TEST_PLAN.md",
    "BUILD_AND_RECOVERY_RULES.md",
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


def validate_docs() -> None:
    missing = [name for name in REQUIRED_DOCS if not (DOCS_DIR / name).is_file()]
    if missing:
        raise RuntimeError(f"Missing required recovery docs: {', '.join(missing)}")


def collect_source_files() -> list[pathlib.Path]:
    files: list[pathlib.Path] = []

    # Runtime/top-level project files. Do not include packaged artifacts.
    for path in ROOT.iterdir():
        if not path.is_file():
            continue
        if path.name in EXCLUDED_TOP_NAMES or path.suffix.lower() in EXCLUDED_TOP_SUFFIXES:
            continue
        files.append(path)

    # Build/recovery tooling is part of the restorable project source.
    tools = ROOT / "project_tools"
    if tools.is_dir():
        files.extend(p for p in tools.rglob("*") if p.is_file() and "__pycache__" not in p.parts)

    return sorted(set(files), key=lambda p: p.as_posix().lower())


def collect_doc_files() -> list[pathlib.Path]:
    return sorted((p for p in DOCS_DIR.rglob("*") if p.is_file()), key=lambda p: p.as_posix().lower())


def build() -> pathlib.Path:
    version, manifest = load_version()
    validate_docs()
    RECOVERY_DIR.mkdir(parents=True, exist_ok=True)

    # Only one current recovery archive should remain in the build tree.
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
        "recovery_schema": 1,
        "source_file_count": len(source_files),
        "doc_file_count": len(doc_files),
        "rule": "Every user-facing build must include a recovery archive matching manifest.json version.",
    }

    recovery_readme = f"""# WebClip Project Recovery {version}\n\nThis archive is the self-contained recovery snapshot for WebClip PDF Prototype {version}.\n\n## Start here\n\n1. Read `project_docs/README_INDEX.md`.\n2. Read `project_docs/USER_REQUIREMENTS.md` and `project_docs/PROJECT_OVERVIEW.md`.\n3. Read `project_docs/ARCHITECTURE.md`, `project_docs/CHANGELOG_AND_RATIONALE.md`, and `project_docs/PRIORITIES_P0_P1_P2.md`.\n4. Treat files under `source/` as the source-of-truth code snapshot for version {version}.\n5. Before producing a newer build, follow `project_docs/BUILD_AND_RECOVERY_RULES.md`.\n\nThe archive intentionally does not contain itself. Recreate the next recovery zip with `source/project_tools/build_recovery_archive.py`.\n"""

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

    # Integrity/self-check.
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
