# Audit family evidence — Journal import / provenance / portable schema / legacy identity

Family from `AUDIT_DELTA_INDEX.md` section 5.

This document is a **lossless consolidation** of the detailed audit deltas listed below. Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-013, P0-022, P0-073, P0-076, P0-077, P1-030, P1-035, P1-042, P1-069, P1-206, P1-211, P1-215, P1-216.

Retired source count: **15**.

## P-code coverage

P0-010, P0-013, P0-022, P0-026, P0-054, P0-055, P0-073, P0-074, P0-076, P0-077, P0-079, P1-009, P1-030, P1-032, P1-035, P1-042, P1-043, P1-051, P1-053, P1-054, P1-073, P1-074, P1-090, P1-156, P1-182, P1-184, P1-188, P1-189, P1-190, P1-194, P1-195, P1-196, P1-197, P1-198, P1-206, P1-211, P1-212, P1-215, P1-216, P1-217, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `AUDIT_DELTA_IMPORTED_COMMENT_ID_AMBIGUITY_2026-08-28.md` | `5e46b0af10915a32ebd91cdc71d7277f623741ad41c61eec0cfef9c63e4a679f` | P0-076, P1-030, P1-211, P1-212 | Audit delta — imported Journal comment-id ambiguity — 2026-08-28 |
| `AUDIT_DELTA_IMPORTED_EMPTY_IDENTITY_CURRENT_NAMESPACE_ADOPTION_2026-08-28.md` | `d53f1560c4edcaf555aabc0f1c68fc974618bdd34570ed725ea1cc9883abc733` | P0-022, P0-073, P0-074, P0-076, P1-090, P1-184, P1-211 | Audit delta — imported empty remote identity can adopt the current Yandex namespace — 2026-08-28 |
| `AUDIT_DELTA_IMPORTED_NAMESPACE_WILDCARD_AUTHORITY_2026-08-28.md` | `fddcc026f5b5fe6406bb6396875a69039c60c83d3f462b3d3636c99670ecee5d` | P0-022, P0-073, P0-074, P0-076, P1-184, P1-189 | Audit delta — imported Yandex namespace wildcard authority — 2026-08-28 |
| `AUDIT_DELTA_IMPORTED_PROVENANCE_2026-08-27.md` | `0c4a0238541a4fe144f14f6c36f3a477d83947eb8bae1c428a30a61b56190329` | P0-022, P0-073, P0-074, P0-079, P1-182, P1-184, P1-188, P1-189, P1-190, P1-197 | Audit delta — imported Journal provenance / destructive authority |
| `AUDIT_DELTA_IMPORTED_READ_MOVE_CHECKPOINT_PROVENANCE_2026-08-28.md` | `1dbdbb9a67a37d690a36c22796d68c4408607dbad1e34a16b8e4017fd73e3f58` | P0-022, P0-074, P0-076, P1-090, P1-198, P1-211 | Audit delta — imported ReadLater move lifecycle fields can impersonate a local recovery checkpoint — 2026-08-28 |
| `AUDIT_DELTA_IMPORT_PREVIEW_REVALIDATION_BOUNDARY_2026-08-28.md` | `668921d29bde72eedbb03da81aac77f163ff8fc4f7f07a2e412cfcddaaeff92c` | P0-013, P0-076, P1-030, P1-035, P1-198 | Audit delta — staged import preview/revalidation boundary — 2026-08-28 |
| `AUDIT_DELTA_IMPORT_STAGING_ACTIVE_LIFETIME_2026-08-27.md` | `a5ce40d4b8429f0c0468cb2fce23d1a10dc296e8efb9db4a49ad59906264b390` | P1-030, P1-035, P1-042, P1-074, P1-156 | Audit delta — active Journal import staging lifetime |
| `AUDIT_DELTA_JOURNAL_EXPORT_PORTABLE_SCHEMA_ALLOWLIST_2026-08-28.md` | `a0d30474506efed5cf52197a3e35f7e97c8c50af12dd6b9d7692be4eb9a46345` | P0-010, P0-022 | Audit delta — portable Journal export schema must not be an IndexedDB record spread — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_IMPORT_CONFIRMATION_STAGING_LEASE_2026-08-28.md` | `2d9d3006c4494c34a8abae49d8af74d9f112d9184c960ab58e1f19ab79f0adbd` | P1-156, P1-215 | Audit delta — Journal import confirmation must lease staged backup bytes — 2026-08-28 |
| `AUDIT_DELTA_LEGACY_JOURNAL_COMMENT_FILTER_COMPATIBILITY_2026-08-28.md` | `a5d9f336a3fa314f9788242b988996a66143dda59f02a3b6e1c03cf4172f9e61` | P0-076, P1-009, P1-206, P1-211 | Audit delta — legacy `journalComment` filter compatibility — 2026-08-28 |
| `AUDIT_DELTA_LEGACY_URLKEY_DELETE_STATS_GHOST_2026-08-28.md` | `aea700aa7f8a27ccac4d43c6e5d769cd7a49fc75b9afa73a9269ee1642f71ebf` | P0-026, P1-216, P1-217 | Audit delta — deleting a legacy entry can leave ghost `urlStats` — 2026-08-28 |
| `AUDIT_DELTA_LEGACY_URLKEY_SCOPED_CLEAR_PARITY_2026-08-28.md` | `25b63b2d25de540777cbfb17c46dcfd13d9c341c1e6ef68470099ec2ccec77b4` | P0-076, P1-032, P1-189, P1-216 | Audit delta — URL-scoped Journal clear must include supported legacy rows without `urlKey` — 2026-08-28 |
| `AUDIT_DELTA_LEGACY_URLKEY_TEMPLATE_LIST_PARITY_2026-08-28.md` | `5db7c82722b9f449e6e13eb2d0b0545c5128f3e33c2e475ec8373aae167d27a3` | P1-216, P1-217 | Audit delta — legacy URL identity parity in `WEBCLIP_JOURNAL_LIST` — 2026-08-28 |
| `AUDIT_DELTA_RESTORE_ENVELOPE_2026-08-27.md` | `f72305a17a40f28e404469b99473b3752021c6aa95ec205fe2cdba4707e120aa` | P0-054, P0-055, P0-077, P0-079, P1-051, P1-053, P1-054, P1-073, P1-195, P1-196, P1-197, P2-020 | Journal live/export/import envelope audit delta — 2026-08-27 |
| `AUDIT_DELTA_STORAGE_PRESSURE_IMPORT_STAGING_RECLAIM_2026-08-28.md` | `a3053811a216b22a160c5ec63bef5e4fed7708723d555b443216ff22073481bf` | P1-035, P1-043, P1-194, P1-211 | Audit delta — storage-pressure reclaim of expired normalized import staging — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.
## Retired source: `AUDIT_DELTA_IMPORTED_COMMENT_ID_AMBIGUITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `5e46b0af10915a32ebd91cdc71d7277f623741ad41c61eec0cfef9c63e4a679f`

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

## Retired source: `AUDIT_DELTA_IMPORTED_EMPTY_IDENTITY_CURRENT_NAMESPACE_ADOPTION_2026-08-28.md`

SHA-256 of UTF-8 source text: `d53f1560c4edcaf555aabc0f1c68fc974618bdd34570ed725ea1cc9883abc733`

# Audit delta — imported empty remote identity can adopt the current Yandex namespace — 2026-08-28

Source-of-truth `main` before this checkpoint: `195d3909d706e9da54ed28934aef175feedc8f7b`.

Docs-only audit checkpoint. Runtime, tests, configuration and `manifest.json` are unchanged. Canonical table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-022** and composes with **P0-073/P0-074**, **P1-184**, **P1-090** and **P0-076**.

The canonical P0-022 already records that imported remote metadata is untrusted and that path/derived locators cannot automatically become destructive capability. This checkpoint isolates a stronger concrete state that must be covered by the implementation: **empty imported identity fields are not neutral**. In current code they remove namespace/identity checks and allow the entry to adopt a file from the currently configured Yandex namespace.

## Current import accepts absence of every strong remote-identity field

`normalizeImportedJournalEntry()` accepts imported Yandex entries containing normalized/bounded values for:

- `remotePath`;
- `folder`;
- `publicUrl`;
- `resourceId`;
- `accountUid`;
- `rootPath`;
- filename and read-move locator hints.

All identity fields may be empty.

The import boundary does not attach a locally issued provenance class saying that these fields came from an unsigned/untrusted backup and therefore cannot authorize destructive object management.

## Account/root safety checks are conditional on imported values being present

`findYandexFileForJournalEntry()` derives:

