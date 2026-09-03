# C46 accepted evidence — unpacked Chrome / permission UI / debugger path — 2026-09-03

Canonical source baseline: `5ad7ba6b2f29502c3810a4b5d589dd0a965b270e`.

## Classification

**C46: `L3-REVALIDATED / PARTIAL/FINDING + BROWSER-BOUND PRECONDITION CONTROLS; ACTUAL-DEBUGGER/NATIVE-PERMISSION/INCOGNITO/RESTART-L5 OPEN (P0-045, P1-157, P1-193, P1-201; P1-004 umbrella)`**.

This tranche does not create a new P-code. It revalidates existing source/root-cause families and establishes a bounded real-unpacked Chrome precondition, while refusing to promote an unresolved Chrome debugger execution error to a product defect without exact sub-call localization.

## Exact-source findings

On the canonical baseline:

- `manifest.json` requires `debugger` and keeps broad `http://*/*` / `https://*/*` host access optional.
- `manifest.json` has no explicit `incognito` key; the effective Chrome default is therefore not overridden by the extension manifest.
- popup startup calls `loadBackupStatus()` before active-tab classification, so shared backup status can be requested before a private-source context is established. This remains mapped to P0-045 / P1-193 privacy-context authority rather than a new root cause.
- the optional iframe host-permission action performs asynchronous tab/content discovery before `chrome.permissions.request(...)`; the popup API wrapper has a 10,000 ms local deadline. This remains mapped to P1-157 permission-gesture / permission-settlement authority.
- the worker contains a content-sender incognito guard and rechecks host permission before frame-agent use; these are positive controls.
- the worker has no `chrome.permissions.onRemoved` listener. Host revoke therefore has no proactive event-driven fencing of in-memory frame-agent state; command-time permission recheck remains the positive control. This stays under P1-201 / P1-004 authority.
- frame-agent registry state is worker-memory based and an already-loaded frame agent re-registers when injected again; restart/revoke/generation correctness still requires real browser evidence.
- debugger lifecycle source has bounded attach/detach, active/late-attach/pending-detach/pending-actual-settlement registries and final active-set cleanup. No `chrome.debugger.onDetach` handler exists on the baseline.

## Browser-bound execution evidence

Modern branded Google Chrome cannot be treated as a valid `--load-extension` harness. The research therefore moved to the supported Puppeteer extension loader (`enableExtensions`) with Chrome for Testing and a headed Xvfb environment.

The supported loader successfully started the unpacked MV3 extension and exposed its service worker. Early attempts were intentionally rejected as product evidence when Puppeteer itself left the fixture target debugger-attached.

The cleanest run is:

- workflow: `Research C46`
- run: `33734553680`
- job: `100581954040`
- exact workflow head: `f5e528507154f86a4971f4aa2f2f25323bd972e5`
- runner: Ubuntu 24.04
- browser family: Chrome for Testing provisioned by `puppeteer@25.9.0` (the failing run did not emit an exact browser-version string, so none is inferred here)

The harness delayed fixture creation until after Puppeteer completely disconnected. The resulting receipt proved:

- `incognitoAllowed=false` in that fresh unpacked test profile;
- the synthetic optional host origin was not silently granted;
- fixture page loaded with the expected title;
- `debuggerAttachedBefore=false` after controller disconnect;
- production `generatePdfBlob(tabId)` then failed at its debugger path with Chrome API error `Could not establish connection. Receiving end does not exist.`

Because the accepted run did not localize whether that error came from `chrome.debugger.attach` or a later debugger command, it is recorded as an unresolved browser-bound execution blocker, not as a newly proven WebClip root-cause defect.

## Rejected / diagnostic attempts

Several intermediate runs were retained only as diagnostic provenance:

- `33731815915`: source-harness string oracle was stale; failed before browser evidence.
- `33731960700` and `33732142468`: unpacked extension did not start through removed/unsupported branded-Chrome `--load-extension` behavior; environment limitation, not product evidence.
- `33732609314` / `33732761682`: Puppeteer successfully loaded MV3, but its own controller held target attachment and contaminated the debugger precondition.
- `33732981848`: post-disconnect worker-side scheduling did not return a receipt; orchestration limitation.
- `33734283885` / `33734432633`: runtime-router and browser-wide auto-attach interference were isolated and excluded.
- later headed/headless comparison diagnostics contained a test-script `process` shadowing failure and are not accepted as product evidence.

## Owner reconciliation

- **P0-045 ACTIVE**: private-context / disclosure authority remains relevant; popup startup still reads backup state before active-tab context is established.
- **P1-157 ACTIVE**: optional permission user-gesture/settlement authority remains relevant; discovery precedes `permissions.request` and the caller applies a 10 s deadline.
- **P1-193 ACTIVE**: private-window/shared-state boundary remains open for real normal/incognito-window L5 validation.
- **P1-201 ACTIVE**: revoke/regrant / generation cleanup remains open; there is no proactive `permissions.onRemoved` fencing.
- **P1-004 umbrella** remains supporting authority for restart/session-generation correctness.

No Registry wording/status change is justified by this tranche.

## Remaining C46 exit evidence

C46 stays OPEN. Exit still requires a real unpacked interactive Chrome tranche that:

1. exercises normal and incognito windows with the Chrome incognito-access control explicitly toggled and proves fail-closed private state;
2. exercises the native optional-host permission prompt from the actual popup user gesture, including denial, grant, revoke and regrant;
3. verifies revoke immediately invalidates or fences frame-agent authority and that restart does not resurrect stale authority;
4. exercises `chrome.debugger` attach / `Page.printToPDF` / stream read / detach without an external automation debugger contaminating the target;
5. repeats the debugger operation across service-worker/browser restart and proves active/pending generation cleanup;
6. records exact browser version and terminal receipts.

Runtime, manifest version `0.9.8`, Registry status and release readiness are unchanged. Release remains **NOT READY**.
