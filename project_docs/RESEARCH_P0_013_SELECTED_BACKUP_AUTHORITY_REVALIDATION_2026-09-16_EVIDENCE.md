# Research evidence — P0-013 selected Yandex backup authority revalidation — 2026-09-16

Canonical baseline: `main` at `36a9629abacdfbb2284b52cdd77a5fdf3822a43a`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Owner and semantic-dedup decision

Current canonical owner:

> P0-013 — Restore/import selection authority must be bound to the exact explicitly selected backup object/staging receipt; old selection/file identity cannot silently retarget.

No new P-code is allocated.

Adjacent owners remain separate:

- **P0-074** owns the immutable auth/account/root/config/publication operation context once a Yandex operation is admitted. It does not prove that the path submitted by the picker still denotes the object the user selected earlier.
- **P0-073** owns restart/recovery namespace binding for unresolved remote-save operations.
- **P0-022** owns destructive authority for imported/legacy Yandex locator metadata; restore selection itself is not a destructive remote-object lookup.
- **P0-076** owns Journal per-entry revision / replacement-generation CAS.
- Journal import lease / `contentSha256` machinery protects the already-staged bytes and local replace confirmation; it cannot prove that those bytes came from the remote object the user originally selected.
- **P0-066** owns URL confidentiality and does not change restore-object identity semantics.

This tranche therefore extends P0-013 only.

## Fresh-current source baseline

Fresh source was re-read at exact canonical `main` `36a9629abacdfbb2284b52cdd77a5fdf3822a43a`.

Exact source blobs:

- `journal.js` — `1138e4fbf177e31008f510bc1addfd539885f10e`
- `service-worker.js` — `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`

The recent research-only merges do not change these runtime blobs.

## Fresh root-cause proof

### 1. The picker displays a richer row but remembers only `path`

The Yandex backup picker renders:

- `file.name`;
- `file.monthFolder`;
- `file.modified`;
- `file.size`;
- `file.path`.

However the selected state is one string:

```js
let selectedYandexBackupPath = '';
```

and the radio change handler reduces the chosen row to:

```js
selectedYandexBackupPath = radio.value;
```

No selected-row `size`, `modified`, resource identity, namespace identity, list generation or worker-minted receipt is retained.

### 2. Existing list-generation control is a useful positive control, but only for async UI freshness

`loadYandexBackupsForCurrentMonth()` increments:

```js
const generation = ++yandexBackupListGeneration;
```

and rejects an old async response when:

```js
if (generation !== yandexBackupListGeneration) return;
```

This correctly prevents an older month-list request from overwriting a newer picker view.

It does **not** bind a row that was validly rendered to the remote object that still exists at Proceed time. After rendering, the path may resolve under a different account/root generation or the object at that path may be replaced.

### 3. The worker list itself currently returns only weak object metadata

`listJournalBackupsOnYandex()` reads the current Yandex status/root, ensures the service folders, chooses the month folder and calls:

```js
listYandexResourceItems(monthPath, {
  maxItems: 50000,
  maxCollectedItems: 5000,
  itemFields: ['name', 'path', 'type', 'size', 'modified'],
  filter: ...
});
```

Thus the current picker list does not request `resource_id`, revision or content hash. The result sent to the UI is:

```js
{ ok: true, journalRoot, selectedMonth, monthPath, files }
```

The UI then discards even `size`/`modified` when it stores the selected row.

`path + size + modified` would still not be sufficient as exact object authority: a replacement can collide on those attributes. They are useful corroborating fields, not an immutable selected-object receipt.

### 4. Proceed transmits only the stale path

`importSelectedYandexBackup()` snapshots:

```js
const path = selectedYandexBackupPath;
```

and sends:

```js
{
  type: 'WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP',
  path,
  operationId,
  ownerSessionId: journalImportOwnerSessionId
}
```

There is no selected-list generation or selected remote-object fingerprint in the command.

### 5. Fetch resolves that path again in the **current** namespace

`fetchJournalBackupFromYandex(requestedPath, ...)`:

1. normalizes the requested path;
2. fresh-reads `getJournalBackupStatus()`;
3. calls `ensureYandexServiceFolders({ includeBackup: true, operationId })`;
4. verifies only that the path is under the current `structure.journalPath`;
5. calls Yandex `/resources/download` with `query: { path: remotePath }`;
6. downloads whatever object that current path resolves to.

The root containment check is necessary, but it proves only location under the current backup root. It does not prove equivalence with the row the user selected earlier.

Two concrete schedules remain possible:

#### Account/root retarget

1. Picker lists object A under account/root namespace A.
2. User selects A; UI retains only textual path P.
3. Before Proceed, active Yandex auth/root changes to namespace B.
4. Namespace B contains another valid backup at textual path P.
5. Fetch starts under current namespace B and accepts P because it is inside B's current Journal root.
6. Object B is downloaded even though the user selected A.

P0-074 can make the newly admitted fetch operation internally immutable once step 5 begins, but it cannot recover the lost selection-time namespace/object identity.

#### Same-account same-path replacement

