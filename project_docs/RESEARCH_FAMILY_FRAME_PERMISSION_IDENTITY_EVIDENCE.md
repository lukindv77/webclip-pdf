# Research family evidence — Frame permission / cross-origin frame-agent identity and command generation

Family from `RESEARCH_DELTA_INDEX.md` section 11.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P1-004, P1-157, P1-171, P1-193, P1-199…P1-203, P1-214.

Retired source count: **12**.

## P-code coverage

P0-003, P0-045, P0-070, P0-071, P0-075, P0-079, P1-003, P1-004, P1-125, P1-154, P1-157, P1-160, P1-167, P1-171, P1-175, P1-182, P1-188, P1-193, P1-197, P1-199, P1-200, P1-201, P1-203, P1-210, P1-211, P1-214, P1-215

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_CROSS_ORIGIN_PRINT_GENERATION_2026-08-27.md` | `881726d2886f95b2fa73ab87c334374de878545901090494833c3cc79ca3b062` | P0-070, P1-004, P1-157, P1-167, P1-171, P1-199 | Research delta — cross-origin print operation generation |
| `RESEARCH_DELTA_FRAME_AGENT_IDENTITY_2026-08-27.md` | `c6a49c4c1c496ce42f99f530284bcb585f167fdb77dc3ce7659e712897f6516f` | P0-075, P0-079, P1-004, P1-125, P1-171, P1-182, P1-188, P1-193, P1-197 | Research delta — cross-origin frame-agent identity / optional permission lifecycle |
| `RESEARCH_DELTA_FRAME_AGENT_REGISTER_ROLLBACK_2026-08-28.md` | `737dd2befc431b756297309f1360be2052ad8b8fd4e4b5993fd3bc8a88d5b640` | P1-125, P1-171, P1-193, P1-200, P1-201, P1-211 | Research delta — frame-agent REGISTER rollback across reused frameId — 2026-08-28 |
| `RESEARCH_DELTA_FRAME_AGENT_RESOURCE_SCAN_BUDGET_2026-08-28.md` | `774518d07b955a9744c779445545cc4db148eeae22c279b62adbc8dd8d4f5ec3` | P1-003, P1-004, P1-160, P1-214 | Research delta — cross-origin frame-agent resource discovery must honor DOM scan budget — 2026-08-28 |
| `RESEARCH_DELTA_FRAME_PERMISSION_LATE_COMMAND_RESULT_2026-08-28.md` | `5b430c6fd22f9643ddc244d431bf41cabce281168204fe7215804bd4f52609c4` | P1-171, P1-193, P1-199, P1-200, P1-201, P1-211 | Research delta — optional frame permission generation vs late command result — 2026-08-28 |
| `RESEARCH_DELTA_FRAME_PERMISSION_PORT_SCOPE_2026-08-27.md` | `d510bab9102efc277edb1238f2a485288d664d24393b23ef0d7e93650395f1ec` | P0-045, P1-004, P1-171, P1-193, P1-200, P1-201 | Research delta — optional frame host-permission port scope — 2026-08-27 |
| `RESEARCH_DELTA_FRAME_PERMISSION_REVOCATION_LIFECYCLE_2026-08-27.md` | `af0a9ed082a6e35469f9e5c128f8e1ad273c2cddd6112fffa0ffbe4015855eba` | P0-003, P0-075, P1-004, P1-171, P1-193, P1-199, P1-200, P1-201 | Research delta — cross-origin frame optional-permission revocation lifecycle — 2026-08-27 |
| `RESEARCH_DELTA_HOSTILE_REMOTE_FRAME_PRINT_INTERACTIONS_2026-08-28.md` | `567d07bbdf217900491fd3b19f28571ae9bf7977a94d7977b2a8b3b3c9582362` | P0-071, P0-075, P1-167, P1-199, P1-200, P1-201, P1-203, P1-210, P1-211 | Research delta — hostile remote-frame print/control interaction revalidation — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_FRAME_COMMAND_FANOUT_2026-08-27.md` | `96c0de238ead4f716b41c995798b7c6d916bbd1db1b63b66bc44e35d629f8a1c` | P1-154, P1-167, P1-171, P1-199, P1-200 | Research delta — cross-origin frame command fan-out |
| `RESEARCH_DELTA_REMOTE_FRAME_CONTROL_GENERATION_2026-08-27.md` | `ca9a322b0ecdcd698b6499558c2d365b45bc3ec2ffe66e92f62f28479f22c233` | P1-004, P1-167, P1-171, P1-175, P1-197, P1-199, P1-200 | Research delta — cross-origin frame selection/control generation |
| `RESEARCH_DELTA_REMOTE_FRAME_PRINT_PARTIAL_PREPARE_ROLLBACK_2026-08-28.md` | `ff956911aaa98f8378e74b161f5d83f670fecfc347a44ed4492e5274ad9427d2` | P0-075, P1-214 | Research delta — cross-origin frame print partial-prepare rollback — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_FRAME_RESTORE_RECEIPT_SETTLEMENT_2026-08-28.md` | `41fca48f8818349d794923d039e56a05184420e052c790e4db4b1b832f9780e1` | P1-214, P1-215 | Research delta — remote frame restore receipt must survive unknown settlement — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_CROSS_ORIGIN_PRINT_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `881726d2886f95b2fa73ab87c334374de878545901090494833c3cc79ca3b062`

# Research delta — cross-origin print operation generation

Date: 2026-08-27
Source-of-truth `main` immediately before initial write: `546f9284dbadbd402b7f88e4d404cc8aa2747412`.
Latest research refinement baseline: `9d75fa0672fc6b676250fd140bb097a5eb98de0a`.

This file is a lossless research checkpoint. It does **not** replace the canonical registry in `project_docs/PRIORITIES_P0_P1_P2.md` / `DEEP_RESEARCH_2026-08-25.md`. Those large canonical files should be synchronized together in a later lossless update; production/runtime files are intentionally untouched in this checkpoint.

## P1-199 — cross-origin iframe print prepare/restore is not operation-generation fenced

**Status:** CONFIRMED by source research; pending canonical sync and implementation.

### Root cause

`content.js` keeps selected remote-frame print state in the process-global `state.remotePrintPrepared` set. `restoreRemoteFramesAfterPrint()` snapshots that set, immediately clears it, and then asynchronously sends `restore-print` to each frame.

`restoreAfterPrint()` is synchronous and calls `restoreRemoteFramesAfterPrint().catch(() => {})` fire-and-forget.

`prepareForPrint()` starts with:

1. `restoreAfterPrint()` — launches the old remote restore asynchronously and clears `remotePrintPrepared` immediately;
2. `await restoreRemoteFramesAfterPrint()` — this second call can now observe an empty set and therefore does **not** wait for the restore that step 1 already launched;
3. `syncRemoteFrameAgents()` / local preparation;
4. `prepareRemoteFramesForPrint()` — sends a new `prepare-print` and re-adds the same frame ids.

Therefore old restore A and new prepare B are not ordered by actual settlement. If B's `prepare-print` reaches a child frame before A's delayed `restore-print`, A can later undo B.

`stopSelection()` contains the same lifecycle smell: it calls `restoreAfterPrint()` and then starts another fire-and-forget `restoreRemoteFramesAfterPrint()` before `stop`, without an operation token that makes a stale restore harmless.

### Child-frame proof

`frame-agent.js` has one mutable state object with `phase`, `printStyle` and `changedAttrs`; there is no print operation/generation token.

- `preparePrint()` sets `state.phase='printing'`, mutates selected resource attributes, creates a new `<style id="webclip-remote-frame-print-style">`, appends it to the document, and overwrites the single `state.printStyle` pointer with that new node.
- `preparePrint()` does **not** remove or reconcile an already existing print-style node before appending another one.
- `restorePrint()` unconditionally removes only the node currently referenced by `state.printStyle`, rolls back every current `state.changedAttrs`, clears them, and returns phase to `selecting`.

Consequently a stale `restore-print` from operation A cannot distinguish A's style/attribute mutations from a newer operation B. It can remove B's print style and/or roll back B's resource preparation.

### Stronger duplicate-style / lost-pointer failure

The same race can leave a stale print stylesheet permanently mounted in the child document:

1. A executes `preparePrint()` and appends style node `styleA`; `state.printStyle = styleA`.
2. Before A is actually restored, B executes `preparePrint()` and appends a second node `styleB` with the same `PRINT_STYLE_ID`; `state.printStyle = styleB`. `styleA` remains connected, but its pointer is lost.
3. Delayed `restore-print(A)` runs after B preparation. Because restore is unversioned, it removes the **current** pointer `styleB`, not A-owned `styleA`, and then sets `state.printStyle = null`.
4. `styleA` remains in the document with no authoritative pointer by which later `restorePrint()` can remove it.

The leftover CSS contains selected-only print rules and can therefore persist beyond the intended operation until document reload or some unrelated DOM cleanup. Duplicate IDs also make `document.getElementById(PRINT_STYLE_ID)` semantics dependent on DOM order if future code starts using that lookup.

This is stronger than an intermittent missing-frame PDF: the operation-generation race can create durable stale child-frame print state inside the current page session.

### User-visible effect

A rapid subsequent PDF operation on the same document with the same selected cross-origin iframe can reach `Page.printToPDF` after a stale restore has removed the new frame print preparation. Expected outcomes include:

- selected cross-origin iframe content missing or no longer filtered as selected-only;
- lazy image/resource attributes restored while the new print is still pending;
- remote frame height/style state inconsistent with the top-frame preparation;
- an old selected-only print stylesheet remaining connected after cleanup because the single pointer was overwritten;
- later prints or normal page state inheriting stale remote-frame print CSS until reload;
- intermittent behavior depending on message timing, making the defect difficult to reproduce without a delayed-command test.

This is not merely cleanup cosmetic state: `prepare-print`/`restore-print` alter the actual representation printed into the PDF.

### Classification / duplicate check

No `P1-199` existed in the fresh canonical registry when assigned.

This is **not** a duplicate of:

- `P1-171`: cross-origin frame registry/command document identity after same-URL reload/navigation. P1-199 reproduces within one unchanged document and is an operation-generation ordering problem.
- `P1-004`: feature-level cross-origin iframe support umbrella. P1-199 is a concrete independent lifecycle root cause with its own deterministic acceptance tests.
- `P1-157`: generic unbounded/direct Chrome API/RPC research. The problem here is not absence of a timeout; adding a timeout would not make a stale restore safe.
- `P0-070`: top-document live PDF document identity. P1-199 is child-frame mutable print-state ownership even when the top document identity never changes.
- `P1-167`: aggregate preparation work/time including remote command fan-out. A global deadline alone does not prevent an old restore from mutating the next generation.

### Required contract

Use one explicit print-operation generation/token shared by top `content.js` and every mapped remote frame command.

At minimum:

1. A new print preparation must not begin until cleanup of the preceding generation has **actually settled**, or cleanup must be generation-aware and incapable of touching newer state.
2. `prepare-print` carries a print generation/token; frame-agent records ownership of `printStyle` and changed attributes for that generation.
3. `restore-print(A)` is idempotent and may restore only state owned by A; if B is current, stale A restore is a no-op.
4. Frame-agent must never accumulate duplicate print-style nodes across generations. Before mounting a generation's print representation, ownership of any prior node must be known and safely reconciled; cleanup must be able to remove every node owned by that generation even if newer state exists.
5. Top-frame `remotePrintPrepared` must represent exact generation ownership, not one shared unversioned set.
6. `restoreAfterPrint()` must not launch an untracked asynchronous cleanup that a later `prepareForPrint()` can overtake.
7. `stop`, error cleanup and successful completion use the same ordering/generation contract.
8. Navigation/document generation fencing from P1-171 remains mandatory in addition to this operation-generation fence.

### Regression / proof requirements

Deterministic test with a mocked/delayed frame command channel:

1. Operation A completes local print and starts `restore-print(A)`, but its delivery/settlement is delayed.
2. Operation B starts on the same document and successfully executes `prepare-print(B)`.
3. Delayed `restore-print(A)` is then delivered.
4. Assert B remains in `printing` state; B's print style and B-owned changed attributes remain intact.
5. Assert there is exactly one active print-style node and that no A-owned style is left connected without ownership metadata.
6. `restore-print(B)` then restores exactly B once and leaves zero print-style nodes owned by either A or B.
7. Repeat with A failure cleanup and with `stopSelection()` interleaving.
8. Repeat with two selected cross-origin frames and reversed per-frame response order, proving there is no partial-generation rollback.
9. Explicitly reproduce A prepare → B prepare → stale A restore and assert no lost-pointer stale stylesheet survives.

Real unpacked Chrome QA should additionally repeat rapid consecutive saves with a deliberately slow cross-origin iframe.

## Related positive controls from the same research block

- `frame-agent.js` still requires extension runtime sender for `WEBCLIP_FRAME_AGENT_COMMAND`.
- Actual cross-origin permission/document identity remains governed separately by P1-004/P1-171.
- The defect does not require host-page script privilege or navigation; it is reproducible purely from legal WebClip operation ordering.

## Test / release state

No production files or `manifest.json` were modified by this checkpoint or refinement.

Product tests were **not rerun** for this docs-only research write. Do not upgrade the previously proven JS/deterministic gate based on this commit.

No build/tag/release was created.

## Retired source: `RESEARCH_DELTA_FRAME_AGENT_IDENTITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `c6a49c4c1c496ce42f99f530284bcb585f167fdb77dc3ce7659e712897f6516f`

