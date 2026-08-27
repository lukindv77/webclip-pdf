# Audit delta — actual local-download filename / recovery receipt — 2026-08-27

Initial source-of-truth `main` before this checkpoint: `850542b130cf4abf27e94015cb7ae115b39c4883`.
Numbering correction baseline: `812bf5f09d9b7aab421602f8d3c4d16765745b4e`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Correction — no new P-number

The initial version of this checkpoint incorrectly assigned **P1-199** to the local resolved-filename finding. That assignment is invalid and is withdrawn.

Repository-wide duplicate/number review confirms that the stable numbers were already occupied before this checkpoint:

- **P1-199** — cross-origin iframe print `prepare-print` / `restore-print` operation-generation fencing (`AUDIT_DELTA_CROSS_ORIGIN_PRINT_GENERATION_2026-08-27.md`);
- **P1-200** — remote frame selection/control session-generation and ordering (`AUDIT_DELTA_REMOTE_FRAME_CONTROL_GENERATION_2026-08-27.md`);
- **P1-201** — optional host-permission revocation lifecycle (`AUDIT_DELTA_FRAME_PERMISSION_REVOCATION_LIFECYCLE_2026-08-27.md`).

In addition, the earlier `AUDIT_DELTA_FILENAME_COLLISION_RECOVERY_2026-08-27.md` already proved that Chrome `conflictAction:'uniquify'` can make the fallback filename check fail and explicitly classified that mechanism under existing **P0-048 / P0-039**, with no new number.

Therefore this checkpoint is a **refinement of P0-048/P0-039**, with adjacent dependencies on P1-146/P1-198/P0-079. It does not allocate P1-199, P1-200, P1-201 or a new P1-202.

The fresh evidence below is retained because it adds a user-visible metadata-truth consequence that was not stated as explicitly in the earlier filename-collision checkpoint: even on the normal fast completion path, Journal can retain the requested basename rather than Chrome's resolved physical basename.

## Fresh source proof

### 1. Automatic local download explicitly allows filename mutation

`startAutomaticBlobDownloadBounded()` starts Chrome Downloads with:

- `url: sourceUrl`;
- `filename: targetFilename`;
- `saveAs: false`;
- `conflictAction: 'uniquify'`.

Thus `targetFilename` is a requested filename, not proof of the final physical target name. WebClip's generated timestamp has whole-second precision, so same-title/site saves in one second or a pre-existing same-name file are normal collision cases.

Example:

- requested: `Title__site__2026-08-27_18-30-00.pdf`;
- Chrome-resolved: `Title__site__2026-08-27_18-30-00 (1).pdf`.

### 2. Durable intent stores only the requested filename

Before the irreversible Chrome start, `checkpointPendingLocalDownloadIntent()` persists `pendingData.filename` as the requested WebClip filename, plus Blob URL, expected bytes, operationId and Journal metadata.

There is no separate durable field for:

- requested filename vs resolved/saved filename;
- filename-resolution state.

After `chrome.downloads.download()` returns a numeric `downloadId`, `bindPendingLocalDownloadIntent()` rekeys the existing intent under that id. It does not read the exact `DownloadItem` and does not enrich the checkpoint with Chrome's resolved basename.

### 3. Fast-path completion can write stale requested filename to Journal

`chrome.downloads.onChanged` handles terminal `state.current` and calls `finalizePendingLocalDownload(downloadId, state, error)`.

For `complete`, the finalizer reads the bound durable checkpoint and immediately calls `appendJournalEntryFromDurableCheckpoint(pending.data, ...)`.

It does not first perform an exact-id `chrome.downloads.search({id: downloadId})` to prove the current own-extension DownloadItem and capture its resolved filename/size/state. Filename-only `onChanged` deltas are also ignored because the listener requires a terminal state delta.

Therefore a physically successful uniquified file can be journaled under the pre-conflict requested basename. This is a metadata-truth refinement of P0-039/P0-048 even when recovery itself is not needed.

### 4. Recovery fallback already has the known `uniquify` false-negative

For an unbound intent, background reconciliation uses exact Blob URL as primary identity. Its fallback then requires:

- exact requested basename;
- exact expected byte size;
- short age window.

