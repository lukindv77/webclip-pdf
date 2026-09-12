# WebClip — P0-076 single-entry revision + Journal-generation CAS — fresh revalidation — 2026-09-12

Date: 2026-09-12

Canonical source baseline: `903deb9e02aa536e94ab3c13864e1412bb35ddba`.

Research classification: **SOURCE-REVALIDATED + DETERMINISTIC-COVERED / FINDING**.

Owner outcome: **P0-076 remains ACTIVE / ROOT-CAUSE-REVALIDATED**.

This is a research-only checkpoint. It does not change production runtime, `manifest.json`, workflow, release-readiness state, build output, tag, or Release.

## Scope

Fresh exact-source revalidation of the canonical P0-076 owner:

> Journal single-entry mutations require per-entry revision + Journal-generation CAS against clear/replace/import; late stale writes cannot mutate replacement records.

The tranche asks four bounded questions:

1. Can a delayed old single-entry operation still write/delete whichever row currently occupies the same textual id?
2. Does import-replace naturally create a same-id replacement schedule that makes this destructive rather than merely stale?
3. Does current Mark Read admit a second same-entry operation without an expected row generation?
4. What is the minimum precise local CAS contract, without collapsing P0-072 external-effect durability or P1-090 physical-object identity into P0-076?

## Canonical owner / duplicate reconciliation

`project_docs/RESEARCH_REGISTRY.md` on the exact baseline keeps P0-076 `ACTIVE`:

> `P0-076 | ACTIVE | Journal single-entry mutations require per-entry revision + Journal-generation CAS against clear/replace/import; late stale writes cannot mutate replacement records.`

No new P-code is allocated.

Adjacent owners stay distinct:

- **P0-072** — bulk reset cannot treat deletion of checkpoints as cancellation of already admitted non-cancellable external effects;
- **P1-090** — destructive Yandex move/reconciliation must prove the same exact physical remote object after unknown settlement;
- **P0-074** — one immutable auth/account/root/config/publication context across a long Yandex operation.

The consolidated historical Yandex destructive-lifecycle evidence contains the retired `RESEARCH_DELTA_BULK_DESTRUCTIVE_FENCING_2026-08-27.md` and already described the same root under P0-076: stale `updateJournalEntryRecord()` / `deleteJournalEntryRecordOnly()` can retarget an old operation onto a same-id replacement row. It also contains the later concurrent Read Move race in which a late error patch can resurrect pending state after a newer success.

Historical material is used only for duplicate/provenance reconciliation. Every current-source claim below was independently rechecked on baseline `903deb9e...`.

## Current-source proof 1 — the generic update helper has no expected revision/generation

Current `service-worker.js`:

```js
async function updateJournalEntryRecord(id, patch = {}) {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Обновление записи журнала',
      ({ tx, setResult, fail }) => {
        const store = tx.objectStore(JOURNAL_STORE);
        const req = store.get(id);
        req.onsuccess = () => {
          try {
            const current = req.result;
            if (!current) { setResult(null); return; }
            const updated = { ...current, ...patch, id: current.id };
            store.put(updated);
            touchJournalDbRevision(tx, 'update-entry');
            setResult(updated);
          } catch (e) { fail(e); }
        };
        ...
      }
    );
  } finally { db.close(); }
}
```

The transaction fresh-reads by textual `id`, but the caller supplies no:

- expected entry revision;
- expected Journal/reset generation;
- operation mutation generation.

That fresh read is useful for preserving fields not present in `patch`, but it is not an authority check. A stale patch is deliberately merged into the newest row occupying that id.

A search of current `service-worker.js` finds no `entryRevision` field/contract.

## Current-source proof 2 — delete is also blind by id

`deleteJournalEntryRecordOnly(id)` first reads the entry outside the final deletion transaction for stats work, then its final write transaction performs:

```js
tx.objectStore(JOURNAL_STORE).delete(id);
touchJournalDbRevision(tx, 'delete-entry');
```

