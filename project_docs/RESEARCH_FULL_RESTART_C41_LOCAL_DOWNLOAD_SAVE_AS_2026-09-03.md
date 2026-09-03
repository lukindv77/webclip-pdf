# WebClip — fresh full-project research — C41 Local download settlement / native Save As — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `6960fab35f914b1e1e3ffe1bafa3d1f8d7ca144e`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`  
Exact `offscreen.js` blob: `a5f84b928e530222c50c704b80ab30418349f68e`  
Exact `prepared-save-as.js` blob: `f33efc5e5340f615fd183dcd37f096f541b1f282`  
Exact `local-download-identity.js` blob: `0f6a5c39a72aee248e52137d68b896e47b40f8ca`  
Scope: fresh-restart coordinate **C41 — Local download physical settlement / native Save As**.

## Result

**C41: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-AUTOMATIC-DOWNLOAD/EXACT-ID/LATE-SETTLEMENT/PREPARED-STARTED-RELEASE/PAGE-OWNER CONTROLS; NATIVE-L5 OPEN (P1-146, P1-156; P1-064 supporting, P0-039/P0-048 positive)`.**

The automatic path reached a real unpacked Chrome extension, created a physical PDF file and appended a Journal entry. Deterministic current-source controls passed for durable pre-start intent, lost/late `downloads.download()` settlement, exact DownloadItem identity and unknown retention without duplicate automatic start.

The native Save As page-owner path also passed its browser-executed single-call and PREPARED/STARTED/RELEASE controls, but the Downloads API was mocked and no real OS file chooser was exercised. Fresh source inspection confirms five remaining lifecycle/truthfulness gaps: pre-STARTED Blob expiry, a page-crash receipt window, missing worker watcher reconstruction, insufficient STARTED field validation, and terminal success recorded at DownloadItem start rather than physical completion.

C41 therefore advances from unknown to a bounded L4 partial classification and remains **OPEN** for the native L5/restart matrix. No new P-code is needed. Runtime, Registry wording/status, manifest `0.9.8` and release readiness are unchanged; release remains **NOT READY**.

## Evidence level and boundary

The accepted tranche combines:

- L1 exact-source inspection of automatic and prepared Save As state transitions;
- deterministic current-source tests for P1-146 late settlement, P0-048 exact identity, P0-039 unknown retention and existing prepared Save As ordering/ownership controls;
- browser execution of the prepared Save As page owner with a mocked `chrome.downloads` API;
- L4 real unpacked Chrome execution of the automatic local PDF path, including a physical saved PDF and Journal record.

It does **not** claim L5 native Save As success/cancel/unknown behavior, actual OS-dialog lifetime, real owner-page/worker restart during that dialog, or browser restart durability.

## Accepted exact-source execution

- Google Chrome `152.0.7977.64`;
- workflow run `33715164705`;
- job `100522698189`;
- exact accepted workflow head `577322daad134340d21a16a7938ff24c95c16174`;
- conclusion **SUCCESS**;
- temporary raw-result receipt commit `b7932fe279d74903fad02bd6b0bfee43bffa0e03`;
- raw result SHA-256 `97f930df52c66a40bf7832d9d09b6347bc80af9f24d7db948287e4a6c4f0190a`;
- durable harness `project_tools/research_c41_local_download_saveas.py`.

Two previous combined runs are not accepted evidence: the first lost the inspection target when an article tab became active; the second produced the expected physical result but an overbroad static assertion matched `Promise.race` in a comment. The accepted run keeps the article in a background tab and scopes the assertion to executable call syntax inside `start()`.

## Accepted execution matrix

| Control | Boundary | Result |
|---|---|---|
| P1-146 automatic start late settlement | Deterministic current source | PASS |
| P0-048 exact local-download identity | Deterministic current source | PASS |
| P0-039 unknown/dead-letter retention | Deterministic current source | PASS |
| Prepared Save As page ownership | Deterministic current source | PASS |
| PREPARED/STARTED/RELEASE ordering | Deterministic current source | PASS |
| Page-owned Save As call in Chrome | Browser, mocked Downloads API | PASS: one pending call, no caller timeout/release |
| Automatic local PDF | Real unpacked Chrome | PASS: physical PDF plus Journal entry |

The real automatic artifact was 29,827 bytes with a `.pdf` filename, and the run observed Journal entry `f7b9c3dc-e3d2-41c2-9957-e8fdc7a8d61d`. Ephemeral extension, tab, filename and entry identifiers are receipts for this run, not stable product identity.

## Automatic-download positive controls — P1-146

Current `generatePdfAndDownload()` durably checkpoints local-download intent before the non-cancellable `chrome.downloads.download()` start. `startAutomaticBlobDownloadBounded()` calls the browser once; if the outer response is unknown at its local deadline, it keeps the settlement pending and does not start a second download. A late numeric id is bound to the existing intent.

`local-download-identity.js` keeps the exact Blob URL as the primary candidate identity and requires uniqueness before fallback binding. P0-048 therefore remains DONE. P0-039 remains DONE because disappearance from Chrome history transitions the durable row to bounded unknown/manual resolution instead of fabricating success or silently dropping the only checkpoint.

The accepted real unpacked run establishes the physical success path. Actual worker termination during automatic unknown/late settlement remains part of the C41 L5 continuation; the deterministic control is not mislabeled as a physical restart.

## Native Save As positive controls

Current `prepared-save-as.js::start()` awaits one `chrome.downloads.download({saveAs:true})` call without an executable local `Promise.race()` or `setTimeout()`. The visible extension page owns the unbounded native interaction. The browser control observed exactly one pending call and no premature caller release.

The worker uses distinct session keys for PREPARED, STARTED and RELEASED. Checkpoint mutations serialize behind actual storage settlement, active PREPARED admission is capped, and RELEASED is written before Blob revocation. These controls preserve important parts of P1-156 and must remain.

## Fresh P1-156 lifecycle findings

### Pre-STARTED Blob lifetime is still timed

`offscreen.js` applies `BLOB_URL_FALLBACK_TTL_MS = 16 * 60 * 1000` to the prepared Blob URL. STARTED cannot exist until the user completes/cancels the native dialog and `downloads.download({saveAs:true})` settles. A dialog open longer than the common TTL can therefore lose its exact backing Blob even though the caller itself has no timeout.

### Page-crash receipt window

After Chrome returns a numeric DownloadItem id, the page arms its local watcher and then sends `WEBCLIP_PREPARED_SAVE_AS_STARTED`. If the page closes/reloads in that interval, the worker may retain PREPARED without ever learning the id. The physical side effect may already exist, so retrying a fresh Save As would be unsafe.

### Worker watcher is armed before durable STARTED

The STARTED handler currently calls `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)` before `markPreparedSaveAsStarted(...)`. A worker termination between those operations loses the in-memory watcher while durable STARTED is absent. Reversing order alone is not sufficient, but durable commit must precede reliance on an ephemeral watcher.

### STARTED does not validate the immutable PREPARED receipt

`markPreparedSaveAsStarted()` checks that PREPARED exists and RELEASED does not. It does not compare the stored PREPARED `blobUrl`, `ownerPage` or `operationId` against the transition request before constructing STARTED. A session id alone is weaker than exact artifact/owner-generation authority.

### No worker-restart reconstruction

The active Save As index is used for create/release bookkeeping, but current startup/maintenance does not reconstruct STARTED watchers from indexed durable records and exact `downloads.search({id})`. If both the original page and worker disappear, terminal complete/interrupted state can remain unconsumed.

### STARTED is reported as terminal export success

`WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED {status:'started'}` records OperationLog stage `complete` and finishes it as `success` immediately after Chrome has created the DownloadItem. The same DownloadItem can later become `interrupted`. Resource cleanup code already observes complete/interrupted, but that physical terminality is not used as the authoritative user/diagnostic outcome.

## Platform semantics

Chrome's Downloads API separates start acceptance from later DownloadItem states: `downloads.download()` resolves to an id, while `complete` and `interrupted` are subsequent states observable through `onChanged` and exact `search({id})`. The `saveAs` option opens a file chooser and `conflictAction:'uniquify'` may change the final filename. Primary reference: https://developer.chrome.com/docs/extensions/reference/api/downloads

`chrome.storage.session` is available to service workers and survives a worker restart while the extension remains loaded, but it is in-memory extension-session storage and is cleared when the extension is disabled/reloaded/updated or the browser restarts. It cannot by itself satisfy a browser-restart durable receipt. Primary reference: https://developer.chrome.com/docs/extensions/reference/api/storage

These platform facts constrain the result; they do not substitute for the project evidence above.

## B1–B9 mapping

| Boundary | Fresh C41 result |
|---|---|
| B1 User Intent | One automatic/save-as intent must never authorize a blind second non-cancellable start. |
| B2 Admission / exact generation | Automatic Blob identity is checked; Save As STARTED does not validate all PREPARED fields. |
| B3 Capture | Not the primary boundary in this coordinate. |
| B4 Static Materialization | Prepared exact Blob is the source artifact for both download paths. |
| B5 Renderer | Real automatic path generated a valid physical PDF. |
| B6 Physical Artifact | Automatic path created one physical PDF; real native Save As remains untested. |
| B7 Persistence / Transfer | Automatic intent/late settlement controls pass; prepared Save As restart reconstruction remains absent. |
| B8 Journal / Provenance | Automatic success appended Journal; native export reports success at start rather than terminal completion. |
| B9 Later Reading / Recovery | Exact saved-file/native chooser and browser-restart recovery remain L5 work. |

## Owner reconciliation

- **P1-146 ACTIVE** owns automatic non-cancellable start, unknown response and restart reconciliation.
- **P1-156 ACTIVE** owns native user-owned dialog lifetime, exact PREPARED/STARTED/RELEASE lifecycle, Blob pinning, DownloadItem reconciliation and owner-page/worker restart cleanup.
- **P1-064 ACTIVE** remains supporting bounded/fair recovery for accumulated local-download rows.
- **P0-039 DONE** and **P0-048 DONE** are positive unknown-retention and exact-identity controls; neither is reopened.

No new P-code or Registry wording/status change is warranted.

## Architecture direction

Persist one immutable intent/artifact receipt before either start. For automatic download, retain the current no-blind-retry rule and make exact-id terminal reconciliation reconstructible after worker loss. For Save As, lease the Blob to the actual owner/dialog state rather than wall-clock TTL, atomically validate PREPARED fields when committing STARTED, durably commit STARTED before relying on watchers, and reconstruct reconciliation from exact DownloadItem ids. Journal/OperationLog success must follow exact physical `complete`; cancel, interrupted and unknown must remain distinct.

## Remaining C41 exit evidence

In real interactive unpacked Chrome:

1. exercise automatic response-loss/worker-restart/retry without duplicate start;
2. exercise native Save As success, user cancel and unresolved dialog lifetime;
3. terminate/reload the owner page before STARTED and terminate/restart the worker after STARTED;
4. reconcile with exact `downloads.search({id})` through complete/interrupted/unknown;
5. prove one durable intent maps to at most one DownloadItem and one truthful terminal Journal/OperationLog outcome;
6. classify browser-restart behavior separately from service-worker restart.

Until that matrix passes, C41 remains open and C42 is queued rather than declared the next executed coordinate.
