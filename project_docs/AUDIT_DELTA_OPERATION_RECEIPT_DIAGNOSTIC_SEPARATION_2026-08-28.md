# Audit delta — live operation receipt vs OperationLog diagnostic lifetime — 2026-08-28

Source-of-truth `main` immediately before this write: `c39928adea6fe46d410779e617da9a3fdf6b333a`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block refines the composition of **P1-198** (worker-issued live operation receipt), **P1-197** (OperationLog clear/history epoch), and **P1-205** (retention/size cleanup vs queued writers).

Fresh architectural result: **the authoritative live operation receipt cannot be stored solely as, or inferred solely from, an OperationLog record**, because OperationLog is intentionally user-clearable/retention-bounded diagnostics while physical operation/recovery authority can legitimately outlive that history.

No new root cause is needed.

## Positive control — ordinary event/finish logging is already best-effort

`appendOperationLogEvent(operationId, event)` queues the durable diagnostic write but catches write failure and logs a console warning instead of propagating the diagnostic failure into the physical operation.

`finishOperationLog()` is built on that event path.

This is a valuable separation: failure to append a diagnostic event should not automatically turn a physically successful download/upload/Journal mutation into product failure.

Preserve this property when operation receipts are introduced.

## OperationLog has intentional destructive lifecycle

Existing P1-197/P1-205 audits establish that OperationLog records may be:

- explicitly cleared by the user;
- removed by retention;
- removed by aggregate size-pressure cleanup;
- eventually generation-fenced so old writers cannot recreate deleted history.

Those are legitimate diagnostic-history lifecycle transitions.

Physical side-effect receipts have different rules:

- local DownloadItem checkpoint may remain unresolved after log history is gone;
- remote-save checkpoint may remain unresolved/verified awaiting Journal finalization;
- native Save As STARTED session may remain active while diagnostics are cleared;
- backup attempt may remain pending/reconcilable;
- a Yandex move/delete saga may need exact source/target evidence after its visible log was cleared.

Therefore `(OperationLog row exists)` cannot become a prerequisite for physical reconciliation.

## Future P1-198 implementation risk

A tempting implementation of worker-issued operation identity would be:

1. create an OperationLog record containing random receipt nonce/history epoch;
2. later validate operation authority by reading that log record;
3. use absence/mismatch to reject progress/finalization/recovery.

That would couple correctness authority to a user-clearable diagnostic store.

After `Clear OperationLog` or legitimate retention, a still-running physical operation would lose its only receipt and could become unrecoverable or falsely unauthorized.

The opposite workaround — preventing clear/retention while any physical operation exists — would make diagnostics retention policy control core product liveness and could indefinitely retain logs for long unresolved external operations.

Both designs are wrong.

## Required two-layer identity model

### Core operation receipt

P1-198's authoritative receipt belongs to the lifecycle owner of the physical/logical operation, not to OperationLog history.

Depending on operation type, durable authority may live in:

- pending local download generation;
- remote-save generation;
- backup attempt generation;
- prepared Save As session;
- destructive move/delete saga checkpoint;
- import/export operation session where a durable owner is actually required.

The receipt binds operation kind, nonce/generation, source owner/document where applicable, and subsystem-specific physical generation.

### Diagnostic reference

OperationLog stores a **reference/copy of the receipt identity** sufficient to correlate diagnostics while history exists, together with its own P1-197 history epoch.

Deleting diagnostics removes observability, not physical authority.

Conceptually:

`physicalOperationReceipt -> optional OperationLog(historyEpoch, operationRef)`

not:

`OperationLog row -> physicalOperationReceipt`.

## Clear semantics

When the user clears OperationLog while operation A is still active:

- P1-197 advances diagnostic history epoch and deletes old diagnostics;
- A's physical checkpoint/operation receipt remains valid;
- late old A diagnostic writes carrying old history epoch are dropped and do not recreate cleared history;
- A can still physically settle/reconcile/finalize through its subsystem receipt;
- if product wants to show A again after clear, it must do so as a newly generated **current status/recovery view**, not by resurrecting deleted historical events under the old epoch.

This preserves both user intent to clear history and core correctness.

## Retention semantics

Retention/size cleanup may delete diagnostic history even for an unresolved physical operation once product policy permits it, provided:

- active-log UX promises are respected (P1-197 currently says timestamp-only deletion of active operations is unsafe);
- deletion is generation-linearized under P1-205;
- physical recovery state is independent and retained according to its stronger subsystem rules.

If diagnostics for an unresolved physical receipt are intentionally evicted, later recovery should report `diagnostic history unavailable/cleared`, not synthesize a generic old timeline.

## Operation terminality

A physical operation becoming terminal should not require OperationLog terminal write to succeed.

Order should conceptually be:

1. commit/verify authoritative subsystem result;
2. update/retire physical operation receipt according to its exact state machine;
3. best-effort append diagnostic terminal event under the current valid history epoch where appropriate.

If step 3 fails or history was cleared, steps 1–2 remain authoritative.

Conversely a diagnostic `success` event must never substitute for the physical terminal receipt.

## P1-148 / imported history composition

Journal `Показать лог` may use a local diagnostic reference when one exists, but imported historical `operationId` remains P1-190 unverified data and cannot reconstruct a live physical receipt.

A current Journal entry may retain a bounded local operation reference for diagnostics while physical recovery uses its exact download/remote generation independently.

## Required regressions

1. Start remote upload A -> clear OperationLog -> A completes -> remote checkpoint/Journal reconciliation succeeds; old A log is not resurrected.
2. Start local download A -> retention deletes diagnostics according to final policy -> DownloadItem completes -> Journal finalization still uses exact pending-download receipt.
3. STARTED native Save As -> clear logs -> page/worker restart -> Save As reconciliation still finds exact session/download receipt.
4. Pending backup upload -> log clear -> later exact remote recovery succeeds without requiring historical OperationLog row.
5. Yandex move outcome unknown -> logs cleared -> durable source/target receipt remains reconcilable.
6. Old diagnostic event after clear is rejected by old history epoch even though physical A is still valid.
7. New diagnostic view/event intentionally created after clear cannot reuse old event history implicitly; current status is distinguished from resurrected history.
8. OperationLog storage failure during terminal physical success does not convert the physical result into failure/retry.
9. A forged/imported textual operationId with a current diagnostic collision cannot acquire the physical receipt.
10. Clearing/retaining diagnostics never deletes PDF body/download/remote/backup/Save-As recovery evidence as a side effect.
11. Physical receipt cleanup after authoritative settlement does not require keeping diagnostic history forever.
12. UI explicitly reports unavailable/cleared diagnostic history rather than treating missing log as missing physical operation.

## Duplicate check

- **P1-198** owns authoritative worker-issued live operation identity.
- **P1-197** owns diagnostic history epoch and administrative clear.
- **P1-205** owns retention/size delete-vs-write linearization.
- **P1-190/P1-148** own imported/current Journal-to-log provenance.
- Physical subsystem owners (P0-039, P1-184, P1-156, P1-052, P1-090, etc.) remain authoritative for their external results.

No P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical product gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
