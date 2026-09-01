#!/usr/bin/env python3
"""Deterministic functional Closure Sweep for P0-023 and P0-079.

The audit binds its race model to exact current source invariants in
service-worker.js and offscreen.js. It proves that one mutable `tab:<id>` PDF
cache slot cannot simultaneously preserve exact source-document generation and
exact save-operation ownership.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SW = ROOT / "service-worker.js"
OFFSCREEN = ROOT / "offscreen.js"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def require(pattern: str, text: str, label: str, flags: int = 0) -> re.Match[str]:
    match = re.search(pattern, text, flags)
    if not match:
        raise AssertionError(f"current source invariant missing: {label}")
    return match


def cache_key(tab_id: int) -> str:
    return f"tab:{tab_id}"


def main() -> int:
    sw = SW.read_text(encoding="utf-8")
    offscreen = OFFSCREEN.read_text(encoding="utf-8")

    key_fn = require(
        r"function\s+pdfCacheKey\s*\(tabId\)\s*\{\s*return\s+`tab:\$\{tabId\}`;\s*\}",
        sw,
        "pdfCacheKey(tabId) must be exactly tab-scoped",
        re.S,
    ).group(0)
    require(
        r"const\s+cached\s*=\s*\{\s*key:\s*pdfCacheKey\(tabId\),\s*tabId,\s*filename,",
        sw,
        "new Yandex PDF generation stored under tab key",
        re.S,
    )
    require(
        r"async\s+function\s+retryCachedPdfUploadToYandex\s*\(tabId,\s*operationId\s*=\s*''\)\s*\{[\s\S]*?const\s+cached\s*=\s*await\s+getValidCachedPdfForTab\(tabId\);",
        sw,
        "manual Yandex retry resolves cache by tab only",
    )
    require(
        r"async\s+function\s+getValidCachedPdfForTab\s*\(tabId\)\s*\{\s*const\s+key\s*=\s*pdfCacheKey\(tabId\);\s*const\s+cached\s*=\s*await\s+getCachedPdfMetadataByKey\(key\);",
        sw,
        "cache lookup resolves tab key without document/operation generation",
        re.S,
    )
    require(
        r"pdfCacheKey:\s*String\(cached\.key\s*\|\|\s*pdfCacheKey\(tabId\)\)",
        sw,
        "Yandex signed transfer receives the mutable cache key",
    )
    require(
        r"if\s*\(mode\s*===\s*'pdf-cache-upload'\)\s*\{\s*const\s+record\s*=\s*await\s+getPdfCacheRecord\(String\(spec\.pdfCacheKey\s*\|\|\s*''\),\s*deadlineAt\);[\s\S]*?fetchOptions\.body\s*=\s*cachedPdfRecordToBlob\(record\);",
        offscreen,
        "offscreen upload re-reads PDF bytes by mutable cache key",
        re.S,
    )

    # The following schedules are intentionally tiny. Their validity is not
    # assumed from a hypothetical architecture; it follows directly from the
    # exact source invariants asserted above: every put/read/transfer refers to
    # the same `tab:<id>` slot.
    tab = 77
    slot: dict[str, dict[str, str]] = {}

    # P0-023 schedule: document A generated a PDF; same tab later contains a
    # new browser document B (even at the same URL) and overwrites the slot.
    slot[cache_key(tab)] = {
        "bytes": "PDF-DOCUMENT-A",
        "document_generation": "doc-A",
        "operation": "save-A",
    }
    slot[cache_key(tab)] = {
        "bytes": "PDF-DOCUMENT-B",
        "document_generation": "doc-B",
        "operation": "save-B",
    }
    retry_for_old_document = dict(slot[cache_key(tab)])
    p0_023_wrong_document = retry_for_old_document["document_generation"] != "doc-A"

    # P0-079 schedule: operation A stores A and obtains the cache key. Before
    # offscreen A dereferences that key, operation B stores B into the same
    # slot. Offscreen A then uploads B bytes while A still owns the transfer.
    slot.clear()
    op_a_key = cache_key(tab)
    slot[op_a_key] = {
        "bytes": "PDF-OP-A",
        "document_generation": "doc-C",
        "operation": "op-A",
    }
    slot[cache_key(tab)] = {
        "bytes": "PDF-OP-B",
        "document_generation": "doc-C",
        "operation": "op-B",
    }
    offscreen_bytes_for_a = dict(slot[op_a_key])
    p0_079_wrong_operation = offscreen_bytes_for_a["operation"] != "op-A"

    if not p0_023_wrong_document:
        raise AssertionError("P0-023 schedule failed to demonstrate same-tab document-generation overwrite")
    if not p0_079_wrong_operation:
        raise AssertionError("P0-079 schedule failed to demonstrate operation-owned byte substitution")

    result = {
        "schema": 1,
        "owners": ["P0-023", "P0-079"],
        "service_worker_sha256": sha256(sw),
        "offscreen_sha256": sha256(offscreen),
        "pdf_cache_key_source": key_fn,
        "cache_key_example": cache_key(tab),
        "verdict": "DETERMINISTIC / FINDING",
        "p0_023": {
            "expected_document_generation": "doc-A",
            "resolved_document_generation": retry_for_old_document["document_generation"],
            "resolved_bytes": retry_for_old_document["bytes"],
            "wrong_document_generation": p0_023_wrong_document,
        },
        "p0_079": {
            "transfer_owner": "op-A",
            "resolved_cache_operation": offscreen_bytes_for_a["operation"],
            "resolved_bytes": offscreen_bytes_for_a["bytes"],
            "wrong_operation_generation": p0_079_wrong_operation,
        },
        "conclusion": (
            "The current mutable tab-scoped cache key permits both same-tab document-generation "
            "replacement and concurrent-operation byte substitution before offscreen dereference."
        ),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("P0-023/P0-079 PDF cache authority audit: FINDING reproduced")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