# Research delta — cross-origin frame-agent identity / optional permission lifecycle

Date: 2026-08-27
Source `main` HEAD researched immediately before this write: `f0c44f184b576c43da870ac5916d80ada27447f9`
Scope: research/docs only. Production runtime/config/manifest untouched.

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

## Retired source: `RESEARCH_DELTA_FRAME_AGENT_REGISTER_ROLLBACK_2026-08-28.md`

SHA-256 of UTF-8 source text: `737dd2befc431b756297309f1360be2052ad8b8fd4e4b5993fd3bc8a88d5b640`

# Research delta — frame-agent REGISTER rollback across reused frameId — 2026-08-28

Source-of-truth `main` immediately before this write: `39c5ab2dda1691adcbc791debac355379f9edcf4`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-171** exact frame/document generation authority, with **P1-200** remote frame control-session ordering and **P1-125** late scripting success as adjacent dependencies.

Previous frame-agent identity research already establishes that the registry stores `documentId` but is keyed only by `tabId + frameId`, and COMMAND forwarding does not target exact documentId. This pass proves a stronger registry-state corruption schedule: a late REGISTER from an older child document can overwrite a newer child record for the same reused frameId.

No new root cause is needed.

## Current registry shape

Worker `frameAgentsByTab` stores a per-tab map keyed by numeric `frameId`.

`registerFrameAgent(sender)` derives:

- tab id;
- frame id;
- sender URL;
- bounded `sender.documentId`;

and builds a record containing:

- `frameId`;
- `documentId`;
- URL;
- `registeredAt = Date.now()`.

After the capacity check it executes:

`map.set(frameId, record)`.

If the frameId already exists, the existing record is replaced unconditionally. There is no expected previous document generation/CAS or proof that the registering sender still occupies that frameId at commit time.

## `registeredAt` cannot provide ordering truth

The timestamp is assigned when the worker processes the registration, not when the child document became current.

Therefore a delayed old message A processed after current B receives a **later** `registeredAt` value. Sorting/choosing the largest timestamp would make the stale registration look newer.

The authoritative order must come from browser document/navigation identity, not worker message processing wall clock.

## Deterministic rollback schedule

1. Cross-origin child document A occupies frameId F and sends REGISTER A.
2. F navigates/replaces to document B.
3. B sends REGISTER B and worker processes it, storing `{F, documentId:B}`.
4. An already admitted/delayed async path for REGISTER A completes afterward, or message processing from the old generation reaches the registry mutation later.
5. `map.set(F, A-record)` overwrites B because F is the only physical key.
6. Registry now claims A is authoritative although B is the current browser document.

This is a registry rollback, not merely a missed cleanup.

## STATE validation becomes self-defeating after rollback

Existing `forwardFrameAgentState()` usefully compares the state sender's documentId with the stored registry record.

After stale A overwrote B:

- legitimate current STATE from B is rejected because stored documentId is A;
- the registry cannot heal itself from B state updates;
- UI can retain stale/missing remote selection information until another registration/reconciliation occurs.

A documentId check on STATE is therefore necessary but insufficient. REGISTER itself must be generation-safe.

## COMMAND becomes contradictory

Current command delivery is by `{tabId, frameId}` without exact child `documentId`.

After the rollback:

- registry metadata/permission checks refer to stale A URL/document receipt;
- Chrome message delivery by frameId can reach current B;
- command semantics are therefore authorized using A-shaped registry state but executed in B.

This concretely composes the registry rollback with the already known P1-171 exact-command-target defect.

Even if A and B share the same URL, same-URL navigation/reload remains a distinct document generation and must not inherit session/selection/print authority.

## REGISTER must be a compare-and-current-document transition

A safe registration contract needs browser-authoritative document generation.

At minimum:

- registry identity is `(tabId, frameId, childDocumentId, topDocumentGeneration)`;
- a new REGISTER may replace a slot only when worker proves that childDocumentId is the current document occupying F under the current top generation;
- an old REGISTER cannot overwrite a record belonging to a newer/current document generation merely because it is processed later;
- same-URL replacement still invalidates A.

Possible implementation mechanisms include exact-document browser APIs/current frame enumeration where available, or a top-document/session receipt that admits child registration only for the current discovered document generation. The implementation must not use `registeredAt` as navigation authority.

## Top-document generation remains part of the receipt

A valid child B registration under top document T1 must not automatically survive top navigation T1→T2 even if the child frameId/documentId happens to appear reusable.

REGISTER receipt should therefore bind both:

- child exact document generation;
- current top WebClip selection/control session generation.

Late A/B registrations from an old top session become stale instead of being forwarded into the replacement top document.

## Registry healing/reconciliation

LIST and command admission should be able to prune/repair stale records rather than treating map contents as self-authenticating.

When a current child sends a registration that conflicts with stored stale document identity, the system needs a browser-currentness check and then may atomically replace the stale record. It must not simply reject B forever because A happened to win the last worker message race.

Detached dynamic frames should likewise be removed so the 64-entry cap represents live/current generations.

## Permission composition

Optional host permission proves WebClip may access the origin; it does not prove which document generation is current.

A stale A registry record must not be preserved merely because permission for A's origin still exists. Conversely B must not inherit A's active WebClip frame-session authority solely because it has the same granted origin.

P1-201/P1-193 remain separate permission lifecycle/admission owners.

## Required regressions