- `expectedAccountUid` from the Journal entry;
- `expectedRootPath` from the Journal entry.

Current root mismatch is checked only when both a stored expected root and current root exist.

Current account UID is compared only when `expectedAccountUid` is non-empty.

Therefore an imported entry with empty `accountUid/rootPath` does not fail because historical namespace provenance is unknown. Instead the historical namespace checks are simply skipped.

That behavior is reasonable for a non-destructive display-only legacy record. It is not sufficient for a later Trash/Mark Read capability.

## Missing stable object identity is currently permissive

Inside `findYandexFileForJournalEntry()`, `matchesKnownIdentity(item)` behaves as follows:

1. known `resourceId` -> require matching `resource_id` (or accepted public-url secondary proof when API omits id);
2. otherwise known `publicUrl` -> require exact public URL;
3. otherwise -> return `true` for any candidate whose type is a file.

Thus the absence of imported `resourceId/publicUrl` does not mean `identity unknown -> fail closed`. It means any file selected by the locator phase satisfies identity.

## Fresh deterministic current-namespace adoption schedule

A crafted or old backup can contain a Yandex Journal entry E with:

- destination `yandex`;
- empty `resourceId`;
- empty `publicUrl`;
- empty `accountUid`;
- empty `rootPath`;
- no trustworthy `remotePath` if desired;
- filename/folder/read-move hints chosen to name an existing managed file.

After import:

1. the user is currently authorized to account B and root R2;
2. the entry E carries no account/root evidence from its historical source;
3. `findYandexFileForJournalEntry(E)` therefore does not reject B/R2 as a namespace mismatch;
4. deterministic candidate construction uses current WebClip service branches plus E's imported filename/folder/read-move hints;
5. one candidate resolves to a real file F in current B/R2;
6. because E has no stable object identity, `matchesKnownIdentity(F)` returns true solely because F is a file;
7. an explicitly clicked Trash or Mark Read action can then use F as the destructive source.

The problematic transition is not `old account A object -> current B object with the same verified identity`. It is **no historical namespace/object proof at all -> current namespace object automatically becomes the entry's object**.

## Why current-root containment is not sufficient

Managed-branch containment answers only:

> Is this target inside a path WebClip is allowed to manage?

It does not answer:

> Did this imported Journal entry legitimately acquire authority over this exact object?

A crafted imported locator can deliberately name another legitimate WebClip-managed object. Staying inside `<current-root>/Upload|ReadmeLater|Trash/...` therefore does not prove provenance.

## Empty fields must not mean wildcard authority

Required P0-022 interpretation:

- empty imported `accountUid` means historical account unknown, **not current account accepted**;
- empty imported `rootPath` means historical root unknown, **not current root accepted**;
- empty imported `resourceId/publicUrl` means object identity unknown, **not every candidate file matches**;
- imported `filename/folder/remotePath/readMove*` remain bounded locator hints only.

For read-only display/open operations, product policy may permit weaker legacy behavior.

For Trash, Mark Read remote move, unpublish or any other object-scoped destructive operation, absence of locally trusted provenance must remove automatic destructive capability until an explicit safe re-bind flow proves the exact current object.

## Re-bind must create a new local provenance generation

A future safe re-bind cannot merely write the same imported fields back into the entry and call them trusted.

It should produce a locally issued receipt binding at least:

- Journal entry generation / expected revision;
- current Yandex operation context/account/root generation;
- exact fresh remote metadata;
- stable `resource_id` where available;
- publication state/object proof where applicable;
- evidence class describing how the binding was established;
- time/version of the local binding.

The original imported hints remain provenance inputs/diagnostics, not authority.

If strong exact proof cannot be obtained, destructive operation fails closed or requires a clearly separate manual object-selection/rebind UX whose confirmation names the exact current object.

## Imported non-empty identity remains untrusted too

This checkpoint does not weaken the existing canonical requirement: an imported `resourceId`, `publicUrl`, `accountUid` or `rootPath` is not trusted merely because it is syntactically valid and non-empty.

The fresh result is symmetric:

- non-empty imported identity cannot self-certify authority;
- empty imported identity cannot become wildcard/current-namespace authority.

Both states require a local provenance class before destructive use.

## P0-073/P0-074 composition

Once re-bound, destructive operations must still use one immutable Yandex operation context.

A locally proven object under account/root generation A cannot be retargeted to a later current account/root B because old fields were absent or because the textual path exists in both namespaces.

A->B->A with visually equal values remains generation-sensitive where the operation contract requires it.

## P1-184/P1-090 composition

Re-bind proves the pre-operation object. It does not replace post-side-effect verification.

For a move:

1. prove current source object identity;
2. persist exact operation/target receipt;
3. perform/settle the remote side effect;
4. prove target is the same exact object;
5. only then update/delete the Journal generation.

Legacy/imported provenance cannot be upgraded by adopting the object observed at the target after an unknown move.

## Required deterministic regressions

1. Imported Yandex entry with empty account/root/resourceId/publicUrl + filename of an existing current Upload file -> Trash must fail closed before remote move unless an explicit exact re-bind occurs.
2. Same entry + `readingMode=later` and locator pointing to current ReadmeLater object -> Mark Read cannot move it automatically.
3. Empty stored `remotePath` but imported folder/filename/readMove hints resolve one current file -> still no destructive authority.
4. Imported remotePath exactly names a current managed file but strong provenance is absent -> path containment alone does not authorize Trash.
5. Imported entry contains syntactically valid resourceId/publicUrl copied from another object -> import does not mark it locally trusted.
6. Safe re-bind obtains exact current `resource_id` and local provenance receipt -> destructive operation can proceed only under that expected Journal/Yandex generation.
7. Re-bind source object changes before destructive admission -> expected-generation/object check fails closed.
8. Reauth/root change after re-bind -> old binding cannot silently adopt same textual path in the new namespace.
9. Read-only Journal display remains available for imported-unverified records and clearly distinguishes unverified remote management state.
10. Export/re-import of a locally verified entry must not silently preserve local destructive provenance unless the product has an authenticated provenance format; ordinary unsigned backup import downgrades it to imported-unverified.

## Duplicate check / numbering

No new item is created.

- **P0-022** remains the primary imported/legacy destructive-provenance owner.
- **P0-073/P0-074** own exact Yandex namespace/operation generation after a valid local bind.
- **P1-184** owns exact remote object/content/attempt proof.
- **P1-090** owns exact move source->target identity continuity.
- **P0-076** owns Journal expected-generation mutation authority.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. Runtime/version remain unchanged; no build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_IMPORTED_NAMESPACE_WILDCARD_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `fddcc026f5b5fe6406bb6396875a69039c60c83d3f462b3d3636c99670ecee5d`

# Audit delta — imported Yandex namespace wildcard authority — 2026-08-28

Source-of-truth `main` immediately before this write: `bc9b8cd0473598e42f3d791ec255651aa78b8ab7`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source proof refines the existing composition of **P0-022** (imported remote provenance) and **P0-073** (account/root namespace identity). The key acceptance point is that **missing imported namespace identity is not neutral**: empty `accountUid` / `rootPath` currently cause destructive lookup to adopt the account/root that happens to be current at click time.

Related but separate owners remain **P0-074** for immutable Yandex operation generation, **P1-184** for exact remote object/content proof, and **P1-189** for canonical site routing.

## Fresh source proof

### 1. Import still accepts authority-shaped remote fields without provenance class

`normalizeImportedJournalEntry()` accepts unsigned backup values for Yandex entries including:

- `remotePath`, `folder`, `filename`;
- `publicUrl`, `resourceId`;
- `accountUid`, `rootPath`;
- `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId`.

The imported row does not carry a locally issued remote-binding/checkpoint provenance receipt that distinguishes these values from fields produced by a real local save/recovery generation.

This is already the P0-022 root.

### 2. Empty expected root means "use current root", not "unknown namespace"

`findYandexFileForJournalEntry()` fresh-reads current `yandexConfig` and computes `currentRootPath`.

It rejects a root mismatch only when both an expected imported/stored root and the current root are non-empty:

`if (expectedRootPath && currentRootPath && expectedRootPath !== currentRootPath) ...`

If an imported entry leaves `rootPath` empty, the root fence is skipped. Candidate discovery then uses the **current** config root for deterministic Upload / ReadmeLater / Trash candidates.

Thus blank imported root is effectively a wildcard over whichever WebClip root is selected later.

### 3. Empty expected account similarly skips account proof

Current account UID is resolved and compared only inside:

`if (expectedAccountUid) { ... }`

An imported or legacy entry with empty `accountUid` therefore performs remote discovery in the currently authorized Yandex account without first proving that this account owns the historical reference.

