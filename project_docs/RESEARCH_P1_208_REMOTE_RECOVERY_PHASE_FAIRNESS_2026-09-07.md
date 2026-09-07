# P1-208 — Pending remote-save recovery phase/status fairness

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.
Canonical `service-worker.js` blob inspected: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

This branch does **not** modify production runtime, `manifest.json`, release state or `RESEARCH_REGISTRY.md`.

## 1. Registry owner

P1-208 is the single current owner for:

> Pending-remote recovery needs phase/status fairness; cheap `remote-verified` local finalization cannot starve behind older auth-blocked PREPARED rows.

The scope is recovery **scheduling/fairness across durable phases**. It is not a new remote-object identity, auth, cancellation or Journal-generation owner.

## 2. Adjacent owners remain separate

P1-208 composes with:

- **P0-074** — immutable Yandex auth/account/root/config operation context;
- **P0-076** — Journal generation/revision CAS for stale writes against clear/replace/import;
- **P1-064** — analogous but distinct local-download recovery fairness;
- **P1-173** — bounded admission for serialized unresolved actual-settlement turns;
- **P1-177** — auth loss / backup pause-resume semantics;
- **P1-184** — exact remote object/content proof after unknown settlement;
- **P1-192** — long alarm-started MV3 operations and durable fair progress across wakes;
- **P1-194** — truthful durability class of recovery state;
- **P1-195** — Yandex capability truth;
- **P1-196** — exact auth-generation invalid-token demotion;
- **P1-198** — worker-issued physical operation identity;
- **P1-205** — OperationLog history generation;
- **P1-210** — lost outer response / durable receipt reconciliation.

In particular, `remote-verified` is accepted here as a scheduling class only after the correctness owners have established that the remote effect is actually proven. P1-208 must not weaken P1-184.

## 3. Historical evidence

The consolidated Backup / scheduler / remote recovery generation family retains two directly relevant retired deltas:

1. `RESEARCH_DELTA_REMOTE_RECOVERY_PHASE_FAIRNESS_2026-08-28.md`;
2. `RESEARCH_DELTA_CROSS_WAKE_RECOVERY_ARBITRATION_2026-08-28.md`.

Historical source proof already identified this deterministic shape:

```text
bounded recovery reads oldest active rows only
old PREPARED rows need auth
session/auth unavailable after restart
those rows are deferred without updatedAt rotation
newer remote-verified row needs only local Journal finalization
same old prefix is selected on every later wake
remote-verified can starve indefinitely
```

Fresh current-source inspection below confirms that root cause remains present on `d4f5b268...`.

## 4. Current positive controls

Several current choices are valuable and should survive the fix.

### 4.1 Recovery is globally bounded

`recoverPendingRemoteSaves(trigger, maxItems = 6)` clamps each pass to at most six rows and uses a two-minute parent deadline.

P1-208 does not authorize a full unbounded queue scan or unlimited network fan-out.

### 4.2 Stale evidence is excluded from ordinary hot enumeration

`listPendingRemoteSaves(maxItems, { includeStale = false })` excludes `phase === 'stale-unverified'` by default.

This active/archive split should remain. Archived unknown-settlement evidence must not occupy ordinary hot recovery capacity forever.

### 4.3 Auth absence is not misclassified as a failed remote attempt

For a non-verified row, when `authAvailable` is false, recovery increments its local deferred count and continues. It does not increment `attemptCount`, set a remote error or move the row to stale merely because credentials are missing.

That is semantically correct: lack of current OAuth authority is not evidence that the earlier remote effect failed.

### 4.4 Genuine reconciliation failures rotate metadata

`markPendingRemoteSaveFailure()` fresh-reads the durable row and writes a new `updatedAt`, incremented `attemptCount` and bounded `lastError`.

Thus real attempted work naturally leaves the oldest prefix. Credential absence intentionally does not.

### 4.5 `remote-verified` bypasses OAuth-dependent reconciliation

If a row is already `remote-verified`, the current loop skips the Yandex `/resources`/public-link block and proceeds to `appendJournalEntryFromDurableCheckpoint(...)`.

So there is an existing cheap/local recovery class whose admission does not require current Yandex OAuth.

## 5. Fresh current-source root cause

### 5.1 Candidate enumeration is one oldest `updatedAt` prefix

Current `listPendingRemoteSaves()` does:

```text
store().index('updatedAt').openCursor(null, 'next')
```

and collects until `items.length >= max`.

The store currently has only the `updatedAt` scheduling index. There is no phase-aware index.

### 5.2 The caller further caps the prefix to six

