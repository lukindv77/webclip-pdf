# C46 accepted evidence — production debugger / render-state guard handshake — 2026-09-03

Canonical source baseline: `8034fa3ed06227a7e21a6f511e54a2dd0ce5c583`.

## Classification

**C46: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-RENDER-STATE/PRODUCTION-DEBUGGER/PHYSICAL-PDF/DETACH-CLEANUP CONTROLS; NATIVE-PERMISSION/INCOGNITO/REVOKE-REGRANT/RESTART-L5 OPEN (P0-045, P1-157, P1-193, P1-201; P1-004 umbrella; P0-071 positive)`.**

This follow-up resolves the actual-debugger uncertainty left by `RESEARCH_C46_UNPACKED_PERMISSIONS_DEBUGGER_2026-09-03_EVIDENCE.md`. It does not change runtime, manifest version, Registry owner/status or release readiness.

## Root-cause correction to the earlier debugger blocker

The earlier clean target run correctly proved `debuggerAttachedBefore=false`, but its generic error `Could not establish connection. Receiving end does not exist.` was initially retained as an unresolved debugger-path blocker.

Fresh exact-source inspection localizes that error before native `Page.printToPDF`:

- `pdf-print-guard.js` installs a wrapper over `chrome.debugger.sendCommand`;
- for `Page.printToPDF`, the wrapper first calls `chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_PRINT_RENDER_STATE', ... })`;
- only after that render-state handshake succeeds does the wrapper call its captured raw `chrome.debugger.sendCommand` for the actual print;
- production `content.js` contains the `WEBCLIP_PRINT_RENDER_STATE` listener and returns `{ ok: true }`.

The previous synthetic fixture did not load production `content.js`. Therefore even nominally "direct" `chrome.debugger.sendCommand(..., 'Page.printToPDF')` diagnostics were still intercepted by the installed WebClip guard and failed at the missing tab-message receiver. They did **not** prove a Chrome `Page.printToPDF` transport failure.

This correction also explains why changing `transferMode` could not affect the observed error: all variants failed before the raw print command was delegated.

No new P-code is warranted from the rejected traces.

## Accepted physical Chrome execution

A clean follow-up harness, `project_tools/research_c46_debugger_guard_handshake.mjs`, was created from current `main` rather than from the diverged diagnostic branch.

The harness copies the extension to a temporary unpacked directory and makes one test-only manifest change: localhost fixture access is granted and the **unmodified production `content.js` bytes** are registered as a static content script for that fixture. This bypasses the native optional-host permission UI intentionally so this tranche isolates the debugger/render-guard boundary. Permission prompt/revoke behavior remains L5 open and is not inferred from this test-only grant.

Puppeteer is used only to install the unpacked extension and discover the service worker. It disconnects before the product fixture tab is created, so the target is not contaminated by an automation debugger attachment.

Accepted execution:

- workflow: `Research C46 Debugger Guard`;
- run: `33737786060`;
- job: `100592351286`;
- exact workflow head: `fe698139bd30ca12141e9e7a88b94150376e5cdf`;
- runner: Ubuntu 24.04, runner `2.337.0`, image `20260823.283.1`;
- Node: `22.23.2`;
- Puppeteer: `25.9.0`;
- browser: Chrome for Testing `152.0.7977.54`;
- extension id in the temporary profile: `anppbheobacmeibnlbgddbmfflafaemj`;
- conclusion: **SUCCESS**.

Artifact receipt:

- artifact: `c46-debugger-guard-receipt`;
- artifact id: `9886506845`;
- artifact ZIP digest: `sha256:3e8c7ac53f99d20ccd77c0020e380004c10d97cb1cd8abdde330f73039fd867a`;
- `c46-result.txt` SHA-256: `8c37970c971de60789ebf17fcac952fd21141339d8e888ce53ae17584a3c9b6e`;
- structured result SHA-256: `dd9006950d93b9455e15c2440aa0678913b4d9797568e44b3b82672eb23f720c`.

