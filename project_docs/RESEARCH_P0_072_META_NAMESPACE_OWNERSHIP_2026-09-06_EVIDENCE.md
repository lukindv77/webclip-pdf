# P0-072 — WebClipJournal.meta namespace ownership — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 00e0398a073f2e59048a291c311864d1fbf5b215`  
Deterministic model commit: `1c30157165634b76b7e2cd07ce2feb51b7cb6783`  
Owner: **P0-072 ACTIVE**.

This checkpoint freezes ownership of the `WebClipJournal.meta` key domains selected for P0-072. Runtime/manifest remain unchanged.

## 1. Fresh current-source positive control

Current `service-worker.js` writes Journal-meta records under fixed keys only:

- `revision` through `touchJournalDbRevision()`;
- `journalImportLease` for import lease/checkpoint state;
- `webclipJournalBackupLease` for backup lease state.

Current source search found the Journal-meta `put({ key: ... })` writes bound to those fixed constants; none is derived from imported/user URL/path/id data.

The similarly named PDF-cache `meta` store is a different IndexedDB database/store and is not relevant to `WebClipJournal.meta` ownership.

## 2. Journal page is a schema opener, not a meta writer

Fresh `journal.js` revalidation confirms:

- it independently opens `WebClipJournal` at version 7;
- it creates `meta` during `onupgradeneeded` if missing;
- it contains no current `meta.put()` writer for Journal metadata.

Therefore the current tree has no second dynamic Journal-meta writer that collides with the proposed P0-072 namespaces.

This does not remove the broader P2-019 shared-schema-owner concern; it only proves present key-domain compatibility.

## 3. Reserved P0-072 domains

Reserve these Journal-meta domains:

```text
journalLocalTokenSalt:v1            exact key
legacyPendingFence:v1:<token>       reserved prefix
externalEffect:<effectId>           reserved prefix
```

Their meanings are distinct:

- `journalLocalTokenSalt:v1` — installation-local pseudonymization salt;
- `legacyPendingFence:v1:` — historical Chrome-Storage anti-rematerialization tombstones;
- `externalEffect:` — trusted local physical-effect receipt namespace.

## 4. Generic meta writers may not enter reserved domains

Any future unrelated Journal-meta feature must treat the three domains above as reserved.

Required behavior:

```text
unrelated/generic meta writer + reserved key -> fail closed / programmer error
```

Do not allow a generic helper such as `putMeta(key, value)` to accept arbitrary caller keys and overwrite a P0-072 record.

P0-072 owner helpers may write only their own exact domain.

## 5. Why prefix ownership matters

The reset/capacity/cleanup algorithms rely on prefix enumeration having one semantic owner.

If an unrelated feature were allowed to write, for example:

```text
externalEffect:some-unrelated-cache
```

then the P0-072 scan would correctly classify it as malformed reserved-root state and fail closed. That would be safe but would turn a namespace collision into a persistent reset failure.

Explicit domain ownership prevents that avoidable failure class.

## 6. Existing keys are non-overlapping

The currently used fixed keys:

```text
revision
journalImportLease
webclipJournalBackupLease
```

are outside every reserved P0-072 domain.

No data migration/rename is therefore required before introducing the P0-072 meta keys.

## 7. Import/export boundary

Journal import/export must not accept arbitrary Journal-meta keys from portable data.

The existing direction remains:

- Journal entries are portable logical data;
- P0-072 local salt/fences/external-effect receipts are local operational authority;
- portable import cannot create or overwrite reserved meta keys.

This checkpoint does not change the current Journal export envelope.

## 8. Cleanup boundary

Generic Journal-meta cleanup must never scan/delete unknown reserved P0-072 keys.

Each reserved namespace owns its own bounded lifecycle:

- local salt persists while dependent tokenized state can exist;
- legacy fences are bounded installation-lifetime tombstones for the finite historical source;
- external-effect receipts use their dedicated active/manual/terminal retention contract.

## 9. Deterministic model

Added:

`project_tools/test_p0_072_meta_namespace_ownership_model.js`

Local Node result before durable write:

```text
P0-072 journal meta namespace ownership model: PASS
```

The model proves current fixed keys do not collide with the reserved domains and that a generic writer classifier rejects reserved keys.

## 10. Runtime acceptance addition

Before P0-072 later meta-receipt integration is considered implemented, committed-source tests should prove:

- all P0-072 meta key construction passes through owner-specific helpers;
- generic/unrelated meta writes cannot target reserved prefixes;
- Journal import does not synthesize reserved keys;
- `journal.js` remains read/schema-only for these operational namespaces unless a future explicitly owned feature changes that architecture.

## 11. Status

P0-072 remains **ACTIVE**. Runtime, `service-worker.js`, `journal.js`, IndexedDB version and manifest are unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
