# WebClip — P1-205 OperationLog selective retirement linearization refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = aa99d1c36dc472d723d0bb1839938bda3c9b3c91`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real unpacked Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-205** after canonical P1-197 administrative OperationLog clear-generation research and P1-198 worker-issued physical-operation identity research. It rechecks the old 2026-09-07 P1-205 branch only as provenance and binds the conclusion to exact current `main`. No historical branch is imported wholesale.

## 1. Canonical owner and question

Current Registry authority remains:

```text
P1-205  OperationLog retention cleanup and queued writes need one
        history-generation linearization so late writer cannot
        resurrect expired history.
```

The current question is narrower than general OperationLog design:

```text
Can automatic TTL/size cleanup delete exact diagnostic history A,
then a late already-admitted writer/retry for that same old physical A
create the header/event again?
```

Current answer: **yes**.

P1-205 owns the selective delete-vs-write ordering. Adjacent ownership stays separate:

```text
P1-197 = global administrative clear/delete history epoch
P1-198 = worker-issued physical execution identity; caller operationId is correlation
P1-205 = automatic TTL/size selective retirement + write fencing
P1-075 = bounded IndexedDB maintenance transactions
P1-173 = bounded queue admission / fairness
P1-210 and domain owners = physical outcome/reconciliation receipts
```

## 2. Fresh canonical baseline

Fresh GitHub `main` was checked before source review and again after external research.

```text
main = aa99d1c36dc472d723d0bb1839938bda3c9b3c91
service-worker.js blob = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1
```

The historical branch inspected only as provenance is:

```text
research/p1-205-operation-log-retention-generation-2026-09-07
head = f7c6516760523d3ebe015e91be423b972219d525
```

Its `service-worker.js` blob is also `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`. This makes its old source observations useful comparison material, but its architecture is not automatically canonical because P1-197 and P1-198 were refined after that branch.

## 3. Current positive controls

Current runtime already has important controls that a future P1-205 implementation must preserve:

1. `operationLogWriteChains` serializes writes for one textual OperationLog key while the current worker instance is alive.
2. `mutateOperationLogOnce()` uses a bounded IndexedDB `readwrite` transaction for the header store.
3. `appendOperationLogEventOnce()` uses one bounded `readwrite` transaction spanning header and event stores.
4. TTL cleanup deletes a selected header and its event rows in one transaction.
5. Aggregate-size cleanup uses the same header+event deletion primitive.
6. Cleanup is bounded by `MAINTENANCE_IDB_TX_TIMEOUT_MS`.
7. OperationLog remains diagnostic state; cleanup does not itself cancel the underlying download/upload/recovery operation.

These controls establish useful transaction isolation and boundedness. They do not distinguish “never existed” from “this exact old physical history was intentionally retired”.

## 4. Current per-key queue is volatile, not retirement truth

Current `queueOperationLogWrite(operationId, task)` derives a trimmed textual key and chains promises in module memory:

```text
operationLogWriteChains : Map<operationId, Promise>
```

That Map is useful within one live worker. It is not a durable retirement record and cleanup does not join it per selected operation before deletion.

P1-198 also proves the current textual `operationId` is not yet a trustworthy physical execution identity when supplied by a caller.

Therefore:

```text
module queue key != durable selective-retirement identity
client correlation != selective-retirement identity
```

## 5. Current header writer recreates an absent row

Current `mutateOperationLogOnce(operationId, mutate)` opens a `readwrite` transaction on `operations`, reads the row, then does the equivalent of:

```text
record = get(operationId) OR default running OperationLog header
mutate(record)
record.updatedAt = now
put(record)
```

This is a reasonable diagnostic robustness policy when absence means “first write for this operation”.

After retention deletion, however, the same absence can mean:

```text
this exact old diagnostic lifecycle was already retired
```

Current storage has no transaction-visible fact that distinguishes those meanings.

## 6. Current event writer recreates both header and timeline

Current `appendOperationLogEventOnce(operationId, event)` spans both `operations` and `events`, but it also creates a default header when `operations.get(id)` is absent. It then appends the event and writes the header.

Therefore a late event can recreate:

```text
retired header
+
new event row
+
fresh updatedAt
```

