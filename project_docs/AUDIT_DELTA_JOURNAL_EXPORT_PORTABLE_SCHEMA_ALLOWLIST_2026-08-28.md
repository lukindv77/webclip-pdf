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