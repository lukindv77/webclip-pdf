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
