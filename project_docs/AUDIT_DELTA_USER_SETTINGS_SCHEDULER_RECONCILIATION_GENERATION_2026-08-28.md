# Audit delta — user-settings marker vs scheduler generation reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `557fa8af158e1539197013ee0bb38309e71ea270`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof composes existing:

- **P1-008** — user-settings import bundled commit + crash/unknown-settlement reconciliation marker;
- **P1-177** — backup scheduler must converge to current enabled/paused policy without stale alarm resurrection;
- **P0-074** — config-dependent ancillary work requires exact settings/config generation;
- **P1-157** — all shared settings writers must participate in one versioned mutation contract;
- **P1-210** — outer response loss/pending result must not trigger a second import write.

The fresh acceptance condition is: **an import marker cannot be considered reconciled merely because one scheduler initializer returned. The ancillary scheduler state must be proven for that exact imported settings generation, and older scheduler tasks must no longer have authority to overwrite it.**

## Positive controls that must be preserved

`importUserSettings()` has several strong existing properties:

1. imported allowlisted settings and `USER_SETTINGS_IMPORT_MARKER_KEY` are written in one bundled `chrome.storage.local.set`;
2. actual non-cancellable storage settlement is retained after caller timeout;
3. on timeout the code returns a pending result and explicitly does **not** auto-retry the settings write;
4. a late actual success schedules marker reconciliation;
5. if ordinary post-commit reconciliation fails, the marker is retained so worker startup can repair later.

These are correct crash-consistency principles and should not be weakened.

## Existing marker-generation defect remains

The current marker has no immutable import id/generation. `reconcileUserSettingsImportMarker()` reads whichever current marker exists, initializes the backup scheduler, then removes the marker without compare-and-remove ownership.

`AUDIT_DELTA_USER_SETTINGS_MARKER_GENERATION_2026-08-27.md` already proves an old reconcile A can consume marker B.

Fresh audit adds a second layer: even a future generation-owned marker must define what "scheduler reconciliation completed" actually means.

## Worker start launches two scheduler paths concurrently

At service-worker module start current code independently starts:

- `reconcileUserSettingsImportMarker('worker-start')`;
- `initializeJournalBackupScheduler('worker-start')`.

The marker reconciler itself calls `initializeJournalBackupScheduler(reason)` before removing the marker.

Therefore worker startup can have at least two scheduler initializers live concurrently:

- S-old from the unconditional worker-start initialization;
- S-marker from settings-import reconciliation.

Each initializer obtains current status/settings through asynchronous reads, and current scheduler generation fencing is incomplete under P1-177/P0-074.

## Deterministic stale scheduler after successful marker cleanup

A schedule exists even if the marker has a future unique import id:

1. worker-start scheduler task S-A begins and observes settings/policy generation A;
2. before S-A finishes its Chrome alarm mutations, settings import B commits atomically with marker B;
3. marker reconciler B reads marker B and current policy B;
4. S-B initializes alarms according to B and returns success;
5. marker B is removed because reconciliation appears complete;
6. delayed S-A resumes and publishes/retains alarm state computed from older A;
7. durable settings remain B but durable Chrome alarm state can now reflect A;
8. marker B is already gone, so startup no longer has a durable import-specific obligation saying ancillary scheduler state still requires repair.

This is the same logical stale-scheduler authority already owned by P1-177/P0-074. The new import consequence is that marker cleanup must not certify ancillary state without a scheduler-generation receipt.

## Why serialized Chrome alarm mutations are not enough

Physical alarm mutation serialization prevents raw API create/clear calls from overtaking unpredictably inside one queue.

It does not make an older logically stale scheduler decision valid if it is admitted after/newer policy B has already become authoritative.

A stale scheduler task can serialize perfectly and still run **after** the correct B task, recreating the wrong alarm time/presence.

Therefore P1-008 cannot treat `initializeJournalBackupScheduler()` returning without error as sufficient proof unless that helper itself provides generation-aware convergence semantics.

