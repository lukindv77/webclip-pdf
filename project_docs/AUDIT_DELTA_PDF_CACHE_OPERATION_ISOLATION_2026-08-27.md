# Audit delta — PDF retry-cache operation isolation — 2026-08-27

Baseline HEAD before this audit block: `08fc05b9cc00b250a194a0a4d01ffb428895508d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P0-079 — Yandex PDF retry-cache is tab-owned instead of operation-owned

**Classification:** P0 / evidence-reserved / confirmed by fresh runtime audit.

This root cause is independent from:

- `P0-023`, which owns stale same-tab/new-document URL/document identity on later retry;
- `P1-184`, which owns remote-object/content proof after unknown Yandex settlement;
- `P1-043`, which owns shared storage quota admission.

The defect here happens before remote proof: two live save operations in the same tab can overwrite/delete the same local PDF byte slot and thereby mix one operation's metadata/checkpoint with another operation's bytes.

## Exact runtime proof

### 1. Yandex cache key is only the tab id

`pdfCacheKey(tabId)` returns exactly `tab:<tabId>`.

`generatePdfAndUploadToYandex()` stores the newly printed PDF under that key together with operation metadata, `journalEntryId`, `createdAt` and `sourceUrl`.

There is no operation generation/cache lease in the key.

### 2. Local download already demonstrates the safer shape

`generatePdfAndDownload()` does **not** use the tab-global slot for the irreversible download handoff. It writes a temporary cache record under:

`local-download:<operationId>`.

Therefore the codebase already distinguishes operation-owned bytes for local download, while Yandex upload/retry still shares one mutable slot per tab.

### 3. Offscreen signed upload re-reads the current slot at transfer time

The worker does not pass the immutable PDF Blob to offscreen. For Yandex upload it sends `pdfCacheKey` in the `pdf-cache-upload` transfer spec.

`offscreen.js::handleSignedTransfer()` later executes `getPdfCacheRecord(spec.pdfCacheKey)` and constructs the PUT body from whatever record currently occupies that key.

The offscreen request does not carry/verify the originating operationId, Journal entry id, cache generation, source document id or content digest against the retrieved record before using its bytes.

### 4. Deterministic same-tab corruption schedule

A valid schedule exists without requiring simultaneous debugger attachment:

1. operation A finishes `Page.printToPDF`, detaches debugger and stores Blob A under `tab:X`;
2. A continues through slower Yandex folder/account/upload-link preparation;
3. operation B in the same tab starts after A's print phase, forms PDF B and overwrites `tab:X` with Blob B;
4. A obtains its signed upload link and asks offscreen to upload `tab:X`;
5. offscreen reads Blob B and sends B's bytes to A's remote path while the worker still holds A's filename/meta/journalEntryId/expected byte count;
6. if B happens to have the same byte length as A, the current exact-size verification does not expose the substitution; A can be finalized with metadata for A but bytes from B.

If sizes differ, the final size check can detect failure only **after the wrong bytes have already been uploaded** to A's chosen remote path, leaving an externally visible wrong/orphan object requiring reconciliation.

### 5. Cleanup can delete another live operation's retry bytes

After successful Yandex upload, both the initial-send path and explicit retry path call `deleteCachedPdf(tabId)`, which deletes the current `tab:X` record rather than the exact cache record owned by the completing operation.

Therefore A can complete after B has replaced the slot and delete B's retry cache. B can then fail later because its own bytes disappeared, or lose the user's promised safe retry artifact.

### 6. Page-local busy UX is not a worker safety boundary

A correctness invariant cannot rely on one content UI staying single-flight. The same tab can receive actions through content UI, popup/context menu/retry paths and hostile-page/synthetic control paths already tracked elsewhere. The service worker currently has no per-tab/per-operation PDF cache ownership lease preventing the schedule above.

## P0-079 required contract

### Immutable operation-owned cache receipt

Every generated PDF that may cross an irreversible boundary must have an immutable cache receipt, for example:

- random cache id / operation generation in the cache key;
- operationId;
- Journal entry id;
- tab id;
- exact source `documentId` / navigation generation where available (`P0-023` dependency);
- source URL;
- byte length;
- content digest/fingerprint suitable for the stronger `P1-184` remote-content proof;
- created/expiry timestamps.

The physical cache record used by an in-flight operation must never be replaceable merely because another save started in the same tab.

### Latest-retry pointer is separate from byte ownership

If UX wants one "latest retry" per tab, store that as a small versioned pointer/receipt to one immutable cache record. Replacing the pointer must not overwrite or delete bytes already owned by another in-flight operation.

Retry admission must fresh-check the pointer's source document identity per `P0-023` before authorizing use.

### Offscreen transfer must verify exact cache ownership

`pdf-cache-upload` should receive an exact immutable cache receipt/key and, before creating the request body, verify the retrieved record belongs to that operation/generation. A stale/mismatched cache record is fail-closed; do not silently upload whichever record currently resolves from a mutable tab key.

### Cleanup must be compare-and-delete by owner

A completing A may delete only A's exact cache generation. It must never call a tab-wide delete that can remove B's newer/in-flight cache.

Tab close/navigation may invalidate the retry pointer, but cleanup of immutable in-flight generations must respect actual transfer settlement and bounded TTL/storage policy rather than deleting another operation's body prematurely.

### Bounded retention

Operation-scoped keys must not turn the old one-slot design into unbounded cache growth. Preserve TTL/maintenance and shared storage-admission rules; add a bounded active/retry generation policy that never evicts an actually owned in-flight generation before its physical settlement/reconciliation.

## Relation to P1-184

P0-079 proves which **local PDF bytes** belong to an operation before signed upload. P1-184 then proves which **remote object/content** resulted from that operation after upload/unknown settlement.

A local content digest can be part of both receipts, but one does not replace the other. Fixing only remote path+digest logic while offscreen can read another operation's local Blob is insufficient.

## Required deterministic regressions

1. A caches PDF A; B overwrites the old tab-level pointer/starts a newer save before A offscreen read: A still uploads A, never B.
2. A and B produce equal-sized different PDFs: byte-size equality cannot hide cross-operation substitution.
3. A completes after B cache creation: A cleanup does not delete B's cache/retry receipt.
4. B completes first: B cleanup does not invalidate A's already admitted/in-flight transfer.
5. A fails after signed PUT of wrong/unknown outcome: A's exact local content receipt remains available for P1-184 reconciliation; no fallback to B bytes.
6. Same-URL reload after cache generation: retry fails closed by exact document generation per P0-023.
7. User starts a new save while an old retry is in progress: both operations retain separate immutable byte owners; UI may choose which is "latest" without changing in-flight bodies.
8. Cache TTL/quota cleanup skips exact in-flight owner generations until actual settlement/reconciliation and remains globally bounded.

## Numbering

- New evidence-reserved `P0-079` assigned by this block.
- `P1-198` remains free.
- Existing evidence-reserved `P1-195`, `P1-196`, `P1-197` remain separate.
- No `P2-020` assigned.

Previous product test gate was not re-run by this docs-only checkpoint.
