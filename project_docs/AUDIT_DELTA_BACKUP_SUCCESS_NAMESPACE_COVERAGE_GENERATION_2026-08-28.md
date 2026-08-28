# Audit delta — backup success freshness must be scoped to Yandex namespace generation — 2026-08-28

Source-of-truth `main` before this checkpoint: `f152829fe0dd0e8dc4d55d8e5a2b3d24fd82a376`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof composes existing **P1-207** source-revision coverage with **P0-073/P0-074** Yandex account/root/config generation and **P1-177** scheduler convergence.

The result is a deterministic ordinary-success case: a recent backup that correctly succeeded in namespace A can make the scheduler consider namespace B fresh after the user changes account/root, even though no backup exists in B.

## Current backup success state is global

`journalBackupState` success bookkeeping currently stores fields such as:

- `lastSuccessAt`;
- `lastBackgroundSuccessAt`;
- `lastRemotePath`;
- `lastEntryCount`;
- `lastReason`.

The current state does not bind the success/freshness record to:

- exact Yandex account UID;
- root/config generation;
- normalized root path as a verified namespace receipt;
- exact source Journal revision required by P1-207.

`lastRemotePath` is descriptive path text, not sufficient namespace authority.

## Status combines current config with historical global success timestamp

`getJournalBackupStatus()` reads in parallel:

- current `yandexConfig`;
- current `journalBackupState`.

It derives the **current** rootPath/interval/retry policy from `yandexConfig`, but derives:

`nextDueAt = lastSuccessAt + current interval`

from the global historical `lastSuccessAt`.

Thus one returned status object can semantically combine:

- namespace/config B;
- success timestamp produced under namespace A.

No equality/provenance check proves that the success covers B.

## Root change explicitly restarts scheduler, but freshness stays global

`saveYandexRoot(rootPath)` correctly:

1. commits the new root through `updateYandexConfig()`;
2. verifies/creates service folders when auth exists;
3. calls `initializeJournalBackupScheduler('root-change')`.

This is a useful positive control: root changes are not ignored by scheduler setup.

However restarting the scheduler does not help if the status model itself says the new namespace is not due because `lastSuccessAt` came from the old namespace.

## Deterministic root-switch suppression schedule

1. Current Yandex namespace is account A/root R1.
2. Background backup of Journal revision J succeeds at time T under A/R1.
3. `journalBackupState.lastSuccessAt = T` is committed.
4. Shortly afterward the user changes root to R2.
5. `saveYandexRoot(R2)` commits R2 and invokes scheduler initialization.
6. `getJournalBackupStatus()` reads current R2 but historical `lastSuccessAt=T`.
7. With default 24-hour interval, `nextDueAt = T + 24h` and `overdue=false`.
8. Scheduler can therefore defer backup for R2 until the full interval passes.
9. R2 may contain service folders but no successful backup of J at all.

The old A/R1 backup is valid historical data. The false statement is using it as freshness coverage for R2.

## Account switch with same textual root is stronger

Suppose account A and B both use textual root `/WebClips`.

After successful A backup, the user reauthorizes B. `getJournalBackupStatus()` can still see the same path string and recent global `lastSuccessAt`.

Without account UID/generation in the coverage receipt, there is no way to distinguish:

- `/WebClips` in A, which was backed up;
- `/WebClips` in B, which may be empty.

Path equality therefore cannot make the global timestamp safe.

This is precisely why P0-073 requires account/root namespace identity rather than path-only semantics.

## Journal source revision and namespace generation are conjunctive coverage

P1-207 already proves that a successful upload of Journal revision JA cannot make newer local revision JB fresh.

This checkpoint adds the orthogonal namespace dimension.

A backup coverage receipt is current only when both are true:

1. exact source Journal revision covered by the file equals the revision/policy state being evaluated;
2. exact Yandex namespace generation/account/root for that file equals the namespace whose freshness is being evaluated.

Conceptually:

`coverage = { sourceJournalRevision, accountUid, root/config generation, remote object/content receipt, successAt }`.

A recent timestamp alone is insufficient.

## Successful historical backup remains success

Changing namespace after A succeeds must not rewrite A into failure.

Status should be able to report separately:

- latest successful historical backup A/R1 at T;
- current configured namespace B/R2 has no matching coverage yet;
- current Journal revision is backup-due for B/R2.

This preserves truthful history while driving the correct scheduler action.

## Root/account changes should create current-namespace backup due state

After a namespace generation changes:

- scheduler reconciliation should evaluate coverage against the new generation;
- absent matching coverage means current namespace is due, regardless of recent success elsewhere;
- use bounded near-term scheduling rather than uncontrolled immediate loops;
- if backup is disabled, do not force a backup merely because namespace changed;
- re-enabling later evaluates current generation coverage normally.

A->B->A with visually equal values should use explicit generation/provenance policy. If a previous A coverage receipt is still considered valid for the exact same authenticated account/root generation under product semantics, that decision must be explicit and proven, not inferred from path equality.

## Recovery composition

The existing backup-recovery namespace audit already requires pending upload checkpoints to retain historical account/root/content identity.

When recovery later proves old A/R1 upload success while current config is B/R2:

- record A/R1 as historical success;
- do not update B/R2 coverage freshness;
- scheduler remains due for current B/R2 if no matching file covers it.

The same rule must apply to ordinary non-recovered success. Recovery is not a special exception.

## Settings/scheduler generation composition

P1-177/P0-074 still require old scheduler tasks not to overwrite current policy.

Even a perfectly generation-fenced scheduler will produce the wrong decision if its input coverage model treats A's timestamp as B's success. Therefore two layers are required:

- scheduler execution generation correctness;
- namespace/source coverage correctness.

## Required deterministic regressions

1. Backup J succeeds under A/R1 -> root changes to R2 immediately -> current R2 is backup-due; old success remains historical.
2. A/R1 success -> reauth B/R1 same textual root -> B is due; A timestamp cannot suppress it.
3. A/R1 success -> interval changes but namespace unchanged and source Journal revision unchanged -> normal current coverage may be reused according to policy.
4. Stage/source revision A succeeds after Journal revision B -> P1-207 keeps B due even in same namespace.
5. Namespace changes while old backup upload is in flight -> old result is attributed to old context and cannot satisfy new namespace coverage.
6. MV3 recovery proves historical A object while current B is configured -> B remains due.
7. Backup disabled before root switch -> scheduler remains disabled; coverage status can say current namespace unprotected without starting work.
8. Re-enable after switch -> due calculation uses current namespace coverage, not global historical timestamp.
9. Account/root change and then switch back -> any reuse of old coverage requires exact account/root generation/object policy, never path-only equality.
10. UI can display latest historical success and current-namespace protection state separately.
11. `lastRemotePath` from old root is not used as proof current root is covered.
12. Current namespace successful backup commits a new coverage receipt and normal interval scheduling resumes.

## Duplicate check / numbering

No new item is created.

- **P1-207** remains source Journal revision coverage owner.
- **P0-073/P0-074** own Yandex namespace/operation generation.
- **P1-177** owns scheduler convergence to current policy.
- Existing backup recovery namespace/provenance delta remains the recovery-side companion.

This checkpoint makes the conjunction explicit for ordinary scheduler freshness: **backup success coverage is revision + namespace generation, not a global timestamp.**

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
