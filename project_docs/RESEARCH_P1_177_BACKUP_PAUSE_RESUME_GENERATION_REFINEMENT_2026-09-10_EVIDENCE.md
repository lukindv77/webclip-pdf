# WebClip — P1-177 backup pause/resume generation refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 0e58f326a19f22611f3ddcb65e13bcf2cbd48670`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-177**. It does not treat the historical 2026-09-07 branch as current implementation. Instead it compares that scheduler-control contract with canonical source after #206–#210 and refines the remaining disconnect/re-auth race boundary.

No production source is changed.

## 1. Canonical owner split

Current Registry authority:

```text
P0-073  remote-save completion/recovery is immutable account/root scoped
P0-074  one immutable auth/account/root/config/publication operation context + generation
P1-076  backup lease expiry is not cancellation evidence
P1-138  read-like Yandex paths cannot hide mutation/provisioning authority
P1-177  disconnect/re-auth + backup scheduler need explicit no-auth/paused/resume generation semantics
P1-178  OAuth attempt/settings generation owns auth replacement ordering
P1-179  backup durable state owns immutable account/root namespace identity
P1-184  unknown upload adoption needs exact object/content proof
P1-210  unknown/late external side-effect settlement remains explicit
```

The split is intentionally strict:

```text
P1-177 answers: may this scheduler generation admit new backup work now?
P1-179 answers: which account/root namespace owns durable backup state?
P1-178 answers: which auth attempt/settings generation became current?
P1-076/P1-184/P1-210 answer: what happened to already-started external work?
```

P1-177 must consume proven auth and namespace authority. It must not invent a competing account/root or auth-generation mechanism.

## 2. Historical provenance retained

The immutable historical P1-177 branch at commit `8a1000fa36d04a7739af35e1086bc674a939bc58` already identified the core defect:

```text
Disconnect clears auth without explicit scheduler pause generation
no-auth background run becomes ordinary failure/retry churn
fixed retry/periodic alarms have no generation authority
successful re-auth needs an explicit new scheduler generation
already-issued signed effects survive disconnect and reconcile separately
```

Those statements are provenance. Current acceptance is derived from current `main`.

## 3. Current-main absorption review

### 3.1 Explicit Disconnect still has no scheduler transition

Current `WEBCLIP_YANDEX_DISCONNECT` performs:

```text
writeYandexAuth(null)
remove yandexOAuthPending
return current Yandex status
```

It does not visibly write `paused-no-auth`, advance a backup scheduler generation, or bind any scheduled work receipt to a new generation.

This is the same semantic gap as the historical tranche.

### 3.2 Due admission still checks enabled/root, not auth/pause generation

Current `runDueJournalBackup(...)` reads `getJournalBackupStatus()` and initially skips only when:

```text
!status.enabled || !status.rootPath
```

There is no explicit `paused-no-auth`/scheduler-generation admission check in this entry path.

Therefore auth absence remains discoverable only deeper in the Yandex/export path rather than being a scheduler control state.

### 3.3 No-auth can still become ordinary failure + retry

Current background backup failure bookkeeping writes:

```text
lastFailureAt
lastBackgroundFailureAt
lastBackgroundError
```

and, while backup remains enabled and the error is not `JOURNAL_BACKUP_BUSY`, schedules `scheduleBackupRetry(...)`.

There is no dedicated no-auth exception at that catch boundary.

Thus the current-shaped sequence remains:

```text
explicit Disconnect
-> auth absent, backup enabled/root retained
-> periodic/retry callback runs
-> deep auth failure
-> ordinary failure timestamps
-> retry alarm
```

Missing auth after explicit Disconnect is scheduler pause truth, not backup failure truth.

### 3.4 Fixed alarm names still carry no generation

Current alarm names are fixed:

```text
webclip-journal-backup
webclip-journal-backup-retry
```

The alarm listener dispatches them directly to:

```text
runDueJournalBackup('periodic-alarm', false)
runDueJournalBackup('retry-alarm', true)
```

