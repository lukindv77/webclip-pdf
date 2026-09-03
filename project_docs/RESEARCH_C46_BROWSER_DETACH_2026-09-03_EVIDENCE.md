# C46 accepted evidence — browser-owned debugger detach / recovery control — 2026-09-03

Canonical source baseline: `4e956466197f2697ed87f446f324eef72c39e30a`.

## Classification

**C46 remains `L4-REVALIDATED / PARTIAL/FINDING`.** This tranche adds a bounded **POSITIVE/BROWSER-TARGET-CLOSE/ONDETACH/SUBSEQUENT-PRODUCTION-PDF** control. It does not close native permission, incognito, revoke/regrant, in-flight interruption, service-worker restart or browser-process restart L5 boundaries.

No runtime, manifest version, Registry owner/status or release-readiness change is justified.

## Why this tranche exists

The preceding accepted C46 follow-up proved the real unpacked production render-state guard plus unchanged production `generatePdfBlob(tabId)` can produce a physical PDF and clean its normal same-worker debugger registries when the production content-side receiver exists.

One remaining question was whether a browser-owned target teardown leaves a debugger attachment or poisons the next production debugger operation. Current production source has bounded normal attach/detach registries but no dedicated `chrome.debugger.onDetach` handler, so a physical browser control was required before making any claim about target-close behavior.

This tranche deliberately does **not** claim to exercise an in-flight production `generatePdfBlob` interruption. The first attachment is a test-side raw debugger attachment to establish Chrome's browser-owned detach semantics; the second operation uses unchanged production `generatePdfBlob` as the recovery/independence control.

## Accepted execution

Harness: `project_tools/research_c46_browser_detach.mjs`.

Workflow execution:

- workflow: `Research C46 Browser Detach`;
- run: `33741187125`;
- job: `100603240152`;
- exact workflow head: `513c9c63f4106e65ba5d5b3e1d455523c89b4011`;
- runner: Ubuntu 24.04, runner `2.337.0`, image `20260823.283.1`;
- Node: `22.23.2`;
- Puppeteer: `25.9.0`;
- browser: Chrome for Testing `152.0.7977.54`;
- conclusion: **SUCCESS**;
- output receipt SHA-256: `c0d6eeac489fed3315e72fdb473dcb958b145c535acb70a22fa4f15c92b0e4e1`.

The harness uses the same bounded real-unpacked pattern as the accepted production-debugger tranche: a temporary unpacked copy receives localhost fixture admission and the unmodified production `content.js`; Puppeteer is used only to install/discover the extension and disconnects before the product target is created. Native optional-host permission UI is therefore intentionally outside this tranche.

## Browser-owned detach receipt

For the first fixture tab:

- production `WEBCLIP_PRINT_RENDER_STATE` listener responded successfully;
- debugger target was not attached before the extension-side attach;
- `chrome.debugger.attach` succeeded;
- `Runtime.evaluate` returned `42`, proving a live debugger session;
- the extension then closed the tab through `chrome.tabs.remove(tabId)`, causing browser-owned target destruction;
- `chrome.debugger.onDetach` emitted exactly the tested target id with reason **`target_closed`**;
- the destroyed tab no longer appeared in `chrome.debugger.getTargets()`.

This is a positive Chrome lifecycle control: ordinary target destruction terminates the debugger session and emits the documented detach event rather than silently retaining an attached target.

## Subsequent production-generation control

After the browser-owned detach, the same unpacked extension created a new admitted fixture tab and executed unchanged production `generatePdfBlob(tabId)`.

Receipt:

- production render-state listener: `ok=true`;
- debugger attached before generation: `false`;
- physical PDF bytes: `14965`;
- PDF header: `%PDF-`;
- debugger attached after generation: `false`;
- `debuggerActiveTabs.has(tabId)`: `false`;
- `debuggerLateAttachCleanupByTab.has(tabId)`: `false`;
- `debuggerPendingDetachByTab.has(tabId)`: `false`;
- `debuggerPendingActualSettlements.size`: `0`.

Therefore the browser-owned closure of an independently attached prior target does not poison the next production debugger/PDF operation in the same worker/profile.

## Bounds / non-claims

This evidence does **not** prove:

1. cleanup when the browser destroys the exact target while production `generatePdfBlob` is between attach and detach;
2. settlement of a pending `Page.printToPDF`, `IO.read` or `IO.close` when the target disappears;
3. correctness after service-worker termination/restart while debugger cleanup is pending;
4. correctness after full browser-process restart;
5. native optional-host permission prompt, denial, grant, revoke or regrant behavior;
6. normal/incognito authority or fail-closed private-state behavior.

Those boundaries remain part of C46 L5 exit evidence. In particular, the absence of a production `chrome.debugger.onDetach` handler remains a source-level reason to keep browser-initiated **in-flight** detach/restart recovery open even though ordinary target-close semantics and subsequent-operation independence now have a physical positive control.

## Owner reconciliation

No new P-code is allocated and no Registry status changes.

- **P0-045 ACTIVE** remains private-context authority.
- **P1-157 ACTIVE** remains Chrome-call / user-owned prompt lifetime authority.
- **P1-193 ACTIVE** remains optional-host user-gesture/document-generation authority.
- **P1-201 ACTIVE** remains revoke/regrant stale frame-agent authority.
- **P1-004 ACTIVE umbrella** remains supporting authority for cross-origin permission/session/restart lifecycle.
- **P0-071 DONE** remains a positive render-cut guard control only.

The new evidence is positive lifecycle/recovery evidence under existing C46 ownership, not a new root cause.

Runtime and manifest version remain `0.9.8`. Release remains **NOT READY**.
