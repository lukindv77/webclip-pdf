# Offscreen resource / IndexedDB audit delta — 2026-08-27

Baseline source HEAD: `4906002ad9388bf885ab9effa037e0405da4c9e6`.

This checkpoint records fresh evidence against existing P1 items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P1-054 status correction — Blob budget is enforced after materialization

Canonical P1-054 currently says offscreen Blob URLs are protected by a global resource budget: max 12 active URLs and 256 MiB aggregate Blob-size. Fresh code review shows that this protects **registered active URLs**, but does not protect the memory peak required to construct/read the next Blob before admission.

Current `registerBlobUrl(blob)` behavior:

1. receives an already-created `Blob`;
2. reads `blob.size`;
3. rejects if `blobUrls.size >= 12` or `activeBlobUrlBytes + size > 256 MiB`;
4. only after that creates the object URL and accounts the bytes.

All three Blob creation paths materialize first and call `registerBlobUrl` second:

- `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`: `getPdfCacheRecord()` has already returned the cached `pdfBlob` (up to the PDF bound) and `cachedPdfRecordToBlob()` returns/creates the Blob before registration. For blob-v3 this avoids Base64 decode, but the new Blob/reference is still outside `activeBlobUrlBytes` until after the read/materialization.
- `WEBCLIP_CREATE_TEXT_BLOB_URL`: receives the full string, constructs `new Blob([text], ...)`, then applies the global Blob-URL budget.
- `WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL`: `getTransferChunkedBlob()` reads/retains all required chunks and creates the aggregate Blob before `registerBlobUrl()` checks aggregate active Blob budget.

Therefore, with e.g. ~240–250 MiB already registered, another 48–64 MiB candidate can be materialized in the offscreen heap/Blob subsystem and only then rejected. The final URL/accounting invariant remains ≤256 MiB, but the **admission memory peak** can exceed it materially.

Required correction to P1-054:

- Treat P1-054 as PARTIAL until admission occurs before expensive Blob materialization/read aggregation.
- Reserve expected bytes atomically against the same global Blob budget before reading a large PDF record into the active creation path or assembling chunked export data.
- For staged payloads, use already-known manifest `totalBytes` as pre-admission whenever possible; do not first aggregate all chunks merely to discover size.
- For PDF retry-cache, use authoritative cached byte metadata before exposing the Blob to the Blob-URL creation path.
- For direct text, establish a conservative UTF-8/Blob byte upper bound before constructing a potentially very large Blob; sender-side prebound does not replace offscreen authoritative admission.
- Reservation must follow actual creation settlement: failure releases exactly its reservation; caller timeout/response loss must not release while the offscreen creation may still complete.
- Registered Blob bytes + creation reservations must remain within one explicit aggregate budget.

Required regressions:

1. Hold active registered Blob bytes near the 256 MiB cap; request another maximum PDF/staged Blob. The request is rejected **before** aggregate Blob construction/IDB chunk retention attributable to that candidate.
2. Two concurrent create requests cannot both pass a stale pre-check and oversubscribe the cap.
3. Lost response after successful object-URL creation retains reservation/accounting until actual URL cleanup/TTL.
4. Existing max-12 URL count remains enforced together with byte reservations.

No new P1 number is assigned because this is the same resource-budget contract already owned by P1-054. P1-038 remains correctly scoped to removal of Base64→binary PDF decode peak and does not close this aggregate-admission issue.

## Existing P1-086 reconfirmation — readonly IDB result publication still precedes transaction completion

Fresh offscreen review reconfirms the exact PARTIAL paths already documented under P1-086:

- `getPdfCacheRecord()` calls `guard.resolve(resolve, req.result)` directly from `IDBRequest.onsuccess`;
- `getTransferPayload()` does the same;
- `getTransferChunkedBlob()` resolves the collected chunk array immediately after the last request success.

`timeoutIdbTransaction()` treats that Promise as settled; a later `tx.onerror`/`tx.onabort` cannot revoke the already-published result. Those results can then feed Blob construction or signed `fetch`.

By contrast, fresh review confirms that offscreen write/delete staging paths such as storing downloaded transfer records and deleting transfer groups resolve from `tx.oncomplete`. No additional early-publish write path was found in this block.

Required P1-086 implementation remains: request handlers only accumulate `pendingResult`; outer Promise resolves from `tx.oncomplete`; timeout/error/abort wins even if every request already reported success.

## Existing P1-156 / P1-169 reconfirmation — prepared Save As remains the owner-lifetime issue

Fresh `prepared-save-as.js` / offscreen review reconfirms, without adding a new item:

- `chrome.downloads.download({saveAs:true})` intentionally has no artificial caller timeout;
- page listener is armed only after `downloads.download()` returns an id, so a very fast/missed terminal event still requires the P1-156 `downloads.search` reconciliation path;
- `WEBCLIP_PREPARED_SAVE_AS_STARTED` is secondary worker cleanup, not the native-dialog owner;
- offscreen still gives every Blob URL a `BLOB_URL_FALLBACK_TTL_MS = 16 min`, which is incompatible with arbitrarily long user-owned Save As dialog unless P1-156 pins/leases prepared-save Blob lifetime explicitly;
- released tombstone retention remains P1-169.

No new number is assigned.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.