1. A registers F -> navigate F to B -> B registers -> release delayed A register -> registry remains B/current; A cannot roll it back.
2. Same A/B URL -> stale A still cannot replace B.
3. After attempted stale A register, legitimate B STATE is accepted and routed to exact current top generation.
4. Command after A/B replacement targets exact B document receipt; stale A metadata cannot authorize a frameId-only send.
5. B registers before old A asynchronous forwarding to top completes -> old A register event is not delivered as current to replacement top document.
6. Top document T1→T2 while child B remains/reappears -> old T1 child registration does not become T2 session authority.
7. Late scripting injection into obsolete A cannot register/overwrite current B under P1-125 late-success reconciliation.
8. Dynamic iframe detach/recreate with reused/different frameIds prunes stale registry records and does not exhaust cap with historical entries.
9. Permission remains granted across A→B same origin -> access permission persists, but WebClip selection/control session generation is re-established explicitly.
10. Permission revoked during stale/current registration race -> no record becomes command-authoritative until current permission/document state is revalidated.
11. Worker restart reconstructs no false ordering from `registeredAt`; current documents re-register/reconcile under new worker/top session generation.
12. Current normal frame registration remains low-latency and does not require trusting page-provided identity fields beyond browser sender/document receipts.

## Duplicate check

- **P1-171** is primary: exact child/top document generation for registry and commands.
- **P1-200** owns remote frame control-session generation/order.
- **P1-125** owns late scripting actual-settlement/document receipt.
- **P1-193/P1-201** own optional permission admission/revocation and do not replace document identity.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_FRAME_AGENT_RESOURCE_SCAN_BUDGET_2026-08-28.md`

SHA-256 of UTF-8 source text: `774518d07b955a9744c779445545cc4db148eeae22c279b62adbc8dd8d4f5ec3`

# Research delta — cross-origin frame-agent resource discovery must honor DOM scan budget — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owners: **P1-003** bounded resource prefetch, **P1-160** shared DOM traversal budget and **P1-004** cross-origin iframe feature parity.

## Source proof

Top `content.js` has an explicit selected-resource DOM discovery cap (`PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5000`) and bounded resource task count.

Cross-origin `frame-agent.js::prefetchSelected()` uses a different implementation:

```js
const imgs=[];
for (const root of state.includes.values()) {
  if (root.matches?.('img')) imgs.push(root);
  for (const x of root.querySelectorAll?.('img') || []) imgs.push(x);
  if (imgs.length >= 100) break;
}
```

The intended final image count is small (`imgs.slice(0,100)`), but the limit is checked only **after** `querySelectorAll('img')` for one include root has been fully returned and iterated.

## Why the 100-image cap is not a traversal cap

For one selected container containing N images:

1. `querySelectorAll('img')` scans the complete subtree synchronously;
2. the `for...of` loop pushes every returned image into `imgs`;
3. only after the full loop finishes does code test `imgs.length >= 100`;
4. later network/decode work uses only `imgs.slice(0,100)`.

Thus a 100-item task limit can still require O(N) DOM discovery and retain O(N) element references for that root.

The 5-second `end=Date.now()+5000` budget is created after discovery and therefore cannot abort the synchronous scan itself.

## Deterministic stress case

- Cross-origin iframe has granted optional host permission.
- User selects one large root.
- Root contains 200k image elements (or a framework-generated pathological subtree).
- `prepare-print` reaches `prefetchSelected()`.
- Before any bounded image decode loop begins, frame-agent scans and pushes the full 200k list.
- The child can stall its document/extension command channel and retain a large JS array despite the advertised 100-resource result cap.

This can make top multi-frame preparation hit timeout and also compose with P1-214 partial-prepare cleanup behavior in sibling frames.

## Required contract

Cross-origin frame resource discovery should use the same class of bounded traversal as top content:

1. common visited-node cap, or a remote-specific cap that is no weaker than the documented resource policy;
2. stop as soon as enough image tasks have been collected;
3. avoid materializing a full array/NodeList result merely to take its first N matches;
4. include traversal time in the frame prepare deadline;
5. on traversal budget exhaustion, return bounded diagnostics (`scanTruncated/omitted`) and continue/fail according to product policy rather than hanging;
6. do not retain references to discarded candidates.

A TreeWalker/indexed live collection with explicit visited/task counters is preferable to full-selector materialization for this path.

## Regression cases

1. Selected remote root with 10 images -> all eligible tasks behave normally.
2. Root with 100 images -> at most 100 tasks.
3. Root with 10k/200k images -> traversal stops at documented visited/task budget without first retaining the full set.
4. Multiple include roots share one aggregate budget rather than each receiving an unbounded scan.
5. Budget exhaustion reports truncation without converting it into a false “all resources checked” success.
6. Slow/large frame cannot indefinitely block sibling-frame prepare outside the parent operation deadline.
7. Top and cross-origin paths expose comparable bounded diagnostics.

## Duplicate check

P1-003 already owns bounded resource prefetch and P1-160 owns broad traversal. P1-004 requires cross-origin feature behavior to preserve those safety properties. No new stable item is necessary.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_FRAME_PERMISSION_LATE_COMMAND_RESULT_2026-08-28.md`

SHA-256 of UTF-8 source text: `5b430c6fd22f9643ddc244d431bf41cabce281168204fe7215804bd4f52609c4`

# Research delta — optional frame permission generation vs late command result — 2026-08-28

Source-of-truth `main` immediately before this write: `9819f436231c1bf8630af4c2f5b52eab82864aa2`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-201** optional-permission revocation lifecycle and composes with **P1-199/P1-200/P1-171** print/control/document generations.

The earlier P1-201 research proves revocation can strand an already injected child and block ordinary cleanup. This pass isolates another boundary: **a command admitted while permission generation A was valid can settle successfully after A has been revoked, and current top/content code may still consume that late result as current state.**

No new root cause is needed.

## Current command admission checks permission only before send

Worker frame command flow usefully checks optional host permission immediately before sending a command to the stored child frame.

If permission is already absent, ordinary command is rejected and registry row may be removed.

This prevents a command from being newly admitted after known revocation.

It does not answer what happens when:

1. permission was valid at admission/send;
2. child command is already executing;
3. permission is revoked;
4. old command returns a success response afterward.

Permission revocation cannot cancel arbitrary already-running isolated-world JavaScript.

## Top command fanout accepts late success without permission-generation receipt

`content.js::commandMappedRemoteFrames()` awaits `targetRemoteFrame(remote, command, extra)` and, on success, simply pushes `{ remote, response }`.

The response carries no immutable permission generation that the top content script revalidates against current worker permission state.

For print, `prepareRemoteFramesForPrint()` then treats each successful response as current:

- adds `remote.frameId` to `state.remotePrintPrepared`;
- stores `response.documentHeight`;
- aggregates resource prefetch results.

There is no post-response proof that the permission generation under which `prepare-print` was admitted still exists.

## Deterministic revoke-during-prepare schedule

1. Origin O has optional permission generation A.
2. Remote frame F is selected and mapped under A.
3. Top starts `prepare-print(A)`; worker permission precheck passes and command reaches child.
4. Child sets `phase='printing'`, begins prefetch/style preparation.
5. User revokes O while the child command is still running.
6. Chrome/worker permission state is now generation B = revoked.
7. Child's already-running old A command finishes and returns `{ok:true, documentHeight, resourceReport}`.
8. Top receives the response and marks F `remotePrintPrepared` because no permission-generation check exists at result consumption.
9. The wider PDF preparation can continue using an artifact/result produced under revoked generation A unless a separate later failure happens to stop it.

The worker's initial permission check was correct at step 3; the missing rule is result-generation freshness at step 8.

## This is not fixed by event-driven cleanup alone

P1-201 should add `permissions.onRemoved` and invalidate top/child state promptly.

But event delivery and command response delivery can race. Correctness cannot depend on which callback arrives first in top content.

Even if a revocation notification usually clears `remoteFrames` quickly, an old Promise continuation may still hold a `remote` object and process its response afterward.

Therefore each async frame command/result needs an immutable capability/session generation and a final currentness check before publishing state.

## Permission generation belongs in the command receipt

A frame command receipt should bind at least:

- exact top document generation;
- exact child documentId/frame generation;
- permission origin/pattern + permission generation;
- remote selection/control session generation;
- command sequence/generation;
- print generation for prepare/restore where applicable.

The response is accepted only if all required generations are still current for the semantic effect it is about to publish.

For an ordinary user command, a revoked permission generation makes the old result stale even if child execution technically succeeded.

## Print-specific rule

`prepare-print` success means only “child preparation code completed under generation A.” It is not authorization to include that child in a PDF after A is revoked.

Before top marks `remotePrintPrepared` / before top-level PDF admission:

- verify current permission generation still equals A;
- verify exact child/top/session/print generation still equals receipt;
- mismatch => invalidate this prepared result and fail/abort the current selected-frame print according to P1-199/P1-201;
- perform cleanup-only rollback where safely possible without restoring ordinary access authority.

A revoked frame must not remain printable merely because preparation finished first.

## Selection/control result rule

The same principle applies to other commands that return state/results:

- restore locator result;
- get-state/list-driven synchronization;
- start/set-mode acknowledgements;
- remote frame measurements/state used to update top UI.

Late old-A success cannot resurrect a remote snapshot, counts or session after revocation/re-grant generation B.

## Re-grant makes the race stronger

Schedule:

1. command CA admitted under permission generation A;
2. revoke A;
3. re-grant same origin as new generation B;
4. start fresh B session;
5. old CA response arrives.

A simple current boolean `permissions.contains(origin) === true` would now pass again, but the response is still stale. Therefore post-result validation must compare **generation**, not only current yes/no permission.

This is why P1-201 needs explicit permission-generation issuance rather than repeated boolean checks alone.

## Cleanup-only result semantics

Revocation cleanup is special. A cleanup command authorized by the worker specifically to neutralize old generation A may be allowed to settle after permission is absent.

Its receipt must be marked cleanup-only and can only:

- remove listeners/markers;
- restore exact old print-owned temporary state;
- clear/quarantine old selection state;
- acknowledge teardown.