There is no expected row generation or expected reset generation in that final commit.

For Delete→Trash, the remote move happens before this local deletion. A delayed external phase therefore creates a large window in which replace-import can install a different row with the same id before the blind local delete runs.

## Current-source proof 3 — import-replace can preserve the same textual id

`commitStagedJournalImport()` opens one readwrite transaction containing the Journal, meta, pending stores and import staging. Its replacement phase:

1. clears pending stores;
2. touches Journal DB revision;
3. clears `JOURNAL_STORE`;
4. iterates staged entries;
5. writes each imported entry with `journalStore.put(entry)`.

Imported backup entries therefore retain their serialized ids. There is no rule requiring a replacement row to receive a new textual id.

So the P0-076 harmful schedule is not hypothetical key reuse invented by the model: import-replace naturally permits backup B to occupy the exact id formerly held by A.

## Exact race A — late Delete→Trash deletes replacement B

Schedule on current semantics:

1. Journal contains old A at id `X`, remote object `RID-A`.
2. Delete→Trash reads A and begins its remote move.
3. Before the remote call settles, import-replace commits backup entry B at the same id `X`, bound to `RID-B`.
4. A's remote move settles successfully.
5. A calls `deleteJournalEntryRecordOnly(X)`.
6. The final transaction deletes whatever row currently has key `X`.
7. B is deleted.

The operation authorized against A therefore destroys replacement B.

This is P0-076 local mutation authority corruption. P1-090 remains responsible for proving/reconciling what happened to the physical Yandex object A.

## Exact race B — late Mark Read hybridizes replacement B

Schedule:

1. old A at id `X` has `readingMode='later'`, `remotePath=A`, `resourceId=RID-A`;
2. Mark Read reads A, chooses/recordss a target and performs the remote move;
3. import-replace commits B at id `X`, with B's URL/title/path/resource identity;
4. A verifies its remote move;
5. A's final `updateJournalEntryRecord(X, oldPatch)` fresh-reads B;
6. spread merge preserves B fields absent from the patch but overwrites B's fields present in A's patch.

The resulting hybrid can have:

- B title/URL/hostname;
- `readingMode='read'` from old A;
- A's moved `remotePath`;
- A's `resourceId` / `publicUrl`;
- A's `movedToReadAt`.

This can bind replacement Journal metadata to the wrong physical object.

## Exact race C — two Mark Read operations can resurrect stale pending state

Current runtime handler dispatches:

```js
case 'WEBCLIP_JOURNAL_MARK_READ':
  return moveReadLaterEntryToRead(String(message.id || ''), String(message.operationId || ''));
```

Unlike clear/import-replace, this is not wrapped by `runExclusiveJournalDestructiveMutation()`. There is also no expected entry revision received from the page.

Two Journal pages can therefore start from the same rendered old row.

Concrete schedule:

1. A and B both read E as `readingMode='later'`.
2. A writes its `readMovePending*` checkpoint using `updateJournalEntryRecord()`.
3. B writes a second checkpoint from the same old row authority, replacing row-level pending projection.
4. A's physical move succeeds.
5. A finalizes `readingMode='read'` and clears pending fields.
6. B later fails because the source already moved or its target no longer applies.
7. B catch-handler writes `readMovePendingAt`, `readMoveTargetPath`, `readMoveOperationId`, `readMoveLastError` through the same blind helper.
8. Helper fresh-reads A's successful row and merges B's stale pending/error projection into it.

The final row can simultaneously claim:

- `readingMode='read'` / successful A move;
- nonzero pending move state;
- B operation id;
- B error.

Fresh-read/spread therefore prevents some whole-record overwrites but actively retargets stale field authority onto the newer row.

## Exact race D — comment arrays are last-writer stale projections

Comment add/edit/delete paths:

1. read a Journal row;
2. normalize/copy `journalComments`;
3. compute a complete replacement comments array outside the final update transaction;
4. pass that array to `updateJournalEntryRecord()`.

