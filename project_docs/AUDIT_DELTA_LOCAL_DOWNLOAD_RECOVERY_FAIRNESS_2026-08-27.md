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
