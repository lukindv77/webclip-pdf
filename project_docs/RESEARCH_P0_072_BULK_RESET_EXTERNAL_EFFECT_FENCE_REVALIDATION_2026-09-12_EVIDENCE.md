# WebClip — P0-072 bulk reset vs admitted external side effects — fresh revalidation — 2026-09-12

Date: 2026-09-12

Canonical source baseline: `633adac164f730f34bfa7ddab9b30262b4e1aafd`.

Research owner: **P0-072 ACTIVE** — bulk clear/replace cannot treat deletion of checkpoints as cancellation of already admitted non-cancellable external side effects.

Adjacent existing owners remain separate and unchanged, especially **P0-076 ACTIVE** for stale single-entry mutation against a replaced Journal generation, **P1-146 ACTIVE** for automatic local-download actual settlement, and **P1-090 ACTIVE** for exact destructive Yandex object reconciliation.

This tranche is research-only. It changes no production runtime, manifest, release-readiness declaration, product contract, owner status, build, tag, or Release.

## 1. Research question and termination envelope

Question:

> On current canonical source, can Journal clear/replace safely delete local/download/remote recovery state while an already admitted external effect may still settle later, or does that deletion merely destroy reconciliation authority?

Pipeline boundaries:

- B2 Admission / generation;
- B7 Persistence / Transfer;
- B8 Journal / Provenance;
- B9 Later Reading / Recovery.

Required evidence for this tranche:

- L1 exact-current-source proof for destructive reset, late finalization, and move checkpoint placement;
- L2 deterministic schedule covering positive, negative/boundary, URL-scoped, local-download, remote-upload, and destructive-move classes;
- current external API semantics sufficient to reject the hypothesis that deleting an IndexedDB checkpoint itself cancels a Chrome-owned effect.

This tranche does **not** claim L5 Chrome/Yandex settlement closure. P0-072 remains ACTIVE.

## 2. Duplicate/root-cause reconciliation

The consolidated historical family `RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` already contains `RESEARCH_DELTA_BULK_DESTRUCTIVE_FENCING_2026-08-27.md`, which described the same root class:

- `runExclusiveJournalDestructiveMutation()` serialized clear vs replace-import, not all entry/external side effects;
- clear/import removed pending append/download/remote recovery state;
- Delete→Trash and ReadLater→Upload remote mutations could overlap bulk destructive work;
- removing local state was not cancellation of the remote mutation.

Fresh current-source inspection below independently reproduces that mechanism on canonical `633adac...`. Therefore:

- no new P-code is warranted;
- P0-072 remains the single current root owner for reset-vs-external-effect checkpoint semantics;
- P0-076 remains the separate owner if a late old operation mutates/deletes a same-id replacement entry.

## 3. Current-source proof — the destructive guard is not a global side-effect fence

`service-worker.js` still has one process-local `journalDestructiveMutationInFlight` guard through `runExclusiveJournalDestructiveMutation()`.

Current message routing uses that guard for:

- `WEBCLIP_JOURNAL_CLEAR`;
- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`.

The following materially relevant operations are not admitted through that same global destructive guard:

- automatic download actual settlement/finalization;
- Yandex save upload/verification/recovery;
- `WEBCLIP_JOURNAL_DELETE` / Delete→Trash;
- `WEBCLIP_JOURNAL_MARK_READ` / ReadLater→Upload.

Therefore a clear/import transaction can race already admitted external effects even though clear and import are mutually exclusive with each other.

## 4. Current-source proof — clear deletes external-effect recovery checkpoints

`clearJournalEntries()` opens one readwrite transaction over:

- `entries`;
- `meta`;
- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

For `clear(all)` it executes:

- `store.clear()`;
- `pendingStore.clear()`;
- `pendingDownloadStore.clear()`;
- `pendingRemoteStore.clear()`.

For URL/site-scoped clear it scans all three pending stores and deletes a row when its captured `data.meta.url` / site matches the reset scope.

The current clear operation then reports `Очистка локального журнала завершена.` as success.

This is not merely UI hiding: the durable source rows used by later download/remote reconciliation are physically removed from IndexedDB.

## 5. Current-source proof — import replace deletes the same checkpoints

`commitStagedJournalImport()` performs the replacement in one IndexedDB readwrite transaction spanning:

- `entries`;
- `meta`;
- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`;
- `importStaging`.

