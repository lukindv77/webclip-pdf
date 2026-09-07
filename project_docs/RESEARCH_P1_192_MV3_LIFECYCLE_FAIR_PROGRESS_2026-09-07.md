# P1-192 — MV3 lifecycle ownership and durable fair progress — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-192-mv3-lifecycle-fair-progress-2026-09-07`  
Owner: **P1-192 ACTIVE**.

This is a research/model checkpoint. Production runtime, `manifest.json`, Registry status and release state remain unchanged.

## 1. Canonical owner

Registry defines P1-192 as:

> Long alarm-started background operations need explicit MV3 lifecycle ownership **and durable fair progress across maintenance phases/wakes**.

P1-192 owns the lifecycle/progress coordinator contract. It does not take ownership away from the more specific state/effect owners:

- **P1-177** — backup scheduler pause/resume generation and no-auth semantics;
- **P1-179** — immutable account/root namespace for backup durable state;
- **P1-183** — exact destructive Trash move checkpoint;
- **P1-184** — exact remote-content receipt and recovery proof;
- **P1-076** — backup lease validity across resumable/publish stages;
- **P0-076** — Journal generation/per-entry CAS authority;
- **P0-072** — already-admitted external effects cannot be cancelled by deleting local checkpoints.

P1-192 answers two narrower questions:

1. **what durable state owns progress when an MV3 worker can disappear between awaits?**
2. **how do later independent maintenance phases receive bounded progress instead of being starved by repeatedly restarting earlier phases?**

## 2. Fresh canonical baseline proof

Fresh check before this branch was created:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- `service-worker.js` Git blob = `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- `manifest.json` remains version `0.9.8` with `minimum_chrome_version = 118`;
- `project_docs/RELEASE_READINESS.md` remains target `0.9.9`, **NOT READY**.

No production/runtime file is changed on this branch.

## 3. Official Chrome MV3 lifecycle constraints

Official Chrome Extensions documentation checked on 2026-09-07 establishes the following architecture facts.

### 3.1 Worker termination is normal, not exceptional

Chrome documents that an extension service worker is normally terminated after inactivity and that extensions must be resilient to unexpected termination. Current lifecycle documentation describes the ordinary idle boundary as roughly 30 seconds, with additional long-request/fetch limits.

Reference:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

### 3.2 Long work that does not keep touching extension APIs can be interrupted

Chrome's migration guidance explicitly warns that long-running service-worker operations that do not call extension APIs can be shut down mid-operation, including long asynchronous computation, and recommends persistence/restart resilience rather than assuming one in-memory Promise survives.

Reference:

- https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers

### 3.3 Alarm is a wake-up event, not durable workflow state

Current `chrome.alarms` reference defines `onAlarm` callback as:

```text
(alarm: Alarm) => void
```

An alarm can wake the worker, but the alarm object does not carry WebClip's durable phase cursor, exact external-effect receipt, namespace, or Journal generation.

Reference:

- https://developer.chrome.com/docs/extensions/reference/api/alarms

### 3.4 Minimum Chrome 118 matters

The current extension supports Chrome 118. Newer alarm persistence controls such as the Chrome 150 `persistAcrossSessions` field therefore cannot become a correctness prerequisite for P1-192.

WebClip should continue reconstructing required alarms at worker/startup boundaries, but **durable workflow progress must live in WebClip storage**, not only in an alarm instance.

## 4. Current source already recognizes part of the MV3 problem

Current `initializeOperationLogCleanup()` contains an explicit comment that long maintenance should not be launched directly from startup and that an alarm is a durable wake-up boundary.

Current `scheduleDueBackupSoon()` has the same intent for backup: use an alarm instead of starting a long backup directly from worker-start/startup initialization.

This is a useful positive control and should be preserved.

But it solves only:

```text
How do we get another worker wake?
```

It does **not** solve:

```text
What exact phase/sub-phase should that wake resume?
What work already committed before the previous worker disappeared?
Which later independent phase gets its fair turn?
```

## 5. Current alarm handler detaches long Promise chains

Current source has one top-level alarm listener shaped as:

```text
chrome.alarms.onAlarm.addListener((alarm) => {
  ...
  runDueJournalBackup(...).catch(...)
  ...
  runLoggedOperationLogCleanup(...).catch(...)
})
```

The callback does not provide WebClip with a durable lifecycle receipt for the whole asynchronous chain. The Promise is started and observed with `.catch()`, but its in-memory continuation is not a restart authority.

P1-192 does **not** require trying to make an alarm listener itself persistent. Instead:

```text
alarm event -> admit one bounded durable slice -> persist next state -> return
```

Correctness must remain valid even if Chrome terminates the worker immediately after any durable commit boundary.

## 6. Current maintenance pipeline has a fixed restart order

`runLoggedOperationLogCleanup()` currently creates a fresh background-maintenance operation and executes a fixed sequence:

```text
settings
-> operation-log cleanup
-> temporary storage cleanup group
   - transfer cleanup
   - PDF-cache cleanup
   - stale remote-checkpoint cleanup
   - import-staging cleanup