No scheduler generation is encoded in the name and no durable scheduled-generation receipt is visibly compared by the listener/due path.

Fixed names are not inherently wrong. They are insufficient without a separately durable generation receipt or equivalent admission token.

### 3.5 Re-auth does not explicitly resume the scheduler

Current successful OAuth and manual-token paths write usable auth and return Yandex status.

Canonical source invokes `initializeJournalBackupScheduler(...)` on install/startup/worker-start and on backup settings/root changes, but not as an explicit successful auth-resume generation transition.

So successful auth replacement does not itself establish:

```text
old scheduler generation retired
new proven auth/context consumed
new scheduler generation active
```

A later worker/alarm/settings event can encounter the newly available auth without an explicit resume boundary.

### 3.6 Positive controls already present

The refinement must preserve these current protections:

```text
Chrome Storage mutations are serialized
Chrome alarm mutations are serialized
non-worker-start scheduler initialization clears periodic + retry alarms before rescheduling
retry alarm is skipped when a newer backup success already resolved the failure (`staleRetryAlarm`)
backup lease remains exclusive/token-owned
pending/verified backup checkpoint survives until its own settlement housekeeping
```

The missing property is disconnect/re-auth scheduler-generation authority, not total absence of ordering controls.

## 4. Scheduler generation is distinct from namespace generation

After canonical #210, P1-179 requires immutable account/root namespace identity for backup lease/checkpoint/state.

P1-177 adds a different axis:

```text
BackupSchedulerControl {
  schema: 1,
  generation: S,
  mode: active | paused-no-auth | paused-user,
  activeNamespace: <P1-179 identity when active>,
  scheduledGeneration: S
}
```

Exact storage shape is implementation detail.

Semantics:

```text
namespace identity = where durable remote state belongs
scheduler generation = whether a particular scheduling decision may still admit new work
```

Do not collapse these into one field. A namespace may stay A/R1 while scheduler generation changes from S to S+1 because the user disconnected.

## 5. Explicit Disconnect transition

Disconnect must revoke **future scheduler admission**, not rewrite historical effect truth.

Target logical outcome:

```text
auth becomes absent
scheduler generation advances
mode = paused-no-auth
new backup mutation admission = forbidden
existing pending/external-effect receipts = preserved
```

The current auth secret lives in session storage while scheduler/config state is durable storage/alarm state, so one atomic cross-storage transaction cannot be assumed.

Required fail-closed composition:

1. auth absence is always an immediate veto on new backup mutation admission;
2. Disconnect completion also establishes/repairs a newer paused scheduler generation;
3. if durable scheduler-control persistence fails after auth removal, the system remains disconnected and must not reinterpret that failure as permission to run;
4. worker/startup repair may materialize `paused-no-auth` from authoritative auth absence without fabricating a backup failure;
5. later resume must create another new scheduler generation, so pre-disconnect scheduled receipts cannot revive.

A storage/control-plane failure during Disconnect must be reported truthfully; it cannot restore removed auth merely to make scheduler bookkeeping look atomic.

## 6. Successful re-auth / resume transition

Successful auth storage alone is not scheduler resume authority.

Resume requires:

```text
proven current auth generation (P1-178 / existing auth authority)
+ proven semantic account/root namespace (P1-179 / P0-073/P0-074)
+ explicit scheduler transition
```

Then:

```text
generation := generation + 1
mode := active
activeNamespace := proven current namespace
scheduledGeneration := new generation
```

Old periodic/retry decisions remain stale even if the user re-authenticates to the same semantic account/root.

Credential rotation can preserve namespace identity while still creating a new scheduler generation. These are independent concepts.

## 7. Alarm receipt and callback authority

Every scheduled periodic/retry decision needs a durable relation to scheduler generation.

Either is acceptable in principle:

```text
generation encoded into an alarm name
```

or:

```text
fixed alarm name + durable scheduled receipt { kind, schedulerGeneration, dueAt }
```

The important rule is not the representation:

```text
alarm delivery != mutation authority
```

On callback:

