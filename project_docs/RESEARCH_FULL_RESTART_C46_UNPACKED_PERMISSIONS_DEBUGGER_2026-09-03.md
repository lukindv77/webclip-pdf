# WebClip — fresh full-project research — C46 unpacked Chrome / permission UI / actual debugger path — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `5ad7ba6b2f29502c3810a4b5d589dd0a965b270e`  
Scope: fresh-restart coordinate **C46 — Real unpacked Chrome / permission UI / actual chrome.debugger extension path**.

## Result

**C46: `L3-REVALIDATED / PARTIAL/FINDING + BROWSER-BOUND PRECONDITION CONTROLS; ACTUAL-DEBUGGER/NATIVE-PERMISSION/INCOGNITO/RESTART-L5 OPEN (P0-045, P1-157, P1-193, P1-201; P1-004 umbrella)`.**

The current source revalidates the existing private-context, optional-permission and restart/generation authority risks without exposing a new root cause. A supported Chrome-for-Testing / Puppeteer unpacked-extension path was also established, and a controller-disconnected run proved a clean detached debugger precondition before entering production `generatePdfBlob()`.

That run then received Chrome API error `Could not establish connection. Receiving end does not exist` inside the production debugger path. Because the accepted receipt did not identify the exact failing debugger sub-call, the error is retained as a browser-bound execution blocker rather than promoted to a new WebClip defect.

No new P-code is warranted. Existing ACTIVE owners remain authoritative and unchanged. Runtime, Registry wording/status, manifest version `0.9.8` and release readiness are unchanged; release remains **NOT READY**.

## Fresh source controls

- `debugger` is a required extension permission.
- broad HTTP/HTTPS origins remain optional host permissions rather than silently granted install-time hosts.
- no explicit manifest `incognito` mode override is present.
- popup startup requests Journal backup status before active-tab context is classified.
- optional iframe permission discovery performs asynchronous work before the native `chrome.permissions.request(...)` call, and the popup wrapper has a 10 s local deadline.
- worker content-message admission includes an incognito guard.
- frame-agent commands recheck current host permission.
- no `chrome.permissions.onRemoved` listener proactively fences in-memory frame-agent authority on revoke.
- frame-agent authority is represented in worker-memory `frameAgentsByTab`, while an already-loaded agent re-registers on reinjection.
- debugger lifecycle includes bounded attach/detach and active / late-attach / pending-detach / pending-actual-settlement tracking with final active-set cleanup.
- no `chrome.debugger.onDetach` recovery listener exists on the canonical baseline.

These observations reconcile to P0-045, P1-157, P1-193, P1-201 and P1-004 rather than defining another owner.

## Supported real-unpacked boundary

The browser harness first had to remove two sources of false evidence:

1. modern branded Chrome no longer provides a valid `--load-extension` test path for this purpose;
2. Puppeteer's connected browser session can make a fixture target appear debugger-attached through automation target attachment.

The retained clean precondition run loaded the unpacked MV3 extension through Puppeteer's supported extension loader, established its service worker, scheduled the fixture operation, then disconnected the automation controller **before** the fixture tab was created.

Accepted/precondition evidence:

- workflow: `Research C46`;
- run: `33734553680`;
- job: `100581954040`;
- exact workflow head: `f5e528507154f86a4971f4aa2f2f25323bd972e5`;
- Ubuntu 24.04;
- Chrome for Testing provisioned by `puppeteer@25.9.0`;
- exact browser version was not emitted by this failing run and is deliberately not inferred.

Observed receipt:

- incognito access allowed in fresh profile: `false`;
- synthetic optional origin initially granted: `false`;
- fixture title matched the intended page;
- debugger target attached before production operation: `false`;
- production `generatePdfBlob(tabId)` entered its debugger path and failed with `Could not establish connection. Receiving end does not exist`.

This is useful browser-bound evidence because the critical `debuggerAttachedBefore=false` precondition was finally uncontaminated. It is not a successful attach / print / stream / detach proof and therefore does not justify L4 completion.

## B1–B9 mapping

| Boundary | Fresh C46 result |
|---|---|
| B1 User Intent | Native popup permission gesture and explicit normal/incognito user intent remain L5 open. |
| B2 Admission / authority | Optional synthetic host was not silently granted. Source shows the real permission request follows async discovery; native prompt settlement remains unproven. |
| B3 Capture | Not the primary boundary in this tranche. Frame-agent admission still depends on host authority. |
| B4 Static Materialization | Not the primary boundary. No accepted C46 print-materialization artifact is claimed. |
| B5 Renderer | Production source reaches `chrome.debugger` / `Page.printToPDF`; a clean detached precondition was proven, but the actual debugger sequence did not complete. |
| B6 Physical Artifact | No accepted physical PDF from C46; artifact success is deliberately not inferred from source. |
| B7 Persistence / Transfer | Frame-agent authority is worker-memory based; revoke/regrant and worker/browser restart fencing remain open. |
| B8 Journal / Provenance | No terminal native permission/revoke/debugger receipt across restart was obtained. |
| B9 Later Reading / Recovery | Private-state fail-closed behavior across real normal/incognito windows and restart remains L5 open. |

## Owner reconciliation

- **P0-045 ACTIVE** — private-context/disclosure authority remains relevant. The popup still requests backup state before active-tab context classification; real incognito-window UI remains untested.
- **P1-157 ACTIVE** — optional host-permission gesture/settlement authority remains relevant. Async discovery precedes the native request and a local 10 s timeout surrounds extension API operations.
- **P1-193 ACTIVE** — shared/private browser-state boundary remains open until actual normal/incognito windows and Chrome's incognito-access setting are exercised.
- **P1-201 ACTIVE** — revoke/regrant and stale authority cleanup remain open; no proactive `permissions.onRemoved` fencing exists.
- **P1-004 umbrella** — worker/browser restart and exact session/generation cleanup remain supporting authority.

No Registry status or wording changes are justified.

## Why the debugger error is not a new P-code

The clean run proves that the target was detached immediately before production generation. It does **not** prove which call failed among attach, protocol enablement/media setup, print, stream read/close or detach. Subsequent diagnostic attempts to localize the sub-call were themselves invalidated by test-harness faults or concurrent instrumentation changes.

Creating a new owner from the generic Chrome error would therefore violate duplicate/root-cause reconciliation. The correct classification is a bounded unresolved browser execution boundary under the existing debugger/restart umbrella until an uncontaminated terminal stage receipt exists.

## Remaining C46 exit evidence

1. In a real unpacked interactive Chrome profile, explicitly enable/disable extension incognito access and exercise ordinary plus incognito windows; prove no ordinary-profile Journal/backup/private state is disclosed or mutated through the private path.
2. Trigger the real optional-host permission dialog from the popup's actual user gesture; record denial, grant, revoke and regrant terminal outcomes.
3. Revoke an admitted host permission and prove already-registered frame-agent authority is immediately fenced; restart worker/browser and prove stale authority is not resurrected.
4. Execute `chrome.debugger.attach` → required protocol commands → `Page.printToPDF` → stream read/close → `chrome.debugger.detach` without an automation debugger attached to the target, with an exact stage receipt.
5. Repeat the debugger operation across service-worker and browser restart; prove active/late/pending registries and operation generation cannot survive incorrectly or permit duplicate/stale ownership.
6. Record exact browser build, exact operation generation and terminal receipts for the successful/failed cases.

Until those boundaries are covered, C46 remains OPEN at bounded L3 partial rather than being declared complete.
