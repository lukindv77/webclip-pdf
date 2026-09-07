# P1-205 — OperationLog retention cleanup / queued-write linearization

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This branch does **not** modify production runtime, `manifest.json`, release state or `RESEARCH_REGISTRY.md`.

## 1. Owner

P1-205 owns this exact problem:

> OperationLog retention cleanup and queued writes need one history-generation linearization so a late writer cannot resurrect expired history.

Keep adjacent owners separate:

- **P1-197** — administrative OperationLog clear/delete and history-generation fencing;
- **P1-198** — worker-issued physical live operation identity; caller textual `operationId` is correlation only;
- **P1-173** — admission pressure / bounded waiting behind serialized queues;
- **P1-075** — bounded/abortable maintenance IndexedDB transactions;
- **P1-121** — ordering of the retention-setting Chrome Storage mutation;
- **P1-039 / P1-040** — maintenance/logging workflow and selected response-tail flushing;
- **P1-210** — user-visible reconciliation of operation outcomes;
- **P1-194** — durability class of recovery evidence.

P1-205 is specifically the delete-vs-write ordering of **diagnostic OperationLog history** under automatic TTL/size maintenance.

## 2. Current positive controls

The current runtime already contains useful safeguards that must remain:

1. `operationLogWriteChains` serializes writes per `operationId` within one living service-worker module.
2. `clearOperationLogs()` explicitly drains the currently known write-chain snapshot before the administrative clear.
3. OperationLog header and event deletion is performed through bounded IndexedDB readwrite transactions.
4. TTL cleanup deletes an operation header together with its event rows.
5. Size-pressure cleanup uses the same `cleanupExpiredOperationLogs()` maintenance surface.
6. OperationLog is diagnostic state; deleting it is not cancellation evidence for physical downloads, Yandex effects or recovery receipts.

These are positive controls, not a complete retention linearization.

## 3. Current OperationLog storage shape

Current IndexedDB schema:

```text
WebClipOperationLogs
  operations     keyPath operationId
  events          keyPath [operationId, seq]
DB version = 2
```

There is no durable meta/history-generation store and no retention tombstone/deletion generation.

`operationLogWriteChains` is a module-level JavaScript `Map`; it is not part of the database transaction that decides retention eligibility.

## 4. Current writers recreate an absent operation

Both header and event writers intentionally tolerate a missing operation record.

`mutateOperationLogOnce()` conceptually does:

```text
record = operations.get(operationId)
      OR create default running OperationLog record

apply mutation
operations.put(record)
```

`appendOperationLogEventOnce()` similarly creates a default header when the operation row is absent and then appends the event.

That behavior is useful for diagnostic robustness when the absence is legitimate.

It becomes incorrect after an authoritative retention deletion, because `row absent` is then ambiguous between:

```text
never created yet
```

and:

```text
this exact old history generation was intentionally retired
```

P1-205 requires that distinction to be durable and transaction-visible.

## 5. TTL cleanup is outside the writer ordering domain

`cleanupExpiredOperationLogs(retentionOverride)` computes a cutoff and directly opens a readwrite cleanup transaction.

It scans the `updatedAt` index for records older than the cutoff and deletes each matching operation plus its events.

It does **not** first join the same per-operation writer queue and it does not write a generation/tombstone fence that later writers compare.

Therefore cleanup and queued writers do not share one authoritative order.

## 6. Canonical race — cleanup wins physically, writer resurrects logically

Historical project evidence already records the exact race:

```text
old operation O is retention-eligible
queued writer W belongs to O

cleanup deletes O + events
cleanup reports O deleted

W starts later
W reads operations[O] = absent
W creates default record for O
W writes fresh updatedAt
```

Result:

```text
cleanup result says O deleted
but O exists again immediately afterwards
```

The resurrected record now looks fresh because the writer assigns current timestamps.

That can extend the lifetime of diagnostic history that retention had already decided to remove.

## 7. Event resurrection is stronger than header resurrection

A late event writer can recreate:

1. the missing operation header; and
2. a new event timeline row.

Therefore the invariant must apply to both stores in the same authority model.

A fix only around `mutateOperationLogOnce()` would remain incomplete.

## 8. Quota retry creates a direct self-resurrection schedule

Current write helpers have a useful quota-recovery pattern:

```text
try OperationLog write
if quota error:
    cleanupExpiredOperationLogs(...)
    retry the same logical write
```

Without generation fencing this can become:

```text
old operation O write hits quota
cleanup deletes O because O is old / size-selected
same old write retries
writer sees O absent
writer recreates O
```