Two pages can read the same initial comments array. If both write, the later stale full-array patch silently loses the other page's accepted mutation.

This is not solved by the helper's fresh `get(id)`, because `journalComments` itself is in the stale patch and therefore replaces the current array.

## Control — clear without replacement does not resurrect a missing row

If clear removes A and no row with id `X` exists when a stale update finally runs, current `updateJournalEntryRecord()` returns `null` rather than creating A from scratch.

Likewise an old textual id cannot delete a replacement stored under a different id.

Therefore the severe replacement-corruption claim is intentionally narrower than "all clear races resurrect data": it needs a current row at the same id, which import-replace naturally permits.

## Current Journal DB revision is not a precise reset-generation substitute

`touchJournalDbRevision(tx, reason)` writes a new random/timestamp revision value.

Current callers include at least:

- append;
- ordinary `updateJournalEntryRecord`;
- delete-entry;
- scoped/full clear;
- import-replace.

So `JOURNAL_META_REVISION_KEY` is an **all-mutations revision**, not a dedicated reset generation.

Using it unchanged as the long-operation generation fence would reject A after an unrelated point update to entry C. That is safe against corruption, but unnecessarily couples unrelated entries and degrades liveness.

The minimum precise acceptance model separates:

1. **Journal/reset generation** — advances on authority-replacing bulk transitions such as clear/import-replace;
2. **per-entry revision** — advances on every mutation of that exact entry.

A finer scoped-reset generation scheme could preserve still more unrelated work, but is an optimization. A conservative global reset generation is sufficient for safety if scoped clear intentionally invalidates all pre-clear delayed local tokens.

## External platform basis — IndexedDB supports atomic conditional commit

This is implementation feasibility evidence, not proof of the WebClip bug.

W3C IndexedDB 3.0 Editor's Draft, transaction section:

- transactions are atomic sets of data access/mutation operations;
- readwrite transactions with overlapping scope are scheduled so another overlapping transaction cannot modify the same stores in the middle;
- when committing, changes made by requests in the transaction are atomically written;
- a later overlapping transaction sees changes committed by the earlier one.

Source:

- https://w3c.github.io/IndexedDB/

Current MDN `IDBTransaction` documentation likewise describes IndexedDB reads/writes as transaction-scoped and explains readwrite transaction ordering and commit/abort semantics:

- https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

Therefore the required comparison can be made inside the same readwrite transaction that performs the final update/delete; no cross-transaction check-then-write window is required.

## Candidate acceptance contract

This section is research acceptance direction, not an accepted implementation design.

### Token captured at operation admission

Any mutation whose final local commit can be delayed should bind at least:

```text
entryId
journalResetGeneration
entryRevision
operationGeneration / operation receipt
```

For remote/destructive flows, compose with the separate immutable Yandex operation context and exact physical-object receipt required by adjacent owners.

### Atomic final commit

Inside one readwrite transaction containing the entry store and generation authority:

1. read current Journal/reset generation;
2. read current row by `entryId`;
3. compare expected reset generation;
4. compare expected entry revision;
5. if either differs, return stale/conflict without update/delete;
6. otherwise perform the patch/delete;
7. for patch, advance the per-entry revision atomically.

An old token must never acquire authority merely because the new row reuses the same textual id.

### Imported replacement

Import-replace must establish a new reset generation at the same atomic replacement boundary.

A replacement row may retain its serialized textual id, but old tokens from the prior generation must fail even when all visible fields happen to be identical.

### Ordinary concurrent point edits

Same-entry concurrent mutation from the same old `entryRevision`:

- exactly one writer may commit first;
- later writer receives explicit stale/conflict;
- caller may deliberately reread/rebase/retry when semantics allow it.

There must be no silent stale full-array overwrite.

### Unrelated entry edit

Point mutation of C should advance C's entry revision without advancing the dedicated reset generation.

