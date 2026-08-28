# Audit delta — background maintenance cross-phase fairness across MV3 restarts — 2026-08-28

Source-of-truth `main` immediately before this write: `6c22aa32f4a651c2b64b2a0b7d182a7c63013551`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-192 — MV3 background lifecycle / durable progress**. It composes with queue-local fairness items but is not a duplicate of them:

- **P1-064** — fairness inside local-download recovery;
- **P1-208** — phase/status fairness inside `pendingRemoteSaves` recovery;
- **P1-173** — admission bounds for serialized actual-settlement queues;
- **P1-035/P1-043** — active staging cleanup and storage-budget/reservation lifecycle;
- **P1-194** — truthful durability class of recovery evidence.

The newly explicit manifestation is **fairness between maintenance phases when MV3 repeatedly terminates the worker before the fixed-order pipeline reaches later phases**.

No P1-211 is allocated.

## Fresh runtime proof — maintenance phases have a fixed restart-from-the-front order

`runLoggedOperationLogCleanup(trigger)` executes the main recovery phases in a fixed sequence after cleanup work:

1. `recoverPendingJournalAppends(trigger)`;
2. `recoverPendingRemoteSaves(trigger)`;
3. `reconcilePendingLocalDownloads(trigger)`;
4. `ensureJournalStatsHealthy(...)`.

`runStage()` catches an ordinary stage exception and allows the next phase to continue, which is a useful positive control. But a **service-worker process termination** is not an ordinary caught exception. The current worker disappears and the whole function is lost.

On the next hourly maintenance wake, the new worker starts the same pipeline again from phase 1. No durable maintenance phase cursor/generation records that phases 1/2 were already given their opportunity while phases 3/4 were skipped by worker death.

## Remote recovery can legitimately consume the MV3 lifetime before local recovery is reached

`recoverPendingRemoteSaves()` itself is bounded, but its bounded deadline is large relative to an MV3 worker lifetime:

- queue batch is capped at 6;
- function deadline is `Date.now() + 120_000`;
- individual exact Yandex reads/reconciliation waits may consume multiple bounded network attempts within that window.

This is correct from a network-hang perspective: one remote pass is not infinite. It is not sufficient for **cross-phase progress** under MV3 termination.

A legal schedule is:

1. hourly maintenance wake starts;
2. journal recovery finishes;
3. remote recovery begins and performs real bounded work for >30 s;
4. MV3 terminates the worker before local-download recovery begins;
5. next hourly alarm wakes a new worker;
6. pipeline again starts at journal recovery, then remote recovery;
7. a persistent remote backlog again consumes the available worker lifetime;
8. later local-download and stats-repair phases are repeatedly never entered.

No individual function is unbounded, yet the composed scheduler can starve later durable queues indefinitely.

This is the concrete cross-phase case already anticipated by P1-192's requirement that repeated maintenance either finish under lifecycle ownership or make durable resumable progress across wakes.

## Why P1-064 and P1-208 do not solve this

P1-064 ensures that, **when local-download recovery runs**, paused/slow old DownloadItems do not permanently hide later complete/interrupted items.

P1-208 ensures that, **when remote recovery runs**, an auth-blocked/old prefix does not permanently hide later `remote-verified` rows that need cheap local finalization.

Neither guarantees that the scheduler ever enters the local phase or stats phase after repeated worker restarts.

Therefore implementing queue-local rotation without P1-192 phase progress can still leave an entire later queue starved.

## Required P1-192 refinement — durable phase progress or bounded fair slices

A maintenance wake needs a contract that guarantees bounded progress across subsystems, not only boundedness inside each subsystem.

Acceptable implementation families include:

### Durable phase cursor/generation

Persist a small extension-owned maintenance receipt containing the current maintenance generation and next phase. Before/after each phase commit enough state that a crash causes the next wake to resume from an appropriate later phase rather than always restarting from phase 1.

