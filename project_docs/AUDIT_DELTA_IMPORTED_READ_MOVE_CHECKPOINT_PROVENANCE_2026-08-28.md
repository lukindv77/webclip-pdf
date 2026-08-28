# Audit delta — imported ReadLater move lifecycle fields can impersonate a local recovery checkpoint — 2026-08-28

Source-of-truth `main` before this checkpoint: `9ddd80295561c8bff5c0e48871617e9867ec6757`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-022** and composes with **P1-090/P0-074/P0-076**, imported operation-id provenance and the physical-attempt receipt lineage established by the current audit.

The key finding is stronger than imported path/object metadata alone: ordinary unsigned Journal import accepts internal `readMove*` lifecycle fields, and the live Mark Read path later interprets those fields as evidence that WebClip itself previously created an unfinished destructive-move recovery checkpoint.

## Import accepts internal move-saga fields

`normalizeImportedJournalEntry()` currently preserves bounded/normalized values for:

- `movedToReadAt`;
- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

These values arrive from the same unsigned/untrusted backup boundary as filename, `remotePath`, `resourceId`, `accountUid`, comments and other Journal data.

There is no local provenance bit/generation proving that the imported `readMove*` values came from a live operation previously issued by this installation.

## Live Mark Read explicitly interprets them as recovery state

`moveReadLaterEntryToRead(id, operationId)` starts an OperationLog with:

`resumePendingMove: Boolean(entry.readMovePendingAt || entry.readMoveTargetPath)`.

If either field is present, it emits a user-visible progress stage equivalent to:

`Обнаружен незавершённый предыдущий перенос. Проверяем фактическое состояние файла…`

This is not merely rendering historical metadata. The fields influence live destructive workflow semantics.

## Imported target is preferred for the new move

After locating the current remote file and service Upload folder, current target selection is equivalent to:

1. if source already lies under Upload, use source;
2. else if `checkpointTargetPath` exists and is under the current Upload folder, use that checkpoint target;
3. otherwise choose a new available target path.

`checkpointTargetPath` was initialized directly from `entry.readMoveTargetPath`.

Therefore an imported `readMoveTargetPath` passing current Upload containment is treated as the exact target of a prior unfinished local move, even though import never proved such a prior local operation existed.

## Crafted recovery-saga schedule

A crafted backup can contain entry E with:

- destination `yandex`;
- `readingMode='later'`;
- locator hints that can bind a current managed source file S under the already documented P0-022 weakness;
- `readMovePendingAt` set to an arbitrary historical timestamp;
- `readMoveSourcePath` set to plausible S;
- `readMoveTargetPath` set to chosen current-root Upload target T;
- arbitrary imported `readMoveOperationId`.

After import and a later explicit user click `Прочитано`:

1. WebClip reports that an unfinished previous move was detected;
2. current code treats imported T as the preferred recovery target if containment passes;
3. it then overwrites/writes a current local checkpoint using that target before the remote action;
4. the imported fake recovery state has influenced exact destructive target selection and the story shown to the user.

The user did authorize Mark Read, but did **not** authorize an unsigned backup to claim that T was an exact target already chosen by a prior WebClip operation.

## Containment does not authenticate a recovery receipt

Checking that imported T is under the current `<root>/Upload` branch only proves path scope.

It does not prove:

- this installation chose T;
- T belongs to the same account/root generation as the source;
- the source object and T were part of one prior move attempt;
- the imported textual operation id was locally issued;
- a previous remote side effect was actually admitted.

A recovery checkpoint is a capability/state-machine receipt, not ordinary user data.

## Import boundary must separate historical fields from live receipts

Ordinary backup import may preserve these values for display/diagnostics if useful, but must not let them enter the live recovery state machine as locally authoritative.

Acceptable designs:

### Downgrade on import

Store imported `readMove*` fields under historical/unverified metadata and clear live pending-move fields.

A later Mark Read then performs a fresh current operation after exact safe object re-bind, not a fake resume.

### Provenance-tagged state

Retain fields in one schema but tag them `imported-unverified` and require a locally issued physical move receipt/generation before any branch may treat them as `pending move` authority.

### Authenticated export provenance

If a future signed/local provenance format is introduced, only receipts whose installation/object/generation authenticity is actually verified may resume as live checkpoints. Ordinary JSON compatibility backups remain untrusted.

## Imported operationId is diagnostic only

`readMoveOperationId` from backup must never become a P1-198 live operation receipt.

At most it is historical display text.

A resumed/current operation should have a new locally issued live operation receipt linked to an authenticated physical move saga if one exists. It must not inherit terminal/progress authority from imported text.

## Source path field is equally untrusted

Current live target calculation starts from fresh `findYandexFileForJournalEntry(entry)`, which is preferable to blindly using `readMoveSourcePath` as the actual move source.

That positive control should be retained.

However imported source/target/pending fields can still influence locator/recovery semantics and must all share the same provenance downgrade. Do not fix only `readMoveTargetPath` while leaving `readMovePendingAt` to claim a fake unfinished saga.

## Real locally issued checkpoint remains valuable

For an authentic current operation, writing `readMovePendingAt/sourcePath/targetPath/operationId` before `resources/move` is the correct crash-consistency pattern.

The required change is not to remove that checkpoint. It is to distinguish:

- **locally issued live physical-move receipt**;
- **imported historical values that look like one**.

The live receipt should eventually include immutable move-generation id, exact Journal generation/object/context and post-state identity proof required by P1-090/P0-074/P0-076.

## Replace/import generation composition

If a live move checkpoint exists locally and the user imports/replaces the Journal, the prior session's detached-receipt rules apply:

- imported Journal replacement invalidates old local Journal-finalization authority;
- it must not let imported rows overwrite/masquerade as those physical receipts;
- unresolved real external move evidence survives separately as detached generation where required.

Thus internal physical-operation receipts should not rely solely on fields embedded in replaceable/importable Journal rows.

## Required deterministic regressions

1. Import crafted E with nonzero `readMovePendingAt`/target T -> UI does not claim a locally verified unfinished move; Mark Read cannot resume T automatically.
2. Imported T lies inside current Upload -> containment alone does not promote it to live checkpoint.
3. Imported `readMoveOperationId` equals a current local operation display id -> it remains historical/unverified and cannot attach to the current receipt.
4. Imported entry with all `readMove*` fields empty behaves as ordinary imported-unverified remote entry under P0-022.
5. Genuine locally issued pending move survives worker restart and resumes exact target normally.
6. Export/re-import of that genuine row through ordinary unsigned JSON downgrades live move authority unless authenticated provenance is explicitly supported.
7. Current source object differs from historical/imported source -> fresh re-bind/identity checks fail closed; target history cannot authorize a different object.
8. Root/account changes invalidate local move context; imported target never bypasses the context fence.
9. Clear/import while a real move is outcome-unknown leaves physical receipt detached rather than embedding authority into replacement imported row.
10. User-visible diagnostics can still show imported historical pending text, clearly distinguished from active recovery state.

## Duplicate check / numbering

No new item is created.

- **P0-022** remains the primary imported/legacy destructive-provenance owner and now explicitly covers internal lifecycle/checkpoint fields.
- **P1-090/P0-074** own exact live move/object/Yandex context.
- **P0-076** owns Journal generation/finalization authority.
- **P1-198** owns locally issued live operation receipt; imported textual operation ids remain non-authoritative.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