```text
load current scheduler control
compare scheduled generation
check active mode
check current auth proof
check current P1-179 namespace proof
only then continue toward backup admission
```

Stale/paused outcomes:

```text
zero new Yandex mutation
zero ordinary failure timestamp
zero error-retry churn
```

## 8. Critical callback-vs-Disconnect race

A check only at alarm callback entry is insufficient.

Schedule:

```text
T0 alarm S delivered
T1 callback reads control: S active
T2 callback performs local/Journal preparation
T3 user Disconnects -> generation S+1 paused-no-auth
T4 callback is about to start a new remote child effect
```

At T4, the old callback must not rely on the T1 decision.

Required rule:

```text
scheduler generation/mode must be revalidated immediately before each not-yet-started remote mutation admission
```

This composes with P0-074/P1-138 effect admission. The mutation intent/receipt should carry the scheduler generation that authorized it.

If generation changed before physical effect start:

```text
skip as stale/paused
no provider mutation
no ordinary backup failure
```

## 9. Already-started effect is different

Schedule:

```text
T0 generation S active
T1 exact remote child effect is admitted under S + namespace A/R1
T2 physical signed request starts
T3 user Disconnects -> S+1 paused-no-auth
T4 signed request may succeed, fail, or remain unknown
```

Disconnect cannot prove cancellation.

Required:

```text
no new effect admission after S is stale
BUT already-started effect keeps its immutable operation/namespace/effect receipt
AND later reconciliation remains allowed under P1-076/P1-179/P1-184/P1-210
```

Scheduler pause controls future work. It does not falsify physical history.

## 10. Multi-stage remote pipeline rule

A backup pipeline can contain several external children: provisioning, metadata/signed-URL acquisition, signed upload, verification/publication-like settlement.

Generation S must not become blanket authority for all later children merely because the pipeline began while S was active.

For every child that has not physically started:

```text
fresh scheduler-generation check
+ operation-context check
+ namespace check
+ effect-specific admission
```

If Disconnect occurs between children, already-started child reconciliation may continue, but a later not-yet-started mutation child is blocked until a new active scheduler generation explicitly admits fresh work.

## 11. No-auth pause is not failure state

When current auth is absent because of explicit disconnect or equivalent authoritative no-auth state:

```text
lastFailureAt delta = 0
lastBackgroundFailureAt delta = 0
lastBackgroundError = unchanged for backup execution truth
ordinary retry alarm = not created because of no-auth
```

UI/status may expose paused/no-auth separately.

A pause/control problem must not overwrite the last real backup execution error.

## 12. Existing stale-retry success guard remains

Current `staleRetryAlarm` behavior is a useful positive control:

```text
retry alarm queued
newer success exists
old retry callback arrives
-> skip extra backup
```

P1-177 extends this concept across control-generation transitions:

```text
retry alarm scheduled under S
Disconnect/resume creates S+1/S+2
old S callback arrives
-> stale even if timestamps alone would otherwise look due
```

Timestamp freshness is not scheduler-generation authority.

## 13. User disable / enable composition

Backup settings already clear/reschedule alarms. A future explicit scheduler controller may model disabled policy as `paused-user` or an equivalent non-active state.

Required property:

```text
disable/enable transition invalidates old scheduled authority
```

Enabling backup under a current proven auth/namespace creates or consumes a current active generation. It must not revive an old pre-disable retry callback.

This does not change product policy; it makes existing enabled/disabled semantics race-safe.

## 14. Worker-start repair

Current worker-start logic treats presence of either fixed periodic/retry alarm as sufficient to avoid reconstruction.

With generation semantics, alarm existence alone cannot prove current scheduling authority.

Worker-start target:

```text
read auth/control/namespace
validate any durable scheduled receipt against current generation
remove/replace stale alarms or receipts
if no auth => paused-no-auth, no remote run
if active exact context => reconstruct only current-generation scheduling
```

Worker restart must not silently convert a stale alarm into fresh authority.

## 15. P1-179 composition after #210

P1-179 refinement established that scheduler success/failure state must be namespace-local.

