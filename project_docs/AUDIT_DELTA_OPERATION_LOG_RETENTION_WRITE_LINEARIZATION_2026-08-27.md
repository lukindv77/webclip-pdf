# Audit delta — OperationLog retention cleanup vs queued writes — 2026-08-27

Source-of-truth `main` immediately before this write: `27f95d06673ae9414931d2c405eea2070cd65f22`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-205 — retention cleanup can be overtaken by an already queued OperationLog write and resurrect an expired operation

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide duplicate-check found adjacent OperationLog items, but no existing owner for this delete-vs-write linearization bug:

- **P1-039** — unified logged background maintenance and bounded cleanup stages;
- **P1-040** — flush OperationLog write tail before returning selected user-operation responses;
- **P1-075** — bounded/abortable maintenance IndexedDB transactions;
- **P1-121** — retention-setting Chrome Storage ordering;
- **P1-173** — admission pressure for serialized actual-settlement queues.

P1-205 concerns a different invariant: destructive retention/size cleanup and per-operation queued writers must agree on one ordering/generation. A queued write that was already logically part of an old operation must not recreate that operation after cleanup has authoritatively expired/deleted it.

## Fresh source proof

### 1. Per-operation writes are serialized only through module-memory chains

`service-worker.js` declares:

`const operationLogWriteChains = new Map();`

`queueOperationLogWrite(operationId, task)` obtains the previous Promise for that operation, chains the new task behind it, publishes the new Promise into the map and removes it after settlement.

This correctly orders multiple writes for the **same operation id** while those tasks are all admitted through the queue.

`appendOperationLogEvent()`, `startOperationLog()` and terminal/status mutations use this queue.

### 2. `clearOperationLogs()` explicitly treats queued writes as a destructive-operation barrier

The manual/full clear path does:

1. collect `const pending = [...operationLogWriteChains.values()]`;
2. `await Promise.allSettled(pending)`;
3. clear the in-memory chains;
4. only then clear OperationLog stores in one bounded IndexedDB transaction.

This is a strong positive control: the implementation already recognizes that clearing storage while queued writers can still execute would be unsafe.

### 3. Retention cleanup does not use the same barrier

`cleanupExpiredOperationLogs(retentionOverride)` calculates the cutoff, opens `WebClipOperationLogs` and directly starts its bounded readwrite cleanup transaction over:

- `OPERATION_LOG_STORE`;
- `OPERATION_LOG_EVENT_STORE`.

It walks the `updatedAt` index below the cutoff and deletes both the operation and its events.

The function does **not** first wait for `operationLogWriteChains`, does not mark the deleted operation generation/epoch, and does not block a queued JS task from starting after the cleanup transaction commits.

IndexedDB transaction serialization alone does not solve this case because the later writer may not have opened its IDB transaction yet — it can still be waiting as a Promise turn in `operationLogWriteChains` while cleanup runs.

### 4. A later write recreates a missing operation instead of rejecting it as expired

Operation-log mutations are intentionally resilient to missing headers.

`mutateOperationLogOnce()` reads the operation record and, when it is missing, creates a default record with fields including:

- `operationId`;
- `type: 'operation'`;
- title `Операция WebClip`;
- `createdAt: now`;
- `updatedAt: now`.

The event-write path has the same missing-record recovery behavior: a missing operation header is recreated so the event can still be persisted.

That resilience is useful for normal write ordering/recovery, but after **authoritative retention deletion** it changes semantics: the old operation is no longer treated as expired; it is reborn with a fresh timestamp.

### 5. Deterministic resurrection schedule

1. Operation O is old enough that its durable `updatedAt < cutoff`.
2. A new diagnostic task W for O has already been queued in `operationLogWriteChains`, but W has not started its IDB transaction yet because it waits behind another Promise/task.
3. Background maintenance calls `cleanupExpiredOperationLogs()`.
4. Cleanup sees the old durable record O, deletes O and all its events, and commits successfully.
5. W is released afterward.
6. W opens a new IDB transaction, reads O and finds no record.
7. Missing-record fallback creates a default O with `createdAt/updatedAt = now` and persists W's mutation/event.
8. O is now retained for another full retention interval even though maintenance had just expired it.

The cleanup result can therefore report O deleted while storage immediately contains O again.

### 6. Size-based cleanup has the same conceptual requirement

OperationLog maintenance also enforces aggregate log-size/event budgets. Any destructive pruning path that selects a record/event as disposable must be ordered against queued writers for that same operation.

Otherwise a post-prune queued write can recreate/expand state after the cleanup's accounting snapshot, making `deleted/sizeDeleted/retainedApproxChars` immediately stale and undermining the intended bounded-storage convergence.

