# P0-072 — atomic reset execution / hidden materialization capacity — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 452bc389e0138b232198c79dd8dde4c9ed6d8ceb`  
Deterministic model commit: `fe64b40af9cc472971c1506f710fe574f1519dea`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the execution algorithm for clear-all, scoped clear and import-replace. Runtime/manifest are unchanged.

## 1. Fresh current-source facts

Current `clearJournalEntries()` already does a useful pre-step:

1. compute URL/site/all scope;
2. call `migrateLegacyPendingJournalAppends()`;
3. begin stats mutation;
4. open one `WebClipJournal` readwrite transaction over `entries`, `meta`, `pendingAppends`, `pendingDownloads`, `pendingRemoteSaves`;
5. current full clear then calls `clear()` on Journal and all three pending stores.

Current scoped clear uses one `prunePending()` cursor helper for all three pending stores and derives pending scope from `row.data.meta.url/hostname`. Matching rows are currently `cursor.delete()`d.

Current `commitStagedJournalImport()` likewise calls `migrateLegacyPendingJournalAppends()` before the replace transaction, validates the expected Journal revision, then opens one readwrite transaction over Journal/meta/all three pending stores plus `importStaging`. Its current `beginReplace()` clears all three pending stores and then the old Journal before copying staged entries.

Current legacy migration reads `chrome.storage.local.webclipPendingJournalAppends`, writes the bounded normalized rows to IndexedDB, and only after the IDB commit separately removes the Chrome Storage key. The code explicitly treats this commit/remove split as restart-idempotent.

These are positive controls, but they do not close reset-first / migration-second rematerialization.

## 2. IndexedDB transaction lifetime is an implementation constraint

Fresh official platform documentation was checked for the exact transaction-lifetime rule.

MDN states that an IndexedDB transaction is active in the task where it is created and in request success/error event-handler tasks. It becomes inactive in other tasks and auto-commits when no outstanding request remains and no new request is made while active.

Therefore the reset implementation must **not** perform arbitrary asynchronous work inside the authoritative transaction callback.

Unsafe examples inside the transaction include:

- `await chrome.storage.local.get/set/remove(...)`;
- `await crypto.subtle.digest(...)`;
- `await` on a timer/network call;
- any Promise continuation that returns control to a different event-loop task before scheduling the next IDB request.

Current `runIndexedDbTransactionBounded()` is structurally compatible with the safe model because it invokes its `task({...})` synchronously and publishes only from `tx.oncomplete`; the task must remain synchronous/event-driven.

Official references checked 2026-09-04:

- MDN `Using IndexedDB`: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- MDN `IDBTransaction`: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
- MDN `IDBTransaction complete`: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event

## 3. Required phase split: prerequisites outside, authority transition inside

The reset algorithm should have two explicit phases.

### Phase A — bounded prerequisites before opening the IDB transaction

Allowed work:

- read the bounded legacy Chrome Storage source;
- normalize/validate the legacy snapshot under its existing count/serialized-size limits;
- compute the target URL/site normalization requested by the user;
- generate one reset id;
- prepare pure bounded constants/options;
- for import, validate prepared import/lease/revision prerequisites that are already outside the replace transaction.

If a prerequisite read fails or times out and hidden replay authority cannot be ruled out, the destructive reset fails closed before any Journal mutation.

A Chrome Storage read that times out is not converted into “legacy source absent”.

### Phase B — one authoritative IndexedDB readwrite transaction

No non-IDB `await` occurs here.

The transaction owns:

- current pending row classification/quarantine;
- hidden legacy materialization/fence reservation;
- namespaced external-effect receipt detachment;
- reset capacity checks;
- Journal clear/replace mutation;
- import staging copy/delete when applicable;
- Journal revision change.

Success is published only from transaction `oncomplete`.

Any request error, quota error, explicit fail or staging mismatch aborts the entire transaction.

## 4. Fresh capacity gap — a fence alone defers capacity failure

Earlier legacy research correctly required a durable migration-only fence when reset wins before a stale migration writes its already-read Chrome Storage snapshot.

A new problem appears when that fence is treated as the only reset-time action for a hidden matching legacy row:

1. reset writes the small fence and succeeds;
2. Journal deletion/replacement commits;
3. later stale migration reads the fence and tries to create a detached `pendingAppends` row;
4. detached/manual capacity or physical quota is now exhausted;
5. migration cannot safely materialize the old recovery evidence.

The reset already crossed the Journal generation boundary, so failing capacity only at late migration is too late.

Therefore hidden matching/indeterminate legacy rows must consume their recovery capacity **inside the reset transaction**.

## 5. Revised legacy reset algorithm — materialize + fence atomically

For every bounded legacy snapshot row whose reset relation is `match` or `indeterminate`:

1. in the reset transaction, read current `pendingAppends[id]`;
2. if absent, materialize the normalized legacy row immediately into `pendingAppends` as reset-detached manual authority;
3. if present, merge against the current row without overwriting current reset disposition;
4. write the migration-only `legacyPendingFence:v1:<id>` record to `meta`;
5. include the resulting detached/manual row in the same reset-capacity accounting;
6. only after these transitions/cap checks may the Journal mutation complete.

