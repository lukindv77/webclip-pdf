# Audit family evidence — Local download / native Save As / file settlement

Family from `AUDIT_DELTA_INDEX.md` section 9.

This document is a **lossless consolidation** of the detailed audit deltas listed below. Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-039, P1-079, P1-080, P1-087, P1-129, P1-146, P1-156, P1-169, P1-210.

Retired source count: **12**.

## P-code coverage

P0-006, P0-023, P0-039, P0-048, P0-070, P0-072, P0-076, P0-079, P0-080, P1-064, P1-067, P1-087, P1-124, P1-146, P1-156, P1-169, P1-184, P1-194, P1-195, P1-196, P1-197, P1-198, P1-199, P1-200, P1-201, P1-202, P1-210, P1-211, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `AUDIT_DELTA_FILENAME_COLLISION_RECOVERY_2026-08-27.md` | `9a7eaf2af507d71d2c951b4a775ea6436895fcb6afedc6f39b37c1ecbde04958` | P0-006, P0-039, P0-048, P0-079, P1-184, P1-198, P2-020 | Audit delta — filename collision / recovery identity — 2026-08-27 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_ACTUAL_FILENAME_2026-08-27.md` | `651df187ee69199bd7da80a079e771c1e213655fb7753783900b7fa21d33b85b` | P0-039, P0-048, P0-079, P1-146, P1-198, P1-199, P1-200, P1-201, P1-202 | Audit delta — actual local-download filename / recovery receipt — 2026-08-27 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_INTERRUPTED_LIFECYCLE_2026-08-27.md` | `3bbd99b89eae78a5d53f06a3f65574d54927cb773c930cda9b6113f52d9f4fc0` | P0-039, P0-048, P0-072, P0-076, P1-067, P1-087, P1-146, P1-198, P1-199, P1-200, P1-201 | Audit delta — local DownloadItem interrupted/resumable lifecycle — 2026-08-27 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_KNOWN_ID_BIND_FAILURE_2026-08-28.md` | `f1d1809fff1b7cbc70b0d8c0d342371d650b367f871f2fb395343e6cb5c2a22c` | P0-039, P0-048, P1-146, P1-194, P1-211 | Audit delta — known Chrome downloadId must survive durable bind failure — 2026-08-28 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_OPERATION_ID_COLLISION_2026-08-27.md` | `698947d14d2e2faaae5af62719d8e9a0451dd49a2487ceb81b2cf71d3282902f` | P0-023, P0-039, P0-048, P0-070, P0-072, P0-076, P0-079, P0-080, P1-146, P1-198 | Audit delta — local PDF/download operation identity collision — 2026-08-27 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_RECOVERY_2026-08-27.md` | `2a26597d9296c5084115225e5135dd4ca692dde31bb2b4e889560dc562d49bbb` | P0-039, P0-048, P0-072, P0-079, P1-067, P1-087, P1-146, P1-195, P1-196, P1-197, P2-020 | Local download recovery audit delta — 2026-08-27 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_RECOVERY_FAIRNESS_2026-08-27.md` | `5489515b38c73984f167dc1423e31b62d92956205e0913c3bfb021a89fcd186e` | P0-039, P1-064, P1-087, P1-146, P1-200 | Audit delta — local download recovery fairness |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_START_VS_HISTORY_RETENTION_STATES_2026-08-28.md` | `bdba1238e02b256248e93c81a8df8b14e4db85580fce386a2879f7258757ca65` | P0-039, P0-048, P1-087, P1-146, P1-211 | Audit delta — local download start receipt vs DownloadItem/history retention states — 2026-08-28 |
| `AUDIT_DELTA_LOCAL_DOWNLOAD_TERMINAL_RECEIPT_2026-08-28.md` | `3e0aec16deefbb3a24d6ab002d0a2444482f5e8f91d7760cc604f47e351b24ff` | P0-039, P0-048, P0-079, P1-067, P1-087, P1-146, P1-198, P1-210 | Audit delta — exact local DownloadItem terminal receipt — 2026-08-28 |
| `AUDIT_DELTA_NATIVE_SAVE_AS_LIFECYCLE_2026-08-28.md` | `d1703665f176c4c95a69cde916e59ba33520abe231540f29abb7d8a66f516647` | P1-067, P1-124, P1-156, P1-169, P1-201, P1-210 | Audit delta — native Save As lifecycle completion — 2026-08-28 |
| `AUDIT_DELTA_NATIVE_SAVE_AS_STARTED_VS_FILE_TERMINAL_SUCCESS_2026-08-28.md` | `51fd61e399f46cc89e690d2b3ec37989131467777b6ec52dd1456050cfabdd10` | P1-156, P1-198, P1-210, P1-211 | Audit delta — native Save As STARTED is currently recorded as terminal export success — 2026-08-28 |
| `AUDIT_DELTA_SAVE_AS_STARTED_COMMIT_ORDER_2026-08-28.md` | `ea41f318b4f2521c1040ec0925a2ce432a1e5207245608abf8f75592fe98551a` | P1-067, P1-156, P1-169, P1-210, P1-211 | Audit delta — Prepared Save As STARTED commit ordering — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.
## Retired source: `AUDIT_DELTA_FILENAME_COLLISION_RECOVERY_2026-08-27.md`

SHA-256 of UTF-8 source text: `9a7eaf2af507d71d2c951b4a775ea6436895fcb6afedc6f39b37c1ecbde04958`

# Audit delta — filename collision / recovery identity — 2026-08-27

Baseline HEAD before this audit block: `8a7b4f0cb0d9acce8ee5d7db7ab5864ad753bd2a`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh cross-check of filename/path collision semantics for Yandex save and local Chrome download recovery. Existing owners: `P1-184`, `P0-006`, `P0-048`, `P0-039`.

No new P-number is required; this block supplies deterministic self-generated collision cases for existing open/partial identity contracts.

## Yandex: same-path collision is self-generated, not only external

### Filename precision

`content.js::formatFilenameTimestamp()` formats only to whole seconds:

`YYYY-MM-DD_HH-MM-SS`.

`buildPdfFilename()` combines title + site + this timestamp. Therefore separate save operations with the same effective title/site that start during the same second can legitimately produce the same PDF filename.

The Yandex destination then maps that filename into the same managed folder/path for the same reading mode/site context.

This is especially realistic across two tabs/documents: PDF generation is globally serialized by debugger ownership, but metadata timestamps are captured before/around the user save workflow and different operations can still share the same whole-second naming timestamp/path.

### Retry reuse consequence

Initial Yandex upload uses `overwrite=false`. Explicit retry uses:

`uploadCachedRecordToYandex(... allowExisting: true)`.

When `allowExisting` is true, WebClip GETs the exact remote path and accepts an existing `type=file` when its byte size equals `expectedPdfBytes`, then skips sending the intended bytes.

Thus the same-size unrelated-file scenario in P1-184 does not require an external Yandex client or exotic replacement race. A second WebClip operation can create the colliding path itself.

If two distinct PDFs happen to have equal byte length, retry can adopt the other WebClip operation's file. With `createPublicLinks=true`, the existing P1-184 path can then publish/adopt the wrong object before stronger identity proof.

### Required P1-184/P0-006 refinement

- Treat filename/path collision as a normal product condition, not as proof of retry identity.
- Preserve human filename requirements, but remote object creation needs an operation/content receipt independent of textual path.
- If a path is occupied by a different proven object/content, choose an explicit collision-safe outcome (new unique managed path or fail for user resolution); never infer identity from same filename + same bytes.
- A local content digest/operation receipt from P0-079 can feed P1-184 stronger remote proof, but local ownership and remote identity remain separate contracts.
- Regression must include two WebClip-generated saves with identical filename timestamp/path and equal byte length but different PDF bytes.

## Local Chrome download: `uniquify` conflicts with recovery fallback

### Runtime uses Chrome's uniquify policy explicitly

Automatic Blob download starts with:

- requested `filename: targetFilename`;
- `saveAs: false`;
- `conflictAction: 'uniquify'`.

Current Chrome downloads API documentation defines `uniquify` as changing a conflicting filename by adding a counter before the extension. Reference: https://developer.chrome.com/docs/extensions/reference/api/downloads

Therefore the eventual `DownloadItem.filename` is not guaranteed to equal the requested WebClip filename.

### Primary recovery identity remains good when Blob URL survives

`pendingDownloads` reconciliation first compares the exact original Blob URL against `DownloadItem.url/finalUrl`. A uniquified disk filename does not break that primary identity.

### Fallback becomes false-negative exactly when it is needed

The code intentionally has a fallback for cases where Chrome no longer exposes the original Blob URL. That fallback requires, within a short window:

- exact `filename === expectedFilename`;
- exact expected byte size.

For a successful download that Chrome uniquified because a same-name file already existed, the actual basename differs from `expectedFilename`. Therefore once Blob URL evidence disappears, that physically successful own-extension download cannot satisfy the fallback at all.

This is a distinct false-negative mode inside the existing P0-048/P0-039 recovery root cause.

### Do not repair by stripping `(N)` heuristically

Blindly treating `name.pdf` and `name (1).pdf` as the same intended file would weaken identity and amplify the ambiguity already recorded in P0-048. Multiple own-extension downloads with same requested name/size can coexist and Chrome can assign different suffixes.

Required direction:

- bind the exact `downloadId` as early as Chrome exposes it;
- for unknown start settlement, use a stronger own-download creation receipt/event correlation around the exact Blob URL/start generation;
- exclude already-claimed downloadIds;
- if fallback remains necessary, require uniqueness and stronger temporal/operation evidence rather than filename normalization alone;
- unresolved successful-but-unprovable outcome remains dead-letter/manual-resolution evidence under P0-039; do not delete checkpoint based on wall clock.

## Required deterministic regressions

1. Two Yandex saves generate the same textual filename/path; different equal-sized PDFs are never adopted as each other on retry.
2. Occupied Yandex path by unrelated same-size WebClip file never triggers publish/adoption under P1-184.
3. Automatic local download where `name.pdf` already exists and Chrome creates a uniquified target still reconciles through exact own-download identity after lost `downloads.download()` response.
4. If Blob URL is unavailable, multiple same-name/same-size uniquified DownloadItems cause fail-closed ambiguity, not first-match claim.
5. One physical DownloadItem cannot bind two pending intents.
6. Unresolved uniquified outcome retains recovery evidence beyond the current TTL policy per P0-039.

## Classification

No new P-number created. Extend `P1-184` / `P0-006` for self-generated Yandex path collisions and `P0-048` / `P0-039` for Chrome `uniquify` fallback false-negatives.

`P0-079` and `P1-198` remain evidence-reserved as separate findings. `P2-020` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_ACTUAL_FILENAME_2026-08-27.md`

SHA-256 of UTF-8 source text: `651df187ee69199bd7da80a079e771c1e213655fb7753783900b7fa21d33b85b`

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

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_INTERRUPTED_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `3bbd99b89eae78a5d53f06a3f65574d54927cb773c930cda9b6113f52d9f4fc0`

# Audit delta — local DownloadItem interrupted/resumable lifecycle — 2026-08-27

Source-of-truth `main` immediately before this write: `d5cca986bd0d21b79544de0a0c7d666e43c547ac`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing:

