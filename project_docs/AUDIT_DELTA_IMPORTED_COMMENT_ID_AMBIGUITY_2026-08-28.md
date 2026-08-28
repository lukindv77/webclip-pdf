# Audit delta — imported Journal comment-id ambiguity — 2026-08-28

Source-of-truth `main` immediately before this write: `701dedeff0e3ec8b495184634f8d087ccc17c6c7`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-030** import validation/normalization and **P0-076** exact Journal mutation identity/CAS. It also composes with newly reserved **P1-211** deleted-comment lifecycle, because a duplicate-id tombstone can permanently shadow another imported comment.

No second comment-specific P-number is created.

## Positive control — duplicate entry ids are not silently overwritten in normalized staging

The normalized import staging key is formed from `importId + entryId`. `writeJournalImportStageBatch()` checks whether that key already exists and, on collision, assigns a fresh candidate id before writing the later entry.

Therefore a backup containing two Journal entries with the same textual entry id is not simply collapsed by one final `put()` overwriting the other. Preserve this collision-remapping behavior unless the product intentionally switches to fail-closed duplicate rejection.

The fresh defect is narrower: comment ids inside one imported entry do not receive equivalent uniqueness normalization.

## Imported comment ids are accepted textually without uniqueness proof

Import normalization bounds each comment id to `MAX_IMPORTED_COMMENT_ID_CHARS` and carries the resulting id into `normalizeJournalComments()`.

Current source has no per-entry `Set`/uniqueness validation or duplicate-id remapping for `journalComments` comparable to the entry-stage collision handling.

Thus a syntactically valid backup can contain two comments C1 and C2 with the same non-empty id X and both survive as distinct array elements carrying X.

This is not hypothetical malformed JSON: the document can satisfy schema/type/count/size limits while having a duplicate logical comment identity.

## Runtime comment mutations are first-match by textual id

Both `editJournalComment(id, commentId, ...)` and `deleteJournalComment(id, commentId)`:

1. load/normalize the current comment array;
2. locate the target with `comments.findIndex(item => item.id === commentId)`;
3. mutate only that first index.

The Journal page buttons carry the displayed comment's `id`, not an immutable array position/generation receipt.

With imported `[C1{id:X}, C2{id:X}]`, both rows therefore send the same authority value X.

## Deterministic mis-target schedules

### Editing the second duplicate edits the first

1. imported entry renders C1 and C2 as two visible live comments, both id X;
2. user clicks Edit on C2;
3. page sends `commentId:X`;
4. worker `findIndex()` resolves C1;
5. C1 is edited while the UI action was taken on C2.

This is a concrete stale/ambiguous target integrity failure.

### Deleting the first can make the second unreachable

1. C1 and C2 share X;
2. user deletes C1;
3. C1 becomes a P1-211 tombstone with `deletedAt>0`, but retains X and remains first in the array;
4. user later clicks Edit/Delete on visible C2;
5. `findIndex(X)` still resolves tombstoned C1;
6. edit rejects “Удалённый комментарий нельзя редактировать”, delete rejects “уже помечен как удалённый”;
7. C2 cannot be addressed through the textual-id API even though it remains live.

The P1-211 soft-delete model makes the ambiguity persistent rather than self-healing by physical removal.

## Why this belongs to P0-076 + P1-030 rather than a new item

P0-076 already requires exact Journal entry/comment mutation generations and rejects stale/ambiguous mutation authority. Duplicate imported textual ids are another way the current API fails to provide a unique target receipt.

P1-030 owns import normalization: an imported data set must not construct runtime state whose identifiers violate the assumptions of supported mutation APIs.

The root repair is therefore shared:

- normalize/reject ambiguous imported identity before commit;
- then require exact current comment generation for mutation.

No new P1-212 is warranted.

## Required import contract

For every imported entry, comment identity must be deterministic and unique after normalization.

Acceptable policies:

### Fail closed

Reject the backup before destructive replace if two comments normalize to the same non-empty id. Error must identify the entry/index class without echoing oversized comment content.

### Deterministic remap

Assign a fresh locally issued immutable comment id to later collisions, analogous to entry collision handling, while preserving comment order/content/deleted state.

If operation/history references ever target comment ids externally, remapping must update those references or fail closed; do not silently break a future referential contract.

Missing/empty legacy ids may receive fresh ids as today if that is already the legacy normalization policy.

## Runtime mutation contract

Even with import uniqueness repaired, P0-076 still requires mutation receipts stronger than textual id alone:

- rendered entry revision;
- immutable comment id/generation;
- expected current entry generation;
- stale same-id replacement fails conflict rather than retargeting.

Import uniqueness prevents immediately ambiguous state; it does not replace CAS.

## Required regressions

1. Import two entries with the same entry id -> chosen current policy remaps/rejects without silent overwrite; existing positive behavior remains explicit.
2. Import one entry with two live comments id X -> backup is rejected or later comment is given a distinct locally issued id before Journal replace commits.
3. Two comment ids that collide only after length/normalization are treated as duplicates after normalization, not before.
4. Duplicate-id backup never reaches a state where Edit on row 2 mutates row 1.
5. Duplicate-id + first soft-deleted never makes the second live comment permanently unaddressable.
6. Normal unique comment ids round-trip unchanged when product wants stable export/import ids.
7. Legacy missing ids receive deterministic/fresh safe identities according to the chosen compatibility policy.
8. Import preview and destructive replace use the same uniqueness rules; Proceed cannot normalize into a different ambiguous identity set.
9. P0-076 stale rendered-generation conflict remains enforced even for unique ids.
10. P1-211 tombstone retention/compaction cannot recreate duplicate active/tombstone ids during import or cleanup.

## Duplicate check / numbering

No new P-number is created.

- **P1-030** owns safe import normalization/atomic replace.
- **P0-076** owns exact entry/comment mutation identity and CAS.
- **P1-211** owns deleted-comment tombstone retention/capacity, which compounds the shadowing schedule but is not the duplicate-id root cause.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