## Required import/scheduler reconciliation receipt

Each settings import generation IB should bind or be able to derive a scheduler-policy generation covering at least:

- backup enabled/paused state;
- interval minutes;
- retry minutes;
- root/config generation relevant to scheduling;
- any current auth-availability/paused generation used by P1-177.

Marker reconciliation should only remove IB when it has an authoritative result equivalent to:

`current settings generation == IB-derived generation && scheduler/alarm state reconciled to that generation`.

If settings changed again to C, IB does not need to force old B policy back. It may consider itself superseded only through an explicit generation relation and ensure scheduler state converges to current C. An old task from A/B must not retain authority afterward.

## Scheduler helper contract

A generation-safe scheduler reconciler should:

1. capture/receive expected scheduler generation;
2. read current policy;
3. compute desired periodic/retry alarm state;
4. publish alarm mutations through actual-settlement tracking;
5. before declaring success, prove no newer policy generation superseded the decision;
6. if superseded, reconcile the newer current generation or return a non-terminal/superseded result rather than claiming the old generation applied.

The current worker-start direct initializer and marker-driven initializer can then safely coalesce onto one current-generation reconciliation instead of racing as independent semantic owners.

## Shared page writer composition

P1-157 remains essential.

A stale Options/Journal page can currently write shared settings after import B and create generation C without expected revision. Even a perfect marker B cannot make scheduler state permanently equal to B if another legitimate newer settings generation exists.

Therefore:

- all shared writers must produce/version settings generations;
- import marker owns B only;
- later C intentionally supersedes B and must trigger scheduler reconciliation C;
- stale page writes must conflict instead of silently becoming C when they were based on pre-B state.

## Outer response-loss semantics

On unknown actual import settlement, current code correctly avoids a second bundled write and returns pending semantics.

P1-210 should preserve that model in the UI:

- pending import -> reconcile marker/settings generation;
- do not tell the user to blindly re-import while the first `storage.set` is unresolved;
- after actual commit, UI status should distinguish `settings committed, ancillary scheduler reconciliation pending` from `fully reconciled`.

## Required deterministic regressions

1. S-A worker-start reads policy A -> import B commits -> S-B marker reconciliation applies B -> late S-A cannot overwrite B alarm state after marker cleanup.
2. Same schedule where S-A actual Chrome alarm mutation is already in progress: final state converges to B/current generation before marker B is considered complete.
3. A unique marker B is never removed by reconcile A; existing P1-008 generation regression remains mandatory.
4. B scheduler reconciliation succeeds, then intentional settings C commits: C supersedes B and triggers C reconciliation; B does not fight C.
5. Stale pre-B Options page attempts settings write after B: P1-157 expected-generation conflict prevents silent rollback/scheduler C based on stale fields.
6. Import B caller times out before `storage.set` settles: no second settings write; late B success retains marker until generation-safe scheduler reconciliation completes.
7. Worker dies after B settings commit but before scheduler convergence: startup sees marker B and eventually converges current scheduler state.
8. Worker-start may launch multiple logical reconciliation triggers, but they coalesce/fence by scheduler generation; older trigger cannot publish last merely because it settles last.
9. Disabled B policy plus stale enabled A task -> no periodic/retry alarm survives B reconciliation.
10. Interval B differs from A -> final alarm time uses current B (or intentional newer C), never stale A after marker removal.
11. Reconciliation failure leaves the exact owned marker/generation durable; it is not converted into successful cleanup.
12. Normal import with stable current generation commits settings once, reconciles scheduler once/coalesced, removes its exact marker, and returns truthful success.

## Duplicate check

No new item is created.

- P1-008 owns import marker generation/crash reconciliation.
- P1-177/P0-074 own scheduler/config generation authority.
- P1-157 owns shared settings write CAS/versioning.
- P1-210 owns unknown outer result/retry admission.

This checkpoint specifies the cross-component completion criterion: **marker reconciliation is complete only when ancillary scheduler state is generation-consistent, not merely when one asynchronous initializer returns.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.