A future fix around header mutation alone would be incomplete.

## 7. Current TTL cleanup is atomic deletion without a retirement marker

`cleanupExpiredOperationLogs()` computes a cutoff, opens one bounded `readwrite` transaction over `operations` and `events`, scans the `updatedAt` index, and for each expired row:

```text
delete its event rows
cursor.delete() the header
```

This is a positive atomic-deletion control.

But the transaction writes no durable tombstone, selective generation, or equivalent retirement authority. A later writer that acquires the overlapping store after cleanup simply sees “absent” and follows the default-create path.

## 8. Current aggregate-size pruning has the same gap

The second transaction in `cleanupExpiredOperationLogs()` scans current headers and enforces `MAX_OPERATION_LOG_TOTAL_JSON_CHARS`. Selected rows again have their events and header deleted, with no selective retirement marker.

P1-205 therefore applies equally to:

```text
TTL expiration
aggregate-size eviction
```

The implementation must not fence only the TTL branch.

## 9. Current IndexedDB ordering is already useful — but semantically insufficient

A subtle current positive control is that cleanup and writers use overlapping `readwrite` transaction scopes:

```text
header writer  -> operations
cleanup        -> operations + events
event writer   -> operations + events
```

IndexedDB serializes overlapping read/write transactions. So P1-205 does not need to invent a separate mutex merely to prevent mid-transaction interleaving.

The current failure is different:

```text
cleanup commits deletion
later writer transaction starts
writer sees absence
writer treats absence as admission
writer recreates old history
```

The missing primitive is durable semantic retirement checked inside the same transaction as the write.

## 10. Direct resurrection schedule

Current source permits this deterministic schedule:

```text
physical diagnostic lifecycle A exists and is retention-eligible
late write W(A) is already admitted but has not committed

cleanup transaction commits:
  delete events[A]
  delete operations[A]

W(A) transaction runs later:
  get operations[A] -> absent
  create default header
  put header / event
```

Result:

```text
cleanup reports A deleted
A exists again with fresh updatedAt
```

This is resurrection of retired diagnostic history.

## 11. Quota retry is an even stronger witness

Both current write paths have quota recovery:

```text
try write
on quota error:
    cleanupExpiredOperationLogs(...)
    retry same logical write once
```

For an old/size-selected A, the cleanup called by the failing write itself can retire A and the immediate retry can recreate A.

No second user action, timer race, or worker restart is required.

Required rule:

```text
retry preserves original immutable OperationLog write receipt
cleanup retiring that receipt makes retry a diagnostic stale/no-op
retry must not reacquire fresh authority for the same physical A
```

## 12. Fresh Chrome MV3 lifecycle recheck

Fresh official Chrome sources rechecked 2026-09-11:

- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`
- `https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer`

Provider observations:

1. extension service workers can be terminated after inactivity or other lifecycle limits;
2. Chrome explicitly recommends persisting important state rather than relying on global variables;
3. non-persistent worker state is lost across termination;
4. robust extensions should tolerate termination and subsequent restart.

WebClip inference:

```text
operationLogWriteChains is an optimization/ordering aid inside one worker,
not durable selective retirement authority.
```

The strongest P1-205 quota-retry schedule still needs no restart; MV3 lifecycle evidence explains why a worker-local Map cannot be the only long-lived correctness boundary.

## 13. Fresh IndexedDB transaction recheck

Fresh sources rechecked 2026-09-11:

- `https://www.w3.org/TR/IndexedDB/`
- `https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction`
- `https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction`

Relevant platform observations:

1. a transaction has a fixed object-store scope;
2. overlapping `readwrite` transactions are not allowed to modify the shared scope concurrently;
3. earlier-created overlapping `readwrite` work finishes before later overlapping work gets that store;
4. a later transaction sees committed changes from the earlier one;
5. changes inside one transaction commit or abort as one transaction-level unit.

WebClip inference:

```text
retirement marker check + header/event mutation
must share one readwrite transaction scope
```

and:

```text
retirement publication + selected header/event deletion
must share one readwrite transaction scope
```

Then IndexedDB itself supplies the storage-level ordering needed for the two possible commit orders.

## 14. Comparable tombstone reference

Fresh comparison source:

- `https://cassandra.apache.org/doc/latest/cassandra/managing/operating/compaction/tombstones.html`

Apache Cassandra uses tombstones so an older surviving copy does not silently reappear as live data after deletion, and it explicitly treats tombstone garbage collection as a separate safety problem.

This is comparison evidence only. WebClip is a single-browser IndexedDB application, not a Cassandra cluster, and does not inherit Cassandra replication rules or grace-period values.

The useful abstract lesson is narrower:

```text
bare physical deletion can lose the fact that deletion already won
retirement metadata must remain until all stale writers it fences are impossible
```

## 15. Canonical P1-197 composition

P1-197 owns the broad administrative boundary:

```text
physical A admitted under global history epoch H
administrative clear commits H -> H+1
late A/H writer -> stale globally
```

P1-205 must not increment the global epoch every time one old operation is pruned. That would unnecessarily stale unrelated live diagnostics.

Selective cleanup instead needs:

```text
retire exact A under H
late A/H -> stale-retired
unrelated B/H -> still writable
```

## 16. Canonical P1-198 composition

P1-198 now makes this distinction authoritative at the research-model level:

```text
clientOperationId  = bounded optional correlation; may repeat
physicalOperationId = fresh worker-issued execution identity for each new action
```

Therefore P1-205 selective retirement must bind to the exact physical lifecycle, not reusable caller correlation.

Example:

```text
client correlation = "save-123"
physical A = worker-issued A
A is retired by TTL/size cleanup

later new action:
client correlation = "save-123"
physical B = worker-issued B

late A -> stale-retired
fresh B -> allowed
```

## 17. Refinement of the historical P1-205 generation model

The 2026-09-07 historical branch modeled an `operationHistoryGeneration` counter for a physical key. That was useful to expose the rule that a quota retry must not reacquire authority after retirement.

After canonical P1-198, however, a **second reusable per-physical generation counter is not proven mandatory**.

If P1-198 is implemented as specified — every independent new physical action always gets a fresh `physicalOperationId` — then the minimum P1-205 semantic authority can be:

```text
OperationLogWriteReceipt {
  globalHistoryEpoch,
  physicalOperationId
}

RetirementFence {
  globalHistoryEpoch,
  physicalOperationId,
  retired = true
}
```

or another equivalent durable representation.

A future implementation may still choose an internal per-physical diagnostic generation if it has a concrete lifecycle need. If so:

```text
retirement of A/g must make A/g permanently stale
late retry must not mint A/g+1 merely to bypass retirement
new independent work must be physical B, not recycled physical A
```

The invariant matters more than the representation name.

## 18. Preferred linearization contract

At physical-operation admission, capture an immutable diagnostic receipt that composes P1-197 and P1-198:

```text
R = {
  globalHistoryEpoch: H,
  physicalOperationId: A
}
```

Every header/event writer for A carries R through queued turns, async stages, error/finalization logging, and quota retry.

A writer transaction conceptually does:

```text
open readwrite transaction spanning required history/retirement + content stores
read current global epoch
read retirement state for (H, A)

if H != current epoch:
    stale-global-history no-op
else if (H, A) retired:
    stale-retired no-op
else:
    create/update exact A header/event
commit
```

A stale diagnostic write should not fail the underlying user operation merely because its diagnostics were retired.

## 19. Cleanup transaction contract

When automatic cleanup selects A, the decision and retirement must be based on current transaction-visible state:

```text
open readwrite transaction spanning retirement + operations + events
re-read current A
re-evaluate applicable TTL/size policy against current committed state
publish retirement for exact (H, A)
delete events[A]
delete header[A]
commit
```

The retirement marker and deletion must not be split across independent transactions with an await gap.

## 20. Deterministic transaction orders

With the retirement check inside the overlapping transaction, both orders become safe.

### Writer transaction wins first

For TTL cleanup:

```text
W(A) commits fresh updatedAt
cleanup runs later and sees current committed header
if A no longer satisfies TTL, cleanup keeps A
```

For size cleanup, a writer-first A may still be selected if the current committed size/order policy requires it. The required property is fresh re-evaluation, not automatic retention.

### Cleanup transaction wins first

