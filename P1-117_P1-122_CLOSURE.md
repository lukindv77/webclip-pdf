# P1-117…P1-122 closure — Chrome Storage / alarms late-settlement integrity

Status: **REGRESSION** for P1-117, P1-118, P1-119, P1-120, P1-121 and P1-122.

## P1-117 — durable backup checkpoint/state mutations

- `webclipJournalBackupPendingUpload` set/remove operations use a serialized per-key Chrome Storage mutation queue with a 10-second local deadline.
- A local timeout does not release the queue turn; release happens only when the underlying non-cancellable Chrome Storage promise actually settles.
- `journalBackupState` uses a fresh read-modify-write **inside** the serialized queue turn, so a queued update observes the real settlement of every older write.
- Recovered success, fresh success and failure state updates all use the same helper.
- Recovery checkpoint reads are bounded; prepared/verified/404/remove transitions all use the serialized checkpoint helper.
- Verified-success housekeeping removes the checkpoint through the same settlement-aware storage queue.

Result: a late stale `storage.set/remove` cannot overtake a newer backup mutation and resurrect a checkpoint or overwrite a newer state after the caller already observed a timeout.

## P1-118 — serialized/bounded alarm mutation

- Production `chrome.alarms.create/clear` calls for:
  - periodic/retry Journal backup;
  - OperationLog/hourly maintenance;
  - context-menu crash-repair
  use `mutateChromeAlarmSerialized()`.
- Queue key is the alarm name; local deadline is 10 seconds.
- An old locally timed-out `clear(name)` keeps the queue occupied until its real settlement, so a newer `create(name)` cannot be deleted by that late clear.

## P1-119 — bounded scheduler prerequisites

- `getChromeAlarmBounded()` bounds `alarms.get()` to 10 seconds.
- OperationLog retention settings are read through `readChromeStorageBounded()`.
- Journal backup config/state prerequisite reads are bounded through `readJournalBackupStorage()`.
- Worker-start scheduler therefore fails bounded instead of holding the MV3 event indefinitely on a never-settling Chrome Storage/alarm read; missing alarms remain self-healable through the normal schedule path.

## P1-120 — crash-consistency dirty marker

- `webclipJournalStatsDirty` no longer uses a queue released by local Promise completion only.
- `queueJournalStatsMarkerMutation()` has an actual-settlement barrier: begin/complete/repair-clear mutations cannot cross an unresolved older Chrome Storage chain after local timeout.
- Initial and repeated repair reads are bounded.
- Existing bounded token-set/overflow/revision semantics from P0-050 are preserved.

Result: a late stale marker set/remove cannot falsely declare `urlStats` clean or erase a newer dirty mutation.

## P1-121 — OperationLog retention setting

- `operationLogSettings.retentionHours` read is bounded.
- Write is serialized by the same actual-settlement storage mutation primitive.
- Cleanup still runs only after the requested settings write completes locally.

Result: an older timed-out storage write cannot settle after a newer retention mutation and silently restore the stale value.

## P1-122 — legacy pending-append migration storage boundaries

- Legacy `webclipPendingJournalAppends` read is bounded.
- Migration into IndexedDB remains an idempotent bounded commit.
- Legacy storage-key removal happens only after the IDB commit and uses serialized/bounded Chrome Storage mutation.

Result: hung storage get/remove cannot hold migration forever, and a late remove cannot cross another mutation of the same legacy key.

## Deterministic regression

`project_tools/test_p1_117_122_storage_alarm_integrity.js` validates:

- old timed-out storage mutation blocks a newer mutation until actual settlement;
- old timed-out `alarms.clear()` cannot overtake a newer create;
- bounded storage/alarm read helpers reject never-settling reads;
- Journal stats marker has its own actual-settlement barrier;
- all six requirement call-sites remain routed through the bounded/serialized helpers.

Existing regressions were also updated only where implementation markers changed:

- `test_recovered_p0_060_062.js` now recognizes the serialized backup-state commit while preserving the post-success housekeeping invariant;
- `test_journal_notification_coalescing.js` uses the renamed stats marker settlement-chain boundary.

## Release boundary

This is local deterministic audit closure only. It does not replace real Chrome/Yandex E2E. Manifest remains `0.9.8`; no release ZIP or `0.9.9` is produced by this closure.