After lease/revision authority is checked, `beginReplace()` executes before copying imported entries:

- `pendingAppends.clear()`;
- `pendingDownloads.clear()`;
- `pendingRemoteSaves.clear()`;
- Journal revision touch;
- `entries.clear()`;
- copy normalized imported entries.

Atomicity protects the old Journal from a half-applied import, but it does not make an already admitted browser/network side effect disappear.

## 6. Current-source proof — local download completion explicitly treats checkpoint deletion as reset cancellation

Automatic local download creates a durable intent in `pendingDownloads`, then invokes `chrome.downloads.download(...)`.

The current source itself distinguishes browser-owned actual settlement from local caller timeout by retaining `automaticDownloadStartSettlements` and reconciling the returned `downloadId` later.

When a download reaches `complete`, `finalizePendingLocalDownload()` calls `appendJournalEntryFromDurableCheckpoint()` with `pendingDownloads` as a required durable checkpoint.

If clear/import removed that row concurrently, current comments and status text say:

- the checkpoint was removed by concurrent clear/import;
- stale metadata is not resurrected;
- the local PDF may nevertheless have downloaded;
- the Journal entry is not added.

This is truthful degradation compared with stale resurrection, but it is still the P0-072 gap: **checkpoint deletion is being used as cancellation evidence even though the physical external effect may already exist**.

After the row is gone, normal pending-download recovery has no durable source from which to reconcile that operation after worker/browser interruption.

## 7. Current-source proof — remote save recovery has the same cancellation interpretation

`recoverPendingRemoteSaves()` reads durable rows from `pendingRemoteSaves`.

After remote verification, it calls `appendJournalEntryFromDurableCheckpoint()` with that exact remote checkpoint as a required source.

The current code explicitly classifies a missing source row as:

> `A concurrent clear/import deliberately removed the source checkpoint.`

and increments a `cancelled` count rather than recreating the old Journal metadata.

Again, avoiding stale Journal resurrection is correct, but removal of the only remote recovery receipt is not evidence that the upload/publication itself did not settle.

The post-upload path can already have an actual Yandex object and public/resource identity before Journal append is attempted. Deleting the recovery row therefore can leave a real external object without durable operation linkage.

## 8. Current-source proof — ReadLater→Upload recovery is co-located in a replaceable Journal entry

`moveReadLaterEntryToRead()` deliberately writes a checkpoint **before** the remote move:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

That is good crash-ordering locally, but the checkpoint lives on the Journal entry itself.

Then the function submits `POST /resources/move` and only after remote verification rewrites the Journal entry into `readingMode: 'read'` while clearing the checkpoint fields.

A bulk clear/import can remove/replace that entry while the remote request is in flight. After a worker restart, no independent side-effect receipt remains from which the old move can be reconciled without trusting replacement Journal state.

This observation remains P0-072. If a same-id replacement is later mutated by an old operation, that additional corruption is owned by P0-076 and is not reallocated here.

## 9. Delete→Trash is an even weaker checkpoint case

`deleteJournalEntry(..., diskAction: 'trash')` calls `moveJournalYandexFileToTrash()` before local `deleteJournalEntryRecordOnly(id)`.

The remote path:

1. locates the exact/current Yandex object as far as current identity data permits;
2. prepares Trash destination;
3. submits `/resources/move`;
4. verifies the target;
5. only then deletes the local Journal entry.

Unlike ReadLater→Upload, this path has no dedicated pre-request side-effect checkpoint outside the replaceable Journal entry.