`recoverPendingRemoteSaves()` computes:

```text
cappedItems = min(6, maxItems)
queue = await listPendingRemoteSaves(cappedItems)
```

Therefore rows after the first six active oldest rows are invisible to the pass.

### 5.3 Auth is snapshotted before the loop

Current recovery computes one `authAvailable` boolean before processing selected rows.

This is independently relevant to P1-196 for current-generation invalidation, but P1-208 needs only the scheduling consequence: when auth is unavailable, all selected non-verified rows are unable to progress.

### 5.4 Auth-blocked deferral preserves the same `updatedAt`

For each selected row:

```text
if (current.phase !== 'remote-verified') {
    if (!authAvailable) {
        deferred += 1;
        continue;
    }
    ...
}
```

No durable scheduling metadata changes on this branch.

Therefore the same rows remain oldest.

### 5.5 A later `remote-verified` row is locally actionable but not selected

The verified row would bypass the auth gate if it reached the loop. But candidate enumeration has already omitted it.

This is the P1-208 starvation boundary: **work capability is classified after a phase-blind bounded selection**.

## 6. Deterministic current failure schedule

Assume the active store contains, ordered by `updatedAt`:

```text
P1 prepared  t=1
P2 prepared  t=2
P3 prepared  t=3
P4 prepared  t=4
P5 prepared  t=5
P6 prepared  t=6
V1 remote-verified t=100
```

After worker restart there is no usable auth.

Wake W1:

```text
list -> P1..P6
P1..P6 -> deferred
no updatedAt changes
V1 not examined
```

Wake W2:

```text
list -> same P1..P6
P1..P6 -> deferred
V1 not examined
```

This can repeat indefinitely across MV3 restarts because no fairness state is advanced by the credential-blocked branch.

The result is not merely latency. V1 represents a remote side effect already accepted as verified but whose local Journal publication/finalization can remain pending forever.

## 7. Why simply touching `updatedAt` on auth deferral is not the preferred contract

A naive patch could rewrite every auth-blocked row's `updatedAt` merely to rotate it.

That would improve this one schedule, but it overloads a field currently used as mutation/attempt age and creates several problems:

1. credential absence would look like attempted remote work;
2. repeated maintenance wakes could churn durable writes while logged out;
3. stale-age/diagnostic semantics become harder to interpret;
4. all work would still share one phase-blind index;
5. cross-wake fairness would depend on incidental write ordering rather than explicit policy.

P1-208 should introduce explicit scheduling semantics rather than fabricate remote attempts.

## 8. Required architecture

### 8.1 Classify durable recovery work before consuming the whole batch

At minimum the hot queue needs these conceptual classes:

1. **local-finalizable** — `remote-verified`; no further Yandex OAuth is required for the remaining local Journal step;
2. **remote-reconcile** — PREPARED / transfer-unknown work requiring remote observation/mutation authority;
3. **auth-blocked** — class 2 while current credentials/capability cannot admit it;
4. **archived/dead-letter** — `stale-unverified` / manual-resolution evidence outside ordinary hot work.

The exact storage representation may differ, but a bounded pass must not allow class 3 to permanently consume all admission slots ahead of class 1.

### 8.2 Use bounded phase-aware candidate access

A preferred concrete IndexedDB design is a composite index such as:

```text
phaseUpdatedAt = [phase, updatedAt]
```

on `JOURNAL_PENDING_REMOTE_STORE`.

Implementation would require an appropriate `JOURNAL_DB_VERSION` migration, but this research branch intentionally does not make that runtime change.

Alternative acceptable designs are:

- separate bounded phase indexes/queues;
- a durable fair scan cursor;
- explicit `nextAttemptAt` with an eligible index;
- another design proving equivalent bounded admission and restart-safe fairness.

What is not acceptable is an unbounded full-store scan on every maintenance wake.

### 8.3 Reserve bounded local-finalization capacity

If at least one `remote-verified` active row exists, a bounded pass must admit local-finalizable work regardless of current OAuth availability.

For a six-row batch, one conceptual policy is:

```text
>= 1 local-finalization slot when such work exists
>= 1 remote-reconcile slot when auth is usable and such work exists
remaining slots filled from currently progress-capable lanes oldest-first
```

The exact numbers are policy, not the P1-208 contract. The invariant is no permanent starvation in either direction.

### 8.4 Avoid reverse starvation

Always prioritizing all verified rows before all remote work can create the inverse defect if verified work continuously arrives.

When auth is usable, active remote-reconcile work must also receive bounded progress.

