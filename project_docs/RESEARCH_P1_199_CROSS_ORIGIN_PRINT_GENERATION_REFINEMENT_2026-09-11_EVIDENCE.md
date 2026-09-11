# P1-199 — Cross-origin print-generation refinement

Date: 2026-09-11  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-199`  
Registry status: **ACTIVE**  
Canonical baseline: `main = 122a041ced8d33618a92878c4e824202ea88e0d1`  
Research branch: `research/p1-199-cross-origin-print-generation-refinement-2026-09-11`

Production/runtime modification: **NONE**.

This refinement does not change `content.js`, `frame-agent.js`, `service-worker.js`, `manifest.json`, release policy, release readiness, release receipts, package state, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner

Current `RESEARCH_REGISTRY.md` authority is:

> P1-199 ACTIVE — Cross-origin frame print prepare/restore state needs exact print-operation generation; stale restore cannot undo newer prepare.

P1-199 owns one narrow ordering and temporary-state-ownership problem:

> In one exact child document, every remote print preparation command and every cleanup command must carry one ordered `printGeneration`; stale or closed generations cannot mutate or restore state owned by a newer generation, and a cleanup that reaches the child before a late same-generation prepare must permanently fence that late prepare from reviving temporary print state.

No new P-code is required.

## 2. Fresh current-main provenance

Historical provenance branch inspected only as provenance:

`research/p1-199-cross-origin-print-generation-2026-09-07`

Relative to the current baseline it is:

- merge-base `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- ahead by 3 historical research commits;
- behind current `main` by 51 commits.

The production mechanism relevant to P1-199 is nevertheless byte-identical between that historical branch and current `main`:

| File | Historical branch blob | Current main blob |
|---|---|---|
| `content.js` | `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` | `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` |
| `frame-agent.js` | `ce55145dc7ee1a4abf485b7fad3134ac39b61751` | `ce55145dc7ee1a4abf485b7fad3134ac39b61751` |
| `service-worker.js` | `6d61ac81befdbf2804ae9dbec425aa08d1194eb1` | `6d61ac81befdbf2804ae9dbec425aa08d1194eb1` |

Current `manifest.json` remains:

```json
{
  "manifest_version": 3,
  "version": "0.9.8",
  "minimum_chrome_version": "118"
}
```

Therefore the old source schedules remain applicable to the current bytes. The architecture conclusions are still re-derived here because P1-214 has since been refined canonically and now owns part of the surrounding rollback protocol that the old P1-199 note described too broadly.

## 3. Current execution path

The remote print path remains:

```text
top content.js
  -> WEBCLIP_FRAME_AGENT_TARGET
service-worker.js
  -> chrome.tabs.sendMessage(...)
child frame-agent.js
  -> preparePrint() / restorePrint()
```

There are three relevant mutable layers:

1. top-page `content.js` coordinates print preparation and tracks remote children;
2. the MV3 worker routes commands to frame agents;
3. each child `frame-agent.js` mutates its own live document.

P1-199 is primarily about the third layer's ordering authority plus generation propagation through the first two layers.

## 4. Current top-page gap remains exact

Current `content.js` still has:

```js
remotePrintPrepared: new Set(),
```

and `prepareRemoteFramesForPrint()` still begins with:

```js
state.remotePrintPrepared.clear();
const responses = await commandMappedRemoteFrames(
  'prepare-print', {}, { onlySelected: true, failClosed: true }
);
```

Later it stores only a `frameId` after successful aggregate traversal.

`restoreRemoteFramesAfterPrint()` later sends:

```text
restore-print
```

without a print generation.

There is no top-page `nextPrintGeneration`, no generation bound to a remote prepare command, and no generation echoed by a child receipt.

P1-214 now owns whether each mutating child command has a pre-send compensation receipt and whether restore settlement remains represented. P1-199 only requires that the receipt carry one P1-199 generation rather than inventing another ordering domain.

## 5. Current worker gap remains exact

`service-worker.js` routes `WEBCLIP_FRAME_AGENT_TARGET` with a bounded payload containing fields such as:

```text
mode
clear
kind
locator
```

but not `printGeneration`.

Therefore even if top `content.js` minted a generation today, the worker would drop it before the command reached the child.

P1-214 already refined the separate worker-layer document-identity problem: current registration retains `MessageSender.documentId`, while current command routing falls back to frame-only addressing. P1-214 requires exact-document compensation targeting.

P1-199 must compose with that exact document identity, but does not re-own it.

Target identity is conceptually:

```text
exact child document identity D
+ P1-199 printGeneration G
= temporary print-state ordering domain
```

## 6. Current child gap remains exact

