# WebClip — P1-197 OperationLog administrative clear generation refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = c4e91cb3c4a95a3d6a1b19b469c3f57f779b0b8f`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real unpacked Chrome: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-197** after the canonical P1-191/P1-195/P1-196 auth refinements. It selectively revalidates the historical OperationLog clear/delete contract against current `main`, corrects historical overlap with P1-205, and records a current deterministic target model. Historical research remains provenance; no historical branch is imported wholesale.

## 1. Canonical ownership

Current Registry authority is:

```text
P1-197  OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation.
```

The current Registry separately owns:

```text
P1-198  Physical live operation identity is worker-issued; caller textual operationId is correlation metadata, not ownership capability.

P1-205  OperationLog retention cleanup and queued writes need one history-generation linearization so late writer cannot resurrect expired history.
```

Therefore the canonical split for this refinement is:

```text
P1-197 = global administrative clear/delete history epoch
P1-198 = worker-issued physical operation identity / correlation split
P1-205 = automatic TTL/size per-operation retirement linearization
```

P1-197 does not absorb P1-205 automatic retention policy and does not redefine P1-198 identity issuance.

## 2. Historical P1-197 material is only partially reusable

The 2026-09-07 P1-197 branch correctly identified several durable principles:

- `operationLogWriteChains` is worker memory, not durable authority;
- administrative clear must dominate writes admitted before the clear boundary even when they settle later;
- deleting OperationLog does not cancel functional downloads, Yandex effects, Journal checkpoints or recovery receipts;
- a missing OperationLog row cannot by itself authorize stale history recreation;
- a generation/epoch must be checked at the mutation transaction boundary, not only before queueing.

However, that historical document also included per-operation retention/tombstone requirements inside P1-197. Current Registry has since separated that root cause into P1-205. Those retention/size statements are therefore reclassified as P1-205 provenance, not current P1-197 ownership.

The historical branch must not be cherry-picked or adopted wholesale.

## 3. Current-main source census

Current `service-worker.js` still declares:

```text
OPERATION_LOG_DB_NAME = WebClipOperationLogs
OPERATION_LOG_STORE = operations
OPERATION_LOG_EVENT_STORE = events
OPERATION_LOG_DB_VERSION = 2
```

and a module-memory queue map:

```text
const operationLogWriteChains = new Map();
```

The current source contains no visible durable OperationLog field/store/token named equivalently to:

```text
historyGeneration
globalHistoryEpoch
operationLogHistoryGeneration
```

The absence of one exact field name is not itself the requirement; the semantic gap is that no durable current generation is transactionally compared by every administrative-clear-sensitive writer.

## 4. Current positive control: same-worker per-operation serialization

Current runtime serializes OperationLog writes by `operationId` through `operationLogWriteChains`.

This is useful and must be preserved or replaced by an equivalent stronger property. It reduces same-worker write overtaking and gives `flushOperationLogWrites(...)` a current-worker queue to await.

It does not establish restart-safe history authority because the Map disappears with the service-worker execution context.

## 5. Current positive control: clear drains the known queue snapshot

Current `clearOperationLogs()` performs the current-worker drain conceptually as:

```text
pending = [...operationLogWriteChains.values()]
await Promise.allSettled(pending)
operationLogWriteChains.clear()
```

and then clears the OperationLog stores.

That is stronger than a blind `objectStore.clear()` and remains a positive control.

But its authority is only the queue snapshot known to that particular worker instance at that point in time.

It cannot prove that an asynchronous continuation belonging to a pre-clear physical operation will not enqueue its first/next diagnostic write after the snapshot has been taken.

## 6. Current administrative clear race

A concrete schedule does not require an already queued write:

```text
physical operation A admitted under old history
A begins async functional work
A has not yet enqueued a later diagnostic stage

user requests OperationLog clear
clear snapshots current operationLogWriteChains
A's later stage is absent from that snapshot
clear drains snapshot and clears operations/events
clear returns success

A's async stage settles
A now enqueues/writes diagnostic history
current writer has no durable old-history receipt
old A history reappears after the successful clear boundary
```

