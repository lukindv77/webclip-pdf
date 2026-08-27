# Audit delta — cross-origin frame command fan-out

Date: 2026-08-27
Source-of-truth `main` immediately before write: `e1e316bbce0298c2b1c28f58c523733e9860c0b7`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P1-167 must be refined — aggregate PDF-preparation time is unbounded across remote-frame RPC fan-out

P1-167 already owns the missing aggregate node/time/mutation/string budget across PDF-preparation paths. Fresh source audit proves an additional independent contributor inside that same root cause: cross-origin frame commands multiply bounded per-frame waits because top-frame dispatch is strictly sequential and has no enclosing operation deadline.

### Fresh source proof

`content.js::commandMappedRemoteFrames()` iterates `state.remoteFrames.values()` and for every eligible frame executes:

`const response = await targetRemoteFrame(remote, command, extra);`

before moving to the next frame.

The registry limit is:

`FRAME_AGENT_MAX_PER_TAB = 64`.

For each `WEBCLIP_FRAME_AGENT_TARGET`, service worker `sendFrameAgentCommand()` performs two separate bounded prerequisites in sequence:

1. `chrome.permissions.contains(...)` via `frameAgentHasGrantedHostPermission()` with `FRAME_AGENT_COMMAND_TIMEOUT_MS = 5_000`;
2. `chrome.tabs.sendMessage(..., {frameId})` to the child frame with another `FRAME_AGENT_COMMAND_TIMEOUT_MS = 5_000`.

So one slow/unsettled frame can consume roughly 10 seconds of the top command. With 64 eligible selected frames, a legal worst-case `prepare-print` fan-out is about **640 seconds** before the top content script even sends `WEBCLIP_GENERATE_PDF` to the worker.

The debugger/PDF generation deadline therefore does not bound this pre-IPC preparation period.

The same sequential helper is also used for other mapped-frame lifecycle commands; `restoreRemoteFramesAfterPrint()` itself is sequential as well. P1-199 separately owns stale-generation ordering between prepare and restore; this checkpoint owns aggregate latency/fan-out budget.

### User-visible / lifecycle effect

- Save UI can remain in preparation for many minutes while all individual calls are technically respecting their own 5-second bounds.
- A tab with many selected cross-origin frames magnifies one unavailable/slow frame origin into linear latency.
- Closing/retrying around such a long preparation increases interaction with P1-199 stale cleanup and P1-171 document-generation invalidation.
- Since `WEBCLIP_GENERATE_PDF` has not yet been sent, service-worker debugger deadlines and PDF pending budgets provide no protection for this interval.

### Classification / duplicate check

No new P-number is created.

This refines **P1-167**, whose current contract already says bounded resource prefetch does not bound the other PDF-preparation/print paths and requires one common time/resource budget.

Do not duplicate as P1-200.

Separate owners remain:

- P1-154: aggregate selection-count/byte budget before snapshot materialization.
- P1-171: frame registry/command document identity across navigation/reload.
- P1-199: operation-generation fencing of `prepare-print` vs stale `restore-print`.
- P1-167: aggregate preparation work/time including this sequential RPC fan-out.

### Required P1-167 refinement

Add a top-level PDF preparation deadline that covers **all** local and remote preparation before `WEBCLIP_GENERATE_PDF`.

Remote-frame dispatch must use bounded concurrency rather than `N × per-frame-timeout` serial latency. Exact concurrency should be small and explicit; it must respect browser/renderer pressure and P1-154 aggregate selection limits.

Required invariants:

1. One overall preparation budget is captured when the save operation starts and passed as remaining time to every remote command.
2. Per-frame permission and child-message waits are capped by the smaller of their normal per-call timeout and remaining overall budget.
3. Remote commands may run with bounded concurrency, but never start unbounded Promise fan-out for all frames.
4. `failClosed=true` print preparation still fails the PDF if a selected required frame cannot be prepared; concurrency must not weaken correctness.
5. Once overall preparation expires, no later/stale frame response may re-enter the operation or mutate the next print generation; compose with P1-199.
6. Navigation/document generation invalidation from P1-171 remains authoritative while concurrent commands are in flight.
7. Cleanup/restore receives its own bounded operation-generation-aware lifecycle and must not take `N × 10s` before another operation can safely settle.

### Deterministic regressions

- 64 selected frames, all immediate: preparation succeeds under normal budget.
- 64 selected frames, every permission check never settles: total failure occurs near the single overall deadline, not ~320 seconds just for permissions.
- 64 frames where both permission and child message hit individual 5-second limits: total wall-clock remains within aggregate preparation deadline, not ~640 seconds.
- Mixed fast/slow frames with bounded concurrency: every required fast frame completes; one failed required frame produces fail-closed PDF preparation.
- Overall deadline expiry followed by late child responses cannot mutate current/new print generation.
- Navigation during concurrent fan-out invalidates stale results per P1-171.

## Positive control

Individual frame command stages already have per-call 5-second bounds. The defect is therefore not an infinite single Promise; it is linear multiplication of individually bounded waits without a shared operation deadline.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.