A delayed operation on unchanged A can therefore remain valid.

This is the main reason not to equate the current all-mutations `JOURNAL_META_REVISION_KEY` with the new reset-generation concept without changing its semantics.

### External outcome after local CAS loss

A stale local finalizer may correspond to a physical side effect that already occurred.

P0-076 requires it to lose authority over the replacement Journal row.

It must **not** imply that the physical effect was cancelled. The external outcome/receipt must remain reconciliable under P0-072 / P1-090 without granting stale Journal mutation authority back to the old operation.

## Deterministic model

Added model:

`project_tools/test_p0_076_single_entry_generation_cas_model.js`

Local environment:

- Node: `v22.16.0`;
- `node --check`: PASS;
- execution: **PASS 66 checks**.

The model covers:

- current late Delete→Trash removing same-id replacement B;
- candidate delete CAS rejection after reset generation changes;
- current late Mark Read hybridizing replacement B;
- candidate Mark Read final CAS rejection;
- two-current-Mark-Read late-error pending-state resurrection;
- candidate per-entry revision allowing one checkpoint and rejecting the competitor;
- current stale complete comment-array lost update;
- deliberate reread/retry preserving both comments under CAS;
- clear-without-replacement non-resurrection control;
- different-id replacement control;
- proof that current DB revision changes on unrelated point mutation;
- dedicated reset-generation stability across unrelated C update;
- exact-current token positive success;
- consumed-token second-write rejection;
- conservative scoped reset invalidation;
- composition with a P0-072 detached external receipt;
- same-id, identical-looking import replacement still invalidating old token;
- generic stale bookmark-field retargeting control.

Local model SHA-256:

`a62776f9fd57d749efbab4dd55481acf5871923fddc60fac70f020525dceee5a`

Local Git blob:

`54520e51689fb9d9d126215ba448c4aace0ef59f`

## Required implementation regressions for eventual P0-076 closure

1. Delete A remote move in flight + import B same id -> B is not deleted when A settles.
2. Mark Read A in flight + import B same id -> B receives none of A's read/path/resource/publication patch.
3. Two pages authorize Mark Read from one entry revision -> only one incompatible entry mutation/move generation is admitted; late loser error cannot mutate winner row.
4. Comment edit/add from two pages -> stale complete-array writer is rejected or explicitly rebased; no silent lost update.
5. Generic delayed point patch from old entry revision -> stale conflict, not merge onto newer same-id row.
6. Clear without replacement -> old finalizer remains non-resurrecting.
7. Import replacement with identical textual id and even identical visible fields -> old generation is still invalid.
8. Unrelated point edit C does not unnecessarily revoke a delayed unchanged-A token.
9. Scoped/full reset establishes the documented reset-generation policy atomically with its Journal authority transition.
10. External physical outcome that already occurred remains diagnosable/reconciliable after local CAS rejection, without old operation gaining authority over replacement Journal state.
11. CAS comparison + final local write/delete occur in one IndexedDB readwrite transaction.
12. Worker restart does not erase the authority values needed by any operation whose local finalization can resume later.

## Classification and next action

Fresh current source independently reproduces the P0-076 root cause and the later concurrent-Mark-Read refinement. The owner is therefore not a historical-only concern.

**P0-076 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

No new P-code is required.

This research does not claim implementation closure, Chrome/Yandex L5 closure, critical-closure completion, or release readiness.

Risk-ranked implementation direction after this tranche:

- introduce durable/transactional entry revision + reset-generation authority;
- make every delayed single-entry final local transition CAS-bound;
- keep external physical receipts separate from replaceable Journal row authority;
- add exact races above to deterministic/runtime regression suites before changing P0-076 status.

## Release / product impact

None in this tranche.

- production runtime unchanged;
- `manifest.json` unchanged;
- release-readiness remains `NOT READY`;
- no build artifact;
- no tag;
- no GitHub Release;
- no user-facing product requirement added.