This is the current P1-197 root cause.

The bug is not that new logging can occur after clear. A genuinely new operation admitted after clear may log normally. The defect is that **pre-clear history can be republished as if it belonged to the new post-clear history generation**.

## 7. MV3 lifecycle recheck

Fresh official Chrome documentation reviewed 2026-09-11:

- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`
- `https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer`
- `https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers`

Relevant observations:

1. extension service workers are event-driven and can terminate after inactivity or unexpectedly;
2. Chrome explicitly says global variables are lost when a service worker shuts down;
3. Chrome recommends persisting important state in storage rather than relying on globals;
4. Chrome's own termination-testing guidance treats non-persistent worker state as lost across termination.

These observations support the existing WebClip rule:

```text
operationLogWriteChains = useful scheduling state
operationLogWriteChains != durable administrative-clear authority
```

No Chrome documentation is interpreted as a WebClip-specific generation protocol; the generation semantics are the project's design response to the documented lifecycle.

## 8. IndexedDB transaction recheck

Fresh web-platform material reviewed 2026-09-11:

- W3C Indexed Database API 3.0: `https://www.w3.org/TR/IndexedDB/`
- MDN Using IndexedDB: `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB`
- MDN IDBTransaction: `https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction`

Relevant observations:

1. IndexedDB read/write operations are transaction-scoped;
2. transaction commit is atomic with respect to its included database changes: either all transaction changes are written or none are;
3. abort rolls back transaction changes;
4. transaction lifetimes are short/event-loop-bound and should not be stretched across arbitrary external async work;
5. ordinary/default durability does not necessarily mean every committed byte was synchronously flushed to physical storage before the `complete` event on every implementation.

For P1-197 this supports a **logical atomicity** contract:

```text
advance global history epoch
+ clear old OperationLog headers
+ clear old OperationLog events
= one committed database transition
```

It does **not** authorize the stronger statement:

```text
ordinary IndexedDB commit = guaranteed survival of OS crash / storage eviction / power loss
```

That stronger recovery/durability classification remains under P1-194 and storage policy owners.

## 9. Target global history epoch

P1-197 needs one durable administrative history authority, conceptually:

```text
OperationLogHistoryMeta {
  historyEpoch: H
}
```

Exact key/store/schema names are implementation details.

Required properties:

- authority is persisted with OperationLog data rather than only in worker memory;
- current epoch can be read after service-worker restart;
- every OperationLog writer that belongs to a physical operation carries the epoch under which that diagnostic lifecycle was admitted;
- writer checks expected epoch against durable current epoch inside the same mutation transaction that would write the log row/event;
- epoch mismatch produces a diagnostic stale/no-op result, not history resurrection.

## 10. Capture time matters

The expected epoch must be captured when the physical diagnostic lifecycle/operation is admitted, not lazily when a later log line happens to be enqueued.

Forbidden shape:

```text
A starts before clear
clear commits H -> H+1
A later emits first log
writer asks "what is current epoch now?"
writer adopts H+1
A old history appears as new history
```

Required shape:

```text
A admitted while H current
A receipt carries H
clear commits H -> H+1
late A/H writer -> stale/no-op
```

This is where P1-197 composes with P1-198. P1-198 owns creation of the physical operation identity/context; P1-197 contributes the current OperationLog history epoch to that internal context.

## 11. Administrative clear transaction

Conceptual future transition:

```text
open one OperationLog readwrite transaction covering
  history meta authority
  operations
  events

read H
write H+1
clear events
clear operations
commit
```

The exact operation order within the transaction is secondary to the atomic committed result.

After successful completion, the stable logical state must be:

```text
current epoch = H+1
no H operation headers
no H event rows
```

If the transaction aborts, the application must not publish a successful clear boundary with a partially advanced authority.

## 12. Writer transaction rule

Every administrative-clear-sensitive OperationLog mutation must carry immutable expected epoch `H`.

Conceptual writer:

```text
writeOperationLog(receipt H, mutation)
  -> open readwrite transaction including history authority + target stores
  -> read durable current epoch C
  -> if H != C: stale-history no-op
  -> otherwise apply exact mutation
  -> commit
```

