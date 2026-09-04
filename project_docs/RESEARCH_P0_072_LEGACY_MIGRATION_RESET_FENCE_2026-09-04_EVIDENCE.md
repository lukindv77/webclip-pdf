# P0-072 — legacy pending-append migration / scoped reset fence — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 6f78dcfe7781dfead551dbaa3178bba99c7929b8`  
Deterministic model commit: `22e7302f06875f983bc509fe5f4d64fea019976a`  
Owner: **P0-072 ACTIVE**.

This checkpoint identifies a reset race outside the three current IndexedDB pending stores and refines scoped matching. Runtime, manifest, registry status and release state are unchanged.

## 1. Fresh current-source finding — legacy recovery is a second materialization source

`recoverPendingJournalAppends()` begins with:

```text
await migrateLegacyPendingJournalAppends()
```

The legacy source is:

```text
chrome.storage.local.webclipPendingJournalAppends
```

The current migration contract is deliberately restart-idempotent:

1. read the legacy array from `chrome.storage.local`;
2. normalize up to `MAX_PENDING_JOURNAL_APPENDS = 20` rows and the existing aggregate size bound;
3. write rows to IndexedDB `pendingAppends`;
4. after the IndexedDB commit, separately call `chrome.storage.local.remove(...)`.

Current source explicitly documents the split as `Commit/remove split is idempotent`.

That split is correct for restart-safe migration, but it means the legacy array and IndexedDB reset cannot share one transaction.

## 2. Concrete stale-rematerialization schedule

The current P0-072 plan only quarantines rows that already exist in IndexedDB at clear/import time.

A valid current schedule is:

1. maintenance reads legacy row L from `chrome.storage.local`;
2. before migration writes L to IndexedDB, clear/import transaction commits;
3. reset sees no IndexedDB row L and therefore cannot quarantine it;
4. migration resumes and writes L into `pendingAppends` as ordinary active recovery work;
5. `recoverPendingJournalAppends()` can later replay L into the post-reset Journal generation.

The inverse ordering is safe: if migration commits first, reset sees the new IndexedDB row and can quarantine it. The missing ordering is reset-first / migration-second.

Therefore P0-072 must fence **materialization sources**, not only rows visible at reset time.

## 3. Why deleting the legacy key during reset is not sufficient

A clear/import handler cannot make `chrome.storage.local.remove()` atomic with the IndexedDB Journal reset.

Even if reset performs a post-commit remove:

- a migration may already have read the legacy array before the remove;
- caller-side timeout of the storage mutation does not prove whether/when its actual settlement occurs;
- a worker interruption can happen between IndexedDB reset commit and storage cleanup.

The solution must therefore be durable on the IndexedDB side and visible to a migration transaction that executes after reset.

## 4. Bounded architecture — per-row legacy reset fences in existing `meta`

Use a second reserved `meta` namespace only for legacy migration fencing, conceptually:

```text
legacyPendingFence:v1:<legacy-pending-id>
```

This is distinct from the planned `externalEffect:v1:*` receipt namespace.

The fence is consulted **only by the legacy migration path**. Ordinary future `pendingAppends` writers do not use it, so a historical legacy id does not become a global tombstone for all future work.

A fence stores compact evidence such as:

- version;
- legacy pending id;
- source operation id when present;
- reset id;
- reset kind/scope/scope key;
- scope relation (`match` or `indeterminate`);
- created/fenced timestamp.

No PDF payload, OAuth secret or transfer capability belongs in this fence.

## 5. Why the fence is naturally bounded

The current legacy queue is already hard limited to 20 rows and 4 MiB aggregate before migration proceeds.

There is no current live writer to `webclipPendingJournalAppends`; source search shows it only as the legacy migration input/removal key.

Therefore at most one compact fence per legacy id is required. Keeping these tiny migration-only fences indefinitely is acceptable for the current P0-072 tranche and avoids introducing another unsafe cleanup race.

A later P2 cleanup may compact them only after proving the legacy source can no longer rematerialize the row.

## 6. Required migration transaction change

`migrateLegacyPendingJournalAppends()` must write through a transaction that includes both:

```text
pendingAppends + meta
```

For each normalized legacy row:

1. re-read the current `pendingAppends` row by id;
2. if it is already reset-detached, do not replace it;
3. read the migration-only fence for that legacy id;
4. if a fence exists, materialize/retain the row as reset-detached manual authority using the fence's first reset identity;
5. otherwise perform the ordinary migration write subject to existing queue count/byte bounds.

Because reset also writes `pendingAppends + meta`, overlapping readwrite transaction scopes serialize. This gives the required ordering:

- migration wins first -> reset quarantines the materialized row;
- reset wins first -> migration observes the durable fence and cannot recreate active replay authority.

MDN current IndexedDB documentation states that writing transactions with overlapping scopes queue rather than run concurrently, and abort rolls back the transaction:

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

## 7. Reset must pre-read the bounded legacy source

Before opening the authoritative clear/import IndexedDB transaction, the worker reads the bounded legacy storage key.

This read is not itself authoritative mutation. Its purpose is only to identify hidden legacy ids/scope that could materialize after the reset.

Required fail-closed behavior:

- if the legacy source is absent/empty, continue normally;
- if it exceeds the already existing count/size bounds, preserve the current migration failure semantics and do not destructively reset while hidden replay authority cannot be bounded;
- if the storage read itself fails/times out and the worker cannot prove there is no hidden legacy source, clear/import should fail closed rather than create a Journal generation boundary that a hidden old row can later cross.

This adds a bounded prerequisite read, not a cross-store pseudo-transaction.

## 8. Scoped reset needs three-valued scope relation

