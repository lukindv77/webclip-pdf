# C46 accepted evidence — in-flight production debugger target-close recovery — 2026-09-03

Canonical source baseline: `9bbc9076d94d68bbe26cc66ea4be06a42a7c0c49`.

## Classification

**C46 remains `L4-REVALIDATED / PARTIAL/FINDING`.** This tranche adds a bounded **POSITIVE/IN-FLIGHT-GUARDED-PRINT/TARGET-CLOSED/FAIL-CLOSED/REGISTRY-CLEANUP/SUBSEQUENT-PRODUCTION-PDF** control.

It does not change runtime, manifest version, Registry owner/status or release readiness. Native permission UI, incognito authority, permission revoke/regrant, service-worker restart and browser-process restart remain open L5 boundaries.

## Why this tranche exists

`RESEARCH_C46_BROWSER_DETACH_2026-09-03_EVIDENCE.md` proved that Chrome emits `chrome.debugger.onDetach(..., "target_closed")` when a separately attached target is destroyed, and that a later unchanged production `generatePdfBlob(tabId)` still succeeds.

That preceding control deliberately did **not** destroy the target while production PDF generation itself was unresolved. Current production source has no dedicated `chrome.debugger.onDetach` handler, so C46 still needed a physical interruption control that exercised the real production `generatePdfBlob(tabId)` path while its guarded print operation was pending.

## Current-source cleanup model

Fresh source inspection on the canonical baseline confirms:

- `generatePdfBlob(tabId)` globally fences a new PDF generation while an active debugger tab or tracked actual debugger settlement remains;
- attach and detach Chrome promises are tracked in `debuggerPendingActualSettlements`;
- `debuggerActiveTabs` is cleared in the generation `finally` path;
- if an error occurs after a stream handle exists, `IO.close` is attempted without replacing the primary error;
- bounded detach is attempted whenever production considers itself attached;
- detach failure is explicitly tolerated when the tab has closed or the debugger connection is already gone, while any still-running detach promise remains represented by `debuggerPendingDetachByTab` until actual settlement.

This design predicts a fail-closed rejection plus eventual registry cleanup for target destruction. The physical control below tests that prediction rather than inferring it from source.

## Accepted execution

Harness: `project_tools/research_c46_inflight_detach.mjs`.

Workflow execution:

- workflow: `Research C46 Inflight Detach`;
- run: `33748027384`;
- job: `100624923546`;
- exact workflow head: `040bcbc01a9beed08c639b3d6e5fba0cd414df67`;
- runner: Ubuntu `24.04.4`, runner `2.337.0`, hosted image `20260831.293.1`;
- Node: `22.23.2`;
- Puppeteer: `25.9.0`;
- browser: Chrome for Testing `152.0.7977.54`;
- conclusion: **SUCCESS**.

Receipt:

- result text SHA-256: `2e8642d32330c4947bb36ae7d543ad5775d7fc301dae2c23e146119b0f415399`;
- artifact: `c46-inflight-detach-receipt`;
- artifact id: `9890472822`;
- artifact size: `773` bytes;
- artifact ZIP digest: `sha256:adedeac00529dc438fbe9cd90067259f80df2c7a92616135fd81ef2bbe5764dd`.

## Harness boundary

The harness follows the accepted C46 real-unpacked pattern:

- it copies the canonical extension into a temporary unpacked directory;
- it test-grants localhost fixture access and registers the **unmodified production `content.js`** for that local fixture, intentionally bypassing native optional-host permission UI;
- Puppeteer is used only to install/discover the MV3 extension and then disconnects before the product fixture tab is created, so the target under test is not held by an automation debugger;
- the production `pdf-print-guard.js` and production `generatePdfBlob(tabId)` remain in the execution path.

Test-side instrumentation observes the existing guarded `chrome.debugger.sendCommand(..., "Page.printToPDF")` call and the existing render-state handshake. It does not replace production generation or implement a synthetic PDF path.

## In-flight target-close receipt

The first fixture is deliberately large so the print operation remains unresolved long enough for deterministic target destruction.

Observed sequence, using receipt timestamps in milliseconds:

