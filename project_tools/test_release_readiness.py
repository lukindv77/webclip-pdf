#!/usr/bin/env python3
"""Deterministic self-test for check_release_readiness.py."""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "project_tools"))

import check_release_readiness as rr  # noqa: E402


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=True, stdout=subprocess.PIPE, text=True
    ).stdout.strip()


def main() -> int:
    values, errors = rr.parse_readiness()
    assert not errors, errors

    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = str(manifest["version"])
    head = git("rev-parse", "HEAD")
    assert not git("status", "--porcelain"), "self-test requires clean CI checkout"

    errors, blockers = rr.collect_blockers(values, head, version)
    assert not errors, errors
    assert blockers, "current WIP readiness must remain NOT READY"
    assert any("unpacked_chrome_qa" in b for b in blockers)
    assert any("yandex_e2e" in b for b in blockers)
    assert any("explicit_release_decision" in b for b in blockers)

    ready = dict(values)
    ready["target_version"] = version
    ready["unpacked_chrome_qa"] = "pass"
    ready["unpacked_chrome_evidence"] = "fixture:chrome"
    ready["yandex_e2e"] = "pass"
    ready["yandex_e2e_evidence"] = "fixture:yandex"
    ready["release_blockers_review"] = "pass"
    ready["release_blockers_evidence"] = "fixture:blockers"
    ready["explicit_release_decision"] = "approved"
    ready["release_decision_evidence"] = "fixture:decision"

    errors, blockers = rr.collect_blockers(ready, head, version)
    assert not errors, errors
    assert not blockers, blockers

    errors, blockers = rr.collect_blockers(ready, head, "99.99.99")
    assert not errors, errors
    assert any("expected version" in b for b in blockers), blockers

    print("Release readiness self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
