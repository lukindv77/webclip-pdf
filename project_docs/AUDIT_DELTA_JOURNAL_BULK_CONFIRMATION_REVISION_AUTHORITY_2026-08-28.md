# Audit delta — Journal bulk confirmation must bind the observed revision — 2026-08-28

Source-of-truth `main` before this checkpoint includes `fd581a0b6ed2decf434ce671479878c0652f6ccc`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-010**, **P0-076** and **P1-206**. It is adjacent to P1-215 staging-lifetime ownership but is a different issue: even perfectly retained staging bytes do not prove that the Journal state the user agreed to destroy is still the current Journal state.

## Current file-import confirmation has no Journal revision receipt

Current `journal.js::importJournalFromSelectedFile()`:

1. starts only a page-local `journalDestructiveOperationInFlight` guard;
2. stages the selected backup;
3. requests `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
4. shows a 9-digit confirmation containing backup filename, entry count and export date;
5. after confirmation sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with `stagingKey`, `operationId`, `source`.

The request does not contain the current Journal revision that existed when the confirmation UI was shown.

Worker `runExclusiveJournalDestructiveMutation()` only rejects another bulk destructive mutation that is *currently running*. It does not prove that the dataset being replaced is the same generation the user observed before entering the confirmation code.

## Deterministic stale bulk-decision schedule

1. Journal page P1 displays Journal generation G1.
2. P1 chooses backup A and receives a valid preview.
3. P1 displays the destructive confirmation: the current local Journal will be fully replaced by A.
4. Before the user enters the 9-digit code, another Journal page P2 commits a new entry, comment, import or other Journal mutation, advancing the store to G2.
5. The storage/runtime notification for P1 is delayed, or a reload is scheduled but the confirmation modal remains the user's active decision surface.
6. User completes the confirmation that was presented while G1 was current.
7. P1 sends only `stagingKey + operationId + source`.
8. Worker acquires the bulk destructive guard and replaces **G2** with A.
9. Data created/changed in G2 is lost even though it was not part of the Journal state visible when the destructive decision was requested.

This is not prevented by the worker being fresh: a fresh replace faithfully destroys G2, but the user's authority was collected against G1.

## The same problem applies to Yandex restore

`importJournalFromYandex()` fetches/stages a selected remote backup, displays its path/count/export date and then calls the same `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` after confirmation.

A long user confirmation creates the same G1 -> G2 window. The exact remote backup may be perfectly identified while the *local destructive target generation* has changed.

Remote backup identity and local Journal revision are therefore two different receipts and both are required.

## Page-local busy state is not cross-tab authority

`journalDestructiveOperationInFlight` prevents the same Journal page from starting another destructive action while its confirmation/workflow is active.

It cannot stop:

- another Journal tab;
- a content save finishing and appending a new entry;
- recovery appending/finalizing an entry;
- another extension page or worker-owned mutation;
- an already admitted single-entry mutation settling later.

P0-076 already requires a store generation fence for these concurrency families. Bulk confirmation must consume that same generation model.

## Required confirmation receipt

When the destructive confirmation is created, capture an immutable receipt containing at least:

- exact Journal database revision/generation being offered for replacement;
- current entry count and other summary values shown to the user where useful;
- staging/import generation identifying backup A;
- operation id;
- source kind (`file` / `yandex`);
- for Yandex restore, exact selected remote backup receipt from its own identity contract.

The final replace request returns the **expected Journal revision**.

Inside the worker's authoritative destructive transaction/admission boundary:

1. compare expected G1 with current G;
2. if `G !== G1`, do not clear/replace anything;
3. return a typed stale/conflict result;
4. refresh the page/current Journal summary;
5. require a new user confirmation for the new target generation.

Do not silently update the expected revision behind the already-open confirmation modal.

## Relationship to P1-206 and rendered action receipts

P1-206/P0-076 already establish that per-entry actions must carry the exact revision/entry generation the user saw.

Bulk replacement is the dataset-level analogue:

- per-entry action: `expected Journal generation + expected entry generation`;
- full import/restore: `expected Journal generation + exact staged backup generation`.

The 9-digit code is evidence of user intent, not evidence that the target generation remained unchanged while the user was deciding.

## Staging lifetime is separate

P1-215 requires staged bytes to remain valid while an active confirmation is open.

Even after P1-215 is fixed, the following are still independent failures:

- staged A exists but target Journal changed G1 -> G2;
- target Journal stayed G1 but staged A expired/disappeared;
- Yandex selected backup object changed while local Journal stayed G1.

Each dimension needs its own receipt/lease.

## Required regressions

1. Preview A at G1 -> another tab appends entry producing G2 -> confirm A -> replace is rejected stale; G2 remains intact.
2. Preview A at G1 -> another tab edits/deletes/comments -> confirmation requires refresh/re-confirm, not silent G2 destruction.
3. Preview A at G1 -> recovery finalizes a pending append -> old confirmation cannot delete it.
4. Preview A at G1 -> no Journal mutation -> confirmation succeeds normally.
5. Yandex backup A selected at G1 -> local Journal changes -> final restore fails on local revision before destructive replace.
6. Staging remains pinned under P1-215 but Journal revision changes -> still reject; staging lifetime cannot substitute for target generation.
7. Storage/runtime notification arriving before confirmation completion invalidates/refreshes the confirmation UX, but worker CAS remains the authoritative fence if notification is delayed or lost.
8. A stale confirmation cannot be made valid merely by opening another page that happens to render G2; the exact user confirmation must be regenerated.
9. Bulk clear operations using the same 9-digit confirmation family should use the same target-revision contract where they can remain open across concurrent mutations.

## Duplicate check / numbering

No new item is created.

- **P0-010** owns destructive full-Journal import semantics and 9-digit confirmation.
- **P0-076** owns Journal mutation generation/CAS across bulk and single-entry concurrency.
- **P1-206** owns the coherent observed Journal revision used to build action authority.
- **P1-215** remains staging lifetime during active confirmation.

The previous rendered-revision delta primarily covered stale per-entry cards. This checkpoint adds the missing **dataset-level destructive confirmation** handoff.

## Test / release state

Docs-only audit checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real multi-tab unpacked-Chrome confirmation QA remains required. No build, tag or Release was created.
