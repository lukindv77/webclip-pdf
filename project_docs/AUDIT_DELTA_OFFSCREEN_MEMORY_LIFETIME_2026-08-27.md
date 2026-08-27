# Audit delta — offscreen memory admission and Blob lifetime — 2026-08-27

Baseline HEAD before this audit block: `b9f6d531bb9192b1eab2d64a67ea2e148e13288d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh review of offscreen resource admission and lifetime around existing `P0-063`, `P0-065`, `P1-054`, `P1-156`, `P1-169`, and dormant-capability item `P2-018`.

## P0-063 — signed transfer admission is structurally before materialization

Current offscreen signed-transfer handling reserves capacity synchronously when `WEBCLIP_SIGNED_TRANSFER` is admitted:

- max 2 actual signed transfers;
- max 96 MiB aggregate reservation;
- `pdf-cache-upload` reserves a conservative PDF upper bound;
- text/chunk upload reserves 64 MiB;
- text download reserves its bounded maximum.

Only after that reservation does `handleSignedTransfer()` read IDB/build the Blob/start fetch. Reservation is released in `.finally()` of the **actual offscreen transfer promise**, not a caller-side runtime deadline.

This is the correct shape required by P0-063. Preserve it when fixing the Blob-URL paths; do not regress signed transfer admission into a post-materialization accounting check.

## P0-065 / P1-054 — Blob URL budget is still too late

`registerBlobUrl(blob)` enforces the useful P1-054 cap (12 active URLs / 256 MiB active Blob bytes), but every creation path reaches it only **after** its large object exists:

### PDF cache Blob URL

`WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`:

1. reads the full cache record;
2. converts/returns its PDF Blob via `cachedPdfRecordToBlob()`;
3. only then calls `registerBlobUrl(blob)`.

Legacy/base64 compatibility can therefore pay decode/materialization cost before discovering that aggregate Blob budget is already exhausted.

### Inline text Blob URL

`WEBCLIP_CREATE_TEXT_BLOB_URL`:

1. bounds `text.length` to 64 MiB UTF-16 code units;
2. creates `new Blob([text])`;
3. only then calls `registerBlobUrl(blob)`.

Character count is not the byte size of the resulting UTF-8 text Blob. A valid non-ASCII string can produce a substantially larger Blob than its code-unit count. If existing active Blob usage is already high, the new large Blob is fully materialized and only then rejected by the aggregate cap.

### Staged/chunked export Blob URL

`WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL` calls `getTransferChunkedBlob()` first and calls `registerBlobUrl()` after the complete Blob has been reconstructed. Importantly, the staged manifest already exposes validated `totalBytes` before chunk materialization. That size can be used for pre-admission instead of waiting until after assembly.

### Required P0-065 contract

Create a Blob-URL reservation object analogous to signed-transfer reservation:

- reserve URL slot + byte upper bound **before** large IDB read/decode/assembly/new Blob;
- for staged text, reserve using validated manifest `totalBytes` before reading chunks;
- for PDF cache, read a small metadata/size record first or maintain a separately validated size receipt so the full Blob is not required to decide admission;
- for inline text, conservatively reserve a safe UTF-8 upper bound from UTF-16 length before `new Blob`, then resize to actual `blob.size` after materialization;
- atomically convert reservation into registered object URL;
- release on all failure paths and on revoke/lifecycle cleanup;
- a caller/runtime timeout must not free a reservation while actual Blob creation remains unresolved;
- global active Blob bytes must mean `reserved + materialized`, not only already registered URLs.

P1-054 remains useful as the final registered-URL cap; P0-065 is the pre-materialization admission layer required to make that cap a memory guarantee rather than only retained-resource accounting.

## P1-156 — prepared Save As is still subject to generic 16-minute TTL

All offscreen Blob URLs get the same `BLOB_URL_FALLBACK_TTL_MS = 16 min` timer in `registerBlobUrl()`. There is no pin/lease mode for a native Save As dialog.

Prepared Save As records are created in service-worker session storage, but offscreen does not know that a Blob URL belongs to a still-live page-owned native dialog. Therefore a user who keeps the OS/browser Save As dialog open longer than the generic TTL can lose the backing Blob even though the product invariant says native Save As is user-owned and must not have an artificial wall-clock timeout.

Required P1-156 refinement:

- prepared/native Save As Blob needs an explicit owner pin/lease separate from automatic-download TTL;
- release only after actual `downloads.download({saveAs:true})` settlement + terminal/reconciled download lifecycle or explicit crash cleanup;
- owner-page loss requires durable reconciliation/GC, not a fixed dialog timeout;
- ordinary automatic Blob downloads may keep their bounded deadline/cancel policy.

## P1-169 — RELEASED tombstones remain unbounded

`releasePreparedSaveAsCheckpoint()` writes a distinct `...:released` tombstone and removes `prepared/started`, which correctly prevents late generations from resurrecting the session. However:

- released keys are not in the active index;
- no TTL/GC path for the released prefix was found;
- the only uses of `PREPARED_SAVE_AS_CHECKPOINT_PREFIX` are key construction/active transitions, not a cleanup scan.

So a long browser session can accumulate released tombstones without bound. Preserve a bounded retention window long enough to defeat late PREPARED/STARTED settlements, then GC them by age/generation. GC must itself be serialized with checkpoint transitions so it cannot remove a tombstone while an older actual storage mutation is still capable of arriving.

## P1-156 active-index crash case reconfirmed

The active prepared index has cap 64, but there is no recovery GC for owner-page loss after PREPARE and before RELEASE. Repeated abandoned native-save sessions can therefore eventually make the browser session permanently return `WEBCLIP_PREPARED_SAVE_AS_LIMIT` until session storage is cleared/restarted.

Need owner-liveness/reconciliation that distinguishes:

- never-started abandoned PREPARED;
- STARTED with a real DownloadItem that can be found via `downloads.search`;
- active user-owned native dialog that must remain pinned;
- terminal/released session safe for bounded tombstone retention.

## P2-018 — dormant text-payload upload confirmed

Fresh runtime search finds `putTransferTextPayload()` only at its definition in the service worker and no `text-payload-upload` caller. Offscreen still exposes the mode.

This reconfirms P2-018's preferred direction: remove the dormant privileged mode/helpers/constants unless a real feature owns them. If retained for future use, its admission must be byte-based before Blob construction; 64 MiB text code units are not equivalent to 64 MiB UTF-8 bytes.

## Required regressions

1. Existing 250 MiB registered Blob + new large staged/inline request is rejected before large Blob materialization.
2. Non-ASCII inline text reserves a conservative byte bound before `new Blob` and cannot transiently exceed global resource budget.
3. Staged export admission uses manifest `totalBytes` before chunk reads/Blob assembly.
4. Reservation remains held through lost/timed-out response until actual Blob creation settles.
5. Native Save As remains usable with a dialog open beyond 16 minutes; automatic downloads retain their bounded lifetime policy.
6. Abandoned PREPARED sessions are reconciled/GC'd without deleting a genuinely active native Save As.
7. RELEASED tombstones remain bounded while still preventing late PREPARED/STARTED resurrection.
8. Dormant `text-payload-upload` is removed or receives an explicit live owner + byte-safe tests.

## Classification

No new P-number created. Extend/refine existing `P0-065`, `P1-156`, `P1-169`, `P2-018`; preserve `P0-063` and `P1-054` invariants.

Previous product test gate was not re-run by this docs-only audit checkpoint.
