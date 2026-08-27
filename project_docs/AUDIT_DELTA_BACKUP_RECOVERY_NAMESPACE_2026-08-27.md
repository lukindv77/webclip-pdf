# Audit delta — Journal backup recovery namespace provenance — 2026-08-27

Source-of-truth `main` immediately before this write: `df6b1de638223a53b435f968b83e5d5ac1e8c07f`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P0-073** — exact Yandex account/root namespace identity for remote objects and recovery;
- **P0-074** — immutable auth/config/root operation generation across multi-step Yandex work;
- **P1-052** — unknown Journal-backup upload settlement must preserve durable recovery evidence instead of turning repeated 404 into a proven negative;
- **P1-184** — remote object/content proof must identify the exact object/content produced by the exact operation.

Adjacent scheduler/auth dependencies remain **P1-177/P1-196**. This checkpoint does not replace their invalid-token retry/demotion contracts.

The new evidence is backup-specific and is not the already documented backup-picker selection race. The defect exists after an irreversible backup PUT has started and survives MV3 restart because the durable backup checkpoint itself lacks the namespace/generation receipt needed for correct reconciliation.

## Fresh source proof

### 1. Prepared backup checkpoint stores path/size, but no account/root/auth generation

`uploadJournalExportStagedToYandex()` obtains the upload link for the newly chosen backup `remotePath`, then writes `JOURNAL_BACKUP_PENDING_KEY` before the signed PUT.

The current prepared object stores approximately:

- `phase: 'prepared'`;
- textual `operationId`;
- `remotePath`, `filename`, `monthFolder`;
- timestamps / attempt counters;
- `expectedBytes`;
- export `entryCount` / `exportedAt` / reason.

It does **not** store an immutable receipt for:

- Yandex `accountUid`;
- normalized configured `rootPath`;
- auth generation/token identity;
- config/root generation;
- signed-transfer attempt generation;
- strong local backup-content digest/fingerprint;
- remote resource identity/content proof.

Therefore the checkpoint can identify a textual path and expected size, but not the Yandex namespace in which the irreversible upload was actually admitted.

### 2. Recovery resolves current namespace again

`recoverPendingJournalBackup(status, operationId)` reads the durable pending object, then calls:

`ensureYandexServiceFolders({ includeBackup: true, operationId })`.

That helper resolves the **current** Yandex auth/config/root and returns the current `journalPath`.

Recovery then normalizes the old `pending.remotePath` and checks it using:

`isAllowedJournalBackupPath(remotePath, structure.journalPath)`.

The `status` argument does not provide an immutable old operation namespace receipt. It is current scheduler/config state.

Thus recovery of a previously admitted physical upload is retargeted through mutable current account/root state after restart or concurrent reconfiguration.

### 3. Root change can delete the only old recovery identity

If upload A was admitted under root `R1`, its checkpoint contains for example:

`R1/Backup/Journal/08-2026/webclip-journal-....json`.

If the user later changes the configured root to `R2` before recovery, `ensureYandexServiceFolders()` returns the current `R2/.../Journal` branch.

The old A path no longer passes the current-root containment check. Current code treats it as an invalid checkpoint, removes `JOURNAL_BACKUP_PENDING_KEY`, logs that an invalid unfinished-backup checkpoint was discarded, and returns `null`.

This is a provenance bug, not a path-containment bug. The old path may be perfectly valid for the historical operation A; it is merely outside the **new** root generation B.

Consequences:

1. A signed PUT may already have physically settled under R1.
2. The only durable identity needed to reconcile A can be erased merely because configuration changed to R2.
3. The backup flow can then stage/upload a new backup under R2.
4. The R1 object becomes an untracked remote side effect even though WebClip had a checkpoint capable of identifying it before the root change.

P1-052 already forbids destroying unknown-settlement evidence solely from time/404 heuristics. The same preservation rule must apply to configuration/namespace changes.

### 4. Account switch with the same textual root can falsely accept the wrong object

The stronger symmetric case occurs when account changes but textual root/path remains the same.

