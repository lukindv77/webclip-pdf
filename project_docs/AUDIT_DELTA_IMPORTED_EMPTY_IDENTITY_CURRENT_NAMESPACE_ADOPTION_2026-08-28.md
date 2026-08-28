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
