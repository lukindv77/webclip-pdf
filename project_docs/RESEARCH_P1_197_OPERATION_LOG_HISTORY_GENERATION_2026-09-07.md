# P1-197 — OperationLog administrative clear/delete history generation — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-197-operation-log-history-generation-2026-09-07`  
Owner: **P1-197 ACTIVE**.

Research/model only. Production runtime, `manifest.json`, Registry status, version and release state are unchanged.

## 1. Canonical owner

Registry wording:

> `OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation.`

P1-197 owns the history-retention boundary of OperationLog itself. It does not make OperationLog a workflow authority.

Adjacent owners remain separate:

- **P1-198** — physical live operation identity is worker-issued; caller textual `operationId` is correlation metadata, not an ownership capability;
- **P1-205** — bounded/fair diagnostic maintenance and logging behavior;
- **P1-192** — MV3 lifecycle ownership and durable fair progress for real background work;
- **P0-072 / P1-184 / recovery owners** — admitted external effects and durable recovery receipts are not cancelled by deleting telemetry.

## 2. Fresh baseline proof

Immediately before creating this branch:

- `main` remained `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry still listed P1-197 as `ACTIVE`;
- no `research/p1-197-*` branch existed;
- runtime remained version `0.9.8`, minimum Chrome `118`;
- no runtime/config/release file was modified by this research.

## 3. Current OperationLog storage shape

Current `service-worker.js` defines:

```text
OPERATION_LOG_DB_NAME = WebClipOperationLogs
OPERATION_LOG_STORE = operations
OPERATION_LOG_EVENT_STORE = events
OPERATION_LOG_DB_VERSION = 2
```

The DB therefore has durable operation/event rows, but the current source has no visible durable OperationLog history-generation/meta authority corresponding to P1-197.

## 4. Positive control: per-operation in-memory write chain

Current source has:

```text
const operationLogWriteChains = new Map()
```

and routes diagnostic mutations through a per-`operationId` serialization chain.

This is useful inside one living worker:

- writes for the same textual operation are ordered;
- callers can `flushOperationLogWrites(operationId)` before returning a result;
- ordinary same-worker write overlap is reduced.

P1-197 must preserve the useful ordering property.

However, this Map is worker memory. It disappears when the MV3 service worker terminates and is not a durable clear/delete fence.

## 5. Positive control: manual clear drains current in-memory chains

Current `clearOperationLogs()` is stronger than a blind database clear. Before opening the destructive transaction it executes conceptually:

```text
pending = all current operationLogWriteChains
await Promise.allSettled(pending)
operationLogWriteChains.clear()
```

It then atomically clears both `events` and `operations` stores.

Preserve this behavior or an equivalent stronger property.

It protects against writers already represented in the current worker's chain map when clear starts.

It does **not** prove the P1-197 contract across worker restart, delayed continuations that enqueue later, quota retry, or per-operation retention deletion.

## 6. Why the drain is not a durable generation boundary

The explicit user meaning of administrative clear is stronger than:

```text
all writes that happen to be visible in this worker right now finished before clear
```

The required meaning is:

> Telemetry admitted under the history generation that the user cleared must not later recreate that cleared history.

A worker-local drain cannot prove this after:

- service-worker termination/restart;
- late browser/API settlement that emits a stage after the drain snapshot was taken;
- a diagnostic write admitted before clear but only queued after clear;
- retention/size cleanup that deletes one operation while its old writer is still capable of retrying.

Therefore the authority must be in durable storage and checked at the mutation commit boundary.

## 7. Current retention cleanup is a separate deletion path

`cleanupExpiredOperationLogs()` removes old diagnostic history according to retention/size policy.

Unlike manual clear-all, retention may delete operation A while unrelated operation B remains live.

This is important because a single global clear generation is not sufficient by itself for per-operation retention semantics. If every retention deletion globally invalidated every writer, unrelated live telemetry would be needlessly dropped.

P1-197 therefore needs two scopes of fencing:

1. a **global history generation** for administrative clear-all;
2. an **exact per-operation deletion/lifecycle generation** (or equivalent tombstone/instance fence) for retention/single-operation deletion.

## 8. Current quota retry creates a concrete resurrection schedule

Current diagnostic mutation code treats OperationLog as disposable under quota pressure, which is correct product priority: functional data wins over diagnostics.

On an OperationLog quota error, the source does approximately:

```text
cleanupExpiredOperationLogs(...)
retry the same logical OperationLog mutation once
```

The event path has the analogous pattern.

This produces a concrete P1-197 race if retention deletes the very operation whose old mutation is being retried:

```text
W(A) admitted under old A lifecycle
first write -> quota error
retention cleanup deletes A
retry W(A)
mutation sees no record and can reconstruct/write diagnostic state
A reappears after committed deletion
```

The retry therefore must carry the same original history/deletion receipt and re-check it inside the retry transaction. Cleanup must not silently grant the old writer a fresh generation.

## 9. Historical consolidated evidence agrees

The retained OperationLog research family already records the required semantics:

- old queued writer after retention commit must not recreate the obsolete operation;
- if a writer finishes before cleanup eligibility is finalized and makes the operation current, cleanup should re-check and retain it;
- a hung diagnostic writer must not block maintenance forever;
- operation and event rows are deleted coherently;
- size pruning needs the same stale-writer fence as TTL pruning;
- user clear followed by a previously admitted old write must not repopulate cleared logs;
- worker restart reconstructs deletion/generation truth from durable state;
- repeated maintenance remains idempotent and convergent.

This branch does not create a new owner. It binds those historical requirements to the current canonical source.

## 10. Target global history-generation authority

Conceptually, the OperationLog database needs a durable authority such as:

```text
OperationLogMeta {
  historyGeneration: G
}
```

Exact store/key names are implementation details.

The generation must live in the same durable authority as the records it fences, not in a worker global or only `chrome.storage` read separately from the commit transaction.

### Clear-all transaction

A future `clearOperationLogs()` should commit in one atomic IDB transaction:

```text
read current historyGeneration G
write G + 1
clear events
clear operations
```

The ordering inside one transaction is less important than the atomic visible result:

```text
new generation + empty old history
```

must become committed together.

A crash cannot expose "rows cleared but generation old" as the stable result if that would allow an old writer to recreate them.

## 11. Every writer carries expected history generation

A diagnostic writer is admitted against one generation:

```text
expectedHistoryGeneration = G
```

That receipt follows the logical write through:

- the in-memory queue;
- delayed async continuation;
- quota retry;
- worker-rehydrated continuation when applicable.

Inside the final IDB write transaction, before any `put/add`, the writer compares:

```text
expectedHistoryGeneration == durable current historyGeneration
```

Mismatch means:

```text
stale telemetry -> drop/no-op
```

not:

```text
recreate old row in new history generation
```

## 12. Clear is not required to wait forever

The current same-worker drain is a good positive control, but correctness cannot depend on an unbounded wait for every possible diagnostic continuation.

The durable generation allows clear to have a bounded commit point:

- optionally drain currently known short writes;
- atomically advance generation + clear;
- any old continuation that arrives later self-rejects on generation mismatch.

This composes with P1-205's requirement that diagnostics must not block maintenance/product work indefinitely.

## 13. Per-operation deletion generation

Retention/single-operation deletion needs narrower authority.

Conceptually:

```text
operationDeletionGeneration[operationPhysicalIdentity] = D
```

or an equivalent durable tombstone/lifecycle generation.

A writer captures:

```text
expectedDeletionGeneration = D
```

When cleanup commits deletion of operation A:

```text
A deletion generation D -> D + 1
A operation row removed
A event rows removed
```

An old A writer with D is rejected.

Unrelated operation B remains valid because its deletion generation did not change.

## 14. Why a tombstone/fence must survive absence of the operation row

A missing `operations` row cannot by itself mean:

```text
safe to create operation from a late event
```

The row may be missing precisely because retention/admin deletion committed.

Therefore the deletion authority has to survive the removal long enough to distinguish:

- genuinely new physical operation lifecycle;
- old stale writer for a deleted lifecycle.

P1-198 owns how physical operation identity is issued. P1-197 consumes that identity/fresh lifecycle boundary rather than treating caller text as proof of newness.

## 15. Composition with P1-198

P1-197 must not solve physical operation identity by trusting a caller-provided `operationId`.

Target composition:

```text
worker-issued physical operation instance / lifecycle receipt   <- P1-198
+
OperationLog global history generation                         <- P1-197
+
per-operation deletion/lifecycle generation                    <- P1-197
```

A future fresh physical operation may legitimately reuse some human/correlation text, but it must have fresh worker-issued authority rather than accidentally bypassing a tombstone by supplying the same string.

## 16. Missing-record recovery remains possible only for a current lifecycle

Current logging code is intentionally tolerant of partially missing summary state and may synthesize/rebuild an operation record when needed.

That behavior can remain for a writer that proves:

- current global history generation;
- current physical operation lifecycle/deletion generation.

It must not serve as a resurrection path for an obsolete writer.

Thus the rule is not:

```text
missing row -> never write
```

It is:

```text
missing row + current lifecycle receipt -> reconstruction allowed
missing row + stale generation -> drop
```

## 17. Retention eligibility must be commit-time truthful

Cleanup should not select candidates once and then blindly delete them after arbitrary delay.

If old operation A is selected, but a valid current writer updates it before deletion eligibility is finalized, cleanup should re-check the current lifecycle/updated state in the deletion transaction and retain/defer A as appropriate.

This prevents valid current activity from being mistaken for obsolete history while still preventing genuinely deleted history from later returning.

## 18. Operation/event atomicity

Deleting a logical OperationLog lifecycle means deleting its summary and event rows coherently.

Target invariant:

```text
committed delete of A
=> no surviving old A event rows
=> no old A summary row
=> deletion fence advanced
```

Late old event append cannot recreate either side because it fails the same lifecycle fence.

## 19. Size pruning has the same authority problem as TTL pruning

Quota/size maintenance cannot be treated as a weaker form of deletion.

If size pruning deliberately evicts operation A, old A writers must not recreate it immediately and defeat the storage bound.

Therefore TTL deletion and size-based deletion should use one deletion-generation contract.

## 20. MV3 worker restart

P1-192 established that worker globals are not durable lifecycle authority.

P1-197 applies the same rule specifically to telemetry history:

```text
worker dies after clear/delete commits
new worker starts with empty operationLogWriteChains
```

The new worker must still know that old generation G is obsolete.

That truth must come from durable OperationLog state, not reconstruction from the in-memory queue map.

## 21. OperationLog remains telemetry only

This research does not promote OperationLog into a recovery database or execution coordinator.

Deleting OperationLog must not mean:

- cancel an admitted Yandex mutation;
- cancel a Chrome download;
- delete a pending Journal checkpoint;
- declare an unknown external effect absent;
- cancel a backup workflow.

Those authorities remain in their owning durable receipts/stores.

P1-197 only guarantees that diagnostic history obeys the user's/retention deletion boundary.

## 22. Administrative clear semantics

After successful manual clear, truthful semantics are:

> All OperationLog history from generations older than the committed clear boundary is logically retired and cannot reappear through delayed old writers.

This does **not** promise that no new logs will ever appear after clear. New operations/events admitted in the new generation may immediately create new history.

UI should therefore distinguish:

```text
old history did not resurrect
```

from:

```text
no logging is occurring anymore
```

## 23. Deterministic model

Added:

`project_tools/test_p1_197_operation_log_history_generation_model.js`

The model proves:

1. naive clear + late writer resurrects a cleared operation;
2. global generation blocks that writer;
3. a new writer admitted after clear succeeds;
4. durable generation survives modeled worker restart;
5. per-operation delete rejects stale A without invalidating B;
6. duplicate/retried stale writers stay rejected;
7. quota cleanup + retry cannot resurrect a deleted operation;
8. clear dominates all pre-clear writers even for IDs absent at clear time;
9. retention is not global cancellation of unrelated telemetry;
10. fresh lifecycle after deletion can write only with a fresh deletion-generation receipt, leaving physical identity ownership to P1-198.

Expected result:

`P1-197 OperationLog history generation model: PASS`

Model PASS proves only the target state machine.

## 24. Source-bound implementation gate

Added:

`project_tools/test_p1_197_operation_log_history_generation_source.js`

The gate preserves current positive controls:

- per-operation in-memory write chains;
- manual clear drains current chains;
- bounded IDB mutation path;
- retention cleanup;
- quota cleanup/retry behavior.

It requires future source evidence for:

- durable global OperationLog history generation;
- atomic generation advance + clear-all;
- writer-side expected-generation check inside the durable mutation path;
- durable per-operation deletion/lifecycle fence for retention/size pruning;
- quota retry retaining/rechecking the original receipt;
- restart-independent generation truth;
- no unconditional stale writer recreation after committed deletion.

Expected current result:

`P1-197 OperationLog history generation source gate: RED`

## 25. Evidence required before closure

Do not close P1-197 from the deterministic model or source gate alone.

At minimum, closure should record real unpacked-Chrome/MV3 evidence for the implemented boundary:

1. start an operation that can emit a delayed diagnostic write;
2. commit administrative clear while the old lifecycle still has a possible late continuation;
3. prove the old continuation does not recreate pre-clear history;
4. create a genuinely new operation after clear and prove it logs normally;
5. force/reproduce a worker restart after the clear boundary and prove old-generation writes remain stale;
6. exercise TTL/size cleanup against an old operation with a delayed writer and prove no resurrection;
7. prove unrelated live operation telemetry is not globally invalidated by retention deletion of A;
8. exercise quota-retry path or an exact deterministic source harness proving the retry retains the old receipt;
9. confirm OperationLog clear did not delete/cancel functional recovery checkpoints or external effects.

A synthetic test that only calls `clear()` with no racing writer is insufficient.

## 26. Safety / non-goals

This is defensive architecture/data-integrity research.

It does not:

- modify production runtime;
- alter manifest permissions;
- search for browser vulnerabilities;
- probe unauthorized external systems;
- change Registry status;
- build/tag/release;
- treat diagnostics as workflow authority.

## 27. Status

P1-197 remains **ACTIVE**.

Current source has good same-worker ordering and clear-drain positive controls, but lacks the durable global history generation and per-operation deletion fence required to prevent stale telemetry from repopulating committed clear/retention boundaries across late continuations, quota retries and MV3 restart.

Runtime remains `0.9.8`; release remains `NOT READY`.
