#!/usr/bin/env python3
"""Deterministic self-test for the Git-first offline recovery builder."""

from __future__ import annotations

import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def run(*args: str, cwd: pathlib.Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args), cwd=cwd, check=check, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_clean_build(clone: pathlib.Path) -> None:
    expected_commit = run("git", "rev-parse", "HEAD", cwd=clone).stdout.strip().lower()
    manifest = json.loads((clone / "manifest.json").read_text(encoding="utf-8"))
    version = str(manifest["version"])

    built = run("python", "project_tools/build_recovery_archive.py", cwd=clone)
    output = pathlib.Path(built.stdout.strip())
    if not output.is_absolute():
        output = clone / output
    if not output.is_file():
        raise AssertionError(f"builder did not create expected archive: {output}")

    expected_name = f"WebClip_Project_Recovery_v{version.replace('.', '_')}.zip"
    if output.name != expected_name:
        raise AssertionError(f"unexpected archive name: {output.name}")

    with zipfile.ZipFile(output, "r") as zf:
        metadata = json.loads(zf.read("BUILD_METADATA.json"))
        assert metadata["canonical_source"] == "git-commit"
        assert metadata["source_commit"] == expected_commit
        assert metadata["artifact_role"] == "offline-disaster-recovery"
        assert metadata["source_tree_required_clean"] is True
        assert str(metadata["version"]) == version

        required = {
            "RECOVERY_README.md",
            "BUILD_METADATA.json",
            "FILE_HASHES.sha256",
            "source/manifest.json",
            "source/service-worker.js",
            "source/content.js",
            "source/project_tools/build_recovery_archive.py",
            "project_docs/RESEARCH_REGISTRY.md",
            "project_docs/BUILD_AND_RECOVERY_RULES.md",
            "project_docs/RESTORE_PROMPT.md",
        }
        names = set(zf.namelist())
        missing = sorted(required - names)
        if missing:
            raise AssertionError("recovery archive missing required files: " + ", ".join(missing))

        hash_lines = zf.read("FILE_HASHES.sha256").decode("utf-8").splitlines()
        if not hash_lines:
            raise AssertionError("FILE_HASHES.sha256 is empty")
        for line in hash_lines:
            digest, member = line.split("  ", 1)
            if member not in names:
                raise AssertionError(f"hash manifest references absent member: {member}")
            actual = sha256_bytes(zf.read(member))
            if actual != digest:
                raise AssertionError(f"hash mismatch for {member}: {actual} != {digest}")

        bad = zf.testzip()
        if bad:
            raise AssertionError(f"CRC failure in recovery archive: {bad}")

    status = run("git", "status", "--porcelain", "--untracked-files=normal", cwd=clone).stdout.strip()
    if status:
        raise AssertionError(f"recovery build dirtied clean checkout:\n{status}")


def assert_dirty_refusal(clone: pathlib.Path) -> None:
    marker = clone / "README.md"
    original = marker.read_text(encoding="utf-8")
    marker.write_text(original + "\n<!-- recovery-dirty-tree-self-test -->\n", encoding="utf-8")
    try:
        result = run("python", "project_tools/build_recovery_archive.py", cwd=clone, check=False)
        if result.returncode == 0:
            raise AssertionError("recovery builder accepted a dirty Git tree")
        combined = (result.stdout + "\n" + result.stderr).lower()
        if "dirty git tree" not in combined:
            raise AssertionError("dirty-tree refusal did not expose expected diagnostic")
    finally:
        marker.write_text(original, encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="webclip-recovery-test-") as tmp:
        base = pathlib.Path(tmp)
        clone = base / "repo"
        run("git", "clone", "--quiet", "--no-hardlinks", str(ROOT), str(clone), cwd=base)
        assert_clean_build(clone)
        assert_dirty_refusal(clone)
        shutil.rmtree(clone / "project_recovery", ignore_errors=True)
    print("Recovery archive self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