Schedule:

1. Account A/root R prepares backup checkpoint C for path P and expected byte size N.
2. A's signed PUT has unknown settlement / worker restarts before local success commit.
3. User reauthorizes to account B. B uses the same textual root R.
4. Recovery reads C, but all Yandex calls execute under current account B.
5. B happens to contain an object at textual path P whose reported size is also N.
6. Recovery accepts exact byte-size equality, writes `phase:'remote-verified'`, and returns the object as the recovered result.
7. `journalBackupState.lastSuccessAt/lastRemotePath` can then be advanced as though A's interrupted upload was proven.

The checkpoint contains no accountUid/auth generation allowing recovery to detect that it queried B rather than A.

This can therefore create a false success receipt across accounts even without an attacker and even when path containment is correct.

### 5. Size equality is not content identity

Current recovery verifies `metadata.size` against `pending.expectedBytes`. Exact size is useful corruption evidence but is not a strong content receipt.

Two different JSON backups can legitimately have equal byte length. If a same-path object exists in the newly current account/root, byte-size equality cannot prove it is the exact staged backup whose PUT had unknown settlement.

This is a direct backup manifestation of P1-184: exact remote content/object proof must compose with the exact local content receipt, not only byte count/path.

### 6. Account switch + 404 can destroy A evidence indirectly

If B does **not** contain P, recovery gets 404 under B. The existing P1-052 weakness then increments the prepared-checkpoint retry counters and can eventually delete the checkpoint after the configured grace/attempt heuristic.

Those 404s say nothing about whether A's upload committed in account A. They were queries against the wrong namespace.

Therefore fixing P1-052's repeated-404 policy without namespace binding is insufficient: a retained checkpoint still cannot be reconciled correctly unless it tells recovery which account/root/auth generation owns it.

### 7. Switching back to A cannot reconstruct a deleted receipt

Once the shared pending key is removed while B is current, later reauthorizing to A does not restore the checkpoint. The system no longer knows the exact old path/operation/expected body relation except incidental logs or remote listing.

A later generic list/search cannot safely reconstruct the old operation receipt because filename/path/size are not sufficient content provenance and OperationLog is diagnostic, not durable side-effect authority.

## Relationship to existing backup-picker audit

`AUDIT_DELTA_YANDEX_BACKUP_IMPORT_2026-08-27.md` already proves a multi-step **user selection** race:

- list/select under account A;
- reauth to B;
- later fetch by stale textual path under B.

This checkpoint is different:

- no picker or user-selected backup object is required;
- an irreversible **write** has already been admitted;
- the durable recovery record itself lacks the namespace receipt;
- incorrect behavior survives worker restart and can either erase old unknown-settlement evidence or falsely finalize a different current-account object.

The shared fix primitive should still be the same immutable Yandex operation/namespace receipt rather than two unrelated patches.

## Required unified contract

### Namespace-bound backup generation receipt

Before requesting/using the signed upload side effect, issue a durable backup-attempt generation receipt that binds at minimum:

- random local backup generation / transfer-attempt id;
- worker-issued operation receipt (P1-198 direction where used);
- proven Yandex `accountUid`;
- immutable auth generation/token identity;
- normalized configured `rootPath` + config generation;
- exact intended backup `remotePath`;
- local staged-export generation/key;
- exact expected byte count;
- strong digest/fingerprint of the staged bytes;
- export metadata required to commit `journalBackupState`;
- phase timestamps / retry diagnostics.

Textual `operationId`, path and byte count remain descriptive fields, not sufficient authority.

### Recovery must use the historical namespace receipt

A pending attempt created under A/R1 must be reconciled only against A/R1.

If the required old auth session is no longer available:

- do not retarget the checkpoint to current B/R2;
- do not delete it merely because it is outside current root containment;
- transition/defer it as namespace-unavailable / auth-unavailable while retaining bounded recovery evidence;
- allow the user to reauthenticate/reconcile under the matching namespace or explicitly abandon that generation under a deliberate policy.