- **P0-039** — the sole durable local-save recovery evidence must not be destroyed when physical outcome/lifecycle is not authoritatively terminal;
- **P1-067** — bounded Blob-backed download resource lifetime/cancel/revoke policy;
- **P1-146** — actual-settlement lifecycle of non-cancellable `chrome.downloads.download()` start;
- **P0-048 / P1-087** — exact DownloadItem binding and own-extension proof.

The concrete gap is that current WebClip treats every Chrome Downloads `state === 'interrupted'` as a final non-resumable failure. Chrome's DownloadItem model is more precise: `canResume` may be true for an interrupted download that can continue from the interruption point.

This audit does **not** claim that Chrome necessarily exposes `canResume:true` for WebClip's Blob-backed DownloadItems in the target Chrome build. That must be verified in real unmanaged unpacked Chrome before implementation semantics are finalized or a separate root-cause number is considered.

## Fresh runtime proof

### 1. Fast terminal listener classifies all interrupted states as terminal

The global `chrome.downloads.onChanged` listener ignores nonterminal deltas and invokes `finalizePendingLocalDownload(...)` when state becomes either:

- `complete`; or
- `interrupted`.

It does not inspect `delta.canResume`, and it does not exact-read the DownloadItem before deciding that the durable operation is terminal.

### 2. `finalizePendingLocalDownload(..., 'interrupted')` deletes the durable checkpoint unconditionally

For `complete`, the finalizer has a valuable positive control: it appends through `appendJournalEntryFromDurableCheckpoint()` with the exact `pendingDownloads` checkpoint required in the same IndexedDB transaction. If clear/import removed that checkpoint, stale metadata is not resurrected.

For `interrupted`, however, the function immediately removes the bound pending checkpoint and logs that the Journal entry was not created.

No branch checks:

- `DownloadItem.canResume`;
- bytes already received;
- whether Chrome still owns an active resumable DownloadItem;
- whether interruption is known terminal vs temporarily resumable;
- whether an exact-id DownloadItem read itself failed/timed out.

Therefore durable metadata/recovery authority is destroyed solely from the coarse `interrupted` state.

### 3. Blob cleanup makes the same coarse terminal assumption

`revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)` installs a `downloads.onChanged` listener whose cleanup condition is also:

`state.current === 'complete' || state.current === 'interrupted'`.

On either state it removes its listener/watchdog and revokes the Blob URL.

Thus an interruption triggers two independent terminal actions:

1. deletion of the durable Journal/download checkpoint;
2. release of the Blob URL backing resource.

If the exact DownloadItem is resumable, this is stronger than merely failing to offer Resume: WebClip has already discarded both metadata authority and its retained source-resource ownership without proving that the lifecycle is irreversibly over.

### 4. Background recovery repeats the same classification

`reconcilePendingLocalDownloads()` does exact-id lookup for an already bound numeric `downloadId` and checks own-extension identity. That is the correct identity direction.

But if the exact item state is `interrupted`, recovery passes it to the same interrupted finalizer, which removes the checkpoint. The exact DownloadItem's `canResume` field is not used.

For unbound intent discovery, a discovered `interrupted` candidate is likewise bound and then finalized as terminal failure.

Therefore restart/maintenance does not repair the semantic gap.

## Current Chrome API semantics

Current Chrome Extensions downloads documentation models `DownloadItem.canResume` explicitly. It is true when a download is either paused while in progress **or interrupted and capable of resuming from where it stopped**. Chrome also exposes `chrome.downloads.resume(downloadId)` for active resumable downloads.

This means `interrupted` alone is not a protocol-level proof of terminal non-resumability.

However the API contract does not by itself prove how a particular `blob:`-backed WebClip DownloadItem behaves after interruption. WebClip's implementation contract must therefore be based on a real Chrome reproduction rather than assuming either universal resumability or universal non-resumability for Blob sources.

## Why this belongs primarily to P0-039

P0-039 already owns the rule that insufficient negative evidence must not destroy the sole durable metadata checkpoint for a local physical-save outcome.

The interrupted case is the same trust mistake at an earlier lifecycle boundary:

- current code sees one coarse state value;
- it treats that value as authoritative proof that no future successful completion of the same physical DownloadItem can occur;
- it deletes the only durable Journal/selection/operation evidence.

If exact current evidence says `canResume:true`, that negative conclusion is explicitly false under the Chrome data model.

If exact DownloadItem inspection itself fails or times out, terminality is also unknown and the checkpoint must be preserved.

P1-067 remains responsible for keeping retained Blob resources globally bounded; P0-039 does not imply retaining a large Blob forever.

## Required contract refinement

### Exact state receipt before destructive terminal cleanup

Before treating a bound DownloadItem as irreversibly interrupted, obtain an exact-id, own-extension DownloadItem receipt when available and classify at least:

- `complete`;
- `in_progress/paused`;
- `interrupted + canResume:true`;
- `interrupted + canResume:false`;
- `missing/unknown`;
- read/API timeout/error = unknown, not terminal.

A bare state delta may trigger reconciliation, but should not be the sole authority for destructive checkpoint/resource cleanup when Chrome exposes a stronger exact-item state.

### Resumable interruption

If real Chrome proves WebClip Blob-backed downloads can become `interrupted + canResume:true`:

- retain the exact durable checkpoint;
- retain enough exact source/download receipt to preserve ownership while the resumable window is valid, subject to bounded P1-067 resource policy;
- expose an explicit resumable/interrupted state rather than logging final failure;
- do not automatically call `chrome.downloads.resume()` merely because it is available unless product UX explicitly chooses that behavior. Resume is a new side effect and should be user/policy owned, not a blind recovery action;
- if the user/browser later resumes and the same numeric DownloadItem completes, finalize from the same exact checkpoint/generation.

### Non-resumable interruption

If exact proof says `interrupted + canResume:false`, WebClip may classify the download as non-resumable terminal failure and release the large Blob resource under P1-067.

Durable diagnostic handling should still be explicit. The implementation should not conflate "physical file was not completed" with "no partial filesystem artifact/history ever existed"; Journal success remains prohibited, while bounded diagnostic/dead-letter retention can follow the P0-039 model as appropriate.

### Unknown state / read failure

If exact-id DownloadItem lookup fails, times out or returns data insufficient to establish terminality:

- keep the durable checkpoint as unresolved;
- do not auto-resume/restart the physical download;
- do not claim a final "Journal entry was not created because download definitively failed" outcome;
- apply bounded retry/dead-letter/resource-release policy without converting uncertainty into false terminal proof.

### Blob lifetime composition

P1-067's resource bound remains mandatory. If a resumable/unknown download cannot keep a Blob URL indefinitely, resource release must be an explicit bounded lifecycle transition, not an accidental synonym for `interrupted`.

A safe design can separate:

- durable DownloadItem/Journaling evidence, retained cheaply;
- expensive Blob/source body ownership, retained only under a bounded resumable/resource lease;
- user-visible statement that Resume may no longer be possible after that resource lease expires.

Do not delete the durable evidence merely because expensive body retention ends.

## Required real-browser / deterministic evidence

1. In unmanaged unpacked Chrome, induce interruption of a WebClip automatic Blob-backed PDF download and record exact `state`, `canResume`, `error`, `bytesReceived`, `totalBytes` and subsequent behavior.
2. If Chrome yields `canResume:true`, prove whether `chrome.downloads.resume(id)` can complete while the original Blob URL remains alive.
3. For the same case, prove what happens if Blob URL is revoked before Resume; use this only as evidence, not as a product-side destructive experiment on user data.
4. If target Chrome never exposes resumable Blob-backed interruption, document that browser fact and keep the code contract truthful to the observed platform behavior rather than assuming generic API semantics.
5. Synthetic/deterministic state machine: `interrupted + canResume:true` does not delete checkpoint or produce terminal Journal failure.
6. `interrupted + canResume:false` never creates a success Journal entry and can release Blob according to bounded policy.
7. Exact-id lookup timeout/error after an interrupted event preserves unresolved checkpoint evidence.
8. Late completion of the same numeric DownloadItem after a resumable interruption finalizes exactly once from the original checkpoint/generation.
9. Clear/import that intentionally removed the exact checkpoint still prevents late completion from resurrecting stale Journal metadata (existing P0-072/P0-076 invariant).
10. P1-198/P0-048 identity collision tests remain required: an interrupted/resumed A can never consume B's checkpoint simply because logical ids collide.
11. P1-067 resource budget remains bounded even if several interrupted/resumable DownloadItems coexist.
12. No blind new `downloads.download()` is started as a substitute for Resume/reconciliation after unknown settlement.

## Duplicate check / numbering

No new number is created.

- Primary owner: **P0-039**, because the defect is destructive loss of the sole durable recovery evidence on insufficient terminal proof.
- **P1-067** owns bounded Blob/resource release policy.
- **P1-146** owns actual settlement of the original non-cancellable Chrome start.
- **P0-048/P1-087** own exact DownloadItem binding/ownership.
- **P1-198** remains the operation-generation prerequisite.

