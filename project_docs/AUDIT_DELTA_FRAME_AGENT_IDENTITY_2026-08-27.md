# Audit delta — cross-origin frame-agent identity / optional permission lifecycle

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `f0c44f184b576c43da870ac5916d80ada27447f9`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens existing **P1-171 OPEN**, **P1-193 OPEN**, feature-level **P1-004 PARTIAL**, and hostile-page **P0-075 OPEN**.

## P1-171 — exact document identity must cover REGISTER/STATE as well as COMMAND

Current worker registry stores child records keyed by `tabId + frameId` and includes `sender.documentId` in the record. `forwardFrameAgentState()` already compares the state sender's documentId against the stored record.

However:

- `listRegisteredFrameAgents(tabId)` returns registry records without proving that each frame is still present/current;
- `sendFrameAgentCommand()` checks the optional host permission for the **stored URL**, then sends via `chrome.tabs.sendMessage(..., { frameId })` without exact `documentId`;
- `registerFrameAgent()` stores the child record and forwards `event:'register'` to the current top frame via `{ frameId: 0 }`, again without top `documentId`;
- `forwardFrameAgentState()` forwards `event:'state'` to the current top frame through the same top-frame-only address.

Therefore the existing same-URL reload/navigation gap is broader than COMMAND targeting. A late registration/state RPC originating from an old child document can complete after the top document has been replaced and be forwarded into the **new top document** unless top-generation/document identity is fenced.

### Required P1-171 acceptance refinement

1. Capture an immutable top-document generation/documentId for the frame-agent session.
2. Registry record identity must include at least tabId + child frameId + child documentId + top document generation/documentId.
3. REGISTER and STATE forwarding must target/prove the exact top document generation, not merely frameId 0.
4. COMMAND must target exact child `documentId` where supported; if exact targeting cannot be proven, fail closed instead of sending to reused frameId.
5. LIST must reconcile/prune records that no longer belong to the current top/child generation before returning them to content.js.
6. Same-URL reload/history replacement must invalidate the previous full-document generation even when `tabs.onUpdated.changeInfo.url` is absent.
7. Late `scripting.executeScript()` success remains reconciled under P1-125; it must not populate current registry authority for a different document generation.

## Registry capacity / stale dynamic-frame lifecycle

`frameAgentsByTab` has a hard cap of 64 records. Registration only removes the cap issue when the same frameId is overwritten; there is no frame-agent unregister message and the worker's explicit cleanup shown in current runtime is tab-level/navigation-level, not dynamic-frame detach reconciliation.

A long-lived SPA can therefore create/remove many cross-origin frames with distinct frameIds. Stale records may accumulate until `map.size >= 64`, after which a new legitimate frame registration fails even if only a few frames remain alive.

This is not a separate resource-budget item; it is another consequence of P1-171 registry lifetime not being bound to actual frame/document lifecycle. Acceptance should include bounded reconciliation/pruning of detached/stale records and a regression with >64 sequentially created/removed frames under one top-document generation.

## P1-193 — user gesture problem remains unchanged and composes with document identity

Popup grant flow still performs asynchronous discovery before `chrome.permissions.request()`:

`tabs.query -> scripting.executeScript -> tabs.sendMessage -> normalize origins -> permissions.request`.

This does not guarantee preservation of the activation required by Chrome's optional permission prompt. Existing two-phase P1-193 acceptance remains correct: precompute/explain candidates first, then a second explicit grant click calls `permissions.request()` immediately on a short-lived candidate receipt.

Fresh identity refinement: that candidate receipt must be bound to the exact top document generation. After grant, injection must perform a fresh document/permission validation; a navigation during the browser permission prompt must not enable agents in whatever document happens to occupy the same tabId afterward.

## P0-075 — hostile iframe can synthetic-click remote selection

`frame-agent.js` has the same control-plane weakness already registered for top content:

- its capture-phase `click(ev)` changes include/exclude selection while `state.phase==='selecting'`;
- it does not require `ev.isTrusted`;
- remote selection authority is additionally reflected in page-visible `data-webclip-remote-include/exclude` attributes.

A hostile cross-origin page that has been granted optional host permission can therefore dispatch synthetic click events in its own DOM during an active WebClip selection session and modify remote selection state. This belongs to **P0-075**, whose acceptance must explicitly cover both `content.js` and `frame-agent.js` user-authorizing selection paths.

## P1-188 / P1-182 cross-check

`frame-agent.js` also executes `document.querySelector(l.cssPath)` in imported/restore locator resolution and emits raw text/href/src neighbor fingerprints in its snapshot. These are already covered by P1-188 and P1-182; no duplicate item created.

## Duplicate check

- P1-171 owns document/navigation generation and frame registry/command authority.
- P1-193 owns admission of optional permission prompt under user activation.
- P0-075 owns synthetic event / page-readable selection and user input control-plane trust.
- P1-004 remains PARTIAL until these lower-level contracts and real unpacked permission QA pass.
- No P1-197/P0-079 assigned.
