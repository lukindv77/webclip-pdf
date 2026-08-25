# P1-007 closure — automated browser integration tests

Status: **REGRESSION**.

Manifest remains **0.9.8 / Manifest V3**.

## Implemented runners

1. `project_tools/browser_p1_007_managed_integration.py`
   - runs in the policy-managed Chromium available in the audit environment without bypassing enterprise policy;
   - executes production `content.js` in a real Chromium DOM and drives the real selection/download dialog path;
   - holds the mocked `WEBCLIP_GENERATE_PDF` boundary after production `prepareForPrint()`, renders with Chromium PDF, then validates selected-only output with `pdftotext`;
   - executes production `public-suffix.js` + `journal.js` and verifies real Journal DOM rendering through the documented runtime fallback boundary;
   - executes production `service-worker.js` in a browser Worker with mocked `chrome.*` and mocked Yandex `fetch`, then drives manual token/root/test/list folder messages;
   - verifies access token stays in session storage only.

2. `project_tools/browser_p1_007_unpacked_integration.js`
   - full unpacked MV3 runner for Chrome for Testing / unmanaged Chrome;
   - uses `--remote-debugging-pipe --enable-unsafe-extension-debugging` + CDP `Extensions.loadUnpacked`;
   - uses the extension ID returned by Chromium instead of path-derived guessing;
   - exercises real extension selection, `chrome.debugger` PDF, Chrome download, Journal IndexedDB/rendering, and HTTP Yandex mock flow;
   - patches Yandex API base only in the temporary test copy, never in production source.

## Local browser evidence

Executed on `Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie)`:

- selection: PASS;
- Chromium PDF render: PASS;
- selected-only PDF text: PASS (`P1-007 Browser Article` present, explicit noise absent);
- PDF size on final run: 35,886 bytes;
- Journal production UI render: PASS;
- service-worker Yandex worker mock: PASS;
- account UID: `p1-007-mock-uid`;
- folders: `Upload`, `ReadmeLater`, `Backup`;
- OAuth header path: PASS;
- session-only access token assertion: PASS;
- mocked Yandex requests: 30.

The system Chromium is enterprise-managed and rejects the unpacked runner with:

`P1-007_BROWSER_POLICY_BLOCKED: Extensions.loadUnpacked: Loading of unpacked extensions is disabled by the administrator.`

The runner does not bypass or modify that policy. Full unpacked execution therefore remains part of real Chrome release QA and is not claimed as locally passed.

## Browser-discovered regression

The first real Journal browser run reproduced an existing P1-127 regression: `journalHealthTimer` was used by `scheduleJournalHealthCheck()` without being declared. `journal.js` now declares an explicit timer lifecycle handle and `test_p1_123_127_extension_api_deadlines.js` asserts its presence. No new P-code was assigned because this is a new reproduction inside the already-closed P1-127 changed area.

## Regression protection

- `project_tools/test_p1_007_browser_harness.js` protects both browser-runner contracts;
- `project_tools/test_p1_123_127_extension_api_deadlines.js` protects the health-timer lifecycle regression;
- local gate after closure: **51/51 `node --check` PASS**, **41/41 deterministic JS tests PASS**, managed browser integration PASS, manifest JSON/MV3 PASS, version `0.9.8`.

This closure does **not** replace release QA against an actual unpacked extension plus real Chrome/Yandex service.
