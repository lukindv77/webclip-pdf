# Audit delta — remote frame restore receipt must survive unknown settlement — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number. This is the settlement half of **P1-214**.

## Source proof

Current `content.js::restoreRemoteFramesAfterPrint()` does:

```js
const ids = [...state.remotePrintPrepared];
state.remotePrintPrepared.clear();
for (const frameId of ids) {
  const remote = state.remoteFrames.get(frameId);
  if (!remote) continue;
  try { await targetRemoteFrame(remote, 'restore-print'); } catch (_) {}
  remote.printHeight = 0;
}
```

The rollback ownership set is therefore destroyed **before** any child restore command has actually settled.

Failures are intentionally swallowed and the frame id is not reinserted.

## Deterministic unknown-restore schedule

1. Remote frame A successfully prepared print state and parent correctly tracks A.
2. Parent begins cleanup.
3. Parent copies A into local `ids` and immediately clears authoritative `remotePrintPrepared`.
4. `restore-print` to A times out/rejects/channel closes.
5. A may still be in `phase='printing'` with temporary attrs/style, or the command may have applied but response was lost.
6. Parent catches the error and continues.
7. No durable/in-memory receipt now says A requires reconciliation.
8. Next print starts from apparently clean parent state.

This is exactly the kind of distinction P1-214 needs to preserve: `restore requested` is not `restore proven settled`.

## Why blind retry also needs generation identity

A non-cancellable/response-lost restore may have actually succeeded. If parent later starts a newer prepare generation B in the same frame and then retries an old unversioned `restore-print`, the old command can restore/clear **B's** style/attributes because frame-agent restore state is singleton and not generation-bound.

Therefore retaining only a frameId is not enough for the final repair. Parent and child need exact prepare/restore generation receipts.

## Required contract

1. Child successful `prepare-print` returns an immutable `prepareGenerationId`.
2. Parent keeps `{frameId, documentId, prepareGenerationId, state}` until cleanup is proven.
3. `restore-print` carries the exact generation.
4. Child restores only if that generation still owns current temporary print mutations.
5. Parent removes the receipt only after positive restore acknowledgement for that exact generation.
6. Timeout/channel failure leaves receipt `restore-unknown`, not forgotten.
7. Before admitting another prepare in the same child, reconcile or explicitly supersede the old generation under a safe child-side rule.
8. Reloaded child/document generation invalidates old command authority without falsely claiming that old live mutations were restored in the vanished document.

## Regression cases

- restore success -> receipt removed exactly once;
- restore timeout before child receives command -> receipt remains pending;
- child restores but response is lost -> reconciliation observes clean/exact generation and retires receipt without touching a newer generation;
- old restore response arrives after prepare B -> cannot clear B;
- one of several frame restores fails -> successful siblings retire, failed one remains reconcileable;
- page operation error path never silently discards known rollback debt.

## Duplicate check

This does not create P1-215. **P1-214** owns remote print partial-prepare/rollback settlement as one saga: admission, per-child ownership, compensation and exact retirement are one correctness contract.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.