Stable late numbers remain unchanged: P1-199 cross-origin print generation, P1-200 remote frame control generation, P1-201 permission-revocation lifecycle.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_KNOWN_ID_BIND_FAILURE_2026-08-28.md`

SHA-256 of UTF-8 source text: `f1d1809fff1b7cbc70b0d8c0d342371d650b367f871f2fb395343e6cb5c2a22c`

# Audit delta — known Chrome downloadId must survive durable bind failure — 2026-08-28

Source-of-truth `main` immediately before this write: `788424bff804d76e53503ee23fb4e299f34e6087`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-048** — exact ownership/identity for local-download recovery.

Adjacent owners:

- **P1-146** — actual settlement of non-cancellable `chrome.downloads.download()` and durable intent lifecycle;
- **P1-194** — truthful durable recovery evidence/durability class;
- **P0-039** — unresolved physical local-save outcome must not lose its only recovery evidence.

This checkpoint does not allocate P1-211 or another new number.

## Fresh source proof

`checkpointPendingLocalDownloadIntent()` correctly persists an intent before the irreversible Chrome download call. At that point the recovery key is a generated string intent id and the strongest available physical identity is the exact Blob URL.

`startAutomaticBlobDownloadBounded()` later receives the actual result of `chrome.downloads.download()`.

When Chrome returns a valid numeric `downloadId`, WebClip calls:

`bindPendingLocalDownloadIntent(intentKey, downloadId)`

The normal bind is a useful positive control: one IndexedDB readwrite transaction deletes the string-keyed intent and puts a numeric-keyed `kind:'download'` record. A crash cannot leave only half of that successful key migration.

The defect is the **bind failure path after Chrome already returned the exact id**.

Current flow is equivalent to:

1. Chrome physically admits the download and returns numeric id `D`.
2. WebClip attempts to migrate durable intent `I` to key `D`.
3. IndexedDB bind throws or otherwise cannot produce a bound record.
4. Code catches the error and stores only an in-memory/string `bindWarning`.
5. The function still returns `{status:'started', downloadId:D, bindWarning}` to its caller.
6. The caller reports that background recovery will repair the checkpoint.
7. The old durable record remains keyed by `I`; it does **not** durably contain `D` as the authoritative Chrome receipt.

The operation log may record `downloadId`, but local-download recovery does not use OperationLog as correctness authority and must not depend on it.

## Why the fallback is weaker than evidence already observed

`reconcilePendingLocalDownloads()` treats an unbound intent by searching Chrome Downloads. Its primary match is exact stored Blob URL. If the browser no longer exposes the original Blob URL, the code falls back for a short window to `filename + expectedBytes`, currently taking the first matching own-extension DownloadItem. That fallback ambiguity is already the core of P0-048.

Therefore after WebClip has already observed exact numeric id `D`, a local IDB bind failure can downgrade future recovery from exact Chrome identity back to heuristic discovery.

This is avoidable evidence loss: the program knew the authoritative physical id but failed to preserve it in a recovery structure before returning a recoverable/partial state.

## Deterministic schedule

1. Durable intent `I` is committed before `downloads.download()`.
2. Chrome starts the download and returns `D=42`.
3. `bindPendingLocalDownloadIntent(I,42)` fails because of a transient IDB/transaction error.
4. Caller receives `bindWarning`; physical download 42 continues.
5. MV3 worker stops before a later successful bind/reconciliation.
6. On restart, durable store contains only `I` with Blob URL / filename / bytes and no exact `D=42` receipt.
7. If Chrome still exposes the Blob URL, recovery can rediscover 42; this is a useful best-case path.
8. If Chrome hides/normalizes the Blob URL, recovery falls back to filename+bytes and can hit P0-048 ambiguity even though exact id 42 had already been known before the crash.

A recovery design should not deliberately forget stronger identity and later attempt to infer it again from weaker observations.

## Required contract

Once `chrome.downloads.download()` returns a valid numeric id, that exact id becomes part of the immutable local-download operation receipt.

Before the operation is presented as safely background-recoverable, WebClip must retain a durable transition proving at least:

- original intent generation/id;
- exact returned numeric `downloadId`;
- operation id/generation;
- Blob URL and expected bytes as secondary corroborating evidence;
- whether the ordinary key migration completed.

Implementation options include:

- retrying only the **local durable bind** under a bounded actual-settlement owner while keeping `D` in an independent tiny bind-pending receipt;
- a two-phase record whose original intent row can durably acquire `knownDownloadId:D` before key migration;
- another atomic/indexed representation that guarantees the exact id survives process loss.

The important invariant is not the physical schema: **after exact `D` is observed, recovery must never become weaker merely because the preferred key migration failed.**

Do not automatically start another `downloads.download()` call. The physical start has already succeeded.

## Composition with existing P0-048 ambiguity

This does not replace P0-048's requirement that heuristic fallback:

- fail closed when zero or multiple candidates match;
- exclude already claimed `downloadId` values;
- never overwrite an existing bound checkpoint for another intent.

Instead it reduces how often the heuristic is needed. Exact ids already returned by Chrome should bypass fallback discovery entirely after restart.

## Required regressions

1. `downloads.download()` returns D; IDB bind succeeds -> one numeric durable checkpoint D, normal behavior.
2. `downloads.download()` returns D; first bind transaction fails -> exact D remains durable in bind-pending evidence.
3. Worker stops immediately after that failure -> restart reconciles exact D without filename+bytes discovery.
4. Same case with Chrome omitting original Blob URL -> exact D still recovers correctly.
5. Two same-name/same-size downloads exist -> known D is not confused with the sibling item.
6. Bind-pending durable write itself has unknown settlement -> retain explicit unknown/local-reconcile state; do not start a second physical download.
7. Existing checkpoint already owns D -> conflict is surfaced/fail-closed under P0-048; no overwrite.
8. Clear/import removes the operation's durable recovery generation -> late local bind cannot resurrect stale Journal metadata.
9. OperationLog missing/pruned -> correctness is unchanged because exact-id evidence is in the recovery state, not logs.
10. Browser history loss after exact D was known preserves the P0-039 dead-letter/manual-resolution semantics rather than falsely declaring no physical download.

## Duplicate check

Canonical P0-048 already owns ambiguous DownloadItem claiming and numeric-key overwrite. P1-146 owns late actual settlement of the Chrome download start. P0-039 owns loss of unresolved physical-save evidence.

This delta is the missing transition between them: **successful physical admission produced exact `downloadId`, but a failed durable key bind currently discards that stronger receipt across MV3 restart.** No new P-item is justified.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_OPERATION_ID_COLLISION_2026-08-27.md`

SHA-256 of UTF-8 source text: `698947d14d2e2faaae5af62719d8e9a0451dd49a2487ceb81b2cf71d3282902f`

# Audit delta — local PDF/download operation identity collision — 2026-08-27

Source-of-truth `main` immediately before this write: `276d20320e330df98fe60736d7af60e52acadcaf`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof materially strengthens and composes existing:

- `P1-198` — caller-selected textual `operationId` is not a worker-issued live operation receipt;
- `P0-079` — irreversible PDF byte consumers need immutable operation-owned cache generations;
- `P0-039` — local physical save must retain exact durable recovery metadata;
- `P0-048` — local DownloadItem/checkpoint binding must be exact and no-overwrite;
- `P1-146` — at most four **actually unresolved** automatic `chrome.downloads.download()` starts may exist.

The previous P0-079 positive-control statement that the direct local-download path is already operation-owned via `local-download:<operationId>` is incomplete. It is better than the Yandex `tab:<tabId>` slot only when `operationId` itself is a unique authoritative receipt. Current content callers are allowed to choose that string, and duplicate/reused values are not rejected.

The important correction to P1-198 is stronger: current source **does** use caller-provided `operationId` as the basis of physical/durable local-save keys. Therefore a collision can affect actual PDF bytes, durable `pendingDownloads` authority and native-download admission, not only OperationLog/progress truth.

## Fresh runtime proof

### 1. Live local PDF handler accepts caller operationId

`WEBCLIP_GENERATE_PDF` obtains the source tab from `sender.tab.id`, but passes `normalizeOperationIdInput(message.operationId)` directly into `generatePdfAndDownload(...)`.

`normalizeOperationIdInput()` validates syntax/length only. It does not prove that the worker issued the id, that it is unused, or that it belongs to the exact source document/operation generation.

If the caller omits the value, `generatePdfAndDownload()` creates a local id. But any accepted non-empty caller value becomes authoritative for the paths below.

### 2. Direct local PDF bytes are keyed by textual operationId

After `Page.printToPDF`, direct local save constructs:

`temporaryCacheKey = local-download:<operationId>`

and passes that key to `putCachedPdf()`.

`putCachedPdf()` writes the PDF record and its metadata with IndexedDB `put()`, not a no-overwrite `add()`/CAS tied to an immutable generation.

Therefore a second physical operation using the same textual operationId can replace the first operation's temporary PDF bytes/metadata at the same key.

This corrects the earlier P0-079 positive-control wording: `local-download:<operationId>` is only logically operation-scoped; it is not a safe physical owner while the operation id is caller-selected/reusable.

### 3. Blob creation is a later read of that mutable key

The worker does not keep the local `pdfBlob` as the irreversible download body. It calls:

`createPdfCacheBlobUrl(temporaryCacheKey)`

which sends only `pdfCacheKey` to offscreen. Offscreen later executes `getPdfCacheRecord(key)`, builds a Blob from whichever record occupies the key at that moment, and returns a Blob URL.

Thus the following schedule is valid:

1. A prints PDF A and writes `local-download:X`;
2. before offscreen reads A's cache key, B starts with the same caller-provided operationId X and writes PDF B to `local-download:X`;
3. A's offscreen Blob creation reads B;
4. A proceeds using A's filename/meta/expected byte count but Blob B.

Equal-sized different PDFs make the substitution invisible to size-only checks. With unequal sizes, the wrong bytes can still reach an irreversible Chrome download before later reconciliation detects a mismatch.

### 4. Cleanup is also by the collided textual cache key

Direct local save deletes `temporaryCacheKey` in a `finally` immediately after Blob URL creation.

If B has replaced the same key while A is finishing its Blob handoff, A can delete B's temporary cache record. Thus the collision can both substitute A's body and destroy B's body/retry evidence.

P0-079's compare-and-delete-by-generation requirement therefore applies to direct local save as well as Yandex retry-cache.

## A second collision exists in durable `pendingDownloads`

### 5. Local download intent key is also operationId-derived

`makePendingLocalDownloadIntentKey(operationId)` returns:

`intent:<operationId>`

when operationId is non-empty; random fallback is used only when the id is absent.

`checkpointPendingLocalDownloadIntent()` stores the prepared durable item with:

- `downloadId: intent:<operationId>` as the object-store key;
- its own random `journalEntryId` inside `data`;
- Blob URL;
- expected bytes;
- operationId and Journal metadata.

The transaction eventually calls `pending.put(item)`.

There is no expected-absence check and no immutable intent generation. A second operation using textual X silently replaces the first durable `intent:X` checkpoint.

### 6. Physical download and durable metadata can be cross-bound

`startAutomaticBlobDownloadBounded()` starts native Chrome download using the function arguments `blobUrl` and `filename`, but after Chrome returns `downloadId` it binds durable state by re-reading the supplied **intent key**:

`bindPendingLocalDownloadIntent(key, downloadId)`.

That helper reads the current record under `intent:X`, deletes that key and writes the record under the numeric Chrome downloadId.

A deterministic corruption schedule therefore exists even if the Blob URLs themselves were created correctly:

1. A creates Blob URL A and persists `intent:X` containing Journal/meta A;
2. B uses the same operationId X and overwrites `intent:X` with Blob/meta B;
3. A starts `chrome.downloads.download({url: BlobA, filename: filenameA})`;
4. A's late successful start receives downloadId DA;
5. A binds `intent:X`, but the record now belongs to B;
6. DA is now durably associated with B's Journal/meta/expected bytes while the physical DownloadItem is A.

If A/B have equal bytes, terminal reconciliation can append a Journal entry describing B for physical file A. If sizes differ, finalization may fail closed, but A's wrong/orphan physical file already exists and B's original durable intent has been consumed/mis-bound.

This is not the existing P0-048 fallback ambiguity. No discovery heuristic is required: the wrong durable record is selected by an exact collided key before normal DownloadItem reconciliation.

### 7. Same-key replacement also destroys recovery uniqueness

Because the intent object-store key is the operationId-derived string until native start settles, there cannot be two independent unresolved same-id intents. The newer one overwrites the older one.

P0-039's guarantee that an irreversible physical save retains its exact recovery metadata therefore depends on intent identity being independently unique/no-overwrite, not merely on writing *some* checkpoint before `chrome.downloads.download()`.

## P1-146 actual-settlement cap is bypassable by the same collision

### 8. The unresolved-start tracker is keyed by the collided intent key

`startAutomaticBlobDownloadBounded()` checks:

`automaticDownloadStartSettlements.size >= MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS`

with the configured cap of four actual unresolved starts.

After starting the raw Chrome promise it stores:

`automaticDownloadStartSettlements.set(key, settlement)`

and removes it later only if the map still points to that exact settlement.

There is no fail-closed `has(key)` check before starting a second physical native download with the same key.

### 9. Reusing one textual operationId undercounts actual Chrome promises

A starts native download under key `intent:X`; the map size becomes one.

Before A's actual `chrome.downloads.download()` promise settles, B with the same key starts another raw Chrome download. The map entry is replaced by B's promise, but A's promise is still physically unresolved.

