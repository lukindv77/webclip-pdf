#!/usr/bin/env python3
"""Validate WebClip release-readiness metadata without publishing anything.

`status` validates the schema and reports blockers but exits 0 for a well-formed
NOT READY repository. `gate` exits non-zero until every release condition is
satisfied for the exact checkout commit/version supplied by the caller.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
READINESS = ROOT / "project_docs" / "RELEASE_READINESS.md"
MANIFEST = ROOT / "manifest.json"
START = "<!-- WEBCLIP_RELEASE_READINESS_V1"
END = "-->"

REQUIRED = {
    "target_version",
    "unpacked_chrome_qa",
    "unpacked_chrome_evidence",
    "yandex_e2e",
    "yandex_e2e_evidence",
    "release_blockers_review",
    "release_blockers_evidence",
    "explicit_release_decision",
    "release_decision_evidence",
}
STATUS_FIELDS = {
    "unpacked_chrome_qa": {"pending", "pass"},
    "yandex_e2e": {"pending", "pass"},
    "release_blockers_review": {"pending", "pass"},
    "explicit_release_decision": {"pending", "approved"},
}
EVIDENCE_FOR = {
    "unpacked_chrome_qa": "unpacked_chrome_evidence",
    "yandex_e2e": "yandex_e2e_evidence",
    "release_blockers_review": "release_blockers_evidence",
    "explicit_release_decision": "release_decision_evidence",
}
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+(?:\.\d+)?$")
EMPTY_EVIDENCE = {"", "none", "pending", "n/a", "na", "unknown"}


def run_git(*args: str) -> str:
    proc = subprocess.run(
        ["git", *args], cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    return proc.stdout.strip()


def parse_readiness() -> tuple[dict[str, str], list[str]]:
    errors: list[str] = []
    if not READINESS.is_file():
        return {}, ["project_docs/RELEASE_READINESS.md is missing"]
    text = READINESS.read_text(encoding="utf-8")
    start = text.find(START)
    if start < 0:
        return {}, ["release readiness machine block start marker is missing"]
    end = text.find(END, start)
    if end < 0:
        return {}, ["release readiness machine block end marker is missing"]
    payload = text[start + len(START):end]
    values: dict[str, str] = {}
    for raw in payload.splitlines():
        line = raw.strip()
        if not line:
            continue
        if "=" not in line:
            errors.append(f"invalid readiness line without '=': {line}")
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or key in values:
            errors.append(f"duplicate/empty readiness key: {key!r}")
            continue
        values[key] = value

    missing = sorted(REQUIRED - set(values))
    extra = sorted(set(values) - REQUIRED)
    if missing:
        errors.append("missing readiness keys: " + ", ".join(missing))
    if extra:
        errors.append("unknown readiness keys: " + ", ".join(extra))

    for field, allowed in STATUS_FIELDS.items():
        if field in values and values[field] not in allowed:
            errors.append(f"{field} must be one of {sorted(allowed)}, got {values[field]!r}")
    version = values.get("target_version", "")
    if version and not VERSION_RE.fullmatch(version):
        errors.append(f"target_version is not a canonical numeric version: {version!r}")
    return values, errors


def manifest_version() -> tuple[str, list[str]]:
    if not MANIFEST.is_file():
        return "", ["manifest.json is missing"]
    try:
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as exc:
        return "", [f"manifest.json is invalid JSON: {exc}"]
    version = str(data.get("version", "")).strip()
    if not version:
        return "", ["manifest.json has no version"]
    return version, []


def collect_blockers(values: dict[str, str], expected_sha: str | None, expected_version: str | None) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    blockers: list[str] = []
    version, manifest_errors = manifest_version()
    errors.extend(manifest_errors)

    try:
        head = run_git("rev-parse", "HEAD")
        dirty = run_git("status", "--porcelain")
    except (OSError, subprocess.CalledProcessError) as exc:
        return [f"cannot inspect Git checkout: {exc}"], blockers

    if dirty:
        blockers.append("working tree is not clean")
    if expected_sha:
        try:
            resolved = run_git("rev-parse", expected_sha)
        except subprocess.CalledProcessError:
            errors.append(f"expected candidate SHA/ref cannot be resolved: {expected_sha}")
        else:
            if resolved != head:
                blockers.append(f"checkout HEAD {head} != expected candidate {resolved}")
    if expected_version and version and expected_version != version:
        blockers.append(f"manifest version {version} != expected version {expected_version}")
    target = values.get("target_version", "")
    if target and version and target != version:
        blockers.append(f"target_version {target} != manifest version {version}")
    if expected_version and target and expected_version != target:
        blockers.append(f"target_version {target} != expected version {expected_version}")

    for field, evidence_field in EVIDENCE_FOR.items():
        required_terminal = "approved" if field == "explicit_release_decision" else "pass"
        actual = values.get(field, "")
        if actual != required_terminal:
            blockers.append(f"{field}={actual or '<missing>'}; requires {required_terminal}")
            continue
        evidence = values.get(evidence_field, "").strip()
        if evidence.lower() in EMPTY_EVIDENCE:
            blockers.append(f"{evidence_field} is missing for {field}={required_terminal}")

    return errors, blockers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("status", "gate"))
    parser.add_argument("--expected-sha")
    parser.add_argument("--expected-version")
    args = parser.parse_args()

    values, errors = parse_readiness()
    if not errors:
        more_errors, blockers = collect_blockers(values, args.expected_sha, args.expected_version)
        errors.extend(more_errors)
    else:
        blockers = []

    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        print(f"Release readiness schema/check FAILED: {len(errors)} error(s).", file=sys.stderr)
        return 2

    for blocker in blockers:
        print(f"BLOCKER: {blocker}")

    if blockers:
        print(f"Release readiness NOT READY: {len(blockers)} blocker(s).")
        return 1 if args.mode == "gate" else 0

    print("Release readiness READY for the exact checkout candidate.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
