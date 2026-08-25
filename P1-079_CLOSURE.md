# P1-079 closure — Full Journal native Save As owner

Status: **REGRESSION**. History-reserved code reused as specified; no new P-code assigned. Manifest remains **0.9.8 / Manifest V3**.

## Problem

Full Journal export still invoked `chrome.downloads.download({saveAs:true})` from the MV3 service worker. A native Save As call can legitimately stay pending while the user interacts with the system dialog; the worker is not a stable lifetime owner for that wait and must not apply a synthetic timeout/retry to it.

## Closure

- `service-worker.js` now only builds the bounded Journal export, creates the offscreen Blob URL and returns `{blobUrl, filename, entryCount, operationId}` through `WEBCLIP_JOURNAL_EXPORT_PREPARE`.
- `journal.html` loads `prepared-save-as.js`; `journal.js` calls `WebClipPreparedSaveAs.start(prepared)` and therefore owns the actual `chrome.downloads.download({saveAs:true})` invocation.
- The native dialog call has **no caller `Promise.race`/timeout and no automatic retry**. User interaction latency is not treated as a hung Chrome API.
- Reject/cancel releases the prepared Blob. Successful start arms page-owned terminal `downloads.onChanged` cleanup and also registers the existing worker watchdog as a secondary cleanup path.
- Journal OperationLog is finalized after the page-owned Save As start settles; preparation failure is recorded fail-closed.
- `WEBCLIP_JOURNAL_EXPORT_PREPARE` and settlement messages accept only `journal.html` as owner.
- P1-129 durable prepared-session/late-settlement serialization is intentionally not claimed by this closure.

## Evidence

- `project_tools/test_p1_079_080_save_as_owner.js` PASS.
- `project_tools/browser_p1_079_080_save_as_owner.py` PASS on Chromium `144.0.7559.96`: pending native dialog simulation keeps exactly one call alive without timeout/release/retry; success arms terminal cleanup.
- Full post-change gate: **68/68** JavaScript syntax PASS; **55/55** deterministic tests PASS.
- Neighbor regressions: P1-008 Options PASS, P1-009 Journal PASS, managed P1-007 PASS; selected-only PDF **37,604 bytes**.

Real unpacked Chrome native Save As interaction remains release QA.