Therefore the target is fair lane allocation / round-robin quotas, not one absolute priority queue.

### 8.5 No-auth passes should spend budget on work that can progress

When auth is unavailable:

- `remote-verified` work remains eligible;
- auth-required work remains durable but deferred;
- deferred rows are not deleted, failed or falsely aged merely to create progress;
- the pass should not waste all six effective slots repeatedly selecting work known to be inadmissible under current auth state.

This allows useful local convergence while preserving truthful auth-required status.

## 9. Cross-wake and restart semantics

Fairness cannot rely solely on an in-memory rotating index because MV3 worker termination is central to this recovery path.

Acceptable restart-safe approaches include:

- phase-indexed deterministic lane selection that reconstructs fairness from durable rows on every wake;
- durable lane cursors/generation;
- durable `nextAttemptAt` eligibility metadata.

The minimal two-lane deterministic quota model can remain restart-safe without a separate cursor because every wake explicitly probes the local-finalizable lane and, when auth exists, the remote-reconcile lane.

If a richer round-robin policy is used, its cursor must be durable or otherwise prove the same restart invariant.

## 10. Fresh-read before action

Candidate-list phase is scheduling metadata, not final action authority.

Between enumeration and processing, another operation may change a row:

```text
PREPARED -> remote-verified
remote-verified -> finalized/removed
active -> stale/cancelled
```

Before a side effect or local finalization, recovery should fresh-read the exact durable checkpoint and act from its current phase/generation.

P1-208 requires this mainly to ensure the fair scheduler does not turn a stale listed phase into action authority. Exact identity/CAS semantics remain with P0-074/P0-076/P1-184/P1-198.

## 11. Auth-state interaction

P1-208 does not define token validity. It consumes current truthful auth/capability state from P1-195/P1-196/P1-177.

A future P1-196 implementation may invalidate auth after processing one row. Later rows in the same batch must not assume the pre-loop auth snapshot remains valid.

Therefore the final design should either:

- re-evaluate current auth admission per network-required item; or
- stop/defer the remaining network lane after current auth becomes unusable.

Already selected `remote-verified` local-finalization work should still be allowed to converge if its independent Journal authority remains current.

## 12. Result/status truth

Recovery status may truthfully report both:

```text
recovered > 0
and
authRequired = true
```

Example: one verified row is locally finalized while three PREPARED rows remain credential-blocked.

`authRequired` must describe outstanding blocked recovery, not imply that the whole pass made zero progress.

Useful diagnostics include bounded counts such as:

- selected local-finalizable;
- finalized local;
- selected remote-reconcile;
- auth-deferred;
- failed;
- stale/archived;
- remaining active by phase.

These are diagnostics, not authority.

## 13. Storage/index boundedness

A fix must preserve the existing global active cap (`MAX_PENDING_REMOTE_SAVES = 20`) and the per-pass bound (`<= 6`) unless a separate capacity owner changes them.

Even with only 20 active rows today, the architecture should not encode a full-scan assumption because:

- caps can evolve;
- similar patterns are reused in other recovery queues;
- bounded IndexedDB access is part of the project's general MV3 reliability contract.

A composite phase index gives the implementation a direct bounded path to the oldest candidate in each lane.

## 14. Stale evidence / reactivation

`stale-unverified` remains outside the ordinary active hot queue.

P1-208 does not authorize deleting retained stale evidence to improve fairness.

If user retry reactivates an archived row, existing exact-generation/reactivation owners still control whether it is the same physical recovery generation and how its scheduling metadata is reinitialized.

## 15. Relationship to P1-064

P1-064 owns local-download recovery starvation; P1-208 owns `pendingRemoteSaves`.

The shapes are analogous but operational capability differs:

- local downloads depend on browser download state;
- remote saves include a class whose remote effect is already verified and only local Journal finalization remains;
- remote PREPARED work may be blocked specifically by Yandex auth/capability.

The shared architectural lesson is bounded fair admission, not a merged owner.

## 16. Relationship to P1-192

P1-192 requires durable fair progress for long alarm-started MV3 maintenance across wakes.

P1-208 is one concrete queue-level instance and should supply a bounded selector that P1-192 can call without repeatedly consuming a no-progress prefix.

The global maintenance scheduler still owns cross-stage time allocation; P1-208 owns fairness inside `pendingRemoteSaves`.

## 17. Relationship to P1-184

A `remote-verified` phase must mean exact remote object/content proof according to P1-184.

P1-208 must never achieve local-finalization priority by weakening verification to path+size or by marking unknown settlement as verified.

The sequence is:

```text
exact remote proof (P1-184)
        ↓
phase = remote-verified
        ↓
phase-aware fair admission (P1-208)
        ↓
Journal finalization under its own generation/CAS rules
```

## 18. Deterministic model

`project_tools/test_p1_208_remote_recovery_phase_fairness_model.js` models:

1. exact current six-row starvation;
2. auth deferral preserving timestamp/attempt metadata;
3. verified local completion without auth;
4. guaranteed local-finalization lane;
5. no-auth budget used only on progress-capable work;
6. remote lane share when auth is usable;
7. archived stale exclusion;
8. non-selection preserving durable evidence;
9. auth-restored resumption;
10. global six-row bound;
11. restart-safe deterministic phase selection;
12. fresh durable phase vs stale listed phase;
13. genuine failure rotation separate from auth absence;
14. simultaneous progress + authRequired truth;
15. P1-184 exact-proof separation;
16. bounded phase-index design;
17. mixed-phase global work bound.

Model PASS establishes the scheduling invariants only. It is not product/runtime closure.

## 19. Source-bound gate

`project_tools/test_p1_208_remote_recovery_phase_fairness_source.js` is intentionally RED against the current runtime until implementation contains explicit phase-aware bounded selection.

It preserves current positive controls and requires visible source evidence for:

- a phase-aware/eligible scheduling index or equivalent durable bounded primitive;
- bounded local-finalization lane admission;
- bounded remote-reconcile share when auth is usable;
- no phase-blind oldest prefix as the entire candidate authority;
- no full unbounded store scan;
- no fake failure/timestamp mutation merely for auth deferral;
- fresh durable checkpoint read before action;
- `remote-verified` bypass of auth-dependent network reconciliation;
- truthful mixed progress + auth-required reporting;
- stale archive exclusion;
- hard per-pass work bound.

## 20. Implementation sketch

One concrete implementation direction:

```text
IndexedDB pendingRemoteSaves
  keyPath: id
  indexes:
    updatedAt
    phaseUpdatedAt: [phase, updatedAt]
```

Then:

```text
selectRemoteRecoveryBatch(limit=6, currentAuth)
  verified = bounded oldest phase=remote-verified
  remote   = bounded oldest active non-verified phases if auth usable

  result = fair quota merge(verified, remote, limit)
```

Before acting on each selected id:

```text
current = freshReadPendingRemoteSave(id)
if missing/archived -> skip
if current.phase == remote-verified -> local finalization
else if current auth/capability not usable -> defer
else -> exact remote reconcile under existing operation context
```

The selector should read only bounded per-lane candidates. It should not materialize the whole store to classify phases in JavaScript.

## 21. Acceptance scenarios

Runtime implementation should eventually prove at least:

1. six oldest PREPARED + no auth + newer verified -> verified finalizes in first bounded pass;
2. same setup after full worker restart -> same progress guarantee;
3. repeated no-auth wakes do not increment remote attemptCount or fabricate remote errors;
4. auth restoration resumes PREPARED reconciliation;
5. continuous verified arrivals do not permanently starve remote work when auth is usable;
6. continuous remote backlog does not permanently starve verified local finalization;
7. stale/archive rows do not consume hot lane capacity;
8. row phase changes between selection/action -> fresh-read uses current durable phase;
9. row removed by concurrent clear/import -> no resurrection;
10. invalid auth discovered mid-pass -> remaining network work defers while verified local work can still converge;
11. unknown remote settlement is never upgraded to verified by the scheduler itself;
12. per-pass operations remain <= configured hard bound;
13. candidate DB work is bounded through indexes/cursors rather than full materialization;
14. status can report local progress and outstanding auth requirement simultaneously;
15. existing P1-184 exact-object/content proof remains intact.

## 22. Physical evidence boundary

P1-208 should not be closed from deterministic model/source inspection alone.

After implementation it needs at least real unpacked-Chrome restart evidence with durable IndexedDB rows, including:

- prepared/auth-blocked rows created before restart;
- a durable remote-verified row behind them;
- worker termination/restart;
- no Yandex auth available;
- local verified Journal finalization observed without remote network call;
- later reauthorization allowing blocked remote rows to resume;
- no lost/deleted recovery evidence.

Provider credentials should be disposable test credentials; no production OAuth token should enter logs/evidence.

## 23. Release interpretation

This research block does not change release readiness.

P1-208 remains ACTIVE because:

- runtime has not been patched;
- source-bound gate is expected RED on current source;
- no physical Chrome restart evidence has been produced for the target architecture.

No build, tag or GitHub Release is created by this branch.
