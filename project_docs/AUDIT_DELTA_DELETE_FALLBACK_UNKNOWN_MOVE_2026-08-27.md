# Audit delta — Delete→Trash error fallback / unknown move settlement — 2026-08-27

Source-of-truth `main` immediately before this write: `bf6abf3dc03bd0c61a18accff1fa3b3cc857eb32`.

Docs-only audit checkpoint. Production/runtime/tests/configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing:

- **P1-183** — durable exact Delete→Trash target/outcome checkpoint before `resources/move`;
- **P1-090** — exact source→target object reconciliation after move/unknown settlement;
- **P0-069** — publication/unpublish privacy lifecycle before local management reference disappears;
- **P0-076** — Journal generation/revision authority for delayed local finalization;
- **P0-074** — immutable Yandex account/root/auth/config operation context.

The concrete gap is in the **user-visible error fallback** after a failed Trash attempt. Current UI allows a second local-only deletion operation even when the first remote move may already have started and its settlement is unknown. This can deliberately remove the only Journal object-management identity before the remote side effect is classified.

## Existing destructive publication audit remains valid

`AUDIT_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md` already proves:

- current Delete→Trash has no durable collision-resolved target checkpoint before `POST /resources/move`;
- timeout is not cancellation and target verification is not reached when the local POST deadline wins;
- target `type=file` is insufficient without exact source object identity;
- published objects additionally need explicit unpublish/keep-public policy before local Journal deletion.

This checkpoint does not duplicate those findings. It adds the behavior of the **fallback action offered after the error**.

## Fresh source proof — every Trash error exposes local-only deletion

In `journal.js`, `runDeleteOperation(diskAction)` sends:

`WEBCLIP_JOURNAL_DELETE { id, diskAction, operationId }`.

When the operation throws/fails, the UI returns to an error state, shows a Retry button, and for:

`diskAction === 'trash'`

also makes `deleteOnlyAfterError` visible.

The button is permanently wired as:

`deleteOnlyAfterError.addEventListener('click', () => runDeleteOperation('keep'))`.

There is no classification of the preceding failure into:

- proven pre-move failure / no remote side effect admitted;
- move admitted and outcome unknown;
- exact move success but later verification/local finalization failure;
- deterministic remote rejection proving no move;
- publication/unpublish outcome unresolved.

Therefore every Trash error receives the same fallback authority.

## Why a `resources/move` error can mean remote settlement is unknown

Current Yandex wrapper applies a local request deadline/Abort. As already recorded by P1-090/P1-183, a local timeout after the POST was transmitted cannot prove the server did not commit the move.

A valid sequence is therefore:

1. Journal entry E identifies source object A at source path S.
2. User chooses Trash.
3. WebClip sends `POST /resources/move S -> T`.
4. Yandex physically commits A at T.
5. WebClip loses/times out waiting for the response and reports an error before post-move reconciliation.
6. UI exposes both Retry and `Удалить только запись журнала`.
7. User chooses the latter.
8. Journal sends a **new** `WEBCLIP_JOURNAL_DELETE` with `diskAction:'keep'`.
9. Worker deletes local entry E without proving the outcome of the earlier Trash generation.

At step 9 the file may already be in Trash, but the exact local management/reference evidence for that remote move is gone.

If the source was published, current runtime also has no unpublish checkpoint/outcome, so the local-only fallback can discard the management reference while publication privacy state is unresolved.

## This is not made safe merely because the fallback is explicit user action

The user is explicitly choosing "delete only the Journal entry" after being shown an error. But the UI does not explain that the earlier remote move may already have succeeded and that deleting the entry can abandon recovery/management evidence.

User confirmation cannot convert an unknown physical settlement into a known one.

Product policy may allow the user to **abandon automatic reconciliation**, but that must be represented as a separate explicit state, not implemented by erasing the sole receipt.

The distinction is:

- revoke local Journal-finalization/management UI authority if the user wants to stop normal recovery;
- preserve a bounded detached/dead-letter receipt describing the unresolved remote side effect.

This is the same separation already required by `AUDIT_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md`: local Journal membership and physical-side-effect evidence are different lifecycle concepts.

## Required P1-183/P1-090 refinement

### Error result must carry settlement class

The worker result/error exposed to Journal delete UI must distinguish at least:

- `not-started / pre-side-effect failure` when this is actually proven;
- `remote-rejected-no-move` only when provider semantics authoritatively prove non-occurrence;
- `outcome-unknown / reconciliation-required` after the move could have been admitted;
- `remote-move-verified / local-finalization-pending`;
- `publication-outcome-unknown` where P0-069 applies.

Do not derive these classes from generic error text.

### Fallback after proven no-side-effect

If the original Trash attempt is authoritatively proven not to have moved/unpublished anything, local-only `keep` deletion may follow the ordinary explicit user policy, subject to P0-069 for any retained public access.

### Fallback after unknown settlement

If move/unpublish outcome is unknown:

- default action should be `reconcile` / Retry verification, **not blind second move**;
- local-only deletion must not physically erase the only delete/move checkpoint;
- if product permits `Stop managing this unresolved operation`, require explicit wording that the remote file/public link may already have changed and preserve a bounded detached/dead-letter receipt;
- the detached receipt loses authority to mutate a future replacement Journal entry but retains exact source/target/account/object/publication provenance for diagnosis/manual reconciliation.

### Retry semantics

The current Retry button must also consume the same durable operation generation. It may first reconcile exact S/T/object identity and only issue a new move when the prior generation is authoritatively proven not to have committed.

A second click must not simply choose a new Trash collision target while the first target remains unknown.

### Publication composition

For a published source, P0-069 remains a separate privacy step in the same delete saga:

- explicit keep-public acknowledgement; or
- durable unpublish attempt/reconciliation.

A Trash transport error must not make the publication decision disappear. A subsequent local-only fallback must still preserve/surface unresolved publication state.

## Required regressions

1. Move POST times out after physical success -> UI classifies result as unknown; local-only fallback is not a silent ordinary delete.
2. Same case -> exact durable source/target/object receipt survives even if user explicitly abandons automatic recovery.
3. Move is authoritatively rejected before commit -> local-only fallback may proceed under ordinary policy without pretending an unknown move exists.
4. Move verified but local Journal CAS fails due clear/import -> remote receipt survives detached; old operation cannot delete replacement entry.
5. Published source + move unknown -> local-only fallback cannot erase unresolved publication/unpublish state.
6. Retry after unknown first attempt reconciles the first exact target before issuing any new move.
7. Collision-generated first target remains the only target associated with first generation after UI error/reopen/restart.
8. Reauth/root switch invalidates remote retry under old operation context but does not erase the old detached receipt.
9. Page close/reopen after unknown move can present an explicit pending/manual-reconciliation state from durable data.
10. OperationLog result uses `unknown/pending verification` semantics, never the false statement that remote data was unchanged merely because local timeout fired.

## Duplicate check

No new number is created.

- **P1-183** owns the durable Delete→Trash saga/checkpoint and is the primary owner of this fallback gap.
- **P1-090** owns exact move settlement/object reconciliation and safe retry.
- **P0-069** owns public-link privacy outcome before losing the Journal management reference.
- **P0-076** owns stale local Journal finalization across clear/import.
- **P0-074** owns exact Yandex namespace/generation.

This checkpoint adds the user-facing abandonment/fallback transition to those existing contracts; it is not an independent new remote mutation primitive.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.
