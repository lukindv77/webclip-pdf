# Audit delta — serialized actual-settlement queue admission coverage — 2026-08-27

Source-of-truth `main` immediately before this write: `d2d74d040de06539e3e81413493d7343f0345e77`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof expands the implementation coverage of existing **P1-173** and reopens the admission-pressure aspect of two otherwise valuable bounded/serialized fixes:

- **P1-123** — Journal source-context `chrome.storage.session` mutation lifecycle;
- **P1-120** — `webclipJournalStatsDirty` crash-consistency marker lifecycle.

The common root cause is already P1-173: caller timeout + actual-settlement serialization prevents stale side-effect overtaking, but a never-settling actual Chrome Storage promise can still accumulate an unbounded chain of **waiting turns that have not started a side effect**.

This checkpoint records two ad-hoc queue implementations that were not called out explicitly in the original P1-173 coverage wording.

## Positive control

Both implementations correctly reject the unsafe alternative of treating local timeout as cancellation.

A late old `storage.set/remove/get` must not be overtaken by a newer mutation that assumes the older call did not happen. Both paths therefore retain a barrier until the actual Chrome promise settles.

That ordering property must be preserved.

The defect is only that every later caller can allocate another Promise/closure behind the same permanently unresolved barrier.

## 1. Journal source-context mutation chain

`storeJournalSourceContext()` uses a module-global:

`journalContextMutationChain = Promise.resolve()`.

For every requested Journal context it constructs:

`actual = journalContextMutationChain.catch(() => {}).then(async () => { ... })`

and then publishes:

`journalContextMutationChain = actual.then(() => undefined, () => undefined)`.

The inner turn performs a potentially multi-call Chrome Storage session mutation:

1. `chrome.storage.session.get(null)`;
2. zero or more batched `chrome.storage.session.remove(...)` calls for expired/overflow contexts;
3. final `chrome.storage.session.set({ [key]: context })`.

The caller waits only through the bounded `waitJournalContextSessionOperation(...)` deadline. That is the P1-123 protection that prevents `openJournalPage()` from waiting forever and prevents `tabs.create` from starting after an unresolved context write.

However the underlying chain itself has no waiting-turn admission limit or coalescing.

### Deterministic failure schedule

1. Context mutation A starts and its actual `chrome.storage.session.get(null)` never settles.
2. A's caller receives its bounded timeout.
3. `journalContextMutationChain` still represents A's unresolved actual chain, correctly preserving ordering.
4. User requests Open Journal again; mutation B allocates a new `then(async () => ...)` waiting behind A.
5. B times out before its body starts, but B remains an unresolved waiting turn because A never settled.
6. Repeating the action creates C, D, E, ... as additional Promise/closure turns.
7. No later storage side effect has started, so the durable context cap of 512 is irrelevant to this memory/lifetime growth.

The cap controls **stored records**, not unresolved JS queue turns.

A degraded Chrome Storage API can therefore turn an otherwise bounded P1-123 failure into unbounded worker-memory/lifecycle pressure under repeated user requests.

## 2. Journal stats dirty-marker settlement chain

The same root cause exists in the separate module-global:

`journalStatsMarkerSettlementChain = Promise.resolve()`.

`queueJournalStatsMarkerMutation(task, label)` reserves a new Promise turn synchronously, reads the current previous chain, publishes the new `turn`, and waits for the previous settlement with a bounded timeout.

If waiting times out, the code deliberately leaves `releaseTurn()` attached to the real previous settlement. This is correct for ordering: a late old marker write/remove cannot be overtaken.

But the next call can reserve another new turn behind the still-unresolved turn. There is no per-key/global cap and no shared/coalesced busy receipt.

### Why this path is more frequent

The stats marker is not only an administrative UI path.

Journal mutations use `beginJournalStatsMutation(...)` / `completeJournalStatsMutation(...)` around append/delete/clear/import and repair-related flows so `urlStats` can be reconstructed after worker interruption.

Therefore a hung marker Chrome Storage mutation can receive repeated callers from ordinary product activity and background repair, not only from repeated Open Journal clicks.

The marker record itself can remain tiny while the in-memory waiting chain grows without bound.

## Relationship to existing P1-173

