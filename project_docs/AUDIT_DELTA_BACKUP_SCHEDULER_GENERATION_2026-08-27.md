# Audit delta — Journal backup scheduler/settings generation fencing — 2026-08-27

Source-of-truth `main` immediately before this write: `e6cf3e7c8981d4f372fd142a91713b3b1d0f4079`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines:

- **P1-177** — backup scheduler must enter a real paused/no-auth/disabled state and not keep/resurrect obsolete alarms;
- **P0-074** — long Yandex/config-dependent operations must not publish scheduling/verification decisions from stale settings generations.

Adjacent: **P1-196** for authoritative invalid-token demotion and **P1-178** for auth generation. The finding below reproduces without OAuth failure: ordinary Settings disable/interval change while a backup is already running is sufficient.

## Positive control — settings change normally rebuilds alarms

`saveJournalBackupSettings(settings)` serially updates `yandexConfig` and then calls:

`initializeJournalBackupScheduler('settings-change')`.

For non-worker-start initialization, the scheduler clears both periodic and retry alarms before applying current settings. If current `status.enabled` is false, it returns without scheduling new work.

That is the correct immediate reaction to a settings change.

The defect is that an older in-flight backup can publish a later scheduling mutation from its stale status snapshot after this cleanup has already completed.

## Fresh source proof

### 1. Backup operation snapshots status before long work

`exportJournalBackupToYandex()` acquires its lease and then assigns current backup status to local `status`.

That status contains at least current:

- enabled policy;
- interval/retry minutes;
- root/config state;
- last success/failure/attempt state.

The operation can then perform recovery, full Journal staging, folder work, signed upload, metadata verification and durable success/failure commits before terminal housekeeping.

No immutable backup-settings generation is captured and no final current-policy compare is performed before alarm scheduling.

### 2. Success housekeeping trusts the old `status.enabled`

After a newly uploaded or recovered backup is durably recorded as success, the flow calls:

`finalizeJournalBackupSuccessHousekeeping({ successAt, status, operationId })`.

That helper:

1. clears the pending checkpoint;
2. clears retry alarm;
3. if `status?.enabled`, calls `scheduleNextPeriodicBackup(successAt, status.intervalMinutes)`.

`status` is the old operation snapshot, not a fresh read performed after the long operation settled.

### 3. Failure path has the same stale scheduling authority

In the catch path, after recording failure state, current code checks:

`if (status?.enabled && isBackground && error?.code !== 'JOURNAL_BACKUP_BUSY')`

and then calls:

`scheduleBackupRetry(failureAt, status.retryMinutes)`.

Again the decision and retry interval come from the stale operation-local status snapshot.

### 4. Disable race can resurrect an alarm after Settings cleared it

Deterministic schedule:

1. automatic backup A starts while policy generation G1 has `enabled=true`;
2. A snapshots `status.enabled=true` and old interval/retry values;
3. user opens Settings and disables automatic backup, committing generation G2 with `enabled=false`;
4. `initializeJournalBackupScheduler('settings-change')` clears periodic + retry alarms and returns disabled;
5. A settles later;
6. success path sees stale G1 `status.enabled=true` and creates a new periodic alarm, or failure path creates a retry alarm;
7. persistent Chrome alarm state now contradicts current disabled settings G2.

Serialized alarm mutation prevents physical create/clear overtaking for one alarm name, but it cannot make the later stale G1 create logically valid. The stale create occurs **after** the correct G2 clear.

### 5. Interval/retry changes have the same generation problem

The user need not disable backup.

If G1 has interval/retry values I1/R1 and Settings commits newer G2 values I2/R2 while A is active, late A success/failure can schedule using I1/R1.

The next alarm handler re-reads current status and may self-correct some cases, but until that wake the durable alarm time does not represent current user policy. It can wake far too early or too late.

A scheduler contract should not rely on a stale alarm firing later in order to repair itself.

### 6. `worker-start` disabled fast path does not clean stale alarms

`initializeJournalBackupScheduler('worker-start')` begins with current status and, when `!status.enabled`, returns immediately with `{ enabled:false, lightweight:true }`.

It does not inspect/clear periodic or retry alarms in that disabled fast path.

Therefore if an older in-flight completion recreated an alarm after Settings disabled backup, a later worker restart does not proactively reconcile the contradiction. The stale one-shot alarm can remain until its scheduled wake, at which point `runDueJournalBackup()` notices disabled state and skips.

This is bounded rather than an infinite retry storm in the ordinary Settings-disable case, but it violates the explicit disabled scheduler state and causes avoidable future background wake/activity.

P1-177's disconnect case is stronger because disconnect currently leaves enabled preferences and can repeatedly feed retry policy. The same fix primitive should handle both cases.