For legacy/local records this is already the missing-account refinement of P0-073. For imported records it composes with P0-022: an unsigned backup can deliberately omit namespace fields and thereby cause current account/root to become implicit authority.

### 4. Imported move checkpoint fields are still interpreted as a live recovery lifecycle

`moveReadLaterEntryToRead()` treats `entry.readMovePendingAt || entry.readMoveTargetPath` as evidence of an unfinished previous move and renders a recovery/resume state.

After locating a candidate, it computes the current Upload target folder. If the located candidate is already under that folder, `alreadyInUploadFolder` is true and the remote `/resources/move` call is skipped as an idempotent recovery case.

The function then updates the Journal row with the located object's path/name/publicUrl/resourceId and clears the `readMove*` fields.

This is correct for a **locally issued exact recovery checkpoint**, but imported `readMove*` text currently has the same runtime shape. The existing imported-provenance delta already demonstrated how a crafted imported pending target can make an unrelated managed file look like the result of a previous local move.

### 5. Trash then inherits the adopted binding

The destructive Trash path fresh-reads current config, calls `findYandexFileForJournalEntry()`, checks only managed-branch containment against the current root, and then constructs/moves to current `<root>/Trash/MM-YYYY/...`.

Therefore once an imported row has been allowed to adopt a current-account/current-root object, later ordinary user-confirmed Trash acts on the adopted object. User confirmation is not proof that the imported historical locator was authentic.

## Deterministic composition schedule

1. Backup imports Yandex entry J with `accountUid=''`, `rootPath=''`, no trustworthy local binding receipt, and crafted path/readMove hints.
2. Later the user is connected to account B with current root Rb.
3. User explicitly selects Mark Read or Trash for J.
4. `findYandexFileForJournalEntry()` skips expected-account and expected-root comparisons because both expected values are blank.
5. Candidate lookup is performed inside B/Rb using imported locator hints and current deterministic folder routing.
6. A real managed file F in B/Rb is accepted by the weak/imported identity path.
7. Mark Read may locally adopt F as a completed recovery result; Trash may subsequently move F, or direct Trash can mutate the selected candidate.
8. Nothing proved that J ever belonged to B/Rb or that F was the object represented by the imported backup.

Path containment correctly prevents escape outside WebClip-managed branches, but it cannot convert missing provenance into object ownership.

## Required unified acceptance

### Imported namespace fields are evidence, never wildcard authority

For an `imported-unverified` remote binding:

- populated imported `accountUid/rootPath/resourceId/publicUrl` are historical claims, not signatures;
- empty `accountUid/rootPath` mean **unknown binding**, not "accept current";
- current account/root may be used only as inputs to an explicit non-destructive safe re-bind procedure, never as an automatic substitute for missing historical identity.

### Recovery checkpoints need local generation provenance

`readMovePendingAt/sourcePath/targetPath/operationId` can drive recovery behavior only when accompanied by a locally issued immutable checkpoint generation/receipt.

An imported row may retain these fields for display/export/history, but must not enter the live "resume unfinished move" state from their presence alone.

### Re-bind must not collapse layers

A safe re-bind must establish, at minimum:

- current account UID and root namespace;
- exact candidate object identity with sufficient remote proof;
- locally issued binding provenance/generation;
- expected Journal entry/generation before publishing authority back to the row.

P1-184 stronger object/content proof and P0-076 Journal CAS remain required; a successful account/root comparison alone is not enough.

## Required regressions

1. Imported Yandex entry with blank accountUid/rootPath plus valid-looking `remotePath`: destructive action fails closed or enters explicit safe re-bind; it does not search current namespace as authoritative.
2. Same with only `filename/folder` hints: no destructive bind.
3. Same with imported `readMoveTargetPath` under current Upload folder: it is not treated as a locally issued unfinished move.
4. Imported row with forged populated accountUid/rootPath matching current values remains `imported-unverified`; matching text is not a signature.
5. Legacy **local** row without accountUid follows P0-073 migration/re-bind semantics and is not accidentally classified as trusted current-account wildcard.
6. Locally issued live row with exact binding/checkpoint receipt continues to recover an interrupted Mark Read normally.
7. Successful safe re-bind creates a new local binding generation; reauth/root change afterward fails before destructive mutation.
8. Managed-root containment remains mandatory after provenance proof.
9. Imported hostname mismatch still follows P1-189 and cannot redirect re-bind/routing.
10. User confirmation of Trash/Mark Read never upgrades unverified imported metadata into authority by itself.

## Numbering result

No new P0/P1/P2 item is created. Primary owner remains **P0-022**, composed with **P0-073**. P0-074/P1-184/P1-189 remain independent required layers.

## Test / release state

No product tests were rerun. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**; this checkpoint does not claim a new run. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_IMPORTED_PROVENANCE_2026-08-27.md`

SHA-256 of UTF-8 source text: `0c4a0238541a4fe144f14f6c36f3a477d83947eb8bae1c428a30a61b56190329`

# Audit delta — imported Journal provenance / destructive authority

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `35651489f34648ac267904015705de5338528b83`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens and connects existing **P0-022 PARTIAL**, **P1-188 OPEN**, **P1-189 OPEN** and **P1-190 OPEN**. P1-182 privacy evidence remains valid but is not the destructive-authority root cause.

The common design gap is that replace-import produces entries whose imported fields are thereafter structurally indistinguishable from locally issued live authority. A durable provenance class is required; per-field syntax validation alone is insufficient.

## P0-022 — stronger destructive provenance proof

`normalizeImportedJournalEntry()` accepts from an unsigned backup:

- `destination='yandex'` and `readingMode='later'`;
- `remotePath`, `folder`, `filename`;
- `resourceId`, `publicUrl`, `accountUid`, `rootPath`;
- `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId`.

The imported entry carries no durable marker saying that these values are `imported-unverified` rather than locally issued recovery/object receipts.

`findYandexFileForJournalEntry()` defines `matchesKnownIdentity()` so that when both `resourceId` and `publicUrl` are absent, **any API object of type `file` passes identity matching**. The function checks, in order, the saved `remotePath`, then deterministic known-path candidates including imported `readMoveTargetPath`, `readMoveSourcePath`, derived Upload/ReadmeLater paths and `folder + filename`.

This confirms the existing P0-022 attack class and adds a stronger concrete sequence:

1. crafted backup imports a Yandex `readingMode='later'` entry;
2. it leaves `resourceId/publicUrl` empty;
3. it sets `readMoveTargetPath` to an existing unrelated WebClip-managed file under the derived Upload target folder;
4. user later explicitly chooses `Прочитать позже → Прочитано`;
5. locate treats the imported pending target as a recovery candidate and, with no stable identity fields, accepts the unrelated `file`;
6. `moveReadLaterEntryToRead()` sees the accepted source already inside the Upload target folder and can complete the **local** move state without performing a remote move;
7. the imported Journal entry has now effectively adopted that unrelated real file; a later ordinary Delete/Trash action can obtain destructive authority over it.

Managed-branch containment still prevents escaping the configured WebClip branches, but does not prove which object inside those branches belongs to this Journal entry.

### Required P0-022 acceptance refinement

- Imported/legacy `remotePath`, `folder`, filename-derived candidates and every imported `readMove*` field are hints only.
- An imported `readMoveTargetPath` must never be interpreted as a locally issued unfinished-move checkpoint.
- `resourceId/publicUrl/accountUid/rootPath` imported from unsigned backup are not a signature or local provenance proof either.
- New live entries/recovery transitions need a versioned locally-issued remote binding/checkpoint receipt.
- Import must retain historical fields for roundtrip/diagnostics but mark the binding/checkpoint provenance `imported-unverified`.
- Destructive move/delete must require a proven local binding or an explicit safe re-bind procedure that proves exact current account/root/object identity; otherwise fail closed.
- Regression must include the crafted pending-target adoption sequence above, not only `remotePath`/filename fallback.

## P1-189 — imported site identity remains privileged routing input

Fresh code confirms import does:

- `url = normalizeImportedHttpUrl(raw.url)`;
- `hostname = raw.hostname` when supplied, rather than canonicalizing it from `url`;
- `siteKey` is derived from `url || hostname`.

Remote locate/mark-read then uses `entry.hostname || hostnameFromUrl(entry.url)` to build site-dependent Upload/ReadmeLater paths.

Therefore a syntactically valid imported `hostname` remains privileged routing authority even when it conflicts with the normalized URL. P1-189 remains OPEN.

Acceptance remains: canonical `hostname/siteAddress/siteKey` must derive from the normalized URL for any operation that has a valid URL; conflicting imported duplicates are rejected or retained only as historical non-authoritative metadata. Legacy entries without a trustworthy HTTP(S) URL must not obtain site-dependent destructive routing from raw hostname alone.

## P1-190 — imported OperationLog ID has no installation/local-receipt provenance

Fresh import still normalizes and stores a syntactically valid `raw.operationId` directly into `entry.operationId`. Journal UI then builds the linked OperationLog affordance from that same value.

After replace-import there is no marker distinguishing:

- operationId locally issued for this live entry in this installation; versus
- historical/imported operationId text from another backup/installation.

So a crafted/imported entry can still point the UI at an unrelated current-installation OperationLog record with the same ID. This is forensic/provenance corruption, not a new remote privilege.

Acceptance: preserve the historical ID as `sourceOperationId` or equivalent, but only a locally issued receipt/installation namespace may activate a live OperationLog link.

## P1-188 — arbitrary imported selector execution remains unchanged

`sanitizeSelectionSnapshot()` still accepts `locator.cssPath` as arbitrary text up to 4000 chars. In `content.js`, both legacy and v3 restore paths feed it to native `querySelector()` before/alongside structural resolution; v1/v2 can accept the first tag-compatible match directly.

The provenance lesson is the same: imported locator text must not silently inherit the execution semantics of a locally generated canonical selector.

Acceptance remains P1-188: validate/parse only WebClip's versioned canonical selector grammar or ignore imported cssPath and use bounded structural fields. Preserve compatibility through migration, not by executing arbitrary imported CSS.

## P1-182 — privacy evidence confirmed, no reclassification

Locator sanitizer still stores plaintext `src`, `href`, element/ARIA/name/title text plus parent/previous/next text. Content locator creation still obtains raw `getAttribute('src')` / `getAttribute('href')` values. This supports P1-182, but the destructive-provenance checkpoint above does not create a new privacy item.

## System-level provenance requirement

A robust fix should introduce a versioned provenance layer instead of adding more ad-hoc booleans. At minimum distinguish:

- locally issued live Journal entry / local operation receipt;
- locally issued remote-object binding;
- locally issued recovery checkpoint generation;
- imported historical metadata;
- imported-unverified remote locator/binding;
- legacy-unverified state requiring safe migration/re-bind.

Export may preserve historical metadata, but import must not recreate local authority merely because field names match the live schema.

## Duplicate check

- Not P0-073/P0-074: account/root/auth generation fences remain required, but an attacker can import matching/blank values; provenance of the object binding is separate.
- Not P1-184: exact content/object proof is required after a candidate is found, but P0-022 decides whether imported locator/checkpoint fields may select the candidate at all.
- Not P1-189: site identity canonicalization does not prove object provenance.
- Not P1-190: OperationLog provenance is forensic/UI linkage only, not destructive Yandex authority.
- No P0-079/P1-197 assigned.

## Retired source: `AUDIT_DELTA_IMPORTED_READ_MOVE_CHECKPOINT_PROVENANCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `1dbdbb9a67a37d690a36c22796d68c4408607dbad1e34a16b8e4017fd73e3f58`

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

