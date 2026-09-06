# P0-076 — Journal generation + per-entry CAS architecture — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `7a2f04a5fabfdbe8dfa5d4714eec15cbdd1bfcfb`  
Owner: **P0-076 ACTIVE**.

This is a defensive data-integrity/recovery research checkpoint. Runtime, manifest, Registry status and release state are unchanged.

## 1. Duplicate/owner check

The consolidated Journal view/authority family already contains earlier research about:

- rendered Journal revision as mutation authority;
- bulk confirmation/revision authority;
- Open Saved File rendered-entry generation;
- grouped/ungrouped view revision coherence.

The current Registry, however, intentionally keeps **P0-076 ACTIVE** with the stronger unresolved requirement:

> Journal single-entry mutations require per-entry revision + Journal-generation CAS against clear/replace/import; late stale writes cannot mutate replacement records by id alone.

The current source still lacks this exact per-entry/generation capability. This tranche therefore refines the existing owner rather than allocating a new P-code.

## 2. Current source proof — UI mutation messages are id-only

Fresh `journal.js` audit shows current rendered-entry actions send textual entry id without an exact rendered mutation token:

- add/edit/delete comment -> `id` (+ comment/commentId);
- Mark Read -> `id` + operationId;
- Delete -> `id` + diskAction + operationId.

The page maintains `webclipJournalRevision` only as a reload/change detector. It is not attached to those mutation messages as authority.

Therefore a stale rendered card can still address a same-id replacement entry after import/replace if the worker only looks up by id.

## 3. Current source proof — worker point mutations do not CAS rendered authority

`updateJournalEntryRecord(id, patch)` currently performs one readwrite transaction:

```text
get(id)
-> merge {...current, ...patch, id: current.id}
-> put(updated)
-> touch global revision
```

It does not compare an expected rendered entry revision or Journal generation.

Comment handlers first call `getJournalEntryById(id)`, compute a comment-array change in memory, then call `updateJournalEntryRecord()`. Another mutation/import can therefore occur between the first read and the later update transaction.

`deleteJournalEntryRecordOnly(id)` similarly:

```text
getJournalEntryById(id)      // one transaction
... async work ...
entries.delete(id)           // later transaction, key-only
```

The same textual id is treated as enough authority.

Mark Read also uses multiple `updateJournalEntryRecord(id, patch)` calls before/after remote work and in error settlement.

These are direct P0-076 mutation surfaces.

## 4. Existing global revision is not the permanent per-entry CAS

There are two related current revision concepts:

1. IndexedDB `meta.revision`, changed by `touchJournalDbRevision()` inside Journal write transactions;
2. `chrome.storage.local.webclipJournalRevision`, asynchronously published for page reload/change notification.

The Chrome Storage marker is explicitly a notification channel and is not atomic with the IndexedDB mutation. It must not become mutation authority.

Using the IndexedDB global revision as the permanent CAS for every modern point mutation would also be unnecessarily coarse:

- entry B comment changes global revision;
- a still-current rendered action for independent entry A would fail even though A did not change.

A temporary conservative legacy bridge may use exact DB revision, but modern entries need targeted authority.

## 5. Selected two-level authority

Use two independent local tokens:

### Journal destructive generation

A nonportable IndexedDB `meta` control record, conceptually:

```text
journalMutationGeneration:v1 = <strong UUID-v4>
```

It changes only on Journal **generation boundaries** that can invalidate old entry/create authority, including the P0-076-owned clear/replace/import boundaries.

Ordinary point mutation of entry B does not rotate this generation.

### Per-entry opaque revision

Each modern local Journal entry stores one local field conceptually:

```text
entryRevision = <strong UUID-v4>
```

The exact field name remains an implementation detail, but its semantics are fixed:

- assigned locally when a new current entry generation is committed;
- replaced with a fresh UUID after every successful point mutation of that entry;
- compared exactly in the same transaction as the mutation/delete;
- imported portable value is never trusted;
- it is not a password/capability for remote services.

An opaque UUID revision avoids integer overflow and timestamp-ordering problems.

## 6. Mutation authority token

A modern rendered/action token is conceptually:

```text
{
  journalGeneration,
  entryRevision
}
```

A point mutation transaction must read both current values and require exact equality **before** patch/delete.

Possible results should be machine-readable, for example:

```text
applied
missing
stale-journal-generation
stale-entry-revision
legacy-revision-required
```

A stale result never silently retargets the current same-id row.

## 7. Why both levels are needed

### Per-entry revision

Prevents stale same-entry point updates and comment lost-update races without invalidating unrelated entry actions.

Example:

```text
render A@A1, B@B1
mutate B -> B2
A@A1 remains valid
```

### Journal generation

Prevents an old operation/view from acquiring authority in a new bulk-destructive generation even when textual id is reused.

Example:

```text
render/admit A under G1
import-replace -> G2 + replacement id=A
old G1/A1 action arrives
-> reject on journal generation before id can retarget replacement
```

It also supplies the missing P0-072 boundary for an old operation whose pending row did not yet exist when reset committed: the old operation may not append/finalize into a newer Journal generation merely because it later creates a checkpoint.

P0-072 remains owner of already-durable reset barriers; P0-076 owns this ordinary generation CAS.

## 8. Bulk clear/import generation rotation must be atomic

Generation rotation belongs in the same IndexedDB readwrite transaction as the destructive Journal mutation.