### 7. `runDueJournalBackup()` current-status check is a useful defense, not sufficient ownership

The alarm handler itself fresh-reads `getJournalBackupStatus()` and skips when disabled or root is unavailable. This prevents a resurrected stale alarm from blindly performing a full backup under disabled policy.

That is a positive control.

However it does not justify creating stale durable alarms:

- disabled means no background backup scheduling should remain active;
- stale interval can trigger unnecessary early wake;
- stale retry alarm can remain after the error condition/policy was superseded;
- relying on future alarm delivery for cleanup complicates P1-177 no-auth pause and MV3 lifecycle behavior.

## Required scheduler-generation contract

### Immutable settings/policy generation

Every backup settings/config mutation relevant to scheduling should advance an immutable generation/receipt covering at least:

- enabled/paused policy;
- interval minutes;
- retry minutes;
- relevant root/config generation;
- auth-availability generation where scheduler admission depends on it.

A long backup operation may retain the generation it was admitted under for diagnostics and physical side-effect reconciliation, but that historical generation does not own future scheduling after current policy changes.

### Terminal result vs future schedule are separate authorities

An old operation may legitimately settle after policy changes. Its remote/local outcome still needs to be recorded/reconciled under its own operation receipt.

But **after** terminal success/failure is known, any creation/clearing of future periodic/retry alarms must use a fresh current scheduler-policy receipt.

Do not infer current scheduling authority from the operation's original `status.enabled` or interval values.

### Compare-and-schedule current generation

Before creating a periodic/retry alarm:

1. fresh-read current scheduler policy/generation;
2. prove it is still enabled and otherwise eligible;
3. compute time from current interval/retry policy;
4. commit the alarm mutation associated with that expected scheduler generation;
5. if generation changed while scheduling, re-evaluate current policy rather than publishing the stale alarm.

Exact implementation may use a serialized current-policy helper, generation marker, or idempotent reconciler. The important invariant is logical generation ownership, not only physical alarm serialization.

### Disabled/no-auth reconciliation

When current scheduler state is disabled or explicitly paused/no-auth:

- periodic and retry alarms must converge to absent;
- `worker-start` should be able to repair unexpected stale alarms without starting heavy backup work;
- explicit Disconnect P1-177 should pause/clear alarms while preserving user interval/enabled preference for later reauth;
- a late physical backup/upload settlement is still reconciled and logged, but cannot re-enable scheduling.

### Alarm payload/state generation

Chrome alarm names are currently stable singleton names. If the design keeps them, the worker must compare current scheduler generation on alarm admission.

Optionally store expected scheduler generation in durable scheduler state accompanying the singleton alarm. Stale alarm delivery then becomes an explicit no-op/repair event rather than being inferred only from timestamps.

## Deterministic regression matrix

1. G1 enabled backup starts -> G2 disables and clears alarms -> late G1 success creates **no** new periodic alarm.
2. Same schedule with G1 failure -> no retry alarm under disabled G2.
3. G1 interval=1 min -> G2 interval=1 day during active backup -> late G1 success schedules according to G2, not G1.
4. G1 retry=1 min -> G2 retry=6 h -> late G1 failure cannot publish 1-minute retry.
5. Settings disable happens between final success-state commit and housekeeping -> housekeeping fresh-checks G2 and leaves scheduler disabled.
6. Settings change happens during alarm create actual settlement -> expected-generation reconciliation produces state matching newest policy.
7. Unexpected stale periodic/retry alarm exists while current settings disabled -> worker-start lightweight reconciliation clears it without heavy backup.
8. Stale alarm delivery after disable remains harmless and does not write a false failure/retry loop.
9. Disconnect while backup active -> old signed transfer may settle/reconcile, but current scheduler remains paused/no-auth and no old completion resurrects alarms.
10. Reauth after paused state -> current generation intentionally rebuilds scheduler exactly once using current preferences.
11. Root/config generation changes while old backup settles -> old operation result remains historical, while future alarm scheduling uses current root/config policy.
12. Two extension pages rapidly save backup settings -> actual alarm state converges to the latest committed settings generation.

## Duplicate check / numbering

No new P-number is created.

- **P1-177** remains primary scheduler pause/disable/no-auth owner.
- **P0-074** supplies generation consistency for config-dependent long operations and their post-operation publication decisions.
- **P1-196/P1-178** remain auth demotion/auth-generation dependencies.

The finding is not P1-173: the issue is not merely a queued Chrome API call waiting too long. It is a logically stale operation publishing future scheduler state after a newer policy mutation already won.

## Test / release state

No runtime/config/manifest files were changed. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.