Current `frame-agent.js` keeps one singleton mutable print slot:

```text
state.phase
state.printStyle
state.changedAttrs
```

There is no generation state.

Current prepare is still conceptually:

```js
async function preparePrint() {
  state.phase = 'printing';
  const resourceReport = await prefetchSelected();
  ...
  state.printStyle = style;
  return { ok: true, resourceReport, documentHeight };
}
```

Current restore is still conceptually:

```js
function restorePrint() {
  state.printStyle?.remove();
  state.printStyle = null;
  ... restore state.changedAttrs ...
  state.changedAttrs = [];
  return { ok: true };
}
```

`preparePrint()` has an asynchronous boundary inside `prefetchSelected()`, while `restorePrint()` has no ownership check at all.

## 7. Deterministic current failure schedules

### 7.1 Stale restore erases newer state

```text
prepare G1 -> child publishes temporary state G1
prepare G2 -> child publishes temporary state G2
restore G1 -> current unversioned restore removes singleton state G2
```

The final mutation is stale but the child has no data with which to know that.

### 7.2 Restore overtakes late prepare of the same generation

```text
prepare G7 is delivered and starts async resource work
parent loses/waits out the response
cleanup restore G7 reaches child
restore G7 completes
old prepare G7 resumes after await
old prepare publishes print style/state again
```

A simple `restoreGeneration === activeGeneration` equality check is insufficient. Cleanup must leave a closed-generation fence that a later continuation of the same generation cannot cross.

### 7.3 Old async prepare publishes after a newer generation

```text
prepare G1 enters async resource preparation
prepare G2 becomes authoritative
G2 completes
G1 resumes
current source has no post-await generation test
G1 can write stale singleton state
```

### 7.4 Duplicate delivery is not explicitly idempotent

If the same logical prepare is retried because an outer response was lost, current child state has no exact generation receipt with which to distinguish replay from a new mutation.

## 8. Refined owner boundary after canonical P1-214

The historical P1-199 note included some top-side issued/prepared tracking that now belongs more precisely to P1-214.

Current split is:

### P1-199 owns

- issuance of one ordered `printGeneration` for each newly admitted logical print-preparation generation;
- propagation of that exact value top -> worker -> child;
- child-local `highestSeen` / `closedThrough` / active-generation semantics;
- stale generation rejection/no-op;
- duplicate same-generation idempotence;
- post-`await` generation freshness checks;
- newer-generation supersession ordering;
- closure-before-cleanup so late same-generation prepare cannot revive state;
- generation echo in prepare/restore receipts.

### P1-214 owns

- incremental per-child compensation receipts before mutating transport;
- `prepareState` / `restoreState` distributed settlement;
- partial-success sibling rollback;
- unknown transport settlement;
- exact old child-document compensation versus replacement document;
- retention/reconciliation of cleanup debt until terminal evidence.

P1-214 consumes P1-199's `printGeneration`; it does not mint a parallel generation.

### P1-218 owns

- exact temporary resource-attribute receipt;
- original and temporary attribute states;
- compare-before-restore;
- host-page supersession preservation;
- per-attribute rollback semantics.

P1-199 determines whether generation G is allowed to request cleanup. P1-218 determines whether a particular live attribute is still WebClip-owned and may actually be restored.

### P1-203 owns

- frame-agent / MV3 worker restart re-handshake and registry reconciliation.

P1-199's child-local fence must not depend on worker-global memory surviving a restart.

### P1-200 owns

- remote selection/control session generation and ordering.

Selection generation and print generation are independent state domains.

### P1-198 owns

- worker-issued physical live-operation identity.

`physicalOperationId` and caller `operationId` are not substitutes for `printGeneration`.

## 9. Generation issuance semantics

Recommended conceptual admission:

```text
admit logical print preparation P
-> G = nextPrintGeneration()
-> bind G to the current top-document preparation context
-> P1-214 creates exact child/document/G mutation debt before each send
-> propagate G unchanged to every participating child
```

A generation is an ordering number, not a secret, authorization capability, globally durable identifier or user correlation id.

One logical top print-preparation attempt should use one G across its children. Each child interprets G only inside its own exact document identity.

The value can be a bounded positive JavaScript safe integer if overflow is handled explicitly. It does not need global persistence across document destruction because exact browser document identity scopes the ordering domain.

## 10. Child state machine

Conceptual state:

```text
FramePrintGenerationState {
  highestSeenGeneration,
  closedThroughGeneration,
  active?: {
    generation,
    phase: preparing | prepared,
    generationOwnedTemporaryState
  }
}
```

Exact names are implementation details.

### `prepare(G)` admission