1. Picker lists A at path P.
2. User selects A.
3. A is deleted/replaced or overwritten by object B at the same path P.
4. B can even share the same displayed size/mtime.
5. Proceed supplies only P.
6. Current fetch downloads B.

URL/path equality is not remote object identity.

### 6. Existing staged-byte integrity starts too late

After the path-based download, current worker has strong local staging controls:

- offscreen payload staging;
- streaming parse/validation;
- `contentSha256`;
- exact preview receipt;
- import lease bound to owner session;
- expected Journal revision;
- lease/preview receipt equality before atomic replace.

This is an important **positive control**.

But if path P has already retargeted from selected A to B, the worker will compute a perfectly valid `contentSha256` for B. The preview/lease system then faithfully proves “these staged bytes are B” — not “B is the object the user selected as A”.

P0-013 therefore requires a remote-object selection receipt **before** the existing staged-byte receipt, and the two receipts must be linked.

## Deterministic failure/acceptance model

Added model:

`project_tools/test_p0_013_selected_backup_receipt_revalidation_model.js`

Local preflight:

- `node --check`: PASS
- deterministic execution: **PASS 57 checks**
- SHA-256: `8ef3e56036427865fbd6f175d5866e78dee0d7e17f5424045f8f0b8f7810f65c`
- expected Git blob: `87c977e2bef937c24ebbe20dc05a6b10a1602a4e`

The model covers:

1. current rich row → path-only selected state;
2. same textual path after account switch;
3. same-account same-path replacement;
4. same-path/same-size/same-mtime negative control;
5. root-containment being insufficient for object identity;
6. selection receipt binding account/root/namespace generation;
7. picker/list generation;
8. path/type;
9. `resourceId`, revision and/or digest as strong identity signals;
10. mandatory strong identity instead of path+mtime+size only;
11. fail-closed namespace change;
12. fail-closed root change;
13. fail-closed same-path object replacement;
14. fail-closed metadata drift;
15. pre-download and post-download object revalidation;
16. staged byte digest mismatch;
17. correct selected object → staged receipt containing both selection authority and `contentSha256`;
18. valid digest of the wrong object as a negative control;
19. owner-session/import lease as an orthogonal later-stage authority;
20. outside-root and non-file selection rejection.

The model does not claim that `resource_id` alone is permanently stable under every Yandex operation. It intentionally accepts a versioned **strong-object fingerprint contract** built from the strongest fields the API can reliably expose and verify.

## Required architecture / implementation acceptance

P0-013 should close only when fresh implementation and real Yandex evidence prove all of the following.

### A. Worker-minted selection receipt, not a naked path

The picker list must provide, or explicit row selection must obtain, an immutable receipt containing at least:

- receipt schema/version;
- account identity or opaque account-generation identity;
- normalized configured root / Journal root;
- namespace/config/auth generation compatible with P0-074;
- picker/list generation;
- normalized path and type;
- size and modified time as corroborating metadata;
- one or more strong object/version signals exposed by Yandex, for example `resource_id`, revision and/or content digest where available.

The UI should retain the whole receipt (or a worker-owned opaque receipt id), not only `path`.

A receipt with only path/name/size/mtime is not sufficient for exact object authority.