## Exact-source binding

The accepted receipt records SHA-256 for the canonical runtime files used to construct the temporary unpacked copy:

- `manifest.json`: `183f1ffa9fc60910c2a0b6122d4c4e71d62c5f097f6954aec9eff4e2b2a1e2fc`;
- `content.js`: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- `pdf-print-guard.js`: `175ad164ec6dd231729f1efe6d4327697d7ec6f97eb7d82b00820bb142717b47`;
- `service-worker.js`: `f705db325f625d3187505af90ba399f93111379d508f3c5f75a4a5cc21d1d2bc`.

Source assertions also proved:

- required `debugger` permission is present;
- the render guard uses `WEBCLIP_PRINT_RENDER_STATE` and `tabs.sendMessage`;
- the guard delegates the print to captured raw `sendCommand` after its preconditions;
- production `content.js` contains the matching render-state listener;
- production `generatePdfBlob(tabId)` is present;
- active / late-attach / pending-detach / pending-actual-settlement debugger registries are present.

## Browser receipt

The real-unpacked terminal receipt proved all of the following in one operation:

- render guard installed: `true`;
- fixture title matched `C46 debugger guard handshake fixture`;
- production render-state listener before PDF: `ok=true`;
- debugger target attached before production generation: `false`;
- unchanged production `generatePdfBlob(tabId)` returned a physical PDF Blob;
- PDF bytes: `16269`;
- PDF SHA-256: `867d58cfdcaee6355b090384f311c2a7ae1b2697914c235c91cddb81655a1f2f`;
- first eight PDF bytes: `255044462d312e34` (`%PDF-1.4`);
- production render-state listener after PDF: `ok=true`;
- debugger target attached after generation: `false`;
- `debuggerActiveTabs.has(tabId)`: `false`;
- `debuggerLateAttachCleanupByTab.has(tabId)`: `false`;
- `debuggerPendingDetachByTab.has(tabId)`: `false`;
- `debuggerPendingActualSettlements.size`: `0`.

This is accepted L4 physical evidence that the current production render-state guard, `chrome.debugger` attach/commands, `Page.printToPDF`, stream read/close, detach and same-worker registry cleanup can complete successfully when the actual production content-side receiver exists.

## Owner reconciliation

No Registry status or wording change is justified.

- **P0-071 DONE** remains DONE and is a positive control only. Its render-cut guard is now directly exercised through the production extension path in addition to its existing physical representation evidence.
- **P0-045 ACTIVE** remains the private-context owner; normal/incognito UI/authority behavior is not covered by this tranche.
- **P1-157 ACTIVE** remains the class-correct Chrome-call/user-owned prompt lifetime owner; this tranche deliberately bypasses native optional-host permission UI.
- **P1-193 ACTIVE** remains the optional-host user-gesture/document-generation owner; no real permission bubble is simulated.
- **P1-201 ACTIVE** remains revoke/regrant stale frame-agent authority owner; this tranche does not revoke permission.
- **P1-004 ACTIVE umbrella** remains supporting authority for cross-origin frame permission/session/restart lifecycle. Same-worker normal debugger cleanup success does not prove restart reconciliation.

## Remaining C46 exit evidence

C46 remains OPEN even though its actual-debugger sub-boundary advances to L4.

Remaining real interactive Chrome L5 evidence:

1. explicitly enable/disable extension incognito access and exercise normal plus incognito windows; prove fail-closed private state and UI authority;
2. trigger the native optional-host permission dialog from the actual popup user gesture and record denial/grant terminality;
3. revoke and regrant the admitted host permission and prove already injected frame-agent authority is fenced rather than revived;
4. restart the service worker/browser around permission and debugger sessions and prove stale generation/registry authority does not survive incorrectly;
5. exercise browser-initiated debugger detachment/restart paths, not only normal same-worker detach;
6. record exact browser versions and terminal receipts for those L5 cases.

Runtime and manifest version remain `0.9.8`. Release remains **NOT READY**.