It cannot publish new page content/selection data or become authority for re-granted B.

## Required regressions

1. prepare-print admitted under A -> revoke before response -> late success is rejected as stale; frame is not marked current prepared.
2. Same sequence where revocation notification reaches top after command response callback -> final generation check still prevents current adoption.
3. Same sequence where notification reaches top first -> old Promise continuation cannot re-add stale prepared state.
4. A revoked then same origin re-granted B before old A response -> current permission boolean true is insufficient; A response remains stale.
5. Old A `get-state`/restore result after B session starts cannot replace B snapshot/counts.
6. Cleanup-only revocation command may settle after revoke and neutralize A but cannot create B selection authority.
7. Child navigates during command -> P1-171 exact document generation invalidates response independently of permission.
8. Print generation changes while old prepare runs -> P1-199 invalidates response independently of permission.
9. Permission for unrelated origin removed -> current O generation/result remains valid.
10. Revoke after all selected-frame preparation but before top debugger PDF admission -> final print admission rechecks permission generation and fails/omits according to explicit product policy; it never silently prints revoked frame state.
11. Revocation during restore-print does not allow old cleanup to roll back a newer re-granted print generation.
12. Real unpacked Chrome test races site-access revoke/re-grant against a deliberately delayed child prepare response.

## Duplicate check

- **P1-201** primary: permission generation/revocation lifecycle.
- **P1-199** exact remote print generation.
- **P1-200** remote selection/control command sequencing.
- **P1-171** exact top/child document identity.
- **P1-193** user-gesture/request admission; a valid original grant does not make late results timeless.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_FRAME_PERMISSION_PORT_SCOPE_2026-08-27.md`

SHA-256 of UTF-8 source text: `d510bab9102efc277edb1238f2a485288d664d24393b23ef0d7e93650395f1ec`

# Research delta — optional frame host-permission port scope — 2026-08-27

Source-of-truth `main` immediately before this write: `c8e5d6b83cef8c67a526f963c001ac18d3f0723f`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines:

- **P1-193** — gesture-safe, bounded, source-document-bound optional host-permission request must request the intended candidate capability, not a broader host scope;
- **P1-201** — revoke/re-grant lifecycle must preserve exact permission scope/generation;
- **P1-004** — cross-origin iframe feature-level permission boundary;
- **P1-171/P1-200** remain separate document/control-generation requirements after permission exists.

The defect is a least-privilege mismatch between exact iframe origin discovery and the Chrome match pattern actually requested/checked.

## Chrome platform contract

Chrome match patterns support an optional explicit port component.

Chrome's current match-pattern documentation states that when port is omitted it is treated as a wildcard equivalent to `:*`; it also explicitly notes that match patterns match all ports unless an explicit port is specified.

Therefore these are materially different capability scopes:

- `https://example.test:8443/*` — one explicit port;
- `https://example.test/*` — all HTTPS ports on that host.

This is platform behavior, not merely a string-formatting preference inside WebClip.

## Fresh source proof — popup drops the discovered port

### 1. Candidate discovery retains exact origin

`collectCrossOriginFrameOrigins(tabId)` receives candidate frame URLs/origins and normalizes each through:

`new URL(...).origin`.

For a non-default port this preserves the port, e.g.:

`https://frames.example.test:8443`.

Candidates are de-duplicated as exact origins and bounded to at most 16.

This is the correct discovery granularity.

### 2. `frameHostPermissionPattern()` discards `url.port`

The popup then converts each discovered origin into a permission pattern using approximately:

- parse URL;
- require HTTP/HTTPS + hostname;
- return `${url.protocol}//${url.hostname}/*`.

`url.port` is omitted.

Thus discovered candidate:

`https://frames.example.test:8443`

becomes requested permission:

`https://frames.example.test/*`.

Under Chrome match-pattern semantics, that request authorizes every HTTPS port on `frames.example.test`, not only 8443.

### 3. Multiple exact-port candidates collapse into one broader permission

Candidate discovery de-duplicates by exact origin, so:

- `https://frames.example.test:8443`;
- `https://frames.example.test:9443`

are two distinct discovered origins.

But after port-dropping conversion both become:

`https://frames.example.test/*`.

The subsequent `Set` collapses them to one host-wide all-port permission.

The browser therefore receives less precise capability information than WebClip discovered.

## Fresh source proof — worker repeats the same broadening

### 4. `frameAgentPermissionPattern()` also discards port

Service worker permission validation parses a frame URL and similarly constructs:

`${url.protocol}//${url.hostname}/*`.

`frameAgentHasGrantedHostPermission(value)` passes that pattern to:

`chrome.permissions.contains({ origins:[pattern] })`.

So runtime admission does not preserve exact origin/port either.

### 5. Broad permission can authorize another same-host port frame

A valid schedule:

1. page contains cross-origin iframe `https://frames.example.test:8443/app`;
2. discovery reports exact origin `https://frames.example.test:8443`;
3. WebClip requests host-wide `https://frames.example.test/*`;
4. user grants the browser prompt;
5. the same or later exact document contains iframe `https://frames.example.test:9443/other`;
6. worker's permission check derives the same host-wide pattern and considers the permission present;
7. frame-agent injection/control can therefore be admitted for port 9443 even though the original candidate that motivated the grant was 8443.

Navigation/document fencing from P1-171/P1-200 is still necessary, but it cannot repair an overbroad permission scope once the browser grant itself is wider than the discovered origin.

### 6. Future popup-only fix would break worker admission for exact-port grants

If popup is changed to request:

`https://frames.example.test:8443/*`

but worker keeps checking:

`https://frames.example.test/*`,

then `permissions.contains()` is being asked whether the extension has the broader all-port capability. An exact-port grant is not equivalent to that broader scope.

Therefore permission request, `contains` checks, revoke/remove logic and any cached permission receipts must migrate together to one canonical scope representation.

## Why this belongs to existing P1-193 rather than a new number

P1-193 already requires a two-phase permission UX where the candidate set is:

- discovered before the gesture-sensitive request;
- bounded;
- tied to exact source tab/document generation;
- invalidated when stale.

A candidate receipt that says `origin=https://host:8443` but then requests `https://host/*` is not an exact implementation of that same permission-admission contract.

This is therefore a scope refinement of P1-193, not an independent new subsystem.

P1-201 must compose because revoke/re-grant has to operate on the same exact scope representation once permissions can be port-specific.

## Required canonical permission-scope helper

Use one shared normalization contract for popup discovery/request, worker `contains`, frame-agent admission and revoke/re-grant.

For each candidate preserve at minimum:

- scheme (`http` or `https`);
- canonical hostname;
- explicit port when the source origin has a non-default explicit/effective port and Chrome match-pattern semantics require it for exact scope;
- normalized exact origin used for document/frame identity;
- corresponding Chrome host permission pattern.

Do not independently reconstruct permission strings in popup and service worker.

### Default ports

Canonicalize default-port semantics deliberately:

- `https://host` and `https://host:443` represent the same web origin in URL canonicalization;
- `http://host` and `http://host:80` likewise.

The permission helper should produce one stable canonical representation so contains/remove/request do not disagree on syntactic forms.

### Non-default ports

For non-default ports, preserve explicit port scope in the permission pattern when Chrome supports it.

Do not broaden to all ports merely for implementation convenience.

If a product decision intentionally wants host-wide permission, that must be a deliberate/disclosed permission model rather than an accidental consequence of dropping `url.port` after exact-origin discovery.

## Gesture-safe two-phase UX composition

P1-193 still requires discovery to happen before a separate immediate user-gesture grant action.

The prepared candidate receipt shown/used by that second action should contain the exact canonical permission patterns, including non-default ports.

Immediately before request:

- prove candidate document generation still current;
- request exactly the prepared patterns;
- do not recompute a broader pattern from hostname only.

After the browser prompt settles:

- fresh-check source document generation;
- fresh-check exact granted permission scope;
- inject only frames whose exact origin is covered by the granted prepared receipt.

## Revocation / permission lifecycle composition

P1-201 revoke/re-grant must use the same exact patterns.

Required properties:

- revoking `https://host:8443/*` does not unintentionally remove an independent legitimately granted `https://host:9443/*` capability;
- an old host-wide legacy grant is detected as broader legacy state and handled explicitly during migration rather than silently represented as an exact-port grant;
- permission-added/removed events invalidate cached frame capability state by exact canonical scope and document/session generation;
- already injected agents lose authority promptly according to P1-201 when their exact required permission is no longer granted.

## Legacy broad grants / migration

Existing users may already have host-wide optional grants created by the current port-dropping implementation.

A fix must not falsely claim those grants are exact-port scoped.

Choose an explicit migration policy, for example:

- treat a broad legacy grant as broad and disclose/offer revoke + re-request exact candidates;
- or retain it as a consciously legacy broader permission until user revokes it.

Do not silently rewrite browser permission reality only in WebClip metadata.

## Deterministic regression matrix

1. Candidate `https://host.test:8443` -> prepared/requested match pattern retains `:8443`.
2. Candidate default HTTPS port -> canonical pattern remains stable and does not create duplicate `host` vs `host:443` grants.
3. Candidates `:8443` + `:9443` remain two exact permission scopes rather than collapsing to host-wide all-port permission.
4. Grant only `:8443`; frame at `:9443` fails worker permission admission before injection.
5. Grant `:8443`; `frameAgentHasGrantedHostPermission()` for `:8443` succeeds using the same exact canonical pattern.
6. Popup exact-port request + worker exact-port contains agree; popup-only migration cannot leave worker querying a broader scope.
7. Revoke `:8443`; `:9443` independent grant remains present.
8. Host-wide legacy permission is recognized as broad legacy state; UI/diagnostics do not label it as exact-port.
9. Navigation from document with `:8443` candidate to a different document/port before second grant action invalidates prepared receipt per P1-193/P1-171.
10. Permission grant settles after navigation: no frame agents are enabled in the replacement document from stale candidate receipt.
11. Permission removal while exact-port frame agent is registered causes authority invalidation under P1-201.
12. Subdomains remain exact-host unless the product explicitly requests wildcard subdomains; this port fix must not accidentally introduce `*.` scope.
13. IPv4/IPv6/localhost non-default ports use valid Chrome match patterns and preserve exact intended scope.
14. Incognito P0-045 boundary remains stricter: no persistent optional grant is derived from an Incognito source regardless of port precision.