The map still reports size one although two actual Chrome side effects are unresolved. Repeating the same key can therefore bypass the specific P1-146 invariant that admission counts actual unresolved starts rather than logical map keys.

Other independent offscreen/blob/storage bounds may limit practical fan-out, but they do not make the P1-146 claim true. The automatic-download start tracker itself is not an exact count of physical unresolved starts under key collision.

## P1-198 correction / priority composition

The original P1-198 delta stated that the audit had not found `operationId` used as the primary key of destructive Yandex/local checkpoints, which supported a P1 forensic/provenance classification.

Fresh source proof above corrects that statement for local saves:

- physical PDF cache key derives from operationId;
- durable pending local-download intent key derives from operationId;
- actual native-start tracking key derives from the same intent key.

Do not create a duplicate P0 solely for this manifestation. Keep P1-198 as the stable live-operation identity owner, but treat its implementation as a required dependency for closing the local-save portions of P0-079/P0-039/P0-048 and for restoring P1-146's actual-settlement cap.

The stable display `operationId` may remain visible/exportable. It must stop being the unique physical/durable owner key.

## Required unified contract

### Worker-issued operation receipt

At live operation admission, issue a worker-owned receipt/generation per P1-198. Caller text can be kept only as display/correlation metadata.

A duplicate request carrying the same live receipt must either:

- resume the exact already-created idempotent state; or
- fail closed as duplicate/stale.

It must never silently create a second physical PDF/download while reusing the same receipt.

### Independent PDF generation id

Each printed PDF that can cross an irreversible boundary gets a cryptographically random immutable `pdfGenerationId` / cache key independent of display operationId and tabId.

Bind it to:

- worker operation receipt;
- exact source document/navigation generation (P0-070/P0-023);
- Journal entry id where applicable;
- byte length + strong local digest/content receipt;
- lifetime/in-flight ownership state.

Cache create must be no-overwrite. Cleanup must compare generation/owner before delete.

### Independent download intent / start attempt ids

Before `chrome.downloads.download()`:

1. create a random `downloadIntentId` independent of operationId;
2. persist it with expected PDF generation, Blob URL, Journal metadata and operation receipt using no-overwrite semantics;
3. create a separate random `downloadStartAttemptId` (or equivalent actual-promise receipt) when the non-cancellable Chrome start is admitted;
4. count actual unresolved starts by physical attempt/promise, not a map key that can be overwritten;
5. on late success, bind numeric downloadId only if the original exact intent + attempt generation still match in the same authoritative transaction.

A stale/duplicate late start must never bind whichever newer intent happens to occupy a reused logical key.

### Blob handoff

`createPdfCacheBlobUrl()` / offscreen must consume the exact immutable PDF generation and return/verify owner receipt (and size/digest where useful) before the irreversible native download intent is started.

Do not accept a mutable textual alias as proof of which bytes were materialized.

### Clear/import/navigation composition

- clear/import generation fencing (P0-072/P0-076) may invalidate local Journal finalization authority without allowing a stale operation to bind to a replacement intent;
- navigation invalidates **new retry/document authority**, but an already-admitted exact physical body/start attempt retains its own settlement evidence;
- same-URL reload remains exact-document stale under P0-023/P0-070.

## Required deterministic regressions

1. A and B deliberately use the same caller display operationId X; they cannot share/overwrite one physical PDF cache record.
2. A caches PDF A, B with X runs before A offscreen read; A Blob is A or A fails closed, never B.
3. Equal-sized different A/B PDFs cannot hide substitution.
4. A cleanup cannot delete B's generation even when display ids match.
5. A persists intent, B with same display X is admitted: B cannot overwrite A's durable intent.
6. A physical DownloadItem + B metadata schedule above never binds B metadata to A downloadId.
7. Duplicate delivery of the exact same operation receipt does not start a second physical download unless an explicit idempotent/resume state machine authorizes it.
8. Four unresolved native starts plus a fifth reusing an existing display id are still counted as five physical starts for admission; fifth is rejected/deferred according to P1-146.
9. Repeated same display id cannot make `automaticDownloadStartSettlements.size` undercount actual unresolved Chrome promises.
10. Late success for start attempt A cannot bind a newer intent B after A's logical/display id has been reused.
11. P0-048 numeric downloadId no-overwrite/ambiguity tests remain required independently after exact intent identity is fixed.
12. P0-039 unknown-outcome recovery retains the exact original Journal/PDF/intent receipt and cannot be replaced by a later same-id operation.
13. Same-URL reload invalidates retry capability for the old document without deleting an already-admitted exact physical start/body receipt.
14. Normal single-operation direct download, cached local download and Yandex save continue to use one exact source-document → PDF-generation → side-effect receipt chain.

## Duplicate check / numbering

No new P0/P1/P2 number is assigned.

This is not a new P0-080 because the physical cache generation requirement belongs to P0-079 and the root live-id issuance defect belongs to P1-198.

This is not a new local-recovery item because P0-039 owns preservation of exact durable metadata and P0-048 owns bound DownloadItem no-overwrite. Fresh evidence adds a missing **pre-bind intent identity** requirement to those acceptance contracts.

This is not a new resource-budget item because P1-146 already explicitly promises a cap over actual unresolved native-start promises; its tracker key must simply become collision-safe/attempt-owned.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_RECOVERY_2026-08-27.md`

SHA-256 of UTF-8 source text: `2a26597d9296c5084115225e5135dd4ca692dde31bb2b4e889560dc562d49bbb`

# Local download recovery audit delta — 2026-08-27

Baseline source HEAD: `ff576e5f76dc64048e60e38233ef197e73c56838`.

This is a lossless audit checkpoint for existing recovery items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-039 refinement — bounded `downloads.search()` miss is not negative proof

P0-039 already requires that absence of a DownloadItem after 24 hours must not be treated as proof that the physical file was never saved. Fresh code review found a second, earlier reason that the current negative proof is unsound for unbound download intents.

Current intent reconciliation:

- scans at most `PENDING_LOCAL_RECONCILE_BATCH = 12` checkpoints per maintenance pass;
- for an intent without a bound `downloadId`, calls `chrome.downloads.search({ startedAfter, limit: 200 })`;
- filters the returned array to own-extension DownloadItems and then tries exact Blob URL first, conservative filename+bytes fallback second;
- if no candidate is found and the intent becomes older than `PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h`, removes the durable checkpoint, revokes the Blob URL if present, and logs that the Journal entry was not created.

The hard `limit: 200` means a successful `downloads.search()` call only proves that the matching item was not found **inside that bounded result set**. If more than 200 DownloadItems satisfy the `startedAfter` filter, a valid exact own-extension candidate can be omitted from the returned sample. Therefore `download === undefined` after this query is not even proof that Chrome Downloads history lacks the item; it can simply be a bounded-discovery miss.

Required extension of P0-039:

- Never TTL-drop the only durable intent because a capped candidate scan returned no match.
- Recovery discovery must either establish a completeness property for the searched time/key range or preserve the checkpoint as unresolved/dead-letter/manual-resolution evidence.
- If a bounded search cannot enumerate all plausible candidates, record `discoveryIncomplete` (or equivalent) distinctly from authoritative `notFound`.
- Do not convert repeated bounded search misses into physical-file absence by elapsed wall-clock alone.
- P0-039's existing rule still applies after Chrome history was genuinely cleared: missing history is unknown outcome, not proof of no physical file.

Required regression:

1. Create an unresolved intent whose exact own-extension DownloadItem exists, but arrange >200 later DownloadItems inside the current `startedAfter` range so the matching item is outside the first bounded result set.
2. Maintenance must not delete the intent at 24h merely because that capped query missed it.
3. Recovery evidence remains bounded/manageable (dead-letter/manual-resolution is acceptable) and no false Journal success is created.

No new P0/P1 number is assigned because the data-loss mechanism is exactly P0-039's prohibited destruction of the sole unknown-outcome checkpoint on insufficient negative evidence.

## Existing P0-048 confirmation — ambiguous fallback and downloadId claim remain open

Fresh review reconfirms the current fallback implementation:

- candidate array is filtered to own-extension DownloadItems;
- exact Blob URL is primary identity;
- fallback accepts requested filename + exact bytes + short age window;
- selection still uses `.find(...)`, i.e. the first matching candidate;
- the recovery scan does not establish that fallback has exactly one candidate and does not exclude DownloadItems already claimed by another pending checkpoint before selecting one;
- `bindPendingLocalDownloadIntent()` deletes the intent key and `put()`s the bound item under numeric `downloadId`; if another checkpoint already owns that key, IndexedDB `put()` can replace it.

This remains precisely P0-048 PARTIAL. Required resolution continues to be: zero or multiple fallback candidates fail closed, already-claimed ids are excluded, and binding uses an atomic no-overwrite/expected-owner contract.

## Positive findings retained

This pass also confirms several existing safeguards:

- `downloads.search()` API errors/timeouts are treated as recovery errors and keep the checkpoint; they are not converted to not-found.
- Once a checkpoint has a known numeric `downloadId`, reconciliation uses exact `downloads.search({id})` rather than the 200-item discovery scan.
- ownership gate `byExtensionId === chrome.runtime.id` is applied before recovery accepts a candidate (P1-087).
- append after physical completion rechecks the required durable checkpoint in the same IndexedDB transaction; if clear/import intentionally removed that checkpoint, the old metadata is not resurrected (P0-072 behavior).
- automatic `downloads.download()` starts keep a durable intent before the non-cancellable browser call and maintain a global unresolved-start cap of four (P1-146).

## Existing P1-067 note — Blob deadline behavior remains intentional, not a new finding

After the 15-minute automatic-download resource deadline, WebClip checks `downloads.search({id})`; for in-progress or unknown state it makes a bounded best-effort `chrome.downloads.cancel(id)` attempt and then releases the Blob URL. The cancel promise itself can time out locally, but the accepted P1-067 contract explicitly chooses bounded resource lifetime after a cancel attempt. This audit does not reclassify that trade-off as a new issue.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_RECOVERY_FAIRNESS_2026-08-27.md`

SHA-256 of UTF-8 source text: `5489515b38c73984f167dc1423e31b62d92956205e0913c3bfb021a89fcd186e`

# Audit delta — local download recovery fairness

Date: 2026-08-27
Source-of-truth `main` immediately before write: `c61d56e10094662514b268b287a1c5be685bf692`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Existing P1-064 must be refined — oldest-first batch can starve later terminal checkpoints

Canonical P1-064 introduced bounded local-download reconciliation: maintenance reads the oldest `pendingDownloads` first and processes at most 12 per pass. That bounds API/memory work, but the current implementation does not guarantee progress/fairness when the oldest items remain nonterminal.

### Fresh source proof

`reconcilePendingLocalDownloads(trigger, maxItems=PENDING_LOCAL_RECONCILE_BATCH)` reads:

`store().index('updatedAt').openCursor(null, 'next')`

and stops after the first `max` entries (`PENDING_LOCAL_RECONCILE_BATCH = 12`).

For a bound checkpoint whose own-extension Chrome `DownloadItem` exists and has `state === 'in_progress'`, reconciliation:

- optionally reattaches Blob cleanup;
- increments only the local `pendingCount` counter;
- leaves the checkpoint in IndexedDB;
- does **not** update `updatedAt`;
- does not apply the 24-hour missing-download TTL because the DownloadItem still exists.