This schedule needs no second user action and no worker restart.

Therefore a future quota retry must preserve the **original immutable write receipt**. It must never silently reacquire a fresh OperationLog generation after cleanup merely to make the retry succeed.

Otherwise cleanup fencing can be bypassed by the recovery path itself.

## 9. Size-pressure pruning has exactly the same authority problem

The maintenance function also deletes older records to enforce the aggregate OperationLog size envelope.

A post-prune stale write can:

- recreate a pruned header;
- append new event bytes;
- make `deleted`, `sizeDeleted` and `retainedApproxChars` stale immediately after cleanup;
- undermine bounded-storage convergence.

P1-205 therefore applies to both:

```text
TTL expiration
aggregate size-pressure eviction
```

Do not implement the fix only in the TTL cursor branch.

## 10. Correct linearization property

The desired race result is deterministic in either order.

### Write commits first

```text
W commits
updatedAt becomes fresh
cleanup evaluates the committed current record
record is no longer eligible
cleanup retains it
```

### Cleanup commits first

```text
cleanup retires exact operation history generation G
cleanup deletes header + events
W(G) arrives later
W compares its receipt to retirement fence
W is stale no-op
```

This is the core P1-205 linearization:

> exactly one of `write-before-cleanup` or `cleanup-before-write` wins, and the loser cannot silently reinterpret the result.

## 11. Why a global drain is not the preferred primary solution

Historical evidence allows a drain-before-delete policy, but a global drain has several drawbacks:

- it can wait behind unrelated operations;
- a hung writer could make maintenance unbounded;
- it can regress P1-173 queue-admission/fairness properties;
- a writer whose asynchronous business stage has not yet enqueued its diagnostic write is not necessarily represented in the current Map snapshot;
- worker-local queue membership is not a durable semantic operation receipt.

A bounded selective drain can still be a useful optimization, but it should not be the only correctness mechanism.

## 12. Preferred target — exact per-operation retirement fence

P1-205 should compose with the P1-197 history model rather than invent an independent authority system.

Conceptually the write receipt contains two layers:

```text
OperationLogWriteReceipt {
    globalHistoryEpoch,          // P1-197 clear-all boundary
    physicalOperationId,         // P1-198 physical instance identity
    operationHistoryGeneration   // exact diagnostic lifecycle generation
}
```

Automatic retention/size deletion of one operation should retire only that exact operation generation, not globally invalidate every unrelated live writer.

Conceptual durable metadata:

```text
OperationLogHistoryMeta {
    globalHistoryEpoch
    retiredOperationGenerations {
        physicalOperationId -> retiredThroughGeneration
    }
}
```

The physical representation can be a dedicated meta store or another bounded IndexedDB representation; semantics matter more than the exact object shape.

## 13. P1-197 composition

Administrative clear-all and automatic retention have different breadth but share one admission policy.

### Administrative clear-all — P1-197

```text
globalHistoryEpoch H -> H+1
clear operations/events
```

Every writer carrying H becomes stale.

### Retention/size delete — P1-205

```text
for selected physical operation A generation g:
    retire A through g
    delete A events
    delete A header
```

Writer `A/g` becomes stale, while unrelated `B/gB` remains valid under the same global history epoch.

This avoids an overbroad design where every hourly retention pass invalidates all in-flight diagnostics.

## 14. P1-198 composition

Caller-supplied textual `operationId` is not enough to distinguish resurrection from a legitimate fresh operation.

Example:

```text
client correlation = "save-123"
physical A = UUID-A
A expires and is retired

later new user operation:
client correlation = "save-123"
physical B = UUID-B
```

The old A receipt must remain stale, while fresh physical B is allowed to create new diagnostic history.

Therefore retention tombstones/fences should bind to worker-issued physical identity / exact operation generation, not to caller correlation alone.

## 15. Writer admission

Every OperationLog header/event mutation should carry the immutable receipt captured when its physical diagnostic lifecycle was admitted.

Conceptually:

```text
writeOperationLog(receipt, mutation)
```

not:

```text
writeOperationLog(operationId)
then infer current authority from whatever row exists now
```

The receipt must survive through:

- queued turns;
- async operation stages;
- quota retry;
- error/finalization logging;
- maintenance logging when it refers to the same physical operation.

## 16. Writer transaction rule

Header writer transaction should atomically include the stores needed to verify:

```text
receipt.globalHistoryEpoch == current global epoch
receipt.operationHistoryGeneration > retiredThrough(receipt.physicalOperationId)
existing row generation, if present, == receipt generation
```