## Retired source: `AUDIT_DELTA_IMPORT_PREVIEW_REVALIDATION_BOUNDARY_2026-08-28.md`

SHA-256 of UTF-8 source text: `668921d29bde72eedbb03da81aac77f163ff8fc4f7f07a2e412cfcddaaeff92c`

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

## Retired source: `AUDIT_DELTA_IMPORT_STAGING_ACTIVE_LIFETIME_2026-08-27.md`

SHA-256 of UTF-8 source text: `a5ce40d4b8429f0c0468cb2fce23d1a10dc296e8efb9db4a49ad59906264b390`

# Audit delta — active Journal import staging lifetime

Date: 2026-08-27
Source-of-truth `main` immediately before write: `184021aa00711711924ff1be2ff106d5cadbc54d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P1-035 must be refined — TTL cleanup does not distinguish stale staging from a live confirmation owner

Canonical P1-035 correctly added hourly cleanup for temporary transfer/import staging with a 2-hour TTL. Fresh audit shows that the TTL currently means only wall-clock age: active file/Yandex import staging can be deleted while a visible Journal page still owns the import and is waiting for the user's 9-digit destructive confirmation.

### Fresh source proof

Constants:

- `TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000`;
- `JOURNAL_IMPORT_STAGING_TTL_MS = 2 * 60 * 60 * 1000`.

Hourly maintenance runs both `cleanupTransferPayloads()` and `cleanupExpiredJournalImportStaging()`.

`cleanupTransferPayloads()` scans the transfer store and deletes any record with:

`createdAt < Date.now() - TRANSFER_PAYLOAD_TTL_MS`.

It does not check an active owner/session/lease.

`cleanupExpiredJournalImportStaging()` similarly deletes records by `createdAt` index older than the import-staging cutoff, with no owner check.

### Local file flow

`journal.js::importJournalFromSelectedFile()`:

1. stages the selected `File` into transfer storage;
2. asks worker for `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
3. opens `requestDangerousConfirmation()` and awaits the user;
4. only after confirmation sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with the original `stagingKey`.

The confirmation dialog has no 2-hour expiry/disable path. The page therefore continues to represent the staged import as actionable even after background maintenance is allowed to delete the underlying transfer records.

### Yandex flow

The Yandex restore flow has the same ownership shape: worker downloads the selected backup into temporary staged transfer data, Journal displays preview/confirmation, and confirmed replace later reuses the staged key. A long-lived confirmation can therefore outlive the payload that the UI still claims it will import.

### Effect

This is not proven silent Journal corruption: if the source staging is gone, replace should fail before successful destructive commit and the old Journal remains authoritative.

The defect is lifecycle/UX correctness and repeatability:

- a visible live destructive confirmation can become impossible solely because hourly cleanup classified its payload as stale by age;
- local file import may require the user to reselect the original file because the page no longer retains a reusable file handle/path authority;
- Yandex restore may require a new remote list/download/selection cycle;
- the UI gives no indication that the actionable payload expired while the dialog was open.

### Classification / duplicate check

No new P-number is created.

This refines **P1-035**, whose root cause is lifecycle cleanup of temporary import/export transfer staging. The missing distinction is `expired by age` versus `actively owned by a live user operation`.

Related but separate:

- P1-030 owns bounded streaming import architecture and atomic replace.
- P1-074 owns bounded IDB transactions for file-page staging.
- P1-042 owns preview-before-normalization behavior.
- P1-156 owns native Save As lifetime, whose system dialog has a stronger no-artificial-timeout requirement. Ordinary Journal confirmation need not live forever, but it must not silently remain actionable after its payload is deleted.

### Required P1-035 refinement

Choose one explicit lifecycle contract and make UI/storage agree:

**Preferred owner-aware model:** active import staging receives a bounded owner/session lease while the Journal page is visibly awaiting confirmation. Maintenance skips records with a fresh live lease. Pagehide/crash/explicit cancel releases or lets the lease expire; orphan cleanup remains bounded.

**Acceptable explicit-expiry model:** if product intentionally limits confirmation lifetime, the dialog itself must expose/observe that deadline. On expiry it must disable Proceed, discard/cleanup consistently, and require a fresh stage/preview/reselect. It must never leave an enabled Proceed button pointing at already-disposable data.

In both models:

1. local file and Yandex staged import use the same lifecycle semantics;
2. lease/expiry identity is bound to exact `stagingKey` and owner page/session, not a global boolean;
3. maintenance does not extend abandoned staging indefinitely;
4. owner renewal cannot resurrect already deleted/expired staging without a fresh preview;
5. replace revalidates that the exact staged source/preview generation still exists before destructive transaction admission;
6. normal 2-hour orphan cleanup remains effective after owner loss;
7. storage-pressure cleanup must not silently delete an active payload while UI still offers confirmation; if forced cleanup is necessary, the owner must transition visibly to expired/re-stage-required.

### Required regressions

- Local file staging just below TTL + active confirmation + hourly maintenance: Proceed remains valid under lease model, or dialog explicitly expires under expiry model.
- Same flow after page owner disappears: staging becomes cleanup-eligible and is removed after bounded orphan lifetime.
- Yandex staged backup behaves identically.
- Cleanup racing with confirmation cannot produce a destructive partial replace; old Journal remains unchanged if staging validity is lost.
- Expired staging cannot be reused by a stale page after a newer import session has started.
- Refresh/reopen does not accidentally inherit another page's active staging lease.

## Positive control