Fresh source shows `normalizePendingJournalAppendData()` permits an empty `meta.url` and empty `hostname`; current scoped clear simply deletes a pending row when normalized URL/site exactly matches and leaves every other row unchanged.

For P0-072, `nonmatching` and `cannot determine scope` are not equivalent.

Use:

```text
match | nonmatch | indeterminate
```

### URL clear

- exact normalized `urlKey == target` -> `match`;
- known different URL -> `nonmatch`;
- missing URL but known same site -> `indeterminate`;
- no usable URL/site identity -> `indeterminate`.

### Site clear

- exact normalized `siteKey == target` -> `match`;
- known different site -> `nonmatch`;
- no trustworthy site identity -> `indeterminate`.

### Clear-all / import-replace

Every old row is `match`.

## 9. Indeterminate scope cannot remain active replay authority

Leaving an indeterminate row active would allow it to append after a scoped destructive reset even though the worker cannot prove it was outside the cleared scope.

Deleting it would lose recovery evidence.

Therefore the conservative P0-072 transition is:

```text
indeterminate -> reset-detached + outcome=unknown + resolution=manual-resolution
```

This preserves the row while preventing stale automatic Journal replay.

A definite nonmatch remains byte-for-byte unchanged.

This refinement applies to:

- current `pendingAppends` rows;
- local/remote pending rows if their stored scope is missing/invalid;
- hidden legacy pending rows represented by migration fences.

New worker-issued external-effect receipts must contain valid immutable `urlKey/siteKey` at creation and therefore should not normally enter the indeterminate branch.

## 10. No cryptographic fingerprint is required for the current legacy fence

The fence is consumed only by `migrateLegacyPendingJournalAppends()`, not by ordinary checkpoint writers.

The legacy migration primary key is already the future Journal/pending id. Current code has no live legacy writer and the source is bounded to 20 items.

Therefore using the legacy id as the migration-fence lookup key is sufficient for this tranche. `operationId` remains an additional consistency/audit field where present.

Do not reuse the fence as general Journal generation authority; that would overlap P0-076.

## 11. Existing writer fencing still applies

The legacy migration currently performs whole-record materialization. It must obey the same P0-072 rule already established for other whole-record writers:

> an ordinary or migration writer may never replace a current reset-detached row with a stale caller snapshot.

In particular, if a previous migration already created an IndexedDB row and reset quarantined it, a repeated migration caused by failed/timed-out `chrome.storage.local.remove()` must leave the current quarantine intact.

## 12. Deterministic model

Added:

`project_tools/test_p0_072_legacy_migration_reset_fence_model.js`

Local Node result before durable write:

```text
P0-072 legacy migration/reset fence model: PASS
```

Covered schedules:

1. migration commits before reset -> reset quarantines the row;
2. reset commits before migration -> durable fence makes migrated row detached;
3. scoped definite nonmatch stays active/unmodified;
4. indeterminate scoped row becomes manual rather than active replay;
5. failed/late legacy storage removal followed by repeated migration cannot reactivate the row;
6. migration cannot overwrite a currently quarantined row;
7. migration-only fence does not poison an ordinary future writer with the same textual id.

The model is architecture evidence, not a runtime PASS.

## 13. Typed local terminal transition refinement

The exact call-site audit also found that current `removePendingLocalDownload()` is used for physically different states:

- before `chrome.downloads.download()` is called because automatic-start admission is busy;
- synchronous start-call failure;
- actual start promise rejection;
- invalid returned DownloadItem id;
- successful `complete` cleanup;
- terminal `interrupted` cleanup.

After reset quarantine these cannot all remain one unconditional delete primitive.

Required split:

- proven pre-start cancellation -> transition to a terminal `cancelled-before-start` state (eligible for the dedicated terminal retention/compaction policy);
- exact complete -> terminal `complete`;
- exact interrupted -> terminal `interrupted`;
- unknown/timeout -> retain reconciling/manual according to P0-039/P1-146;
- generic ordinary cleanup may physically delete only a current non-detached row with matching operation identity.

This avoids both extremes: deleting uncertain reset authority and retaining a provably never-started intent forever.

This refinement does not redefine P1-146's Chrome-download start semantics; it only makes P0-072 cleanup state-aware.

## 14. New implementation acceptance additions

Add these cases to the accumulated P0-072 runtime acceptance list:

- legacy migration before reset is quarantined;
- reset before legacy migration produces/uses a durable per-row fence;
- repeated migration after legacy storage remove failure cannot reactivate reset-detached authority;
- a definite scoped nonmatch is unchanged;
- a scoped indeterminate row becomes manual, not active replay and not deleted;
- migration whole-put cannot erase an existing reset disposition;
- clear/import fails closed when the hidden legacy source cannot be bounded/read safely;
- local pre-start cancellation, complete and interrupted have distinct terminal transitions after reset;
- caller timeout/unknown never maps to `cancelled-before-start`.

## 15. Owner boundaries

This finding remains under P0-072 because it is specifically a way for old recovery authority to cross a bulk reset boundary after the reset has already committed.

It does not close:

- P0-076 — general per-entry / Journal-generation CAS;
- P1-146 — complete automatic download start unknown-settlement semantics;
- P1-043 — global storage byte reservation;
- P1-183 — Delete→Trash pre-move receipt creation;
- P1-090/P0-073/P0-074 — exact Yandex identity/context settlement.

No new P-code is allocated.

## 16. Status

The previous statement that the first runtime tranche only needs to touch current IndexedDB pending stores is refined: it must also make the bounded legacy migration path reset-aware, otherwise active recovery authority can be rematerialized after reset.

`P0-072` remains **ACTIVE**. Runtime remains unchanged. `manifest.json` remains `0.9.8`. Release remains `NOT READY`. No build/tag/GitHub Release or GitHub Actions run is claimed by this research checkpoint.
