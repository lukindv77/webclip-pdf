# WebClip — fresh full-project research — C46 production debugger guard handshake — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `8034fa3ed06227a7e21a6f511e54a2dd0ce5c583`  
Scope: focused continuation of **C46 — Real unpacked Chrome / permission UI / actual chrome.debugger extension path**.

## Result

**C46 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-RENDER-STATE/PRODUCTION-DEBUGGER/PHYSICAL-PDF/DETACH-CLEANUP CONTROLS; NATIVE-PERMISSION/INCOGNITO/REVOKE-REGRANT/RESTART-L5 OPEN (P0-045, P1-157, P1-193, P1-201; P1-004 umbrella; P0-071 positive)`.**

The prior C46 L3 tranche established a clean detached target but reported `Could not establish connection. Receiving end does not exist` when entering the PDF debugger path. Fresh source analysis shows that this was not evidence that Chrome rejected `Page.printToPDF`: WebClip's `pdf-print-guard.js` wraps `chrome.debugger.sendCommand` and first sends `WEBCLIP_PRINT_RENDER_STATE` to the tab. The old synthetic fixture lacked production `content.js`, so the wrapper failed at its own precondition before delegating the raw print command.

A corrected real-unpacked Chrome 152 tranche loads the exact production `content.js`, proves that render-state handshake before and after print, disconnects Puppeteer before the target is created, calls unchanged production `generatePdfBlob(tabId)`, receives a physical `%PDF-1.4` Blob and proves normal detach plus empty same-worker debugger registries.

No new P-code, Registry status change, runtime change, version bump or release change is warranted.

## Accepted execution

- workflow run: `33737786060`;
- job: `100592351286`;
- exact evidence head: `fe698139bd30ca12141e9e7a88b94150376e5cdf`;
- Chrome for Testing: `152.0.7977.54`;
- Node: `22.23.2`;
- Puppeteer: `25.9.0`;
- conclusion: **SUCCESS**;
- artifact: `c46-debugger-guard-receipt`, id `9886506845`;
- artifact ZIP digest: `sha256:3e8c7ac53f99d20ccd77c0020e380004c10d97cb1cd8abdde330f73039fd867a`;
- result SHA-256: `dd9006950d93b9455e15c2440aa0678913b4d9797568e44b3b82672eb23f720c`.

Physical result:

- `renderStateListenerOk=true`;
- `debuggerAttachedBefore=false`;
- PDF bytes `16269`;
- PDF SHA-256 `867d58cfdcaee6355b090384f311c2a7ae1b2697914c235c91cddb81655a1f2f`;
- PDF header `255044462d312e34` = `%PDF-1.4`;
- `renderStateListenerAfterOk=true`;
- `debuggerAttachedAfter=false`;
- active/late-attach/pending-detach registries all absent for the tab;
- pending actual-settlement count `0`.

## Harness boundary

The temporary unpacked copy gives localhost a test-only host grant and registers the exact production `content.js` as a static content script for the fixture. This is not claimed as native permission UI evidence. It exists only to make the production print guard's real receiver available while isolating the debugger path.

Puppeteer disconnects before the sidecar creates the fixture tab, so automation does not own the target debugger session during the product operation.

## B1–B9 mapping

| Boundary | C46 continuation result |
|---|---|
| B1 User Intent | Native permission/incognito user intent remains L5 open. |
| B2 Admission / authority | Test-only fixture grant deliberately isolates debugger evidence; real optional-host prompt/revoke authority remains open. |
| B3 Capture | Production `content.js` exists on the target and provides the render-state receiver; no new capture claim. |
| B4 Static Materialization | Render guard precondition is exercised through production content-side code. |
| B5 Renderer | Production `generatePdfBlob` successfully completes real extension `chrome.debugger` / `Page.printToPDF`. |
| B6 Physical Artifact | `16269` bytes, `%PDF-1.4`, exact SHA-256 recorded. |
| B7 Persistence / Transfer | Not primary; revoke/regrant and restart session authority remain open. |
| B8 Journal / Provenance | Not primary; no new Journal mutation claim. |
| B9 Later Reading / Recovery | Not primary; browser/service-worker restart remains open. |

## Correction to rejected diagnostics

Earlier headed/headless and transfer-mode traces all failed with the same messaging error because they invoked the **wrapped** `chrome.debugger.sendCommand`. Since the synthetic page had no `WEBCLIP_PRINT_RENDER_STATE` receiver, those traces stopped before raw `Page.printToPDF`. They are retained as rejected diagnostic provenance and must not be cited as evidence that Chrome blocks print commands for extension debugger clients.

The successful corrected tranche is the accepted authority for the C46 debugger sub-boundary.

## Owner reconciliation

- `P0-071` remains DONE, positive only: its production render guard successfully participates in the extension path.
- `P0-045`, `P1-157`, `P1-193`, `P1-201` remain ACTIVE because their private/native-permission/revoke semantics remain L5 open.
- `P1-004` remains the supporting cross-origin frame/session umbrella, especially for restart and permission-generation cleanup.

No Registry owner/status edit is made.

## Remaining exit evidence

C46 is not complete. Real interactive Chrome still must cover:

- normal/incognito windows with Chrome incognito-access setting toggled;
- native optional-host permission denial/grant from the actual popup gesture;
- revoke/regrant while a frame agent is already injected;
- service-worker/browser restart across those sessions;
- browser-initiated debugger detach/restart recovery.

Release remains **NOT READY**.