-> Journal append recovery
-> remote-save recovery
-> local-download reconciliation
-> urlStats repair
-> complete
```

The temporary-storage group is parallel internally, but later groups remain sequential.

No durable `maintenancePhase`, `nextPhase`, round-robin cursor or per-phase continuation receipt is read before starting this pipeline.

Therefore every alarm wake conceptually starts from phase 1 again.

## 7. Starvation schedule

A legal MV3 interruption schedule is sufficient to expose the architecture defect:

```text
wake 1:
  log cleanup
  temporary cleanup
  worker terminated

wake 2:
  log cleanup again
  temporary cleanup again
  worker terminated

wake 3:
  log cleanup again
  temporary cleanup again
  worker terminated
...
```

Under that schedule, independent later phases can receive zero progress indefinitely:

- Journal append recovery;
- pending remote-save recovery;
- local-download reconciliation;
- urlStats repair.

This does not require an exploit or unusual attacker behavior. It is a pure lifecycle/fairness property of an ephemeral worker plus fixed-phase restart order.

## 8. Current maintenance phase bounds are local, not global fairness

The source has useful local deadlines such as `MAINTENANCE_IDB_TX_TIMEOUT_MS = 20_000` and several bounded recovery batches.

Those limits reduce the cost of individual operations, but they do not create cross-wake fairness.

Even if every early phase is locally bounded, repeatedly consuming the available worker lifetime in the same early phases can still starve later phases.

P1-192 therefore requires both:

```text
bounded phase slice
+
durable fair phase selection across wakes
```

## 9. Target maintenance coordinator

Independent maintenance domains should use a durable round-robin coordinator rather than one monolithic function.

Conceptual state:

```text
backgroundMaintenanceState = {
  version: 1,
  generation: M,
  nextPhase: <phase-id>,
  phaseCursors: {
    operationLogCleanup: <cursor-or-null>,
    transferCleanup: <cursor-or-null>,
    pdfCacheCleanup: <cursor-or-null>,
    remoteCheckpointCleanup: <cursor-or-null>,
    importStagingCleanup: <cursor-or-null>,
    journalRecovery: <cursor-or-null>,
    remoteRecovery: <cursor-or-null>,
    localDownloadRecovery: <cursor-or-null>,
    statsRepair: <cursor-or-null>
  },
  updatedAt: ...
}
```

Exact field names may differ. Required semantics do not.

### Wake algorithm

```text
read durable coordinator
validate generation
choose nextPhase
execute at most one bounded slice for that phase
persist phase cursor/outcome
advance nextPhase round-robin
schedule/retain future wake if work remains
return
```

A phase with much more work than other phases must not monopolize every wake.

## 10. Fairness invariant

For independent runnable maintenance phases:

```text
If Chrome provides repeated worker wakes,
and phase X does not stay permanently blocked by its own external prerequisite,
then X must receive a bounded execution slice within a bounded number of coordinator wakes.
```

With N runnable phases, the target is conceptually no worse than one round-robin cycle of N selections, excluding explicitly paused/deferred phases.

A long phase keeps its own durable sub-cursor and re-enters the rotation later.

## 11. Phase-local cursor requirements

Round-robin selection alone is insufficient if a phase restarts its entire large scan every time.

Any phase that can exceed one wake slice needs a restartable cursor appropriate to its data model, for example:

- exact IndexedDB key/range continuation;
- bounded record-id batch receipt;
- exact recovery queue item cursor/generation;
- dirty-generation receipt for derived stats rebuild.

A cursor is not allowed to become stale authority across a destructive Journal generation change. P0-076 remains the generation/CAS owner where applicable.

## 12. Crash point around cursor commit

Every slice needs explicit semantics for:

```text
crash before effect
crash after idempotent local effect but before cursor advance
crash after cursor advance
```

For local idempotent cleanup, repeating the exact item after a crash may be acceptable if deletion/cleanup is identity-safe.

For non-idempotent or externally visible effects, repeating without an exact receipt is not acceptable. Those effects need the existing specialized P0/P1 receipt owners.

## 13. OperationLog progress is telemetry, not control state

Current maintenance writes OperationLog stages such as `cleanup`, `temporary-storage`, `journal-recovery`, `stats-repair`.

Those records are useful diagnostics, but P1-192 must not reinterpret OperationLog text/progress percentages as the workflow cursor.

Reasons:

- every maintenance run creates a new operationId;
- log writes are observational;
- logs are themselves subject to retention cleanup;
- no current startup path reads the last OperationLog stage and resumes from it.

Durable coordinator state must be explicit machine state.

## 14. Backup is not a round-robin workflow

Journal backup phases are causally dependent and should not simply rotate out of order.

Current high-level flow includes:

```text
acquire backup lease
-> read current status/context
-> reconcile prior pending backup
-> build full Journal staged export
-> renew lease
-> obtain/start signed remote upload
-> verify remote result
-> commit backup success state
-> housekeeping
```

The target for backup is therefore a **durable state machine**, not the independent maintenance round-robin.

Conceptual state:

```text
backgroundBackupWorkflow = {
  version: 1,
  schedulerGeneration: <P1-177>,
  namespace: <P1-179>,
  workflowId: ...,
  phase: decide | reconcile | stage | upload-admitted | verify | commit | housekeeping,
  phaseCursor: ...,
  pendingExternalEffect: <P1-184 receipt or null>,
  updatedAt: ...
}
```

## 15. Current Journal export staging can lose progress across worker termination

`stageFullJournalExportOnce()` currently:

1. sets a build deadline of up to `JOURNAL_EXPORT_BUILD_TIMEOUT_MS = 5 min`;
2. captures Journal revision;
3. creates a fresh random `stagingKey`;
4. serializes the Journal in chunks;
5. stores chunk Blob records under that key;
6. writes the staging manifest only after the snapshot is complete and revision checks pass.

This is good bounded/storage-aware engineering inside one invocation, but it is not a durable cross-wake resume protocol.

If the worker disappears after several chunk records are written but before a complete resumable control receipt exists, a later backup invocation creates a new `stagingKey` and starts snapshot construction again. Old chunks become cleanup work.

P1-192 requires a truthful choice:

### Option A — bounded resumable staging

Persist enough exact staging generation/cursor state to resume the same snapshot safely across wakes.

Because the live Journal can mutate, the cursor must remain tied to an exact Journal revision/generation and fail/restart if that authority changes.

### Option B — prove staging is always below one safe wake slice

Only acceptable if a direct bounded proof exists for the supported maximum Journal envelope. Current five-minute build deadline is far too large to serve as that proof by itself.

## 16. Engineering slice target

P1-192 should not depend on the worker surviving close to Chrome's idle boundary.

Recommended implementation target:

```text
normal wake slice target: ~10-15 s
local hard stop: <=20 s
```

This leaves margin below the documented ~30 s idle boundary for work that is not continuously resetting the extension-API timer.

This is an engineering budget, not a new correctness assumption: abrupt termination can still happen earlier, and durable restart semantics must remain valid.

## 17. Signed external effects: lease is not cancellation

Current backup already has an important positive control:

```text
prepared backup checkpoint persisted
-> signed transfer starts
-> remote result is later verified
```

That pattern must remain.

P1-192 adds a lifecycle rule:

```text
execution lease expiry
!=
proof external effect did not happen
```

If the worker dies after a signed PUT begins, the next wake must classify the durable effect receipt before authorizing a fresh equivalent effect.

Exact proof is delegated to:

- P1-179 namespace;
- P1-184 exact remote-content receipt;
- P1-076 lease validity;
- P0-076/P0-072 local authority and already-admitted-effect rules.

## 18. Backup lease semantics under P1-192

The current backup lease lives in Journal IndexedDB meta and has a finite TTL. Current source renews it before remote transfer.

Under the target architecture:

- lease = temporary exclusive **execution ownership** for a bounded slice/stage;
- workflow receipt = durable **progress/effect ownership**;
- lease loss stops the current executor from making new admissions;
- lease expiry allows another worker to take execution ownership only after it reads the same durable workflow/effect receipt;
- expiry never clears `pendingExternalEffect` and never means `cancelled`.

This composes with P1-076 rather than redefining its exact lease contract.

## 19. P1-177 pause/resume composition

Before executing a backup slice, coordinator admission must consume the current scheduler generation/mode from P1-177.

### stale alarm generation

```text
no new remote admission
no ordinary failure bookkeeping
pending effect receipt preserved
```

### paused-no-auth

```text
no new Yandex call
no retry churn
pending already-started effect preserved for later reconciliation
```

### active current generation

Only then can the workflow continue.

P1-192 does not create another scheduler generation.

## 20. P1-179 namespace composition

A durable backup workflow/cursor must carry or reference the immutable namespace required by P1-179.

On namespace mismatch:

```text
zero remote calls for foreign pending state
no stale aging based on the new namespace
no deletion as invalid merely because current settings changed
defer/quarantine for exact later reconciliation
```

P1-192 only ensures the workflow resumes the same durable state; P1-179 decides which account/root owns that state.

## 21. P1-183/P1-184 external-effect composition

Any maintenance or backup phase that reaches a remote destructive/mutating effect must not put that effect behind a generic phase cursor alone.

Required composition:

```text
durable exact effect receipt
-> effect admission
-> unknown/verified outcome
-> exact reconciliation
-> only then phase cursor advances past the effect
```

A generic maintenance cursor saying `phase=remote-cleanup-complete` is insufficient if an external effect is still unknown.

## 22. Alarm continuation strategy

After a bounded slice, if work remains, implementation may use a short continuation alarm subject to Chrome's supported alarm cadence and project scheduling policy.

Correctness rules:

- alarm name/time is only a wake request;
- durable coordinator state is authoritative;
- duplicate/stale alarm wakes are harmless;
- missing alarm can be reconstructed from durable state on worker/startup wake;
- no alarm occurrence itself proves a previous slice failed or succeeded.

Because WebClip supports Chrome 118, architecture must not require Chrome 150-only alarm persistence features.

## 23. Background maintenance and backup must not block each other indefinitely

Two separate alarm classes currently exist:

- Journal backup periodic/retry;
- OperationLog/background-maintenance hourly.

P1-192 does not require merging them into one global scheduler.

It does require that each alarm run bounded work and return to an idle/restartable state. A long backup stage must not assume the same worker will also reach unrelated maintenance work, and a long maintenance scan must not indefinitely defer backup continuation.

If a future unified coordinator is introduced, it must preserve separate owner generations/namespaces and use explicit weighted/fair admission rather than silently merging authorities.

## 24. Deterministic model

`project_tools/test_p1_192_mv3_lifecycle_fair_progress_model.js` proves:

1. current-shaped fixed phase ordering can starve every later maintenance phase under repeated termination after early phases;
2. a durable round-robin cursor gives each independent phase progress across fresh worker rehydrations;
3. progress does not rely on worker globals;
4. a signed-effect receipt survives lease expiry/worker loss;
5. the next wake reconciles an unknown effect instead of starting a duplicate;
6. P1-177 scheduler generation/pause invalidates stale admission while preserving the pending effect receipt.

Model result:

```text
P1-192 MV3 lifecycle/fair progress model: PASS
```

## 25. Source-bound RED gate

`project_tools/test_p1_192_mv3_lifecycle_fair_progress_source.js` is intentionally a future implementation gate.

It requires source evidence for:

- durable background-maintenance cursor/state;
- durable backup workflow/cursor;
- bounded maintenance wake-slice dispatcher;
- removal of the current monolithic fixed maintenance pipeline;
- restartable Journal backup staging progress;
- explicit lease-expiry-is-not-cancellation semantics;
- preservation of existing alarm reconstruction, backup checkpoint and lease positive controls.

Current canonical runtime does not yet contain those coordinator/cursor primitives, so the source gate is expected to remain **RED** until implementation.

## 26. Physical Chrome evidence requirement

Architecture/model PASS is not enough to close P1-192.

Final closure should include real Manifest V3 lifecycle evidence against the implemented runtime, including at least:

1. terminate/restart worker between early maintenance phases and prove a later phase still receives progress;
2. terminate during a resumable long phase and prove cursor resumes without replaying unbounded prior work;
3. terminate after durable signed-effect admission and before local settlement, then prove restart reconciles rather than duplicates;
4. expire execution lease while an effect remains unknown and prove expiry is not treated as cancellation;
5. fire duplicate/stale alarms and prove durable state makes them harmless;
6. exercise pause/resume generation during an in-flight/unknown backup effect;
7. verify behavior on a Chrome version compatible with the declared minimum/support policy, not only a managed mock.

Registry status must remain ACTIVE until required implementation and physical lifecycle proof are accepted.

## 27. Runtime acceptance requirements

Future implementation/source/Chrome evidence should prove:

1. alarm handlers admit bounded restartable work rather than relying on one detached long Promise chain;
2. maintenance coordinator state is durable and versioned;
3. independent maintenance phases use fair cross-wake selection;
4. long phases have durable sub-cursors or direct proof they fit inside one safe slice;
5. OperationLog progress is not used as control authority;
6. Journal staging is restartable or proven safely bounded;
7. backup workflow phase is durable across worker termination;
8. pending external effect is reconciled before fresh equivalent mutation admission;
9. lease expiry is not cancellation evidence;
10. P1-177 pause/stale-generation rules are checked before new remote admission;
11. P1-179 namespace is preserved across workflow resume;
12. P1-183/P1-184 exact effect receipts remain authoritative for remote mutation/recovery;
13. P0-076 generation/CAS prevents stale local cursor commits after destructive Journal replacement;
14. startup/worker-start can reconstruct missing wake alarms without reconstructing workflow state from mutable settings;
15. duplicate alarms and repeated worker wakes are idempotent;
16. every runnable independent maintenance phase receives bounded progress across repeated wakes;
17. real Chrome MV3 termination/restart evidence passes.

## 28. Status

P1-192 remains **ACTIVE**.

Architecture/model are now saturated enough for implementation planning:

```text
alarm = wake trigger
maintenance = durable round-robin bounded slices
backup = durable causal workflow
lease = execution ownership only
external effect receipt = survives worker/lease loss
```

Current runtime still runs alarm-started maintenance/backup as long asynchronous chains without a durable phase/fairness coordinator. No runtime, manifest, Registry status or release-readiness change is made by this research branch.

Release remains **NOT READY**.