The existing 2-hour TTL and hourly maintenance remain valuable for orphaned temporary data. The audit does not recommend removing bounded cleanup; it requires distinguishing live ownership from orphan age.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_EXPORT_PORTABLE_SCHEMA_ALLOWLIST_2026-08-28.md`

SHA-256 of UTF-8 source text: `a0d30474506efed5cf52197a3e35f7e97c8c50af12dd6b9d7692be4eb9a46345`

# Audit delta — portable Journal export schema must not be an IndexedDB record spread — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary owner: **P0-010** versioned full Journal export/import. This composes with **P0-022** imported capability provenance and the transient ReadLater-move checkpoint delta.

## Source proof

The public backup envelope declares a stable format:

- `schema: 'webclip-journal'`;
- `schemaVersion: 1`.

Import requires that exact schema/version.

However entry serialization is not an explicit v1 projection. Current export does:

```js
const entry = cursor.value || {};
json = JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) });
```

Therefore every enumerable field added to the internal `entries` IndexedDB record automatically becomes part of exported backup bytes.

Today that includes fields with very different semantics:

- portable user history (URL/title/filename/comments/selection snapshot);
- verified remote metadata;
- internal/diagnostic operation ids;
- transient `readMove*` recovery state.

The importer is more selective and reconstructs a normalized record from known fields. That is a useful safety layer, but it does not make the exported schema explicit or stable.

## Why this is a schema-version bug

An internal DB migration can add a field for worker-only purposes without any intended backup-format change. With the current spread:

1. DB record gains field X;
2. `schemaVersion` remains 1;
3. every new backup silently starts containing X;
4. old/new importers may ignore, later reinterpret, or explicitly accept X depending on runtime version;
5. the same declared schemaVersion therefore has extension-version-dependent field semantics.

That defeats the main reason the envelope is versioned.

It also creates a future privacy/capability footgun: a developer adding a secret-ish, local path, recovery receipt or internal diagnostic field to the Journal record must remember that it is automatically exported even if no portable-format code was touched.

## Required contract

Introduce an explicit serializer for the portable schema, conceptually:

`serializePortableJournalEntryV1(internalEntry)`.

It must:

1. enumerate every allowed v1 field deliberately;
2. normalize each field using the same public-schema semantics expected by import;
3. exclude worker-only/transient recovery state unless the portable format explicitly owns it;
4. separate historical diagnostic metadata from live local authority/provenance;
5. never export newly added internal fields by default;
6. require a deliberate schema-version decision when portable semantics change.

The import normalizer remains independently defensive and must not trust even WebClip-produced backup bytes merely because the serializer is allowlisted.

## Compatibility

A repair should preserve import compatibility with existing v1 backups containing current extra fields. The importer may continue to recognize legacy fields where required, while new exports use the canonical projection.

If a field such as transient recovery data is removed from newly generated v1 output, document the compatibility rule explicitly. If removing it would be considered a semantic format change, bump schemaVersion and support the old version through a bounded migration path.

## Regression cases

1. Add a synthetic internal field to a stored Journal record -> v1 export does not contain it unless explicitly allowlisted.
2. Existing portable title/URL/comments/snapshot fields round-trip unchanged according to documented normalization.
3. `readMove*` does not silently become live recovery capability after portable restore.
4. Old v1 backup containing legacy/internal fields remains importable according to the chosen compatibility policy.
5. A future sensitive/internal field added to IndexedDB cannot appear in backup merely because object spread sees it.
6. Export schemaVersion changes only through an explicit portable-format change, not an internal DB migration.
7. Import continues to reject unsupported envelope versions rather than guessing.

## Duplicate check

P0-010 owns full JSON export/import and is the correct stable root. P0-022 owns whether imported remote/recovery metadata may become destructive authority. This delta adds the missing serialization-layer invariant; no new stable number is required.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_IMPORT_CONFIRMATION_STAGING_LEASE_2026-08-28.md`

SHA-256 of UTF-8 source text: `2d9d3006c4494c34a8abae49d8af74d9f112d9184c960ab58e1f19ab79f0adbd`

# Audit delta — Journal import confirmation must lease staged backup bytes — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-215** — a staged Journal backup that has been previewed and is currently presented in an active destructive confirmation must not be reclaimed solely by generic temporary-payload age without an owner/lease policy.

This is a user-owned waiting/lifetime issue adjacent to P1-156 Save As lifecycle, but it is a separate staging subsystem and confirmation contract.

## Source proof

Worker transfer payloads use:

`TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000`.

`cleanupTransferPayloads()` scans all transfer-store rows and deletes a row when:

```js
Number(cursor.value?.createdAt || 0) < Date.now() - TRANSFER_PAYLOAD_TTL_MS
```

There is no exclusion for an active Journal import preview/confirmation owner.

File import flow in `journal.js`:

1. stages the selected file into `WebClipOffscreenTransfers`;
2. sends `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
3. displays a destructive confirmation containing validated `entryCount/exportedAt`;
4. awaits user decision without an explicit confirmation deadline;
5. on confirm sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with the same staging key.

Yandex restore has the same shape after `WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP`: downloaded bytes are staged, inspected and then held while the user confirmation remains open.

Neither flow renews/pins the payload while the prompt owns it.

## Deterministic failure

1. User stages a valid backup and sees its preview/confirmation.
2. The Journal page remains open while the user waits more than two hours.
3. Hourly maintenance runs, or another large-storage preflight invokes transfer cleanup.
4. Backup manifest/chunks have original `createdAt` older than cutoff and are deleted.
5. Confirmation UI still shows the previously validated exact backup metadata.
6. User clicks Confirm.
7. Replace cannot read/normalize the staged bytes and fails.

No external corruption or browser restart is required.

## Why this is not a safety corruption

The current behavior generally fails rather than importing arbitrary other bytes. That is good.

The defect is lifecycle truthfulness/usability:

- UI continues to offer a destructive confirmation for an artifact that generic cleanup is allowed to destroy behind it;
- the user has no visible two-hour deadline;
- preview success is therefore not a stable “ready to confirm” state.

## Required contract

Choose an explicit owner-lifetime model.

### Active confirmation lease

When preview succeeds and the confirmation is displayed:

- acquire a bounded staging lease tied to exact `stagingKey` + owner page/session + import generation;
- cleanup skips/reclaims only after lease expiry/owner disappearance according to policy;
- explicit cancel/success releases it immediately;
- pagehide/crash cleanup eventually makes it reclaimable;
- lease itself has a bounded stale-owner policy so abandoned prompts do not leak 50 MiB forever.

### Or explicit user-visible expiry

If product intentionally wants a hard time limit:

- show it in the confirmation state;
- expire/close the prompt before bytes are reclaimed;
- require re-preview/revalidation rather than leaving a stale actionable Confirm button.

Silent generic TTL while UI remains actionable is the invalid state.

## Chunk-group ownership

Lease/release applies to the entire manifest/chunk group atomically at the logical level. Cleanup must not leave a partially retained active backup where some chunks were old/deleted and others appear live.

Quota pressure may still refuse unrelated new large operations, but it must not misclassify actively leased import bytes as abandoned disposable space.

## Regression cases

1. Active file-import confirmation crosses generic 2h cutoff -> either payload remains leased or UI explicitly expires before cleanup.
2. Active Yandex-restore confirmation has identical semantics.
3. Cancel -> exact payload group becomes immediately reclaimable/deleted.
4. Successful replace -> payload group released/deleted.
5. Journal page closes/crashes -> stale owner lease is reclaimed under bounded policy.
6. Two Journal tabs stage different imports -> leases remain generation/key specific.
7. Cleanup cannot delete half of an actively leased chunk group.
8. Quota pressure does not silently invalidate an active confirmation.
9. A stale/reloaded page cannot renew or consume another page generation's lease without exact receipt.
10. Preview data and eventual replace bytes remain the same exact staging generation.

## Numbering result

**P1-215 is assigned to this staging-confirmation lifetime root cause.**

P1-156 remains native Save As ownership/lifetime; P1-215 is specifically Journal import/restore staged bytes while waiting on destructive user confirmation.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LEGACY_JOURNAL_COMMENT_FILTER_COMPATIBILITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `a5d9f336a3fa314f9788242b988996a66143dda59f02a3b6e1c03cf4172f9e61`

# Audit delta — legacy `journalComment` filter compatibility — 2026-08-28

Source-of-truth `main` immediately before this write: `ddae18f5929d822f5be72088f03616275db1b460`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-009** Journal filter correctness/scalability and documents its compatibility interaction with **P1-211** comment lifecycle.

The legacy single-comment field is generally normalized well at display/export/mutation boundaries, but the current **filter predicate runs before that normalization** and can therefore fail to find a legacy comment that the same UI later displays.

## Positive control — legacy comment has a canonical runtime adapter

`normalizeJournalComments(entry)` handles an old row with no `journalComments` array entries by materializing the legacy:

- `entry.journalComment` text;
- stable synthetic id `legacy-<entry.id>`;
- created/updated timestamps;
- `deletedAt:0`.

Many output/mutation paths use this adapter:

- ordinary list/hydration returns normalized comments;
- group child reads normalize comments before returning full entries;
- export serializes `{...entry, journalComments: normalizeJournalComments(entry)}`;
- Add/Edit/Delete first normalize the legacy comment, then write the canonical `journalComments` array and clear `journalComment`/`journalCommentUpdatedAt`.

Thus first successful comment mutation canonically migrates the legacy text rather than maintaining two active comment layers.

This is a useful compatibility pattern and should remain.

## Filter predicate bypasses the adapter

`queryJournalViewPage()` and grouped query paths evaluate:

`journalViewSummaryMatches(..., { entry })`

against the raw IndexedDB entry **before** the result is hydrated with `normalizeJournalComments(entry)`.

`WebClipJournalTextFilter.commentsContain(entry, term)` currently searches:

- `entry.fileComment`;
- every `entry.journalComments[].text`.

It does **not** search `entry.journalComment` and does not itself call the shared legacy normalizer.

Therefore an old persisted Journal entry whose only user comment is still in legacy `journalComment` can be visible with that comment in the card but excluded from a `Комментарии` text-filter result for the exact same text.

## Deterministic compatibility failure

1. old-version row L has `journalComment='needle'`, empty/missing `journalComments`;
2. current Journal without comment filter hydrates L and displays `needle` through `normalizeJournalComments()`;
3. user enters Comments filter `needle`;
4. worker scans raw L;
5. `commentsContain()` sees no `journalComments` item and ignores `journalComment`;
6. L does not match and disappears from results;
7. clearing filter makes L visible again with the exact supposedly non-matching comment.

This is user-visible search correctness, not only migration cleanup.

## Why this is not a new P-number

P1-009 already owns exact Journal filter semantics across all supported Journal records and fields. Legacy rows are still supported current data until canonical migration/compaction is complete.

P1-211 governs whether deleted/new comment history remains active/searchable and how capacity is reclaimed. It does not replace the basic requirement that an **active legacy comment shown by the UI** participate consistently in the normal Comments field search.

## Required repair direction

Use one canonical comment-content adapter for every semantic consumer.

Acceptable approaches:

### Normalize for predicate

Before `commentsContain`, expose a lightweight normalized comment iterator that yields:

- current `journalComments` according to P1-211 live/history semantics;
- legacy `journalComment` only when it has not already been superseded by canonical array data.

Avoid allocating full heavyweight comment objects merely to evaluate a search predicate.

### One-time bounded data migration

Migrate remaining legacy rows to canonical `journalComments` under a durable/versioned migration marker and bounded batches, then make old-field fallback temporary/explicit.

A migration must advance Journal revision and preserve P0-076/P1-206 semantics; worker crash cannot leave the migration falsely marked complete.

Either way, display/filter/export must agree on what comment content is semantically present.

## P1-211 composition

When P1-211 chooses hard-delete vs bounded soft-history semantics, the filter adapter must implement the same rule:

- live search should not accidentally include deleted history unless explicitly designed;
- legacy active comment remains searchable;
- a future history-search option may include bounded tombstones separately.

Do not fix legacy search by blindly scanning every retained tombstone forever.

## Required regressions

1. Legacy-only `journalComment='needle'` is displayed and matched by Comments filter `needle`.
2. Legacy-only row does not duplicate the comment after hydration/export/mutation.
3. First Add/Edit/Delete canonicalizes legacy into `journalComments` and clears old scalar fields exactly once.
4. Canonical entry with non-empty `journalComments` does not also search stale leftover legacy scalar text as a second comment.
5. P1-211 deleted-history policy is applied consistently to filter after canonicalization.
6. File comment and Journal comments remain distinct supported fields under existing query semantics.
7. Import/export of old schema/legacy record produces the same visible/searchable comment content after normalization.
8. Bounded migration, if chosen, survives worker restart and does not mark completion before all intended rows are canonical.
9. High-volume filter path remains bounded under P1-009; compatibility must not materialize ~2 MiB comment arrays repeatedly when a lightweight iterator/index can suffice.
10. Journal revision changes caused by migration invalidate stale view continuations under P1-206.

## Duplicate check / numbering

No new P-number is created.

- **P1-009** remains the filter correctness/performance owner.
- **P1-211** remains deleted-comment tombstone retention/search/capacity semantics.
- **P0-076/P1-206** remain mutation/view generation dependencies for any physical migration.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_LEGACY_URLKEY_DELETE_STATS_GHOST_2026-08-28.md`

SHA-256 of UTF-8 source text: `aea700aa7f8a27ccac4d43c6e5d769cd7a49fc75b9afa73a9269ee1642f71ebf`

# Audit delta — deleting a legacy entry can leave ghost `urlStats` — 2026-08-28

Source-of-truth `main` before this checkpoint includes `89d2f5ef73bd30fb6ce62db839f169ce10b7577f`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-026** and **P1-216**. P1-216 already established that supported legacy entries without persisted `urlKey` are handled inconsistently by current-view vs older list/scoped-clear paths. This checkpoint finds the same derived-key split in a mutation path that can leave persisted `urlStats` factually wrong after a successful user delete.

## Positive control — full stats rebuild understands legacy rows

`rebuildAllUrlStats()` deliberately derives the key as:

`entry.urlKey || normalizeJournalUrl(entry.url || '')`

Therefore a legacy Journal row that predates persisted `urlKey`, but still has a valid URL, contributes to the rebuilt derived statistics.

That is necessary for backward compatibility and means `urlStats` may legitimately contain counts whose source entry has no stored `entry.urlKey`.

## Delete path uses a narrower identity rule

`deleteJournalEntryRecordOnly(id)`:

1. reads the entry;
2. starts a Journal-stats mutation marker;
3. deletes the entry and advances Journal revision;
4. **only if `entry.urlKey` is truthy**, calls `rebuildUrlStatsForUrl(entry.urlKey)`;
5. otherwise it simply completes the stats mutation marker.

It does not use the same `entry.urlKey || normalizeJournalUrl(entry.url)` fallback as full rebuild/view compatibility.

## Deterministic ghost-stat schedule

1. Legacy entry L contains valid URL U but no persisted `urlKey`.
2. Full stats repair/rebuild runs.
3. `rebuildAllUrlStats()` derives K from U and writes `urlStats[K]` with L included.
4. Chrome Action for U truthfully shows L's saved-day count.
5. User deletes L by entry id.
6. Local Journal delete commits successfully.
7. Because `entry.urlKey` is empty, delete path skips `rebuildUrlStatsForUrl(K)` and marks stats mutation complete.
8. Journal now contains no L, while `urlStats[K]` still counts it.
9. `getJournalSummaryForUrl(U)` finds the existing stale stat and returns it without triggering fallback rebuild.
10. Action badge/title can therefore keep displaying history for a deleted entry until an unrelated global stats repair occurs.

The dirty-marker protocol cannot repair this automatically because current delete explicitly completes the mutation as though derived state were consistent.

## Why this is stronger than a display-only legacy omission

P1-216 already covers legacy rows being omitted by some URL-key-dependent list/clear paths.

Here the destructive mutation itself succeeds, but its derived state commit is incomplete while being marked healthy. This belongs directly to P0-026's invariant that `urlStats` is rebuildable secondary data whose dirty/repair state must truthfully track Journal mutations.

## Required canonical derived-key helper

All Journal code that needs URL identity should use one canonical function/normalization contract, conceptually:

`effectiveEntryUrlKey(entry) = validated entry.urlKey || normalizeJournalUrl(entry.url)`

with explicit rules for invalid/legacy rows.

Use it consistently in at least:

- view summaries;
- legacy/template list matching;
- scoped clear;
- full stats rebuild;
- single-entry delete stats repair;
- any future per-entry move/update that changes URL identity;
- migration/backfill.

A stronger migration option is to backfill missing derived keys transactionally and then require the persisted key, but the compatibility period still needs one semantic rule.

## Dirty-marker rule

If deletion cannot determine/rebuild the exact affected stat key:

- leave/mark `urlStats` dirty;
- do not call the mutation complete as healthy;
- background repair can then rebuild all stats safely.

It is better to show an explicit temporarily-unconfirmed Action state than to certify stale counts.

