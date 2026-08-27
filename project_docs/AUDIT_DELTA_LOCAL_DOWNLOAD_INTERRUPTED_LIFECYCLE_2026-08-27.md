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
