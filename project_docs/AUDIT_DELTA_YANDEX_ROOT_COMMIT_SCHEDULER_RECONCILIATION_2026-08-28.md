# Audit delta — Yandex root commit must durably reconcile scheduler/structure — 2026-08-28

Source-of-truth `main` immediately before this write: `e0156a4d27eedb02dc582e83ca45b2c5b5c04ce5`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing:

- **P1-177** — backup scheduler must converge to current settings/root/auth state;
- **P0-074** — Yandex root/config generation must remain coherent through long/partial operations;
- **P1-008** — settings changes that require ancillary scheduler reconciliation need a durable completion marker/generation;
- **P1-210** — an outer error must not be interpreted as proof that a partially committed multi-step operation did not change state.

No new generic configuration-reconciliation number is needed.

## Fresh source proof — root is committed before remote structure and scheduler

`saveYandexRoot(rootPath)` first validates/normalizes the requested root and then calls `updateYandexConfig(...)`.

Inside that config mutation it durably publishes:

- `config.rootPath = normalized`;
- removal of legacy `journalBackupFolder`.

Only **after this current root is committed** does the function perform later work:

1. if current auth exists, `ensureYandexServiceFolders({ includeUpload:true, includeReadLater:true, includeBackup:true })`;
2. if that succeeds, set `structureVerified=true`;
3. call `initializeJournalBackupScheduler('root-change')`;
4. return success to Options.

The source comment explicitly states that when service-folder verification fails, the chosen root intentionally remains saved so the operation can be retried later.

Therefore `saveYandexRoot()` is not an atomic "validate everything, then publish root" operation. Its durable commit point precedes ancillary remote/scheduler reconciliation.

## Deterministic partial-commit schedules

### Remote structure error

1. Current config/root generation is A.
2. User selects new root B.
3. `updateYandexConfig()` durably commits B.
4. `ensureYandexServiceFolders()` encounters an auth/network/Yandex error.
5. Function rejects before `initializeJournalBackupScheduler('root-change')`.
6. Caller sees an error, but durable root is already B.
7. Existing periodic/retry alarms and backup status/reconciliation may still reflect scheduler decisions admitted under A until a later independent repair path runs.

This is an intentional partial config commit but an **unmarked ancillary reconciliation failure**.

### MV3 termination window

Even when remote folder checks are healthy:

1. B config commits.
2. Worker stops unexpectedly before or during later structure/scheduler work.
3. On restart, there is no root-change-specific durable marker saying "config generation B committed; required scheduler/structure reconciliation is incomplete".
4. Startup may run general scheduler initialization, but correctness should not depend on reconstructing the causal transition solely from current values and historical backup state.

The marker/generation pattern already exists for user-settings import because that operation correctly recognizes that durable settings commit and ancillary scheduler reconciliation are separate completion stages.

## Why existing alarm fresh reads are not enough

Alarm handlers fresh-reading current root/auth are a useful safety defense: an old alarm need not blindly upload to root A after B is current.

But durable scheduler state has more semantics than "eventually a handler reads B":

- a new root should normally be treated as a new backup-coverage namespace;
- old root success timestamps must not postpone first B backup (already refined by the backup-state provenance delta);
- disabled/no-auth/root-unverified state must converge to the intended alarm set;
- stale retry/periodic alarm times should not remain authoritative merely until they happen to fire;
- a failed structure verification may require visible deferred state rather than a generic save error that obscures the committed root.

Thus root commit completion and scheduler/structure reconciliation must be modeled separately.

## Required contract

### Durable root mutation generation

A successful config commit of root B must advance a Yandex config/root generation and persist enough tiny reconciliation state to prove:

- B is the current committed root;
- remote service-structure verification for B is `pending / verified / failed-unverified`;
- scheduler reconciliation for B is `pending / applied`;
- historical A backup state remains historical and is not current-B coverage.

Exact field/schema choice is implementation-specific.

### Ancillary failure does not roll back factual root state

If product intentionally preserves B when folder verification fails, UI/runtime must return a structured **partial** result rather than an undifferentiated error that encourages the user to infer no setting changed.

A useful result distinction is:

- root not committed;
- root B committed + structure verified + scheduler reconciled;
- root B committed + structure pending/failed + scheduler reconciliation pending;
- result transport unknown, requiring read-only reconciliation before retry.

Do not silently roll B back after a remote side effect unless that rollback itself is generation-safe and explicitly designed.

### Startup/retry reconciliation

Worker startup and later status reads should detect an incomplete root-generation marker and safely converge:

1. current auth/account/root generation;
2. service-folder structure for that exact generation when authorization is available;
3. backup scheduler generation;
4. backup-status namespace/coverage receipt.

A newer root C supersedes B. A late B reconciler must not create folders/scheduler state and then publish itself as current after C won.

### Outer transport loss

If the page loses the response after B committed, retrying "Save Root B" may be locally idempotent at the config value but remote folder creation/scheduler mutations still need current-generation reconciliation. UI should first read current root/reconciliation status rather than treating channel loss as proof B failed to save.

## Composition with existing findings

- The folder-picker account-generation delta controls whether the requested path was authorized under the current account.
- P0-074 controls immutable account/root/config context for the remote folder operations.
- P1-177 controls actual future alarm state.
- P1-008 already demonstrates a durable reconciliation marker pattern for settings import.
- Backup-state account/root provenance ensures an old success A does not make B appear covered.
- P1-210 governs the page-visible result when the outer RPC result is lost.

## Required regressions

1. Root A -> B, all steps succeed -> B current, structure verified, scheduler applied exactly once.
2. Root B config commits -> first folder check fails -> status explicitly reports B committed + reconciliation pending; old A scheduler state is not presented as current truth.
3. Same schedule followed by worker restart -> B reconciliation resumes safely without user re-entering the root.
4. Worker stops after B commit before scheduler call -> startup detects/reconciles B.
5. B pending -> user commits C -> late B reconciler cannot overwrite C scheduler/root state.
6. B commit response channel is lost -> page refresh/reconcile discovers B before allowing a semantically new mutation.
7. B folder create partially settles remotely with unknown outcome -> no blind duplicate tree mutation; re-read exact B structure.
8. Old root A backup success remains historical and does not postpone required B backup.
9. Disconnect/no-auth after B commit -> structure can remain pending while scheduler converges to paused/no-auth under P1-177.
10. Reauth later resumes B structure/scheduler only if B generation is still current.

## Duplicate check

Repository commit search for `root change scheduler reconciliation` / `root saved scheduler` found no dedicated checkpoint. Existing P1-177 and P0-074 own the relevant scheduler/config generations; P1-008 already owns the generic requirement that durable settings commit and ancillary scheduler reconciliation are distinct stages.

This delta defines the same missing completion contract for direct `saveYandexRoot()` and does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.