## Required regressions

1. Legacy L `{url:U,urlKey:''}` -> full stats rebuild -> delete L -> `urlStats[U]` becomes empty/deleted immediately or remains dirty until repair; never healthy stale count.
2. Two legacy/current entries for U -> delete one legacy row -> count/day aggregation reflects only the remaining row.
3. Legacy row without valid HTTP(S) URL -> delete succeeds and stats dirty/fallback behavior is deterministic; no invented key.
4. Modern row with persisted urlKey keeps current fast targeted rebuild path.
5. Crash/failure during targeted stats rebuild leaves dirty marker so next health pass repairs it.
6. Action read during dirty/failed repair does not present stale cached stat as proven current truth; compose with P1-217 degraded-state semantics.
7. Full global stats rebuild and targeted delete use identical normalization for case/fragment/default-port rules.
8. Import/backfill followed by delete does not create duplicate old/new stat keys.

## Duplicate check / numbering

No new item is created.

- **P0-026** owns Journal ↔ `urlStats` consistency and dirty/self-repair semantics.
- **P1-216** owns legacy missing-`urlKey` semantic parity across Journal paths.
- **P1-217** remains Action degraded truth when the current summary cannot be proven.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LEGACY_URLKEY_SCOPED_CLEAR_PARITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `25b63b2d25de540777cbfb17c46dcfd13d9c341c1e6ef68470099ec2ccec77b4`

# Audit delta — URL-scoped Journal clear must include supported legacy rows without `urlKey` — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-216** — read/view compatibility and destructive URL-scoped clear must use the same canonical URL identity domain for supported legacy Journal entries.

This is adjacent to P1-189 imported/legacy site identity and P1-032 direct cursor view compatibility, but it is a distinct false-negative destructive-scope defect.

## Source proof

Current Journal view code explicitly documents legacy support:

> Use the universal `createdAt` index so legacy entries without newer derived compound-index fields remain visible; predicates are evaluated per cursor row.

`journalViewSummary(entry)` derives/falls back to current URL/site semantics for display/filtering.

`clearJournalEntries({ url })` takes a different path. For URL scope it computes canonical `urlKey`, then scans only:

```js
store.index('urlKey').openCursor(IDBKeyRange.only(urlKey))
```

An IndexedDB index does not contain a record whose indexed key-path is missing.

Therefore an otherwise supported legacy row with a valid `entry.url` but no persisted `entry.urlKey` is invisible to this destructive cursor.

Site-scoped clear is different: it scans the primary store and derives `getJournalSiteKey(entry.url || entry.hostname || '')` row-by-row, so this exact gap is URL-scope specific.

## Deterministic failure

1. Database contains legacy entry L with `url=https://example.test/a`, but no `urlKey` field.
2. Current Journal view reads L through `createdAt` and recognizes it as matching the current URL using derived semantics.
3. User chooses clear for that exact URL.
4. Worker computes canonical `urlKey=https://example.test/a`.
5. `urlKey` index cursor returns only newer rows that physically store the derived field.
6. L survives the clear.
7. Reload/view still shows L for the URL the user just cleared.

No race or malformed current-version import is required; this follows from the code's own supported-legacy compatibility comment.

## Required contract

Choose one canonical strategy:

### Migration/backfill before scoped operations

- detect legacy rows lacking required derived keys;
- boundedly backfill canonical `urlKey/siteKey` from trusted normalized URL;
- mark migration complete with a durable schema/revision marker;
- then indexed destructive operations may rely on the derived index.

### Or legacy-aware scoped scan

- URL clear scans a compatible cursor and derives canonical URL identity per row, like the view path;
- use bounded transaction/time policy appropriate to up to 100k Journal rows;
- indexes remain an optimization, not a semantic exclusion of supported rows.

A hybrid indexed path may be used after a proven migration marker, with fallback while migration remains incomplete.

## Pending checkpoint parity

Scoped clear also prunes pending local/remote Journal checkpoints by deriving `pendingMeta.url`. That row-by-row logic already demonstrates the intended semantic model: absence of a persisted derived key must not exempt a matching logical URL from the scope.

## Regression cases

1. New row with canonical `urlKey` -> URL clear removes it.
2. Supported legacy row with URL but no `urlKey` -> same clear removes it.
3. Mixed old/new rows for one URL -> all removed atomically according to clear semantics.
4. Other URL on same site remains untouched.
5. Site-scoped clear retains current behavior and full-PSL semantics.
6. Missing/invalid legacy URL is not guessed into the requested scope.
7. Pending appends/download/remote checkpoints for the exact URL are pruned consistently.
8. Large legacy Journal stays bounded; repair does not introduce an unbounded synchronous full scan on the extension page.
9. Clear/import Journal generation fences under P0-076 remain intact.

## Numbering result

**P1-216 is assigned to this legacy derived-key parity root cause.**

P1-189 remains canonical imported hostname/site-routing provenance. P1-216 specifically owns the mismatch where read compatibility recognizes a legacy URL row but URL-scoped destructive clear excludes it because its derived index field is absent.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LEGACY_URLKEY_TEMPLATE_LIST_PARITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `5db7c82722b9f449e6e13eb2d0b0545c5128f3e33c2e475ec8373aae167d27a3`

# Audit delta — legacy URL identity parity in `WEBCLIP_JOURNAL_LIST` — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number. This is a direct extension of **P1-216**.

## Source proof

`listJournalEntries({url})` scans the universal `createdAt` index, but its URL predicate is:

```js
const matches = urlKey ? entry.urlKey === urlKey : ...
```

Unlike the newer direct Journal view predicate, it does not derive/fallback `normalizeJournalUrl(entry.url)` when the persisted `urlKey` field is missing.

`WEBCLIP_JOURNAL_LIST` uses this helper for both extension pages and content scripts. For content scripts, the worker ignores a caller-supplied arbitrary URL and safely derives `currentUrl` from `sender.tab.url`, then requests current-URL entries through this same helper.

## User-visible consequence

A supported legacy row L with a valid matching `url` but no persisted `urlKey` can therefore be in three contradictory states:

- visible in the modern Journal current-URL view;
- absent from `WEBCLIP_JOURNAL_LIST` current-URL results/template candidates;
- not removed by URL-scoped clear before the P1-216 repair.

Site mode does not have this exact gap because `listJournalEntries()` derives site identity row-by-row from `entry.url || entry.hostname`.

## Required P1-216 contract

The common canonical URL-identity helper/migration introduced for P1-216 must be consumed by:

1. Journal direct page view;
2. `WEBCLIP_JOURNAL_LIST`;
3. content current-URL template retrieval;
4. URL-scoped clear;
5. any future URL-keyed Journal action;
6. `urlStats` rebuild/summary semantics.

An index is an optimization only after a durable migration proves every supported row owns the indexed derived field.

## Regression cases

- legacy row without `urlKey` is returned to content for its exact current URL;
- the same row appears in Journal current-URL mode;
- URL clear removes the same row;
- site mode behavior remains unchanged;
- unrelated URL on the same site is not returned in current-URL mode;
- current-format indexed rows retain fast/correct behavior;
- invalid legacy URLs are not guessed into a scope.

## Duplicate check

This is not P1-217. P1-216 owns semantic parity for supported legacy rows whose derived URL index field is absent; list/template and clear are two manifestations of the same identity split.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_RESTORE_ENVELOPE_2026-08-27.md`

SHA-256 of UTF-8 source text: `f72305a17a40f28e404469b99473b3752021c6aa95ec205fe2cdba4707e120aa`

# Journal live/export/import envelope audit delta — 2026-08-27

Baseline source HEAD: `d3f14fe937133625a361d6ce6f8bd32370fdb8e9`.

This is a lossless checkpoint for existing P0-077. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-077 refinement — a valid live entry can exceed the export single-entry envelope

P0-077 already records two self-generated backup/restore mismatches:

- export can produce 50–64 MiB UTF-8 while import rejects >50 MiB bytes;
- live Journal can exceed 100000 compact entries while import caps `maxEntries: 100000`.

Fresh review found an earlier mismatch in the same unified live→export→import contract.

### Current limits

Live Journal allows independent bounded heavy fields on one entry, including at least:

- `selectionSnapshot` aggregate JSON budget up to about 2 MiB (`MAX_SELECTION_SNAPSHOT_JSON_CHARS = 2 * 1024 * 1024`);
- aggregate comment text up to about 2 MiB (`MAX_JOURNAL_COMMENTS_TOTAL_CHARS = 2 * 1024 * 1024`), plus comment object/ID/timestamp JSON overhead;
- `fileComment` up to 100000 characters;
- additional title/URL/resource report/Yandex/selection metadata.

These limits are independently valid; no live-entry aggregate admission forces their combined serialized record below 4 MiB.

Export batch reading does:

```text
json = JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })
if (json.length > JOURNAL_EXPORT_BATCH_MEMORY_CHARS /* 4 MiB */)
    throw JOURNAL_EXPORT_ENTRY_TOO_LARGE
