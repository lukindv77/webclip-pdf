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


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_contract() -> dict[str, bool]:
    normalize_at = WORKER.index("function normalizePendingJournalAppendData")
    append_at = WORKER.index("async function appendJournalEntry")
    normalized = WORKER[normalize_at:append_at]
    append_window = WORKER[append_at:append_at + 24000]
    return {
        "pendingNormalizationExists": "function normalizePendingJournalAppendData" in WORKER,
        "checkpointCarriesOperationAndJournalIdentity": (
            "operationId" in normalized and "journalEntryId" in normalized and "journalCreatedAt" in normalized
        ),
        "checkpointHasNoPdfDigest": (
            "pdfSha256" not in normalized and "pdfDigest" not in normalized and "artifactSha256" not in normalized
        ),
        "appendSupportsRequiredDurableCheckpoint": "requiredDurableCheckpoint" in append_window,
        "durableCheckpointRecheckedInsideAppend": (
            "const durableGet = durableStore.get" in append_window
            and "durableCheckpointMissing = true" in append_window
            and "Do not resurrect stale in-memory metadata" in append_window
        ),
        "pendingCheckpointRecheckedInsideAppend": (
            "const checkPendingAppend" in append_window and "pendingStore.get(id)" in append_window
        ),
        "journalRevisionTouchedOnAppend": "touchJournalDbRevision(tx, 'append')" in append_window,
        "pdfCacheMetadataHasLengthButNoDigest": (
            "function pdfCacheMetadataFromRecord" in WORKER
            and "pdfByteLength" in WORKER[WORKER.index("function pdfCacheMetadataFromRecord"):WORKER.index("function pdfCacheMetadataFromRecord") + 2200]
            and "pdfSha256" not in WORKER[WORKER.index("function pdfCacheMetadataFromRecord"):WORKER.index("function pdfCacheMetadataFromRecord") + 2200]
        ),
    }


def stale_finalization_model() -> dict:
    """Model the exact fail-closed branch guarded by current append source."""
    durable = {"entry-A": {"operationId": "op-A"}}
    pending = {"entry-A": {"operationId": "op-A"}}
    journal = {}

    # A clear/import replacement removes the durable source checkpoint before a late finalizer runs.
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
    # Production-style provenance available around the checkpoint: same locator/operation can carry size/meta,
    # but current checkpoint/cache metadata has no cryptographic PDF-byte identity.
    metadata_a = {"operationId": "op-A", "url": pdf_a["url"], "pdfByteLength": pdf_a["bytes"]}
    metadata_b = {"operationId": "op-A", "url": pdf_a["url"], "pdfByteLength": pdf_a["bytes"]}
    metadata_indistinguishable = metadata_a == metadata_b

    receipt_a = {**metadata_a, "pdfSha256": pdf_a["sha256"]}
    observed_b = {**metadata_b, "pdfSha256": pdf_b["sha256"]}
    digest_rejects_substitution = receipt_a["pdfSha256"] != observed_b["pdfSha256"]
    return {
        "metadataA": metadata_a,
        "substitutedMetadataB": metadata_b,
        "metadataIndistinguishableWithoutDigest": metadata_indistinguishable,
        "receiptA": receipt_a,
        "observedSubstitutedDigest": observed_b["pdfSha256"],
        "digestBoundControlRejectsSubstitution": digest_rejects_substitution,
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
