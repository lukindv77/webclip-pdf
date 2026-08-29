#!/usr/bin/env python3
"""Losslessly fold standalone AUDIT_DELTA files into family evidence documents.

This maintenance tool is intentionally deterministic and network-free. It reads the
current audit navigation index, embeds every listed standalone delta verbatim into
one family evidence document with SHA-256 provenance, rewrites the navigation index,
and deletes only those source delta files that were successfully embedded.

Current P-code status is never inferred or rewritten here; AUDIT_REGISTRY.md remains
the status/ownership authority.
"""
from __future__ import annotations

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "project_docs"
INDEX = DOCS / "AUDIT_DELTA_INDEX.md"

FAMILY_FILES = {
    "1": "AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md",
    "2": "AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md",
    "3": "AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md",
    "4": "AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md",
    "5": "AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md",
    "6": "AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md",
    "8": "AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md",
    "9": "AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md",
    "10": "AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md",
    "11": "AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md",
    "12": "AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md",
}

ALREADY_CONSOLIDATED = {
    "7": ("Journal comments / tombstones / edit generations", "AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md", "P0-076, P1-202, P1-211, P1-225"),
    "13": ("Incognito / trust boundaries / signed-link redaction", "AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md", "P0-033, P0-045"),
    "14": ("Derived URL stats / view indexes", "AUDIT_FAMILY_URLSTATS_EVIDENCE.md", "P0-050"),
    "15": ("Retired broad revalidation / cross-cutting inventories", "AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md", "cross-cutting historical controls"),
}

SECTION_RE = re.compile(r"^##\s+(\d+)\.\s+(.+)$", re.MULTILINE)
DELTA_RE = re.compile(r"^-\s+`(AUDIT_DELTA_[A-Z0-9_\-]+\.md)`\s*$", re.MULTILINE)
PCODE_RE = re.compile(r"\bP[012]-\d{3}\b")


