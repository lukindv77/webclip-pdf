# Audit delta — staged import preview/revalidation boundary — 2026-08-28

Source-of-truth `main` immediately before this write: `c553eadad2ef5e1814ee3d5bc5316c2b7cefa670`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh audit confirms an important positive control in the Journal replace-import path and narrows the remaining defect to existing **P1-035** staging lifetime plus **P0-076/P1-030** destructive generation/atomic replace semantics.

The preview is **not** the only parser/validation authority. Confirmed replace re-reads and normalizes the same staged key before destructive commit.

## Fresh source proof

### 1. Preview is a bounded read/validation pass

`WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED` calls `previewStagedJournalImport(stagingKey, operationId, source)`.

That path validates the staging key and calls `inspectStagedJournalImportStream(key)`, which streams/parses the staged source under size/schema/deadline limits. It records an `await-confirmation` diagnostic containing entry count but does not mutate the Journal.

### 2. Replace does not blindly trust the earlier preview

`WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` enters `runExclusiveJournalDestructiveMutation(...)` and calls `importJournalReplaceStaged(...)`.

The replace flow performs a **fresh** `normalizeStagedJournalImportStream(key)` before applying the destructive Journal replacement.

Thus the current architecture does not simply accept “preview was valid two hours ago” as proof that current staged bytes are valid now.

### 3. Normalization creates its own fresh random internal generation

`normalizeStagedJournalImportStream()` creates a new `importId` using `makeJournalImportStageId()`, whose normal path uses `crypto.randomUUID()`.

Normalized entry staging is therefore a distinct per-replace generation rather than a predictable global shared slot.

This is a useful isolation property and should remain.

### 4. Stream reader checks manifest/body consistency

For current `journal-import-manifest` staging, `streamStagedJournalImportText()` reads declared chunk count/byte count under hard limits and verifies actual streamed byte count equals the manifest declaration.

Missing/corrupt staging is rejected rather than silently treated as an empty/new backup.

### 5. The confirmed current race is deletion, not substitution

P1-035 already proves hourly/pressure cleanup can delete staging by age while a visible confirmation dialog still owns it.

Fresh review did **not** find a normal current source path that deliberately rewrites an existing live staging key with a different valid import payload after preview. Local/normalized staging generations are generated independently, and Yandex offscreen staging likewise returns a specific payload key.

Therefore the reproducible current failure is:

`valid preview -> cleanup deletes exact source -> Proceed fails/re-stage required`,

not a proven silent `preview A -> same key overwritten by B -> destructive import B` schedule.

Do not overstate P1-035 as silent Journal substitution without a distinct writer/reuse proof.

## Required acceptance

### Preserve fresh replace-time validation

Any P1-035 owner-lease/expiry fix must keep the existing fresh parse/normalization at Replace. Do not optimize by treating preview result as a trusted cached schema/content receipt unless a cryptographically/immutably bound staging generation is introduced.

### Explicit preview receipt

A stronger design may return a bounded preview receipt containing:

- exact staging generation/key;
- manifest generation/byte count;
- strong digest of source bytes;
- validated schema/version/entryCount;
- owner page/session generation;
- expiry/lease generation.

Proceed presents that receipt, and replace either:

1. re-reads/re-hashes current source and exact-compares; or
2. consumes an immutable content-addressed staging object whose identity makes substitution impossible.

Current fresh normalization already provides the safer semantic direction.

### Cleanup race semantics

If cleanup wins before Replace:

- Replace must fail before clearing/replacing current Journal;
- UI becomes explicitly expired/re-stage-required;
- old confirmation cannot trigger a remote re-fetch or file re-read automatically;
- no new payload may be attached to the old confirmation generation.

If owner lease is used, cleanup compare-deletes only the exact expired/unowned staging generation.

### Journal generation at destructive commit

Even a perfectly stable staging payload does not authorize replacing a newer Journal state without current destructive-operation policy. P0-076/exclusive replace generation remains separate: staged source identity and target Journal mutation authority are two different receipts.

## Deterministic regressions

1. Preview S -> immediate Proceed -> replace revalidates/normalizes S and succeeds atomically.
2. Preview S -> corrupt/delete one chunk -> Proceed fails before Journal mutation.
3. Preview S -> manifest declared byte count no longer matches body -> Proceed rejects.
4. Preview S -> hourly cleanup deletes S -> old Journal remains intact and UI reports expired/re-stage-required.
5. Active owner lease model: S remains valid during visible bounded confirmation; page loss eventually makes S cleanup-eligible.
6. Explicit-expiry model: dialog disables Proceed before S becomes cleanup-eligible.
7. New staging T starts while old preview S is open -> S confirmation cannot consume T merely because both imports share source/path/name.
8. Two replace attempts use distinct normalized importId generations; stale cleanup of one cannot delete the other by shared id.
9. Replace-import Journal target changes concurrently -> P0-076/exclusive mutation semantics prevent stale target corruption.
10. Preview metadata entryCount equality between S and T is never treated as payload identity.
11. Yandex exact selected-object receipt from P0-013 remains bound to S through preview; no path re-fetch occurs on Proceed.
12. OperationLog cancellation/finish remains receipt-bound under P1-198 and is not staging authority.

## Positive-result consequence

Current fresh normalization at destructive Proceed should be treated as an acceptance requirement, not removed while repairing P1-035 UX/lifetime. It materially limits a stale-preview class from becoming silent substitution.

## Numbering result

No new item. **P1-035** remains active staging lifetime owner; **P1-030/P0-076** retain bounded atomic replace/Journal generation authority.

## Test / release state

No product tests were rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. No build, tag or Release was created.