## Positive controls retained

- candidate origins are already bounded to 16;
- only HTTP/HTTPS candidates are accepted;
- hostnames are exact rather than wildcard subdomains;
- worker rechecks actual granted permission before frame-agent authority;
- permission/document lifecycle remains separately tracked by P1-171/P1-200/P1-201.

The research does not recommend weakening these controls.

## Duplicate check / numbering

No new number is created.

- **P1-193** owns candidate/request admission and least-privilege exact scope.
- **P1-201** owns revoke/re-grant and permission-change lifecycle.
- **P1-004** remains the feature-level cross-origin iframe umbrella.
- **P1-171/P1-200** own exact frame/document/control generations after permission exists.
- **P0-045** remains the separate Incognito persistent-permission prohibition.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Real Chrome optional-permission prompt/contains/remove behavior with explicit non-default ports remains required release QA.

## Retired source: `RESEARCH_DELTA_FRAME_PERMISSION_REVOCATION_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `af0a9ed082a6e35469f9e5c128f8e1ad273c2cddd6112fffa0ffbe4015855eba`

# Research delta — cross-origin frame optional-permission revocation lifecycle — 2026-08-27

Source-of-truth `main` immediately before this write: `691565558a8722b8375d23eaac575ba6d9777d35`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## New confirmed item: P1-201 — revoking optional host permission can strand a live frame-agent session

**Classification:** P1 / evidence-reserved / confirmed by source research plus current Chrome API lifecycle contract.

Repository-wide semantic duplicate-check was performed against the canonical research files and all current `project_docs/RESEARCH_DELTA_*.md` checkpoints before assigning the number.

This is distinct from:

- `P1-193` — user-gesture/admission correctness when requesting optional host permission;
- `P1-171` — exact top/child document identity and frame registry lifetime across navigation;
- `P1-200` — selection-session/control command generation and ordering while commands remain admitted;
- `P1-199` — print prepare/restore generation ordering;
- `P0-075` — hostile-page synthetic-input/control-plane trust;
- feature-level `P1-004`, which remains the umbrella for cross-origin iframe support and real permission QA.

The missing invariant here is **revocation lifecycle ownership**: once the user removes the optional host permission, an already injected frame-agent must promptly lose WebClip behavioral authority and must not survive as an uncleanable active selection/print session in the current document.

## Source proof

### 1. Worker validates permission on REGISTER, STATE and ordinary COMMAND

The service worker correctly checks optional host permission in several places:

- `registerFrameAgent(sender)` rejects a child whose origin no longer has permission;
- `forwardFrameAgentState()` rejects STATE if the current sender/registered URL no longer has permission;
- `sendFrameAgentCommand()` rechecks permission immediately before `tabs.sendMessage()` and removes the registry record if permission is absent.

This is a valuable positive boundary: after revoke, new frame state is not intentionally accepted as trusted by the worker.

### 2. There is no `chrome.permissions.onRemoved` lifecycle handler

Fresh source search finds no `chrome.permissions.onRemoved.addListener(...)` in the current worker.

Therefore WebClip has no event-driven transition when Chrome reports that one of the optional iframe origins was revoked.

Registry cleanup happens only opportunistically when later code tries to address the frame and `sendFrameAgentCommand()` discovers the missing permission.

### 3. The ordinary cleanup path becomes impossible after revoke

`sendFrameAgentCommand()` performs the permission check **before** sending any child command.

If permission is absent it deletes the worker registry row and throws:

`Host permission для iframe отсутствует или был отозван.`

That same helper is used for lifecycle commands including:

- `stop`;
- `clear`;
- `restore-print`;
- `set-mode` and other normal controls.

Consequently, once permission has been revoked, WebClip's normal worker-mediated cleanup path refuses to send the very `stop`/`restore-print` command that would make an already injected frame-agent inert.

### 4. Already injected frame-agent has real local behavior independent of later worker permission checks

`frame-agent.js` installs capture-phase DOM listeners when `start()` is called:

- `document.addEventListener('click', click, true)`;
- `document.addEventListener('keydown', key, true)`.

While `state.phase === 'selecting'`, a usable click is intercepted with:

- `preventDefault()`;
- `stopPropagation()`;
- `stopImmediatePropagation()`;

and then mutates the frame-agent's local Include/Exclude maps/attributes.

While phase is `review` or `printing`, the click handler still prevents/default-stops the event even though it does not create a new selection.

These behaviors execute locally inside the already injected isolated-world script. They do not require another worker COMMAND for each click.

### 5. Rejected STATE messages do not stop the child

After revoke, `sendState()` can still call `chrome.runtime.sendMessage()` from the existing child script. The worker's STATE path correctly rejects it because permission is gone.

But rejection is only a failed message response. `frame-agent.js` catches/discards send errors; it does not transition itself to idle or remove listeners when the worker refuses the state update.

Thus worker-side fail-closed data admission and child-side lifecycle cleanup are currently different things.

### 6. Top content retains stale remote snapshot/state

Top `content.js` keeps `state.remoteFrames` entries and their last accepted `remote.snapshot`.

Ordinary remote lifecycle operations such as `stop`, `clear`, `set-mode` are fire-and-forget through `commandMappedRemoteFrames(...).catch(() => {})`; individual command failures are ignored unless an explicitly fail-closed print operation requested otherwise.

If permission was revoked, the worker may delete its registry row while top content still retains the previous mapped frame/snapshot and count state.

Therefore the UI can remain based on a previously selected remote frame even though current permission no longer authorizes access to that frame.

A later `prepare-print` for a selected remote frame uses `failClosed=true`, so the save can then fail because the stale top snapshot still demands a frame that the worker correctly refuses to command.

### 7. Revoke during print can strand `printing` behavior

`preparePrint()` in the child sets `state.phase = 'printing'`, mutates resource attributes and mounts the print stylesheet.

Normal cleanup requires `restore-print`, which removes the current print style, restores changed attributes and returns phase toward selecting.

If permission is revoked after `prepare-print` but before cleanup, the worker's permission precheck prevents `restore-print` from being sent through the current command helper.

The child may therefore remain in `printing` state with its capture click handler still suppressing page interaction and with temporary print/resource state not restored until another local escape/navigation/reload path happens to alter the environment.

Pressing Escape is not an adequate cleanup contract: the child Escape handler sets phase idle/removes input listeners, but it does not execute `restorePrint()` and therefore does not prove print-style/resource rollback.

### 8. Re-grant does not create a fresh agent generation

At top of `frame-agent.js`:

- if `globalThis.__WEBCLIP_FRAME_AGENT_LOADED__` is already true, a reinjection attempt only sends `WEBCLIP_FRAME_AGENT_REGISTER` and returns;
- it does **not** recreate `state`, clear old selections, remove old listeners, reset print state or establish a new permission/session generation.

Therefore revoke -> later grant -> reinjection in the **same document** can re-register the old in-memory agent rather than create a clean post-consent session.

If local Include/Exclude state changed while permission was absent, `start()` after re-grant does not clear those maps; it simply sets `phase/mode`, installs listeners (idempotently) and sends the current snapshot.

This means state that survived the revoked interval can become visible/current again after re-grant even though the new grant should authorize a fresh explicit lifecycle, not silently resurrect an old one.

## Chrome platform contract relevant to this finding

Current Chrome documentation exposes `chrome.permissions.onRemoved` specifically to notify an extension when access has been removed.

Current `chrome.scripting` documentation also explicitly notes that unregistering content scripts does not remove scripts or styles that have already been injected. WebClip uses programmatic injection rather than dynamic registration, but the important lifecycle point is the same: extension code cannot assume that removing future injection authority itself performs cleanup inside an already running document.

Current Chrome messaging documentation describes `tabs.sendMessage()` as messaging an extension's existing content script in a tab; host permission is required to **inject** into arbitrary hosts, while WebClip's additional permission check in `sendFrameAgentCommand()` is its own fail-closed policy. Therefore cleanup of an already-known exact injected agent needs an explicit narrowly scoped revocation path rather than relying on ordinary privileged-command admission.

Real unmanaged Chrome QA remains required to characterize revoke/re-grant behavior exactly for the project's supported Chrome build, but the current source has no safe lifecycle even under the conservative assumption that the injected isolated-world context survives until document replacement.

## User-visible / correctness effects

A permission revoke during an active cross-origin frame session can produce one or more of:

- clicks inside the iframe remain swallowed by the old agent even though the user revoked access;
- top UI retains stale Include/Exclude counts/snapshot for the revoked frame;
- ordinary Stop/Clear cannot reach the agent because the worker refuses the command after permission loss;
- PDF preparation fails closed later because top state still references a selected frame that is no longer commandable;
- revoke during print leaves child print/resource mutations incompletely restored;
- re-grant in the same document re-registers an old in-memory selection/print session instead of establishing a fresh permission generation.

The worker's data-admission checks prevent this from being classified as a confirmed post-revoke confidentiality exfiltration. The confirmed issue is lifecycle/control correctness and honoring user revocation promptly, hence P1 rather than P0.

