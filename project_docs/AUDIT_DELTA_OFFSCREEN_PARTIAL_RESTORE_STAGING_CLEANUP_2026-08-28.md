# Audit delta — offscreen partial restore staging cleanup — 2026-08-28

Source-of-truth `main` immediately before this write: `6ce7c1e406b90729f3cc80a9f349001006d99274`.

Docs-only positive-control checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Scope

`text-download` restore staging writes the downloaded response into multiple IndexedDB chunk transactions before the final import-manifest/result is available. This block checked whether an oversize/network/deadline/IDB failure can leave every already-written chunk permanently orphaned merely because no successful `payloadKey` is returned to the service worker.

## Positive result — the staging producer owns explicit failure cleanup

`stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt)` wraps the streamed read/chunk-write sequence in a `try/catch/finally`.

On any error from the staging pipeline it performs:

`await deleteTransferPayloadGroup(payloadKey, chunkCount + 2).catch(() => {})`

and then rethrows the original failure.

The cleanup is therefore attempted by the context that still knows the exact generated `payloadKey`, even when the worker never receives a successful response containing that key.

This is an important ownership property: cleanup does not depend exclusively on a higher-level caller having learned the staging identifier.

## Oversize path composes correctly

The streamed byte counter cancels/rejects once `totalBytes > cap`. That exception enters the same local cleanup catch.

Thus a body that crosses the 50 MiB boundary after, for example, dozens of 1 MiB chunks does not intentionally leave those completed chunks as ordinary live staging.

The same catch covers network/read exceptions and bounded IDB helper failures thrown during the producer pipeline.

## Cleanup failure remains best-effort, not false success

The cleanup attempt itself is caught so the original transfer error is preserved. If the delete transaction also fails or the offscreen document is terminated at an unlucky point, some orphan chunks can still remain.

That residual class is why shared transfer TTL/hourly cleanup and storage-pressure handling remain necessary. The positive result is not “orphans are impossible”; it is:

- normal producer-observed failure has exact immediate cleanup ownership;
- fallback TTL is for crash/cleanup-failure uncertainty rather than the expected success/failure path;
- the operation does not report a successful staged payload after the producer catch.

Do not weaken this by moving all cleanup responsibility to the service worker, which may never learn the key after response-channel loss or producer failure.

## Atomicity boundary

Chunked staging is intentionally not one giant IndexedDB transaction. That keeps transaction lifetime/memory bounded.

Correctness therefore requires two levels:

1. each chunk/manifest write has bounded transactional semantics;
2. the logical multi-transaction staging generation has producer-side compensation plus later orphan cleanup.

A future refactor should not try to make a 50 MiB network stream one monolithic IDB transaction merely to obtain rollback semantics.

## Composition with unknown transport settlement

If the offscreen pipeline **succeeds** and durable staging exists but the runtime response to the worker is lost, producer-side error cleanup must not run merely because the caller did not receive the result. The actual `handleSignedTransfer()` promise has succeeded.

That class remains the existing offscreen/result-discovery/unknown-settlement problem and is different from producer-observed failure.

Similarly the active transfer reservation remains owned until the actual offscreen promise settles, not until caller timeout.

## Regression guard

1. Oversized streamed restore after several committed chunks -> producer attempts exact group cleanup and returns failure.
2. Network read error after several chunks -> same immediate cleanup attempt.
3. IDB chunk write failure -> no success result; exact group cleanup is attempted.
4. Final manifest write failure -> already-written chunks are cleanup candidates under the same key.
5. Cleanup transaction itself fails -> original error remains visible; fallback orphan TTL/maintenance can later reclaim leftovers.
6. Successful staging -> producer does not delete the group before handing the payloadKey/result to the worker.
7. Successful staging + lost runtime response -> do not confuse caller loss with producer failure and destroy a valid result prematurely.
8. Offscreen transfer reservation remains tied to actual promise settlement throughout cleanup.
9. No one giant long-lived IDB transaction is introduced as the fix.
10. Storage-pressure cleanup remains generation-safe and never treats a currently successful/live result as an expired orphan solely because the worker response is delayed.

## Classification

No new P-item. This is a positive lifecycle checkpoint adjacent to P1-035/P1-069/P0-063 and the transfer-result reconciliation work.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
