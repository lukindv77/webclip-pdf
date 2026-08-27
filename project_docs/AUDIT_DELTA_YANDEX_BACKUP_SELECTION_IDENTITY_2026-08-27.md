# Audit delta — Yandex backup selection identity — 2026-08-27

Baseline HEAD before this audit block: `c80cd31ab606fc71ac62546484d0e92eb3126dad`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh audit of the explicit Yandex Journal backup picker from LIST through user selection, signed download and replace-import. Primary owner: existing `P0-013`; dependencies: `P0-074`, `P1-139`, `P2-011` and import staging safety.

## Result

`P0-013` must be refined/reopened from a path-selection guarantee to an **exact selected backup-object identity** guarantee. The UI currently displays metadata for one remote object but persists only its path. The worker later downloads whichever object currently occupies that path, without re-reading/comparing metadata before issuing `/resources/download`.

No new P-number is created.

## Exact runtime proof

### LIST already has useful object metadata

`listJournalBackupsOnYandex()` enumerates the selected month with:

- `name`;
- `path`;
- `type`;
- `size`;
- `modified`.

It filters to `WebClip_Journal_*.json`, returns those records, and sorts mainly by `modified`.

### UI discards the selection receipt

`journal.js` keeps only:

`let selectedYandexBackupPath = '';`

For each radio item, the change handler assigns only `radio.value` (the path) to `selectedYandexBackupPath`. The already returned/displayed `size` and `modified` are not retained as confirmation authority.

`importSelectedYandexBackup()` then copies only that path and sends:

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP { path, operationId }`.

### FETCH resolves the current path, not the selected object

`fetchJournalBackupFromYandex(requestedPath, operationId)`:

1. normalizes the path;
2. fresh-reads current backup root and checks path containment;
3. immediately calls `GET /resources/download?path=<remotePath>`;
4. follows the returned signed URL via offscreen `text-download`;
5. parses/previews the downloaded JSON and later requires the normal 9-digit replace confirmation.

There is no fresh `GET /resources` metadata lookup for the chosen file before obtaining the download link, and no comparison to the metadata the user selected in the picker.

Therefore a same-account/same-root replacement can change object A into object B under the identical path between LIST and FETCH. The user visibly selected A, but WebClip downloads B. If B is a syntactically valid WebClip backup, normal schema validation and the later 9-digit confirmation cannot detect that the selected remote object changed; the confirmation is then for the already downloaded replacement payload.

Path containment is necessary but does not prove selected-object identity.

## Classification

This is not a new `P1-198` root cause. `P0-013` already states that Yandex import must require explicit selection of a **concrete backup file**. A path that can resolve to a different object later is insufficient evidence that the concrete selected file is still the one being imported.

`P0-074` remains separate: it owns immutable account/root/auth/config generation across long Yandex operations and stale selection after reauth/root change. This checkpoint adds same account/root, same path, **different object generation**.

`P1-139` remains picker request ordering/single-flight and does not solve selected-object identity.

`P2-011` currently says backup listing should request only metadata actually used. Once selection identity uses additional metadata, requesting it is no longer overfetch and the P2-011 acceptance should be interpreted accordingly.

## Required P0-013 refinement

The picker must retain a bounded immutable selection receipt, not only a path. At minimum it should bind:

- account/root/config generation from the listing operation (P0-074);
- normalized path;
- size;
- modified/revision-like metadata when available;
- a stable Yandex `resource_id` when the actual API response exposes it and its semantics have been verified for this operation.

Immediately before `/resources/download`, the worker must fresh-read exact metadata for the path under the same immutable Yandex operation context and compare it with the selected receipt.

A stable verified object identifier should dominate weaker fields. Size/modified can be useful mismatch evidence but must not be presented as cryptographic/content identity. If the current API cannot provide a trustworthy stable object identity for this path, the safe fallback is to require all available selected metadata to remain unchanged and fail-closed/reselect on any mismatch rather than silently importing a replacement.

The selection receipt is authorization to import **that selected remote version**, not general authorization to import future content at the same path.

After issuing the signed download URL, preserve the same operation context. If object identity can change between metadata verification and signed-link issuance and the API offers no atomic conditional download, treat this as a bounded residual race requiring real Yandex E2E characterization; do not claim stronger atomicity than the API provides.

The downloaded JSON must still pass all existing streaming size/schema/import-provenance boundaries and the 9-digit destructive replace confirmation. Object identity validation is additional, not a replacement for content validation.

## Required regressions

1. LIST returns object A; A remains unchanged; FETCH imports A successfully after ordinary confirmation.
2. LIST A → external replacement B at same path with different size: Proceed fails and requires reselect; B is not imported.
3. LIST A → replacement B with same size but different stable `resource_id`/revision when available: Proceed fails.
4. LIST A → replacement valid WebClip JSON B at same path: schema validity does not bypass selected-object mismatch.
5. Account/root changes after selection: existing P0-074 fence fails closed before download.
6. Late/stale picker LIST response cannot replace a newer selection (preserve P1-139 generation semantics).
7. If API omits stable identity, changed `modified`/other selected metadata fails closed rather than being ignored.
8. Signed-download failure/timeout leaves the local Journal unchanged and does not automatically retry the destructive import.

## External API note

Current WebClip runtime already consumes Yandex `resource_id` on multiple private-resource metadata paths, and current third-party clients/spec-derived integrations expose `resource_id`/revision-like fields. This checkpoint does **not** assume undocumented atomic or immutable semantics from those fields. The implementation must verify real Yandex REST behavior/E2E before treating any field as a stable object receipt.

## Numbering

- Reopen/refine existing `P0-013`.
- Preserve `P0-074` for account/root/auth/config generation.
- Preserve `P1-139` for picker single-flight ordering.
- No `P0-079`, `P1-198` or `P2-020` assigned by this block.

Previous product test gate was not re-run by this docs-only checkpoint.