Therefore a bulk clear/import concurrent with the remote move can remove the only durable local source context while the external mutation remains admitted/unknown. P1-090 still owns exact object proof after unknown destructive settlement; P0-072 owns the fact that reset must not erase the operation's reconciliation authority.

## 10. External semantic control — Chrome download cancellation is a separate operation

Current Chrome Extensions documentation, checked 2026-09-12:

- `chrome.downloads.download(options)` initiates a download and resolves with the new `DownloadItem` id when start succeeds;
- `chrome.downloads.cancel(downloadId)` is a distinct method requiring that `downloadId`.

Source:

- <https://developer.chrome.com/docs/extensions/reference/api/downloads>

Therefore clearing WebClip's IndexedDB `pendingDownloads` row does not call Chrome cancellation and cannot itself prove that no physical download will complete.

This external control supports the current source's own P1-146/non-cancellable-late-settlement design rather than introducing a new requirement.

## 11. External semantic control — aborting fetch is caller-side request cancellation, not a durable remote rollback receipt

Current WebClip `yandexApi()` uses `AbortController` for bounded request lifetime.

MDN documents that `AbortController.abort()` aborts the associated fetch/response consumption and causes the fetch promise to reject. It does not define a transactional rollback receipt for a remote service that may already have admitted a mutation.

Source checked 2026-09-12:

- <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>
- <https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort>

Inference used by this tranche: a caller-side `AbortError` is not sufficient durable evidence that an already transmitted remote move/upload had no server-side effect. The project must reconcile actual remote state under the existing Yandex owners.

## 12. Deterministic model

Added model:

`project_tools/test_p0_072_bulk_reset_external_effect_fence_model.js`

Local environment:

- Node `v22.16.0`;
- `node --check` — PASS;
- execution — **PASS 42 checks**;
- local SHA-256 before delivery: `f82a636e4c7e448c15fb1f62c99a4466c4ad9677a76f0a24b785ad76c392dd41`.

The model intentionally distinguishes current behavior from a candidate acceptance contract. It does not pretend to exercise real Chrome/Yandex L5.

### Current-shaped negative controls

The model proves:

1. `clear(all)` deletes an admitted local-download checkpoint while the browser-owned effect remains in progress;
2. late physical local completion can succeed while Journal append is cancelled for missing checkpoint;
3. the operation then has no pending-download recovery row;
4. URL-scoped clear prunes only matching rows, proving the gap is not an artifact of all-clear;
5. import-replace deletes an admitted remote-save checkpoint while remote work remains in progress;
6. remote object settlement can succeed with no Journal linkage after the checkpoint is gone;
7. ReadLater→Upload checkpoint is lost when its source Journal generation is replaced;
8. the external move can still settle while no independent durable recovery receipt survives.

### Candidate positive/boundary controls

The model also tests a bounded preferred contract:

- `prepared` work for which no external call was admitted may be explicitly cancelled by reset;
- `admitted-unknown` / nonterminal external effects survive reset in an independent durable side-effect ledger;
- reset marks those receipts as superseded by the Journal reset rather than deleting them;
- later settlement writes terminal outcome to the receipt;
- an old-generation settlement cannot recreate or mutate replacement Journal rows;
- URL-scoped reset preserves matching admitted receipts while still removing matching Journal presentation;
- destructive move receipt is bound to operation id and source Journal generation;
- same-id replacement remains unchanged when the old move settles;
- old and new operation receipts cannot consume each other across reset generations.

## 13. Stronger current invariant

Fresh revalidation supports this P0-072 invariant:

> Journal reset may discard only work proven to be pre-admission or explicitly terminal/cancelled. Once an external side effect is admitted, unknown, or potentially already settled, its reconciliation receipt must survive independently of the replaceable Journal generation until a terminal actual outcome is durably known.

Corollaries:

1. deleting a checkpoint is a storage mutation, not external cancellation evidence;
2. `entries`, `pendingDownloads`, and `pendingRemoteSaves` cannot all share identical reset semantics after external admission;
3. entry-co-located destructive move checkpoints are insufficient when the Journal entry itself is replaceable;
4. recovery state must carry exact operation identity and source Journal generation;
5. old-generation settlement must be reconciled as historical/superseded side-effect truth, not authorized to mutate a new Journal generation;
6. explicit cancellation must be based on an actual external cancellation/terminal result, not inferred from local reset.

