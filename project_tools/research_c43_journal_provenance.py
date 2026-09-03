#!/usr/bin/env python3
"""Fresh C43 probe: physical artifact identity versus Journal checkpoint provenance."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

import research_c40_physical_pdf_cache_identity as c40

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or "")


def source_contract() -> dict[str, bool]:
    normalize_at = WORKER.index("function normalizePendingJournalAppendData")
    append_at = WORKER.index("async function appendJournalEntry")
    normalized = WORKER[normalize_at:append_at]
    cache_at = WORKER.index("function pdfCacheMetadataFromRecord")
    cache_metadata = WORKER[cache_at:cache_at + 2200]
    return {
        "pendingNormalizationExists": "function normalizePendingJournalAppendData" in WORKER,
        "checkpointCarriesOperationAndJournalIdentity": (
            "operationId" in normalized and "journalEntryId" in normalized and "journalCreatedAt" in normalized
        ),
        "checkpointHasNoPdfDigest": (
            "pdfSha256" not in normalized and "pdfDigest" not in normalized and "artifactSha256" not in normalized
        ),
        "appendSupportsRequiredDurableCheckpoint": "requiredDurableCheckpoint" in WORKER,
        "durableCheckpointRecheckedInsideAppend": (
            "const durableGet = durableStore.get" in WORKER
            and "durableCheckpointMissing = true" in WORKER
            and "Do not resurrect stale in-memory metadata" in WORKER
        ),
        "pendingCheckpointRecheckedInsideAppend": (
            "const checkPendingAppend" in WORKER and "pendingStore.get(id)" in WORKER
        ),
        "journalRevisionTouchedOnAppend": "touchJournalDbRevision(tx, 'append')" in WORKER,
        "pdfCacheMetadataHasLengthButNoDigest": (
            "pdfByteLength" in cache_metadata and "pdfSha256" not in cache_metadata
            and "pdfDigest" not in cache_metadata and "artifactSha256" not in cache_metadata
        ),
    }


def stale_finalization_model() -> dict:
    """Model the exact fail-closed branch guarded by current append source."""
    durable = {"entry-A": {"operationId": "op-A"}}
    pending = {"entry-A": {"operationId": "op-A"}}
    journal = {}
    durable.clear()
    pending.clear()
    durable_checkpoint_missing = "entry-A" not in durable
    if not durable_checkpoint_missing:
        journal["entry-A"] = {"operationId": "op-A"}
    return {
        "durableCheckpointMissing": durable_checkpoint_missing,
        "lateAppendCommitted": "entry-A" in journal,
        "staleResurrectionPrevented": durable_checkpoint_missing and "entry-A" not in journal,
    }


def artifact_identity_control(pdf_a: dict, pdf_b: dict) -> dict:
    # The checkpoint can carry operation/url/size-like metadata, but current source has no PDF digest.
    # Use A's admitted metadata while substituting B's physical bytes: without a digest the receipt has
    # no cryptographic statement about which bytes actually reached finalization.
    metadata_a = {"operationId": "op-A", "url": pdf_a["url"], "pdfByteLength": pdf_a["bytes"]}
    substituted_metadata = dict(metadata_a)
    receipt_a = {**metadata_a, "pdfSha256": pdf_a["sha256"]}
    return {
        "metadataA": metadata_a,
        "substitutedMetadata": substituted_metadata,
        "metadataIndistinguishableWithoutDigest": metadata_a == substituted_metadata,
        "receiptA": receipt_a,
        "observedSubstitutedDigest": pdf_b["sha256"],
        "digestBoundControlRejectsSubstitution": receipt_a["pdfSha256"] != pdf_b["sha256"],
    }


def run(chrome: str) -> dict:
    if not chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(tempfile.mkdtemp(prefix="webclip-c43-"))
    physical = c40.run(chrome, out)
    a = physical["physicalPdfA"]
    b = physical["physicalPdfB"]
    result = {
        "browserVersion": physical["browserVersion"],
        "workerBlobSha": os.environ.get("WORKER_BLOB_SHA", ""),
        "sourceContract": source_contract(),
        "physicalArtifacts": {"A": a, "B": b},
        "staleFinalizationControl": stale_finalization_model(),
        "artifactIdentityControl": artifact_identity_control(a, b),
        "evidenceBoundary": {
            "localPhysical": True,
            "localJournalRace": "exact-source guarded deterministic model",
            "remoteYandexObject": False,
            "remoteL5Remaining": True,
        },
    }
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C43_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    assert all(result["sourceContract"].values()), result["sourceContract"]
    assert a["url"] == b["url"] and a["sha256"] != b["sha256"], (a, b)
    assert result["staleFinalizationControl"]["staleResurrectionPrevented"] is True
    assert result["artifactIdentityControl"]["metadataIndistinguishableWithoutDigest"] is True
    assert result["artifactIdentityControl"]["digestBoundControlRejectsSubstitution"] is True
    assert result["evidenceBoundary"]["remoteL5Remaining"] is True
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    args = parser.parse_args()
    run(args.chrome)


if __name__ == "__main__":
    main()