The Chrome Storage legacy key may still be removed after the IDB commit using the existing serialized mutation helper. Failure/timeout of that remove remains restart-safe because:

- the detached row is already durable;
- the fence is already durable;
- repeated migration cannot reactivate or overwrite it.

This is a refinement of the earlier fence design, not a replacement for the fence.

## 6. Why immediate materialization is preferable to an abstract reservation counter

An alternative would be to let the reset create only a fence plus an abstract future-capacity reservation.

That would introduce another durable reservation ledger and require every later migration/admission/cleanup path to maintain it correctly.

Immediate materialization is smaller and reuses the already established in-place quarantine architecture:

- the exact recovery row exists now;
- manual capacity is real rather than promised;
- repeated migration sees the row/fence and becomes idempotent;
- no new store/schema version is required;
- physical write/quota failure occurs before the Journal reset can commit.

The legacy source is already bounded to 20 rows / existing aggregate limit, so this does not create an unbounded reset transaction.

## 7. `pendingAppends` reset rows are manual, not reconciling

The deterministic model exposed an important lifecycle correction.

A reset-detached `pendingAppends` row has no external API identity that can automatically settle. Its ordinary recovery action is exactly the action that reset forbids: append the old metadata into the current Journal generation.

Therefore reset-targeted `pendingAppends`, including hidden legacy rows materialized during reset, should be classified as:

```text
resolution = manual-resolution
```

with `outcome=pending` or `outcome=unknown` depending on scope/source uncertainty.

They should **not** consume a reconciling scheduler queue indefinitely.

This preserves evidence without implying that automatic progress is possible.

## 8. Same legacy id with conflicting current/hidden scope is indeterminate

Another race is possible when an old Chrome Storage snapshot and an already-materialized IndexedDB row share the same future Journal id but their scope/operation metadata do not agree.

The reset must not select whichever snapshot is more convenient.

Required rule:

```text
same legacy id + conflicting current/hidden reset relation -> indeterminate/manual
```

In particular, a current row that looks like a definite nonmatch does not stay active if a hidden same-id snapshot in the bounded legacy source matches the reset scope.

This is not general P0-076 Journal-generation CAS. It is only a reset-time merge rule for two representations of the same legacy migration authority.

## 9. Scoped pending rows and tokenized external receipts use different indeterminate policies

For current pending-store rows, earlier P0-072 research already chose:

```text
match -> detach
nonmatch -> unchanged
indeterminate -> detach + manual-resolution
```

That remains useful because one ambiguous row can otherwise replay old Journal authority after scoped reset.

For namespaced tokenized external-effect receipts, loss/corruption of the installation salt or an unsupported scope-token version can make **all** tokenized receipts impossible to classify.

For that case the preferred scoped-reset policy remains stricter:

```text
scope-token context unavailable + tokenized receipts exist -> abort scoped reset
```

Do not mass-detach unrelated autonomous external operations merely because local token metadata is damaged.

Clear-all/import-replace do not need scope-token matching and can still detach every old receipt by namespace scan.

## 10. Atomic reset transaction ordering

Recommended event-driven transaction sequence:

1. open one readwrite transaction with all required stores;
2. read any exact `meta` control needed for the selected scope-token version;
3. scan/classify current pending stores;
4. update matching/indeterminate rows with immutable first-reset disposition;
5. process bounded hidden legacy snapshot: get/merge/materialize rows and write migration fences;
6. prefix-scan external-effect receipts and detach matching rows;
7. count projected manual/reconciling/terminal classes and fail if the configured envelope cannot preserve them;
8. only after authority classification/capacity work is queued/successful, mutate Journal entries;
9. for import-replace, copy staged rows and delete each staging row in the same transaction;
10. touch Journal revision inside the same transaction;
11. publish only on `tx.oncomplete`.

Sequential request chaining or multiple already-pending cursor requests are both possible. The key rule is that every continuation that schedules more IDB work runs from an IDB request callback while the transaction is active.

No `async` transaction callback is required.

## 11. Import mismatch/abort must roll back quarantine too

Current import already validates that the number of staged records copied equals the expected count and aborts on mismatch.

After P0-072, this same abort must restore not only the old Journal but also:

- every pending-store disposition change;
- every hidden legacy row materialized by the reset;
- every legacy migration fence created by the reset;
- every external-effect reset disposition/phase change;
- Journal revision changes.

This follows naturally if all of those writes are in the same transaction.

Do not commit quarantine first and then run a second Journal-replace transaction.

## 12. Stage rollout compatibility inside reset

The reset transaction must classify old and new row shapes without destructive backfill.

### Local download

- new explicit `download-start=prepared` + reset wins -> `cancelled-before-start/terminal`;
- explicit `admitted` -> detached/reconciling;
- legacy `kind:intent` with no stage -> admission-unknown/reconciling;
- numeric DownloadItem -> already admitted physical start;
- existing unknown/manual remains manual.