1. production `generatePdfBlob(tabId)` started at `1788433724684`;
2. the production guarded `Page.printToPDF` call was entered at `1788433724687`;
3. production `WEBCLIP_PRINT_RENDER_STATE hidden=true` completed successfully at `1788433724690`;
4. target close was scheduled only after that successful production render-state transition;
5. the close timer fired at `1788433724841`;
6. immediately before target destruction, the harness proved:
   - guarded print promise settled: **false**;
   - production generation settled: **false**;
   - debugger attached: **true**;
7. Chrome emitted `chrome.debugger.onDetach` for the same tab at `1788433724845` with reason **`target_closed`**;
8. `chrome.tabs.remove` resolved at `1788433724853`;
9. the pending guarded print/generation rejected at `1788433724863` with CDP error `{"code":-32000,"message":"Printing failed"}`.

Therefore target destruction while production guarded print work is unresolved is **fail closed**: the operation rejects and does not fabricate a PDF success after losing its target/debugger session.

### Precision limit

The observation point is the production **guarded** `Page.printToPDF` call. The guard performs its render-state transition and bounded render-cut preparation before delegating to its captured raw `chrome.debugger.sendCommand`. The receipt proves the guarded print operation was unresolved and the debugger was attached at target close; it does not claim nanosecond-level proof of which internal guard/native sub-command owned the pending promise at the exact close instant. The returned `-32000 / Printing failed` error is retained as browser evidence, but this tranche does not overstate its internal Chromium call-site origin.

## Settlement and registry cleanup

After the first rejected generation settled, the same worker/profile was observed after an additional bounded `800 ms` cleanup window:

- destroyed target present in `chrome.debugger.getTargets()`: **false**;
- `debuggerActiveTabs.has(firstTabId)`: **false**;
- `debuggerLateAttachCleanupByTab.has(firstTabId)`: **false**;
- `debuggerPendingDetachByTab.has(firstTabId)`: **false**;
- `debuggerPendingActualSettlements.size`: **0**.

This is direct physical evidence that the tested browser-owned interruption converges rather than leaving the current same-worker debugger registries permanently busy.

## Subsequent unchanged production-generation control

The harness then restored the original API references, created a fresh admitted fixture tab and called unchanged production `generatePdfBlob(tabId)` again.

Receipt:

- production content-side render-state listener: **true**;
- debugger attached before generation: **false**;
- physical PDF bytes: `14565`;
- PDF header: `%PDF-`;
- debugger attached after generation: **false**;
- `debuggerActiveTabs`: clean for the second tab;
- late-attach map: clean;
- pending-detach map: clean;
- pending actual debugger settlements: `0`.

The interrupted first operation therefore did not poison a subsequent production PDF operation in the same worker/profile.

## Owner reconciliation

No new P-code is allocated and no Registry status changes.

- **P0-045 ACTIVE** remains private/incognito authority; this tranche is normal-profile only.
- **P1-157 ACTIVE** remains class-correct Chrome-call and user-owned permission-prompt lifetime authority; native permission UI is bypassed here.
- **P1-193 ACTIVE** remains optional-host transient-user-activation / exact document-generation authority.
- **P1-201 ACTIVE** remains revoke/regrant stale frame-agent authority.
- **P1-004 ACTIVE umbrella** remains supporting authority for cross-origin permission/session/restart lifecycle.
- **P1-192 ACTIVE** remains relevant to long background work across worker wakes, but the tested active debugger session is not evidence for ordinary worker-restart durability.
- **P0-071 DONE** remains DONE; its production render-cut guard participates in this positive control but no regression of its narrow contract is observed.

The observed target-close rejection and cleanup are positive behavior under existing ownership, not an independent defect root.

## Remaining C46 exit evidence

C46 stays OPEN. This tranche closes only the bounded same-worker in-flight target-destruction question tested above.

Remaining L5 evidence still includes:

1. actual native optional-host permission prompt from the real popup user gesture: denial, grant and terminal settlement;
2. real host permission revoke/regrant, including already injected frame-agent fencing and non-revival of stale session authority;
3. normal/incognito windows with Chrome incognito access explicitly disabled/enabled and fail-closed private-state/UI proof;
4. explicit service-worker termination/restart and full browser-process restart around relevant permission/debugger lifecycle, proving stale in-memory generation/registry authority is not inferred after wake;
5. final interactive branded-Chrome confirmation where the project requires native browser UI rather than managed fixture control.

Runtime and manifest version remain `0.9.8`. Release remains **NOT READY**.
