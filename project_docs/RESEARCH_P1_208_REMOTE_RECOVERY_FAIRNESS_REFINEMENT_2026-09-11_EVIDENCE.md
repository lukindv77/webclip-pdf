# P1-208 — Pending-remote recovery fairness refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = 3899d07f5e3f30b9168108261e02cb30a02229cc`.

Production/runtime modification: **NONE**.

This tranche does not modify `service-worker.js`, `manifest.json`, release state, release receipts, release readiness, package/version metadata, tags, deployment, publication, P1-231 S2 state, or browser L5 evidence.

Hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Registry owner

Current `project_docs/RESEARCH_REGISTRY.md` defines:

> P1-208 ACTIVE — Pending-remote recovery needs phase/status fairness; cheap remote-verified local finalization cannot starve behind older auth-blocked PREPARED rows.

No new P-code is introduced. P1-208 remains ACTIVE until separately scoped runtime implementation and required evidence are complete.

## 2. Research method and provenance boundary

This refinement was rebuilt from the exact canonical baseline above in this order:

1. current Registry owner;
2. current `service-worker.js` pending-remote store/enumeration/recovery paths;
3. current canonical adjacent-owner evidence, especially P1-195/P1-196 auth truth, P1-179 namespace binding, P1-184 remote proof, P1-198 physical operation identity, and P1-207 source provenance;
4. historical `research/p1-208-remote-recovery-phase-fairness-2026-09-07` only as provenance;
5. fresh external primary-source research;
6. a deterministic current-gap/target-semantics model.

No historical branch is imported wholesale.

A strong revalidation fact is that the historical P1-208 branch and current canonical `main` use the same `service-worker.js` blob:

`6d61ac81befdbf2804ae9dbec425aa08d1194eb1`

Therefore the relevant runtime mechanism has not changed since the historical investigation, while ownership assumptions around it are refreshed against the now-canonical later research sequence.

## 3. Current positive controls

Current source already has several useful safety properties that P1-208 must preserve:

- `JOURNAL_PENDING_REMOTE_STORE` is durable IndexedDB state;
- ordinary active enumeration excludes archived `stale-unverified` evidence;
- active pending-remote capacity is bounded (`MAX_PENDING_REMOTE_SAVES = 20`);
- one recovery invocation has a hard item bound of at most six;
- recovery also has a wall-clock deadline;
- `remote-verified` is a distinct durable phase;
- `remote-verified` can proceed to `appendJournalEntryFromDurableCheckpoint(...)` without entering the auth-dependent remote reconciliation block;
- genuine remote failures use the existing failure/attempt transition machinery;
- remote verification remains an explicit proof transition rather than a scheduling shortcut.

P1-208 is therefore not a request to remove bounds, weaken proof, or turn recovery into an unbounded drain loop.

## 4. Current selection authority is phase-blind

Current `listPendingRemoteSaves(maxItems, ...)` opens the `updatedAt` index and walks it oldest-first.

The pending-remote store has an `updatedAt` index but no current durable phase/eligibility scheduling index such as a compound phase/time key, recovery lane, or `nextAttemptAt` key.

Current `recoverPendingRemoteSaves(trigger, maxItems = 6)` computes:

```text
cappedItems = clamp(maxItems, 1..6)
queue = await listPendingRemoteSaves(cappedItems)
```

So the complete selection authority for one pass is one oldest `updatedAt` prefix, before phase readiness is considered.

## 5. Current auth handling occurs after that prefix is fixed

Recovery determines auth availability once for the pass:

```text
authAvailable = true
try getValidYandexAccessToken()
catch -> authAvailable = false
```

Then each selected row is processed. For a selected row whose phase is not `remote-verified`:

```text
if (!authAvailable) {
    deferred += 1
    continue
}
```

This is correct in one important respect: lack of credentials is not fabricated as a remote failure merely to rotate queue age.

But because selection happened earlier, the pass can spend its entire six-row admission window on work that cannot progress.

## 6. Canonical deterministic starvation schedule

A current-shaped schedule is:

```text
P1..P6 = six oldest active rows, phase PREPARED
V1     = later active row, phase remote-verified
OAuth  = unavailable
maxItems = 6
```

Wake 1:

