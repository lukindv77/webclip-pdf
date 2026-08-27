# Audit delta — Journal clear/import generation invalidation vs external recovery evidence — 2026-08-27

Source-of-truth `main` immediately before this write: `f81f02c25455f02a862c4367095edc241188fb5b`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P0-076** — stale pre-clear/import work must not mutate replacement Journal state; exact Journal generation / entry revision fencing is required;
- **P0-039** — the sole local-download unknown-outcome recovery identity must not be destroyed on insufficient negative proof;
- **P1-184** — remote upload/object recovery must retain exact physical operation/content identity until outcome is proved;
- **P1-183/P1-090** where destructive Yandex moves are involved: irreversible remote effects require durable exact recovery receipts;
- **P0-079/P1-198** as adjacent operation/PDF-generation ownership primitives.

The missing invariant is separation of two authorities that current pending stores conflate:

1. **authority to append/finalize metadata into the current Journal generation**;
2. **durable identity of an already admitted external side effect that may settle after that Journal generation is replaced**.

Clear/import must revoke (1). They must not automatically erase (2).

## Existing positive control — stale append is intentionally blocked

Current `appendJournalEntryFromDurableCheckpoint()` requires the specified durable checkpoint to still exist when Journal append commits.

The local-download recovery audit already records this as a positive control: if clear/import intentionally removed the checkpoint, delayed old metadata is not resurrected into the new Journal.

That behavior is correct and must remain.

The fresh defect is what happens to the external side-effect recovery identity when the same checkpoint is physically removed to achieve that stale-append block.

## Fresh source proof

### 1. Full Journal clear physically clears external-operation checkpoints

The full clear transaction opens:

- Journal entries store;
- generic pending appends;
- `pendingDownloads`;
- `pendingRemoteSaves`;
- Journal meta/revision state.

For all-Journal clear (`!urlKey && !siteKey`) current code performs:

- `store.clear()`;
- `pendingStore.clear()`;
- `pendingDownloadStore.clear()`;
- `pendingRemoteStore.clear()`.

The Journal revision is touched in the same transaction, which correctly invalidates old Journal state.

But `pendingDownloads` and `pendingRemoteSaves` are not merely speculative Journal metadata. They can be the only durable receipt for Chrome Downloads / signed Yandex side effects already admitted before clear.

### 2. Domain/site clear also prunes matching external checkpoints

For scoped clear, the same transaction calls `prunePending(...)` over:

- pending Journal checkpoints;
- pending local-download checkpoints;
- pending Yandex checkpoints.

Thus a site/domain clear can remove recovery identity for an operation associated with the cleared URL/site while its external side effect remains physically in progress or has unknown settlement.

### 3. Import-replace unconditionally clears all pending external checkpoints

`commitStagedJournalImport()` performs the atomic replacement transaction and explicitly executes:

- `JOURNAL_PENDING_STORE.clear()`;
- `JOURNAL_PENDING_DOWNLOAD_STORE.clear()`;
- `JOURNAL_PENDING_REMOTE_STORE.clear()`;
- `touchJournalDbRevision(tx, 'import-replace')`;
- clear old Journal + copy staged entries.

The exact atomic replace of Journal entries is desirable.

However every pre-import local-download/Yandex-save checkpoint disappears regardless of whether its external operation:

- has not started;
- is in-flight;
- timed out locally with unknown settlement;
- physically settled but terminal event/response has not yet been processed;
- needs post-restart reconciliation.

### 4. Clear/import can race with operations because the bulk guard does not own save side effects

The existing bulk destructive guard serializes clear/import against each other, but ordinary PDF save/download/upload flows are separate long operations.

A legal schedule therefore exists:

1. save A writes durable local-download or remote-save checkpoint;
2. irreversible Chrome download / signed Yandex PUT is admitted;
3. before physical outcome is processed, user confirms Journal clear or import-replace;
4. bulk transaction removes A's pending checkpoint and advances/replaces Journal generation;
5. external side effect A completes later.

At step 4, WebClip has correctly decided that A must not append into the new Journal generation. It has **not** proved that A's physical side effect did not happen or no longer needs reconciliation.

### 5. Local download late completion becomes intentionally non-finalizable — but also non-recoverable

If the known DownloadItem later reaches `complete`, the append helper observes that the required checkpoint no longer exists and refuses to append old metadata. This prevents stale Journal resurrection.

But because clear/import deleted the same receipt, WebClip has also lost the durable mapping among:

- intended old Journal entry/generation;
- exact `downloadId` / unresolved start receipt;
- requested/resolved filename evidence;
- expected PDF generation/content receipt;
- operation identity and diagnostic state.

The physical file can therefore exist after clear/import without any retained authoritative receipt explaining that it was an old-generation operation intentionally detached from the Journal.

This is not fixed by saying "the user cleared the Journal": clearing metadata authority is not authoritative proof that a browser download did not physically happen.

### 6. Yandex upload has the stronger unknown-settlement consequence

For signed Yandex upload, current architecture deliberately creates `pendingRemoteSaves` before irreversible transfer because local timeout/worker restart is not remote cancellation.

Import/full clear can remove that checkpoint while the remote object is still in-flight or unknown.

A later physical upload may therefore leave an object on Yandex with no retained exact recovery generation by which WebClip can:

- prove whether it settled;
- prove exact object/content identity;
- distinguish it from a same-path/equal-size other object;
- record it as an intentionally detached old-Journal-generation side effect;
- safely clean/reconcile according to product policy.

The previously audited `remoteSaveGenerationId` problem makes this even more important, but the defect exists even after generation-aware remote rows are implemented if bulk replacement simply deletes every old generation.

### 7. "Checkpoint missing" currently conflates cancellation with evidence loss