1. Validate a positive bounded safe integer.
2. If `G <= closedThroughGeneration`, return a stale/closed no-op receipt.
3. If `G < highestSeenGeneration`, return a stale/older no-op receipt.
4. If G is the same currently prepared generation, return an idempotent replay receipt without applying a second mutation set.
5. If G is the same generation already preparing, do not start a second concurrent preparation; report replay/pending or serialize behind the exact existing transition.
6. If `G > highestSeenGeneration`, supersede any older active generation using owner-safe cleanup composed with P1-218, then adopt G as `preparing`.
7. Perform bounded resource preparation.
8. After every asynchronous boundary capable of allowing another print command to run, verify that G is still active/current and not closed.
9. Publish generation-owned style/final state only if that freshness test passes.
10. Return an exact receipt echoing G.

## 11. `restore(G)` semantics

Cleanup order matters.

### Older restore

```text
G < highestSeenGeneration
-> stale no-op
-> zero writes against newer active state
```

### Current restore

```text
G == highestSeenGeneration
-> advance closedThroughGeneration to G first
-> then clean only generation-owned state
-> repeated restore remains idempotent
```

The closure fence must become authoritative before asynchronous or multi-step cleanup can expose a window for late G continuation.

### Restore arrives before unseen prepare G

If a trusted coordinator's cleanup for G arrives before this child has admitted prepare G:

```text
restore(G)
-> advance highestSeen/closedThrough through G
-> ensure any older active state is retired with owner-safe cleanup
-> later prepare(G) is stale/closed
```

This is the key tombstone property that converts caller-side unknown settlement into safe eventual compensation when composed with P1-214.

## 12. Why a child-local serialized mutation chain is useful

`preparePrint()` is asynchronous and extension message handlers can overlap in wall-clock time.

A small child-local print mutation chain is a good implementation primitive because it can make:

```text
adopt G
supersede old state
close G
publish G
```

atomic with respect to other print-generation transitions.

Serialization alone is insufficient: messages can still arrive in a logically stale order, so generation/closed tests remain mandatory.

## 13. Exact-document composition

Fresh platform documentation confirms that `tabs.sendMessage()` can target a specific `documentId`, and WebClip's current minimum Chrome version is 118 while `documentId` targeting is available from Chrome 106.

MDN's current `documentId` guidance states the key distinction directly: a frame can keep the same `frameId` while navigation replaces the document, so tab/frame identity alone has a retargeting race; document targeting prevents the operation from silently applying to the wrong document.

P1-199 therefore relies on, but does not own, this identity composition:

```text
(tabId, frameId, childDocumentId, printGeneration)
```

A generation from old document D1 has no authority in replacement document D2 even if both used the same numeric G.

## 14. Worker restart composition

Chrome's extension service-worker lifecycle documentation states that service workers can terminate and that global variables are lost when they do.

Therefore:

- the worker must not be the sole authority for current/closed child print generations;
- a worker restart cannot reset a living child agent's stale-generation fence;
- P1-203 must re-establish exact child registration;
- after that reconciliation, P1-214 can continue exact child/document/G compensation;
- P1-199 child-local generation state remains the final stale-command guard in the live child document.

This does **not** require durable generation storage after the child document itself is gone.

## 15. Transport timeout composition

Current worker-side timeout only bounds caller waiting around `tabs.sendMessage()`; the platform API does not provide a cancellation receipt proving that a delivered child handler did not or cannot complete later.

P1-214 therefore treats a timed-out mutating command as unknown settlement and retains compensation debt.

P1-199's contribution is complementary:

```text
restore(G) can safely close G
before a late prepare(G) continuation finishes
```

so unknown transport settlement does not force unsafe blind cleanup.

## 16. Generation-owned rollback does not authorize DOM overwrite

A subtle but important refinement:

```text
correct generation
!=
authority to overwrite arbitrary current host DOM state
```

Even when restore G is the current generation, P1-218 still requires compare-before-restore for temporary resource attributes.

P1-199 is an ordering fence, not a DOM compare-and-swap replacement.

Likewise, P1-219/P1-220/P1-221/P1-224 own their respective structural/header/link/style rollback identities. A single broad print generation does not collapse those finer mutation receipts.

## 17. External research

Fresh external comparison was performed for this refinement.

### Chrome Tabs API

Chrome documents `tabs.sendMessage(tabId, message, options)` with both `frameId` and `documentId`, with `documentId` available from Chrome 106. The Promise reports the response or connection error. This supports exact-document transport but does not define a cancellation/rollback contract for a handler already reached.

Source:

- `https://developer.chrome.com/docs/extensions/reference/api/tabs`

### MDN document identity guidance

