# P1-080 closure — OperationLog native Save As owner

Status: **REGRESSION**. History-reserved code reused as specified; no new P-code assigned. Manifest remains **0.9.8 / Manifest V3**.

## Problem

OperationLog JSON export still invoked native `chrome.downloads.download({saveAs:true})` from the MV3 service worker. The system Save As dialog is user-owned and can remain pending longer than a worker lifetime; treating that wait as worker-owned risks suspension/unknown settlement and unsafe duplicate retry patterns.

## Closure

- `service-worker.js` now performs only bounded log read/sanitization/serialization and returns prepared `{blobUrl, filename, operationId}` through `WEBCLIP_OPERATION_LOG_EXPORT_PREPARE`.
- `options.html` loads the same `prepared-save-as.js`; `options.js` owns the native `chrome.downloads.download({saveAs:true})` call.
- The Save As promise is awaited without a caller timeout and is never automatically retried while pending/unknown.
- Reject/cancel releases the prepared Blob; success arms page-owned terminal cleanup plus the worker cleanup watchdog.
- Foreign/non-WebClip Blob URLs are rejected before any Chrome download side effect.
- Preparation is restricted to `options.html`; generic prepared-Blob cleanup/start messages accept only `journal.html` or `options.html`.
- This closure does not claim P1-129 durable prepared-session checkpoint serialization.

## Evidence

- `project_tools/test_p1_079_080_save_as_owner.js` PASS and asserts **zero** `saveAs:true` call-sites remain in `service-worker.js`.
- `project_tools/browser_p1_079_080_save_as_owner.py` PASS on Chromium `144.0.7559.96`.
- Full post-change gate: **68/68** JavaScript syntax PASS; **55/55** deterministic tests PASS.
- P1-008 Options, P1-009 Journal and managed P1-007 browser regressions PASS; selected-only PDF **37,604 bytes**.

Real unpacked Chrome native Save As interaction remains release QA.
