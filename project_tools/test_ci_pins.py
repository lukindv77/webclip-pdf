#!/usr/bin/env python3
"""Deterministic self-test for check_ci_pins.py."""

from __future__ import annotations

import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
MODULE_PATH = HERE / "check_ci_pins.py"
spec = importlib.util.spec_from_file_location("check_ci_pins", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load check_ci_pins.py")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

PIN = "11d5960a326750d5838078e36cf38b85af677262"
GOOD_DEPENDABOT = """version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 1
    groups:
      github-actions:
        patterns:
          - "*"
"""

GOOD_REPOSITORY_INTEGRITY = """name: Repository integrity
permissions:
  contents: read
jobs:
  repository-integrity:
    runs-on: ubuntu-24.04
    steps:
      - name: Checkout exact commit
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          fetch-depth: 0
          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
      - name: Verify exact checkout
        shell: bash
        env:
          EXPECTED_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
        run: |
          set -euo pipefail
          actual="$(git rev-parse HEAD)"
          if [[ "$actual" != "$EXPECTED_SHA" ]]; then
            exit 1
          fi
"""


def expect_pass(name: str, text: str) -> None:
    errors = module.evaluate({".github/workflows/test.yml": text})
    if errors:
        raise AssertionError(f"{name}: expected PASS, got {errors}")


def expect_fail(name: str, text: str, needle: str) -> None:
    errors = module.evaluate({".github/workflows/test.yml": text})
    if not errors:
        raise AssertionError(f"{name}: expected failure")
    if not any(needle in error for error in errors):
        raise AssertionError(f"{name}: expected {needle!r}, got {errors}")


def main() -> None:
    expect_pass(
        "full-sha-read-only",
        f"permissions:\n  contents: read\nruns-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\n",
    )
    expect_fail(
        "mutable-tag",
        "permissions:\n  contents: read\nruns-on: ubuntu-24.04\n- uses: actions/checkout@v4\n",
        "full commit SHA",
    )
    expect_fail(
        "mutable-runner",
        f"permissions:\n  contents: read\nruns-on: ubuntu-latest\n- uses: actions/checkout@{PIN}\n",
        "ubuntu-latest",
    )
    expect_fail(
        "write-permission",
        f"permissions:\n  contents: read\n  statuses: write\nruns-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\n",
        "read-only",
    )
    expect_fail(
        "mutating-gh-api",
        f"permissions:\n  contents: read\nruns-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\nrun: gh api --method POST repos/x/y/statuses/abc\n",
        "mutating",
    )
    expect_pass(
        "local-action",
        "permissions:\n  contents: read\nruns-on: ubuntu-24.04\n- uses: ./local-action\n",
    )
    expect_fail(
        "python-version-drift",
        f"permissions:\n  contents: read\nruns-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\npython-version: '3.12'\n",
        "python-version must be exact",
    )

    exact_errors = module.evaluate_repository_integrity_exact_checkout(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: GOOD_REPOSITORY_INTEGRITY}
    )
    if exact_errors:
        raise AssertionError(f"repository-integrity-exact-good: expected PASS, got {exact_errors}")

    no_ref = GOOD_REPOSITORY_INTEGRITY.replace(
        "          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}\n",
        "",
    )
    exact_errors = module.evaluate_repository_integrity_exact_checkout(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: no_ref}
    )
    if not any("exact PR-head checkout marker missing" in error and "ref:" in error for error in exact_errors):
        raise AssertionError(f"repository-integrity-no-ref: expected exact-ref failure, got {exact_errors}")

    no_verify = GOOD_REPOSITORY_INTEGRITY.replace('          actual="$(git rev-parse HEAD)"\n', "")
    exact_errors = module.evaluate_repository_integrity_exact_checkout(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: no_verify}
    )
    if not any("git rev-parse HEAD" in error for error in exact_errors):
        raise AssertionError(f"repository-integrity-no-verify: expected verify failure, got {exact_errors}")

    dep_errors = module.evaluate_dependabot(GOOD_DEPENDABOT)
    if dep_errors:
        raise AssertionError(f"dependabot-good: expected PASS, got {dep_errors}")

    noisy = GOOD_DEPENDABOT + '\n  - package-ecosystem: "npm"\n'
    dep_errors = module.evaluate_dependabot(noisy)
    if not any("only github-actions" in error for error in dep_errors):
        raise AssertionError(f"dependabot-noisy: expected ecosystem failure, got {dep_errors}")

    weekly = GOOD_DEPENDABOT.replace('interval: "monthly"', 'interval: "weekly"')
    dep_errors = module.evaluate_dependabot(weekly)
    if not any("monthly" in error for error in dep_errors):
        raise AssertionError(f"dependabot-schedule: expected monthly failure, got {dep_errors}")

    print("CI/supply-chain hygiene self-test PASS")


if __name__ == "__main__":
    main()