Therefore the same old in-progress checkpoints remain at the head of the `updatedAt` index on every later maintenance pass.

By contrast, several failure/retry paths in other recovery queues update `updatedAt`, naturally moving attempted work behind newer items. Local `in_progress` items do not.

### Deterministic starvation scenario

1. Create 12 valid own-extension pending local checkpoints D1..D12, all older than D13.
2. Chrome reports D1..D12 as `in_progress` indefinitely (paused, very slow, user/network stalled, etc.).
3. D13 is already `complete`, but its terminal event/finalization was missed — exactly the class maintenance recovery is intended to reconcile.
4. Every hourly recovery scan selects D1..D12 because they are still the oldest 12.
5. Their `updatedAt` values never change.
6. D13 is never inspected and its Journal append can be delayed indefinitely, despite being fully recoverable.

The same head-of-line pattern can delay an `interrupted` later checkpoint and its cleanup/diagnostic finalization.

This is independent of the normal `downloads.onChanged` fast path: recovery exists specifically to repair lost worker/event/finalization windows, so it must not assume that every later terminal item will receive another useful event.

### Classification / duplicate check

No new P-number is created.

This is the same root cause as **P1-064**: bounded background reconciliation architecture. The original item correctly limited work to oldest-first batches, but its acceptance must additionally require fair progress across the durable queue.

Do not duplicate as P1-200.

Related but separate:

- P0-039 owns preservation of unresolved checkpoint evidence instead of destructive TTL-drop when physical outcome is unknown.
- P1-087 owns own-extension `DownloadItem` identity.
- P1-146 owns actual settlement of `chrome.downloads.download()` start.
- P1-064 owns which durable pending items maintenance eventually gets to inspect.

### Required P1-064 refinement

Keep the per-pass bound, but make iteration fair.

Acceptable designs include a durable round-robin/scan cursor or touching a checked nonterminal item so it moves behind unexamined work, provided ordering cannot corrupt checkpoint authority.

Required invariants:

1. No single nonterminal checkpoint may permanently occupy a bounded scan slot.
2. Every active checkpoint must receive a reconciliation opportunity within a bounded number of maintenance passes, subject to an explicit global deadline/API budget.
3. Terminal `complete/interrupted` items discovered later in the queue must not starve behind paused/slow downloads.
4. Rotation/fairness metadata must be durable across MV3 worker restarts.
5. Do not delete or downgrade recovery evidence merely to achieve fairness.
6. `DownloadItem` ownership (`byExtensionId`) and exact checkpoint binding remain mandatory.
7. No blind restart/retry of the physical download is introduced; reconciliation remains read-only until proven terminal state authorizes existing finalization.

### Regression requirements

- 12 old `in_progress` + 1 newer `complete`: the completed item is reconciled within a bounded number of scans.
- 12 old `in_progress` + 1 newer `interrupted`: interrupted cleanup is likewise reached.
- Restart between scans preserves rotation/fairness progress.
- A still-in-progress item remains durable and is not falsely marked complete/failed.
- More than 100 queue entries remain subject to the existing admission cap and bounded batch/API work.
- Failure of `downloads.search()` for one item does not pin the entire head forever; retry metadata/fair scheduling still advances other items.

## Positive control from the same audit block

`pendingRemoteSaves` does not show this exact permanent-head behavior on ordinary failures: failure handling increments `attemptCount` and updates `updatedAt`, moving retried work in the indexed queue. Auth-unavailable deferral affects all remote items uniformly and therefore is a separate scheduler/usability concern already tracked under the Yandex auth items.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_START_VS_HISTORY_RETENTION_STATES_2026-08-28.md`

SHA-256 of UTF-8 source text: `bdba1238e02b256248e93c81a8df8b14e4db85580fce386a2879f7258757ca65`

# Audit delta — local download start receipt vs DownloadItem/history retention states — 2026-08-28

Source-of-truth `main` before this checkpoint: `7de06abc93b577ea454a21f0e5cb783f3559e9e0`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-039**, **P0-048**, **P1-146**, **P1-087** and the compact detached-evidence contract recorded in the preceding audit session.

The current `PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h` is applied to states with materially different evidence. A single wall-clock threshold cannot both reclaim resources and prove that a non-cancellable Chrome download side effect never occurred.

## Current local-download state has at least two physical identity phases

Before `chrome.downloads.download()` WebClip stores an unbound intent under a key shaped like `intent:<...>`.

After Chrome returns a numeric `downloadId`, the intent is bound to a numeric pending checkpoint and later recovery queries that exact id.

These states mean different things:

### Unbound intent

WebClip knows:

- exact local operation/PDF/blob intent;
- that a Chrome download start may have been admitted;
- but no durable numeric `downloadId` was observed/bound yet.

### Bound DownloadItem

WebClip knows:

- exact `downloadId`;
- its pending Journal metadata;
- later `downloads.search({id})` can reconcile browser state while Chrome retains that history item.

The evidence and safe cleanup rules are not interchangeable.

## Positive controls

Current recovery correctly includes several important protections:

- exact Blob URL is the primary unbound-intent match;
- filename + expected bytes is only a short-window fallback;
- candidates must have `byExtensionId === chrome.runtime.id`;
- Downloads API read errors preserve the checkpoint rather than treating them as absence;
- numeric-bound reconciliation also filters by own-extension ownership.

P0-048 already owns the remaining fallback ambiguity where `.find()` can choose the same candidate for multiple intents.

This checkpoint does not duplicate that finding.

## Fresh issue — unbound intent age starts before actual browser settlement is known

The unbound-intent branch computes:

`intentAge = Date.now() - (createdAt || updatedAt)`.

It searches recent DownloadItems. If no candidate can be bound and `intentAge > 24h`, current code removes the pending intent, revokes its Blob URL and logs that no Journal record was created.

But `createdAt` is the local intent/admission time. It is not an authoritative browser receipt proving the underlying non-cancellable `downloads.download()` call settled as `no download created`.

A local timeout/worker death is not browser cancellation.

Therefore:

`24h since intent creation + no currently searchable DownloadItem`

is not a physical non-occurrence proof.

## MV3 worker loss makes the distinction unavoidable

Same-worker code keeps unresolved actual Chrome starts in `automaticDownloadStartSettlements` and caps them. That is a useful admission bound.

The map is module memory. After MV3 termination it cannot tell a future worker whether the old browser-side start:

- never reached Chrome;
- was rejected;
- created a DownloadItem whose response was lost;
- created a DownloadItem later removed from history;
- remains in an unusual delayed browser-owned settlement state.

The durable intent is precisely the crash evidence that survives that loss.

Removing it because its wall-clock age exceeded 24h converts `unknown physical result` into `no retained evidence` without an authoritative settlement receipt.

## Bound DownloadItem has a different 24h problem

For a numeric pending key current recovery performs exact `downloads.search({id})`.

If no DownloadItem is found and checkpoint age exceeds 24h, current code removes the pending checkpoint and Blob and records terminal diagnostic text.

P0-039 already proves why this is unsafe: Chrome/user may have cleared download history even after a physically successful file write.

The fresh retention-model point is that the same numeric constant currently represents two different assumptions:

- unbound start could not be reconciled;
- bound historical DownloadItem is no longer queryable.

Neither absence is proof that no physical file existed.

## Resource lifetime and evidence lifetime must be separate

A Blob URL or cached PDF body may need a finite resource deadline to avoid pinning memory/storage indefinitely.

The exact physical-operation evidence does not need to retain those heavy resources indefinitely.

After a resource deadline:

1. stop/clean expensive retry resources according to exact owner state;
2. retain a compact detached receipt for unresolved physical outcome;
3. mark whether the receipt was never-bound or numeric-bound;
4. never describe resource reclamation as proof that the browser side effect did not occur.

This composes directly with the prior `AUDIT_DELTA_COMPACT_DETACHED_RECEIPT_RETENTION_2026-08-28.md` architecture.

## Required local download state model

A versioned generation should distinguish at least:

- `prepared-intent` — durable before browser admission;
- `start-admitted/outcome-unknown` — browser start may be in flight, no numeric id confirmed;
- `download-bound` — exact own-extension numeric id known;
- `download-complete` — exact DownloadItem reports complete;
- `download-interrupted` — exact DownloadItem reports interrupted;
- `history-unavailable/unknown` — previously unresolved/bound evidence cannot be queried authoritatively;
- `detached-stale-journal-generation` where clear/import revoked Journal finalization;
- compact terminal/dead-letter class when rich retry resources are reclaimed.

The implementation may collapse some phases if equivalent proof is retained, but must not collapse unknown into absent.

## Age belongs to a physical generation, not to a reused Journal id

Each local-download generation needs its own:

- created/admitted timestamp;
- numeric bind timestamp when available;
- last authoritative browser observation;
- resource-retention deadline;
- evidence-retention/dead-letter transition.

A retry/new physical generation cannot inherit age/attempt history from an earlier attempt, matching the remote-save generation rule established in the preceding session.

## P0-048 exact matching composition

When an unbound intent is reconciled by search:

- exact Blob URL remains strongest current evidence;
- heuristic fallback requires exactly one unclaimed own-extension candidate;
- one DownloadItem cannot satisfy two physical generations;
- `bindPendingLocalDownloadIntent()` must compare ownership and refuse to overwrite an existing different numeric generation;
- after bind, later state changes address that exact generation/id.

A retention transition cannot make ambiguity disappear by selecting the first candidate merely because the intent is old.

## Journal finalization authority

A compact unresolved receipt is not authority to create a Journal entry.

Automatic Journal success still requires the strong proof required by P0-048/P1-087:

- exact own-extension DownloadItem;
- correct physical generation binding;
- terminal `complete` state;
- expected Journal generation/capability still current.

If history is unavailable, retain evidence/manual state without fabricating a successful Journal record.

## Required deterministic regressions

1. Unbound intent -> browser start response lost -> worker restart -> no searchable item for >24h: heavy Blob may be reclaimed, but compact unknown-start receipt survives; system does not claim no download occurred.
2. Same case where DownloadItem appears later -> retained generation can be reconciled without starting a second download automatically.
3. Bound exact DownloadItem physically completes -> history is cleared before recovery -> >24h: Journal is not falsely finalized, but physical-generation evidence remains bounded/detached.
4. Bound DownloadItem is authoritatively interrupted -> terminal interruption can retire retry resources according to policy without leaving an `unknown` classification.
5. Downloads API search throws -> no absence/TTL conclusion is drawn from the failed read.
6. Two equal filename/byte intents -> ambiguous fallback cannot bind either to the same item.
7. Exact Blob URL candidate and heuristic candidate coexist -> exact generation wins; heuristic does not steal another claimed id.
8. Rich Blob/PDF retry cache expires while physical result stays unknown -> compact receipt remains and contains no large body.
9. Clear/import while local download active -> Journal capability becomes stale while physical receipt survives detached.
10. Normal exact complete DownloadItem finalizes once and compact evidence can then be retired under ordinary terminal retention.
11. New retry B gets a new age/admission generation; it never inherits old A's 24h age.
12. OperationLog cleanup/clear does not remove the physical local-download receipt.

## Duplicate check / numbering

No new item is created.

- **P0-039** owns preservation of unresolved physical save evidence.
- **P0-048** owns exact local DownloadItem identity/binding ambiguity.
- **P1-087** owns own-extension DownloadItem provenance.
- **P1-146** owns non-cancellable `downloads.download()` actual-settlement/admission behavior.
- Existing detached-receipt/storage-pressure items remain the retention implementation dependencies.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime change, build, tag or Release was made.

## Retired source: `AUDIT_DELTA_LOCAL_DOWNLOAD_TERMINAL_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `3e0aec16deefbb3a24d6ab002d0a2444482f5e8f91d7760cc604f47e351b24ff`

