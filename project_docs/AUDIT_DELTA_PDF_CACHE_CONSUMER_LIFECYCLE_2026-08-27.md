# Audit delta — PDF cache consumer/lifecycle ownership — 2026-08-27

Baseline HEAD before this audit block: `e6d414aed2717fa011f8c8d909bd64d44dcdfeb3`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh follow-up audit of evidence-reserved `P0-079` after the initial same-tab Yandex upload corruption proof. This pass checks every important consumer/invalidation path of the mutable `tab:<tabId>` PDF retry-cache slot: Yandex upload, local cached-PDF download, tab close/navigation/content invalidation and successful-operation cleanup.

## Result

`P0-079` is broader than the original Yandex signed-PUT scenario. The tab-owned cache key is also a time-of-check/time-of-use identity defect for local retry downloads, and tab-wide invalidation/cleanup can delete bytes owned by a different already-admitted or in-flight operation.

No new P-number is created. `P1-199` remains free after duplicate check.

## Exact runtime proof

### 1. Cache metadata validation and Blob creation are separate reads of a mutable slot

`downloadCachedPdf(tabId, operationId)` first calls `getValidCachedPdfForTab(tabId)`.

That helper reads metadata for `pdfCacheKey(tabId)`, checks TTL and fresh current tab URL against cached source URL, and returns metadata object A.

Only later `downloadCachedPdf()` calls:

`createPdfCacheBlobUrl(cached.key)`.

`createPdfCacheBlobUrl()` sends the key to offscreen. Offscreen independently executes `getPdfCacheRecord(pdfCacheKey)` and constructs a Blob from **whatever record currently occupies that key**.

There is no cache generation/owner comparison between the metadata validation and the later offscreen record read.

Therefore URL/TTL validation does not prove that the bytes later downloaded are the bytes whose metadata was validated.

### 2. Offscreen already returns the actual Blob size, but worker discards it

For `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`, offscreen returns:

- `url`;
- `size: blob.size`.

The service-worker helper `createPdfCacheBlobUrl()` returns only `response.url` and discards `response.size`.

`downloadCachedPdf()` then creates `pendingDownloads` intent using `cached.pdfByteLength` from metadata A rather than the actual Blob B size returned by offscreen.

This creates two deterministic outcomes if operation B replaces the tab slot between validation and Blob creation:

- if A and B have equal byte length, physical PDF B can be downloaded while Journal/recovery metadata still describes A, and size checks cannot detect substitution;
- if sizes differ, B can already be handed to Chrome/downloaded before later reconciliation detects an expected-size mismatch, leaving a wrong/orphan local file even though Journal finalization fails closed.

Checking the returned size would improve diagnostics for the second case but would **not** solve equal-size substitution. Exact immutable cache ownership is still required.

### 3. Tab close deletes the cache of an already-admitted operation

`chrome.tabs.onRemoved` unconditionally calls:

`deleteCachedPdf(tabId)`.

A Yandex save can legitimately have already:

1. completed PDF generation;
2. committed PDF bytes to IndexedDB;
3. detached debugger;
4. continued through account/folder/upload-link preparation;
5. not yet had offscreen read the cached PDF body.

Closing the source tab in that interval deletes `tab:X`. The remote save operation was already explicitly initiated by the user, but its immutable body is destroyed solely because the UI/source tab disappeared.

In an operation-owned design, tab close should invalidate current-document authority and the user-facing latest-retry pointer, but must not delete an exact byte generation still owned by an admitted transfer/reconciliation operation.

### 4. URL navigation has the same ownership conflation

`tabs.onUpdated` calls `deleteCachedPdf(tabId)` whenever `changeInfo.url` is present.

Invalidating a retry pointer on navigation is correct for `P0-023`, but deleting the physical bytes is a different decision. An already-admitted Yandex transfer can still need those bytes after the page navigates.

Document authority and physical transfer-body ownership therefore need separate lifecycle fields. A stale document may no longer authorize a **new retry**, while a transfer already admitted under the old exact document must retain its immutable body until actual settlement/reconciliation.

### 5. Content invalidation is also tab-wide