## Required P1-201 contract

### Permission-generation authority

Treat optional host permission as a lifecycle generation/capability, not only a boolean checked at each command.

For every registered remote frame, bind at least:

- exact child document identity from `P1-171`;
- top document generation;
- granted origin/pattern;
- permission generation/receipt;
- current selection session generation (`P1-200`);
- current print generation when applicable (`P1-199`).

A permission generation becomes permanently stale when Chrome reports removal of that origin.

### Event-driven revocation

Listen to `chrome.permissions.onRemoved` and identify affected registered frame agents immediately.

On revoke:

1. invalidate/remove affected worker registry authority;
2. notify exact top document/session so stale remote snapshots/counts are removed or explicitly marked unavailable;
3. attempt a **cleanup-only** command to the exact already injected child document when it is still reachable;
4. cleanup command must not grant or reuse ordinary page-data authority and must not accept new selection/content data after revoke;
5. if exact child cleanup cannot be delivered/proved, top state still becomes revoked/fail-closed and the condition is surfaced diagnostically until document replacement.

Do not route this cleanup through the same permission precheck that intentionally blocks ordinary `start/set-mode/restore/prepare-print` commands after revoke.

### Child fail-safe

The child agent needs an explicit revocation/disable transition that is idempotent and local:

- remove click/keydown listeners;
- restore any print-owned temporary state safely by exact generation;
- clear or quarantine selection maps/markers according to product policy;
- reject later ordinary commands from an old permission/session generation;
- remain inert until a fresh granted generation is explicitly started.

A child-side runtime disconnect/error alone is not proof of revoke and should not blindly clear legitimate state; revocation must come from worker-owned permission authority or exact session teardown.

### Re-grant must be fresh

Granting the same origin again must establish a new permission generation.

An already-loaded `__WEBCLIP_FRAME_AGENT_LOADED__` instance may be reused as code, but its old lifecycle state must not silently become current. Re-registration must reset/reconcile to the newly issued generation before `start`, and stale pre-revoke snapshots/print generations cannot cross that boundary.

### Compose with P1-200/P1-199

Permission generation is orthogonal to selection and print generations:

- `stop(A-permission)` cannot affect a newer re-granted generation B except through an explicit safe cleanup rule;
- old selection-session events cannot become valid merely because origin permission is later granted again;
- old `restore-print` cannot touch a newer print generation;
- revoked permission must dominate all ordinary session commands regardless of their sequence number.

## Required deterministic/browser regressions

1. Start remote selection under permission generation A; revoke origin; immediately click inside iframe: old agent no longer intercepts the click after revocation cleanup settles.
2. Revoke while top UI has remote includes: top removes/marks unavailable the remote snapshot and does not continue showing it as currently authorized selection.
3. Revoke then call ordinary Stop/Clear: cleanup does not depend on an ordinary permission-authorized command and leaves child inert.
4. Revoke while child phase is `review`: page clicks are no longer swallowed after cleanup.
5. Revoke after `prepare-print(A)` but before `restore-print(A)`: child print style/resource attrs are restored/neutralized exactly; no permanent `printing` state survives.
6. Revoke when cleanup delivery fails because child navigated/detached: worker/top still invalidate authority; no stale snapshot remains usable.
7. Revoke -> interact with page -> re-grant same origin in same document: a fresh permission generation starts with no selections created/changed during revoked interval.
8. Re-grant does not accept delayed STATE/REGISTER from pre-revoke generation as current.
9. Revoke one of several allowed origins: only affected frames are invalidated; unrelated granted frame sessions continue normally.
10. Permission removal event for an unrelated optional permission does not tear down valid frame agents.
11. Same-origin iframe path remains unaffected; P0-003 behavior is preserved.
12. Navigation/document replacement during revoke composes with P1-171 and cannot retarget cleanup to a reused frameId/document.
13. Delayed old selection/control messages compose with P1-200 and remain stale even after re-grant.
14. Delayed old print cleanup composes with P1-199 and cannot roll back a newer print generation.
15. Real unpacked Chrome: revoke from extension/site-access UI while actively selecting in a cross-origin iframe, verify immediate inert behavior, then re-grant and verify clean new session.

## Classification / numbering

- New evidence-reserved `P1-201` assigned by this research block.
- `P1-004` remains the feature-level cross-origin iframe umbrella and stays PARTIAL until P1-171/P1-193/P1-199/P1-200/P1-201 plus real permission QA are closed.
- `P1-193` remains permission-request user-gesture/admission.
- `P1-200` remains selection/control ordering.
- `P1-199` remains print-generation ordering.
- `P0-075` remains hostile-page control-plane trust.
- No new P0 or P2 number is assigned.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_RESEARCH_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_HOSTILE_REMOTE_FRAME_PRINT_INTERACTIONS_2026-08-28.md`

SHA-256 of UTF-8 source text: `567d07bbdf217900491fd3b19f28571ae9bf7977a94d7977b2a8b3b3c9582362`

# Research delta — hostile remote-frame print/control interaction revalidation — 2026-08-28

Source-of-truth `main` immediately before this write: `4e85e09f36c8981fe38af90a5f12af324b0bd3f5`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh current-source proof strengthens the intersection of existing owners rather than establishing an independent root cause:

- **P0-075** — host DOM/control-plane trust and page-visible selection markers;
- **P1-199** — cross-origin print-operation generation/prepare→restore ownership;
- **P1-200** — remote selection/control session generation and child-local lifecycle events;
- **P1-203** — child agent state surviving/loss of worker-generation authority;
- **P1-167** — bounded selected-content preprocessing/remote image enumeration;
- **P0-071** — exact printed representation safe URI/link boundary.

No P1-211 or new P0 is allocated.

## 1. Child Escape can race an already-running async `prepare-print`

Current `frame-agent.js::preparePrint()` does:

1. `state.phase = 'printing'`;
2. `await prefetchSelected()`;
3. compute document height;
4. create and append `PRINT_STYLE_ID`;
5. store `state.printStyle`;
6. return success.

The child `keydown` handler is independent. For any `state.phase !== 'idle'`, Escape immediately:

- sets `state.phase='idle'`;
- removes click/keydown listeners;
- sends an idle state event.

It does not invalidate an in-flight `preparePrint()` generation.

Deterministic schedule:

1. valid top session sends `prepare-print(A)`;
2. child enters `printing` and awaits a slow image decode in `prefetchSelected()`;
3. user presses Escape while focus remains in the child frame;
4. child reports `idle` and removes listeners;
5. async prefetch A later resolves;
6. the old `preparePrint(A)` continues and mounts print CSS despite the local lifecycle having moved to idle;
7. it returns `{ok:true}` to the old command.

This is stronger than a simple UI phase mismatch: an already superseded control decision can still mutate the actual representation used for PDF.

### Ownership

- P1-200 must make the Escape/local phase transition generation-bound and authoritative rather than an unversioned independent writer.
- P1-199 must make `prepare-print(A)` validate that its print generation is still current after every awaited phase and before committing print-owned DOM mutations.
- P1-203 remains relevant if worker restart occurs inside the same window.

Do not implement this as cancellation-by-timeout. The late async task may continue; generation fencing must make its late commit harmless.

## 2. Escape during/after printing still does not rollback print-owned mutations

Existing P1-203 source proof remains current: the Escape handler sets phase idle/removes listeners but does not call `restorePrint()` and does not restore `changedAttrs` or remove `state.printStyle`.

Therefore Escape after resource mutations/style mount can leave print-owned child DOM state present while the child advertises idle.

The fixed design needs one transition protocol:

- if Escape cancels the current print generation, exact A-owned mutations must be restored;
- if Escape is not allowed to cancel printing, it must not independently publish idle/remove lifecycle authority while A remains current;
- stale Escape/state events from an older selection generation cannot cancel a newer one.

## 3. Hostile child can still mutate page-visible selection markers that print CSS trusts

Cross-origin selection authority is held partly in `state.includes/state.excludes`, but selected nodes also carry predictable page-visible attributes:

- `data-webclip-remote-include`;
- `data-webclip-remote-exclude`.

`preparePrint()` builds selected-only CSS directly around those attributes. Host-page JavaScript in the child document can therefore add/remove/change the marker attributes independently of the extension-side Maps.

A hostile child can, for example, add the Include attribute to an unrelated subtree or remove Exclude from a selected subtree before print rendering. The current print CSS does not prove that every marker it sees corresponds to the authoritative extension-held selection generation.

This is the already registered P0-075 principle: page-visible markers cannot be the authoritative print-selection boundary. Cross-origin iframe support does not create a weaker trust model merely because the worker has optional host permission.

Required direction remains:

- derive a bounded inert/frozen print representation or exact generation-owned markers immediately from extension-held state;
- hostile page mutation after derivation must either be unable to affect the representation or cause fail-closed generation validation;
- cleanup is exact-generation owned and never trusts host-added markers as extension authority.

## 4. Remote prefetch bound still has the known P1-167 enumeration weakness

`prefetchSelected()` intends to stop at 100 images, but for each included root it executes:

`for (const x of root.querySelectorAll('img') || []) imgs.push(x)`

before checking `if (imgs.length >= 100) break` at the outer-root level.

A single hostile included subtree with a very large number of `<img>` descendants can therefore materialize/enumerate far more than the intended 100-item work set before later `imgs.slice(0,100)` processing.

This remains P1-167 and is not duplicated.

The eventual generation-aware `prepare-print` implementation must check its generation while traversing/prefetching and before committing DOM mutations, but generation checks do not replace the shared node/time budget.

## 5. Print generation and selection generation must remain distinct

A tempting repair is one generic `sessionId`. That would conflate two lifecycles already separated by P1-199/P1-200.

Required composition:

- `selectionSessionId` / selection generation owns start/stop/mode/clear/restore and child-local Escape authority;
- `printGenerationId` is created under one current selection generation and owns prefetch/style/resource mutations;
- every `prepare-print`/`restore-print` references both exact child document generation and the applicable selection/print generations;
- a newer print within the same selection session invalidates old print commits/restores without ending selection;
- ending selection invalidates all subordinate in-flight print generations.

## Required regressions

1. Delay `prefetchSelected(A)`, press Escape before it settles, then let A settle: stale A cannot mount print style or claim success for the cancelled/superseded lifecycle.
2. Escape after A mounted style/resource mutations: final state is either exact A rollback + consistent top/child idle, or Escape is rejected/deferred while A remains authoritative; never idle-with-print-mutations.
3. Delayed stale Escape/state event from selection A cannot stop selection B.
4. Print A restore arriving after print B prepare cannot remove B-owned style/attrs (existing P1-199 regression remains).
5. Host script adds fake Include/Exclude marker attributes after user selection: printed scope is determined only by extension-authoritative generation or fails closed.
6. Host removes legitimate marker attrs: no silent substitution of selected content; exact representation remains stable or operation aborts.
7. One selected root with >100k images: remote prefetch traversal obeys P1-167 bounded node/time work and does not materialize the entire descendant set first.
8. Worker restart during prefetch composes with P1-203: old child print generation is reconciled/cleaned, never silently adopted by a new worker session.
9. Permission revoke/regrant during the same flow cannot resurrect old child selection/print authority.
10. Safe-link/URI filtering from P0-071 is applied to the exact final print representation, not merely to mutable live markers before hostile `beforeprint`/DOM changes.

## Duplicate check / numbering

No new item is created.

Primary composition: **P0-075 + P1-199 + P1-200 + P1-203**, with **P1-167/P0-071** as preprocessing/representation dependencies.

P1-201…P1-210 remain occupied; P1-211 remains unassigned by this block.

## Test / release state

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_FRAME_COMMAND_FANOUT_2026-08-27.md`

