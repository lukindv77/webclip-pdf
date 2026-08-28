# Audit delta — Journal backup state must be scoped to account/root generation — 2026-08-28

Source-of-truth `main` before this checkpoint includes `7e4ea3141fcc3f1ac056c28bc4487c51eeb474d9`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-074**, **P0-016** and **P1-177**. It is distinct from the existing backup scheduler-generation delta: that delta covers an *old in-flight operation* publishing stale future alarms after Settings changed. This checkpoint reproduces with no old operation running at all — persisted historical backup success/failure state from context A is interpreted as current state for context B.

## Current backup status mixes two provenance domains

`getJournalBackupStatus()` reads in parallel:

- current `yandexConfig`;
- persisted `journalBackupState`.

It derives current:

- `rootPath` from `yandexConfig.rootPath`;
- current Journal backup folder path from that root;
- enabled/interval/retry policy from current config.

But it reads historical unscoped fields from `journalBackupState`:

- `lastSuccessAt`;
- `lastFailureAt`;
- `lastAttemptAt`;
- `lastBackgroundSuccessAt` / failure fields;
- `lastRemotePath`;
- `lastEntryCount`;
- `lastReason`.

The persisted state shown in current code does not bind those fields to the Yandex account UID, root path/config generation, or an immutable backup-context generation.

The returned status then combines them directly:

- current `rootPath` / `folderPath`;
- `remotePath: lastRemotePath || folderPath`;
- old `lastSuccessAt`;
- `nextDueAt = lastSuccessAt + current interval`;
- `overdue = enabled && (!lastSuccessAt || now >= nextDueAt)`.

Thus the status object itself can describe a combination that never existed as one backup context.

## Deterministic root-change schedule

1. Current Yandex context is root **A**.
2. Background backup succeeds at time `t0` to `A/Backup/Journal/.../A.json`.
3. `journalBackupState` stores `lastSuccessAt=t0`, `lastRemotePath=A/.../A.json`, entry count and related timestamps.
4. User changes WebClip root to **B** shortly afterwards.
5. No old backup operation remains active; this is now a clean new worker/status read.
6. `getJournalBackupStatus()` reads current config B and historical state A.
7. It returns `rootPath=B` and `folderPath=B/Backup/Journal`, while `lastRemotePath` still points to A and `lastSuccessAt=t0` still counts as the latest success.
8. Scheduler computes the next B backup from `t0 + interval` instead of treating B as having no compatible successful backup yet.

The new root can therefore wait almost a complete interval before its first automatic backup solely because a different root was backed up recently.

## Account change is the stronger provenance case

The same issue applies when auth/account changes while persistent `journalBackupState` remains.

A success under account A should not prove current account B has a recent Journal backup, even when the configured textual root happens to be identical.

Without an account/config generation receipt the status layer cannot distinguish:

- same account + same root historical success;
- same account + changed root;
- changed account + same textual root;
- changed account + changed root.

P0-074 already requires immutable account/root/auth/config context for Yandex operations. Persisted backup health must consume the same context model rather than dropping provenance at terminal success.

## User-visible truth problem

P0-016 requires popup to show the latest successful and failed background attempts.

Those timestamps are meaningful only with their context.

After root/account change, current UI can otherwise imply that the currently configured backup destination has a recent success while the displayed/returned `lastRemotePath` belongs to the previous destination.

Acceptable UX families include:

- display the historical success explicitly as belonging to the previous account/root and separately show `no success yet` for current context;
- retain per-context bounded history and select the record matching current context;
- reset only the *current-context derived status* on context change while preserving old history for diagnostics.

Do not silently erase useful historical evidence merely to make the UI look clean.

## Failure/retry state has the same provenance requirement

Old `lastFailureAt` / `lastBackgroundFailureAt` / `lastError` are also unscoped.

A failure under A should not necessarily mark B as currently unhealthy or schedule current-context retry timing from A's failure. Conversely, switching context must not erase the fact that A had an unresolved failure if that is still useful history.

The key is classification:

- historical event A remains historical evidence;
- current scheduler/health decision B may consume only compatible B-generation evidence.

## Required backup-context receipt

A terminal backup state record should bind at least:

- Yandex account UID / verified account generation;
- normalized root path;
- relevant config generation;
- scheduler/settings generation where interval/enabled policy matters;
- operation receipt;
- exact backup remote path/object receipt;
- success/failure/attempt timestamps and entry count.

Current status should compare the stored context receipt to the current authoritative Yandex/scheduler context before treating an old timestamp as current-context success/failure.

## Scheduler semantics after context change

When current account/root generation has no compatible successful backup:

- `lastSuccessAt` for **current context** is logically empty;
- automatic backup should be considered due according to explicit first-backup policy, not postponed by success from another context;
- old A history may still be displayed separately;
- an old failure from A cannot dictate B's retry interval/state.

This composes with P1-177 scheduler-generation fencing: future alarm creation still needs current policy generation, while this checkpoint defines which historical success/failure record is eligible to calculate that current policy's due/retry state.

## Required regressions

1. Backup succeeds under root A -> switch to root B immediately -> B reports no compatible success and schedules first B backup according to first-backup policy, not A's `t0+interval`.
2. A and B use the same account but different root -> old A `lastRemotePath` is not presented as B's current backup path.
3. Backup succeeds under account A/root X -> reauth to account B/root X -> A success does not prove B is backed up.
4. Switch away A -> B -> back to exact proven A context -> implementation may recover A historical status if its context receipt still matches.
5. Failure under A -> switch to B -> B is not marked as currently failing solely from A's failure.
6. Current-context failure after switch to B is recorded against B and displayed truthfully.
7. Old historical status remains available for diagnostics without controlling current alarms.
8. Settings interval changes without account/root change continue to use the current compatible success timestamp but future scheduling uses the newest settings generation per P1-177.
9. Account/root change while an operation is physically in flight remains governed by P0-074 operation-context reconciliation; this historical-state contract does not rewrite that old result into B.
10. Popup/Options status cannot return a mixed object whose current root is B while its unlabelled current `remotePath` is A.

## Duplicate check / numbering

No new P-number is created.

- **P0-074** is the primary account/root/config-generation owner.
- **P0-016** owns truthful background-backup status presented in popup.
- **P1-177** owns scheduler state under current enabled/auth/config policy.
- `AUDIT_DELTA_BACKUP_SCHEDULER_GENERATION_2026-08-27.md` remains the sibling stale in-flight alarm-publication finding; this checkpoint covers persisted historical state provenance after the old operation is already gone.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real account/root-switch Yandex E2E remains required. No build, tag or Release was created.
