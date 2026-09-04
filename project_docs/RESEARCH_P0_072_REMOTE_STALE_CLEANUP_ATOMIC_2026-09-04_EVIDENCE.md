# P0-072 — remote stale cleanup snapshot/delete race — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ c09975154d17f4f2b3a2c4fb878f5d7a7e944178`  
Deterministic model commit: `f64815de3ff3ebcd3064f0cd91f4967fa116460f`  
Owner: **P0-072 ACTIVE**.

This checkpoint covers only generic cleanup of `pendingRemoteSaves` rows already in `phase:'stale-unverified'`. Runtime/manifest are unchanged.

## 1. Current source shape

`cleanupStalePendingRemoteSaves()` currently performs two separate IndexedDB transactions:

1. a readonly transaction lists stale rows and builds an in-memory candidate set;
2. code computes age/count `removeKeys` outside IndexedDB;
3. a later readwrite transaction deletes every selected key with `pending.delete(key)`.

The delete transaction does not re-read the current row.

## 2. Race

A row may be selected while it is ordinary stale history, then a clear/import reset may commit a `journalResetDisposition`, and finally the old cleanup task can still delete the same key from its stale `removeKeys` snapshot.

Therefore adding only this predicate to the first scan is insufficient:

```text
if reset-detached -> skip candidate
```

The predicate must hold at the physical delete linearization point as well.

## 3. Preferred implementation

The lowest-complexity target is one readwrite transaction that owns both candidate classification and deletion:

```text
open pendingRemoteSaves readwrite transaction
 -> scan current rows
 -> consider only current phase=stale-unverified AND not reset-detached
 -> compute TTL + max-count candidates while transaction remains active
 -> delete only those same transaction-owned rows
 -> publish result on tx.oncomplete
```

This removes the snapshot-to-delete race rather than trying to repair it with another stale snapshot.

A compare-before-delete second transaction is also safe if it re-reads every key and validates all current predicates, but it has more moving parts and no clear benefit for this bounded store.

## 4. Generic cleanup must not own detached terminal retention

Even if a reset-detached row later has a factual terminal outcome, generic `stale-unverified` TTL/count cleanup should not delete it.

Detached terminal compaction/retention belongs to the dedicated reset-receipt terminal path. This preserves one clear ownership rule:

```text
generic stale cleanup -> ordinary non-detached stale history only
reset-detached cleanup -> dedicated terminal-retention proof path
```

Age never converts an unresolved detached receipt into disposable history.

## 5. Required current predicates

At delete time the row must still be all of:

- present under the selected key;
- `phase === 'stale-unverified'`;
- not carrying `journalResetDisposition`;
- still eligible by current TTL/count retention calculation inside the owning transaction.

A row that became `remote-verified`, active again, reset-detached, or otherwise changed before the cleanup transaction reaches it is preserved.

## 6. Capacity interaction

Removing proven ordinary stale history can restore ordinary remote-history capacity.

It must never free capacity by deleting:

- reset-detached unresolved/manual rows;
- reset-detached terminal rows through this generic path;
- rows whose current phase no longer matches the stale class.

P1-043 remains the owner for shared-origin physical byte reservation; this cleanup contract is only local row lifecycle.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_remote_stale_cleanup_atomic_model.js`

Local equivalent model result before durable write:

```text
P0-072 remote stale cleanup atomic model: PASS
```

Covered controls:

1. ordinary old stale row may be deleted;
2. reset-detached stale row survives TTL cleanup;
3. count-pressure trimming skips detached rows;
4. a row whose current factual phase is no longer stale survives;
5. detached terminal row is not consumed by generic stale cleanup.

This is architecture/model evidence, not runtime PASS.

## 8. Runtime/source acceptance addition

Before P0-072 closure:

- `cleanupStalePendingRemoteSaves()` must not retain a readonly-snapshot -> key-only-delete race;
- candidate classification and physical delete must be one transaction, or every delete must re-read/revalidate current row;
- no generic stale cleanup path may delete any `journalResetDisposition` row;
- count trimming must apply only to current non-detached stale rows;
- terminal detached cleanup must remain a separate explicit path.

## 9. Owner boundaries

This does not close P1-090 remote object identity, P0-073/P0-074 Yandex context generation, P1-043 shared quota reservation, or P1-210 user-facing reconciliation.

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