```text
cleanup publishes retired(H,A) + deletes A
W(A) runs later
W reads retired(H,A)
W is stale no-op
```

Thus no late writer can reinterpret post-retirement absence as first-write admission.

## 21. Quota retry contract

Quota retry must preserve the same receipt R:

```text
attempt R
quota cleanup
retry R
```

Forbidden:

```text
attempt R
cleanup retires R
retry invents fresh authority R2 for physical A
```

If cleanup selected A, retry resolves as a diagnostic stale/no-op. The underlying physical save/download/upload outcome remains governed by its domain receipt and must not be rewritten by OperationLog retention.

## 22. Maintenance self-logging

`runLoggedOperationLogCleanup()` creates its own current maintenance OperationLog and then calls cleanup.

P1-205 must remain selective:

```text
expired A selected -> retire A
current maintenance M not selected -> M continues logging
```

If an intentionally tiny retention/size setting actually selects M, then M's later diagnostic events are stale-retired rather than recreating M.

A global epoch bump on every automatic cleanup is therefore the wrong breadth.

## 23. Tombstone/fence boundedness

Selective retirement metadata must itself have bounded lifecycle.

Because P1-198 physical IDs are never reused for a different physical action, a fence does not need to preserve correlation-string uniqueness forever. But deleting a fence while a recoverable writer can still carry its old receipt is unsafe.

Safe compaction needs one of these proofs:

```text
A. no live or recoverable writer can still present the retired receipt
or
B. a later global P1-197 history epoch durably makes every receipt from H stale
```

P1-197 therefore offers a useful compaction boundary: after durable H -> H+1, old H selective fences can be compacted if every writer checks the global epoch first.

Exact implementation/GC policy remains implementation work; this tranche records the correctness condition only.

## 24. Why a global drain is not the primary correctness primitive

Draining the current `operationLogWriteChains` snapshot before every retention pass is not sufficient as the sole mechanism:

1. it is worker-local and disappears on restart;
2. an async stage that has not yet enqueued its eventual diagnostic write is not necessarily in the snapshot;
3. a hung unrelated writer can turn maintenance into an excessive wait;
4. P1-173 owns bounded queue-admission/fairness concerns;
5. current IndexedDB overlapping transactions already provide storage serialization once the missing durable retirement condition is added.

A bounded selective drain may remain an optimization, but correctness must not depend on it.

## 25. Size-accounting truth

Current cleanup returns:

```text
deleted
sizeDeleted
retainedApproxChars
```

Those values describe the committed cleanup pass. Their meaning is undermined if an already-admitted stale writer can immediately recreate a just-retired generation with fresh timestamps/bytes.

P1-205 makes the maintenance receipt truthful with respect to old admitted writers:

```text
retired old A cannot immediately reappear
```

A genuinely new physical B may add bytes after cleanup; that is new activity, not resurrection.

## 26. State-machine invariants

Required invariants are:

```text
I1  client correlation is never retirement identity.
I2  new independent work receives fresh physicalOperationId.
I3  global H mismatch rejects every pre-clear writer.
I4  selective retired(H,A) rejects only A under H.
I5  cleanup retirement + deletion are one transaction-level decision.
I6  writer retirement check + mutation are one transaction-level decision.
I7  late header writer cannot recreate retired A.
I8  late event writer cannot recreate retired A or an orphan timeline.
I9  quota retry preserves its original receipt.
I10 TTL eligibility is re-read after any earlier writer commit.
I11 size pruning uses the same retirement authority as TTL pruning.
I12 unrelated B remains writable when only A is retired.
I13 module-memory queue loss cannot erase durable retirement truth.
I14 fence compaction cannot occur while an old recoverable receipt can still write.
I15 after durable global H->H+1, old H receipts remain stale even if old selective fences are compacted.
I16 OperationLog retirement never becomes physical-effect cancellation/absence evidence.
```

## 27. Deterministic refinement model

`project_tools/test_p1_205_operation_log_retention_generation_refinement_model.js` source-binds the current gap and models the target invariants.

It checks, among other cases:

1. current header default-create behavior;
2. current event default-create behavior;
3. current TTL and size bare deletion;
4. current quota cleanup + same-write retry;
5. current volatile queue positive control;
6. current absence of a durable OperationLog retirement store/fence;
7. current P1-197/P1-198/P1-205 owner composition;
8. current-shaped resurrection;
9. cleanup-before-header stale rejection;
10. cleanup-before-event stale rejection;
11. writer-before-TTL fresh re-evaluation;
12. quota retry retaining the original receipt;
13. selective A retirement leaving B writable even with same client correlation;
14. restart-like loss of module queues preserving durable retirement state;
15. unsafe same-epoch fence compaction reproducing resurrection;
16. global H->H+1 safely subsuming old H receipts;
17. maintenance self-log remains writable when not selected;
18. no second per-physical generation counter is required by the minimal model.

Model PASS is research evidence only. It is not runtime implementation or browser qualification.

## 28. Current gap table

| Surface | Current main | Required P1-205 property |
|---|---|---|
| Queue identity | textual `operationId` in worker Map | P1-198 physical ID for exact lifecycle |
| Header absent | default-create | create only if receipt is not retired/stale |
| Event absent | default-create header + event | stale event cannot create either store |
| TTL cleanup | atomic header+event delete | publish exact selective retirement in same transaction |
| Size cleanup | same bare deletion | same exact selective retirement |
| Quota retry | cleanup then retry same call without retirement receipt | preserve immutable original receipt |
| Restart | queue Map lost | durable retirement truth remains authoritative |
| Global clear | separate P1-197 owner | H->H+1 globally stales old receipts |
| Same correlation reuse | currently can alias physical namespace | fresh physical B remains independent of retired A |

## 29. Historical branch disposition

The 2026-09-07 branch remains provenance only.

Retained findings after current-main recheck:

- bare delete + default-create permits resurrection;
- event resurrection is as important as header resurrection;
- quota retry is a direct self-resurrection schedule;
- TTL and size cleanup need one selective retirement authority;
- per-operation retirement must not globally stale unrelated work;
- fence lifetime/compaction requires an explicit safety condition.

Refined finding:

- historical `operationHistoryGeneration` is a possible representation, not a newly proven mandatory axis after P1-198; strict fresh physical IDs allow a simpler exact physical tombstone/equivalent.

Not imported:

- old branch commits;
- old tests as-is;
- old baseline assumptions;
- any runtime change.

## 30. Implementation implications, not implementation authorization

A future implementation tranche would need to coordinate at least:

- P1-197 durable global history epoch storage;
- P1-198 worker-issued physical OperationContext;
- P1-205 durable selective retirement representation;
- writer transaction scopes for headers/events;
- cleanup transaction scope for TTL and size deletion;
- quota retry receipt propagation;
- bounded fence compaction tied to recovery lifetime/global epoch;
- migration/versioning of OperationLog IndexedDB if a new store is required.

This document does not authorize that runtime implementation by itself.

## 31. Release fence

This research tranche does **not** authorize or perform:

```text
P1-231 S2 activation
release-policy change
official product ZIP
release candidate
real unpacked Chrome/Yandex L5 as release evidence
release receipt/readiness mutation
manifest/version bump
tag
GitHub Release
deployment/publishing
```

Hard fence remains:

```text
EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION
```

Current release state remains:

```text
S2 authorized = false
release authorized = false
product ZIP = false
```

## 32. Conclusion

P1-205 is confirmed on fresh current `main`.

Current IndexedDB transactions already serialize overlapping OperationLog read/write scopes, but that alone cannot prevent resurrection because cleanup publishes only physical deletion and both writers treat post-delete absence as permission to default-create.

The smallest proven target is:

```text
P1-197 global history epoch
+
P1-198 fresh worker-issued physicalOperationId
+
P1-205 durable selective retirement tombstone/equivalent
+
retirement check and mutation in one overlapping readwrite transaction
+
retirement publication and deletion in one overlapping readwrite transaction
+
quota retry preserves the original receipt
```

A separate reusable per-physical history-generation counter remains optional implementation structure, not a proven semantic requirement. What is mandatory is that retirement of exact physical A cannot be bypassed by a late A writer/retry, while fresh physical B with the same client correlation remains independent.

P1-205 remains **ACTIVE** until runtime implementation and its own required evidence are completed under a separately scoped implementation tranche.