Required ordering:

```text
read/validate current generation
-> create next strong generation id
-> clear/delete/replace entries
-> commit next generation in meta
-> commit once
```

Transaction abort restores both entries and generation token.

Do not publish the new generation to UI before transaction completion.

The existing UI reload revision marker remains a separate post-commit notification mechanism.

## 9. New-entry / append rule

A save/recovery operation that may create a Journal entry captures the current `journalGeneration` when its Journal-finalization authority is admitted/checkpointed.

Final append transaction requires:

```text
current journalGeneration === expected journalGeneration
```

before inserting a missing entry.

Thus:

```text
operation admitted under G1
clear/import rotates to G2
late old append under expected G1
-> stale-journal-generation, no insertion
```

This is independent of P0-072 reset-disposition logic and is the required P0-076 negative control.

## 10. Existing-entry point mutation rule

For modern entries:

```text
read meta generation + entry in one transaction
-> compare expected generation
-> compare expected entryRevision
-> apply patch/delete
-> assign fresh entryRevision if row survives
-> touch ordinary Journal revision notification state
-> commit
```

No read-before-await snapshot may be used as later write authority.

If external work must occur between admission and finalization (Mark Read, Delete→Trash), the operation retains its expected authority token and the final local mutation rechecks it after the external work.

A failed final CAS must not mutate the replacement/current Journal row. Physical-effect reconciliation remains with the applicable receipt/remote owners.

## 11. Legacy rollout bridge without DB-wide schema migration

Current entries have no per-entry revision field. A DB-version migration across every entry would increase P2-019/shared-schema-owner blast radius and can require large upgrade work.

Selected compatibility direction:

- modern/new entries receive per-entry revisions;
- legacy rendered entries may temporarily use **exact IndexedDB meta revision observed in the same read transaction as the entry**;
- a legacy point mutation succeeds only if that exact rendered DB revision is still current;
- the successful mutation assigns the first per-entry revision to that row;
- after that, targeted per-entry CAS applies.

This legacy fallback is intentionally conservative: any intervening Journal mutation may force reload/retry. It is a rollout bridge, not the permanent modern policy.

The asynchronously published Chrome Storage revision is not sufficient for this bridge because it can lag the exact IndexedDB transaction state.

## 12. Journal page read requirement

Because `journal.js` reads IndexedDB directly, rendered authority must be captured from the same database snapshot used for the card/page data.

Target query shape should include `meta` in the same readonly transaction as the relevant `entries` query and return/carry:

- current Journal generation;
- exact current DB revision for legacy fallback;
- each entry's per-entry revision when present.

Mutation messages then carry the rendered token explicitly.

A notification-driven reload remains useful UX but is not a substitute for worker CAS.

## 13. Portable import/export boundary

Local mutation authority is not portable restore authority.

Required rules:

- import ignores any supplied `entryRevision`/Journal generation value;
- committed imported entries receive fresh local entry revisions;
- import-replace rotates to a fresh local Journal generation;
- portable same-id data can therefore never recreate the old local mutation token;
- export should omit local authority fields to avoid exposing implementation-only state as logical backup semantics.

Current import normalization explicitly reconstructs supported logical Journal fields rather than treating arbitrary input object fields as trusted authority; runtime implementation must preserve that boundary when the new local field is introduced.

## 14. Strong generation primitives

Both new P0-076 local authority ids should use:

```text
crypto.randomUUID()
```

with UUID-v4 validation and no `Math.random()` fallback.

The extension minimum Chrome version is already 118, so a strong Web Worker UUID source is available on the supported platform floor.

Generation failure fails closed before committing authority-changing mutation.

## 15. Deterministic model

Added:

`project_tools/test_p0_076_journal_generation_cas_model.js`

The model covers:

1. modern same-entry stale revision is rejected;
2. mutation of unrelated entry B does not invalidate modern A authority;
3. import-replace rotates Journal generation and same-id old action is rejected;
4. negative control shows id-only patch mutates a replacement row;
5. legacy exact-DB-revision bridge succeeds when unchanged and assigns first targeted revision;
6. unrelated intervening mutation makes legacy rendered state stale;
7. portable imported revision value is ignored and replaced locally;
8. late append admitted under old Journal generation is rejected after bulk generation rotation.

This is architecture evidence, not runtime PASS.

## 16. Immediate source inventory for P0-076

Confirmed mutation families needing later direct acceptance/source gates include at least:

- add/edit/delete/update Journal comments;
- generic `updateJournalEntryRecord()` callers;
- Delete local record;
- Mark Read pre-move checkpoint, success finalization and error checkpoint update;
- pending/recovery Journal append/create paths;
- bulk clear/import generation rotation;
- Journal-page mutation messages and rendered-token propagation.

Further P0-076 research should inventory any additional same-entry mutation/open/action paths before implementation.

## 17. Owner boundaries

This architecture does not close or absorb:

- P0-072 durable external-effect reset detachment;
- P0-073/P0-074 Yandex remote/account/root/config identity;
- P1-090 physical remote-object destructive reconciliation;
- P1-183 Delete→Trash pre-move receipt;
- P1-206 exact rendered view/action UX where broader than mutation CAS;
- P2-019 shared IndexedDB schema ownership.

## 18. Status

P0-076 remains **ACTIVE**. Runtime, `service-worker.js`, `journal.js`, IndexedDB schema version, manifest and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