MDN documents that `tabId + frameId` identifies a frame/browsing context, not the exact document in that frame; navigation can replace the document while keeping the frame identity. `documentId` exists specifically to remove that race for supported operations, including `tabs.sendMessage()`.

Sources:

- `https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_documentId`
- `https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage`

### Chrome MV3 service-worker lifecycle

Chrome documents that extension service workers are ephemeral and that global variables are lost on worker shutdown. This supports P1-203/P1-199 separation: worker memory is not a durable generation authority for a still-live child document.

Source:

- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

### SingleFile comparison

SingleFile, a mature page-capture extension, explicitly injects frame-oriented extension scripts with `all_frames: true` to process iframe content. This is useful comparison evidence that frame-local agents are a normal architecture for page capture, but it does not establish WebClip's generation protocol or correctness requirements.

Sources:

- `https://github.com/gildas-lormeau/SingleFile`
- `https://github.com/gildas-lormeau/SingleFile/wiki/How-to-integrate-the-API-of-SingleFile-into-an-extension`

External designs are comparison points only. WebClip requirements remain controlled by current project contracts and source evidence.

## 18. Deterministic refinement model

`project_tools/test_p1_199_cross_origin_print_generation_refinement_model.js` binds this refinement to current source and models both the present defect and target state.

It verifies at least:

1. exact current Registry owner remains ACTIVE;
2. baseline and source blob receipts recorded here remain current;
3. current `content.js` still uses frameId-only `remotePrintPrepared` semantics and no `printGeneration`;
4. current worker still drops `printGeneration` in `WEBCLIP_FRAME_AGENT_TARGET` routing;
5. current child still has generation-free `preparePrint()` / `restorePrint()` and singleton rollback slots;
6. stale restore erases newer state in the legacy-shaped model;
7. stale restore is a no-op in the target model;
8. restore-before-late-prepare closes the generation;
9. old async prepare cannot publish after supersession;
10. duplicate prepare/restore are idempotent;
11. exact document identity scopes generation authority;
12. worker restart does not reset a living child fence;
13. P1-214 owns per-child distributed settlement while consuming the same G;
14. P1-218 owns compare-before-restore after P1-199 ordering admission;
15. caller correlation / physical identity / selection generation remain separate domains;
16. no new P-code is introduced;
17. P1-199 remains ACTIVE pending implementation and physical closure evidence.

A model PASS is architecture evidence only. It is not production PASS.

## 19. Recommended implementation sequence

A future implementation tranche should prefer this dependency order:

1. introduce one top-document `nextPrintGeneration` / admission primitive;
2. mint G once per logical print-preparation generation;
3. propagate G through `WEBCLIP_FRAME_AGENT_TARGET` and worker routing unchanged;
4. compose command transport with P1-214 exact child `documentId` receipts;
5. add child-local highest/closed/active generation state;
6. serialize child print-state transitions or prove equivalent atomicity;
7. bind child print style and temporary mutation receipts to G;
8. add post-await freshness tests in `preparePrint()`;
9. make `restore(G)` close G before owner-safe cleanup;
10. make newer generation supersession invoke the appropriate fine-grained rollback owners rather than broad unconditional DOM writes;
11. return exact generation receipts;
12. run deterministic race tests;
13. run direct current-Chrome delayed prepare/restore tests against exact child documents.

P1-214 and P1-218 may be implemented in the same engineering wave, but their acceptance assertions must remain distinguishable.

## 20. Physical evidence required before closure

P1-199 remains ACTIVE until runtime implementation plus direct current-browser evidence covers at least:

- prepare G1 -> prepare G2 -> delayed restore G1;
- prepare G -> cleanup G overtakes delayed prepare completion;
- delayed G1 resource decode -> G2 becomes current -> G1 cannot publish;
- duplicate prepare G and duplicate restore G;
- child navigation/replacement between issue and delivery, composed with exact `documentId` targeting;
- MV3 worker restart while child document remains alive, composed with P1-203 re-handshake;
- P1-218 host mutation during cleanup so generation correctness is not mistaken for DOM overwrite authority.

These runs are implementation/closure evidence, not release authorization.

## 21. Current conclusion

P1-199 is still a real current-source defect and remains **ACTIVE**.

The historical core generation model is preserved, but its owner boundary is narrower and cleaner after canonical P1-214:

```text
P1-199 = ordered print-generation authority inside exact child document
P1-214 = distributed per-child mutation/compensation settlement using that generation
P1-218 = compare-before-restore authority for temporary resource attributes
```

The production bytes have not changed since the historical P1-199 branch, so the current gap is directly source-revalidated rather than inferred from old documentation.

No production or release state changed in this tranche.
