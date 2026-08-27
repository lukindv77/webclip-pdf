# Audit delta — OperationLog clear/retention generation integrity — 2026-08-27

Baseline HEAD before this audit block: `a276db4b8a68400b03ea97c25074f9e19b50f735`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## New confirmed item: P1-197 — OperationLog administrative deletion lacks a generation barrier

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit. This delta assigns `P1-197` because the root cause is independent from existing `P1-055` (size/retention bounds), `P1-148` (entry→OperationLog linkage/provenance) and `P1-173` (unbounded actual-settlement queue turns). Canonical large audit tables are not safely rewritten by this checkpoint, so canonical synchronization remains pending.

### Root cause

OperationLog writes are serialized only per `operationId` in the in-memory `operationLogWriteChains` map. Administrative deletion (`clearOperationLogs`) and retention/pressure deletion have no durable/global log-generation epoch that invalidates writers admitted under an older log history.

As a result, deletion of logs is not linearizable against already queued/late writers.

## Exact runtime proof

### 1. Administrative clear snapshots current writers but has no generation barrier

`clearOperationLogs()` currently:

1. snapshots `const pending = [...operationLogWriteChains.values()]`;
2. performs unbounded `await Promise.allSettled(pending)`;
3. clears the in-memory map;
4. executes one bounded IDB transaction that clears both `operations` and `events` stores.

There is no clear epoch written to IndexedDB/meta state and no writer receipt containing the epoch under which it was admitted.

A writer created after the snapshot or an old operation that schedules another event/status after the clear transaction can therefore write into the newly empty database.

### 2. Late event write demonstrably recreates a deleted header

`appendOperationLogEventOnce()` performs `operations.get(id)` and explicitly falls back to a new generic operation record when no header exists. It then:

- writes the new event to the `events` store;
- updates event counts/sequence/status on that synthesized record;
- calls `operations.put(output)`.

Therefore this is not only a theoretical race: after `clearOperationLogs()` removes the old header/events, an old-generation late event can recreate the same `operationId` as a new generic/incomplete log.

The recreated record loses the original authoritative title/type/meta/start context while making old activity appear to have happened after the user's explicit clear.

### 3. Late header/status mutation also recreates missing operations

`mutateOperationLog()` likewise uses a default record when `store.get(id)` returns no current header. Any late `recordOperationStage`/status mutation from an operation admitted before clear can therefore recreate the deleted header independently of the event path.

### 4. Clear can hang forever before reaching its bounded IDB transaction

The `Promise.allSettled(pending)` wait has no deadline and no admission cap. If one `operationLogWriteChains` promise never settles, the user's administrative clear can remain pending forever before the actual IDB clear starts.

This unbounded waiting aspect belongs to existing `P1-173`: the per-operation promise chain needs bounded admission/coalescing and administrative clear must not rely on waiting forever for every JS promise.

P1-197 is different: even if every promise eventually settles, an old operation can enqueue/write after the snapshot unless there is a persistent generation/epoch authority.

### 5. Retention cleanup can delete a still-running operation

`cleanupExpiredOperationLogs()` deletes by `updatedAt` cutoff using the `updatedAt` index and does not exempt `status === running` records.

Retention is configurable down to 1 hour. This matters because WebClip explicitly supports user-owned native Save As with **no artificial timeout**. A legitimate running operation can therefore be quiet longer than the minimum retention interval. Cleanup may delete its header/events while it is still active; its later completion event then recreates a generic/incomplete record via the behavior above.

The same generation/ownership problem applies to size-pressure deletion: removing a currently owned operation without marking its writer generation obsolete permits later resurrection.

## Required P1-197 contract

Introduce a durable OperationLog history epoch/generation, stored in the same IndexedDB trust boundary as log records (for example a dedicated meta store/versioned meta record).

### Writer admission

Every live operation/writer captures the current log epoch at operation start/admission. Every later header/event mutation carries that epoch.

Inside the same IDB transaction that would mutate `operations/events`, compare writer epoch with the current durable epoch. Mismatch = stale writer: do not create/update header or event.

Do not silently assign a stale writer the newest epoch merely because its old header was deleted.

### Administrative clear

A user clear must atomically:

1. advance the durable log epoch;
2. clear `operations` and `events` belonging to the previous epoch/history;
3. return success once that transaction commits.

It must not need to wait forever for old in-memory writers. Those writers become harmless because their captured epoch no longer matches.

Operations intentionally started **after** clear capture the new epoch and log normally.

### Retention / pressure cleanup

Retention is different from explicit clear:

- do not delete a currently owned/running operation merely because `updatedAt` is old while its lifecycle owner/receipt is still active;
- if eviction of an active/unresolved record is absolutely required under storage pressure, mark that exact writer generation tombstoned/evicted so its later events cannot synthesize a misleading new generic history;
- cleanup and normal writers must use the same epoch/operation-generation rules.

### Operation identity

Epoch must be orthogonal to `operationId`. Reusing the same textual ID in a different history epoch must never make a stale event attach to a new operation.

A robust key can be `(historyEpoch, operationId)` or an equivalent versioned receipt; UI/export may still display the current operationId string.

## Relation to existing items

- **P1-173:** owns unbounded/hung `operationLogWriteChains` queue/wait behavior. Extend it so administrative clear never performs an unbounded wait over arbitrary writer promises and queue admission remains capped/coalesced.
- **P1-055:** retains byte/event/total retention bounds; its cleanup implementation must respect P1-197 active-generation semantics.
- **P1-148:** live Journal entry→OperationLog linkage must point to an exact locally issued operation receipt, not only a textual id; P1-197 epoch can strengthen that receipt.
- **P1-190:** imported operation ids remain historical/unverified and must not gain current live-log authority. A history epoch/installation receipt helps enforce this.
- **P1-156:** native Save As can legitimately remain active longer than a 1-hour retention setting, so active log ownership must not depend only on timestamp freshness.

## Required deterministic regressions

1. Start operation A, pause an event writer, clear logs, release old writer: old header/event is not recreated.
2. Start A, clear, then start new B: B logs normally in new epoch while late A is rejected.
3. Start A with operationId X, clear, start a new operation also using textual X under new epoch: late A event cannot attach to new X.
4. Hung per-operation log promise does not make administrative clear wait forever; clear advances epoch and commits while stale writer remains harmless.
5. Retention cutoff passes while a legitimate long native Save As is still active: active operation history is not deleted solely by timestamp.
6. If active record is explicitly evicted under hard storage pressure, later events do not synthesize a misleading generic replacement.
7. Imported `operationId` cannot bypass epoch/local-provenance checks to link to/recreate a current local operation.
8. OperationLog export/detail after clear contains only new-epoch operations.

## Registry state note

This checkpoint evidence-reserves `P1-197`. It does not claim that the large canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` tables have been safely synchronized. Existing evidence-reserved P1-195/P1-196 remain separate confirmed Yandex auth items.

No `P0-079` or `P2-020` is created here.

Previous product test gate was not re-run by this docs-only audit checkpoint.