```

Import, by contrast, permits a single source entry up to `MAX_JOURNAL_IMPORT_ENTRY_CHARS = 8 MiB`.

Therefore a record that WebClip can validly create and store locally can be larger than the 4 MiB export-single-record cap and make **both local full export and Yandex backup fail before a backup exists at all**. This is distinct from but shares the same root cause as the already documented “backup succeeds but same version cannot restore it”.

## Required broader P0-077 contract

Treat P0-077 as the unified **live Journal → export/backup → import/restore envelope** invariant:

1. Every state accepted as a normal live Journal profile must have a supported, explicit path to a self-generated recovery artifact.
2. Every artifact WebClip reports as successfully created must be importable by the same version.
3. A per-entry export batch-memory target must not silently become a stricter product data limit than live-entry admission.
4. If product policy chooses a true maximum serialized entry size, enforce that authoritative aggregate before live commit and use the same versioned bound in export and import.
5. If large but valid live entries remain allowed, export must stream/chunk a single record without requiring the entire serialized entry to fit a 4 MiB batch buffer. Simply raising the batch cap without a complete memory envelope is not sufficient.
6. Existing profiles already above a newly chosen bound must not become unrecoverable; provide a bounded migration/export path or a clearly defined compatibility mode.
7. Total chars, UTF-8 bytes, per-entry serialized size and entry count must all be part of one versioned envelope rather than independent constants that can drift.

## Required deterministic boundaries

Add at least:

1. One live-valid entry with selection snapshot near 2 MiB + comments near 2 MiB + non-empty file comment/metadata. It must either be rejected at live admission under one documented aggregate limit **before storage**, or successfully full-export and restore.
2. Single entry just below/above the chosen serialized-entry boundary.
3. High-Unicode total where chars ≤ current text cap but bytes cross import byte cap (existing P0-077 case).
4. Compact Journal around the chosen total entry-count boundary (existing P0-077 case).
5. Round-trip assertions that export/import preserve the same accepted heavy fields without hidden truncation.

## Existing related items, not duplicates

- **P1-053/P1-073**: export time/deadline/transaction budget; they do not define which valid records must be exportable.
- **P1-054**: offscreen Blob resource budget; it does not justify rejecting a live Journal record solely because the export batch implementation is 4 MiB.
- **P0-055**: comment aggregate boundary; it is one component of the live entry envelope.
- **P0-054**: selection snapshot aggregate boundary; likewise one component, not a total entry envelope.
- **P1-051**: export byte accounting; necessary but not sufficient for restore compatibility.

No new P0/P1 number is assigned because P0-077 already explicitly calls for one versioned restore envelope spanning live Journal, local export/import and Yandex backup/import.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.

## Retired source: `AUDIT_DELTA_STORAGE_PRESSURE_IMPORT_STAGING_RECLAIM_2026-08-28.md`

SHA-256 of UTF-8 source text: `a3053811a216b22a160c5ec63bef5e4fed7708723d555b443216ff22073481bf`

# Audit delta — storage-pressure reclaim of expired normalized import staging — 2026-08-28

Source-of-truth `main` immediately before this write: `a622b155f3cedad16e95e8d8a96dd60c94609435`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-043** global large-storage admission/quota handling and **P1-035** temporary Journal import-staging lifecycle.

The current low-quota preflight correctly refuses to delete Journal source-of-truth/checkpoints automatically. Preserve that rule.

The gap is narrower: quota-pressure cleanup omits one class that the same product already considers disposable once expired — normalized Journal import staging.

## Current `ensureStorageBudget()` reclaim set

When `navigator.storage.estimate()` reports insufficient free space, `ensureStorageBudget()` attempts reclaim before failing the new operation.

Current reclaim includes:

- `cleanupTransferPayloads()`;
- `cleanupExpiredPdfCache()`;
- old OperationLog cleanup according to retention settings.

It then re-runs the storage estimate and, if still short, returns `WEBCLIP_STORAGE_QUOTA_LOW` saying temporary data was already cleaned.

It does **not** call `cleanupExpiredJournalImportStaging()`.

## The omitted staging store is already explicitly temporary/disposable after TTL

`JOURNAL_IMPORT_STAGING_STORE` contains normalized entries created during the destructive import pipeline.

The project already defines:

`JOURNAL_IMPORT_STAGING_TTL_MS = 2h`

and hourly/background maintenance includes:

`cleanupExpiredJournalImportStaging()`.

Thus this is not a proposal to delete live Journal content or unknown remote recovery evidence. The codebase already classifies expired normalized import staging as reclaimable temporary state.

## Deterministic low-quota schedule

1. Import normalization generation A creates a large `importStaging` set.
2. Its page/operation disappears or cleanup of that exact staging generation is missed because of a crash window.
3. A ages beyond the existing 2-hour orphan TTL.
4. Hourly maintenance has not yet run, or its staging-cleanup stage previously failed.
5. User starts another large PDF/import/export operation B.
6. `ensureStorageBudget(B)` observes low free space.
7. It cleans expired transfer/PDF/log data but not expired importStaging A.
8. Re-estimate still fails because A occupies the recoverable space.
9. B is rejected as storage-low even though WebClip already has a safe, product-defined expired staging class that could have been reclaimed synchronously.
10. A later hourly maintenance may delete A, after which the same B succeeds without any real user-storage change.

This is bounded availability/cleanup truthfulness, not Journal corruption.

## Composition with P1-035 active-owner semantics

Do **not** fix this by deleting every normalized import stage under pressure.

P1-035 already requires a distinction between:

- live/actively owned staging;
- expired/orphan staging.

The storage-pressure path may reclaim only a generation that is safe under the final P1-035 lifecycle policy.

If the product chooses owner leases, pressure cleanup must respect a fresh live lease.
If the product chooses explicit confirmation expiry, pressure cleanup may delete only after that expiry has invalidated Proceed.

The same exact-generation compare/delete rules apply; pressure must not race a newer staging generation or active destructive import.

## Composition with P1-043 quota reservation

This cleanup refinement does not close P1-043 itself.

Even after reclaiming every safely expired temporary object, the current preflight remains snapshot-only and multiple large writers can reserve the same apparent free bytes concurrently.

Required architecture remains:

1. reclaim only safe disposable data;
2. obtain/update global storage reservation for the new writer;
3. materialize/commit under that reservation;
4. release reservation only after actual commit/abort/owned cleanup;
5. `QuotaExceededError` remains a second fail-safe.

Expired-staging cleanup improves reclaim completeness but is not a substitute for reservation.

## User-facing error truthfulness

Current low-quota error says temporary data has already been cleaned.

That claim should only be made after every **currently safe and intended** temporary-reclaim class has been attempted, including expired import staging once P1-035 ownership is known.

If a large temporary object is intentionally retained because it has an active/unknown owner, report storage pressure truthfully rather than implying all temporary data was disposable and removed.

## Required regressions

1. Expired orphan normalized import staging consumes enough quota to block B -> pressure preflight reclaims exact expired A and B can proceed if budget then suffices.
2. Active confirmation/staging under P1-035 is never removed merely because free space is low.
3. Newer staging generation sharing related source metadata is not removed by cleanup of old generation A.
4. Cleanup failure remains bounded and B either proceeds from remaining budget or returns truthful quota-low.
5. Journal entries, pending local/remote recovery checkpoints and unknown-side-effect receipts are never deleted for admission.
6. Expired transfer/PDF/log cleanup behavior remains intact.
7. P1-043 two-concurrent-large-writer test still fails closed/reserves correctly; reclaim does not hide reservation race.
8. Pressure cleanup followed by hourly maintenance is idempotent.
9. Error text does not claim all temporary data was cleaned when live/unknown retained staging is intentionally protected.
10. Crash after staging becomes expired but before ordinary hourly cleanup is enough for the next large preflight to reclaim it safely.

## Duplicate check / numbering

No new P-number is created.

- **P1-043** remains global quota reservation/admission and low-space preflight owner.
- **P1-035** remains import staging live-owner vs orphan/expiry lifecycle.
- **P1-194** remains IndexedDB eviction/durability class; reclaiming expired staging does not prove persistent-storage safety.
- **P1-211** remains deleted-comment tombstone lifecycle and is unrelated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

