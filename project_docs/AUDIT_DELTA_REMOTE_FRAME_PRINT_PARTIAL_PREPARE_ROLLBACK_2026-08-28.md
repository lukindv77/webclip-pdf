# Audit delta — cross-origin frame print partial-prepare rollback — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-214** — multi-frame `prepare-print` orchestration must retain rollback ownership for every child that has already mutated its document, even if a later child fails before aggregate preparation completes.

This composes with the frozen print/document-generation work, remote-frame exact-document requirements and P0-075 cleanup-generation rules, but the concrete root cause is partial-success compensation bookkeeping.

## Source proof

Top `content.js::prepareRemoteFramesForPrint()` currently starts with:

```js
state.remotePrintPrepared.clear();
const responses = await commandMappedRemoteFrames(
  'prepare-print', {}, { onlySelected: true, failClosed: true }
);
for (const { remote, response } of responses) {
  state.remotePrintPrepared.add(remote.frameId);
  ...
}
```

`commandMappedRemoteFrames()` invokes selected remote frames sequentially. With `failClosed:true`, an error from any child is thrown immediately.

Therefore `remotePrintPrepared.add(frameId)` runs **only if the whole command loop returned successfully**.

## Child prepare is stateful

`frame-agent.js::preparePrint()` is not a read-only query. It:

- sets `state.phase='printing'`;
- calls `prefetchSelected()`;
- may temporarily replace image `src` from `data-src`;
- may change `loading='lazy'` to `loading='eager'`;
- records those mutations in `state.changedAttrs`;
- creates and appends a print `<style>`;
- stores it in `state.printStyle`.

`restore-print` is required to remove the style and restore recorded attributes.

## Deterministic partial-success schedule

1. Selected remote frame A receives `prepare-print`.
2. A succeeds and now owns live temporary mutations + print style.
3. Top `commandMappedRemoteFrames()` proceeds to selected frame B.
4. B rejects/times out/stales.
5. Because `failClosed=true`, the loop throws instead of returning its accumulated responses.
6. `prepareRemoteFramesForPrint()` never reaches the loop that inserts A into `state.remotePrintPrepared`.
7. Parent save path fails and calls normal `restoreAfterPrint()`.
8. `restoreRemoteFramesAfterPrint()` enumerates `state.remotePrintPrepared`, which does not contain A.
9. A never receives `restore-print`.
10. A remains in `phase='printing'` with temporary resource attrs/style installed.

A retry can then invoke A `prepare-print` again on top of orphan state, creating another mutation layer/style while only the newest `state.printStyle` is directly referenced.

## Consequences

- page appearance/state inside A can remain modified after a failed PDF operation;
- stale print CSS can survive into normal browsing or future operations;
- `state.changedAttrs` can accumulate multiple generations;
- retry cleanup can restore values in the wrong temporal order;
- later selection/print behavior can be affected by a failed earlier attempt;
- repeated partial failures can accumulate orphan styles.

This is deterministic and needs no hostile page.

## Required orchestration contract

A child `prepare-print` is a mutation that returns a rollback receipt, not merely a data response.

Acceptable implementation patterns:

### Incremental ownership

- invoke one frame;
- on its successful prepare response, immediately register exact frame/document/prepare generation in the rollback set;
- only then invoke the next frame;
- on any later failure, compensate every already registered prepare in reverse/order-safe fashion before propagating the failure.

### Explicit transaction/receipt coordinator

- each child returns `prepareGenerationId`;
- parent stores it immediately;
- restore command carries and checks that generation;
- parent `finally` compensates all prepared children unless ownership was intentionally transferred to an active print generation.

The rollback set must be generation-aware: a late restore for old A cannot undo a newer successful prepare B in the same frame.

## `clear()` at function start is not sufficient

`state.remotePrintPrepared.clear()` before new work discards parent bookkeeping; it does not undo mutations already present inside a child.

A retry should first reconcile/restore any known previous prepare receipts, and a partial prepare should never become unknown solely because aggregate collection threw.

## Regression cases

1. A prepare succeeds, B fails -> A receives exact `restore-print` before operation becomes terminal error.
2. A/B succeed, C fails -> both A/B are restored.
3. First A fails -> no other child is marked/restored unnecessarily.
4. Restore A times out -> receipt remains pending/unknown; retry does not blindly stack new prepare over A.
5. Parent/content context is destroyed after A success -> durable/document-owned recovery policy leaves no stale cross-frame print mutation indefinitely where architecture can prevent it.
6. Retry after successful compensation starts from clean child state.
7. Old restore generation cannot remove the style/attrs of a newer print generation.
8. A stale/reloaded child document is not treated as the original prepared child.
9. Multiple selected remote frames preserve bounded rollback bookkeeping.
10. Successful normal print still restores all selected remote frames exactly once.

## Numbering result

**P1-214 is assigned to this partial-success compensation root cause.**

Remote document/permission/selection-generation owners remain separate; P1-214 specifically owns retaining and compensating already-completed child prepare side effects when aggregate preparation fails.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Deterministic mocked frame-agent and real browser multi-frame failures are required. No build, tag or Release was created.