# Audit delta — exact local DownloadItem terminal receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `8dc382e7adaa46d7ad3081c6e24b87802af8da4f`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh review unifies existing **P0-039** and **P0-048** acceptance: a `chrome.downloads.onChanged` terminal-state delta is a **reconciliation trigger**, not a sufficient physical terminal receipt for Journal finalization or destructive checkpoint/resource cleanup.

Composed owners remain **P1-067** for Blob lifetime, **P1-146** for non-cancellable start settlement, **P1-087** for own-extension DownloadItem proof, **P1-198** for operation generation and **P0-079** for exact PDF generation ownership.

## Fresh source proof

### 1. Current global listener finalizes from state delta only

Current worker installs:

`chrome.downloads.onChanged.addListener(delta => ...)`

and, for any numeric id whose `delta.state.current` is `complete` or `interrupted`, immediately calls:

`finalizePendingLocalDownload(delta.id, state, delta.error?.current)`.

The listener does not first exact-read `chrome.downloads.search({ id })`.

### 2. Complete path writes Journal directly from pre-download checkpoint

`finalizePendingLocalDownload(id, 'complete')` loads `pendingDownloads[id]` and passes `pending.data` directly into `appendJournalEntryFromDurableCheckpoint(...)`.

That checkpoint was created before `chrome.downloads.download()` and contains WebClip's **requested** filename. It does not contain Chrome's final resolved physical basename.

Therefore the fast path can commit a successful Journal row without incorporating the strongest terminal DownloadItem evidence available after completion.

### 3. `conflictAction:'uniquify'` makes requested filename non-authoritative

Automatic download explicitly asks Chrome to `uniquify` conflicts. Hence a requested `name.pdf` may physically become `name (1).pdf`, etc.

The existing actual-filename delta already proves the user-visible metadata consequence. This pass makes the architectural requirement explicit: exact-item terminal read should be the shared source for both normal event-driven finalization and restart recovery, rather than maintaining weaker fast-path semantics.

### 4. Interrupted path needs an exact item for an even stronger reason

Current event listener also sends every `interrupted` delta directly to finalization/cleanup. The interrupted-lifecycle audit already proves that Chrome's exact DownloadItem can carry `canResume` and stronger bytes/error/state information.

Thus one coarse state delta currently drives:

- deletion/classification of durable recovery evidence;
- Blob URL release via a second onChanged watcher;
- user/log terminal semantics;

without requiring exact current DownloadItem inspection.

### 5. Recovery path already demonstrates the better pattern

For a checkpoint with a bound numeric `downloadId`, background reconciliation performs exact-id `chrome.downloads.search()` and verifies own-extension identity before using the item state.

This is a useful positive control. The fast terminal event path should converge on the same receipt semantics rather than becoming a weaker correctness path merely because an event arrived promptly.

### 6. Filename delta can arrive separately from terminal state

The listener ignores deltas without `state.current`. Even if Chrome emitted a filename change during collision resolution, WebClip does not retain it as part of the pending receipt. Terminal finalization still uses the original checkpoint filename.

A robust implementation should not depend on ordering/availability of separate filename deltas. Exact-id lookup at terminal reconciliation naturally obtains current resolved fields.

## Required unified contract

### Terminal event = wake signal

On `complete` / `interrupted` event:

1. identify the exact bound checkpoint generation for that numeric id;
2. perform bounded exact-id Downloads API read;
3. verify own-extension/binding identity and expected generation;
4. classify from the exact current item;
5. only then commit Journal success or terminal/resource cleanup.

If exact read times out/errors, preserve unresolved checkpoint and retry later. Do not convert API uncertainty into terminal proof.

### Exact completion receipt

For a proven own-extension completed item, retain only privacy-minimal required physical fields, including:

- numeric downloadId;
- requested basename separately;
- exact resolved basename extracted from `DownloadItem.filename` without persisting full filesystem path;
- terminal state;
- observed total/file byte evidence where meaningful;
- exact local intent/PDF generation receipts.

Journal should use the resolved basename when it claims a physical saved filename.

### Exact interruption receipt

For `interrupted`, use exact current state including `canResume`, error and relevant bytes. `canResume:true`, API timeout or missing/ambiguous item are not equivalent to proven non-resumable terminal failure.

Blob/body lease may expire under P1-067, but durable operation evidence must not be deleted merely because expensive source bytes are released.

### Same semantics in fast path and maintenance

Event-driven finalization and maintenance reconciliation must call the same classifier/commit primitive so timing does not decide correctness.

A fast event must not create a lower-evidence Journal row than the slower restart path.

## Deterministic regressions

1. Existing `name.pdf` causes Chrome `uniquify` to `name (1).pdf`; complete event arrives -> exact-id receipt records `name (1).pdf` basename in Journal.
2. Filename change delta is missed/reordered but complete state arrives -> exact terminal lookup still obtains correct basename.
3. Exact-id lookup times out after complete event -> checkpoint remains unresolved; no false Journal success until later proof.
4. Exact-id result is not own-extension / mismatches expected generation -> fail closed; do not consume checkpoint.
5. Interrupted event + exact item `canResume:true` -> checkpoint remains nonterminal and Blob/resource policy follows P1-067.
6. Interrupted event + exact item `canResume:false` -> no success Journal; terminal resource cleanup may proceed according to policy.
7. Interrupted event + exact read failure -> unknown, not terminal.
8. Worker misses event entirely -> maintenance reaches the identical exact receipt/finalization result.
9. Two same-name/same-size downloads with distinct numeric ids remain separate and get their own resolved basenames.
10. Full local filesystem path never enters Journal/export/OperationLog solely to achieve filename truth.
11. Outer response loss after physical completion remains P1-210: UI reconciliation observes the same exact terminal receipt and does not start a blind second download.
12. Clear/import removal of the exact checkpoint still prevents late terminal event from resurrecting stale Journal metadata.

## Numbering result

