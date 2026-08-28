# Audit delta — OperationLog detail transactional snapshot revalidation — 2026-08-28

## Scope

Docs-only positive-control completion of the previously open audit block for OperationLog detail/export coherence. No new P-number.

## Result — header and event timeline are read from one IndexedDB snapshot

Current `getOperationLog(operationId)` has two important ordering layers.

### 1. It observes the current per-operation write tail

Before opening the read database transaction it obtains the current `operationLogWriteChains.get(id)` and awaits that Promise when present.

This does not freeze all future diagnostics forever, nor should it. It gives the detail read a defined opportunity to observe writes already admitted as the current tail before the read begins.

### 2. Header + event store are read in one readonly transaction

The actual detail load uses one `runIndexedDbTransactionBounded()` call over:

- `OPERATION_LOG_STORE`;
- `OPERATION_LOG_EVENT_STORE`;

with mode `readonly`.

Inside that same transaction it:

1. reads the operation header by id;
2. opens the event cursor for the exact operation id;
3. combines legacy header events/start event with current event-store rows;
4. publishes the assembled result only through transaction completion.

Therefore current detail/export source does **not** perform a header transaction followed by an independent later events transaction that could naturally combine two different database snapshots.

## Concurrent-write semantics

A writer admitted after the read's observed queue tail can validly fall on either side of the readonly snapshot according to IndexedDB transaction ordering:

- if its readwrite transaction commits before the detail transaction is scheduled, detail may include it;
- if the detail transaction obtains its snapshot first, the later writer is absent.

Either result is a coherent point-in-time OperationLog view. The required invariant is snapshot consistency, not that a read block every future diagnostic event.

Page-level request generations still matter: `options.js` must not publish an older completed detail request over a newer user selection. That is a UI request-generation concern, separate from DB snapshot atomicity.

## Boundaries not closed by this positive control

This checkpoint does not resolve:

- P1-197 history/clear epoch and old-writer invalidation;
- P1-205 retention/size cleanup vs queued writers;
- P1-198 exact live operation receipt/terminal authority;
- OperationLog clear post-snapshot writer admission;
- status monotonicity if different logical generations share textual operation ids.

Those problems occur around which generation is allowed to write/delete, not because `getOperationLog()` itself splits one detail view across two DB transactions.

## Regression guard

1. Operation detail header + current event rows remain in one readonly transaction.
2. A future optimization must not fetch header and timeline separately without a shared history/revision receipt.
3. Export uses the same coherent `getOperationLog()` source before sanitization/serialization.
4. Legacy event migration/read remains assembled inside the same transaction snapshot.
5. Read transaction timeout/abort publishes no partial header-only detail.
6. Writer after snapshot may appear on a later refresh, but cannot make the already returned detail internally mixed.
7. Clear/history epoch fixes must preserve this atomic read property.

## Classification

No new P-item. This is a positive regression checkpoint adjacent to P1-197/P1-198/P1-205 and the OperationLog view-generation work.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence. Runtime/manifest unchanged; no build/tag/release.