# P0-072 — unresolved-liability reservation across active/manual transitions — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 581d0815de15a3ae6138c81710b1a0b8fc10dd99`  
Deterministic model commit: `9f7015b019dc933100586edd3e5c01da687a6920`  
Owner: **P0-072 ACTIVE**; global storage reservation remains **P1-043 ACTIVE**.

This checkpoint corrects one capacity detail from earlier P0-072 research before runtime implementation. Runtime/manifest are unchanged.

## 1. Problem with a separate hard manual-resolution admission cap

Earlier evidence correctly separated current-active/reconciling, detached manual and terminal-retained classes. A further lifecycle check shows that treating `manual` as an independently hard transition cap is unsafe.

An already admitted/reconciling operation can later factually settle to an unresolved state, for example:

- a local Chrome download start/result remains unknown;
- an exact DownloadItem later disappears from searchable history;
- a remote save remains stale-unverified/identity-uncertain;
- a detached external-effect receipt cannot prove terminal remote outcome.

That transition must remain recordable even if the system already has many manual rows.

Unsafe rule:

```text
manualCount == manualCap
+ existing reconciling row becomes unknown
=> reject the factual transition
```

Rejecting the transition either leaves false state or tempts cleanup to discard evidence. Neither is acceptable.

## 2. Correct capacity object: unresolved liability

For a durability class whose already-admitted work can later become manual, define:

```text
unresolvedLiability = active/current + detached-reconciling + manual-resolution
```

The exact scheduler classes remain distinct, but they share one durability-liability envelope.

A row moving between those classes does not create a new unresolved physical obligation; it only changes what is known about the same obligation.

Therefore:

```text
active -> reconciling -> manual
```

must not require a new liability slot.

## 3. Admission rule

New irreversible work may be admitted only when both are true:

1. its ordinary active/scheduler cap has space;
2. its unresolved-liability envelope has space.

Conceptually:

```text
activeCount < activeCap
&& unresolvedLiability < unresolvedLiabilityCap
```

The second check reserves the possibility that the new operation will later need `unknown/manual-resolution` without creating another row/obligation.

This is local logical reservation only. It does not reserve browser disk bytes and does not close P1-043.

## 4. Factual transitions are not rejected by manual count

Once an operation already owns a liability slot:

- `active -> reconciling` is always allowed under identity/state checks;
- `reconciling -> manual` is always allowed under factual transition rules;
- `active -> manual` is allowed when the operation directly becomes unresolved;
- reset may reclassify an existing active row into reconciling/manual without consuming a second liability slot.

A separate `manualCount` remains useful for UI, scheduling, metrics and future P1-210 reconciliation, but it is not the authority that blocks the truthful transition of an already admitted row.

## 5. What actually increases unresolved liability during reset

In-place quarantine of an existing pending row does not increase row count or unresolved liability. It only changes authority/classification.

The important P0-072 exception is hidden legacy materialization:

```text
chrome.storage.local legacy row absent from IDB
-> reset materializes it as detached/manual
```

That creates a durable IDB liability that was previously hidden outside the reset transaction, so the reset must count it before Journal mutation.

This strengthens the earlier atomic-reset/legacy-snapshot design.

## 6. Derived lower bound for `pendingAppends`

Current source policy already bounds:

- IndexedDB `pendingAppends`: at most 20 ordinary rows and 4 MiB aggregate under normal checkpoint admission;
- legacy `webclipPendingJournalAppends`: at most 20 rows and 4 MiB aggregate before migration proceeds.

Therefore, if the implementation wants full clear/import to succeed for every state that is individually valid under both existing envelopes, the detached unresolved-liability envelope for `pendingAppends` must be able to represent the union:

```text
count: up to 40 before deduplication
aggregate payload: up to 8 MiB before deduplication
```

This is a **derived minimum compatibility envelope**, not a general quota reservation and not a statement that the store may grow without bound.

Repeated later resets can still encounter a full unresolved-liability envelope and fail closed until manual/terminal resolution reduces it.

## 7. Local downloads

Current local recovery already has separate active and unknown/manual concepts. P0-072 should reinterpret them as follows for admission safety:

- active scheduler cap remains a progress/concurrency bound;
- active/reconciling/manual rows together consume unresolved-liability capacity;
- existing row transition to `unknown/manual-resolution` cannot fail merely because the previous manual count was at a nominal limit;
- a **new** irreversible download start fails closed if there is no liability capacity to retain its future unknown outcome.

This does not close P1-146 actual-settlement/restart deduplication.

## 8. Remote saves

Likewise:

- active upload/publish/reconciling and unresolved manual remote rows share unresolved liability;
- generic stale cleanup cannot create capacity by deleting unresolved rows;
- a new remote mutation stage may be admitted only if liability capacity is available;
- an already admitted row becoming `stale-unverified/unknown` remains recordable even when manual-count metrics are high.

P0-073/P0-074/P1-090 still own exact remote identity/context semantics.

## 9. Terminal transition releases liability

A proven terminal transition removes that operation from unresolved liability.

Examples:

- proven `cancelled-before-start`;
- exact Chrome `complete`/`interrupted` terminal fact after reset;
- verified terminal remote outcome where current identity owners permit that conclusion.

Terminal-retained rows may have a separate bounded retention/compaction policy.

If terminal retention is full, the system may compact/remove an already proven terminal receipt according to that policy; it must not reject the factual terminal transition and leave the operation falsely unresolved merely to preserve a historical tombstone.

## 10. Interaction with reset capacity checks

The authoritative reset transaction should therefore compute at least:

```text
currentActive
currentReconciling
currentManual
projectedHiddenLegacyAdds
projectedTerminal
unresolvedLiability = currentActive + currentReconciling + currentManual + projectedHiddenLegacyAdds
```

Reclassifying existing rows among active/reconciling/manual does not increment the total.

Only new durable liabilities introduced by the reset (notably hidden legacy materialization) need additional unresolved capacity.

This reduces false reset failures compared with summing independent class caps while still preventing unbounded hidden-state growth.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_unresolved_liability_reservation_model.js`

Local Node result before durable write:

```text
P0-072 unresolved liability reservation model: PASS
```

Covered controls:

1. active -> manual keeps unresolved-liability count unchanged;
2. an independently full manual counter cannot block truthful transition of an existing active row;
3. new irreversible admission fails when unresolved liability is full;
4. reset reclassification of existing rows consumes no extra liability slot;
5. hidden legacy materialization genuinely adds liability;
6. proven terminal settlement releases liability for future admission.

The model is architecture evidence, not committed-runtime PASS.

## 12. Acceptance additions

Runtime implementation/tests must prove:

- new irreversible admission checks both active and unresolved-liability envelopes;
- existing admitted/reconciling -> manual transitions do not fail because of a separate manual counter;
- reset reclassification of existing rows does not double-count them;
- hidden legacy materialization is included as a new liability before Journal deletion;
- terminal settlement decreases unresolved liability even if terminal retention requires immediate compaction;
- no automatic cleanup evicts unresolved evidence to satisfy the liability envelope;
- P1-043 remains ACTIVE because this is logical count/payload policy, not cross-origin byte reservation.

## 13. Status

This checkpoint supersedes only the interpretation of a **separate hard manual transition cap** in earlier P0-072 capacity prose. The class distinctions, boundedness requirement, fail-closed new admission and terminal-only cleanup rules remain valid.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