This is not a new queueing primitive/root cause.

P1-173 already states the required invariant for serialized actual-settlement queues:

- one hung actual side effect may retain one ordering barrier;
- repeated callers after bounded timeout must not add an unlimited number of waiting Promise/closure turns;
- use per-key/global admission cap, a coalesced wait receipt, or another bounded busy model;
- do not start a newer non-cancellable mutation until the real older settlement is known.

The implementation inventory for P1-173 must explicitly include at least:

- `runSerializedLateSettlementOperation(...)` users;
- Yandex auth/config mutation chains;
- prepared Save As checkpoint chain;
- **`journalContextMutationChain` / `storeJournalSourceContext()`**;
- **`journalStatsMarkerSettlementChain` / `queueJournalStatsMarkerMutation()`**.

Future audit/fix should search for equivalent ad-hoc module-global Promise barriers rather than fixing only the generic helper.

## P1-123 refinement

P1-123 remains correct about bounded caller behavior and ordering, but cannot remain considered fully closed with respect to repeated timeout pressure until its queue admission is bounded.

Required behavior:

- at most one actual context-storage mutation runs at a time;
- at most a bounded/coalesced representation waits behind a hung actual mutation;
- repeated Open Journal attempts while the barrier is unresolved return a deterministic busy/timeout result without allocating a new chain turn each time;
- once the actual mutation settles, the newest still-relevant context request may be retried/admitted according to explicit policy;
- do not create a Journal tab from a request whose context store was not authoritatively committed;
- the existing TTL=24 h / cap=512 / bounded-heap pruning rules remain unchanged.

A useful design is a single `contextMutationBusy`/generation receipt plus at most one coalesced newest pending intent rather than one Promise per click.

## P1-120 refinement

P1-120 must preserve crash-consistency ordering without making every later Journal mutation a permanent waiter.

Required behavior:

- one unresolved actual marker mutation owns the real settlement barrier;
- additional begin/complete/repair-clear requests are bounded and safely coalesced by marker semantics/generation;
- dirty state must fail safe: pressure must not incorrectly clear a newer dirty token or claim stats clean;
- if precise coalescing of begin vs complete cannot be proven, reject/busy later mutations rather than allocating unlimited turns;
- once settlement returns, repair must converge using current durable Journal/meta generation, not replay an arbitrarily long historical JS queue.

Because marker transitions protect `urlStats` correctness, admission pressure must not be "solved" by dropping dirty evidence.

## Required deterministic regressions

1. Never-settling `storage.session.get(null)` in context mutation A -> 100 later Open Journal requests -> bounded number of queue objects/intents; no 100-turn Promise chain.
2. Same test -> no later `tabs.create` starts from a request whose context mutation was not committed.
3. A eventually settles after many busy callers -> context storage remains correctly ordered and only explicitly admitted newest work runs.
4. Context cap/TTL pruning still works after pressure recovery and never exceeds 512 durable contexts.
5. Never-settling stats marker actual write -> repeated Journal append/update/delete attempts do not grow one waiting Promise per mutation indefinitely.
6. Late old dirty-marker `set` cannot overtake a newer marker transition after recovery from pressure.
7. Late old marker `remove` cannot falsely erase a newer dirty generation.
8. If admission is full/busy, Journal/urlStats state remains explicitly dirty/recoverable rather than being reported clean.
9. Worker restart after a hung in-memory chain reconstructs truth from durable marker/Journal revision and does not require replaying lost JS waiters.
10. Generic P1-173 queues, context queue and stats-marker queue share one deterministic admission-pressure test pattern so future ad-hoc barriers are difficult to omit.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

- **P1-173** remains the primary root-cause owner: unbounded waiting turns behind one unresolved actual settlement.
- **P1-123** remains the Journal source-context correctness/timeout owner and is refined to require bounded repeated-caller admission.
- **P1-120** remains the stats dirty-marker ordering owner and is refined to require bounded repeated-caller admission.
- **P1-094** remains the durable Journal context TTL/cap semantics; it does not bound in-memory waiting turns.
- **P0-050/P0-026/P1-057** remain urlStats/Journal mutation crash-consistency dependencies and are not renumbered by this checkpoint.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.