P1-205 should therefore be fixed as an OperationLog delete/write policy, not as a one-line wait added only to one TTL cursor.

## Why worker restart does not eliminate this bug

The strongest deterministic repro is within one worker generation; no restart is required.

Worker restart can drop JS-only queued turns, so it is not the source of resurrection. The root cause is more basic: retention cleanup is outside the same logical operation-ordering contract as queued writers.

This distinction matters because a fix should not rely on MV3 termination accidentally discarding pending diagnostics. Diagnostic loss is not an acceptable synchronization mechanism.

## Why P1 rather than P0

OperationLog is diagnostics/observability data, not the Journal source of truth or a remote destructive authority.

The defect can:

- violate configured retention;
- retain diagnostics longer than promised;
- consume storage beyond cleanup expectations;
- produce misleading cleanup statistics/history chronology.

But current source proof does not show Journal corruption or unauthorized Yandex mutation, so P1 is appropriate.

If log metadata itself contains privacy-sensitive retained fields whose deletion has a stronger explicit privacy contract, that data-classification issue should compose with P1-205 rather than changing the basic ordering root cause.

## Required P1-205 contract

### Cleanup and writes need one linearization policy

Before retention/size cleanup authoritatively deletes an operation, queued/in-flight writes for that operation must be accounted for.

Safe policies include either:

1. **drain-before-delete** — cleanup waits for admitted writes, recomputes `updatedAt`/size, then deletes only records still eligible; or
2. **generation/tombstone fencing** — cleanup commits an expiry/deletion generation and any queued writer carrying an older operation generation is dropped/fail-closed rather than recreating the record.

A global wait for every log write may be unnecessarily expensive; per-operation/bounded batching is acceptable if correctness is preserved.

### Fresh eligibility after waiting

If cleanup waits for a pending write, it must re-evaluate the operation's current `updatedAt` and retention/size eligibility after that write settles.

Do not delete based on a stale pre-wait cursor snapshot if the operation just received a legitimate current event.

### Missing-record fallback must distinguish recovery from authoritative deletion

The current “missing header => create default header” behavior needs provenance.

A writer may recreate a record only when missing state means recoverable partial logging, not when a newer retention/clear generation intentionally deleted that operation.

A bounded tombstone/deletion epoch, cleanup generation, or another explicit receipt can make that distinction.

### Manual clear semantics remain stronger

`clearOperationLogs()` already drains the current write chains before destructive clear. Preserve that property.

If a generation-fenced design replaces the global drain, manual clear must still guarantee that old queued diagnostics cannot repopulate logs after the user explicitly cleared them.

### Maintenance remains bounded

Do not fix P1-205 by allowing one hung diagnostic write to block maintenance forever.

Composition with existing deadline/admission work is required:

- bounded waiting/admission;
- per-operation busy/defer policy where needed;
- cleanup may skip an operation whose write outcome is unknown and retry next maintenance cycle;
- never declare that skipped operation deleted.

## Required deterministic regressions

1. Old operation O + queued writer W not yet started -> retention cleanup commits delete -> W starts: O is **not** recreated from the obsolete generation.
2. Old O + queued W completes before cleanup eligibility is finalized and updates O to current time -> cleanup rechecks and retains O.
3. Old O + hung W -> maintenance remains bounded, reports O as deferred/not deleted, and a later cycle converges after W settles.
4. Cleanup deletes O and all event rows atomically; no orphan event rows remain.
5. Size-based pruning has the same stale-writer fence as TTL pruning.
6. `clearOperationLogs()` followed by a previously admitted old write cannot repopulate user-cleared logs.
7. Missing-record recovery still works for a genuinely partial/new operation that has no newer deletion generation.
8. Cleanup statistics (`deleted`, `sizeDeleted`, retained estimate) reflect committed final decisions and do not count deferred operations as deleted.
9. Worker restart after a cleanup commit reconstructs deletion/generation truth from durable state rather than depending on lost in-memory chains.
10. Repeated maintenance remains idempotent and eventually converges under normal write traffic.

## Duplicate check / numbering

- New evidence-reserved **P1-205** assigned.
- **P1-039** remains unified background maintenance ownership.
- **P1-040** remains response-boundary flushing of operation log tails.
- **P1-075** remains bounded cleanup transaction lifetime.
- **P1-121** remains retention-setting storage mutation ordering.
- **P1-173** remains waiting-turn admission pressure.
- **P1-204** remains context-menu browser-state worker-generation ordering.

No new P0 or P2 number is created.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created by this audit write.
