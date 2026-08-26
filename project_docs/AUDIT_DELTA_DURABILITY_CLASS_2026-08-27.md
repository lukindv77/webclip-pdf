# Audit delta — recovery durability class / `recoveryGuaranteed`

Date: 2026-08-27
Source `main` HEAD audited before this write: `015ab086da90202cbb05970eb1ab85c57afa5bed`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P1-194 OPEN** and makes its acceptance criteria system-wide rather than local to one checkpoint helper.

P1-194 root cause: an ordinary successful IndexedDB commit is currently treated as if it proves the recovery class required by the product semantics. WebClip can therefore report `recoveryGuaranteed: true` although the browser has not proven persisted/non-evictable storage for that checkpoint.

## Fresh proof

### 1. Storage health knows `navigator.storage.persisted()`, save admission does not use it

`getStorageHealth()` queries `navigator.storage.persisted()` and exposes `persisted` / `persistenceStatusSupported`, but that information is health/status telemetry only.

`ensureStorageBudget()` gates large writes using `navigator.storage.estimate()` and a free-space reserve. It does not establish that the IndexedDB origin belongs to a durability/eviction class sufficient for the later `recoveryGuaranteed` promise.

Therefore: quota availability != persistence guarantee.

### 2. Durable-checkpoint append helper returns `recoveryGuaranteed:true` from ordinary IDB state

`appendJournalEntryFromDurableCheckpoint()`:

- returns `recoveryGuaranteed: false` when the required checkpoint was intentionally removed by concurrent clear/import;
- returns `recoveryGuaranteed: true` after a successful journal append;
- and, critically, also returns `recoveryGuaranteed: true` after append failure merely because the existing IndexedDB checkpoint remains for automatic retry.

No persistence-class proof is performed before that stronger promise is emitted.

This affects both local-download and Yandex-save recovery because both use `pendingDownloads` / `pendingRemoteSaves` as the durable source checkpoint before irreversible external side effects.

### 3. Generic pending append has the same semantic overclaim

The generic metadata append path uses a `checkpointed` boolean after writing an IndexedDB pending record and maps `checkpointed => recoveryGuaranteed` even if the final journal append fails.

So the problem is not a single UI string or one Yandex helper; it is a shared recovery contract.

## Why this matters

The product correctly separates irreversible external side effects from local finalization by creating recovery evidence first. But the value of that evidence depends on its durability class. If Chrome later evicts ordinary origin storage under pressure, a physically successful download/upload can remain without journal metadata even though the user/OperationLog was previously told recovery was guaranteed.

The current term `recoveryGuaranteed` is therefore stronger than the evidence supports.

## Required acceptance criteria for P1-194

1. Define explicit recovery durability states instead of a boolean that conflates them. At minimum distinguish something equivalent to:
   - `checkpoint-present-best-effort`;
   - `checkpoint-persisted/guaranteed` only when the required browser persistence property is actually proven;
   - `checkpoint-missing/cancelled`.
2. Do not emit `recoveryGuaranteed:true` solely because an IndexedDB transaction committed.
3. Irreversible side-effect admission must explicitly decide what to do when persistent storage is unsupported, denied, unknown, or not granted. The decision must be product-defined and truthfully surfaced; quota-free-space alone is insufficient.
4. If the product intentionally allows best-effort recovery on ordinary IDB, UI/OperationLog must say exactly that and must not call it guaranteed.
5. Local download, Yandex upload/publish, generic pending append, pending remote save and any future checkpoint-bearing irreversible flow must use the same durability vocabulary.
6. Tests must cover:
   - `persisted() === true`;
   - `persisted() === false`;
   - API unavailable/throws/times out;
   - successful IDB checkpoint + failed final journal append;
   - physically successful external side effect followed by simulated checkpoint eviction;
   - clear/import cancellation remains distinguishable from storage-loss/eviction.
7. P0-039 remains independent: even a best-effort checkpoint must not be deliberately TTL-dropped merely because negative settlement cannot be proven.

## Duplicate check

- Not P0-039: that item is about destroying the only unknown-outcome recovery evidence after 24h / inadequate negative proof.
- Not P1-052: that item is backup prepared-checkpoint settlement/404 handling.
- Not P1-179/P1-192: those concern backup namespace/scheduler/MV3 lifetime.
- Not P1-194 duplicate: this is direct fresh proof of the existing P1-194 root cause and therefore expands that item rather than creating P1-197.

## Registry consequence

P1-194 stays **OPEN** and should be interpreted as a shared recovery-durability contract. No P1-197 assigned.
