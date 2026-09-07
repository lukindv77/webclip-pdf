# P1-199 — Exact generation for cross-origin frame print prepare/restore

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner question

P1-199 owns one narrow ordering/integrity problem:

> Cross-origin frame print prepare/restore state needs exact print-operation generation; stale restore cannot undo newer prepare.

It is distinct from, but must compose with:

- P1-171 — exact top/child document generation for frame registry/list/commands;
- P1-200 — selection-session generation/ordering for remote-frame control;
- P1-198 — worker-issued physical live-operation identity;
- P1-203 — injected frame-agent vs restarted MV3 worker reconciliation;
- P1-003 / P1-150 — resource readiness and truthful bounded print representation.

P1-199 asks which **print preparation generation** owns temporary print-only mutations in one exact cross-origin child document and which restore command may remove them.

## 2. Current cross-origin print path

```text
top content.js
  -> WEBCLIP_FRAME_AGENT_TARGET
service-worker.js
  -> chrome.tabs.sendMessage(..., { frameId })
child frame-agent.js
  -> preparePrint() / restorePrint()
```

Temporary state includes:

- lazy-image `src` / `loading` changes;
- one injected print-only style;
- child `phase = printing`;
- top-side remote prepared tracking and print height.

Because this state is mutable and temporary, ordering is part of correctness.

## 3. Top content.js source defect

Current state includes:

```js
remoteFrames: new Map(),
remotePrintPrepared: new Set(),
```

The prepared set records only `frameId`; it does not record an exact print generation.

Current prepare flow is shaped as:

```js
async function prepareRemoteFramesForPrint() {
  state.remotePrintPrepared.clear();
  const responses = await commandMappedRemoteFrames(
    'prepare-print', {}, { onlySelected: true, failClosed: true }
  );
  for (const { remote, response } of responses) {
    state.remotePrintPrepared.add(remote.frameId);
    ...
  }
}
```

The frame is remembered only **after** successful response. If the command was already admitted/sent but the local caller times out, the top document can lose cleanup ownership of an effect whose actual settlement is still unknown.

Current restore flow is:

```js
async function restoreRemoteFramesAfterPrint() {
  const ids = [...state.remotePrintPrepared];
  state.remotePrintPrepared.clear();
  for (const frameId of ids) {
    ...
    await targetRemoteFrame(remote, 'restore-print');
  }
}
```

It carries no generation and clears ownership knowledge before remote settlement.

A further race is created by:

```js
function restoreAfterPrint() {
  restoreRemoteFramesAfterPrint().catch(() => {});
  ...
}
```

while `prepareForPrint(meta)` starts with:

```js
restoreAfterPrint();
...
await restoreRemoteFramesAfterPrint();
await syncRemoteFrameAgents();
```

The first restore is fire-and-forget. It can clear the set and remain unresolved while the second explicit restore sees no ids and returns, allowing a newer prepare to proceed while an older restore is still in flight.

## 4. service-worker.js source defect

`WEBCLIP_FRAME_AGENT_TARGET` forwards fields such as:

```text
mode
clear
kind
locator
```

but no print-generation field.

`sendFrameAgentCommand()` sends:

```js
chrome.tabs.sendMessage(
  tabId,
  { type: 'WEBCLIP_FRAME_AGENT_COMMAND', command, ...payload },
  { frameId }
)
```

and wraps the Promise in `withOperationTimeout(...)`.

The timeout helper is a `Promise.race` against a timer. This changes the caller's observation but does not cancel the already-created `chrome.tabs.sendMessage` operation.

Therefore:

```text
local timeout
!=
proof that child command did not or cannot settle later
```

P1-199 must remain correct under late actual settlement.

## 5. frame-agent.js source defect

Current frame-agent has one shared mutable print slot:

```text
state.printStyle
state.changedAttrs[]
state.phase
```

There is no print generation or closed-generation fence.

Current prepare:

```js
async function preparePrint() {
  state.phase = 'printing';
  const resourceReport = await prefetchSelected();
  ...
  state.printStyle = s;
  return ...;
}
```

The `await prefetchSelected()` is a state-race boundary. An older prepare can resume after a newer command and publish stale state unless it re-checks generation after the await.