def sort_pcode(code: str) -> tuple[int, int]:
    return int(code[1]), int(code[3:])


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def first_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def parse_index(text: str) -> dict[str, dict[str, object]]:
    matches = list(SECTION_RE.finditer(text))
    sections: dict[str, dict[str, object]] = {}
    for i, match in enumerate(matches):
        number = match.group(1)
        body = text[match.end(): matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        owners_match = re.search(r"^Primary owners:\s*(.+)$", body, re.MULTILINE)
        sections[number] = {
            "title": match.group(2).strip(),
            "body": body,
            "owners": owners_match.group(1).strip() if owners_match else "See family evidence / AUDIT_REGISTRY.md",
            "files": DELTA_RE.findall(body),
        }
    return sections


def render_family(number: str, section: dict[str, object]) -> tuple[str, list[pathlib.Path]]:
    title = str(section["title"])
    owners = str(section["owners"])
    filenames = list(section["files"])
    if not filenames:
        raise RuntimeError(f"family {number} has no standalone deltas to consolidate")

    source_rows: list[tuple[str, str, str, str]] = []
    transcripts: list[str] = []
    all_codes: set[str] = set()
    source_paths: list[pathlib.Path] = []

    for filename in filenames:
        path = DOCS / filename
        if not path.is_file():
            raise RuntimeError(f"index references missing source: {path.relative_to(ROOT)}")
        text = path.read_text(encoding="utf-8")
        digest = sha256_text(text)
        codes = sorted(set(PCODE_RE.findall(text)), key=sort_pcode)
        all_codes.update(codes)
        source_rows.append((filename, digest, ", ".join(codes) if codes else "—", first_title(text, filename)))
        source_paths.append(path)
        transcripts.append(
            f"\n## Retired source: `{filename}`\n\n"
            f"SHA-256 of UTF-8 source text: `{digest}`\n\n"
            f"{text.rstrip()}\n"
        )

    lines = [
        f"# Audit family evidence — {title}",
        "",
        f"Family from `AUDIT_DELTA_INDEX.md` section {number}.",
        "",
        "This document is a **lossless consolidation** of the detailed audit deltas listed below. "
        "Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves "
        "source proof, deterministic schedules, corrections, positive controls, acceptance cases and "
        "historical test/release interpretation.",
        "",
        "Every retired source is embedded verbatim below and identified by its original filename plus "
        "SHA-256. Git history remains the secondary recovery path.",
        "",
        f"Primary owners from the navigation index: {owners}",
        "",
        f"Retired source count: **{len(source_rows)}**.",
        "",
        "## P-code coverage",
        "",
        ", ".join(sorted(all_codes, key=sort_pcode)) if all_codes else "No P-codes detected.",
        "",
        "## Source ledger",
        "",
        "| Original delta | SHA-256 | P-codes mentioned | Original title |",
        "|---|---|---|---|",
    ]
    for filename, digest, codes, title_text in source_rows:
        lines.append(
            f"| `{filename}` | `{digest}` | {codes.replace('|', r'\|')} | {title_text.replace('|', r'\|')} |"
        )
    lines.extend([
        "",
        "## Lossless source transcripts",
        "",
        "The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements "
        "remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.",
    ])
    return "\n".join(lines) + "".join(transcripts) + "\n", source_paths


def render_index(sections: dict[str, dict[str, object]], counts: dict[str, int]) -> str:
    rows: list[tuple[str, str, str, str, str]] = []
    for number in map(str, range(1, 16)):
        if number in FAMILY_FILES:
            section = sections[number]
            rows.append((number, str(section["title"]), FAMILY_FILES[number], str(section["owners"]), str(counts[number])))
        else:
            title, filename, owners = ALREADY_CONSOLIDATED[number]
            rows.append((number, title, filename, owners, "previously consolidated"))

    lines = [
        "# Audit family navigation index",
        "",
        "This file is **navigation only**. Current P-code status and single-owner authority come from `AUDIT_REGISTRY.md`. Detailed source proof is retained in consolidated family evidence files and Git history.",
        "",
        "## Consolidation state",
        "",
        "All formerly current `AUDIT_DELTA_*.md` evidence files have completed lossless family retirement. The original source text is preserved verbatim in the relevant `AUDIT_FAMILY_*_EVIDENCE.md` file (or the cross-cutting evidence file), together with original filename and SHA-256 where applicable.",
        "",
        "No standalone audit delta is a current status authority. New audit findings must first be registered in `AUDIT_REGISTRY.md`; if a temporary delta is created during active analysis, CI requires it to be indexed until it is folded into the appropriate family evidence.",
        "",
        "## Families",
        "",
        "| # | Family | Consolidated evidence | Primary owners / scope | Retired deltas |",
        "|---:|---|---|---|---:|",
    ]
    for number, title, filename, owners, count in rows:
        lines.append(f"| {number} | {title} | `{filename}` | {owners} | {count} |")
    lines.extend([
        "",
        "## Current reading rule",
        "",
        "1. Read `AUDIT_REGISTRY.md` for current status and ownership.",
        "2. Use the family evidence above for detailed source proof, deterministic schedules, corrections, positive controls and acceptance boundaries.",
        "3. Use `AUDIT_HISTORY_INDEX.md`, `AUDIT_EVIDENCE.md`, `AUDIT_RETIRED_DELTA_EVIDENCE.md`, `TEST_EVIDENCE.md` and Git history for historical implementation/test context.",
        "4. Never infer that a P-number is free from absence in one family document; permanent numbering rules in `AUDIT_REGISTRY.md` control allocation.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    if not INDEX.is_file():
        print("AUDIT_DELTA_INDEX.md missing", file=sys.stderr)
        return 2
    index_text = INDEX.read_text(encoding="utf-8")
    sections = parse_index(index_text)
    missing_sections = sorted(set(FAMILY_FILES) - set(sections))
    if missing_sections:
        print("missing family sections: " + ", ".join(missing_sections), file=sys.stderr)
        return 2

    remaining = sorted(p for p in DOCS.glob("AUDIT_DELTA_*.md") if p.name != "AUDIT_DELTA_INDEX.md")
    if not remaining:
        print("No standalone audit deltas remain; consolidation already complete.")
        return 0

    listed: set[str] = set()
    for number in FAMILY_FILES:
        listed.update(sections[number]["files"])
    actual = {p.name for p in remaining}
    if listed != actual:
        unlisted = sorted(actual - listed)
        stale = sorted(listed - actual)
        if unlisted:
            print("unlisted standalone deltas: " + ", ".join(unlisted), file=sys.stderr)
        if stale:
            print("index references missing deltas: " + ", ".join(stale), file=sys.stderr)
        return 2

    outputs: dict[pathlib.Path, str] = {}
    sources_to_delete: list[pathlib.Path] = []
    counts: dict[str, int] = {}
    for number, filename in FAMILY_FILES.items():
        content, source_paths = render_family(number, sections[number])
        outputs[DOCS / filename] = content
        sources_to_delete.extend(source_paths)
        counts[number] = len(source_paths)

    if len(sources_to_delete) != len(actual):
        print("source accounting mismatch", file=sys.stderr)
        return 2

    for path, content in outputs.items():
        path.write_text(content, encoding="utf-8")

    for source in sources_to_delete:
        text = source.read_text(encoding="utf-8")
        digest = sha256_text(text)
        family_matches = [p for p, content in outputs.items() if f"`{source.name}`" in content and digest in content and text.rstrip() in content]
        if len(family_matches) != 1:
            print(f"lossless verification failed for {source.name}", file=sys.stderr)
            return 2

    INDEX.write_text(render_index(sections, counts), encoding="utf-8")
    for source in sources_to_delete:
        source.unlink()

    print(f"Consolidated {len(sources_to_delete)} standalone audit deltas into {len(outputs)} family evidence files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
