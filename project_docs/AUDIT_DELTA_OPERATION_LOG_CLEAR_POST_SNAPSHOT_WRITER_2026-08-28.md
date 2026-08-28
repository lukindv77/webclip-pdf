# Audit delta — OperationLog clear post-snapshot writer / registry loss — 2026-08-28

Source-of-truth `main` immediately before this write: `532ad3dc2590bd0b53519b30c9da0e2140e07e9f`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P1-197** — durable OperationLog history epoch / stale-writer rejection across administrative clear;
- **P1-205** — cleanup/write linearization;
- **P1-173** — bounded/coalesced writer queue admission and registry lifecycle;
- **P1-210** — outer response loss after destructive Clear must not authorize a blind second Clear;
- **P1-198** — worker-issued operation receipt must compose with history epoch.

The new concrete race is that `clearOperationLogs()` can erase the **in-memory serialization registry for a writer admitted after its snapshot**, while that writer is still unresolved. This can break per-operation ordering even before considering resurrection after the IDB clear.

## Current clear sequence

`clearOperationLogs()` currently performs:

1. `const pending = [...operationLogWriteChains.values()]`;
2. if non-empty, `await Promise.allSettled(pending)`;
3. `operationLogWriteChains.clear()`;
4. clear `operations` and `events` stores in one bounded IndexedDB transaction.

The existing P1-197 checkpoint correctly notes that step 1 is only a snapshot: writers admitted later are not part of `pending`.

Fresh audit shows step 3 makes that gap stronger.

## Deterministic post-snapshot registry-loss schedule

1. Operation writer A exists in `operationLogWriteChains`.
2. User Clear C snapshots `[A]` and begins waiting for A.
3. While C waits, a new writer B is admitted for operation X. `queueOperationLogWrite()` stores B's Promise in `operationLogWriteChains`.
4. A settles.
5. C resumes and executes `operationLogWriteChains.clear()`.
6. B may still be queued/running/unresolved, but its registry entry has now been forgotten.
7. A later writer D for the same operation X calls `queueOperationLogWrite()` and sees no `previous` Promise because C erased B from the Map.
8. D can now begin independently rather than being serialized after B.
9. C's IDB clear transaction can interleave before/after those writers according to actual IDB admission.

Thus administrative clear can destroy the queue's knowledge of a still-live writer that was not in the original snapshot.

## Consequences

This is not only the previously known "late writer recreates a cleared header" outcome.

For one textual operation id, B and D can now:

- execute IDB mutations without the intended JS per-operation ordering;
- assign event sequence/status based on stale independent reads;
- race with the clear transaction;
- recreate/overwrite a header after clear in different orders;
- make cleanup statistics/history chronology depend on scheduling rather than one explicit history epoch.

A registry that intentionally tracks actual writer settlement must never be globally cleared merely because an earlier snapshot was drained.

## Correct positive-control contrast

Individual `queueOperationLogWrite()` cleanup is ownership-aware: after settlement it removes a Map entry only when the stored Promise is still the same `next` Promise.

That compare-by-current-owner property is useful.

`clearOperationLogs()` bypasses it with unconditional `operationLogWriteChains.clear()`, so it can erase entries that were not owned by the snapshot it waited for.

A future repair should preserve compare-and-release semantics rather than replacing them with a new global blind Map reset.

## Durable history epoch remains the primary correctness fence

Trying to repeatedly snapshot/wait until the Map happens to become empty is not sufficient:

- new operations can continuously arrive;
- a hung writer can block forever;
- MV3 restart loses the Map;
- old writers can enqueue later stages after the clear transaction.

P1-197's durable epoch is still the authoritative solution:

1. Clear advances history epoch atomically with destructive store cleanup;
2. writers admitted before that commit carry old epoch and become harmless;
3. writers intentionally admitted after the epoch transition use the new epoch;
4. in-memory queues remain resource/ordering helpers, not the source of deletion authority.

The Map should retain every actual writer until that writer's own settlement even when its epoch becomes stale, so P1-173 admission/accounting remains truthful.

## Outer transport-loss composition

Options Clear uses:

`await chrome.runtime.sendMessage({ type:'WEBCLIP_OPERATION_LOG_CLEAR' })`

inside `runBusy()`. On rejection, `runBusy()` shows an error and re-enables the button.

As already established in the Options/P1-210 checkpoint:

1. Clear C may have committed successfully;
2. its outer response can be lost;
3. new logs can be created in the new history epoch;
4. user sees an error and can confirm Clear again;
5. second clear C2 can legitimately delete those newly created logs.

Therefore a destructive clear needs its own worker-issued clear/history receipt and result-reconciliation surface. `runtime.sendMessage` rejection is not proof that the epoch did not advance.

P1-197 and P1-210 should share one result model: `clear not admitted`, `clear committed at epoch E`, or `clear result unknown -> reconcile current history epoch`.

## Retention/size cleanup composition

P1-205 already establishes that TTL/size cleanup can be overtaken by queued writers because it does not participate in the same delete/write ordering.

The new Map-reset proof reinforces an implementation constraint: do not "fix" retention by calling the current manual-clear drain/reset helper. A cleanup mechanism must never erase unrelated/new writer registry entries, and a global unbounded drain would regress P1-173.

Per-operation generation/tombstone fencing or bounded selective drain/revalidation is required.

## Required deterministic regressions

1. Clear snapshots A; B is admitted after snapshot; A settles; clear proceeds -> B remains tracked until B actual settlement even though B may be stale by history epoch.
2. D for same operation id arrives while B is unresolved -> D cannot bypass B solely because Clear ran.
3. Clear epoch commits while B is old-generation -> B/D old-generation writes cannot recreate cleared history.
4. New operation N deliberately admitted after committed clear epoch logs normally under new epoch while old B remains tracked only for settlement/accounting.
5. Hung B does not prevent epoch clear from committing forever; B remains bounded/accounted and stale rather than being forgotten.
6. MV3 restart after clear reconstructs current history epoch from durable state; correctness does not depend on old Map contents.
7. Outer response loss after committed clear -> Options does not offer an unqualified destructive retry; reconciliation proves current epoch/result first.
8. New logs created after C survive unless the user explicitly authorizes a genuinely new C2 after being told C already committed.
9. Retention/size cleanup cannot use a blind `operationLogWriteChains.clear()` as synchronization.
10. Per-operation Promise cleanup still uses exact-owner comparison so settlement of an old Promise cannot delete a newer Map owner.
11. OperationId reuse in a new history epoch cannot receive events from B/D old epoch.
12. Clear/detail/export views expose only records in the accepted history epoch after reconciliation.

## Duplicate check

No new item is created.

- P1-197 owns administrative clear epoch/stale-writer authority.
- P1-205 owns retention/size delete-vs-write linearization.
- P1-173 owns bounded writer queue admission/lifecycle.
- P1-210 owns user-facing result classification after lost outer response.

This checkpoint adds a concrete queue-lifecycle acceptance condition: **a destructive operation may not globally forget actual writer promises that were admitted after the destructive operation's wait snapshot.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.