The content-allowed `WEBCLIP_INVALIDATE_PDF_CACHE` handler calls `deleteCachedPdf(tabId)` with no generation receipt.

That command may be appropriate to invalidate the current retry candidate after page state changes, but with a mutable one-slot cache it also deletes any in-flight generation occupying the same slot. Once P0-079 introduces immutable generations, invalidation must target pointer/authority state rather than indiscriminately deleting all operation-owned bodies for the tab.

### 6. Successful A can delete newer B

Both initial Yandex success and explicit retry success call `deleteCachedPdf(tabId)`.

Therefore if B replaced the slot while A was still running, A's later success deletes B's retry bytes. This is the previously confirmed same-tab cleanup corruption, now seen as the same general lifecycle error as close/navigation invalidation: cleanup is keyed by tab, not by exact owner generation.

## Required P0-079 refinement

### Separate three concepts

The implementation should distinguish:

1. **immutable physical cache generation** — exact PDF bytes plus local content receipt;
2. **in-flight owner/reference** — operation(s) whose actual transfer/reconciliation still need that generation;
3. **latest retry pointer/document authority** — which generation the current tab UI may offer for a new retry.

These have different invalidation rules and must not share one destructive `deleteCachedPdf(tabId)` operation.

### Cache receipt

Each generation should bind at minimum:

- random cache generation id/key;
- worker-issued operation receipt (`P1-198` dependency once implemented);
- journalEntryId where applicable;
- tabId;
- exact source document/navigation generation (`P0-023` dependency);
- normalized source URL;
- byte length;
- strong local digest/fingerprint usable by `P1-184` remote proof;
- created/expiry state;
- in-flight/reconciliation ownership state.

### Consumer admission

All consumers must receive the exact immutable generation, not re-resolve a mutable tab alias:

- Yandex offscreen upload;
- cached local download/Blob creation;
- explicit Yandex retry;
- any future content inspection/digest path.

Offscreen must verify that the retrieved record matches the supplied owner/generation receipt before materializing or uploading bytes.

### Cleanup semantics

- operation A success/failure may release/delete only A's exact generation when no in-flight/reconciliation owner remains;
- tab close/navigation/content invalidation removes or invalidates the retry pointer/document capability but does not evict an already-owned physical body;
- TTL/quota cleanup may reclaim only generations proven not to be needed by actual unresolved side effects/reconciliation, subject to global bounded storage policy;
- compare-and-delete by generation is required; no tab-wide deletion may remove B while A settles.

### Local cached download

The local-download path must bind metadata and Blob bytes using one immutable receipt. If offscreen returns size/digest/owner data, worker must compare it before creating the irreversible Chrome download intent. Size alone is insufficient because equal-sized different PDFs are explicitly in scope.

## Required deterministic regressions

1. Validate cache metadata A, pause before offscreen Blob read, create B in same tab, resume A: local retry downloads A or fails closed; never B.
2. A and B have equal byte length but different bytes: equality cannot hide substitution.
3. A and B have different lengths: no wrong B file is handed to Chrome before owner mismatch is detected.
4. Yandex A is admitted and waiting on folder/upload-link preparation; close source tab: A's immutable cache body remains available until transfer settlement/reconciliation.
5. Navigate source tab after A admission: new retry for stale document is blocked, but A's already admitted body is not deleted.
6. `WEBCLIP_INVALIDATE_PDF_CACHE` invalidates current retry authority without deleting a different in-flight generation.
7. A completes after B generation exists: A cleanup cannot delete B.
8. Maintenance/TTL under storage pressure cannot evict an actually owned unresolved generation; retained generations remain globally bounded by reservation/admission rules.
9. Normal single-operation local retry still creates the expected DownloadItem and Journal metadata from one exact receipt.
10. P1-184 remote verification consumes the same local digest/receipt but remains a separate remote-object proof layer.

## Classification

- Extend evidence-reserved `P0-079`; no new P0/P1 item.
- Preserve `P0-023` for exact current-document retry authority.
- Preserve `P1-184` for remote object/content proof after external settlement.
- Preserve `P1-043`/offscreen budget items for bounded storage/memory admission.
- Preserve `P1-198` for worker-issued live operation identity.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.
