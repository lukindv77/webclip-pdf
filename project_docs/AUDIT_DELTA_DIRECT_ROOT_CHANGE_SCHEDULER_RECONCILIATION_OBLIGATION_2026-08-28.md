# Audit delta — direct root change scheduler reconciliation obligation — 2026-08-28

## Scope

Docs-only audit of `saveYandexRoot()` and the Journal backup scheduler. No new P-number.

Refines **P1-177**, **P0-074** and the settings-generation/reconciliation direction already established by P1-157/P1-008.

## Finding

`saveYandexRoot(rootPath)` intentionally commits the new `yandexConfig.rootPath` **before** verifying/creating service folders. The source comment explicitly says a service-folder failure is returned to the user while the selected root remains saved.

The method then performs:

1. current auth read;
2. durable root config write;
3. when authorized, `ensureYandexServiceFolders(...)`;
4. only after that succeeds, `initializeJournalBackupScheduler('root-change')`.

Therefore a failure in step 3 is a legitimate **partial commit**: root generation R2 is durable, but scheduler reconciliation for R2 has never been attempted and no durable marker records that obligation.

This differs from user-settings import, which bundles a reconciliation marker with the settings commit.

### Deterministic schedule

1. Scheduler/alarm state reflects root/config generation R1 and prior backup success timestamps.
2. User saves new root R2.
3. `updateYandexConfig()` commits R2 successfully.
4. Service-folder verification under R2 fails/times out.
5. `saveYandexRoot()` throws before `initializeJournalBackupScheduler('root-change')`.
6. Browser remains open and the existing worker remains alive, so module-start initialization is not automatically repeated.
7. Old periodic/retry alarm state from R1 remains installed until some unrelated future reconciliation trigger.
8. A later stale alarm wake fresh-reads current R2 and may avoid a wrong physical backup, but durable scheduler state was nevertheless inconsistent with current committed configuration for the whole interval.

If R2 also invalidates the namespace coverage of `lastSuccessAt`, the existing backup-success-generation findings compound the problem: the old due time can suppress or delay the first required R2 backup.

## Required contract

A settings/config mutation that commits state requiring ancillary browser reconciliation must durably record that obligation **at the same commit boundary or before returning terminal success/failure**.

For direct root change:

- root config generation R2 is authoritative once the storage write settles;
- service-folder verification is a separate result (`verified / failed / unknown`);
- scheduler reconciliation is another separate obligation/result;
- failure of folder verification must not make the scheduler obligation disappear;
- worker startup/current settings page may resume the exact current-generation obligation;
- if newer root R3 supersedes R2, reconciliation converges to R3 rather than forcing R2 back.

A common generation-aware config-reconciliation marker may cover both direct writes and imported settings; separate ad-hoc markers are not required if one shared current-generation reconciler is authoritative.

## UI truthfulness

Because root persistence is intentionally retained after folder verification failure, the returned error/state should distinguish:

- `root committed`;
- `remote structure verification failed/pending`;
- `backup scheduler reconciliation pending`.

A generic save failure must not encourage a blind second config mutation merely to repair ancillary state.

## Acceptance cases

1. R1 -> root R2 commit -> folder verification fails: R2 remains stored and an exact scheduler-reconciliation obligation remains discoverable.
2. Same schedule without worker restart: reconciliation can still converge to current R2; it is not dependent on future `runtime.onStartup`.
3. Existing R1 periodic/retry alarms cannot remain authoritative after R2 commit.
4. R2 verification failure followed by intentional R3 save: R3 supersedes the obligation; late R2 work cannot restore R2 scheduling.
5. Storage write for R2 fails before commit: no R2 ancillary obligation is published.
6. Storage write times out but actually commits late: actual settlement publishes/retains the R2 reconciliation obligation; timeout is not cancellation.
7. Backup `lastSuccess` coverage is re-evaluated for current namespace generation rather than reused globally.

## Classification

- **P1-177**: scheduler must converge to current policy/root and not leave obsolete alarms authoritative.
- **P0-074**: root/config generation consistency for Yandex-dependent decisions.
- **P1-157/P1-008** provide the shared settings-generation / post-commit reconciliation pattern.

No new blocker is allocated.

## Validation note

Documentation only. Product tests were not rerun. Historical gate remains 88/88 JS syntax + 74/74 deterministic tests PASS. No build/tag/release.