SHA-256 of UTF-8 source text: `96c0de238ead4f716b41c995798b7c6d916bbd1db1b63b66bc44e35d629f8a1c`

# Research delta — cross-origin frame command fan-out

Date: 2026-08-27
Source-of-truth `main` immediately before write: `e1e316bbce0298c2b1c28f58c523733e9860c0b7`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P1-167 must be refined — aggregate PDF-preparation time is unbounded across remote-frame RPC fan-out

P1-167 already owns the missing aggregate node/time/mutation/string budget across PDF-preparation paths. Fresh source research proves an additional independent contributor inside that same root cause: cross-origin frame commands multiply bounded per-frame waits because top-frame dispatch is strictly sequential and has no enclosing operation deadline.

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

## Retired source: `RESEARCH_DELTA_REMOTE_FRAME_CONTROL_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `ca9a322b0ecdcd698b6499558c2d365b45bc3ec2ffe66e92f62f28479f22c233`

# Research delta — cross-origin frame selection/control generation

Date: 2026-08-27
Source-of-truth `main` immediately before initial write: `aa7978e106a12b5cf0f1e2740eb26484cb2df973`.
Latest refinement baseline: `7c398b6e1d0ea904439e76307859f6957807c1a3`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. This checkpoint does not claim synchronization into both canonical research files.

## P1-200 — remote frame selection/control commands are not session-generation fenced

**Status:** CONFIRMED by source research; pending canonical sync and implementation.

### Root cause

Cross-origin frame selection/control commands are relayed asynchronously through top `content.js` → service worker → child `frame-agent.js`, but the command protocol carries no selection-session generation or monotonic command sequence.

Top-frame callers intentionally launch several control mutations fire-and-forget:

- `setSelectionMode()` calls `commandMappedRemoteFrames('set-mode', { mode })` without awaiting actual settlement;
- `clearSelections()` can call `commandMappedRemoteFrames('clear')` fire-and-forget;
- `stopSelection()` calls `commandMappedRemoteFrames('stop', { clear })` fire-and-forget;
- a newly registered frame while top state is selecting receives `targetRemoteFrame(..., 'start', {mode})` asynchronously.

The service worker does not serialize commands per `{tab, frame, selectionSession}`. `sendFrameAgentCommand()` independently performs a bounded host-permission check and then an independently bounded `tabs.sendMessage`. Two valid commands launched in order A→B can therefore reach the child in order B→A when their prerequisite/IPC latency differs.

`frame-agent.js` accepts the command solely by name and mutates one unversioned state object:

- `start(mode)` unconditionally sets `phase='selecting'`, assigns `mode`, installs listeners;
- `set-mode` unconditionally assigns `state.mode`;
- `clear` unconditionally removes all current include/exclude selections;
- `stop(clearToo)` unconditionally removes listeners and sets `phase='idle'`;
- `restore` mutates current selection maps.

There is no command/session generation check and no last-applied sequence.

### Deterministic failure examples

#### Old stop overtakes new start

1. Selection session A begins closing and sends `stop(A)`; its worker permission/RPC path is delayed.
2. User immediately starts selection session B in the same unchanged document; `start(B)` reaches the child first.
3. Top UI is visibly in selection mode B.
4. Delayed `stop(A)` now reaches the child and sets `phase='idle'`, removing click/keydown selection listeners.
5. A subsequent real user click in that cross-origin iframe is no longer intercepted as WebClip selection and may execute the page's native navigation/control behavior.

This is a control-plane authority mismatch, not just stale display state.

#### Old mode change overtakes latest mode

1. Top sends `set-mode(exclude)`.
2. User switches back to Include and top sends `set-mode(include)`.
3. Include reaches the child first; old Exclude arrives later.
4. Top UI says «Включены», but the child frame treats the next user click as Exclude.

The resulting selection snapshot/PDF semantics can therefore contradict the mode the user explicitly sees.

#### Old clear overtakes new selections

A fire-and-forget `clear` from an earlier selection lifecycle can arrive after a newer `start`/restore/user selection and erase newer remote selections because clear has no generation ownership.

### Child-local Escape independently desynchronizes authoritative phase

Fresh refinement found the same authority split even without command reordering.

`frame-agent.js` installs a local `keydown` handler. If Escape is pressed while child `state.phase !== 'idle'`, the child directly:

1. sets `state.phase='idle'`;
2. removes its click/keydown selection listeners;
3. sends a state event with `phase:'idle'`.

Top `content.js::handleRemoteFrameEvent()` handles `event === 'state'` only when a snapshot is present; it stores `remote.snapshot` and updates counts. It does not consume the child `phase` as an authoritative transition of the top selection session.

Therefore:

1. top and child begin one valid selection session;
2. focus is inside the cross-origin iframe and user presses Escape;
3. child becomes idle and removes selection listeners;
4. top toolbar/session remains `selecting` and still displays the current Include/Exclude mode;
5. the next user click inside that iframe is native page interaction rather than WebClip selection even though the top UI still says selection is active.

The protocol has two independent writers of selection lifecycle state (top commands and child-local Escape) without one generation-aware authority/acknowledgement model.

### Classification / duplicate check

`P1-200` was free in the fresh canonical registry when assigned. A later repository-wide research-delta review also found existing command-identity checkpoints for top-document navigation (`P1-175/P1-171`) and OperationLog generation (`P1-197`), but no prior same-document remote selection/control-generation owner.

This is not a duplicate of:

- **P1-171** — document/navigation identity of frame registry and commands. P1-200 reproduces in one unchanged document with correct frame/document identity.
- **P1-175** — top-document command admission/retargeting across navigation. P1-200 is child-frame same-document session/control ordering.
- **P1-199** — print-operation generation for `prepare-print`/`restore-print`. P1-200 concerns ordinary selection/control state (`start/stop/set-mode/clear/restore`) before print and requires a selection-session/control ordering contract.
- **P1-167** — aggregate PDF-preparation work/deadline. Short commands can still reorder even when every call is fast/bounded.
- **P1-004** — feature-level cross-origin iframe support umbrella. P1-200 is a concrete same-document command/state authority defect.

P1-199 and P1-200 may share a protocol primitive (versioned command envelope), but they require different lifecycle generations: print generation must not be conflated with selection-session generation.

### Required contract

Introduce a document-bound **selectionSessionId / selectionGeneration** plus monotonic control sequence for remote frame commands and one explicit authority model for child-local lifecycle events.

Required invariants:

1. Every top-level start of a selection lifecycle creates/increments a generation bound to the current top/child document generation from P1-171.
2. `start`, `set-mode`, `clear`, `stop` and `restore` carry that generation; child rejects commands for older generations.
3. Within one generation, mutating control commands carry a monotonic sequence or pass through a per-frame serialized actual-settlement queue so a lower sequence cannot overwrite a higher one.
4. `stop(A)` must never stop selection generation B.
5. `set-mode` latest-wins exactly: child mode after settlement must equal current top UI mode.
6. `clear(A)` must not erase selections created/restored in B.
7. `restore` from an old snapshot/application attempt must not mutate a newer interactive session.
8. Child state responses/events carry generation so top does not accept stale snapshots/phase as current.
9. Escape/local child lifecycle cannot silently create an `idle child / selecting top` split. Either Escape is promoted as a generation-bound request/event that consistently changes the authoritative top session, or the child remains under top authority and does not independently terminate selection.
10. Any child-originated phase transition is acknowledged/reconciled before top UI continues to advertise selection authority for that frame.
11. Navigation/document replacement still invalidates everything per P1-171.
12. Print generation P1-199 is layered on top of the current selection generation and remains separately fenced.

