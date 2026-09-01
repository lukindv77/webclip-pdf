# P0-065 — offscreen Blob pre-materialization admission closure — 2026-09-01

Canonical owner/status authority remains `RESEARCH_REGISTRY.md`.

Canonical source baseline for this tranche: `main = ae469794fd7a42acf166ae7bf32630995b2c3eb1` (P0-064 merged; post-merge Repository Integrity #215 SUCCESS).

Accepted current-browser evidence head: `fcbbee13ebeebe11ae99e0280c502ae9bebf0f5f`.

Accepted GitHub Actions evidence:

- workflow run `33468032924`;
- job `99731844838`;
- Google Chrome for Testing `152.0.7977.64`;
- conclusion: **SUCCESS**.

Subsequent changes before PR delivery are limited to deletion of the temporary evidence workflow and durable research/status/index documentation. No accepted runtime/test source used by the evidence is changed after the evidence head.

## 1. Owner question

P0-065 required offscreen Blob creation to have **count/byte reservation before large Blob materialization**, rather than allocating the large Blob first and checking the Blob-URL ledger only afterwards.

This is a memory/admission-order owner. It is distinct from:

- P0-064 flattened-frame DOM materialization budget;
- signed Yandex transfer admission, which already reserves transfer count/bytes before `handleSignedTransfer()` performs its Blob/fetch work;
- P1-167 broader PDF preparation/diagnostic shared-work budgeting;
- Blob URL lifecycle/revocation after successful creation.

## 2. Fresh source finding before the fix

Current `offscreen.js` already has useful post-materialization controls:

- `MAX_ACTIVE_BLOB_URLS = 12`;
- `MAX_ACTIVE_BLOB_BYTES = 256 MiB`;
- `registerBlobUrl(blob)` rejects when the active count or active bytes would exceed those limits;
- fallback and explicit revocation reduce the active Blob URL ledger.

But all three Blob-URL creation handlers reached that ledger **after** materialization:

1. `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL` calls `cachedPdfRecordToBlob(record)` before `registerBlobUrl(blob)`;
2. `WEBCLIP_CREATE_TEXT_BLOB_URL` executes `new Blob([text], ...)` before `registerBlobUrl(blob)`;
3. `WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL` awaits `getTransferChunkedBlob(...)` before `registerBlobUrl(blob)`.

Therefore a request could allocate a large Blob and only then discover that count/byte admission was unavailable. That is exactly P0-065.

Signed transfer modes are not the missing root: `WEBCLIP_SIGNED_TRANSFER` already calls `reserveSignedTransferAdmission(message)` before `handleSignedTransfer()`, and that reservation follows the actual transfer promise rather than caller response timeout.

## 3. Implemented boundary

The fix deliberately does **not** rewrite the large `offscreen.js` data/transfer code or globally replace native `Blob` semantics.

`offscreen.html` now loads:

1. `offscreen-blob-admission-guard.js`;
2. `offscreen-bootstrap.js`.

`offscreen-bootstrap.js` loads `offscreen.js` only after the guard reports a successful install. If the message boundary or `URL.revokeObjectURL` cannot be wrapped, the runtime script is not loaded. This is fail-closed rather than silently falling back to the old allocate-then-check path.

The guard wraps the offscreen runtime message listener before `offscreen.js` registers it. For the three Blob-URL creation message types it reserves:

- one Blob-URL slot;
- bytes against the same 256 MiB active envelope.

Reservation sizes are known before the existing handler can materialize its Blob:

- PDF cache Blob URL: conservative upper bound `floor(64 MiB base64 chars × 3/4) = 48 MiB`;
- staged text Blob URL: existing transfer maximum `64 MiB`;
- direct text Blob URL: exact UTF-8 byte length computed by a bounded code-unit walk without constructing a Blob or a full encoded byte buffer.

Pending and active reservations share one count/byte accounting domain. A pending reservation remains owned until the existing handler actually calls `sendResponse`.

On successful `{ok:true,url,size}` response the pending reservation becomes active accounting using the actual Blob size. The actual size is required not to exceed the already reserved amount. On failure the pending reservation is released.

`URL.revokeObjectURL` is wrapped so both explicit revocation and the existing offscreen fallback timer release the active guard accounting at the same physical revocation boundary.

The existing `registerBlobUrl()` remains in place as a second independent post-materialization consistency barrier.

## 4. Deterministic exact-source proof

`project_tools/test_p0_065_offscreen_blob_admission.js` executes the real guard source in a VM and binds it to the exact current `offscreen.js`/HTML/bootstrap structure.

It proves:

- UTF-8 accounting is exact for ASCII, Cyrillic and surrogate-pair emoji controls;
- a direct-text request owns a pending count/byte reservation **before** the wrapped product listener is entered;
- four held staged-text requests reserve the complete 256 MiB envelope before any simulated materialization and a fifth request is rejected before the product listener is called;
- twelve active small Blob-URL requests consume the complete count envelope and a thirteenth request is rejected before the product listener is called;
- real revoke-hook semantics release active guard accounting;
- guard constants remain aligned with the current `offscreen.js` active Blob limits and PDF/transfer upper bounds;
- the current three product handlers still materialize before their legacy `registerBlobUrl()` post-check, so the pre-listener guard remains a required boundary rather than a redundant test fixture;
- `offscreen.html` cannot load `offscreen.js` directly around the fail-closed bootstrap.

Accepted result on evidence head: **`P0-065 offscreen pre-Blob admission: PASS`**.

## 5. Chrome 152 offscreen proof

`project_tools/research_p0_065_offscreen_blob_admission.py` builds a real MV3 extension fixture from the product `offscreen.js`, guard, bootstrap and HTML, creates an actual `chrome.offscreen` document, and sends real runtime messages from its service worker.

Accepted Chrome result:

- browser: `Google Chrome for Testing 152.0.7977.64`;
- 12 real `WEBCLIP_CREATE_TEXT_BLOB_URL` requests succeed and return Blob URLs;
- request 13 returns:
  - `ok: false`;
  - `code: OFFSCREEN_BLOB_BUDGET_EXCEEDED`;
- this `code` is emitted by the pre-listener guard. The legacy `offscreen.js` post-materialization catch for this handler returns only `{ok:false,error}` and therefore cannot explain the accepted response;
- after real `WEBCLIP_REVOKE_BLOB_URL` calls, a fresh Blob URL succeeds again (`size: 19`).

Source SHA-256 values retained by the accepted run:

- `offscreen-blob-admission-guard.js`: `16d0f22ed5a5906d6aea99259c42f829e3d36cb6b58f5475c3201d863815cfaf`;
- `offscreen-bootstrap.js`: `9b26986fd0d2ea94d89a70320cab787e9019491ee7798c2f7d460cc5e3bfff51`;
- `offscreen.html`: `0be4f97839b1bc4503588be07c29ac9c1fcb02dbf932d22dae37aff3ed64b5a4`;
- `offscreen.js`: `ac73b9e1162d83eb0b8e436d217efe0244d9e8c133356640571960ea7afbbb01`.

## 6. Alternative implementation check / dedup

During the accepted CI run a separate unmerged experimental branch named `fix/p0-065-offscreen-blob-preallocation-2026-09-01` became visible. It has no open PR and is not a current authority.

That experiment globally replaces `Blob`, `fetch`, `URL.createObjectURL` and `URL.revokeObjectURL`, introduces a new 64 MiB single-Blob limit and tracks only Blob materializations above a threshold. It is intentionally **not** adopted here because it broadens the owner into unrelated signed-transfer/import Blob paths, changes currently admitted direct-text behavior, and does not pre-reserve the existing 12-slot count for small Blob URLs.

The delivered boundary is narrower: it fixes the three concrete missing Blob-URL admission paths while preserving native Blob semantics and the already-existing signed-transfer reservation model.

## 7. Closure decision

P0-065 can transition to **DONE** after ordinary PR delivery gates because:

1. every currently identified Blob-URL materialization path is preceded by count/byte admission;
2. the reservation happens before the existing handler enters its Blob-producing code;
3. pending requests count against the same aggregate envelope, so concurrent requests cannot all allocate first and race the legacy post-check;
4. successful URLs retain active accounting until physical `URL.revokeObjectURL`;
5. failed requests release pending accounting;
6. the existing post-materialization `registerBlobUrl()` remains as a second consistency check;
7. real Chrome 152 proves the guard/bootstrap/runtime-message lifecycle and count/revoke behavior;
8. deterministic exact-source tests prove byte and pre-materialization ordering without allocating huge test Blobs.

## 8. Residual boundaries

This closure does **not** claim:

- every offscreen memory allocation is globally budgeted;
- P1-167 shared preparation/diagnostic work budgeting is closed;
- P1-003 renderer-resource task lifetime is closed;
- signed Yandex transfer/recovery owners are closed;
- release readiness.

`RELEASE_READINESS.md` remains **NOT READY**. No manifest version, build, tag or GitHub Release is changed by this tranche.
