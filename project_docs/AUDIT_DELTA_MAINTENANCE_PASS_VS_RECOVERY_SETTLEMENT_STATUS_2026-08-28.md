# Audit delta — maintenance pass success vs unresolved recovery settlement — 2026-08-28

Source-of-truth `main` immediately before this write: `2e2cf32ff1bd5ffad52c611c8dc7a5104b7eef71`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-039** unified logged background maintenance and composes with **P1-208** remote-recovery fairness/status, **P1-192** durable background progress, and physical recovery owners such as P0-039/P1-184.

The current maintenance log correctly records detailed nested recovery counters, but its top-level terminal `success/partial` classification does not distinguish **“this maintenance pass executed without an internal error”** from **“all recovery work is settled.”** A pass can be marked success while durable physical work remains pending/deferred/auth-blocked.

No new root cause is needed; this is diagnostics/status truthfulness for the unified maintenance operation.

## Current top-level classification

After cleanup and recovery stages, `runLoggedOperationLogCleanup()` computes:

`maintenancePartial = Boolean(maintenanceErrors.length || journalRecovery.failed || remoteSaves?.failed || remoteSaves?.error || localDownloads?.failed || localDownloads?.error || statsRepair?.error)`.

It then records terminal stage:

- `partial` when `maintenancePartial` is true;
- otherwise `success`.

The result data does include the full nested objects `journalRecovery`, `remoteSaves`, `localDownloads`, `statsRepair`, so detailed evidence is not lost.

## Remote recovery has legitimate non-error unresolved outcomes

`recoverPendingRemoteSaves()` returns fields including:

- `pending`;
- `stalePending`;
- `recovered`;
- `verified`;
- `deferred`;
- `failed`;
- `stale`;
- `cancelled`;
- `authRequired`.

Several of these can truthfully describe unfinished physical work without being an internal function error.

For example:

- no usable auth -> items remain deferred/pending and `authRequired=true`;
- batch/deadline/fairness limit -> work remains pending/deferred for another wake;
- stale-unverified evidence remains intentionally unresolved;
- a verified remote generation may still require local finalization in a later fair slice.

Current `maintenancePartial` ignores `remoteSaves.pending`, `stalePending`, `deferred`, and `authRequired` unless some separate `failed/error` flag is also set.

## Local recovery likewise may remain pending without an error

`reconcilePendingLocalDownloads()` can successfully execute a bounded pass while DownloadItems remain in progress/paused/unknown. Its result includes `pending`.

That is not a failed maintenance invocation. But it also is not proof that the local recovery subsystem is settled.

Therefore one boolean `success` should not be interpreted as both meanings.

## Deterministic misleading-status schedule

1. There is one unresolved remote-save generation requiring Yandex auth.
2. User is currently disconnected; recovery correctly refuses remote mutation and leaves the generation durable/deferred.
3. Hourly maintenance runs every stage successfully: no IndexedDB/API/internal error occurs.
4. `remoteSaves.failed=0`, no `remoteSaves.error`, while `pending>0`, `deferred>0`, `authRequired=true`.
5. `maintenancePartial` remains false if other stages also have no errors.
6. OperationLog terminal status becomes `success`.
7. A reader of only operation header/status can reasonably infer “background recovery succeeded/completed,” even though a physical operation remains unresolved and requires auth/future reconciliation.

The nested data can explain the truth, but the top-level status vocabulary does not.

## This is not an argument to mark every pending item as `error`

Pending/deferred work is often expected and correctly preserved:

- active Chrome download may still be progressing;
- auth may legitimately be unavailable;
- fair batch/deadline intentionally stops after bounded work;
- stale-unverified evidence is deliberately non-terminal.

Treating these as errors would create noisy false failures.

The correct model separates **pass execution outcome** from **recovery convergence state**.

## Required status model

At minimum expose distinct fields/concepts such as:

### Maintenance pass execution

- `success` — all scheduled stages executed within their contract, no internal stage error;
- `partial/error` — one or more stages failed to execute/inspect/update correctly.

### Recovery convergence

- `settled` — no known active/unresolved work in the relevant classes after this pass;
- `pending` — work remains but is expected/in progress;
- `deferred` — work remains due to budget/fairness/auth/current policy;
- `needs-auth` / `manual` where useful;
- `stale-unverified` — unresolved evidence archived, not failure or absence.

OperationLog UI/export can retain top-level execution status while clearly exposing a secondary recovery-state badge/summary. Alternatively `partial` may be used for unresolved recovery only if product semantics explicitly define it that way, but do not conflate expected pending work with stage errors.

## Terminal message wording

Current message says `Фоновое обслуживание завершено` and lists recovered/deleted counts. This is accurate for the **pass**.

When unresolved work remains, append an explicit bounded summary such as:

- pending local downloads count;
- active/deferred remote saves count;
- stale-unverified count;
- auth required indicator;
- pending Journal recovery count.

Do not say or imply that physical reconciliation itself is complete merely because this invocation reached its final line.

## Scheduler/fairness composition

P1-192/P1-208 determine when pending work receives another opportunity.

Status truthfulness should consume those results:

- a fair slice ending with remaining work is successful pass + pending recovery;
- worker death before durable progress is not a successful pass;
- auth-blocked queue remains pending/needs-auth and must not reset retry/evidence state;
- a future successful pass can transition convergence state independently from prior log history.

## User-facing health/recovery surfaces

The reconciliation-discovery delta requires fresh pages to discover unresolved physical work. Maintenance status can feed an aggregate health indicator, but **aggregate success cannot substitute for exact physical receipts**.

A count `pending=2` explains health; exact retry/reconcile authority still comes from the two durable generations.

## Required regressions

1. Remote auth unavailable, one pending item -> maintenance stage execution succeeds; result explicitly says recovery pending/needs-auth, not settled.
2. Remote batch budget processes some rows and leaves others -> pass succeeds + remaining count/deferred state is visible.
3. One local DownloadItem still in progress -> pass succeeds + local pending count remains explicit.
4. No unresolved work and no errors -> pass success + recovery settled.
5. Stage throws -> pass partial/error regardless of whether other queues happen to be empty.
6. Stale-unverified remote evidence exists -> status does not call it settled/absent merely because active count is zero.
7. Pending Journal append remains after bounded pass -> convergence state reflects pending.
8. OperationLog list/header summary cannot show only an unqualified green success if detailed record says auth-required unresolved work, unless UI clearly labels success as “pass executed” and separately shows recovery state.
9. Repeated maintenance with pending work updates current health without rewriting historical physical receipts.
10. OperationLog clear removes diagnostic history but durable recovery discovery remains available independently.
11. Fair-scheduler cursor P1-192 may advance after a successful slice even though convergence state remains pending.
12. Normal no-work hourly maintenance remains concise and successful; no noisy false-error status is introduced.

## Duplicate check

- **P1-039** primary: unified logged maintenance operation and truthful stage/result presentation.
- **P1-208** remote queue fairness/status semantics.
- **P1-192** cross-wake durable progress/fair scheduling.
- **P0-039/P1-184** retain physical unresolved-outcome truth; diagnostics never replace them.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No runtime/manifest/build/tag/Release change was made.
