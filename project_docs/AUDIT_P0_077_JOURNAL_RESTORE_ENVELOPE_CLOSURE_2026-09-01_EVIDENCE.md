# P0-077 — Journal same-version restore envelope closure evidence

Date: 2026-09-01

Baseline: canonical `main = 364dd1d23bcff49b9182ceef1e2b4d827fece8ca`.

Owner: `P0-077` — WebClip must never report a successful self-generated backup/export that the same version cannot restore because byte/count/per-entry envelopes disagree.

## Historical failure surface

The owner had three independently proven envelope mismatches in the current full-Journal format:

1. Export admitted up to 64 MiB of UTF-8 bytes while local and worker restore admitted only 50 MiB. A Unicode-heavy Journal could therefore produce a successful self-backup that the same version rejected on restore.
2. Worker restore admitted at most 100,000 entries while full export had no equivalent total-entry success boundary. More than 100,000 compact records could therefore be exported successfully but rejected by the same importer.
3. `readJournalEntryBatch()` rejected one serialized entry above the legacy 4 MiB batch-memory ceiling, while same-version import admitted one entry up to 8 MiB. A valid restored/live record in the 4–8 MiB range could make the next full backup impossible.

The acceptance contract also forbids solving this by deleting or truncating already stored over-limit records.

## Implementation

`journal-text-filter.js` now publishes one immutable, versioned `WebClipJournalRestoreEnvelope` before the service-worker security bootstrap:

- version: `1`;
- maximum UTF-8 backup bytes: `50 MiB`;
- maximum backup characters: `50 MiB`;
- maximum entries: `100,000`;
- maximum serialized entry characters: `8 MiB`.

The existing three-guard security bootstrap remains byte-shape compatible; `journal-restore-envelope-guard.js` is loaded by a second synchronous worker-only `importScripts()` call.

`journal-restore-envelope-guard.js` installs before ordinary service-worker execution and:

- clamps `WebClipJournalImportStream.process()` options so no caller can widen total-character, per-entry or entry-count limits beyond the shared envelope;
- replaces only `readJournalEntryBatch()` with the same bounded cursor/deadline/serialized-string strategy but permits a single serialized record up to the same 8 MiB envelope accepted by restore;
- wraps `stageFullJournalExport()` and validates the completed staging receipt before it can be observed by local or Yandex success paths;
- rejects and deletes staged transfer payloads when encoded bytes exceed 50 MiB or entry count exceeds 100,000;
- never deletes or truncates Journal records merely because they are outside the self-backup envelope.

The unchanged same-version restore boundaries remain source-locked by the regression:

- worker `MAX_JOURNAL_IMPORT_BYTES = 50 MiB`;
- worker `MAX_JOURNAL_IMPORT_ENTRY_CHARS = 8 MiB`;
- both worker stream-import calls use `maxEntries: 100000`;
- Journal page file staging rejects `totalBytes > 50 MiB`.

## Deterministic verification

`project_tools/test_p0_077_journal_restore_envelope.js` executes the real shared helper and guard in a classic-worker bootstrap fixture and verifies:

- the original Journal text-filter still matches positive/negative title controls;
- restore-envelope constants are exactly 50 MiB bytes / 50 MiB chars / 100,000 entries / 8 MiB per entry;
- an entry just above the former 4 MiB ceiling is admitted;
- an entry above 8 MiB is rejected with `JOURNAL_RESTORE_ENTRY_TOO_LARGE`;
- a fake IndexedDB cursor actually passes a >4 MiB serialized record through the guarded batch reader and rejects a >8 MiB record;
- widened import options are clamped back to the shared envelope;
- a staging receipt at the exact byte/count boundary succeeds;
- +1 encoded byte and +1 entry fail closed and delete the staging group;
- repository source bindings for local/worker restore remain equal to the shared envelope.

Local-first preflight on the exact implementation content passed:

```text
node --check journal-text-filter.js
node --check journal-restore-envelope-guard.js
node --check project_tools/test_p0_077_journal_restore_envelope.js
node project_tools/test_p0_077_journal_restore_envelope.js
P0-077 journal restore-envelope deterministic regression PASS
```

Repository Integrity remains the independent exact-head and post-merge gate; no separate browser workflow is required for this pure export/import envelope owner.

## Closure decision

`P0-077`: **DONE candidate on the branch; canonical only after expected-head PR merge and post-merge Repository Integrity SUCCESS.**

The three registered same-version self-restore mismatches are closed without destructive migration, silent truncation or a false success path. This closure does not claim general backup scheduling, Yandex transport, storage-quota or unrelated Journal mutation owners are complete.

`RELEASE_READINESS.md` is unchanged and remains `NOT READY`.