```text
listPendingRemoteSaves(6) -> [P1..P6]
P1..P6 each defer for auth
V1 is not selected
```

Credential absence does not mutate `attemptCount` or `updatedAt`, which is desirable truthfulness.

Wake 2 and later:

```text
oldest prefix remains [P1..P6]
V1 remains outside the selected prefix
```

Thus V1 may starve indefinitely even though it has already crossed the remote proof boundary and can complete local finalization without OAuth or Yandex network access.

## 7. This is readiness inversion, not proof failure

The relevant work classes are semantically different:

```text
remote-verified
  -> remote proof already accepted under its proof owner
  -> remaining work is local durable finalization

PREPARED / remote-reconcile-required
  -> may need valid current auth and remote I/O/proof
```

P1-208 must not make PREPARED look verified, and must not weaken the proof requirements that created `remote-verified`.

It only prevents blocked work in one readiness class from monopolizing the bounded admission prefix of another class that can make progress now.

## 8. Minimum target: bounded phase/readiness-aware selection

The recovery selector needs durable phase/readiness awareness before the six-item budget is exhausted.

A valid architecture can use, for example:

- phase/time indexed lanes;
- a compound durable scheduling key;
- bounded independent cursors per readiness class;
- another equivalent bounded indexed scheme.

The exact schema is an implementation choice.

The required semantic property is:

```text
if at least one active remote-verified row exists,
a bounded recovery pass must be able to admit local-finalization work
without first consuming its whole item budget on older auth-blocked PREPARED rows.
```

No whole-store `getAll()` materialization is required or desired merely to classify phases.

## 9. Preserve boundedness and avoid reverse starvation

P1-208 does not justify an unbounded "verified-first drain".

A robust selector should retain a hard total item/time budget and, when auth is usable, reserve bounded opportunity for both:

```text
local-finalization lane
remote-reconciliation lane
```

This prevents the fix for one starvation direction from creating the opposite one under a sustained `remote-verified` backlog.

A simple conceptual policy is a small guaranteed slot per ready class followed by bounded oldest-ready fill. Exact quotas are implementation detail and should be validated against existing capacity/deadline constraints.

## 10. Credential absence is deferral, not fake failure rotation

One tempting workaround would update blocked PREPARED rows solely to move them behind V1.

That is rejected because it would conflate:

```text
credential currently unavailable
```

with:

```text
a remote recovery attempt genuinely failed
```

It would also make scheduling depend on synthetic diagnostic mutations rather than explicit readiness.

P1-208 needs explicit fair selection, not false failure metadata.

## 11. Fresh-read before phase-dependent action remains necessary

Candidate selection is not action authority. Between enumeration and processing, another continuation may advance or retire a checkpoint.

Future implementation should fresh-read the selected durable row before deciding the phase-dependent action and then apply the existing receipt/authority checks.

A row listed as PREPARED may already be `remote-verified`; a listed verified row may already have been finalized or superseded.

Fair scheduling must therefore compose with current stale-state fencing rather than treating the selection snapshot as a capability.

## 12. MV3 restart boundary

Fairness cannot rely only on a worker-memory round-robin pointer.

Chrome documents that extension service workers may terminate after inactivity or unexpectedly and that global variables are lost; important state should be persisted in storage.

For WebClip this means readiness classification and enough scheduling state to avoid deterministic starvation must derive from durable pending-row state/indexes, or from a deterministic bounded selection rule reconstructable after restart.

Restart must not reset the system into the same permanently starved oldest-prefix schedule.

## 13. External comparison: PostgreSQL queue-like selection

Fresh source:

- `https://www.postgresql.org/docs/17/sql-select.html`

PostgreSQL documents `SKIP LOCKED` as unsuitable for a general consistent view but explicitly useful to avoid contention with multiple consumers accessing a queue-like table: unavailable rows can be skipped rather than blocking all useful work.

WebClip does not use PostgreSQL and does not inherit row-lock semantics. The relevant comparison principle is only:

```text
bounded queue processing may skip currently ineligible/blocking work
so other ready work can progress
```

That supports phase/readiness-aware admission instead of forcing one globally oldest blocked prefix.

## 14. External comparison: Kubernetes workqueue retry separation

Fresh source:

- `https://pkg.go.dev/k8s.io/client-go`

