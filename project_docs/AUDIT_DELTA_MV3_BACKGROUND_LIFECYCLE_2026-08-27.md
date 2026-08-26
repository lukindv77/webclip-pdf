# Audit delta — MV3 background lifecycle ownership / crash-safe wake scheduling

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `912210a6d9b68c1e415026af0f3d6c4ed4098d65`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P1-192 OPEN** and provides a concrete crash-safe scheduling acceptance. Existing stage deadlines/lease work remains useful but does not solve worker lifetime by itself.

## Alarm callback still does not own long async work

Current `chrome.alarms.onAlarm` invokes background work as fire-and-forget promises:

- `runDueJournalBackup('periodic-alarm', false).catch(...)`;
- `runDueJournalBackup('retry-alarm', true).catch(...)`;
- `runLoggedOperationLogCleanup('alarm').catch(...)`.

The listener returns immediately. There is no explicit lifecycle owner around the full async operation.

## Strong backup schedule-loss sequence

The periodic Journal backup alarm is created as a one-shot `{ when }`, not `periodInMinutes`.

`runDueJournalBackup()` reaches `exportJournalBackupToYandex()`, which:

1. obtains the backup lease;
2. may reconcile a pending upload;
3. otherwise runs `stageFullJournalExport()`;
4. only after the snapshot renews the lease and starts network/offscreen upload;
5. schedules the next periodic alarm after success, or schedules retry in the error path for background failures;
6. releases the lease in `finally`.

`stageFullJournalExport()` has a five-minute overall build deadline and performs primarily IndexedDB/JSON staging work before the later offscreen/network heartbeat phase.

If MV3 terminates the worker during that pure-IDB window:

- the one-shot periodic alarm that woke the worker has already been consumed;
- success path never schedules the next periodic alarm;
- catch path never schedules a retry alarm;
- finally never releases the lease;
- the durable lease will eventually expire, but **lease expiry is not itself a Chrome wake source**.

The only recovery is a future unrelated worker wake followed by scheduler self-heal. That is not a guaranteed background schedule.

## Required P1-192 crash-safe scheduling refinement

Before entering a potentially >30 s background phase, pre-arm a durable wake/watchdog that survives worker death.

One safe model:

1. acquire durable operation/lease state;
2. arm a recovery alarm for a time compatible with the stage/lease maximum before heavy pure-IDB work begins;
3. run the bounded operation under an explicit lifecycle owner if supported/appropriate;
4. on verified success, atomically/serialized clear or supersede the watchdog and schedule the next periodic alarm;
5. on handled failure, replace watchdog with normal retry schedule;
6. after worker crash, watchdog wakes a new worker, which sees expired/abandoned lease/checkpoint and reconciles before retrying.

The exact implementation may use a dedicated watchdog alarm or reuse a generation-tagged retry alarm, but it must not create overlapping backups or allow an old late `alarm.clear()` to delete a newer schedule; existing serialized alarm mutation rules remain required.

## Lifecycle owner requirement remains separate from wake scheduling

A watchdog prevents indefinite schedule loss, but does not make a five-minute pure-IDB snapshot finish in one worker lifetime. P1-192 therefore still needs one of:

- move the heavy snapshot/serialization phase into an appropriate durable/offscreen execution context; or
- use an explicit bounded keepalive/lifecycle mechanism for the actual operation, releasing it only when the real promise settles.

Do not use lifecycle ownership to hide infinite hangs: current 5-minute export budget, per-IDB transaction deadlines and transfer deadlines remain mandatory.

## Maintenance comparison

OperationLog/background maintenance uses a recurring hourly alarm (`periodInMinutes:60`). If a maintenance pass is killed, the durable periodic schedule generally remains, so the **schedule-loss** failure is weaker than for one-shot backup.

However `runLoggedOperationLogCleanup()` also performs pure IndexedDB work, stats repair and recovery phases. Without a lifecycle owner, a deterministic >30 s maintenance workload can be interrupted every hour at roughly the same point and never make forward progress. Acceptance must therefore test resumability/progress across forced worker termination, not only existence of the next alarm.

## Lease/checkpoint semantics

A lease/checkpoint is recovery data, not a lifetime owner and not a wake source. Tests must not treat "lease exists" as proof the operation will resume automatically.

Crash recovery must also preserve:

- P1-052 prepared-backup unknown settlement;
- P0-073/P0-074 account/root/auth generation;
- P1-179 backup namespace identity;
- P1-194 truthful durability class;
- P0-078 publication policy generation.

## Test matrix

1. Forced worker termination during `stageFullJournalExport()` after one-shot periodic alarm fired but before next alarm scheduling -> a pre-armed durable wake remains and recovery runs.
2. Forced termination after lease acquisition -> stale lease does not permanently block future backup.
3. Forced termination after remote transfer started -> recovery reconciles checkpoint/outcome, does not blind-retry unknown side effect.
4. Successful backup clears/supersedes watchdog and leaves exactly one correct future periodic schedule.
5. Old watchdog/retry generation cannot clear a newer alarm after late settlement.
6. Repeated >30 s maintenance workload either finishes under lifecycle ownership or makes durable resumable progress across hourly wakes.

## Duplicate check

- P1-077 owns use of durable alarm boundary instead of launching heavy work from ordinary runtime message/startup.
- P1-192 owns lifetime of the operation **after that alarm actually fires**.
- P1-075/P1-076/P1-053 own bounded stages/lease/snapshot correctness.
- P1-118 owns late-settlement ordering of alarm create/clear.
- No P1-197 assigned.