Only then may it create or update the header.

Pseudo-flow:

```text
open one readwrite transaction
read meta/fence
read operation row

if receipt stale:
    no put
    resolve stale/no-op
else:
    create/update exact-generation row
    commit
```

The generation check and `put()` must not be split across independent transactions with an await gap.

## 17. Event writer transaction rule

Event append needs the same fence inside a transaction covering:

```text
history/meta fence
operations
 events
```

A stale event must not create a default header and must not insert an orphan event row.

Required result:

```text
stale event receipt
→ no header
→ no event
→ no updatedAt refresh
```

## 18. Cleanup transaction rule

When cleanup decides to retire operation `O/g`, retirement and physical deletion should share one authoritative transaction where practical:

```text
verify row still generation g
verify it is still eligible using current committed row
write retirement fence for O/g
delete O events
delete O header
commit
```

If the row changed generation or became fresh before the transaction's decision, cleanup must skip/re-evaluate it rather than delete from a stale snapshot.

## 19. Fresh eligibility after waiting/retry

Historical P1-205 evidence explicitly requires fresh eligibility after waiting.

If a pending write completes before cleanup linearizes, cleanup must evaluate the resulting current `updatedAt` and size.

Do not:

```text
remember old eligibility
wait for writer
then delete anyway using old decision
```

This matters for a legitimate operation that became active again before cleanup won the race.

## 20. Hung writer behavior

A hung/unknown writer must not force an unbounded maintenance wait.

Allowed policies include:

- use generation fencing and let cleanup retire first;
- bounded selective wait, then defer that operation to a later cycle;
- mark the item as deferred/not deleted when safe authority cannot be established.

Never report an item as deleted merely because maintenance skipped waiting for its unresolved writer.

## 21. Quota retry rule

This is mandatory:

```text
first attempt uses receipt R
quota cleanup occurs
retry uses the same receipt R
```

Forbidden:

```text
first attempt R
cleanup retires R
retry asks for fresh generation R2
retry recreates the history
```

A stale post-cleanup retry should normally become diagnostic no-op rather than a user-operation failure, because OperationLog is best-effort diagnostic state.

The physical operation's own success/failure authority remains outside OperationLog.

## 22. Maintenance self-logging

`runLoggedOperationLogCleanup()` logs the maintenance operation while performing OperationLog cleanup.

A current maintenance record with fresh `updatedAt` should normally remain eligible to continue logging.

P1-205 must not solve old-history resurrection by globally fencing every current operation during each maintenance pass.

Required behavior:

```text
expired A retired
current maintenance M not selected
M continues logging
```

If M itself is selected by a deliberately tiny retention/size policy, the same exact-generation rule applies; its later stale diagnostic event is dropped rather than recreating the retired M generation.

## 23. OperationLog is diagnostic, not physical operation authority

Historical family evidence explicitly separates live physical receipts from OperationLog diagnostic lifetime.

Retention deletion must not:

- cancel a DownloadItem;
- prove a Yandex transfer did not happen;
- revoke a durable recovery checkpoint;
- erase an external-effect identity receipt merely because diagnostics expired;
- make a user-visible unknown outcome become failure/absence.

Conversely, preserving a physical recovery receipt does not give an expired OperationLog generation permission to resurrect its diagnostic body.

## 24. Restart semantics

The strongest P1-205 race occurs within one worker and needs no restart.

However, the history/retirement fence should be durable because it composes with P1-197 and P1-198 and avoids depending on MV3 worker death as a synchronization mechanism.

Worker restart may discard JS queues, but:

```text
diagnostic loss != proof that old history generation may be reused
```

A fresh worker should reconstruct history admission from durable generation truth, not from an empty `operationLogWriteChains` Map.

## 25. Tombstone/fence retention

The fence representation must itself remain bounded.

Safe compaction principle:

- physical operation IDs are worker-issued and never reused for a different physical instance;
- once no live/recoverable writer can still carry a retired physical-operation receipt, detailed per-operation fence data may be compacted according to an explicit bounded policy;
- a compacted fence must never make an old caller correlation string sufficient to recreate the old physical instance.

The exact GC mechanism should be implemented with the physical-operation receipt lifecycle from P1-198 rather than inventing a second identity source here.

## 26. Size accounting truth

After cleanup returns:

```text
deleted
sizeDeleted
retainedApproxChars
```

those values are only meaningful if already-admitted stale writers cannot immediately recreate the just-pruned generation.

