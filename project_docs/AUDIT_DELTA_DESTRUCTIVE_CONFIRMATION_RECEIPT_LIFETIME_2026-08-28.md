# Audit delta — destructive confirmation receipt lifetime — 2026-08-28

Source-of-truth `main` immediately before this write: `62d407f9cdbe314ea8a90de0f5812d1228a8557d`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P0-076** (exact Journal/entry generation for delayed destructive mutation), with **P1-206** as the rendered-view dependency and **P1-198/P1-210** as operation/result dependencies.

The existing rendered-revision audit already proves a stale card can authorize a mutation against a newer record with the same textual id. This pass isolates a stronger and independently testable capability boundary: **the destructive confirmation dialog itself has a lifetime and currently remains valid after the Journal generation it described has changed.**

No new root cause is needed.

## Current confirmation owner is an object reference, not an authoritative generation receipt

`journal.js::openDeleteDialog(entry)` stores:

- `pendingDeleteEntry = entry`;
- resets `activeDeleteOperationId`;
- renders the destructive dialog from the entry the user saw.

This is a useful UI snapshot, but it is not a mutation receipt. The entry object has no authoritative expected Journal/entry generation that the worker will compare transactionally.

The same page also keeps `pendingMoveReadEntry` for the Mark Read confirmation/progress workflow.

## Journal revision changes do not revoke an already open confirmation

The page listens to `chrome.storage.onChanged` for `webclipJournalRevision` and calls `scheduleJournalReload(...)` when the token changes.

That is eventual screen convergence only. The revision listener does not invalidate:

- `pendingDeleteEntry`;
- `pendingMoveReadEntry`;
- an already visible delete confirmation;
- an already accepted Mark Read confirmation generation.

Therefore an old destructive control surface can remain actionable while a reload is pending or after the underlying Journal state has already changed elsewhere.

## Proceed sends only textual entry id

For a Yandex delete/trash operation, the page eventually sends:

`WEBCLIP_JOURNAL_DELETE { id: entry.id, diskAction, operationId }`.

For local-only deletion it likewise sends only `id`, `diskAction:'keep'` and `operationId` after ordinary confirmation.

Mark Read is similarly id-addressed.

The worker then resolves the current entry by id. A fresh current read is internally consistent but does not prove the user confirmed that current generation.

## Deterministic confirmation-lifetime race

1. Page P renders Journal entry `J/A` and the user opens the Yandex Delete dialog.
2. `pendingDeleteEntry` now describes A; the dialog text/choice is the user-visible authorization surface for A.
3. Before the user presses Proceed, another Journal page or replace-import commits generation B, reusing textual id `J` for a different entry/object.
4. `webclipJournalRevision` changes and P schedules an asynchronous reload, but the existing dialog is not revoked as a mutation capability.
5. User presses Proceed in the still-visible A dialog.
6. P sends only `id=J`.
7. Worker fresh-reads current `J/B` and may perform local deletion or Yandex locate/move against B.
8. The user's explicit destructive confirmation for A has been retargeted to B.

This schedule remains valid even if normal card rendering becomes perfectly coherent under P1-206, because the Journal may change **after** the confirmation is opened.

## Why page reload alone is not a fix

Closing/re-rendering the dialog promptly on a revision notification is desirable UX, but notification delivery is advisory and asynchronous. Correctness cannot depend on the page receiving a storage event before the click.

The worker must reject stale authority even when:

- the storage event is delayed;
- the page is busy;
- the dialog click races the reload timer;
- two extension pages act concurrently;
- replace-import reuses the same textual entry id.

## Required P0-076 refinement

### Confirmation receipt

When a destructive confirmation surface is opened, bind it to the exact actionable generation the user is seeing. At minimum the receipt should contain or reference:

- Journal revision/generation;
- immutable entry generation/revision;
- entry id as lookup/display identity only;
- exact remote-object binding generation for Yandex entries when applicable;
- operation kind (`delete-local`, `trash`, `mark-read`, etc.);
- page/UI confirmation generation or nonce.

### Worker-side admission

Proceed must return the exact confirmation/entry receipt. Before **any** external Yandex mutation or local destructive commit, the authoritative transaction verifies that the expected entry generation still matches.

Mismatch is a stale/conflict outcome:

- no Yandex move/delete/publish side effect starts;
- no replacement local entry is deleted;
- page refreshes and requires a new explicit confirmation for the new generation.

### UI invalidation

On observed Journal revision change, the page should invalidate existing confirmation capabilities immediately where possible:

- disable/close Delete/Mark Read confirmation;
- clear `pendingDeleteEntry` / `pendingMoveReadEntry` or mark their receipt stale;
- never silently relabel an open confirmation onto freshly loaded data.

This is defense in depth. Worker CAS remains authoritative.

### In-flight operation boundary

Once an external destructive operation has been admitted under a valid receipt, a later Journal change cannot pretend the external side effect never happened. Preserve the exact operation/remote recovery receipt and reconcile it without retargeting to the replacement entry. This composes with P1-090/P1-183/P1-184 and P1-210.

## Positive controls to preserve

- `journalDeleteBusy` and `journalDestructiveOperationInFlight` reduce same-page duplicate actions.
- Storage/runtime revision notifications trigger eventual reload.
- Worker fresh-reads current records instead of trusting arbitrary full entry payloads from the page.

These are useful, but none substitutes for expected-generation authorization.

## Required regressions

1. Open Delete dialog for `J/A` -> replace-import commits `J/B` -> click Proceed before reload -> worker rejects stale A receipt; B is untouched.
2. Same race after the page receives the revision event but before its reload finishes -> old dialog is disabled/revoked and worker still rejects if click races UI invalidation.
3. Same race for local-only Delete -> replacement B is not removed.
4. Same race for Mark Read -> replacement B is not moved on Yandex Disk.
5. Same textual id reused with a different `resourceId/remotePath/accountUid` -> old confirmation never authorizes the new remote binding.
6. Revision changes but the exact entry generation is provably unchanged according to the chosen model -> product may require refresh conservatively or permit a narrowly proven unchanged receipt, but must never infer this from id alone.
7. Two pages open confirmations for the same generation; first destructive action commits/advances entry generation -> second confirmation becomes stale before another side effect begins.
8. External mutation is admitted validly, then local Journal is replaced before result -> exact recovery evidence survives and late result cannot mutate the replacement entry by textual id.
9. Normal unchanged-generation Delete/Trash/Mark Read continues to work with one confirmation.
10. P1-206 coherent rendering remains required; a confirmation receipt cannot retroactively make an incoherent screen trustworthy.

## Duplicate check

- **P0-076** owns exact Journal/entry generation and stale destructive finalization/admission.
- **P1-206** owns coherent rendered revision.
- **P1-198** owns worker-issued operation identity, not entry-state authorization.
- **P1-210** owns unknown outer result reconciliation after admission.
- **P0-073/P0-074/P1-184** own Yandex namespace/object identity and do not replace the local user-confirmation generation.

No P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
