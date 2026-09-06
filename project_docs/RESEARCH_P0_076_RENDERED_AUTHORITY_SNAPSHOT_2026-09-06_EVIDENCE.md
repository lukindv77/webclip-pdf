# P0-076 — rendered entry authority must share one IndexedDB snapshot — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `5600d45f25890b5316bbee0ce515cc0aead08d59`  
Owner: **P0-076 ACTIVE**.

This checkpoint refines the legacy rollout bridge and rendered-authority capture for the P0-076 Journal generation/per-entry CAS architecture. Runtime/manifest remain unchanged.

## 1. Fresh current-source finding

Current `journal.js` reads Journal entries directly from IndexedDB. Its principal view/query transactions currently use:

```text
db.transaction(JOURNAL_STORE, 'readonly')
```

for:

- id lookup batches;
- ordinary createdAt page queries;
- context/page queries;
- grouped URL queries;
- expanded URL-group queries.

They do **not** include `JOURNAL_META_STORE` in the same readonly transaction.

Current page-level `webclipJournalRevision` is read separately from `chrome.storage.local` and is used as a reload/change notification token.

## 2. Why a separately read meta revision is unsafe as a legacy mutation token

Suppose legacy entry A has no per-entry revision yet.

Unsafe split-read schedule:

1. readonly transaction T1 reads old A from `entries`;
2. writer W atomically updates A and `meta.revision` from D0 to D1;
3. separate readonly transaction T2 reads current `meta.revision = D1`;
4. UI holds **old A bytes + current D1**;
5. if mutation authority uses only `expectedDbRevision=D1`, the old rendered card can be falsely accepted as current.

Therefore:

```text
entry read + authority meta read in different transactions
```

is not a valid rendered authority snapshot.

## 3. Required query boundary

For any view result that can later initiate P0-076 mutation, `journal.js` must observe entry data and local authority metadata inside **one readonly IndexedDB transaction** whose scope includes:

```text
[JOURNAL_STORE, JOURNAL_META_STORE]
```

The transaction captures together:

- returned entry bytes;
- `journalMutationGeneration:v1` when present;
- exact IndexedDB `meta.revision` for legacy fallback.

Modern entry `entryRevision` is already part of the returned entry record.

## 4. Modern vs legacy rendered token

### Modern row

Rendered authority:

```text
{
  journalGeneration,
  entryRevision
}
```

The global DB revision may still accompany the view for reload/diagnostics, but modern point mutation does not depend on unrelated global revision changes.

### Legacy row without entryRevision

Temporary rendered authority:

```text
{
  journalGeneration,
  renderedDbRevision
}
```

The worker mutation transaction requires the exact current `meta.revision` to equal `renderedDbRevision` before upgrading/mutating that legacy row.

This fallback is deliberately coarse and disappears for the row after its first safe mutation assigns a targeted revision.

## 5. Chrome Storage revision remains notification-only

`chrome.storage.local.webclipJournalRevision` cannot substitute for the exact IndexedDB revision snapshot because:

- it is written asynchronously after IndexedDB mutation;
- it may lag the committed database state;
- it is not observed atomically with an entry cursor;
- its purpose is cross-page reload notification.

P0-076 must keep notification authority and mutation authority separate.

## 6. Transactional consistency requirement extends to pagination/group queries

It is not sufficient to fix only direct `getJournalEntryById()` or one page mode.

Every rendered row that exposes mutation controls must be paired with the authority snapshot from the same query transaction, including:

- ungrouped pages;
- grouped pages;
- expanded URL groups;
- current/site/all contexts;
- id-targeted lookup used to reopen/refresh a card.

A view helper that cannot return a coherent authority token must not enable point mutation for that row.

## 7. View reload race after transaction completion

A writer may commit immediately after the readonly view transaction finishes. That is expected.

The rendered token then simply becomes stale. Worker-side CAS rejects the later action.

Correctness therefore does not depend on preventing writes while the UI is displayed; it depends on carrying the exact snapshot token and rechecking it at mutation time.

## 8. No DB schema bump required

This query change only adds the existing `meta` object store to readonly transaction scope.

It does not add a new object store or change `JOURNAL_DB_VERSION = 7` merely to capture authority.

The broader P2-019 shared schema-owner concern therefore remains untouched by this part of P0-076.

## 9. Deterministic model

Added:

`project_tools/test_p0_076_rendered_authority_snapshot_model.js`

The model proves:

1. split entry/meta reads can produce old entry bytes paired with new DB revision;
2. that mixed token would falsely authorize a stale legacy card;
3. same-transaction old snapshot carries D0 and becomes correctly stale after writer D1;
4. same-transaction new snapshot carries new entry + D1 coherently.

This is architecture evidence, not runtime PASS.

## 10. Implementation acceptance additions

P0-076 implementation tests must prove:

- every mutation-capable Journal view query includes `entries + meta` in one readonly transaction;
- rendered token is attached to the exact returned entry/view generation;
- Chrome Storage revision is not accepted as mutation CAS;
- mixed old-entry/new-meta schedule is a deterministic negative control;
- modern per-entry CAS remains unaffected by unrelated entry mutations;
- legacy fallback is conservative and upgrades to targeted authority after success.

## 11. Status

P0-076 remains **ACTIVE**. Runtime, `journal.js`, `service-worker.js`, DB version, manifest and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