The comparison and `put/add` must not be separated into independent transactions with an arbitrary await between them.

A pre-queue check alone is insufficient because clear can commit after that check but before the writer transaction.

## 13. Event and header parity

The fence applies to both OperationLog header/summary and event rows.

Required stale result:

```text
late pre-clear header write -> no header recreation
late pre-clear event write -> no event insertion
late pre-clear event write -> no implicit default header recreation
```

A fix around only one writer family is incomplete.

## 14. New post-clear work remains allowed

Administrative clear is not a permanent logging disable.

After clear commits `H+1`, a genuinely new physical operation admitted after the boundary receives:

```text
physicalOperationId = new worker-issued identity   // P1-198
historyEpoch = H+1                                 // P1-197
```

and may create new OperationLog history normally.

Therefore UI truth after clear is:

```text
pre-clear history will not resurrect
```

not:

```text
OperationLog will stay empty forever
```

## 15. Same correlation string after clear

P1-198 matters because a user/UI may reuse the same textual correlation value later.

Example:

```text
client correlation = save-123
physical A admitted under H
clear commits H+1
late A/H -> stale

later client correlation = save-123 again
physical B = new worker-issued identity
B admitted under H+1
B may log
```

A global history epoch does not need to permanently poison the textual correlation string. Physical identity remains P1-198-owned.

## 16. P1-205 boundary: automatic retention is not this tranche

Current source also has `cleanupExpiredOperationLogs(...)` and quota cleanup/retry paths.

Those automatic TTL/size deletion races are real, but current Registry assigns their linearization to P1-205.

P1-205 may consume the same broad OperationLog history architecture, but its selective semantics differ:

```text
P1-197 clear-all:
  global H -> H+1
  every pre-clear writer becomes stale

P1-205 retention of A:
  retire exact A generation
  unrelated current B must remain writable
  global H should not advance merely because one old operation was pruned
```

This refinement intentionally does not claim that implementing only P1-197 closes P1-205.

## 17. Historical P1-197 per-operation tombstone text is reclassified

The old P1-197 document proposed both global history generation and per-operation deletion generation.

Current authority now classifies them as:

```text
global administrative epoch -> P1-197
per-operation automatic retention/size retirement -> P1-205
physical operation instance -> P1-198
```

The old per-operation reasoning remains useful design provenance for P1-205 but is not duplicated as current P1-197 acceptance.

## 18. Quota retry ownership

Current OperationLog mutation wrappers can call `cleanupExpiredOperationLogs(...)` on quota error and retry the same logical diagnostic mutation.

That is an important P1-205 resurrection schedule.

P1-197 only requires that a **global administrative clear epoch mismatch** also dominates any later retry. A quota retry cannot refresh an old P1-197 epoch after clear.

The detailed selective retirement receipt across cleanup/retry remains P1-205.

## 19. Worker restart

Schedule:

```text
A admitted under H
clear commits H+1
worker terminates
new worker starts with empty operationLogWriteChains
late/recovered diagnostic continuation still identifies A/H
```

Required:

```text
new worker reads durable H+1
A/H remains stale
empty in-memory Map does not restore A authority
```

This is the minimum restart property P1-197 needs from Chrome MV3 lifecycle semantics.

## 20. OperationLog remains diagnostic only

Administrative clear must not be reinterpreted as physical-operation cancellation evidence.

Clear must not automatically:

- cancel a Chrome download;
- prove a Yandex mutation did not occur;
- delete Journal recovery checkpoints;
- convert unknown external settlement to absent/failed;
- erase backup workflow authority;
- cancel an admitted non-cancellable external effect.

The underlying physical/domain owners remain authoritative.

A pre-clear physical operation may continue functionally after its old diagnostics become stale.

## 21. P1-194 durability boundary

P1-197 requires durable **relative to worker lifetime** and transactionally coherent history authority.

It does not claim the history epoch is guaranteed recovery evidence under every storage-loss scenario.

Conceptual distinction:

