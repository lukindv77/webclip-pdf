#!/usr/bin/env python3
"""Deterministic provenance checks for staged audit-evidence compaction."""

from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]

SERIES = (
    {
        "name": "replaced-resource",
        "source_commit": "73c92c3389790dc4fdf449373eb2392a729359f3",
        "consolidated": "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "sources": {
            "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md": "b36dc030b245ef39d150d5e8de561859f28ebc19",
            "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md": "aa7b484a30c7591ac2e15e0f0269ca6d229f09fa",
            "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md": "a06dca0fb4752fc4c6514f4069ea97e63cb91452",
        },
        "retired": (
            "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md",
            "project_docs/AUDIT_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md",
        ),
        "blocks": 56,
    },
    {
        "name": "css-visual-dependency",
        "source_commit": "4a44b75b283e18e5091913c793059965112eb1a3",
        "consolidated": "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md",
        "sources": {
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md": "9ab49df3b368a68bfac8ade402453f85b0df9a20",
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md": "bc772620ab18d202406adf0a81d69483000ba992",
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md": "88f25125e66412d50434af2a425157f5c5dfb581",
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md": "7bac52cee7a9b7e3eb1aff4b48faf7370784bafb",
        },
        "retired": (
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md",
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md",
            "project_docs/AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md",
        ),
        "blocks": 56,
    },
    {
        "name": "flattened-document-namespace",
        "source_commit": "69eeb8a45800dbd21e2f2150ef772f81167c55d7",
        "consolidated": "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md",
        "sources": {
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md": "f27442b95e2528c63c0a0e974a5a26c8c69f859c",
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md": "f083b46aa6260fd19dfc446275592890582ce960",
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md": "8ca747bfea509f3da38098cf109f04d541395d39",
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md": "ea57fb2663a9b12036ced7c9465defc5102f7466",
        },
        "retired": (
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md",
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md",
            "project_docs/AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md",
        ),
        "blocks": 56,
    },
)


def git_bytes(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=True, stdout=subprocess.PIPE
    ).stdout


def git_blob(data: bytes) -> str:
    return subprocess.run(
        ["git", "hash-object", "--stdin"],
        cwd=ROOT,
        check=True,
        input=data,
        stdout=subprocess.PIPE,
    ).stdout.decode("ascii").strip()


def check_series(series: dict[str, object]) -> None:
    name = str(series["name"])
    source_commit = str(series["source_commit"])
    consolidated = ROOT / str(series["consolidated"])
    sources = dict(series["sources"])
    retired = tuple(series["retired"])
    blocks = int(series["blocks"])

    assert consolidated.is_file(), f"{name}: missing consolidated evidence: {consolidated.relative_to(ROOT)}"
    text = consolidated.read_text(encoding="utf-8")

    for path, expected_blob in sources.items():
        original = git_bytes("show", f"{source_commit}:{path}")
        actual_blob = git_blob(original)
        assert actual_blob == expected_blob, (name, path, expected_blob, actual_blob)
        assert path in text, f"{name}: consolidated evidence lost source path ledger: {path}"
        assert expected_blob in text, f"{name}: consolidated evidence lost source blob ledger: {expected_blob}"

    for rel in retired:
        path = ROOT / rel
        assert not path.exists(), f"{name}: retired staged checkpoint returned to current tree: {rel}"

    for block in range(1, blocks + 1):
        marker = f"{block}. "
        assert marker in text, f"{name}: consolidated evidence missing block-preservation marker {block}"


def main() -> int:
    for series in SERIES:
        check_series(series)
    print(f"Staged evidence compaction provenance PASS: series={len(SERIES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