Do not solve this by blind retry after timeout. A local timeout is not proof a command was not delivered; generation/sequence makes late delivery harmless.

### Required regressions

Use deterministic delayed worker/child command delivery:

1. delayed `stop(A)` → `start(B)` → deliver stop(A): child remains selecting B;
2. delayed `set-mode(exclude,#n)` → later `set-mode(include,#n+1)` → deliver old exclude last: final mode remains include;
3. delayed `clear(A)` → start/select in B → deliver clear(A): B selections survive;
4. old `restore(A)` delivered after interactive B starts: no mutation of B maps;
5. stale child `STATE` event from A cannot replace B snapshot/count/phase UI;
6. same-generation commands delivered out of order converge to highest valid sequence;
7. worker/runtime timeout followed by late settlement cannot alter a newer generation;
8. navigation while commands are in flight composes with P1-171 and rejects the old document generation;
9. press Escape while focus is inside a selected cross-origin frame: after settlement top and child have one consistent session phase; no visible selecting UI may coexist with an idle child that passes clicks through;
10. delayed stale Escape/state event from A cannot stop B;
11. print prepare/restore still uses its independent P1-199 generation without reopening selection-control races.

Real unpacked Chrome QA should include rapid Stop/Start, Include↔Exclude toggles, and Escape inside an intentionally delayed cross-origin iframe relay.

## Test / release state

No production files or `manifest.json` were modified by this checkpoint or refinement.

Product tests were **not rerun** for this docs-only research write. No build/tag/release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_FRAME_PRINT_PARTIAL_PREPARE_ROLLBACK_2026-08-28.md`

SHA-256 of UTF-8 source text: `ff956911aaa98f8378e74b161f5d83f670fecfc347a44ed4492e5274ad9427d2`

# Research delta — cross-origin frame print partial-prepare rollback — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-214** — multi-frame `prepare-print` orchestration must retain rollback ownership for every child that has already mutated its document, even if a later child fails before aggregate preparation completes.

This composes with the frozen print/document-generation work, remote-frame exact-document requirements and P0-075 cleanup-generation rules, but the concrete root cause is partial-success compensation bookkeeping.

## Source proof

Top `content.js::prepareRemoteFramesForPrint()` currently starts with:

```js
state.remotePrintPrepared.clear();
const responses = await commandMappedRemoteFrames(
  'prepare-print', {}, { onlySelected: true, failClosed: true }
);
for (const { remote, response } of responses) {
  state.remotePrintPrepared.add(remote.frameId);
  ...
}
```

`commandMappedRemoteFrames()` invokes selected remote frames sequentially. With `failClosed:true`, an error from any child is thrown immediately.

Therefore `remotePrintPrepared.add(frameId)` runs **only if the whole command loop returned successfully**.

## Child prepare is stateful

`frame-agent.js::preparePrint()` is not a read-only query. It:

- sets `state.phase='printing'`;
- calls `prefetchSelected()`;
- may temporarily replace image `src` from `data-src`;
- may change `loading='lazy'` to `loading='eager'`;
- records those mutations in `state.changedAttrs`;
- creates and appends a print `<style>`;
- stores it in `state.printStyle`.

`restore-print` is required to remove the style and restore recorded attributes.

## Deterministic partial-success schedule

1. Selected remote frame A receives `prepare-print`.
2. A succeeds and now owns live temporary mutations + print style.
3. Top `commandMappedRemoteFrames()` proceeds to selected frame B.
4. B rejects/times out/stales.
5. Because `failClosed=true`, the loop throws instead of returning its accumulated responses.
6. `prepareRemoteFramesForPrint()` never reaches the loop that inserts A into `state.remotePrintPrepared`.
7. Parent save path fails and calls normal `restoreAfterPrint()`.
8. `restoreRemoteFramesAfterPrint()` enumerates `state.remotePrintPrepared`, which does not contain A.
9. A never receives `restore-print`.
10. A remains in `phase='printing'` with temporary resource attrs/style installed.

A retry can then invoke A `prepare-print` again on top of orphan state, creating another mutation layer/style while only the newest `state.printStyle` is directly referenced.

## Consequences

- page appearance/state inside A can remain modified after a failed PDF operation;
- stale print CSS can survive into normal browsing or future operations;
- `state.changedAttrs` can accumulate multiple generations;
- retry cleanup can restore values in the wrong temporal order;
- later selection/print behavior can be affected by a failed earlier attempt;
- repeated partial failures can accumulate orphan styles.

This is deterministic and needs no hostile page.

## Required orchestration contract

A child `prepare-print` is a mutation that returns a rollback receipt, not merely a data response.

Acceptable implementation patterns:

### Incremental ownership

- invoke one frame;
- on its successful prepare response, immediately register exact frame/document/prepare generation in the rollback set;
- only then invoke the next frame;
- on any later failure, compensate every already registered prepare in reverse/order-safe fashion before propagating the failure.

### Explicit transaction/receipt coordinator

- each child returns `prepareGenerationId`;
- parent stores it immediately;
- restore command carries and checks that generation;
- parent `finally` compensates all prepared children unless ownership was intentionally transferred to an active print generation.

The rollback set must be generation-aware: a late restore for old A cannot undo a newer successful prepare B in the same frame.

## `clear()` at function start is not sufficient

`state.remotePrintPrepared.clear()` before new work discards parent bookkeeping; it does not undo mutations already present inside a child.

A retry should first reconcile/restore any known previous prepare receipts, and a partial prepare should never become unknown solely because aggregate collection threw.

## Regression cases

1. A prepare succeeds, B fails -> A receives exact `restore-print` before operation becomes terminal error.
2. A/B succeed, C fails -> both A/B are restored.
3. First A fails -> no other child is marked/restored unnecessarily.
4. Restore A times out -> receipt remains pending/unknown; retry does not blindly stack new prepare over A.
5. Parent/content context is destroyed after A success -> durable/document-owned recovery policy leaves no stale cross-frame print mutation indefinitely where architecture can prevent it.
6. Retry after successful compensation starts from clean child state.
7. Old restore generation cannot remove the style/attrs of a newer print generation.
8. A stale/reloaded child document is not treated as the original prepared child.
9. Multiple selected remote frames preserve bounded rollback bookkeeping.
10. Successful normal print still restores all selected remote frames exactly once.

## Numbering result

**P1-214 is assigned to this partial-success compensation root cause.**

Remote document/permission/selection-generation owners remain separate; P1-214 specifically owns retaining and compensating already-completed child prepare side effects when aggregate preparation fails.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Deterministic mocked frame-agent and real browser multi-frame failures are required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_FRAME_RESTORE_RECEIPT_SETTLEMENT_2026-08-28.md`

SHA-256 of UTF-8 source text: `41fca48f8818349d794923d039e56a05184420e052c790e4db4b1b832f9780e1`

# Research delta — remote frame restore receipt must survive unknown settlement — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number. This is the settlement half of **P1-214**.

## Source proof

Current `content.js::restoreRemoteFramesAfterPrint()` does:

```js
const ids = [...state.remotePrintPrepared];
state.remotePrintPrepared.clear();
for (const frameId of ids) {
  const remote = state.remoteFrames.get(frameId);
  if (!remote) continue;
  try { await targetRemoteFrame(remote, 'restore-print'); } catch (_) {}
  remote.printHeight = 0;
}
```

The rollback ownership set is therefore destroyed **before** any child restore command has actually settled.

Failures are intentionally swallowed and the frame id is not reinserted.

## Deterministic unknown-restore schedule

1. Remote frame A successfully prepared print state and parent correctly tracks A.
2. Parent begins cleanup.
3. Parent copies A into local `ids` and immediately clears authoritative `remotePrintPrepared`.
4. `restore-print` to A times out/rejects/channel closes.
5. A may still be in `phase='printing'` with temporary attrs/style, or the command may have applied but response was lost.
6. Parent catches the error and continues.
7. No durable/in-memory receipt now says A requires reconciliation.
8. Next print starts from apparently clean parent state.

This is exactly the kind of distinction P1-214 needs to preserve: `restore requested` is not `restore proven settled`.

## Why blind retry also needs generation identity

A non-cancellable/response-lost restore may have actually succeeded. If parent later starts a newer prepare generation B in the same frame and then retries an old unversioned `restore-print`, the old command can restore/clear **B's** style/attributes because frame-agent restore state is singleton and not generation-bound.

Therefore retaining only a frameId is not enough for the final repair. Parent and child need exact prepare/restore generation receipts.

## Required contract

1. Child successful `prepare-print` returns an immutable `prepareGenerationId`.
2. Parent keeps `{frameId, documentId, prepareGenerationId, state}` until cleanup is proven.
3. `restore-print` carries the exact generation.
4. Child restores only if that generation still owns current temporary print mutations.
5. Parent removes the receipt only after positive restore acknowledgement for that exact generation.
6. Timeout/channel failure leaves receipt `restore-unknown`, not forgotten.
7. Before admitting another prepare in the same child, reconcile or explicitly supersede the old generation under a safe child-side rule.
8. Reloaded child/document generation invalidates old command authority without falsely claiming that old live mutations were restored in the vanished document.

## Regression cases

- restore success -> receipt removed exactly once;
- restore timeout before child receives command -> receipt remains pending;
- child restores but response is lost -> reconciliation observes clean/exact generation and retires receipt without touching a newer generation;
- old restore response arrives after prepare B -> cannot clear B;
- one of several frame restores fails -> successful siblings retire, failed one remains reconcileable;
- page operation error path never silently discards known rollback debt.

## Duplicate check

This does not create P1-215. **P1-214** owns remote print partial-prepare/rollback settlement as one saga: admission, per-child ownership, compensation and exact retirement are one correctness contract.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