A newly configured root/account may start a separate newer backup generation only according to duplicate/unknown-side-effect policy, without overwriting or destroying the older unresolved generation.

### Separate historical containment from current configuration

Path containment must be evaluated against the root captured in the historical attempt receipt, not the mutable current root.

Changing current root must not make a previously valid operation path "malformed". It makes the historical generation non-current for new work, but still valid as reconciliation evidence.

### Strong content/object verification

P1-184 verification for backup recovery must prove that the remote object is the exact content generation that was staged/uploaded.

At minimum, preserve a strong local digest and use the strongest authoritative remote evidence the Yandex API can safely provide. If the API cannot provide a trustworthy remote content hash, design a versioned backup-object receipt/content envelope or another exact-proof strategy; do not silently upgrade `same path + same size` to exact identity.

### Success-state admission

`journalBackupState.lastSuccessAt`, `lastRemotePath`, entry count and background success diagnostics may advance only from a recovery receipt that proves:

- exact historical namespace/account/root generation;
- exact backup attempt generation;
- exact intended object/content result;
- current local scheduler/config generation may differ, but that difference is represented rather than silently retargeting the old attempt.

A recovered historical A/R1 upload may be recorded as historical success while current config is B/R2, but must not be misrepresented as a successful B/R2 backup or used to reschedule stale policy without a current-generation check.

### Scheduler/config composition

After a success/failure/recovery result, scheduling decisions must fresh-check the current backup settings generation. A stale operation snapshot must not re-enable periodic/retry alarms after the user disabled backup or changed policy. This is the scheduler consequence already adjacent to P0-074/P1-177; no new number is created here.

## Deterministic regression matrix

1. A/R1 prepared checkpoint -> unknown PUT -> switch root to R2 -> recovery retains A/R1 generation; it is not deleted as invalid merely because current root is R2.
2. Same schedule -> current R2 starts a new permitted backup generation -> A/R1 unresolved receipt remains independently diagnosable and cannot be overwritten by one global pending key.
3. Account A/root R unknown upload -> switch to B/root R with no object -> B 404 does not increment evidence as though A was queried and cannot erase A checkpoint.
4. A/root R unknown upload -> B/root R contains same path and same byte length with different content -> recovery rejects B as proof for A.
5. A/root R unknown upload -> B/root R contains exact same bytes coincidentally -> account namespace mismatch still prevents using B object as A receipt.
6. Reauthenticate matching A later -> retained A generation can be reconciled against A without reconstructing identity from logs/filename.
7. Historical A object is proven -> success state records the correct historical namespace/generation and does not claim current B/R2 was backed up.
8. Current config changes during recovery network request -> late result is fenced to the captured historical attempt; it cannot mutate a newer attempt/current namespace row.
9. Two physical backup attempts for the same intended Journal snapshot remain separate generations; one late verification cannot consume/overwrite the other.
10. Equal-size different staged backups have different content receipts and cannot be interchanged.
11. Repeated 404 in the correct historical namespace remains P1-052 unknown-settlement evidence; time/attempt count alone never becomes authoritative non-creation proof.
12. User disables automatic backup while an older attempt finishes -> current settings generation prevents stale periodic/retry alarm resurrection.
13. MV3 restart with unresolved historical namespace and unavailable matching auth -> checkpoint remains bounded/deferred, not silently retargeted to current auth.
14. Pressure/retention policy remains globally bounded; unresolved generations cannot grow without limit, but eviction must preserve enough dead-letter identity to avoid falsely declaring remote absence.

## Duplicate check / numbering

No new number is created.

- **P0-073** owns exact account/root namespace identity.
- **P0-074** owns immutable auth/config/root operation generation.
- **P1-052** owns preservation/reconciliation of unknown Journal-backup upload settlement.
- **P1-184** owns exact remote object/content proof.
- **P1-177/P1-196** remain scheduler/auth-demotion dependencies.

Do not assign a new P0/P1 solely for this backup manifestation.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**; real Yandex account/root-switch + unknown-upload recovery remains release QA.