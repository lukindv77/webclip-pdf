# Audit delta — Journal rendered revision as mutation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `9f35a1db1bb1d44c3c0ee5b4762ce27585663d14`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof connects two already confirmed contracts that must be implemented together:

- **P1-206** — a rendered Journal view must have one coherent Journal revision receipt;
- **P0-076** — every per-entry/local/destructive mutation must require expected entry/Journal generation rather than retargeting by textual id.

Adjacent owners remain P1-210 for outer response loss, P1-198 for operation receipt, and P0-073/P0-074/P1-184 for exact Yandex object context.

The key result is that a background refresh notification is not a correctness fence. **The exact data revision the user saw when authorizing an action must be returned to the worker as mutation authority.**

## Current page refresh machinery is useful but asynchronous

Journal listens to `chrome.storage.onChanged` for `webclipJournalRevision` and schedules a reload when the token changes. Runtime notifications also schedule reloads.

This is valuable eventual UI convergence.

P1-206 already proves, however, that one render can combine different revisions and can even baseline a later revision as if it matched the screen. In addition, a storage/runtime notification can simply arrive after a user interacts with an already rendered card.

Therefore `onChanged` cannot be used as proof that the page is current at action time.

## Current mutation messages carry ids, not observed revisions

Examples from `journal.js`:

- local delete: `{ type:'WEBCLIP_JOURNAL_DELETE', id:entry.id, diskAction:'keep', operationId }`;
- Yandex Trash/delete: same id + diskAction + operationId;
- Mark Read: worker handler accepts only `id` + textual operationId;
- comment edit: `id + commentId + comment`;
- comment delete: `id + commentId`;
- comment add: `id + comment`.

No message carries:

- Journal revision rendered by this page;
- immutable entry generation/revision;
- expected comment revision/generation;
- exact remote-management generation shown to the user.

The worker then fresh-reads the current record by id.

## Fresh read is not authorization

For a read-only UI query, fresh-reading current data is desirable.

For a user-authorized mutation, fresh-reading a replacement object and silently applying an old user decision to it is unsafe.

### Deterministic stale-card destructive schedule

1. Journal page P renders entry J generation A and the user sees A's title/path/status.
2. Another Journal tab or import/replace commits Journal revision B. B contains a replacement entry with the same textual id J but different remote object/path/account or semantic state.
3. P has not yet completed its asynchronous reload, or P1-206 left an incoherent/stale card visible.
4. User clicks Trash on the visible A card and confirms that UI.
5. P sends only `id=J` and diskAction.
6. `deleteJournalEntry()` executes `getJournalEntryById(J)` and obtains **current B**.
7. Remote containment/account/object logic now operates on B.
8. The user's confirmation for A has been retargeted to B without another confirmation.

The worker's fresh read makes the mutation internally current, but it does not prove user authority for that current object.

This is the per-entry generation problem already owned by P0-076.

## Mark Read has the same authority problem

`WEBCLIP_JOURNAL_MARK_READ` dispatches only `id` and `operationId` into `moveReadLaterEntryToRead()`.

A stale page can therefore authorize a remote move based on A while the worker resolves J to a newer B. Page-local busy flags do not help across pages/import generations.

Per-entry remote mutation admission must compare the exact rendered/expected entry generation before any Yandex move side effect begins.

## Comments require finer-grained CAS

Comment edit/delete currently re-read the current entry, construct/normalize the comment array, then later call `updateJournalEntryRecord()` with a whole `journalComments` patch.

The existing concurrency delta already proves two writers can lose updates because the patch was computed before the final transaction.

The rendered-revision angle adds another deterministic case:

1. page P displays comment C revision A;
2. another page edits C to B;
3. P has not refreshed and submits an edit/delete intended for A;
4. worker identifies only `entryId + commentId` and acts on current C/B;
5. P's stale edit can overwrite B, or stale delete can tombstone B, without conflict indication.

Required comment authority is therefore `expected entry generation + expected comment generation/revision`, or an equivalent transactional CAS/merge model.

## Required P1-206 -> P0-076 handoff

A coherent render should expose/store an exact mutation receipt for every actionable entry. Conceptually it should bind:

- Journal database revision/generation;
- immutable entry generation/revision;
- entry id as display/lookup identity, not sole authority;
- remote-management generation/object receipt for Yandex entries where applicable;
- comment generation for individual edit/delete actions.

When the user clicks an action, the page sends the expected receipt it actually rendered.

Inside the same authoritative transaction that admits/commits local mutation, worker verifies the expected generation. For a remote side effect, this check occurs **before** external mutation admission and is backed by a durable per-entry operation lease/generation.

Mismatch means `stale/conflict`: refresh and ask the user again if necessary. It never means "fresh-read the replacement and apply the old decision to it".

## P1-206 remains a view contract, not a substitute for CAS

Even a perfect P1-206 implementation cannot guarantee no mutation occurs after rendering and before a click.

Therefore:

- P1-206 ensures the user saw one coherent accepted revision;
- P0-076 ensures later mutations prove that exact observed entry generation is still current.

Both are mandatory. Fixing only the render still leaves ordinary time-of-check/time-of-use mutation races.

## Notification/reload semantics

Storage/runtime change notifications remain useful for UX and should usually disable/reload stale cards promptly.

But they are advisory optimization:

- missing/delayed notification cannot grant mutation authority;
- a reload scheduled but not yet completed should invalidate existing action receipts where possible;
- a stale page can never bypass worker CAS by racing the refresh timer.

## Required deterministic regressions

1. Page P renders J/A -> import replaces J with J/B -> P clicks Trash before reload -> worker rejects stale A receipt; no remote mutation B occurs.
2. Same schedule for local-only Delete: replacement B is not deleted.
3. Same schedule for Mark Read: B is not moved.
4. Page A and page B concurrently mutate the same unchanged entry generation: one exact lease/CAS winner or deterministic merge; incompatible remote operations never both start.
5. Comment C/A rendered in P -> another tab edits C/B -> stale P edit returns conflict and cannot overwrite B silently.
6. Same for stale comment delete: newer B is not tombstoned using A's confirmation.
7. Two concurrent comment additions can merge transactionally or one retries/conflicts; no silent whole-array lost update.
8. P1-206 mixed-render detection does not baseline a revision that lacks valid action receipts for the published cards.
9. Storage/runtime change notification arriving late cannot let a stale action pass worker CAS.
10. Stable page/revision action succeeds normally without requiring an unnecessary reload.
11. Remote result physically settles after a later local generation conflict: retain exact recovery evidence; do not retarget/rollback blindly.
12. Clear/import advances Journal generation and invalidates every old entry/action receipt even when textual ids are reused.

## Duplicate check

No new item is created.

`AUDIT_DELTA_JOURNAL_CONCURRENCY_SETTLEMENT_2026-08-27.md` already extends P0-076 to cross-tab per-entry mutation fencing and transactional comment updates. `AUDIT_DELTA_JOURNAL_VIEW_REVISION_COHERENCE_2026-08-27.md` owns coherent screen revision P1-206.

This checkpoint defines the missing interface between them: **the revision/entry generation proven for the rendered UI is the expected-generation input to every later mutation.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.