## 14. Preferred research direction, not accepted architecture

A practical candidate is a bounded **external side-effect ledger/quarantine** outside the replaceable Journal entry set.

Each admitted operation would carry at least:

- operation id;
- effect kind (`local-download`, `yandex-upload`, `read-move`, `trash-move`, future publish/unpublish);
- source Journal generation and, where applicable, source entry revision/id;
- immutable account/root/config/publication generation for Yandex effects;
- exact external identity available at admission/settlement;
- phase (`prepared`, `admitted-unknown`, `settled-success`, `settled-failure`, `cancelled-confirmed`);
- reset/supersession metadata;
- bounded retention/manual-resolution state.

Bulk clear/import would:

- cancel/drop only `prepared` work for which no external effect was admitted;
- preserve or migrate every admitted/nonterminal receipt;
- replace Journal entries independently;
- prevent old receipts from mutating the new Journal generation;
- expose unresolved external effects truthfully until reconciliation.

This is a research direction, not an implementation decision. Existing family-specific owners may require a different concrete representation.

## 15. Alternatives rejected or bounded

### A. "The destructive mutex is enough"

Rejected. It only serializes clear vs import; relevant external operations remain outside it.

### B. "Clear/import intentionally means cancel everything"

Rejected after external admission. Current Chrome API requires a separate cancel call, and remote HTTP mutation outcome may already be unknown/committed. User intent to reset local Journal state is not proof of external cancellation.

### C. "Keep old Journal entries until all effects settle"

Not selected as the preferred research contract. It couples local replace/clear usability to potentially long user/network external settlement and can make import impossible to complete. An independent ledger preserves truth without forcing stale Journal presentation to survive.

### D. "OperationLog is enough"

Insufficient as currently used. The recovery/finalization paths are driven by dedicated checkpoint stores / Journal checkpoint fields, not by replaying OperationLog as authoritative side-effect state. Diagnostic history is not equivalent to exact recovery authority.

### E. "Just keep `pendingDownloads`/`pendingRemoteSaves` through import"

Partial only. It helps save/download classes but does not cover entry-co-located destructive moves, future publish/unpublish, or the requirement that an old-generation settlement must not append into a replacement Journal. A common phase/generation invariant is still required.

## 16. Owner/status conclusion

Fresh current-source result:

**P0-072 remains ACTIVE and ROOT-CAUSE-REVALIDATED.**

No new P-code is allocated.

The evidence sharpens implementation acceptance but does not close adjacent owners:

- P0-076 — late single-entry stale mutation / same-id replacement CAS;
- P1-146 — exact automatic-download start/late settlement/restart;
- P1-090 — exact destructive Yandex object settlement;
- P0-073/P0-074/P0-078/P1-184 — remote context/object/publication identity where applicable;
- P0-069/P1-164 — public-link destructive lifecycle where applicable.

## 17. Closure evidence still required

P0-072 must not be marked DONE from this tranche.

A future implementation closure needs at minimum:

1. deterministic exact-source regression for all reset classes above;
2. restart/crash recovery proving admitted effects remain durably reconcilable after Journal reset;
3. real Chrome proof for automatic download admission/reset/late terminal settlement;
4. authorized isolated Yandex proof for upload and destructive move unknown/late settlement;
5. same-id replacement negative control proving old settlement cannot mutate/delete the replacement;
6. bounded retention/manual-resolution behavior for permanently unknown effects;
7. exact-head Repository Integrity plus post-merge CI.

Real external evidence remains L5 and must not be simulated as PASS.

## 18. Release interpretation

This tranche does not change release readiness.

The project remains **NOT READY** until the separately maintained release gate requirements are satisfied. No build, tag, deployment, or Release is authorized by this research.
