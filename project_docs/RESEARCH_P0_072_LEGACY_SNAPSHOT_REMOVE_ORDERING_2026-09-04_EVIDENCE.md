# P0-072 — legacy snapshot read vs storage-remove ordering proof — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ de87a056070a1f4fad381d79e01b28c20a35d938`  
Deterministic model commit: `d1e5e1d14ff6bd8c6bb43861784dd725d4484467`  
Owner: **P0-072 ACTIVE**.

This checkpoint proves that the new destructive read-only legacy snapshot helper does not need a separate Chrome-Storage read/remove mutex, provided the existing migration commit/remove ordering and new IDB writer fencing are preserved.

## 1. Fresh source facts

Current source contains only three references to `JOURNAL_PENDING_APPENDS_KEY`:

- constant definition;
- `chrome.storage.local.get(...)` in legacy migration;
- `chrome.storage.local.remove(...)` after the migration IndexedDB transaction.

There is no current modern writer that appends/reorders this legacy array.

Current migration sequence is explicitly:

```text
read legacy storage
-> commit IndexedDB pending rows
-> remove legacy storage key
```

The remove is not started before the IDB transaction has completed.

## 2. Ordering proof

Consider reset's bounded legacy snapshot read relative to another migration.

### Reset reads before migration IDB commit

The legacy storage key has not yet been removed because removal is sequenced after IDB commit.

Therefore reset sees the raw legacy source in its snapshot and can materialize/fence its target rows itself.

### Reset reads after migration IDB commit but before storage remove

Reset may see both:

- the legacy source still in Chrome Storage;
- the already materialized current IndexedDB row.

Its transaction merges by stable source/pending identity and does not duplicate/overwrite current authority.

### Reset reads after storage remove

Because remove is started only after migration IDB commit, the corresponding row representation is already present in IndexedDB.

Reset may see an empty legacy snapshot, but it sees the current pending row in its authoritative transaction and quarantines it normally.

Thus under the preserved sequencing there is no valid state where:

```text
legacy storage already absent
AND
migration IDB representation not yet committed
```

## 3. Why snapshot read timeout still fails closed

The ordering proof applies only to a successful snapshot read result.

If `chrome.storage.local.get()` times out/errors, the worker does not know whether the result would have contained hidden legacy authority.

Therefore destructive clear/import still fails closed before IDB mutation.

Do not reinterpret read timeout as `[]` merely because migration remove ordering is safe.

## 4. Interaction with scoped reset

A scoped reset can leave definite nonmatching legacy rows hidden in Chrome Storage.

A concurrent/late ordinary migration may subsequently materialize the entire snapshot and remove the whole storage key.

This remains safe only when ordinary migration is upgraded as already required:

- target rows see current reset-detached row/fence and cannot reactivate;
- definite nonmatches materialize as ordinary active rows;
- same-id conflicts become manual/fail-safe;
- all row writes complete before the whole-key remove begins.

Thus the remove may consume the mixed legacy source only after every item has an IDB representation consistent with its fence/current state.

## 5. No extra in-memory mutex is authoritative

It is not necessary to serialize reset snapshot reads and legacy removes through a new in-memory mutex.

Such a mutex would not survive MV3 worker termination and would add complexity without improving the durable ordering proof.

The durable properties are:

- migration IDB commit precedes storage remove;
- reset reads hidden source before its own IDB transaction;
- reset/migration IDB transactions overlap on `pendingAppends`/`meta` and serialize;
- current-row/fence rules prevent stale overwrite.

## 6. Deterministic model

Added:

`project_tools/test_p0_072_legacy_snapshot_remove_ordering_model.js`

Local Node result before durable write:

```text
P0-072 legacy snapshot/remove ordering model: PASS
```

Durable model commit:

`d1e5e1d14ff6bd8c6bb43861784dd725d4484467`

Covered schedules:

1. reset snapshot before migration IDB commit sees the source;
2. reset between migration IDB commit and storage remove has both source and current row coverage;
3. reset after remove sees empty source but committed IDB rows;
4. modeled remove cannot occur before an IDB representation exists.

## 7. Direct acceptance additions

- ordinary migration must preserve `IDB commit -> storage remove` sequencing;
- no new code path may remove the legacy key before all snapshot rows have an IDB/current/fenced representation;
- successful empty reset snapshot after a completed legacy remove is safe because current rows exist;
- legacy snapshot read timeout/error remains a reset failure, not an empty-source result;
- no P0-072 correctness claim may rely on an in-memory get/remove mutex.

## 8. Status

The read-only destructive snapshot architecture remains valid without cross-API pseudo-transactions.

The key invariant is:

> **Chrome Storage disappearance is allowed to imply “look in IndexedDB” only because migration removes the key strictly after its IDB commit.**

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