### Remote save

- new explicit upload/publish `prepared` can be cancelled only if reset wins their admission transaction;
- legacy `phase=prepared` without stage is admission-unknown, never synthetic pre-start cancellation;
- `stale-unverified` -> unknown/manual;
- `remote-verified` retains factual verified state but no Journal append authority.

### Pending append

- reset-targeted -> manual, never ordinary replay.

## 13. Mutation admission still remains one-shot

This atomic reset algorithm composes with the later stage-admission rule:

- only a committed fresh `prepared -> admitted` transition permits exactly one immediate external mutation call;
- if reset transaction wins first, the stage cannot be admitted later;
- seeing an already `admitted` stage after restart does not authorize a repeated mutation; it routes to factual reconciliation.

The reset transaction and stage-admission transaction overlap on the owning object store and are therefore serialized by IndexedDB.

## 14. Current `runIndexedDbTransactionBounded()` is a useful implementation seam

Fresh source shows the helper:

- creates `db.transaction(storeNames, mode)`;
- invokes `task({...})` synchronously;
- uses `tx.oncomplete` to resolve;
- aborts/rejects on timeout/error.

This is suitable for the pending-store reset tranche **if** the supplied task stays synchronous and builds an IDB request/cursor chain.

Do not change it into `await task(...)` inside the transaction helper.

A specialized import transaction can retain its existing explicit `new Promise` implementation as long as the same event-driven rule is preserved.

## 15. Deterministic model

Added:

`project_tools/test_p0_072_atomic_reset_execution_model.js`

Local Node result before durable write:

```text
P0-072 atomic reset execution model: PASS
```

Durable model commit:

`fe64b40af9cc472971c1506f710fe574f1519dea`

Covered controls:

1. hidden legacy row consumes manual capacity inside reset, and cap failure restores the original Journal/state;
2. reset-first immediately materializes + fences hidden legacy authority;
3. repeated late migration cannot reactivate or duplicate that row;
4. same-id current/hidden scope conflict becomes manual instead of a definite nonmatch;
5. scoped tokenized receipt with unavailable salt context aborts the reset;
6. legacy local intent without explicit stage remains reconciling, not fabricated prepared;
7. new explicit prepared local stage may become terminal cancelled-before-start when reset wins;
8. import staging mismatch rolls back Journal replacement and reset transitions together;
9. definite scoped nonmatch stays unchanged.

This is architecture/model evidence, not current runtime PASS.

## 16. Direct runtime acceptance additions

Add to the accumulated P0-072 source/runtime test contract:

- no `async`/Promise/Chrome API prerequisite runs inside the authoritative reset transaction callback;
- bounded legacy storage read completes before the reset transaction opens;
- hidden matching legacy row is materialized detached and fenced in the reset transaction;
- hidden indeterminate legacy row becomes manual in that transaction;
- hidden definite nonmatch receives no fence/materialization side effect for the scoped reset;
- manual-cap boundary includes hidden legacy rows before Journal deletion;
- capacity/quota failure while materializing hidden legacy authority aborts the reset;
- repeated migration after failed/timed-out legacy-key removal cannot reactivate the row;
- current/hidden same-id scope conflict is fail-safe manual;
- `pendingAppends` reset rows do not return to normal recovery queue;
- scoped token salt/version indeterminate aborts scoped reset without changing Journal;
- clear-all/import-replace remain independent of scope-token salt for namespace detachment;
- import staging count mismatch after queued quarantine changes leaves the pre-import Journal/recovery state intact;
- new prepared vs legacy missing-stage fixtures retain the rollout semantics already documented.

## 17. Owner boundaries

This checkpoint remains narrowly P0-072.

It does not close:

- **P0-076** — general per-entry / Journal-generation CAS outside reset-detached suppression;
- **P1-146** — complete Chrome automatic-download unknown/late settlement and restart-safe deduplication;
- **P1-043** — global cross-subsystem storage byte reservation;
- **P0-066 / P1-216** — final canonical durable URL sanitizer/identity domain;
- **P0-073 / P0-074 / P1-090** — exact Yandex account/root/object operation identity;
- **P1-183** — Delete→Trash pre-move receipt creation;
- **P1-210** — complete user-facing reconciliation UX.

No new P-code is allocated.

## 18. Current conclusion

The first runtime tranche should no longer be described as only “replace pending deletes with quarantine”.

Its minimum atomic unit is now:

```text
bounded legacy prerequisite read
+ current pending quarantine
+ hidden legacy materialization + migration fence
+ old/new stage classification
+ reset capacity enforcement
+ Journal clear/replace
```

all with the authoritative state transitions in one IndexedDB transaction and no non-IDB await inside that transaction.

Namespaced ReadLater external-effect receipt integration can remain a later code tranche, but the reset transaction should be structured now so the `meta` namespace scan can be added without changing the commit boundary.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`. Release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this checkpoint.