`appendJournalEntryFromDurableCheckpoint()` treats missing required checkpoint as the reason not to finalize. That is appropriate for current-Journal authority.

But one missing bit now represents several materially different states:

- operation never admitted / intentionally cancelled before side effect;
- clear/import invalidated its Journal generation;
- checkpoint was lost/evicted/corrupted;
- maintenance erroneously removed unknown-outcome evidence;
- another concurrent generation deleted/replaced the row.

P1-194 already shows that recovery durability needs richer states than a boolean. This checkpoint adds a related lifecycle requirement: **generation invalidation must be represented explicitly, not by destroying the physical-operation receipt.**

## Required architecture

### Separate Journal commit capability from physical side-effect receipt

Every irreversible save/move operation should have an immutable physical receipt/generation that can outlive the Journal generation that originally requested it.

That physical receipt binds the exact external operation and content/object/download identity.

Separately, a Journal-finalization capability references:

- expected Journal database generation;
- expected entry id/revision where relevant;
- physical side-effect receipt.

Clear/import revokes or makes stale the Journal-finalization capability. It does not erase the physical receipt while the external outcome remains unresolved.

### Bulk replace transition

When clear/import commits a new Journal generation, old active/unknown external receipts should transition atomically to a bounded state such as:

- `detached-stale-journal-generation`;
- `external-outcome-pending` / `external-verified-detached`;
- dead-letter/manual-resolution as appropriate.

They become forbidden sources for automatic append into the replacement Journal, but remain available for exact reconciliation/diagnostics.

A compact generation tombstone/pointer is acceptable if it retains all identity needed to prove the external outcome; copying large payload metadata indefinitely is not required.

### Local download behavior

After clear/import invalidates old Journal authority:

- known DownloadItem completion may be reconciled to the detached receipt;
- no old Journal entry is recreated automatically;
- the system can truthfully record "old-generation download completed after Journal replacement";
- exact physical filename/content/operation evidence remains bounded until terminal outcome is known;
- unresolved history/search cases remain governed by P0-039/P0-048 rather than being silently erased.

### Yandex behavior

After Journal replacement:

- in-flight/unknown remote save generation remains namespace/content/attempt-bound;
- late remote settlement is reconciled exactly under P0-073/P0-074/P1-184;
- it cannot append into replacement Journal state without an explicit new product action/rebind contract;
- remote cleanup must not be guessed/blindly destructive solely because its originating Journal generation was cleared.

### Destructive move behavior

The same principle applies to durable delete/mark-read move receipts once P1-183/P1-090 are fully implemented: replacing Journal state may invalidate the local mutation target, but cannot erase the exact source/target remote-move receipt before outcome reconciliation.

### Bounded retention

This is not a request for an unbounded archive of old operations.

Use explicit global/per-class caps, phase-aware TTL/dead-letter policy and pressure handling. But retention expiry/eviction must preserve sufficient outcome identity or make loss explicit; it must not falsely convert unknown external settlement into "nothing happened".

## Clear semantics / user intent

The product may reasonably define Journal clear/import as "do not allow older operations to repopulate the replacement Journal." This checkpoint preserves that behavior.

It is a separate product decision whether an already-started external file/upload should be shown to the user as detached, offered for cleanup, or merely retained as diagnostic reconciliation evidence.

What is not safe is using deletion of the Journal checkpoint as if it also proved cancellation of an already admitted non-cancellable external side effect.

## Deterministic regression matrix

1. Local save checkpoint committed -> `downloads.download()` admitted -> full Journal clear -> DownloadItem completes: no old Journal append, but exact detached download receipt remains until terminal reconciliation.
2. Same with site/domain clear targeting that save's URL/site.
3. Local download start has unknown/late `downloadId` settlement -> import-replace occurs -> late start receipt cannot append into new Journal but remains diagnosable/reconcilable.
4. Yandex prepared remote checkpoint -> signed PUT admitted -> import-replace -> transfer settles late: old remote generation remains exact and cannot append into imported Journal.
5. Yandex PUT response lost -> clear all -> worker restart -> exact old remote object can still be reconciled as detached rather than becoming an orphan with no receipt.
6. Remote upload is proven not to have started: only then may its physical receipt be retired according to policy; clear itself is not that proof.
7. Clear/import happens before irreversible side-effect admission: generation fence prevents that old operation from starting the external side effect after its Journal authority was revoked.
8. Clear/import happens after side-effect admission but before completion: physical operation may settle, but final Journal capability is stale.
9. Imported backup contains the same entry id as old operation: late old completion never mutates/replaces that imported entry.
10. Two remote-save generations exist for one Journal id: bulk replace marks both old Journal capabilities stale without collapsing/deleting unresolved physical generations.
11. Storage pressure exercises detached-receipt cap: oldest safely terminal receipts may be pruned; genuinely unknown/in-flight receipt is not silently represented as no side effect.
12. OperationLog clear does not affect physical receipt authority; logs remain diagnostic only.
13. Browser restart between bulk replace and late external settlement preserves detached recovery evidence within the defined durability class.
14. Normal clear/import with no active/unknown external operations behaves as today and does not retain unnecessary large payloads.

## Duplicate check / numbering

No new number is created.

- **P0-076** remains the primary Journal-generation/finalization owner.
- **P0-039/P0-048** own local-download unknown-outcome identity and safe binding.
- **P1-184** owns exact remote object/content proof.
- **P1-183/P1-090** own durable exact destructive-move outcome receipts.
- **P0-079/P1-198** provide immutable physical operation/content ownership.

Existing remote-save-generation audit already requires clear/import to leave old external outcomes diagnosable while preventing stale append. This checkpoint extends that invariant explicitly across **all bulk clear/import checkpoint deletion paths, including local downloads**, and identifies the current physical `clear/prune` mechanism that violates it.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.