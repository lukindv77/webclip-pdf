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

GOOD_S0B_JOB = """
  p1-231-source-generation-authority:
    name: p1-231-source-generation-authority
    runs-on: ubuntu-24.04
    steps:
      - name: Checkout exact S0-B candidate
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          fetch-depth: 0
          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
      - name: Verify exact S0-B checkout
        shell: bash
        env:
          EXPECTED_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
        run: |
          set -euo pipefail
          actual="$(git rev-parse HEAD)"
          if [[ "$actual" != "$EXPECTED_SHA" ]]; then
            exit 1
          fi
      - name: Set up S0-B Python
        with:
          python-version: '3.12.10'
      - name: Set up S0-B Node.js
        with:
          node-version: '22.23.2'
      - name: Verify P1-231 S0-B source generation
        env:
          EXPECTED_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
        run: node project_tools/release_source_generation_authority.js --candidate "$EXPECTED_SHA"
"""
GOOD_REPOSITORY_INTEGRITY_WITH_S0B = GOOD_REPOSITORY_INTEGRITY + GOOD_S0B_JOB


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
        "python-version must include exact generic profile",
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

    lane_errors = module.evaluate_repository_integrity_s0b_lane(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: GOOD_REPOSITORY_INTEGRITY_WITH_S0B}
    )
    if lane_errors:
        raise AssertionError(f"repository-integrity-s0b-good: expected PASS, got {lane_errors}")

    no_s0b_python = GOOD_REPOSITORY_INTEGRITY_WITH_S0B.replace(
        "          python-version: '3.12.10'\n",
        "",
    )
    lane_errors = module.evaluate_repository_integrity_s0b_lane(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: no_s0b_python}
    )
    if not any("S0-B authority job marker missing" in error and "3.12.10" in error for error in lane_errors):
        raise AssertionError(f"repository-integrity-s0b-no-python: expected profile failure, got {lane_errors}")

    no_s0b_ref = GOOD_REPOSITORY_INTEGRITY_WITH_S0B.replace(
        "          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}\n",
        "",
        1,
    )
    lane_errors = module.evaluate_repository_integrity_s0b_lane(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: no_s0b_ref}
    )
    if not any("S0-B authority job marker missing" in error and "ref:" in error for error in lane_errors):
        raise AssertionError(f"repository-integrity-s0b-no-ref: expected exact-ref failure, got {lane_errors}")

    no_s0b_verifier = GOOD_REPOSITORY_INTEGRITY_WITH_S0B.replace(
        '        run: node project_tools/release_source_generation_authority.js --candidate "$EXPECTED_SHA"\n',
        "        run: node --version\n",
    )
    lane_errors = module.evaluate_repository_integrity_s0b_lane(
        {module.REPOSITORY_INTEGRITY_WORKFLOW: no_s0b_verifier}
    )
    if not any("release_source_generation_authority.js" in error for error in lane_errors):
        raise AssertionError(f"repository-integrity-s0b-no-verifier: expected verifier failure, got {lane_errors}")

    profile_errors = module.evaluate(
        {
            module.REPOSITORY_INTEGRITY_WORKFLOW:
                "runs-on: ubuntu-24.04\n"
                "python-version: '3.12.14'\n"
                "python-version: '3.12.10'\n"
                "node-version: '22.23.2'\n"
        }
    )
    if profile_errors:
        raise AssertionError(f"repository-integrity-dual-profile: expected PASS, got {profile_errors}")

    foreign_profile_errors = module.evaluate(
        {
            ".github/workflows/other.yml":
                "runs-on: ubuntu-24.04\n"
                "python-version: '3.12.14'\n"
                "python-version: '3.12.10'\n"
        }
    )
    if not any("allowed only in Repository Integrity" in error for error in foreign_profile_errors):
        raise AssertionError(f"foreign-s0b-profile: expected scope failure, got {foreign_profile_errors}")

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
