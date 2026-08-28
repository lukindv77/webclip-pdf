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