`prefetchSelected()` itself can temporarily change image attributes and records rollback data in the shared `state.changedAttrs` array. Two overlapping prepares therefore do not have separate rollback ownership.

Current restore is unconditional:

```js
function restorePrint() {
  state.printStyle?.remove();
  state.printStyle = null;
  for (const x of state.changedAttrs.reverse()) {
    ... restore attribute ...
  }
  state.changedAttrs = [];
  if (state.phase === 'printing') state.phase = 'selecting';
  return { ok: true };
}
```

Any delivered `restore-print` can therefore remove whichever generation currently occupies these shared slots.

## 6. Deterministic failure schedules

### 6.1 Stale restore after newer prepare

```text
prepare A -> child state A
prepare B -> child state B
restore A -> removes shared state B
```

### 6.2 Old async prepare finishes after B

```text
prepare A starts
A awaits image decode
prepare B starts/completes
A resumes
A publishes style/state without ownership re-check
```

### 6.3 Restore arrives before late prepare of same generation

```text
prepare A admitted
caller times out
cleanup restore A arrives first
late prepare A settles afterward
```

A simple `restoreGeneration === currentGeneration` check is insufficient here. Restore must leave a terminal fence so late `prepare(A)` cannot revive the generation.

### 6.4 Fire-and-forget old restore overlaps new prepare

```text
old frame marked prepared
new prepareForPrint begins
restoreAfterPrint() starts old restore and returns
second restore sees cleared set
new prepare begins
old restore settles late
```

## 7. Target identity model

P1-199 introduces one dedicated ordering field:

```text
printGeneration
```

It is different from:

```text
client operationId
physicalOperationId
selectionSessionGeneration
child documentId
```

Recommended binding:

```text
exact child document identity
+ printGeneration
= ownership of temporary print-only state
```

Once P1-171 supplies exact child-document targeting, the generation must be scoped inside that document identity.

## 8. Generation issuance and top-side tracking

Trusted top `content.js` should advance a monotonic generation for each newly admitted print preparation, e.g. conceptually:

```js
const printGeneration = ++state.nextPrintGeneration;
```

The coordinator must record the generation **before awaiting** the remote prepare response.

Target tracking should be generation-valued, for example:

```text
frame/document -> {
  generation,
  settlement: issued | prepared | unknown
}
```

This replaces frameId-only `remotePrintPrepared` semantics.

Print generation is an ordering fence, not an authorization capability and not caller correlation metadata.

## 9. End-to-end propagation

The same generation must cross all three layers:

```text
content.js
  prepare-print { printGeneration }
        |
service-worker.js validates/forwards
        |
frame-agent.js preparePrint(printGeneration)
```

and later:

```text
content.js
  restore-print { same printGeneration }
        |
service-worker.js
        |
frame-agent.js restorePrint(printGeneration)
```

Dropping the field at the worker routing layer defeats the fence.

## 10. Required child-frame state machine

A robust frame-agent needs concepts equivalent to:

```text
highestSeenPrintGeneration
closedThroughPrintGeneration
activePrintGeneration
phase: idle | preparing | prepared
generation-bound rollback state
```

Exact names are implementation details.

### prepare(g)

1. validate a bounded positive ordered generation;
2. reject/no-op if `g <= closedThrough`;
3. reject/no-op if `g < highestSeen`;
4. duplicate current prepared `g` returns an idempotent receipt;
5. newer `g` supersedes and safely cleans previous active print state;
6. adopt `g` as `preparing`;
7. run bounded resource preparation;
8. after each await, verify that `g` is still current and not closed;
9. only then publish style and final rollback state;
10. return exact `g` in the response.

### restore(g)

1. if `g < highestSeen`, it is stale and must not touch current state;
2. if `g === highestSeen`, mark `g` closed before/atomically with cleanup;
3. if `g > highestSeen`, record `g` as closed/unseen and advance the fence;
4. repeated restore is idempotent;
5. cleanup removes only state owned by `g`.

Required invariant:

```text
once restore(g) closes g,
no later settlement from prepare(g) may recreate print state
```

## 11. Why a child-local mutation queue is also useful