P1-177 adds generation-local admission to that namespace-local state.

Conceptually:

```text
state namespace = A/R1
scheduler generation = S
```

A success/failure settlement belongs to its physical operation/namespace even if current scheduler is S+1 paused. It may update historical factual settlement, but it cannot authorize a new S+1/S+2 backup run.

Conversely, active S+2 in B/R2 cannot consume A/R1 pending effect truth.

## 16. Re-auth to same vs different namespace

Same semantic namespace:

```text
old scheduler S / A/R1
Disconnect -> S+1 paused
re-auth proven A/R1
resume -> S+2 active A/R1
old S alarms stale
old pending effect reconciles separately
new work uses S+2
```

Different namespace:

```text
old S / A/R1
Disconnect -> S+1 paused
re-auth proven B/R2
resume -> S+2 active B/R2
old A/R1 alarms stale
old A/R1 pending effect remains historical/foreign under P1-179
new B/R2 work cannot consume/retarget it
```

## 17. Deterministic race matrix

The companion model covers at minimum:

```text
N01 current-shaped no-auth becomes ordinary failure/retry (gap proof)
N02 Disconnect advances scheduler generation and pauses
N03 paused-no-auth alarm makes zero remote call
N04 paused-no-auth alarm makes zero failure bookkeeping
N05 old periodic alarm is stale after Disconnect
N06 old retry alarm is stale after Disconnect
N07 successful resume advances generation again
N08 old pre-disconnect alarm stays stale after same-namespace resume
N09 old pre-disconnect alarm stays stale after different-namespace resume
N10 resume requires proven auth
N11 resume requires proven namespace
N12 alarm delivery alone is not mutation authority
N13 callback accepted at T1 but Disconnect before mutation blocks T4 child
N14 effect started before Disconnect remains reconcilable
N15 started effect is not marked cancelled by pause
N16 later not-started child after Disconnect is blocked
N17 stale callback does not write lastFailureAt
N18 stale callback does not schedule ordinary retry
N19 no-auth callback does not write lastFailureAt
N20 no-auth callback does not schedule ordinary retry
N21 current staleRetryAlarm success guard remains positive control
N22 fixed alarm name is acceptable only with durable generation receipt
N23 worker-start alarm existence does not prove generation authority
N24 same-account credential rotation can keep namespace but needs new scheduler generation
N25 different namespace resume cannot retarget old pending work
N26 namespace identity and scheduler generation remain distinct
N27 P1-179 namespace-local settlement does not grant scheduler admission
N28 P1-076 lease expiry remains not-cancellation evidence
N29 pending checkpoint survives scheduler pause
N30 user disable invalidates old scheduled generation
N31 re-enable does not revive old retry callback
N32 manifest stays 0.9.8
N33 no runtime/L5/S2/release action
```

## 18. Acceptance contract

P1-177 refinement research is complete when deterministic evidence proves:

1. current Disconnect still lacks explicit scheduler pause/generation transition;
2. current due path still lacks scheduler auth/pause-generation admission;
3. current no-auth failure path can still manufacture ordinary failure/retry truth;
4. successful auth replacement is not itself an explicit scheduler resume transition;
5. current stale-retry-after-newer-success behavior is preserved as a positive control;
6. scheduler generation is distinct from P1-179 namespace identity and P1-178 auth-attempt generation;
7. Disconnect revokes future scheduler admission without claiming cancellation of already-started effects;
8. stale/paused callbacks cause zero new remote mutation and zero ordinary failure/retry churn;
9. generation/mode is revalidated immediately before every not-yet-started remote mutation child, not just at callback entry;
10. already-started signed effects remain exact historical reconciliation work;
11. resume consumes proven auth + namespace and creates a new scheduler generation;
12. worker-start cannot infer authority merely from a fixed alarm's existence;
13. no new P-code is allocated;
14. runtime remains unchanged;
15. no real Chrome/Yandex L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 19. Boundary statement

```text
P1-177 generation refinement != runtime implementation
runtime implementation != real provider qualification
real provider qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