The Kubernetes workqueue family distinguishes ready work from delayed/rate-limited requeue. Its documented delaying/rate-limiting interfaces allow failed work to be retried later without requiring a hot loop that monopolizes all immediate processing.

WebClip does not inherit Kubernetes queue implementation. The comparison supports keeping blocked/retry eligibility explicit rather than faking failures or allowing unavailable work to consume every ready-work slot.

## 15. External source: Chrome extension worker lifecycle

Fresh source:

- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

Chrome documents worker termination after inactivity and recommends persistence instead of global variables because globals are lost on shutdown.

P1-208 implication is narrow: fairness state must survive or be reconstructable from durable state; no keepalive policy change is required.

## 16. Adjacent owner composition

P1-208 owns **which eligible pending recovery work receives bounded service**. It does not absorb adjacent authorities:

- P1-195 / P1-196: Yandex capability/auth validity truth;
- P1-177: backup scheduler generation/admission where applicable;
- P1-179: immutable account/root namespace binding;
- P1-184: exact remote effect/content proof;
- P1-194: durability-class truth;
- P1-198: worker-issued physical operation identity;
- P1-207: exact Journal source revision carried by backup receipts;
- P1-210: lost outer user-operation response reconciliation.

`remote-verified` must mean the proof owner already accepted the exact remote evidence. Fairness cannot manufacture that phase.

Likewise a fair selector cannot use `operationId`, `physicalOperationId`, source revision, or namespace identity as a substitute for continuation/settlement authority.

## 17. P1-207 composition

Where a pending remote row participates in backup settlement, a fair finalization pass must preserve its exact P1-207 provenance unchanged.

Scheduling may choose receipt R sooner, but it must not rewrite:

```text
sourceRevision
namespace binding
remote proof
physical operation identity
```

The fairness decision and the receipt's semantic identity are orthogonal.

## 18. Archived stale evidence remains outside hot-lane admission

Current ordinary active enumeration excludes `stale-unverified` archived evidence. P1-208 should preserve that boundary.

Fairness is among active recoverable classes; it is not a reason to repeatedly spend the hot recovery budget on retained archival evidence.

## 19. Status truth after a mixed pass

A fair pass may simultaneously achieve local progress and still have auth-blocked work outstanding.

Truthful status therefore may need to express both facts, conceptually:

```text
recovered/finalized > 0
authRequired = true
blocked/deferred auth work > 0
```

A generic all-or-nothing status would hide useful progress or remaining dependency.

Exact diagnostic field names are implementation detail.

## 20. Bounded target invariants

A future P1-208 implementation should satisfy at least:

1. total work per invocation remains hard-bounded;
2. active stale archive remains outside ordinary hot selection;
3. a ready `remote-verified` row cannot starve solely because older PREPARED rows lack auth;
4. auth absence is not recorded as fabricated remote failure merely for queue rotation;
5. when auth is available, remote-reconcile work also retains bounded opportunity so the fix does not introduce reverse starvation;
6. candidate lookup is bounded/indexed rather than whole-store materialization;
7. selected rows are fresh-read/revalidated before phase-dependent action;
8. `remote-verified` continues to bypass unnecessary auth/network reconciliation;
9. fair selection does not manufacture remote verification or weaken exact proof;
10. fairness survives/reconstructs across MV3 worker restart from durable state;
11. receipt provenance/namespace/source revision/physical identity are preserved unchanged;
12. result/status can report progress and remaining auth dependency truthfully.

## 21. Deterministic model scope

The accompanying model covers:

- reproducible starvation under the current oldest-six prefix;
- repeated wakes with unchanged auth-blocked rows;
- verified local finalization without OAuth;
- bounded fair admission of local-finalization work;
- bounded share for auth-usable PREPARED work;
- stale archive exclusion;
- no synthetic failure rotation for auth absence;
- restart/reconstruction fairness;
- fresh-read phase change;
- hard six-item bound;
- provenance preservation across scheduling;
- explicit separation of scheduling fairness from remote proof.

The model is architecture research evidence only. It is not production/browser qualification.

## 22. Closure boundary

This tranche does **not** close P1-208.

P1-208 remains ACTIVE until separately authorized runtime implementation and required implementation/browser evidence establish the target invariants in current code.

Research completion does not authorize release actions and does not alter P1-231 release state.