Generation fencing should be combined with a small serialized print-state mutation chain inside `frame-agent.js`.

Reasons:

- `preparePrint()` is asynchronous;
- message handlers can overlap;
- caller-side timeout cannot cancel an already delivered mutation;
- a child-local queue makes adopt/supersede/close transitions atomic.

Serialization does **not** replace generation: late/out-of-order commands still need a stale/closed test.

## 12. Generation-bound rollback ownership

Current shared `state.changedAttrs` is not enough.

Preferred conceptual state:

```text
activePrintState = {
  generation,
  printStyle,
  changedAttrs,
  phase
}
```

Temporary mutations created by generation `g` belong to `g`. A stale generation must never revert state now owned by a newer generation.

## 13. Unknown settlement rule

A timed-out prepare is:

```text
outcome = unknown
```

not:

```text
proved cancelled
```

The top coordinator should retain issued generation knowledge and later send `restore(g)`/closure even when prepare response was not observed.

Because restore tombstones `g`, cleanup is safe even if the late actual prepare arrives afterward.

## 14. Success/restore receipts

Prepare success should echo the exact generation, e.g. conceptually:

```json
{
  "ok": true,
  "printGeneration": 41,
  "resourceReport": {},
  "documentHeight": 12345
}
```

Top content accepts the result only if it matches the generation currently issued for that exact frame/document.

Restore can truthfully distinguish stale no-op:

```json
{
  "ok": true,
  "printGeneration": 40,
  "restored": false,
  "stale": true
}
```

Stale is not an operational failure; it means the fence prevented corruption of newer state.

## 15. Composition with P1-171 document identity

The worker registry already records `sender.documentId`, a useful positive control.

Current Chrome `tabs.sendMessage()` supports both `frameId` and `documentId` targeting; `documentId` is available from Chrome 106. The project declares minimum Chrome 118, so this API surface is compatible with the current floor.

P1-171 remains the owner of exact document targeting. P1-199 requires composition such as:

```text
(tabId, frameId, exact documentId/document generation, printGeneration)
```

A generation belonging to old child document A must not become authoritative in replacement document B merely because `frameId` was reused.

## 16. Composition with P1-200 and P1-198

Selection ordering and print ordering are separate:

```text
selection generation S12
print generation P41
```

P1-200 owns remote selection/control ordering.

P1-198 separately establishes:

```text
caller operationId = correlation metadata
worker physicalOperationId = physical live execution identity
```

P1-199 adds:

```text
printGeneration = ordering ownership of temporary frame print state
```

The print generation must not be derived from free-form caller `operationId`.

## 17. Composition with P1-203 / MV3 restart

P1-203 owns re-handshake when an injected frame-agent outlives worker registry state.

P1-199's contribution is child-document-local current/closed print-generation state. A worker restart must not make an old restore authoritative merely because worker memory was lost.

No claim is made that print generation survives tab/document destruction; it is temporary exact-document state.

## 18. Why top-side serialization alone is insufficient

Even if the top code executes:

```text
await restore A
then prepare B
```

its local timeout can return before the actual old Chrome message settles. Therefore the child receiving the page mutation must independently decide whether the incoming generation is current or stale.

## 19. Why current-generation equality alone is insufficient

This check is incomplete:

```js
if (restoreGeneration !== currentGeneration) return;
```

It protects `restore A` after B is already current, but not:

```text
restore A arrives first
late prepare A arrives later
```

Hence the required **closed/tombstone generation fence**.

## 20. Bounded representation

A positive JavaScript safe integer is sufficient for a single exact-document content-script lifetime if:

- only trusted extension code increments it;
- overflow is handled explicitly;
- exact document identity scopes it;
- host-page data cannot choose it.

An opaque UUID alone is less convenient because old/new ordering then requires a retained tombstone set.

## 21. Defensive integrity scope

This research is defensive architecture/state-integrity analysis only.

Required trust rule:

> temporary page mutations are restored only by the exact print generation that owns them; stale extension messages cannot remove newer temporary state.

## 22. Deterministic model

`project_tools/test_p1_199_cross_origin_print_generation_model.js` covers 12 scenarios:

1. current-shaped stale restore erases newer state;
2. stale restore is harmless after newer prepare;
3. restore-before-prepare blocks late revival;
4. old async prepare cannot publish after supersession;
5. newer prepare cleans old state first;
6. current restore is idempotent and leaves a fence;
7. duplicate current prepare is idempotent;
8. coordinator records issued generation before response;
9. unknown settlement plus cleanup remains safe;
10. multiple stale restores cannot affect current generation;
11. print generation is independent of caller correlation;
12. generation is scoped by exact frame-document key, composing with P1-171.

A model PASS is architecture evidence only, not production PASS.

## 23. Source-bound RED gate

The source gate requires future production evidence for:

- explicit print-generation state in `content.js`;
- generation-valued per-frame issued/prepared tracking;
- prepare admission recording before remote settlement;
- generation propagation through worker routing;
- generation arguments in `preparePrint()` and `restorePrint()`;
- frame-agent current/highest generation state;
- closed/tombstone generation state;
- post-await stale check in async prepare;
- stale restore no-op/reject semantics;
- newer-prepare supersession cleanup;
- explicit source invariant that stale restore cannot undo newer prepare.

Current production source is expected to remain RED.

## 24. Recommended implementation sequence

1. add document-scoped `nextPrintGeneration` in top `content.js`;
2. replace `remotePrintPrepared: Set` with generation-valued issued/prepared tracking;
3. record generation before awaiting each remote prepare;
4. propagate generation through `WEBCLIP_FRAME_AGENT_TARGET`;
5. add frame-agent generation state and a serialized print mutation chain;
6. bind style/changedAttrs rollback state to active generation;
7. fence async prepare after awaited resource work;
8. make restore close/tombstone its generation before cleanup;
9. make newer prepare supersede/clean older active state;
10. return exact generation receipts;
11. compose with exact document targeting under P1-171;
12. run deterministic gates;
13. run real Chrome delayed prepare/restore races;
14. only then consider closing P1-199.

## 25. Physical Chrome evidence required before closure

At minimum:

- `prepare A -> prepare B -> delayed restore A` leaves B prepared;
- `prepare A delayed -> restore A -> late prepare A` leaves frame restored/closed;
- `prepare A awaits resource -> prepare B -> A resumes` cannot publish A state;
- two selected cross-origin frames maintain independent generation ownership;
- duplicate restore is harmless;
- duplicate prepare does not duplicate style/rollback state;
- local command timeout cannot let late settlement corrupt a newer generation;
- reused frameId/new document remains fenced with P1-171;
- physical PDF still includes selected remote-frame content;
- resource report / document height are accepted only for matching generation;
- no orphan print style or temporary image attributes remain after failure cleanup.

## 26. External platform evidence

Current official Chrome Extensions documentation was checked on 2026-09-07.

Relevant facts:

- one-time `runtime.sendMessage()` / `tabs.sendMessage()` return a Promise resolved by recipient response;
- asynchronous `sendResponse()` is supported via the existing `return true` channel pattern;
- `tabs.sendMessage()` can target by `frameId` or `documentId`;
- `documentId` targeting is available from Chrome 106;
- WebClip's current manifest floor is Chrome 118.

These platform facts support the routing/unknown-settlement analysis. The concrete P1-199 defect itself is source-bound to WebClip state management.

## 27. Non-goals

This research does not:

- close P1-199;
- modify production runtime;
- close P1-171, P1-198, P1-200, or P1-203;
- claim local timeout cancels a Chrome message;
- change selection/PDF fidelity semantics;
- change optional host-permission policy;
- alter release readiness or Registry status.

## 28. Conclusion

Current WebClip cross-origin print preparation has this unsafe combination:

```text
frameId-only prepared Set
+ no print generation in commands
+ async preparePrint()
+ shared printStyle/changedAttrs
+ unconditional restorePrint()
+ local timeout that is not cancellation
```

Target contract:

```text
exact frame document
+ exact ordered printGeneration
+ generation-bound rollback state
+ closed-generation fence
```

Core invariant:

```text
stale restore cannot undo newer prepare,
and restore(g) prevents any late prepare(g) from reviving state.
```

P1-199 remains ACTIVE pending runtime implementation and real Chrome race evidence.
