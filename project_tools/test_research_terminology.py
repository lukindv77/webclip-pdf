#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import tempfile

EN = "au" + "dit"
RU = "".join(chr(x) for x in (0x430, 0x443, 0x434, 0x438, 0x442))


def contains_forbidden(value: str) -> bool:
    folded = value.casefold()
    return EN in folded or RU in folded


def main() -> int:
    assert not contains_forbidden("Comprehensive Project Research")
    assert contains_forbidden("legacy-" + EN + "-token")
    assert contains_forbidden("legacy-" + RU + "-token")
    with tempfile.TemporaryDirectory() as tmp:
        p = pathlib.Path(tmp) / "research.txt"
        p.write_text("Research terminology is canonical.", encoding="utf-8")
        assert not contains_forbidden(p.read_text(encoding="utf-8"))
    print("Research terminology checker self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
