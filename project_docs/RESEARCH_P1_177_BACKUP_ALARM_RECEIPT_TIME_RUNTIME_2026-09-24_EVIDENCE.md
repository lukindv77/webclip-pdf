# WebClip — P1-177 exact backup alarm receipt-time authority — 2026-09-24

Date: 2026-09-24  
Canonical baseline: `main = c5893a8d30664dd933853fe441632e71644cfa30`  
Baseline post-merge Repository Integrity: **#1106 / run 35942156373 / SUCCESS**  
Owner: **P1-177**  
Manifest/runtime version: **0.9.8**  
Release readiness: **NOT READY**  
Real Chrome/Yandex L5: **NOT RUN**  
P1-231 S2 activation: **NONE**  
New P-code: **NO**

## 1. Scope

PR #346 completed per-remote-child scheduler-generation admission inside an already-started background backup pipeline.

Closure review found one remaining scheduler-owned delivery race before the pipeline begins. Chrome alarm names are fixed delivery channels, while WebClip's durable authority is stored separately. Generation alone is insufficient to identify one exact scheduled delivery when the same generation reschedules the same fixed alarm name.

This tranche therefore binds alarm delivery to the exact durable pair:

```text
(scheduler generation, dueAt)
```

and prevents both late stale creation and stale-callback deletion from changing the current fixed-name alarm.

## 2. Current external platform semantics

Fresh official Chrome Alarms documentation was reviewed:

https://developer.chrome.com/docs/extensions/reference/api/alarms

Relevant platform facts:

- `Alarm.scheduledTime` is the epoch-millisecond time at which the alarm was scheduled to fire; actual delivery may occur later.
- creating another alarm with the same name cancels and replaces the existing alarm;
- important alarms should be checked when the extension service worker starts, especially on Chrome versions before the newer explicit persistence control.

These are Chrome semantics. The authority policy below is WebClip's own fail-closed design.

## 3. Root-cause race A — late stale create

Pre-tranche ordering:

```text
G active
schedule old due=T1
durable receipt <- (G,T1)
old create waits behind an alarm mutation
same generation reschedules due=T2
durable receipt <- (G,T2)
new alarm may be created for T2
old queued create eventually runs
chrome.alarms.create(fixedName,{when:T1})
=> Chrome replaces the T2 alarm with stale T1
```

A generation-only receipt does not reject this because both decisions belong to G.

A generation transition creates the analogous race with `G -> G+1` if the old create reaches Chrome after the transition.

## 4. Root-cause race B — stale callback clears newer alarm

A stale `onAlarm` callback may execute after another schedule already replaced the fixed-name alarm.

Unconditional:

```text
chrome.alarms.clear(fixedName)
```

inside the stale callback can then delete the newer current alarm.

The callback therefore cannot clear by name alone.

## 5. Runtime design

### 5.1 Exact due-time normalization

Scheduler control already stores:

- `periodicGeneration`
- `periodicDueAt`
- `retryGeneration`
- `retryDueAt`

This tranche makes `dueAt` part of admission authority rather than diagnostic state and normalizes it through one bounded integer helper.

### 5.2 Create-time recheck inside the serialized alarm mutation

`scheduleJournalBackupAlarm(...)` still records the durable receipt before requesting the Chrome alarm.

Immediately before `chrome.alarms.create()`, and **inside** the per-alarm serialized mutation, it re-reads scheduler control and requires:

```text
mode == active
current generation == prepared generation
receipt generation == prepared generation
receipt dueAt == prepared dueAt
```

If any axis changed, the stale queued schedule does not call Chrome.

This composes with the existing actual-settlement alarm mutation queue: once a Chrome alarm mutation has physically started, later same-name mutations cannot overtake its actual promise settlement.

### 5.3 Startup reuse requires exact scheduledTime

Worker/startup reuse now requires:

```text
alarm exists
AND receipt generation == current scheduler generation
AND alarm.scheduledTime == receipt dueAt
```

Existence plus generation is no longer sufficient.

### 5.4 Dispatch requires exact scheduledTime

Alarm dispatch reads the current durable receipt and requires the delivered `alarm.scheduledTime` to equal its `dueAt`.

A mismatched delivery is a successful stale-delivery veto and cannot enter `runDueJournalBackup(...)`.

### 5.5 Compare-before-clear for stale callbacks

A stale callback does not clear the fixed name unconditionally.

Inside the same per-alarm serialized mutation WebClip:

1. reads the currently installed Chrome alarm;
2. refuses to clear if its `scheduledTime` differs from the stale delivered event;
3. re-reads durable scheduler control;
4. refuses to clear if the installed alarm now matches the current active receipt;
5. clears only when the installed alarm is still the stale delivery and has no current authority.

Therefore an old callback cannot erase a newer same-name alarm.

## 6. Authority composition

This tranche does not create a new owner.

- **P1-177** owns scheduler mode/generation and exact scheduled-delivery admission.
- **P1-178** remains auth/settings generation owner.
- **P1-179** remains account/root namespace owner.
- **P1-076 / P1-184 / P1-210** remain already-started / unknown external-effect settlement owners.

The alarm receipt contains no OAuth token, signed URL, or provider secret.

## 7. Deterministic coverage

Updated:

- `project_tools/test_p1_177_backup_scheduler_generation_runtime.js`
- `project_tools/test_p1_177_backup_pause_resume_generation_refinement_model.js`

Coverage now includes:

- exact generation + due-time durable receipt;
- same-generation due-time supersession;
- old-generation late-create veto;
- startup exact `scheduledTime` match;
- dispatch exact `scheduledTime` match;
- stale delivery classification;
- stale callback preservation of a newer same-name alarm;
- current receipt alarm preservation;
- still-stale alarm cleanup;
- all previously implemented Disconnect/re-auth, pre-pipeline, per-child and started-effect invariants.

Deterministic tests make no live browser or provider mutation.

## 8. Identity impact

Baseline before this tranche:

- current 34-file RPF: `sha256:861caa46903cebd38aac4650f0962743a83719b94fb724a6426596ac091f4b32`
- current 33-file negative/control projection: `sha256:11cae4f79e83e3771927227e1a249f2fa29c3cd753c07e72ed22f649dc6ad036`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:a099e052fdd75038f40a8895d2f91a8e63cefc545387d9ddebef8b783eb90b07`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

Because `service-worker.js` changes, exact-head P1-231 authority must derive the new current RPF and 33-file control value. They are intentionally not guessed here. Historical evidence remains unchanged.

No QA-contract or builder-contract input is intentionally changed, so no QCF/BCF change is claimed without exact authority evidence.

## 9. Status boundary

P1-177 remains **ACTIVE** through this tranche. Exact-head CI and another current-source closure review are required before any owner-status transition is considered.

No real Chrome qualification, live Yandex provider request, provider mutation, physical release receipt, product ZIP/build, manifest version bump, S2 activation, tag, deploy, GitHub Release, or release decision is performed.