P1-205 therefore improves not only retention privacy/storage behavior but also the truthfulness of maintenance telemetry.

Concurrent **new** current-generation operations may of course add bytes after cleanup; that is ordinary new activity, not resurrection.

## 27. Error semantics

Recommended result vocabulary for a diagnostic write:

```text
written
stale-retired
stale-global-history
skipped-diagnostic
storage-error
```

A stale-retired diagnostic write should not fail the underlying user save/download/upload merely because its log history expired first.

OperationLog remains best-effort observability.

## 28. Security/privacy scope

This is defensive reliability/data-lifecycle architecture.

No vulnerability search or exploit work is involved.

If OperationLog fields later receive a stronger privacy deletion requirement, that data-classification rule composes with P1-205. P1-205 itself owns ordering: once cleanup authoritatively removes a generation, stale writers cannot silently re-disclose it by recreating the row.

## 29. Deterministic model

`project_tools/test_p1_205_operation_log_retention_generation_model.js` covers:

1. current-shaped default-record resurrection;
2. cleanup-before-header-write stale rejection;
3. late event cannot recreate header/events;
4. write-before-cleanup refresh and retention;
5. stale cleanup snapshot cannot delete newer generation;
6. size-pressure pruning uses same fence;
7. quota retry preserves old receipt and cannot recapture authority;
8. cleanup A does not globally fence unrelated B;
9. retirement truth survives loss of module-memory queues;
10. fresh physical operation may reuse caller correlation safely;
11. administrative clear epoch composes with P1-197;
12. current maintenance self-log remains writable when not selected;
13. both commit orders have deterministic results;
14. row absence cannot override an explicit retirement fence.

Model PASS is architecture evidence only, not production PASS.

## 30. Source-bound RED gate

`project_tools/test_p1_205_operation_log_retention_generation_source.js` requires future production evidence for:

- a durable OperationLog history/meta generation primitive;
- per-operation exact history/lifecycle generation or equivalent retirement receipt;
- header writer generation comparison before default recreation/put;
- event writer generation comparison before header/event creation;
- TTL deletion atomically publishing retirement authority;
- size-pressure pruning using the same retirement fence;
- quota retry preserving the original receipt;
- composition with the P1-197 global clear epoch;
- physical-operation identity separation from client correlation per P1-198;
- no global invalidation of unrelated current operations;
- bounded maintenance semantics;
- preservation of current per-operation write-chain and bounded IDB positive controls.

Current production source is expected RED.

## 31. Recommended implementation sequence

1. land P1-198 worker-issued physical operation identity primitive or a compatible internal precursor;
2. introduce OperationLog meta/history storage and schema migration;
3. implement global clear epoch from P1-197;
4. implement exact per-operation diagnostic generation/retirement receipt;
5. make `startOperationLog()` return/carry the immutable write receipt;
6. thread receipt through header/event/finalization logging;
7. add atomic generation checks to `mutateOperationLogOnce()`;
8. add the same check to `appendOperationLogEventOnce()`;
9. change TTL cleanup to retire exact generation + delete events/header atomically;
10. route size-pressure deletion through the same primitive;
11. preserve original receipt across quota retry;
12. retain per-operation queue as an optimization/ordering positive control;
13. add bounded selective defer for any case where exact safe cleanup cannot be established;
14. run deterministic and source gates;
15. run real Chrome/IndexedDB race tests with controlled delayed writers and quota cleanup.

## 32. Required physical/runtime evidence before closure

At minimum:

1. old O + queued header writer; cleanup commits first; writer does not recreate O;
2. old O + queued event writer; cleanup commits first; neither header nor event returns;
3. writer commits first and refreshes `updatedAt`; cleanup re-evaluates and retains O;
4. forced quota error causes cleanup, then retry with original receipt; retired O stays absent;
5. size-pressure eviction has the same stale-writer result as TTL;
6. unrelated current operation B continues logging while A is retired;
7. administrative clear from P1-197 still fences every old receipt;
8. fresh physical B with the same client correlation can create a new log;
9. terminate/restart MV3 worker after retirement and prove no old-generation resurrection path appears;
10. verify no orphan event rows;
11. verify cleanup result accounting is not immediately invalidated by an already-admitted stale writer;
12. run with very short retention in a controlled test fixture and prove maintenance remains bounded.

## 33. Closure rule

P1-205 remains ACTIVE until production implementation plus direct runtime/Chrome evidence proves the cleanup-vs-write linearization.

Architecture/model/source-gate evidence alone must not close the Registry owner.
