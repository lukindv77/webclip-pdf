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
        "full-sha",
        f"runs-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\n",
    )
    expect_fail(
        "mutable-tag",
        "runs-on: ubuntu-24.04\n- uses: actions/checkout@v4\n",
        "full commit SHA",
    )
    expect_fail(
        "mutable-runner",
        f"runs-on: ubuntu-latest\n- uses: actions/checkout@{PIN}\n",
        "ubuntu-latest",
    )
    expect_pass(
        "local-action",
        "runs-on: ubuntu-24.04\n- uses: ./local-action\n",
    )
    expect_fail(
        "python-version-drift",
        f"runs-on: ubuntu-24.04\n- uses: actions/checkout@{PIN}\npython-version: '3.12'\n",
        "python-version must be exact",
    )
    print("CI pin checker self-test PASS")


if __name__ == "__main__":
    main()