No new item. Primary owners remain **P0-039/P0-048**. P1-067/P1-146/P1-087/P1-198/P0-079 remain required adjacent layers.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_NATIVE_SAVE_AS_LIFECYCLE_2026-08-28.md`

SHA-256 of UTF-8 source text: `d1703665f176c4c95a69cde916e59ba33520abe231540f29abb7d8a66f516647`

# Audit delta — native Save As lifecycle completion — 2026-08-28

Source-of-truth `main` immediately before this write: `4297dd195c8cfd6e861d54e36d7af2bda8322e49`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh current-source proof completes the requested native Save As lifecycle block and refines existing **P1-156**. A smaller crash-cleanup manifestation also refines **P1-169**. No independent root cause warrants a new P-number.

Primary owners:

- **P1-156** — page-owned native Save As lifetime, PREPARED/STARTED reconciliation, active-index GC, Blob pinning and bounded RELEASE control;
- **P1-169** — bounded RELEASED tombstone retention/cleanup and crash-consistent cleanup of tombstone-adjacent records;
- **P1-067** remains the separate automatic/started Blob-backed download resource-deadline owner and must not be used to impose a wall-clock timeout on the user-owned native Save As dialog.

## Positive controls revalidated

### Native dialog is intentionally not caller-timed

`prepared-save-as.js::start()` awaits:

`chrome.downloads.download({ url: blobUrl, filename, saveAs: true, conflictAction: 'uniquify' })`

without a local `Promise.race`/deadline. This is correct and preserves the project invariant that the visible extension page, not a worker timer, owns the non-cancellable native Save As interaction.

### PREPARED / STARTED / RELEASED use distinct session keys

The worker uses keys derived from one random `saveAsSessionId` and a stage suffix:

- `...:<session>:prepared`;
- `...:<session>:started`;
- `...:<session>:released`.

A RELEASED tombstone therefore cannot be overwritten merely because an old PREPARED/STARTED write settles late under another worker turn.

### Checkpoint mutations follow actual settlement ordering

`queuePreparedSaveAsCheckpointMutation()` keeps later transitions behind the actual settlement of the previous storage mutation even when the logical caller hits `PREPARED_SAVE_AS_CHECKPOINT_TIMEOUT_MS`.

This correctly preserves `timeout != cancellation` for Chrome Storage mutations.

### Active PREPARED admission is capped

`webclipPreparedSaveAsIndex` is capped at 64 active sessions. A new PREPARED session fails closed when the active index is full rather than growing without bound.

### STARTED worker cleanup does not blindly revoke an active download

Once the worker receives `WEBCLIP_PREPARED_SAVE_AS_STARTED`, it arms `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)`. Its fallback deadline first exact-reads/cancels a still-active DownloadItem before releasing the Blob URL. That post-STARTED bounded-resource policy is materially different from timing the native dialog itself.

## P1-156 — confirmed lifecycle gaps

### 1. The common offscreen Blob TTL is still a hidden native-dialog timeout

`offscreen.js::registerBlobUrl()` applies:

`BLOB_URL_FALLBACK_TTL_MS = 16 * 60 * 1000`

to every created Blob URL.

Journal/OperationLog Save As preparation creates the Blob URL and only then opens the native Save As dialog. `WEBCLIP_PREPARED_SAVE_AS_STARTED` is sent only after `await chrome.downloads.download({saveAs:true})` returns a numeric `downloadId`.

Deterministic schedule:

1. worker creates Blob URL and durable PREPARED checkpoint;
2. extension page calls `downloads.download({saveAs:true})`;
3. user leaves the native dialog open for more than 16 minutes;
4. no STARTED transition exists yet because the browser call has not returned;
5. offscreen fallback timer revokes the Blob URL;
6. the user later confirms a destination, but the backing source was already revoked by WebClip's wall-clock policy.

Therefore the current implementation still violates the accepted native-dialog lifetime invariant indirectly even though the page call itself has no timeout.

Required P1-156 fix remains: PREPARED Save As must pin/lease the exact Blob generation for the actual native-dialog lifetime. Crash reclamation must be based on owner/reconciliation state, not elapsed dialog wall-clock time.

### 2. Page crash after `download()` returns but before STARTED reaches the worker can orphan an active DownloadItem

`prepared-save-as.js` installs its page-owned `downloads.onChanged` listener after receiving the numeric `downloadId`, then sends `WEBCLIP_PREPARED_SAVE_AS_STARTED` to the worker.

The worker-side DownloadItem watcher is armed only inside the STARTED message handler.

Deterministic schedule:

1. native dialog completes and Chrome returns `downloadId = D`;
2. page installs its local `onChanged` listener;
3. before the STARTED runtime message is delivered/accepted, the extension page crashes, reloads or its context is invalidated;
4. the page listener disappears;
5. worker never learned D and therefore has no `downloads.search({id:D})`/watchdog reconciliation owner;
6. durable PREPARED and active-index state survive in `chrome.storage.session`, while the actual Chrome DownloadItem may remain active/complete/interrupted;
7. offscreen 16-minute TTL becomes the only eventual Blob cleanup.

This is exactly the P1-156 requirement for crash-safe PREPARED→STARTED reconciliation. A numeric DownloadItem outcome must not depend on one page message being delivered after the non-idempotent browser call already returned.

### 3. Worker restart after STARTED loses the secondary watcher while the durable STARTED checkpoint survives

The worker watcher registry `downloadBlobCleanupWatchdogs` is module memory. PREPARED/STARTED checkpoints and the active index are in `chrome.storage.session`.

If a worker restart happens after STARTED was durably written:

- the STARTED record survives the worker;
- the `downloads.onChanged` listener/watchdog owned by the old worker does not;
- current startup/maintenance code does not reconstruct Save As watchers from `webclipPreparedSaveAsIndex` + STARTED records with exact `downloads.search({id})` reconciliation.

If the originating page also disappears before terminal cleanup, the active session can remain in the cap forever and terminal DownloadItem state is not consumed to release it.

This remains P1-156, not P1-124: the irreversible side effect here is an already-known Chrome download and the missing contract is recovery of the durable Save As state machine, not exact `tabs.create()` receipt recovery.

### 4. Page-owned `onChanged` cleanup has no terminal read fallback

`armPageOwnedCleanup()` removes its listener only after a matching `complete`/`interrupted` delta and sends RELEASE best-effort. There is no bounded `downloads.search({id})` reconciliation if the event was missed.

The worker-side watcher has a bounded fallback after STARTED, but the page can be the only watcher in the crash window above. Therefore the page listener cannot be treated as the sole terminality proof.

Required P1-156 design should use exact DownloadItem reconciliation from durable STARTED state and keep the page listener only as a fast path.

### 5. RELEASE control RPC remains best-effort and unbounded at the page layer

`releasePreparedBlob()` directly calls `chrome.runtime.sendMessage(...).catch(() => {})`.

A lost/hung response does not prove whether RELEASE reached the worker. The current durable stage keys make repeated identical RELEASE conceptually safe, but the page does not provide a bounded/deduplicated control-call helper or reconcile the session after unknown outer settlement.

This is the already registered P1-156 RELEASE-control gap. It composes with P1-210's general outer-transport truthfulness rule, but no fresh Save As retry path was found that independently creates a second physical Save As from this release failure alone.

## P1-169 — RELEASE crash-window refinement

`releasePreparedSaveAsCheckpoint()` performs this logical sequence under the serialized queue:

1. read active index;
2. `storage.session.set()` the next index **without the session** and write the RELEASED tombstone;
3. `storage.session.remove([preparedKey, startedKey])`;
4. revoke the Blob URL.

The first mutation is a useful commit point: after it settles, a late STARTED sees the RELEASED tombstone and refuses to reassert authority.

However an MV3 termination after step 2 and before step 3 can leave:

- RELEASED tombstone;
- stale PREPARED/STARTED records for the same session;
- no active-index entry that would make those stale records discoverable through the active set.

Current code already has no bounded RELEASED tombstone GC (P1-169). The same retention/reconciliation routine should also remove stale PREPARED/STARTED siblings only after the RELEASED generation is authoritative. Do not weaken the tombstone barrier merely to reclaim keys.

Blob memory remains bounded by the offscreen fallback TTL, but session-storage correctness/retention should not depend on that unrelated timer.

## Exact transition ownership — acceptance hardening, not a new blocker

Fresh source also shows that `markPreparedSaveAsStarted()` checks only that:

- RELEASED is absent;
- PREPARED exists for the supplied `sessionId`.

It then stores a newly constructed STARTED record from message fields. It does not compare stored PREPARED `blobUrl`, `ownerPage`, `operationId` or filename/generation with the transition request.

Similarly RELEASE reads the active index but revokes the `blobUrl` supplied by the message rather than deriving the exact owned Blob from the stored PREPARED/STARTED record.

The current `prepared-save-as.js` helper consistently closes over one `{blobUrl, saveAsSessionId}` pair, and this audit did **not** find an admissible current product schedule that swaps fields between two live sessions without already assuming corrupted/modified trusted extension code. Therefore this does not justify a separate P-number.

Nevertheless the P1-156 owner/generation repair should make state transitions exact:

- PREPARED is the authoritative immutable session receipt;
- STARTED must CAS/validate the same session/blob/owner/operation generation and add only the exact `downloadId` evidence;
- RELEASE must revoke the Blob owned by that stored generation, not an arbitrary message-provided Blob URL;
- page reload/new document instance must not silently inherit mutation authority over an old PREPARED generation merely because it has the same `journal.html`/`options.html` pathname;
- if exact page-document identity is intentionally not retained, recovery should move authority to worker/browser receipts rather than pretending pathname is an owner generation.

## Required deterministic regressions

1. Native dialog remains open >16 minutes: exact PREPARED Blob remains valid; no artificial timeout/revoke occurs while the dialog is user-owned.
2. Page closes while native dialog is open: recovery reclaims the orphan only after it can establish owner loss / browser-operation state according to a bounded policy, not solely by TTL.
3. `downloads.download({saveAs:true})` returns D, page dies before STARTED message: next worker/page reconciliation discovers the exact state without starting a second download and without pinning the active index forever.
4. STARTED is durably written, worker restarts, page later disappears: startup/maintenance reconstructs D from durable STARTED and exact `downloads.search({id:D})`; terminal state releases the session.
5. STARTED DownloadItem is still `in_progress`: reconciliation does not revoke its Blob merely because a listener was missed.
6. STARTED DownloadItem is terminal: exact reconciliation releases session exactly once; repeated pass is idempotent.
7. RELEASE response channel is lost after worker commit: retry/reconciliation sees RELEASED and does not create a second mutation generation or leak active index.
8. Worker dies after RELEASED/index commit but before removing PREPARED/STARTED: bounded P1-169 cleanup eventually removes stale siblings while preserving the tombstone barrier long enough to reject late old transitions.
9. Late STARTED after RELEASED cannot restore active authority.
10. Active-index cap 64 counts only truly active PREPARED/STARTED generations; dead owner sessions are reclaimed by bounded proof-based GC.
11. Two simultaneous Save As sessions remain distinct; STARTED/RELEASE transition for A cannot revoke or bind B's Blob/download receipt.
12. Exact transition validation rejects a mismatched Blob/owner/operation receipt without touching the stored authoritative generation.
13. Page-owned `onChanged` fast path and worker reconciliation may race, but terminal RELEASE/revoke occurs idempotently and cannot remove a newer session.
14. Post-STARTED resource deadline behavior remains separately governed by P1-067 and never becomes a backdoor timeout for the pre-STARTED native dialog.
15. P1-210 outer-result semantics remain truthful: a lost control response is `unknown/reconcile`, not proof that a mutation did not settle.

## Duplicate check / numbering

No new P0/P1/P2 number is allocated.

- **P1-156** remains the complete owner for native Save As page/worker/Blob lifetime and PREPARED/STARTED/RELEASE reconciliation.
- **P1-169** owns RELEASED tombstone retention and now explicitly includes cleanup of crash-left PREPARED/STARTED siblings once the tombstone is authoritative.
- **P1-067** remains the started/automatic Blob-backed download resource-bound owner.
- **P1-210** remains the cross-operation outer-transport result-classification owner and composes with RELEASE/STARTED message loss without replacing P1-156.
- **P1-124** remains `tabs.create()` crash receipt and is not extended to downloads.

The repository already assigns P1-201…P1-210; none is reused.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Manifest version remains `0.9.8`. Real unmanaged unpacked-Chrome Save As/lifecycle QA and real Yandex E2E remain release blockers. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_NATIVE_SAVE_AS_STARTED_VS_FILE_TERMINAL_SUCCESS_2026-08-28.md`

SHA-256 of UTF-8 source text: `51fd61e399f46cc89e690d2b3ec37989131467777b6ec52dd1456050cfabdd10`

# Audit delta — native Save As STARTED is currently recorded as terminal export success — 2026-08-28

Source-of-truth `main` before this checkpoint: `9d05f3fbc1ee481d009d471e3069f9f818517aa0`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-156** native Save As lifecycle and composes with **P1-198** operation receipt/terminal authority, **P1-210** page-result reconciliation and OperationLog truthfulness. The physical Blob cleanup watcher is already a positive control; the missing piece is user/diagnostic terminal classification.

## Current page reports `started` immediately after native Save As returns a downloadId

`journal.js` calls:

`downloadId = await WebClipPreparedSaveAs.start(prepared)`.

`prepared-save-as.js::start()` returns after:

`chrome.downloads.download({ saveAs:true, ... })`

has returned a numeric `downloadId`.

The page then sends:

`WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED { status:'started', downloadId, ... }`.

Thus the page accurately says only that a Chrome DownloadItem has been created/started after the user chose a destination.

## Worker converts STARTED into terminal OperationLog success

The worker handler normalizes only two page states:

- `started`;
- `error`.

When it receives `started`, current code immediately:

- records operation stage `complete`, percent 100, status `success`;
- calls `finishOperationLog(operationId, 'success', ...)`;
- returns success to Journal.

The summary says the full Journal was handed to Chrome downloads. The wording is somewhat careful, but the durable operation status is terminal `success` before the DownloadItem itself reaches terminal state.

## A started DownloadItem can still become interrupted

The same codebase already treats this distinction as correctness-critical for ordinary local PDF saves:

- `downloads.download()` returning an id is not enough to create the Journal record;
- exact `downloads.search({id})` / `downloads.onChanged` must observe `complete`;
- `interrupted` is a separate terminal outcome.

Native Save As uses the same Chrome Downloads state machine after the user-owned dialog returns.

Therefore a valid schedule is:

1. user chooses a path in native Save As;
2. Chrome returns downloadId D;
3. Journal sends `status:'started'`;
4. worker marks export OperationLog success/complete;
5. later D becomes `interrupted` due disk/network/blob/permission/filesystem failure;
6. physical exported file is not successfully completed, while diagnostic/user operation remains terminal success.

This does not corrupt Journal source data, so P1 rather than P0 ownership remains appropriate.

## Existing cleanup watcher proves terminal state is observable

`prepared-save-as.js` installs a page-owned `chrome.downloads.onChanged` listener for D.

Worker `WEBCLIP_PREPARED_SAVE_AS_STARTED` also arms `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)` as a secondary cleanup path.

Those watchers distinguish:

- `complete`;
- `interrupted`.

Therefore the runtime already has a concept of physical terminality. It is currently used primarily to release Blob resources, not to update the export operation result.

The required repair should reuse the exact durable STARTED/download receipt rather than inventing a second unrelated listener.

## STARTED is a committed handoff state, not failure

The fix must not classify STARTED as an error while a download is legitimately in progress.

A correct operation lifecycle can have at least:

- `prepared` — Blob/session exists before user finishes dialog;
- `started` / `download-bound` — exact DownloadItem D exists; export handoff succeeded but file outcome pending;
- `complete` — D reports complete;
- `interrupted` — D reports interrupted + reason;
- `terminal-unknown` / reconciliation-needed if browser history/state cannot be authoritatively read after page/worker loss.

The visible export operation can show `Передано в загрузки Chrome` while pending, but OperationLog should not use final success until physical terminal semantics chosen by the product are satisfied.