```text
worker restart while origin storage persists
  -> history epoch must persist and fence stale diagnostics

browser/profile storage eviction, catastrophic disk loss, unflushed power-loss edge
  -> broader durability classification remains P1-194/storage-policy territory
```

This avoids silently upgrading diagnostic metadata into a stronger recovery class than the platform evidence supports.

## 22. Schema evolution boundary

Current OperationLog DB is version 2 with `operations` and `events` stores.

A future implementation may need a meta store or another durable representation. This research does not prescribe the exact schema version or migration layout.

Any schema change must preserve existing OperationLog data/migration safety and follow the project's IndexedDB migration ownership rules. P1-197 acceptance is semantic: same durable transaction authority must fence clear and writers.

## 23. Deterministic negative matrix

The companion model covers at least:

```text
N01 Registry keeps P1-197 ACTIVE
N02 Registry keeps P1-198 ACTIVE and distinct
N03 Registry keeps P1-205 ACTIVE and distinct
N04 current OperationLog DB is v2
N05 current source has operations store
N06 current source has events store
N07 current source has worker-memory operationLogWriteChains
N08 current clear drains current chain snapshot
N09 current clear clears OperationLog data
N10 current source has no durable global history-generation field
N11 pre-clear late writer can resurrect under current-shaped no-generation model
N12 global H -> H+1 blocks old writer
N13 new H+1 writer succeeds
N14 stale header write cannot recreate old row
N15 stale event write cannot recreate old row/event
N16 epoch survives modeled worker restart
N17 empty worker queue after restart does not restore H
N18 clear transaction is modeled all-or-none
N19 aborted clear does not publish partial successful boundary
N20 epoch is captured at operation admission, not late log enqueue
N21 old A/H cannot lazily reacquire H+1
N22 new physical B may reuse client correlation and still log
N23 P1-198 remains identity owner
N24 automatic retention of A does not globally invalidate B
N25 P1-205 remains selective retention owner
N26 quota retry cannot refresh an old global clear epoch
N27 OperationLog clear does not cancel functional checkpoint/effect truth
N28 default IndexedDB durability is not claimed as guaranteed physical flush
N29 P1-194 remains broader durability-class owner
N30 no runtime/L5/S2/release action
```

## 24. Acceptance contract

P1-197 refinement research is complete when deterministic evidence proves:

1. current same-worker serialization/drain positive controls are represented;
2. current source still lacks a durable administrative history epoch;
3. a writer admitted before clear cannot republish history after successful clear;
4. the expected epoch is captured at physical-operation admission rather than at late diagnostic enqueue;
5. clear epoch advance and old-history deletion form one atomic logical IndexedDB transition;
6. header and event writers compare expected epoch inside their write transaction;
7. worker restart cannot restore old-history authority merely because in-memory queues disappeared;
8. new post-clear physical operations remain writable;
9. repeated textual correlation does not become physical identity authority;
10. P1-198 remains the physical identity owner;
11. P1-205 remains the automatic TTL/size retention linearization owner;
12. historical P1-197 retention overlap is explicitly reclassified rather than duplicated;
13. P1-194 durability classification is not silently upgraded;
14. OperationLog remains diagnostics rather than execution/recovery authority;
15. no new P-code is allocated;
16. runtime and manifest remain unchanged;
17. no real Chrome/L5, release-policy activation, readiness mutation, official ZIP, tag, GitHub Release or deployment occurs.

## 25. Future implementation direction, not performed here

A bounded implementation sequence is likely:

```text
1. introduce/read one durable global OperationLog history epoch
2. capture epoch in internal physical-operation context at admission
3. make administrative clear atomically advance epoch + clear operations/events
4. make header/event writers compare expected epoch in their IDB transaction
5. preserve same-worker queue/drain as optimization, not sole authority
6. compose with P1-198 worker-issued physical identity
7. compose separately with P1-205 selective retirement
8. test worker termination/restart and late-writer schedules in real unpacked Chrome
```

This sequence is design guidance only. No production code is changed by this tranche.

## 26. Boundary

```text
P1-197 research refinement != runtime implementation
runtime implementation != real Chrome termination/restart qualification
real Chrome qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority remain untouched.