When Chrome legitimately uniquifies the filename, exact basename equality is false. If Blob URL evidence is unavailable, the correct physical own-extension download can therefore remain unprovable.

This mechanism was already documented in `AUDIT_DELTA_FILENAME_COLLISION_RECOVERY_2026-08-27.md` and remains owned by P0-048/P0-039.

### 5. Do not repair by guessing `(1)`, `(2)`, ...

Broadening fallback to accept a syntactic Chrome conflict suffix would weaken P0-048. Multiple own-extension downloads may have the same requested basename, same byte length and nearby start times while receiving different conflict counters.

The correct direction is exact DownloadItem receipt binding, not filename heuristics.

## Required P0-048 / P0-039 refinement

### Exact bound DownloadItem receipt

Once a valid numeric `downloadId` is known, the durable local-save receipt should be enriched from that exact own-extension DownloadItem before Journal finalization where safely possible. The receipt should distinguish at least:

- requested filename;
- exact resolved physical basename, or explicit unresolved/unknown state;
- exact numeric `downloadId`;
- own-extension proof;
- expected/observed byte evidence;
- terminal state;
- immutable download intent/start generation from P1-198/P1-146;
- immutable PDF generation/content receipt from P0-079.

Do not persist the full local filesystem path merely to obtain filename truth. `DownloadItem.filename` can expose an absolute local path; WebClip should retain only the exact final basename unless a separately justified feature requires more.

### Journal finalization

For a proven completed own-extension DownloadItem:

- Journal filename should represent the actual resolved basename when available;
- the originally requested filename may remain separate diagnostic metadata;
- if the resolved basename cannot be proved, do not silently label the requested basename as the physical name. Preserve explicit unknown/resolution-pending evidence or defer exact-name finalization according to the recovery design.

This must compose with P0-039: failure to prove final filename/outcome must not destroy the sole durable recovery evidence.

### Recovery fallback

- bound numeric `downloadId` remains authoritative and should use exact-id lookup;
- unbound unknown-start intents keep Blob URL as the primary identity;
- P0-048 uniqueness/no-overwrite rules remain mandatory;
- do not loosen fallback to guess Chrome's conflict counter;
- unresolved outcome remains bounded dead-letter/manual-resolution evidence under P0-039 instead of being TTL-erased.

P1-146 late-success binding should enrich the same exact intent when the resolved basename can be safely read. P1-198/P0-079 remain separate prerequisites for collision-safe intent/PDF ownership.

## Required deterministic regressions

1. Pre-create the exact requested WebClip filename; automatic download uses `uniquify` and Chrome resolves another basename.
2. Successful completion records the actual resolved basename in Journal, not a false claim that the requested basename is physical truth.
3. Requested filename remains separately available if diagnostics retain it.
4. Two same-page saves inside one filename-timestamp second produce distinct physical basenames and truthful separate Journal entries.
5. Known numeric downloadId + missed terminal event: maintenance exact-id reconciliation obtains the same resolved basename and finalizes the exact checkpoint.
6. Blob URL unavailable + uniquified physical file: no heuristic `(N)` guess is accepted as proof.
7. Multiple plausible uniquified candidates fail closed under P0-048 when exact downloadId/Blob identity is absent.
8. Full local filesystem path is not leaked into Journal export/OperationLog when only basename is required.
9. Interrupted download may retain requested/resolved-name diagnostics but does not create a false completed Journal entry.
10. P1-198 operation-id collision tests remain independent: two physical operations cannot corrupt one another's intent before filename resolution.
11. P0-039 preserves unknown-outcome checkpoint even when resolved filename remains unknown.
12. Normal no-conflict save keeps the same visible filename behavior as today.

## Numbering / duplicate-check result

No new P-number is assigned by this checkpoint.

- **P1-199 remains cross-origin print generation.**
- **P1-200 remains remote frame selection/control generation.**
- **P1-201 remains optional-permission revocation lifecycle.**
- Local `uniquify` recovery/metadata truth refines **P0-048 / P0-039**.
- P1-146, P1-198 and P0-079 remain adjacent dependencies, not replacement owners.

This correction is a forward docs commit; no reset/revert is performed.

## Test / release state

No product tests were rerun for this docs-only correction. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.