## What does “export success” mean?

There are two defensible product definitions:

### Handoff-success semantics

The export operation is considered complete once WebClip successfully creates the DownloadItem, and later browser file outcome is explicitly outside the operation.

If this definition is intentional, status/UX must say `handoff complete` rather than generic terminal `success`, and diagnostics should still preserve later `interrupted` outcome for the exact D because the user may otherwise believe the file exists.

### File-complete semantics

The export operation remains pending until D reaches `complete`; `interrupted` becomes terminal error/partial.

This is more consistent with the local PDF Journal save model and likely closer to a user's expectation for `Export to file`.

Whichever policy is chosen, STARTED and physical COMPLETE must remain distinct states rather than being collapsed accidentally.

## Durable STARTED receipt is the bridge

The native Save As lifecycle already has:

- `saveAsSessionId`;
- owner page;
- Blob URL;
- STARTED checkpoint with `downloadId`;
- RELEASED tombstone.

P1-156 repair should make the exact durable STARTED generation authoritative for terminal reconciliation after page/worker restart.

OperationLog terminal update should derive from that receipt, not from a free-standing page message containing only textual operationId + downloadId.

This composes with the earlier `SAVE_AS_STARTED_COMMIT_ORDER` finding: durable STARTED must become authoritative before worker-owned terminal cleanup/result logic.

## RELEASE and result terminality are different transitions

Blob cleanup can happen when D becomes either complete or interrupted. Resource release is valid in both cases.

Operation result is not the same:

- complete -> successful file result;
- interrupted -> file result failed/interrupted;
- resource RELEASED merely says WebClip no longer needs the Blob backing resource.

Do not infer success from RELEASED.

## Page loss / worker restart

A page can disappear after D is started.

Current P1-156 already requires reconstruction of STARTED sessions from durable session state and exact `downloads.search({id})` after worker restart.

That same recovery pass should reconcile operation result:

- if D complete -> exact operation receipt may become success;
- if D interrupted -> terminal interrupted/error;
- if D still in progress -> remain pending;
- if D cannot be authoritatively found -> use truthful unknown/history-unavailable state rather than success merely because STARTED existed.

## Options OperationLog export must follow the same model

Prepared Save As is shared by Journal export and OperationLog export from Options.

The lifecycle contract should be generic:

`prepared Save As session -> exact DownloadItem receipt -> terminal file result -> release`.

Do not fix only Journal export while Options continues to treat started as equivalent to completed.

## Required deterministic/browser regressions

1. Native dialog accepted -> D starts -> D remains in_progress: operation is handoff/pending, not physical file success under file-complete semantics.
2. D transitions complete -> exactly one terminal success is recorded for the bound operation receipt.
3. D transitions interrupted -> operation records interrupted/error, not prior immutable success.
4. Page dies after D starts -> worker/startup reconciliation reads exact D and reaches correct terminal result.
5. Worker dies after durable STARTED but before watcher setup -> restart reconciliation still reaches terminal result.
6. onChanged terminal event happens before listener registration -> exact post-bind `downloads.search({id})` closes the gap.
7. RELEASE races terminal reconciliation -> Blob release is idempotent and cannot erase the DownloadItem/operation receipt before result classification.
8. User leaves native dialog open arbitrarily long -> no artificial pre-STARTED timeout is introduced.
9. D is removed from history before terminal reconciliation -> operation becomes truthful unknown/history-unavailable according to retention policy, never silently success from STARTED alone.
10. Journal export and OperationLog export share the same terminal semantics.
11. OperationLog clear/retention does not destroy the durable Save As physical receipt while reconciliation still requires it.
12. Outer page response loss after STARTED does not launch a second native Save As without reconciling the exact session/download receipt.

## Duplicate check / numbering

No new item is created.

- **P1-156** remains native Save As durable lifecycle/reconciliation owner.
- **P1-198** owns exact operation terminal authority/receipt composition.
- **P1-210** owns page-level unknown-result retry behavior.
- Existing local-download terminal-receipt work is a useful analogous positive model but remains a separate physical workflow.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_SAVE_AS_STARTED_COMMIT_ORDER_2026-08-28.md`

SHA-256 of UTF-8 source text: `ea41f318b4f2521c1040ec0925a2ce432a1e5207245608abf8f75592fe98551a`

# Audit delta — Prepared Save As STARTED commit ordering — 2026-08-28

Source-of-truth `main` immediately before this write: `00d756b486623c357a405e0fd105379f9cb3770c`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-156** native Save As lifecycle ownership, with **P1-169** for RELEASED cleanup and **P1-210** for unknown outer-control settlement.

The existing Save As audit already proves the crash window where Chrome returns a `downloadId` but the page dies before STARTED reaches the worker. This pass finds the inverse ordering problem **inside the worker STARTED handler**: worker-side terminal cleanup authority is armed before the durable STARTED transition is committed.

No new root cause is needed.

## Page handoff

`prepared-save-as.js::start()` correctly leaves `chrome.downloads.download({saveAs:true})` without an artificial timeout. After Chrome returns numeric D it:

1. arms a page-local terminal listener;
2. sends `WEBCLIP_PREPARED_SAVE_AS_STARTED { blobUrl, saveAsSessionId, downloadId:D }`;
3. ignores STARTED message failure because page-owned cleanup remains available.

The page therefore treats STARTED as a secondary worker-recovery handoff, not the physical browser-start authority itself.

## Worker STARTED handler currently arms cleanup before durable STARTED

Current service-worker handler validates sender/path/session/downloadId and then does, in this order:

1. `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)`;
2. `await markPreparedSaveAsStarted({ sessionId, blobUrl, ownerPage, downloadId, ... })`.

`revokeBlobUrlWhenDownloadFinishes()` installs worker module-memory `downloads.onChanged` / watchdog cleanup ownership immediately.

The durable STARTED checkpoint is written only afterward.

Therefore the in-memory worker begins acting as though STARTED is authoritative before the durable state machine has accepted that transition.

## Deterministic failed-commit schedule

1. PREPARED session S/blob B is durable.
2. Native Save As returns DownloadItem D.
3. Page sends STARTED S/B/D.
4. Worker validates the message and arms `revokeBlobUrlWhenDownloadFinishes(D,B)`.
5. `markPreparedSaveAsStarted()` then fails deterministically — for example because RELEASED won, PREPARED is missing/corrupt, owner/session receipt mismatches after the final P1-156 repair, or durable storage mutation cannot commit.
6. Handler rejects; page catches/ignores the failure as designed.
7. Worker watcher remains armed despite no authoritative STARTED transition.
8. D reaches terminal state and watcher revokes B/executes cleanup behavior.
9. Durable session state may still be PREPARED or RELEASED/missing, so runtime cleanup authority and durable lifecycle truth disagree.

The exact consequences depend on which durable failure occurred, but the invariant violation is clear: a state-dependent resource owner was installed before the state transition that authorizes it.

## Timeout case needs actual-settlement semantics, not reordering by caller deadline

Chrome Storage mutation timeout is not cancellation. If `markPreparedSaveAsStarted()` times out locally but its actual mutation later commits, the correct behavior is not to assume PREPARED forever.

P1-156 therefore needs two notions:

- logical STARTED response to the page may be `unknown` after deadline;
- actual durable STARTED transition settlement remains serialized/observable and owns later worker reconciliation.

Worker terminal watcher/recovery should attach to the **actual committed generation**, not merely to the fact that a STARTED request arrived.

## Required commit-point ordering

Preferred state-machine shape:

1. receive exact S/B/D transition request;
2. transaction/CAS validates PREPARED S generation and absence of authoritative RELEASED;
3. durably commit STARTED with exact D and immutable PREPARED receipt linkage;
4. only after actual STARTED commit, arm/reconstruct worker DownloadItem reconciliation for D;
5. immediately exact-read D once so a terminal transition that occurred before listener installation cannot be missed;
6. listener is a fast path; durable STARTED + exact-id search is the recovery authority.

If terminal D occurred between steps 3 and 4, step 5 catches it. This removes the perceived need to install the watcher before the durable commit.

## RELEASE race

RELEASED remains the stronger terminal/tombstone state.

If RELEASE wins before STARTED CAS:

- STARTED is rejected as stale;
- worker must not newly arm cleanup authority from the rejected STARTED message;
- cleanup/revoke is derived from the stored RELEASE generation.

If STARTED commits first and RELEASE follows:

- RELEASE operates on exact S/B/D receipt;
- any worker watcher becomes idempotent and may observe that RELEASE already settled.

A late STARTED request can never reactivate or create side effects after RELEASED solely because its handler installed a listener before checking durable state.

## Page listener remains a fast path

The page-local `onChanged` listener can still race with worker reconciliation. That is acceptable when RELEASE is idempotent/generation-exact.

The page listener must not be the only terminal receipt because page lifecycle can disappear. Conversely, the worker watcher must not exist as authoritative state before durable STARTED exists.

## Exact DownloadItem read after STARTED commit

This pass adds an important acceptance detail to prior P1-156 work.

Installing a listener after durable STARTED is safe only when accompanied by an immediate bounded exact `chrome.downloads.search({id:D})` reconciliation, because D can become terminal before the listener is installed.

Classify exact current D as:

- in progress/paused -> keep owner/watch;
- complete -> RELEASE/final cleanup exactly once;
- interrupted -> apply the chosen terminal/resumable policy;
- missing/API unknown -> retain STARTED unresolved and retry bounded reconciliation rather than claiming terminality.

## Required regressions

1. STARTED request arrives, durable CAS rejects because RELEASED already exists -> no new D watcher/resource authority is installed from rejected STARTED.
2. STARTED durable write fails before commit -> durable PREPARED remains; worker does not behave as authoritative STARTED merely because request arrived.
3. STARTED mutation caller times out but actual commit later succeeds -> actual settlement eventually establishes worker reconciliation without a second physical download.
4. STARTED commits; D completes before listener installation -> immediate exact-id read observes terminal D and releases correctly.
5. STARTED commits; listener installs; page closes -> worker/restart recovery remains sufficient.
6. Worker restarts after STARTED commit -> reconstruct reconciliation from durable S/D, not old module-memory watcher.
7. Page and worker both observe terminal D -> exact RELEASE generation is idempotent; no double revoke corrupts newer session.
8. RELEASE commits while STARTED actual mutation is queued -> serialized/CAS state cannot be reversed by a late old STARTED write.
9. STARTED message fields mismatch immutable PREPARED blob/owner/operation generation -> reject before installing watcher or touching unrelated Blob.
10. Native dialog remains unbounded before D exists; this ordering fix does not introduce a pre-STARTED wall-clock timeout.
11. Missing D after worker restart remains unresolved/reconcilable according to P1-156 instead of deleting session from one failed search.
12. Active-index accounting follows durable PREPARED/STARTED/RELEASED state, not module-memory watcher presence.

## Duplicate check

- **P1-156** remains the primary owner for PREPARED→STARTED→RELEASE Save As lifecycle.
- **P1-169** owns RELEASED tombstone/sibling cleanup.
- **P1-210** governs unknown outer runtime response; it does not define Save As state-machine commit order.
- **P1-067** remains post-started Blob/download resource-bound policy and must not impose a native-dialog timeout.

No new P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build, tag or GitHub Release was created.