The cursor must be generation-safe: a stale old worker cannot move a newer maintenance generation backward or mark a phase complete after newer work superseded it.

### Round-robin slices per wake

Instead of one long fixed pipeline, give each durable queue a deliberately small time/API slice in a round-robin order and persist the next starting phase. A phase with more work remains pending for a later wake but cannot monopolize every wake.

### Explicit lifecycle owner + watchdog

If an execution context can legitimately keep the full maintenance operation alive, P1-192 may run the composed pass under that owner, while retaining the durable watchdog required for crash recovery. The owner must not hide hangs; existing phase deadlines remain mandatory.

The implementation may combine these approaches.

## Required invariants

1. Every active maintenance subsystem receives a reconciliation opportunity within a bounded number of durable wakes, even if an earlier subsystem has a permanent backlog.
2. Worker termination during phase N does not erase the fact that later phases still need service.
3. Phase-progress metadata is tiny, bounded and durable across worker restart; do not persist large queue snapshots.
4. A stale worker/late storage mutation cannot rewind the current maintenance generation or clear a newer wake schedule.
5. P1-064/P1-208 queue-local fairness remains intact inside each selected phase.
6. A failed/auth-blocked remote phase cannot make local-download terminal checkpoints or Journal stats repair wait indefinitely.
7. A large local-download queue cannot permanently suppress stats repair once the scheduler order is made fair.
8. No fairness mechanism deletes recovery evidence or converts `unknown` into failure merely to advance the cursor.
9. Network/IDB/API budgets remain bounded and maintenance cannot spin continuously after pressure.
10. Alarm scheduling remains crash-safe under P1-118/P1-192; a cursor without a durable future wake is not recovery.

## Deterministic regressions

1. Remote recovery is forced to consume/await >30 s on every invocation; simulate worker termination before local phase. Across successive wakes, local-download recovery still runs within a bounded number of wakes.
2. Same setup with pending Journal stats repair: stats repair is eventually entered despite persistent remote backlog.
3. Crash after durable phase advance but before next phase begins: next wake resumes without permanently skipping the unstarted phase.
4. Crash after phase side effects settle but before cursor update: replay/reconciliation is idempotent and does not duplicate non-idempotent external side effects.
5. Old worker cursor write settles after a new worker advanced generation: stale write is rejected/ignored.
6. P1-208 case: six auth-blocked PREPARED remote rows plus a later `remote-verified` row still receive internal remote fairness when the remote phase runs.
7. P1-064 case: 12 old in-progress local downloads plus a later complete row still receive local queue fairness when local phase runs.
8. Repeated failures in one phase are logged/retained as partial state but do not reset phase rotation to the front indefinitely.
9. No pending work: maintenance converges to idle and does not create unnecessary high-frequency wake loops.
10. Browser/profile restart preserves enough maintenance scheduling state to resume safely without treating a lost worker as successful completion.

## Capacity / reservation observations from the same block

No new resource-admission item was found.

Fresh revalidation preserves existing owners:

- offscreen signed transfers already reserve global count/bytes **before** materialization and hold reservation until actual transfer settlement — positive P0-063 control;
- Blob URL creation still needs pre-materialization reservation under **P0-065**;
- `ensureStorageBudget()` still relies on a point-in-time storage estimate rather than a concurrent-writer reservation, already captured by **P1-043** refinement in the 2026-08-28 multi-block delta;
- quota-pressure cleanup must respect live staging/recovery owner/lease generations under **P1-035/P1-043**;
- Promise-turn growth behind hung serialized barriers remains **P1-173**.

A generic new "global capacity" P-item would duplicate those contracts rather than identify an independent root cause.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

Primary owner: **P1-192**.

Composed dependencies: **P1-064, P1-208, P1-173, P1-035, P1-043, P1-118, P1-194**.

P1-201…P1-210 remain occupied and **P1-211 remains unassigned by this block**.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.
