# WebClip — P1-177 durable backup scheduler generation — 2026-09-23

Date: 2026-09-23  
Owner: P1-177  
Canonical baseline main: `6b818b8fea0ae541286cd8a124b6d333a5d0a93c`  
Baseline post-merge Repository Integrity: #1092 / run `35815117901` — SUCCESS  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

This is a bounded P1-177 implementation tranche. It does **not** claim full P1-177 closure.

It implements the early scheduler-admission layer that was still missing after the P1-196 auth-validity work:

```text
durable scheduler generation + mode
+ generation-bound alarm receipt
+ explicit Disconnect pause
+ explicit successful-auth resume generation
+ alarm callback admission recheck
+ second recheck immediately before entering backup pipeline
```

The later rule

```text
recheck scheduler generation immediately before every not-yet-started remote child
```

remains open inside the already-started backup pipeline and keeps P1-177 ACTIVE.

## 2. Fresh external comparison

Official Chrome Alarms documentation was rechecked on 2026-09-23:

- https://developer.chrome.com/docs/extensions/reference/api/alarms

The current documentation states that alarms can be delayed, and documents session persistence controls only for newer Chrome versions. It explicitly recommends checking/recreating important alarms whenever the service worker starts and suggests storing dynamic alarm intent elsewhere when needed.

That supports the existing P1-177 research conclusion:

```text
fixed alarm name / alarm existence != scheduler mutation authority
```

This tranche therefore retains the fixed periodic/retry alarm names as delivery channels but moves authority into a durable WebClip scheduler-generation record.

No external source is used to claim that the production implementation itself is correct; that conclusion must come from exact source + deterministic CI.

## 3. Durable control

Production introduces:

```text
JOURNAL_BACKUP_SCHEDULER_CONTROL_KEY
JOURNAL_BACKUP_SCHEDULER_CONTROL_VERSION = 1
```

The normalized control contains only bounded, non-secret authority metadata:

```text
generation
mode = active | paused-no-auth | paused-user | paused-unconfigured
authRecordId
authControlGeneration
accountUid
rootPath
periodicGeneration / periodicDueAt
retryGeneration / retryDueAt
```

It does **not** store accessToken, refreshToken, Authorization, signed transfer URL, or provider response bodies.

Scheduler generation is deliberately distinct from:

- P1-178 shared auth generation;
- P1-179 account/root namespace ownership;
- backup lease generation/token;
- exact remote-effect receipts.

The scheduler consumes existing auth/account/root proof but does not replace those owners.

## 4. Disconnect transition

The runtime command now composes:

```text
disconnectYandexAuthControl()
-> pauseJournalBackupSchedulerNoAuth('explicit-disconnect')
```

The scheduler pause:

1. advances scheduler generation;
2. sets mode `paused-no-auth`;
3. clears current periodic/retry generation receipts;
4. clears the fixed alarms;
5. does **not** delete `JOURNAL_BACKUP_PENDING_KEY` or rewrite already-started external-effect truth.

If an older alarm is delivered late, its receipt generation no longer matches.

## 5. Explicit auth resume / repair

Successful auth paths now invoke:

```text
initializeJournalBackupScheduler('auth-resume')
```

after:

- OAuth code exchange + exact auth-attempt commit + best-effort account enrichment;
- validated manual-token generation-CAS commit;
- successful explicit connection test/account enrichment.

An active scheduler proof consumes:

- current P1-196 auth usability;
- exact authRecordId;
- current shared auth-control generation;
- current account UID;
- current normalized root path.

If any required proof is unavailable, the scheduler stays paused/unconfigured rather than treating token presence alone as resume authority.

The auth-resume transition creates a new scheduler generation, so pre-disconnect alarm receipts cannot revive even after re-auth to the same account/root.

## 6. Alarm receipt

Scheduling now writes a durable relation before creating the Chrome alarm:

```text
periodic receipt -> periodicGeneration = current scheduler generation
retry receipt    -> retryGeneration = current scheduler generation
```

The fixed alarm name remains unchanged.

On delivery, `dispatchJournalBackupAlarm()`:

1. reads the durable scheduler control;
2. selects the receipt for periodic/retry;
3. proves current generation/mode/auth/account/root;
4. clears/skips stale or paused delivery;
5. only then calls `runDueJournalBackup(..., scheduledGeneration)`.

Thus:

```text
alarm delivery != mutation authority
```

## 7. Worker/startup repair

`initializeJournalBackupScheduler()` no longer treats mere alarm existence as sufficient.

For worker-start/startup it may use the lightweight path only when an existing periodic/retry alarm has a durable receipt equal to the current scheduler generation.

Otherwise fixed alarms are cleared and rebuilt from current control + due/retry state.

This matches the current Chrome recommendation to verify/recreate important alarms at service-worker startup instead of assuming persistence.

## 8. Callback-vs-Disconnect race

`runDueJournalBackup()` now accepts the scheduled generation and checks it twice:

1. immediately after the background operation begins;
2. again immediately before entering `exportJournalBackupToYandex(...)`.

If Disconnect/settings/auth replacement changes generation between those points:

```text
result = skipped
provider backup pipeline = not entered
ordinary backup failure bookkeeping = not written
ordinary retry churn = not created by that stale delivery
```

The pre-existing timestamp-based `staleRetryAlarm` success guard remains intact.

## 9. Important remaining boundary

This tranche stops at the backup-pipeline boundary.

Current `uploadJournalExportStagedToYandex(...)` still performs later external children such as signed upload without a P1-177 scheduler-generation ticket/recheck directly before that child.

Therefore this schedule is **not yet fully closed**:

```text
S active
alarm admitted
runDue final check passes
export pipeline begins
Disconnect -> S+1 paused
later not-yet-started signed upload child
```

The child must eventually prove that scheduler generation S is still current immediately before its physical admission, while already-started effects remain historical/reconcilable.

That is the next bounded P1-177 tranche.

## 10. Deterministic coverage

Updated:

`project_tools/test_p1_177_backup_pause_resume_generation_refinement_model.js`

New:

`project_tools/test_p1_177_backup_scheduler_generation_runtime.js`

The new production-source regression checks:

- durable control key/version;
- generation and mode representation;
- secret-free scheduler storage shape;
- auth/account/root proof consumption;
- receipt invalidation on generation advance;
- generation-bound periodic/retry scheduling;
- fixed-name alarm routing through dispatcher;
- worker/startup alarm reuse only under current receipt;
- two `runDue` generation checks;
- explicit Disconnect pause;
- explicit OAuth/manual/connection-test resume;
- preservation of pending backup checkpoint;
- absence of per-child check in signed-upload path as an explicit remaining gap;
- compact race schedules for Disconnect, reauth, user pause and callback-vs-pipeline transition.

No live provider call is made by the tests.

## 11. Identity impact

`service-worker.js` is a current package member, so current 34-file RPF and 33-file negative/control projection must advance.

This evidence does not guess those digests. Exact-head P1-231 source-generation authority must derive them.

No canonical Chrome/Yandex QA-contract or builder-contract input is intentionally changed in this tranche, so QCF/BCF changes are not claimed without exact authority output.

The new evidence/test files may affect full RCF according to the canonical full-RCF root projection; exact-head authority remains decisive.

## 12. Evidence boundary / non-actions

This tranche performs no:

- live Yandex request with user credentials;
- provider mutation;
- real Chrome/browser qualification;
- physical release receipt;
- product ZIP/build;
- manifest version bump;
- S2/release-policy activation;
- tag, deployment, GitHub Release, or release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## 13. Current decision

```text
Disconnect scheduler pause generation        = IMPLEMENTED
fixed alarm generation receipt               = IMPLEMENTED
worker/startup receipt validation            = IMPLEMENTED
successful auth resume generation            = IMPLEMENTED
alarm callback generation admission          = IMPLEMENTED
pre-backup-pipeline second generation check  = IMPLEMENTED
pending started-effect/checkpoint deletion   = FORBIDDEN / NOT DONE
per-later-child remote admission recheck     = REMAINING P1-177 GAP
P1-177 Registry status                       = ACTIVE
live provider qualification                  = NOT PERFORMED
manifest                                     = 0.9.8
release readiness                            = NOT READY
```