### B. Proceed must carry the exact selected receipt

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP` must be admitted from the exact row receipt selected by the user.

If the picker is refreshed, month changes, account/root changes, or the selection is otherwise invalidated, the old receipt must become unusable rather than being rebound to the new state.

### C. Namespace equality before remote I/O

Before requesting a download link, the worker must compare the selected receipt with the current immutable Yandex operation context.

At minimum a mismatch in:

- account;
- configured root / derived Journal root;
- namespace/config generation;

must fail closed and require re-list/re-selection.

A path that happens to exist in the new namespace must not rescue the old selection.

### D. Fresh remote metadata equality before download

Immediately before the download-link request, the worker must fresh-read metadata for the selected path and compare it with the selected receipt.

Required fail-closed cases include:

- missing resource;
- non-file resource;
- path mismatch;
- strong identity/version mismatch;
- size/modified mismatch when those fields participated in the receipt.

If Yandex's documented semantics do not provide a field strong enough to distinguish the selected object from a replacement, WebClip must not pretend that `path + size + modified` is exact identity. It should require a re-list/re-confirm strategy or another accepted capability/receipt mechanism.

### E. Race fence across download

A pre-download metadata check alone still leaves a TOCTOU window.

The implementation must fence replacement while obtaining/using the download capability. Acceptable designs may include:

- a Yandex capability that is demonstrably bound to the checked object/version;
- post-download metadata revalidation against the same strong receipt;
- content digest comparison where Yandex supplies a trustworthy resource digest;
- a combination of those controls.

If a replacement/move/delete occurs during the download window, staged bytes must be discarded or marked invalid, not silently admitted as the selected backup.

### F. Compose with the existing staging/preview receipt

After remote selection authority succeeds, the existing staged-byte machinery remains authoritative for local replacement.

The preview receipt should carry or cryptographically/deterministically reference the selected-backup receipt so the user confirmation means:

> replace my Journal with the exact bytes downloaded from the exact remote backup object I selected.

`contentSha256` remains the exact byte-generation receipt.

Selection receipt and content receipt are complementary; neither should be substituted for the other.

### G. Preserve current positive controls

Closure must retain:

- picker async list-generation suppression;
- allowed Journal backup root restriction;
- bounded download/staging;
- streaming JSON validation;
- `contentSha256`;
- import owner-session lease;
- expected Journal revision;
- atomic Journal replacement / fail-closed stale revision behavior.

P0-013 must strengthen selection authority without weakening the already implemented later-stage protections.

### H. Direct regression matrix

At minimum direct tests must cover:

1. list A → select A → no changes → restore succeeds;
2. list A → account changes to B → same textual path exists → fail/relist;
3. list A → root changes → fail/relist;
4. list A → A replaced at same path → fail/relist;
5. replacement has same size and modified timestamp → still fail via strong identity;
6. A renamed/moved after selection → no heuristic retarget;
7. A deleted → explicit stale-selection error;
8. old async list result after month change → still ignored (existing positive control);
9. replacement during preflight/download window → staged data discarded;
10. correct A download → content SHA bound into preview receipt;
11. after preview, another page steals/invalidates import lease → existing fail-closed behavior remains;
12. Journal revision changes before commit → existing fail-closed behavior remains;
13. worker restart, if selection receipt is expected to survive it, preserves exact receipt semantics rather than reconstructing authority from path.

## External revalidation — 2026-09-16

### Vendor/API

**Yandex Disk REST API — official introduction**

https://yandex.com/dev/disk-api/doc/en/

The official documentation defines Yandex Disk files/folders as resources managed through REST requests and exposes separate operations for metadata and file download. This makes a metadata-before-download identity fence technically compatible with the API shape.

The current project already uses resource metadata fields including `resource_id` when verifying uploaded Journal backups. That proves such metadata is available in the deployed API surface used by WebClip, but this research does **not** infer undocumented lifetime/stability guarantees for `resource_id`.

**Yandex Disk REST API landing page**

https://yandex.com/dev/disk/rest/

Yandex documents the API as the interface for accessing and managing a user's personal files. Account/root namespace is therefore material authority, not incidental display metadata.

### Public project / implementation analogues

**restic — snapshot identity**

https://github.com/restic/restic/blob/master/doc/040_backup.rst

restic models backups as explicit snapshots and lets a caller name a specific parent snapshot rather than using only a path string. Its file change-detection documentation also illustrates why path and common metadata are only heuristics for content identity, not a universal object-generation proof.

**NousResearch/hermes-agent #107593 — stale restore target**

https://github.com/NousResearch/hermes-agent/issues/107593

A September 2026 public issue describes a Restore action holding a cached target id that became stale after session history changed. The proposed direction is resync/replan/fail rather than silently guessing another target. This is not a WebClip/Yandex proof; it is a current independent analogue of stale selection authority.

**Vault backup restore picker #275 / changelog**

https://github.com/ruaan-deysel/vault/blob/main/CHANGELOG.md

The project documents a restore bug where a user's file-picker selection reached the restore request but was then lost, causing a much broader restore than selected. The fix explicitly carries the picker selection through to the actual restore representation. This is a strong product analogue for the invariant “what the picker showed/selected must remain the authority executed by restore”.

**jjui #643 / v0.10.4**

https://github.com/idursun/jjui/releases

The release notes explicitly call out “stale file selection” and resynchronize selected-file state when restoring an existing details operation, another independent example of stale UI selection being unsafe downstream state.

### User/community relevance

**Backblaze community — renamed/replaced same-path files**

https://www.reddit.com/r/backblaze/comments/1gokz1k/

Users report restore tests where files replaced/renamed into the same names did not correspond to the expected backed-up content. This is not evidence about Yandex Disk or WebClip; it is user-level evidence that “same path/name” is not a trustworthy proxy for “same backup object/content” in restore workflows.

**Backblaze restore-version discussion**

https://www.reddit.com/r/backblaze/comments/e65ho4/

Users ask for explicit version-oriented restore selection because date/path browsing alone can make it hard to know which historical version is being restored. Again this is intent/context evidence only.

## Important contract distinction

P0-013 has two different identity moments:

1. **remote selection authority** — the exact backup object the user chose in the Yandex picker;
2. **staged content authority** — the exact downloaded bytes the user previewed/confirmed for local Journal replacement.

Current code is strong at (2) but weak at (1).

The fix must connect them:

```text
selected row
  -> immutable selected-backup receipt
  -> immutable P0-074 operation context
  -> fresh exact remote object check
  -> bounded download
  -> post-download/object race fence
  -> staged contentSha256
  -> preview receipt + import lease
  -> atomic Journal replacement
```

A later content hash cannot retroactively prove an earlier user-selection binding if the wrong object was downloaded before hashing.

## Status / closure decision

**P0-013 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

This tranche:

- does not modify runtime;
- does not claim implementation closure;
- does not close P0-074/P0-073/P0-022/P0-076 or import-lease owners;
- does not change release readiness;
- does not authorize build/tag/deploy/GitHub Release.

Physical closure still requires runtime implementation plus deterministic and real Yandex E2E evidence for the stale-selection/replacement/account-switch race matrix above.
