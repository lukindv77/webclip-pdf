#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
EN = "au" + "dit"
RU = "".join(chr(x) for x in (0x430, 0x443, 0x434, 0x438, 0x442))
SKIP = {"project_tools/migrate_comprehensive_research_terminology.py"}


def tracked_paths(root: pathlib.Path) -> list[pathlib.Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=root)
    return [root / p.decode("utf-8") for p in raw.split(b"\0") if p]


def findings(root: pathlib.Path = ROOT) -> list[str]:
    out: list[str] = []
    for path in tracked_paths(root):
        rel = path.relative_to(root).as_posix()
        if rel in SKIP:
            continue
        folded_path = rel.casefold()
        if EN in folded_path or RU in folded_path:
            out.append(f"path:{rel}")
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        folded = text.casefold()
        if EN in folded or RU in folded:
            out.append(f"text:{rel}")
    return out


def main() -> int:
    bad = findings()
    if bad:
        for item in bad:
            print(item)
        raise SystemExit(f"Research terminology contract failed: findings={len(bad)}")
    print("Research terminology contract PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
