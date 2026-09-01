#!/usr/bin/env python3
"""Deterministic hash-addressed provenance checks for staged research-evidence compaction."""
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]

SERIES = (
    {
        "name": "replaced-resource",
        "consolidated": "project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("b36dc030b245ef39d150d5e8de561859f28ebc19", "aa7b484a30c7591ac2e15e0f0269ca6d229f09fa", "a06dca0fb4752fc4c6514f4069ea97e63cb91452"),
        "retired": ("project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "css-visual-dependency",
        "consolidated": "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("9ab49df3b368a68bfac8ade402453f85b0df9a20", "bc772620ab18d202406adf0a81d69483000ba992", "88f25125e66412d50434af2a425157f5c5dfb581", "7bac52cee7a9b7e3eb1aff4b48faf7370784bafb"),
        "retired": ("project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "flattened-document-namespace",
        "consolidated": "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("f27442b95e2528c63c0a0e974a5a26c8c69f859c", "f083b46aa6260fd19dfc446275592890582ce960", "8ca747bfea509f3da38098cf109f04d541395d39", "ea57fb2663a9b12036ced7c9465defc5102f7466"),
        "retired": ("project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "composed-rendered-scope",
        "consolidated": "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("cb97d2be0675a76da0209c8c7044043cf7efa910", "7002fafcb2899e7fa811988f09ae23726479cec4", "afcbbd355ff39af1c0d829515d03a44dea878052", "4e36a6d7c7418c2bb8c9a7de6299bfc414ef408b"),
        "retired": ("project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
)


def require_blob(blob: str) -> None:
    subprocess.run(["git", "cat-file", "-e", f"{blob}^{{blob}}"], cwd=ROOT, check=True)


def check_series(series: dict[str, object]) -> None:
    name = str(series["name"])
    consolidated = ROOT / str(series["consolidated"])
    blobs = tuple(series["blobs"])
    retired = tuple(series["retired"])
    blocks = int(series["blocks"])
    assert consolidated.is_file(), f"{name}: missing consolidated evidence"
    text = consolidated.read_text(encoding="utf-8")
    for blob in blobs:
        require_blob(str(blob))
        assert str(blob) in text, f"{name}: consolidated evidence lost historical blob identity {blob}"
    for rel in retired:
        assert not (ROOT / str(rel)).exists(), f"{name}: retired staged checkpoint returned: {rel}"
    for block in range(1, blocks + 1):
        assert f"{block}. " in text, f"{name}: missing block-preservation marker {block}"


def main() -> int:
    for series in SERIES:
        check_series(series)
    print(f"Staged research evidence compaction provenance PASS: series={len(SERIES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
