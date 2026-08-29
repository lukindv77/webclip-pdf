# Audit family evidence — Yandex remote object identity / move / publication / destructive lifecycle

Family from `AUDIT_DELTA_INDEX.md` section 3.

This document is a **lossless consolidation** of the detailed audit deltas listed below. Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-022, P0-040, P0-069, P0-072, P0-073, P0-074, P0-078, P1-090, P1-164, P1-175, P1-184, P1-210.

Retired source count: **21**.

## P-code coverage

P0-013, P0-022, P0-039, P0-048, P0-063, P0-069, P0-072, P0-073, P0-074, P0-076, P0-078, P0-079, P1-052, P1-090, P1-133, P1-158, P1-164, P1-179, P1-183, P1-184, P1-194, P1-197, P1-198, P1-199, P1-206, P1-210, P1-211, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `AUDIT_DELTA_BULK_DESTRUCTIVE_FENCING_2026-08-27.md` | `970ef864630b14df38ac4848cc4fd2c8cf29c737cca156c515bdf7a5e0c618f2` | P0-069, P0-072, P0-074, P0-076, P1-090, P1-164, P1-183 | Audit delta — bulk destructive fencing vs entry/remote side effects — 2026-08-27 |
| `AUDIT_DELTA_CONCURRENT_READ_MOVE_LATE_ERROR_RESURRECTS_PENDING_STATE_2026-08-28.md` | `9b228340c64ad443d190196a30925ab67fad82a56bb6b6253c6a29c7b2125b1f` | P0-076, P1-090, P1-198, P1-211 | Audit delta — concurrent Mark Read operations can resurrect pending move state after a newer success — 2026-08-28 |
| `AUDIT_DELTA_DELETE_FALLBACK_UNKNOWN_MOVE_2026-08-27.md` | `5234ee355989efedf183ef462c1689f65218e5256d010403ff0d322efb018b1f` | P0-069, P0-074, P0-076, P1-090, P1-183 | Audit delta — Delete→Trash error fallback / unknown move settlement — 2026-08-27 |
| `AUDIT_DELTA_DELETE_RETRY_UI_OPERATION_SAGA_DISCONTINUITY_2026-08-28.md` | `f92f7512087da3677ed7e6b033f65b945bd8f1033de03e6a4f2f06d9065a3593` | P0-069, P0-074, P0-076, P1-090, P1-183, P1-198, P1-210, P1-211 | Audit delta — Delete→Trash Retry UI starts a fresh operation identity instead of resuming the prior move saga — 2026-08-28 |
| `AUDIT_DELTA_DESTRUCTIVE_CONFIRMATION_RECEIPT_LIFETIME_2026-08-28.md` | `adaf6dbdefa3d7c49c9c707dbc2a7b5f270e57dec8184ddd1fb9997cfcbbe53b` | P0-073, P0-074, P0-076, P1-090, P1-183, P1-184, P1-198, P1-206, P1-210, P1-211 | Audit delta — destructive confirmation receipt lifetime — 2026-08-28 |
| `AUDIT_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md` | `626d03040f0f8ec27361973bdb23fa9f32306bf1c3f52e8c36611957e03d0f7e` | P0-022, P0-069, P0-074, P0-076, P0-079, P1-090, P1-164, P1-183, P1-197, P2-020 | Audit delta — destructive publication lifecycle — 2026-08-27 |
| `AUDIT_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md` | `69b6a59409d0ffcdac1db5c4685f9e3021a47800c87f689e79a8bd60d2a4a29b` | P0-039, P0-048, P0-073, P0-074, P0-076, P0-079, P1-090, P1-183, P1-184, P1-194, P1-198 | Audit delta — Journal clear/import generation invalidation vs external recovery evidence — 2026-08-27 |
| `AUDIT_DELTA_JOURNAL_REPLACE_VERIFIED_PUBLIC_OBJECT_RECEIPT_2026-08-28.md` | `3c7e549f27e29f386502547ff9f85d2aea2cd0a6dcd989176c6e64648d93deec` | P0-069, P0-076, P0-078, P1-164, P1-184, P1-211 | Audit delta — Journal replace/clear vs verified published remote receipt — 2026-08-28 |
| `AUDIT_DELTA_PUBLICATION_OBSERVATION_POLICY_SEPARATION_2026-08-28.md` | `51a8519691ebf36bff591e1fe410385be243f5dceff0e744749805e4db657565` | P0-069, P0-074, P0-078, P1-164, P1-184 | Audit delta — publication observation vs policy authority — 2026-08-28 |
| `AUDIT_DELTA_PUBLICATION_POLICY_2026-08-27.md` | `ce65e4c7d43632382eb1572cd2718f87eb471c1a174ad6d3992e5175bd67c5ec` | P0-069, P0-074, P0-078, P0-079, P1-164, P1-184, P1-197 | Audit delta — Yandex publication privacy policy generation |
| `AUDIT_DELTA_READLATER_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md` | `905e03210e2ff3f3cc1ef3b89dc665adeab0c4b984c25dbf72560b8b0030a0c5` | P0-073, P0-074, P0-076, P1-090, P1-184 | Audit delta — ReadLater -> Upload move must retain one Yandex account/config generation — 2026-08-28 |
| `AUDIT_DELTA_READ_MOVE_CHECKPOINT_COLOCATED_WITH_JOURNAL_ENTRY_2026-08-28.md` | `b170aab010581500ccb993f3bd8e78fb560d22dc4714614b6a354ae187d192e0` | P0-074, P0-076, P1-090, P1-184, P1-211 | Audit delta — ReadLater move checkpoint is co-located with replaceable Journal entry — 2026-08-28 |
| `AUDIT_DELTA_READ_MOVE_PROVEN_COLLISION_TARGET_RESELECTION_2026-08-28.md` | `e9c5a55b67f6ab6aaf72ce4ef2ed0e25dc46d49351c03816a206c47f8a39602b` | P0-073, P0-074, P0-076, P1-090, P1-183, P1-211 | Audit delta — ReadLater move proven-collision target reselection — 2026-08-28 |
| `AUDIT_DELTA_TRASH_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md` | `54a32cb21dd350f8a03a25426fcbf9c15f134bd5895e52e519bd7fab18ece9f5` | P0-022, P0-073, P0-074, P0-076, P1-090, P1-183, P1-184 | Audit delta — Delete->Trash move must remain in one Yandex account/config generation — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_DESTRUCTIVE_MOVE_AUTH_GENERATION_2026-08-28.md` | `9bb5ff274b564a46a8691a5334c8ba90d0d5cbddf7be204458cad4b9e6cc63f4` | P0-022, P0-073, P0-074, P0-076, P1-090, P1-183, P1-210 | Audit delta — destructive Yandex Journal move must remain in one auth/account generation — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_GLOBAL_LOCATE_PAGINATION_COHERENCE_2026-08-28.md` | `9b354cb1f2f376af02560928d002990f131f2c63d60ae4c3bafedc0cdb26d5b0` | P0-073, P0-074, P1-090, P1-133, P1-184, P1-211 | Audit delta — Yandex global locate pagination coherence — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_LEGACY_ACCOUNT_IDENTITY_2026-08-27.md` | `570047b96207bedfa575eb51f57d0515fe9fb48da87f74e3a03ffb4d69f7a8af` | P0-022, P0-073, P0-074, P1-090, P1-184, P1-199 | Audit delta — Yandex legacy account identity — 2026-08-27 |
| `AUDIT_DELTA_YANDEX_MIXED_ROOT_PUBLICATION_CONTEXT_2026-08-28.md` | `046a6ebe3b77bca0398d711b74dacafe334845e166dc8df3828e59d44dabd0a1` | P0-069, P0-073, P0-074, P0-078, P1-158, P1-164, P1-184, P1-211 | Audit delta — mixed-root publication authorization inside one Yandex operation — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_MOVE_POSTSTATE_IDENTITY_CONTINUITY_2026-08-28.md` | `3e407bd237b7de3386561e06634c0b1464cb8b69ad56985d116d396f035c5677` | P0-022, P0-073, P0-074, P0-076, P1-090, P1-183, P1-211 | Audit delta — Yandex move post-state identity continuity — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_OFFSET_PAGINATION_SNAPSHOT_COHERENCE_2026-08-28.md` | `893998903e92f4316eaaf5c059909e3294e5cdc21d0b659e1db734dc89166b23` | P0-013, P0-074, P1-133, P1-184, P1-211 | Audit delta — Yandex offset-pagination snapshot coherence — 2026-08-28 |
| `AUDIT_DELTA_YANDEX_SIGNED_TRANSFER_PHASE_2026-08-27.md` | `55c71ddad776ff26a709511c83caaa4b89698cc93c9d38d6f32676b1bb68da92` | P0-063, P0-073, P0-074, P0-079, P1-052, P1-179, P1-184, P1-194 | Audit delta — Yandex signed-transfer durable phase / backup content receipt — 2026-08-27 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.
## Retired source: `AUDIT_DELTA_BULK_DESTRUCTIVE_FENCING_2026-08-27.md`

SHA-256 of UTF-8 source text: `970ef864630b14df38ac4848cc4fd2c8cf29c737cca156c515bdf7a5e0c618f2`

# Audit delta — bulk destructive fencing vs entry/remote side effects — 2026-08-27

Baseline HEAD before this audit block: `08f7bc34db1deb9c6b384802f1176bcd6256bae9`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh concurrency audit of clear/replace-import against local and remote single-entry mutations, focused on existing `P0-072`, `P0-076`, with dependencies `P1-183`, `P1-090`, `P0-074`.

## Worker guard is narrower than its name suggests

The only service-worker uses of `runExclusiveJournalDestructiveMutation()` are:

- `WEBCLIP_JOURNAL_CLEAR`;
- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`.

The following mutating operations do **not** enter that worker-owned guard:

- `WEBCLIP_JOURNAL_DELETE` including remote Delete→Trash;
- `WEBCLIP_JOURNAL_MARK_READ` including remote ReadLater→Upload;
- comment add/edit/delete;
- ordinary append/finalization paths.

Therefore the guard prevents clear and replace-import from overlapping **each other**, but it is not a global Journal mutation/side-effect fence.

## Page-local guard also does not solve this

`journal.js::beginJournalDestructiveOperation()` is page-local state and disables only import/clear controls. Card-level delete/mark-read/comment operations use separate busy variables and are not part of the same exclusion contract.

Consequences:

- one Journal page can still overlap a bulk destructive operation with a card mutation if actions are reached through independent UI paths;
- two Journal pages always have independent page-local guards;
- service-worker remains the only place capable of enforcing the real invariant, and currently does not.

## P0-072 — external side effects are broader than upload/download

Current clear transaction correctly removes matching/all records from:

- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

Replace-import clears all three pending stores atomically with replacing entries.

This prevents many old save completions from recreating Journal entries, but it does not account for already-started non-cancellable or remote side effects that are **not represented in those pending stores**, especially:

- Delete→Trash `resources/move`;
- ReadLater→Upload `resources/move`;
- future unpublish/revoke operations required by P0-069/P1-164.

A clear/import can therefore commit while such a remote operation is still in flight. Removing Journal state is not cancellation of the remote mutation.

P0-072's global durable-side-effect fence must include all irreversible/unknown-settlement entry operations, not only save/download checkpoints.

## P0-076 — exact stale replacement corruption

The current single-entry write helpers do not use expected revision/generation CAS.

`updateJournalEntryRecord(id, patch)` performs a fresh `store.get(id)` inside its final transaction and applies the stale precomputed patch to whatever record currently has that id.

`deleteJournalEntryRecordOnly(id)` likewise re-reads the current id and deletes it.

This creates exact replacement corruption after replace-import:

### Late Delete→Trash

1. old entry A begins delete and remote move;
2. replace-import commits entry B with the same id;
3. old remote move settles;
4. old `deleteJournalEntryRecordOnly(id)` reads B and deletes B.

The old operation has therefore deleted the replacement entry, not merely completed cleanup of A.

### Late ReadLater→Upload

1. old entry A begins mark-read and computes remote/checkpoint state;
2. replace-import commits B with the same id;
3. old move settles;
4. final `updateJournalEntryRecord(id, oldPatch)` reads B and overlays old remote path/resource/publication/read-mode fields onto B.

This can bind imported/replacement metadata to the wrong physical Yandex object.

### Comments

Comment helpers also read a record, compute a new comments array outside the final update transaction, then pass that stale array into `updateJournalEntryRecord`. Cross-tab concurrent comment mutations and replace-import can therefore lose/overwrite newer comment state.

## Required unified fencing model

Before any entry mutation with a delayed phase, capture:

- Journal database generation/revision;
- entry id;
- expected entry revision/version (or immutable locally issued mutation generation);
- operation generation;
- for remote actions, immutable Yandex operation context and exact object identity.

Final local commit must compare those expected values **inside the same IDB readwrite transaction** before update/delete. Mismatch means the old operation is stale: preserve/report remote outcome, but do not mutate replacement Journal state.

For remote side effects, stale local generation cannot undo a side effect that may already have happened. Therefore retain an outcome/tombstone receipt sufficient to reconcile the physical file without resurrecting or deleting the replacement entry.

## Bulk-operation admission contract

Before clear/replace-import commits:

- inspect a durable registry of active/unknown external side effects affecting the requested scope;
- either block/defer the bulk operation until actual settlement, or atomically write cancellation/replacement tombstones that forbid old local finalization while preserving physical-outcome reconciliation;
- scoped clear must only fence operations in that URL/site scope, while full replace/import fences all Journal entry generations;
- imported replacement generation must become authoritative immediately at commit.

Do not rely on a page staying open, page-local busy flags, or in-memory worker variables for this invariant.

## Required regressions

1. Delete A remote move in flight + import B with same id: B is not deleted when A settles.
2. Mark-read A in flight + import B same id: B does not receive A's remotePath/resourceId/read-state patch.
3. Comment edit from tab 1 + comment edit from tab 2: expected-revision conflict is surfaced/retried deliberately; no silent last-writer stale array overwrite.
4. Scoped clear during matching active upload/download/move does not treat checkpoint deletion as cancellation; physical outcome remains reconciliable without Journal resurrection.
5. Scoped clear for unrelated site does not unnecessarily block unrelated active side effects.
6. Full replace-import establishes a new Journal generation and invalidates all older final local commits.
7. Old delete/mark-read outcome receipt remains usable for cleanup/diagnostics without gaining authority over replacement entry.

## Classification

No new P-number created. Extend existing `P0-072` and `P0-076`; preserve `P1-183`, `P1-090`, `P0-074` dependencies.

Previous product test gate was not re-run by this docs-only audit checkpoint.

## Retired source: `AUDIT_DELTA_CONCURRENT_READ_MOVE_LATE_ERROR_RESURRECTS_PENDING_STATE_2026-08-28.md`

SHA-256 of UTF-8 source text: `9b228340c64ad443d190196a30925ab67fad82a56bb6b6253c6a29c7b2125b1f`

# Audit delta — concurrent Mark Read operations can resurrect pending move state after a newer success — 2026-08-28

Source-of-truth `main` before this checkpoint: `eef95543851916b763c62b679f60458c3a884bd3`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-076** per-entry mutation generation/CAS and composes with **P1-090**, **P1-198** and the newly explicit independent ReadMove physical receipt requirement.

The concrete race is stronger than generic lost update: two Journal pages can start Mark Read for the same entry, and a late error handler from operation B can write `readMovePending*` fields back into the row after operation A has already successfully changed it to `readingMode='read'` and cleared pending state.

## Page busy state is local to one Journal document

`journal.js` uses module/page-local:

- `moveReadBusy`;
- `pendingMoveReadEntry`;
- `activeMoveReadOperationId`.

That correctly prevents duplicate clicks inside one page while its operation is active.

It does not serialize two Journal tabs/windows.

Journal A and Journal B can each render the same `readingMode='later'` entry and each confirm Mark Read before either receives a revision refresh.

## Worker has no per-entry exclusive admission for Mark Read

The runtime handler directly calls:

`moveReadLaterEntryToRead(id, operationId)`.

Unlike bulk clear/import, it is not wrapped in a shared exclusive destructive mutation primitive and it does not require an expected entry revision/generation from the page.

Each invocation fresh-reads the entry at its own start, but two invocations can both read the same initial generation before either writes its checkpoint.

## Checkpoint updates are ordinary patch writes without expected generation

`updateJournalEntryRecord(id, patch)` performs:

1. read current row by textual id;
2. spread `{...current, ...patch}`;
3. put result;
4. touch Journal revision.

The caller provides no expected row generation/revision.

Therefore every checkpoint/final/error patch is authorized against whichever row currently occupies the id at that transaction, even when the patch was computed from an older operation snapshot.

## Deterministic A/B race

Initial entry E:

- `readingMode='later'`;
- source S;
- no pending move fields.

Two pages start operations A and B.

### Admission/checkpoint phase

1. A reads E/later.
2. B reads E/later before A finalizes.
3. A locates S, chooses target TA, writes checkpoint fields with operation A.
4. B also locates from its old operation context and writes its checkpoint fields with operation B, overwriting the row-level pending projection.

Without immutable move generations the row can describe only whichever patch wrote last, even though both physical workflows may still exist.

### Late error after success

A particularly concrete final state is:

5. A performs/ verifies S→TA successfully.
6. A writes final entry state:
   - `readingMode='read'`;
   - remotePath under Upload;
   - `movedToReadAt`;
   - clears all `readMovePending*` fields.
7. B's external path fails later, for example because source S already moved.
8. B enters its `catch` with `checkpointWritten=true`.
9. B calls `updateJournalEntryRecord(id, {...readMovePendingAt, readMoveTargetPath, readMoveOperationId:B, readMoveLastError...})`.
10. That helper fresh-reads A's successful `readingMode='read'` row and merges B's old pending/error patch into it.

Final row can therefore be logically contradictory:

- `readingMode='read'` and successful moved metadata from A;
- nonzero `readMovePendingAt`, target and error from failed B.

B's stale error has resurrected an unfinished-move projection after the move already succeeded.

## Why fresh-reading current row makes this worse, not safer

The helper's fresh read prevents blind overwrite of unrelated fields such as A's `readingMode='read'`.

But for mutation authority that means the stale patch is **retargeted onto the newer row**.

The correct behavior after A advances the entry generation is for B's expected-generation comparison to fail and for B to reconcile its own physical receipt separately.

Merging only selected stale fields into current state is not a safe conflict strategy.

## Remote side-effect risk exists before the contradictory row

Both operations may reach external admission unless a per-entry operation lease/generation stops the loser.

Provider/source disappearance may make one fail, but correctness cannot rely on the first move always becoming visible before the second POST is admitted.

Required P1-090 behavior is one exact physical move generation per admitted attempt with deterministic reconciliation. Competing incompatible move attempts for the same source entry should not both be launched from one expected row generation.

## Required per-entry mutation/physical lease contract

When page A authorizes Mark Read it sends the rendered entry receipt required by P0-076.

Worker should atomically admit a move lease/generation MA only if:

- expected entry generation still matches;
- no incompatible current move lease exists for that generation;
- exact remote object/context is bound.

A concurrent B from the same old rendered generation then either:

- receives `busy/existing MA` and can observe/reconcile it; or
- fails stale after A advances the row;
- but never creates an independent conflicting physical move merely from the same textual id.

## Error/final patches must be generation-aware

Every local projection transition needs expected ownership:

- checkpoint created;
- target/source updated;
- error recorded;
- remote verified;
- final `readingMode='read'` commit;
- checkpoint cleanup.

A late B error may append diagnostics to B's own physical receipt/OperationLog, but it cannot mutate A's newer Journal entry generation.

## Independent move receipt eliminates row projection contention

The preceding audit block requires physical move receipt M outside the replaceable Journal row.

With that architecture:

- MA and hypothetical MB remain separate physical records;
- E contains only a pointer/current projection for the generation it owns;
- late MB failure updates MB, not E after E moved to MA-success generation;
- user/recovery UI derives current pending state from an exact pointer/generation relation.

This is preferable to attempting to make `readMovePending*` fields themselves carry every concurrency guarantee.

## Operation receipt/progress composition

A and B currently have distinct random textual page operation ids, so progress modals do not accidentally share a normal id.

P1-198 still requires worker-issued receipts and explicit lineage:

- user operation RA -> move generation MA;
- competing RB either references MA or is rejected/stale.

A late B OperationLog error remains valid historical diagnostics even when its Journal mutation authority is revoked.

## Required deterministic regressions

1. Two Journal pages render same E generation -> both confirm Mark Read -> exactly one physical move lease wins; loser cannot launch incompatible move.
2. A success commits `readingMode=read` -> late B error patch -> E remains free of B pending/error projection.
3. A checkpoint written -> B stale expected revision -> B returns conflict/busy without replacing A target/operation fields.
4. A remote success -> local finalization CAS loses because newer Journal generation exists -> MA becomes detached/verified; no stale row mutation.
5. B error after A success still appears in B OperationLog/physical receipt diagnostics without altering E.
6. Same textual entry id reused by import after A/B start -> neither old operation mutates replacement entry.
7. Worker restart with one valid move lease -> recovery resumes exact M; it does not admit a second attempt from entry id alone.
8. Two pages may both observe the same existing move operation, but only one underlying physical generation is authoritative.
9. Normal single-page Mark Read remains unchanged from user perspective.
10. Page-local `moveReadBusy` stays as UX optimization but is not relied on for cross-page correctness.

## Duplicate check / numbering

No new item is created.

- **P0-076** remains the primary per-entry expected-generation/CAS owner.
- **P1-090** owns exact move attempt/settlement.
- **P1-198** owns live operation receipt/lineage.
- Existing Journal concurrency deltas already require cross-tab mutation fencing; this checkpoint supplies an exact current ReadMove late-error corruption schedule.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_DELETE_FALLBACK_UNKNOWN_MOVE_2026-08-27.md`

SHA-256 of UTF-8 source text: `5234ee355989efedf183ef462c1689f65218e5256d010403ff0d322efb018b1f`

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

## Retired source: `AUDIT_DELTA_DELETE_RETRY_UI_OPERATION_SAGA_DISCONTINUITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `f92f7512087da3677ed7e6b033f65b945bd8f1033de03e6a4f2f06d9065a3593`

# Audit delta — Delete→Trash Retry UI starts a fresh operation identity instead of resuming the prior move saga — 2026-08-28

Source-of-truth `main` before this checkpoint: `a4be2861778f77f7b414c55bb064f0c315e848ca`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source proof strengthens the existing **P1-183/P1-090** Retry requirement and composes with **P1-198/P1-210**, **P0-076**, **P0-074** and **P0-069**.

The previous delete-fallback audit already states the required behavior: Retry after an unknown Trash move must consume/reconcile the same durable operation generation and exact target before any new move is admitted. This checkpoint proves that the current Journal UI does the opposite at its correlation boundary: **every Retry click creates a new operation id before sending the same stale entry/diskAction again.**

## Current Retry is wired as a new invocation

`deleteRetry` is permanently wired to:

`runDeleteOperation(deleteRetryAction)`.

`runDeleteOperation(diskAction)` begins from the page's retained `pendingDeleteEntry` and, on every invocation, executes:

`activeDeleteOperationId = crypto.randomUUID() ...`

It then sends:

`WEBCLIP_JOURNAL_DELETE { id: entry.id, diskAction, operationId: activeDeleteOperationId }`.

Therefore Retry is not represented as `resume/reconcile prior delete generation A`. It is represented as another newly labeled delete operation B against the same textual entry id.

## The error UI retains action kind, not a durable physical-move receipt

After an error current Journal state retains enough information to show:

- the entry object in `pendingDeleteEntry`;
- `deleteRetryAction`, commonly `trash`;
- the textual operation id of the failed attempt for display.

But the Retry callback does not return an exact move-attempt receipt to the worker.

It supplies only the new B operation id + entry id + action.

The worker therefore has no page-provided way to know that B is specifically a reconciliation continuation of physical move attempt A rather than a new independent delete request, except by future durable subsystem state that has not yet been implemented.

## Trash target is recomputed inside each worker invocation

Current Trash flow calls `moveJournalYandexFileToTrash(entry, operationId)`.

The collision-resolved target is chosen in memory. `chooseYandexTrashTarget()` can generate timestamp-suffixed names such as:

`<base>__deleted_<YYYY-MM-DD_hh-mm-ss>...<ext>`.

There is still no durable exact target checkpoint before `POST /resources/move` as required by P1-183.

Thus a fresh Retry invocation B may compute a different target from A simply because time/current Trash contents changed.

## Deterministic two-target schedule

1. User starts Trash A for entry E.
2. A chooses target T1, including a collision suffix if needed.
3. `POST resources/move S -> T1` is transmitted.
4. Yandex commits or may commit the move, but WebClip loses/times out waiting for authoritative settlement.
5. Journal shows error + Retry.
6. User clicks Retry.
7. `runDeleteOperation('trash')` creates brand-new textual operation id B.
8. Worker starts a fresh delete lifecycle for E rather than receiving `resume A / reconcile T1`.
9. If source lookup still resolves or provider state is ambiguous, current target selection can choose T2 under a later timestamp/collision state.
10. WebClip has now lost the one-to-one relationship between the first unknown physical move and its target.

The provider may make some branches fail because S already disappeared, but correctness cannot rely on that incidental result. Unknown settlement requires exact first-target reconciliation before any new destructive admission.

## New `operationId` is useful for a new user operation but insufficient for saga continuity

It is reasonable for a second visible click to receive a fresh P1-198 user/live operation receipt RB for diagnostics.

The error is not `Retry must reuse the same human-readable operationId forever`.

The required model is:

- physical delete/move saga A keeps immutable receipt MA with source S, exact target T1, object identity, namespace and privacy state;
- Retry user operation RB explicitly references `reconcile/resume MA`;
- RB first performs reconciliation of MA;
- if MA is proven successful, RB can finish local Journal work without a new move;
- if MA is authoritatively proven not to have happened, RB may admit a distinct new physical move MB with a new exact target;
- MA is never relabeled or overwritten as RB.

This matches the operation-receipt lineage delta recorded earlier in this session.

## Retained page entry is also stale authority

`pendingDeleteEntry` remains the entry object captured when the dialog was opened.

The separate destructive-confirmation-lifetime audit already requires expected Journal/entry revision CAS because another page/import can replace the textual id while the dialog remains open.

Retry compounds that issue: a Retry click after a long error interval must carry both:

- exact prior move saga receipt to reconcile;
- expected Journal entry generation/authorization for any local finalization or new destructive attempt.

Fresh-reading current entry by id cannot silently retarget the old saga/user confirmation to a replacement object.

## Retry action classification must come from worker settlement state

Current UI stores `deleteRetryAction` as the requested action string.

Future design must not decide retry policy solely from `diskAction='trash'` plus generic error.

Worker result should expose a durable class such as:

- `pre-side-effect-failure`;
- `move-outcome-unknown / reconcile MA`;
- `move-verified / Journal-finalization-pending`;
- `privacy-unpublish-outcome-unknown`;
- `stale Journal generation`;
- `detached/manual-resolution`.

The Retry button then invokes the allowed continuation for the exact receipt rather than rerunning the original high-level command from scratch.

## Page loss/reopen

Because the physical move receipt must be durable, closing/reloading Journal after error cannot make a future Retry start from only entry id.

A replacement page needs the P1-210 discovery surface to find the unresolved delete saga for E/generation and present `Continue verification`/manual state.

If no exact receipt can be recovered, fail closed; do not recreate a destructive target by guessing from the current Journal row.

## Publication composition

If E was published, the delete saga also owns the explicit keep-public/unpublish outcome required by P0-069.

Retry B must not lose that privacy decision merely because it gets a new visible operation receipt. The prior physical/privacy saga remains parent state until both publication and move/local-finalization outcomes are classified.

## Required deterministic regressions

1. A chooses T1 -> move response lost -> Retry B: B reconciles exact T1 before selecting/sending any T2.
2. A physically succeeded -> B proves same object at T1 and performs only remaining local/privacy finalization; no second move.
3. A authoritatively did not start -> B may create a new physical move generation with its own durable target before POST.
4. UI gives B a fresh user operation receipt -> OperationLog shows B reconciled A rather than relabeling A's physical move.
5. Page reload between A error and Retry -> exact A saga remains discoverable or Retry fails closed; it does not start by entry id alone.
6. Import replaces entry id E between A and Retry -> A can be reconciled detached but cannot delete/move replacement E/B.
7. Reauth/root change between A and Retry -> A remains bound to historical namespace; B cannot reconcile A by current account/root substitution.
8. Published source -> unpublish/move unknown state survives Retry identity change.
9. Multiple user clicks while A outcome unknown coalesce onto one reconciliation owner; they cannot create multiple physical moves.
10. A deterministic provider rejection before side-effect admission produces a safe new-attempt state without retaining a false unknown move.

## Duplicate check / numbering

No new item is created.

- **P1-183** owns durable Delete→Trash source/target saga.
- **P1-090** owns exact move settlement/object identity.
- **P1-198/P1-210** own user-operation receipt lineage and unknown-result retry/reconciliation surface.
- **P0-076** owns stale Journal entry-generation authority.
- **P0-074/P0-069** own Yandex namespace and publication/privacy lifecycle.

This checkpoint adds concrete current-UI proof that Retry starts with a new operation identity and no continuation receipt; it does not duplicate the broader fallback finding.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_DESTRUCTIVE_CONFIRMATION_RECEIPT_LIFETIME_2026-08-28.md`

SHA-256 of UTF-8 source text: `adaf6dbdefa3d7c49c9c707dbc2a7b5f270e57dec8184ddd1fb9997cfcbbe53b`

# Audit delta — destructive confirmation receipt lifetime — 2026-08-28

Source-of-truth `main` immediately before this write: `62d407f9cdbe314ea8a90de0f5812d1228a8557d`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P0-076** (exact Journal/entry generation for delayed destructive mutation), with **P1-206** as the rendered-view dependency and **P1-198/P1-210** as operation/result dependencies.

The existing rendered-revision audit already proves a stale card can authorize a mutation against a newer record with the same textual id. This pass isolates a stronger and independently testable capability boundary: **the destructive confirmation dialog itself has a lifetime and currently remains valid after the Journal generation it described has changed.**

No new root cause is needed.

## Current confirmation owner is an object reference, not an authoritative generation receipt

`journal.js::openDeleteDialog(entry)` stores:

- `pendingDeleteEntry = entry`;
- resets `activeDeleteOperationId`;
- renders the destructive dialog from the entry the user saw.

This is a useful UI snapshot, but it is not a mutation receipt. The entry object has no authoritative expected Journal/entry generation that the worker will compare transactionally.

The same page also keeps `pendingMoveReadEntry` for the Mark Read confirmation/progress workflow.

## Journal revision changes do not revoke an already open confirmation

The page listens to `chrome.storage.onChanged` for `webclipJournalRevision` and calls `scheduleJournalReload(...)` when the token changes.

That is eventual screen convergence only. The revision listener does not invalidate:

- `pendingDeleteEntry`;
- `pendingMoveReadEntry`;
- an already visible delete confirmation;
- an already accepted Mark Read confirmation generation.

Therefore an old destructive control surface can remain actionable while a reload is pending or after the underlying Journal state has already changed elsewhere.

## Proceed sends only textual entry id

For a Yandex delete/trash operation, the page eventually sends:

`WEBCLIP_JOURNAL_DELETE { id: entry.id, diskAction, operationId }`.

For local-only deletion it likewise sends only `id`, `diskAction:'keep'` and `operationId` after ordinary confirmation.

Mark Read is similarly id-addressed.

The worker then resolves the current entry by id. A fresh current read is internally consistent but does not prove the user confirmed that current generation.

## Deterministic confirmation-lifetime race

1. Page P renders Journal entry `J/A` and the user opens the Yandex Delete dialog.
2. `pendingDeleteEntry` now describes A; the dialog text/choice is the user-visible authorization surface for A.
3. Before the user presses Proceed, another Journal page or replace-import commits generation B, reusing textual id `J` for a different entry/object.
4. `webclipJournalRevision` changes and P schedules an asynchronous reload, but the existing dialog is not revoked as a mutation capability.
5. User presses Proceed in the still-visible A dialog.
6. P sends only `id=J`.
7. Worker fresh-reads current `J/B` and may perform local deletion or Yandex locate/move against B.
8. The user's explicit destructive confirmation for A has been retargeted to B.

This schedule remains valid even if normal card rendering becomes perfectly coherent under P1-206, because the Journal may change **after** the confirmation is opened.

## Why page reload alone is not a fix

Closing/re-rendering the dialog promptly on a revision notification is desirable UX, but notification delivery is advisory and asynchronous. Correctness cannot depend on the page receiving a storage event before the click.

The worker must reject stale authority even when:

- the storage event is delayed;
- the page is busy;
- the dialog click races the reload timer;
- two extension pages act concurrently;
- replace-import reuses the same textual entry id.

## Required P0-076 refinement

### Confirmation receipt

When a destructive confirmation surface is opened, bind it to the exact actionable generation the user is seeing. At minimum the receipt should contain or reference:

- Journal revision/generation;
- immutable entry generation/revision;
- entry id as lookup/display identity only;
- exact remote-object binding generation for Yandex entries when applicable;
- operation kind (`delete-local`, `trash`, `mark-read`, etc.);
- page/UI confirmation generation or nonce.

### Worker-side admission

Proceed must return the exact confirmation/entry receipt. Before **any** external Yandex mutation or local destructive commit, the authoritative transaction verifies that the expected entry generation still matches.

Mismatch is a stale/conflict outcome:

- no Yandex move/delete/publish side effect starts;
- no replacement local entry is deleted;
- page refreshes and requires a new explicit confirmation for the new generation.

### UI invalidation

On observed Journal revision change, the page should invalidate existing confirmation capabilities immediately where possible:

- disable/close Delete/Mark Read confirmation;
- clear `pendingDeleteEntry` / `pendingMoveReadEntry` or mark their receipt stale;
- never silently relabel an open confirmation onto freshly loaded data.

This is defense in depth. Worker CAS remains authoritative.

### In-flight operation boundary

Once an external destructive operation has been admitted under a valid receipt, a later Journal change cannot pretend the external side effect never happened. Preserve the exact operation/remote recovery receipt and reconcile it without retargeting to the replacement entry. This composes with P1-090/P1-183/P1-184 and P1-210.

## Positive controls to preserve

- `journalDeleteBusy` and `journalDestructiveOperationInFlight` reduce same-page duplicate actions.
- Storage/runtime revision notifications trigger eventual reload.
- Worker fresh-reads current records instead of trusting arbitrary full entry payloads from the page.

These are useful, but none substitutes for expected-generation authorization.

## Required regressions

1. Open Delete dialog for `J/A` -> replace-import commits `J/B` -> click Proceed before reload -> worker rejects stale A receipt; B is untouched.
2. Same race after the page receives the revision event but before its reload finishes -> old dialog is disabled/revoked and worker still rejects if click races UI invalidation.
3. Same race for local-only Delete -> replacement B is not removed.
4. Same race for Mark Read -> replacement B is not moved on Yandex Disk.
5. Same textual id reused with a different `resourceId/remotePath/accountUid` -> old confirmation never authorizes the new remote binding.
6. Revision changes but the exact entry generation is provably unchanged according to the chosen model -> product may require refresh conservatively or permit a narrowly proven unchanged receipt, but must never infer this from id alone.
7. Two pages open confirmations for the same generation; first destructive action commits/advances entry generation -> second confirmation becomes stale before another side effect begins.
8. External mutation is admitted validly, then local Journal is replaced before result -> exact recovery evidence survives and late result cannot mutate the replacement entry by textual id.
9. Normal unchanged-generation Delete/Trash/Mark Read continues to work with one confirmation.
10. P1-206 coherent rendering remains required; a confirmation receipt cannot retroactively make an incoherent screen trustworthy.

## Duplicate check

- **P0-076** owns exact Journal/entry generation and stale destructive finalization/admission.
- **P1-206** owns coherent rendered revision.
- **P1-198** owns worker-issued operation identity, not entry-state authorization.
- **P1-210** owns unknown outer result reconciliation after admission.
- **P0-073/P0-074/P1-184** own Yandex namespace/object identity and do not replace the local user-confirmation generation.

No P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `626d03040f0f8ec27361973bdb23fa9f32306bf1c3f52e8c36611957e03d0f7e`

# Audit delta — destructive publication lifecycle — 2026-08-27

Baseline HEAD before this audit block: `ca3fac175dfd8f88de510d16b8373b52635ddb5c`.

This is a lossless audit checkpoint only. It does not claim canonical registry synchronization and does not modify production runtime or `manifest.json`.

## Scope

Fresh audit of published Yandex objects and single-entry Journal deletion, focused on existing `P0-069`, `P1-164`, `P1-183`, `P1-090`, plus compatibility with `P0-022` and `P0-074`.

## Confirmed runtime facts

1. `journal.html` offers only two Yandex delete choices:
   - keep the file on Yandex Disk and delete only the local Journal entry;
   - move the file into WebClip `Trash/MM-YYYY` and delete the local Journal entry.
   The dialog does not distinguish a published entry and does not warn that a public link can remain usable after the local management reference disappears.

2. `deleteJournalEntry()` likewise has only `diskAction = keep | trash`. It records `hasPublicUrl` in OperationLog metadata but performs no publication decision/revocation flow. For `trash`, it calls `moveJournalYandexFileToTrash()` and then unconditionally deletes the local Journal record after that helper reports success. For `keep`, it immediately proceeds to local deletion.

3. Current `service-worker.js` contains no `/resources/unpublish` call at all. Therefore P0-069/P1-164 are not partially hidden behind another helper: unpublish lifecycle is genuinely absent.

4. `moveJournalYandexFileToTrash()` has no durable delete-move target checkpoint before the destructive `POST /resources/move`. The target path is computed in memory. This reconfirms `P1-183`: MV3 termination after the remote move but before local finalization can leave a stale Journal entry with no exact durable chosen target, especially when the collision path uses a generated `__deleted_<timestamp>` suffix.

5. Post-move verification polls `GET /resources` for `targetPath` and accepts success when the returned target is merely `type === file`. It does not compare the target `resource_id` with the immutable source object identity. This reconfirms `P1-090`: a target-path collision/replacement can be adopted as the result of the move.

6. A local 15-second timeout from `POST /resources/move` exits before the target verification loop. Since timeout is not cancellation, the move can have settled remotely while this attempt does not reconcile it. This remains part of P1-090/P1-183 rather than a new item.

## P0-069 acceptance refinement

Published-object deletion needs a privacy outcome before the local entry can disappear.

For any entry with a currently known/confirmed publication state, the delete UI must explicitly show that state and require an explicit user decision:

- **revoke publication first** — durable/reconciled `resources/unpublish`, then verify that publication is absent, then continue with keep/trash and finally local deletion; or
- **keep public access intentionally** — explicit acknowledgement that the public link may continue working and WebClip will no longer manage it from this Journal entry.

No hidden automatic bulk/single-entry unpublish. Unknown unpublish settlement must retain a durable privacy checkpoint and must not blind-retry a non-idempotent/unknown side effect merely because the UI timed out.

The local Journal entry must not be deleted while the user-selected privacy outcome is unresolved.

## P1-164 acceptance correction

The current canonical P1-164 wording says that after confirmed unpublish WebClip should clear both `publicUrl` **and stable `resourceId`**, preserving only `remotePath` so the entry becomes path-only.

That requirement conflicts with the stronger object-identity contracts already established by P1-090/P0-022.

A confirmed unpublish changes publication state; it does not by itself justify discarding the stable identity of the file. If WebClip deliberately clears `resourceId`, a later replacement file created at the same path can be accepted by the path-only locator and then moved/deleted as though it were the original object.

Required correction:

- after confirmed unpublish, clear `publicUrl` / publication state;
- preserve the proven `resourceId` whenever the API supplied it and the object identity is still valid;
- only degrade to a weaker legacy/path-only state when the API genuinely cannot provide/retain stable identity, and then destructive operations must use the stricter P0-022 fail-closed/rebind rules rather than automatic path authority.

Badge/open-file UX can still use authenticated exact-path access when public URL is absent, but path must not silently replace stable identity for destructive capability.

## P1-183 durable checkpoint contract

Before `resources/move` to Trash, persist a versioned delete checkpoint containing at minimum:

- Journal entry id + Journal generation / expected entry revision;
- operation generation / operationId;
- immutable account/root/auth-config context required by P0-074;
- exact source path;
- proven source `resourceId` (or explicitly weaker legacy proof class);
- exact chosen target path, including collision-generated name;
- publication state / selected privacy outcome and unpublish reconciliation state when applicable.

On retry/restart: verify target and source first; do not choose a second target or issue another move until the first outcome is classified.

Import/clear generation replacement must prevent an old delete checkpoint from deleting a replacement entry (P0-076).

## P1-090 post-move proof

Before move, snapshot immutable source identity. After move/unknown settlement, success requires the target to prove the same object identity (`resource_id` exact match; only already-defined legacy secondary proof where the API actually omits resource_id). A target file existing at the expected path is not sufficient.

When source and target observations conflict or identity cannot be proved, keep the checkpoint/entry and fail closed.

## External API verification

Current Yandex documentation still exposes distinct `publish` and `unpublish` operations; publication is a separately managed property/action, not a reason to erase the underlying file's local stable identity. No production assumption was made here about undocumented resource-id mutation across unpublish; real Yandex E2E remains required before implementation closure.

## Classification

- No new `P0-079`, `P1-197` or `P2-020` created.
- Extend/refine existing: `P0-069`, `P1-164`, `P1-183`, `P1-090`.
- Preserve dependencies: `P0-022`, `P0-074`, `P0-076`.

## Required regressions before closure

1. Published entry + `keep`: local deletion is blocked until user explicitly acknowledges retained public access or chooses revoke.
2. Published entry + revoke: local entry remains until unpublish outcome is proven; timeout/unknown does not blind-retry or falsely report private.
3. Confirmed unpublish clears publication URL/state but preserves stable `resourceId` when available.
4. Delete→Trash persists exact collision-resolved target before POST; worker restart resumes by verifying the same target.
5. Target path containing a different `resourceId` is rejected even if `type=file`.
6. POST timeout followed by exact original resource at target finalizes safely; conflicting source/target retains checkpoint.
7. Import/clear replacing the Journal entry invalidates stale delete finalization by generation/revision.

Previous product test gate is not re-run by this docs-only audit checkpoint.

## Retired source: `AUDIT_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md`

SHA-256 of UTF-8 source text: `69b6a59409d0ffcdac1db5c4685f9e3021a47800c87f689e79a8bd60d2a4a29b`

# Audit delta — Journal clear/import generation invalidation vs external recovery evidence — 2026-08-27

Source-of-truth `main` immediately before this write: `f81f02c25455f02a862c4367095edc241188fb5b`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P0-076** — stale pre-clear/import work must not mutate replacement Journal state; exact Journal generation / entry revision fencing is required;
- **P0-039** — the sole local-download unknown-outcome recovery identity must not be destroyed on insufficient negative proof;
- **P1-184** — remote upload/object recovery must retain exact physical operation/content identity until outcome is proved;
- **P1-183/P1-090** where destructive Yandex moves are involved: irreversible remote effects require durable exact recovery receipts;
- **P0-079/P1-198** as adjacent operation/PDF-generation ownership primitives.

The missing invariant is separation of two authorities that current pending stores conflate:

1. **authority to append/finalize metadata into the current Journal generation**;
2. **durable identity of an already admitted external side effect that may settle after that Journal generation is replaced**.

Clear/import must revoke (1). They must not automatically erase (2).

## Existing positive control — stale append is intentionally blocked

Current `appendJournalEntryFromDurableCheckpoint()` requires the specified durable checkpoint to still exist when Journal append commits.

The local-download recovery audit already records this as a positive control: if clear/import intentionally removed the checkpoint, delayed old metadata is not resurrected into the new Journal.

That behavior is correct and must remain.

The fresh defect is what happens to the external side-effect recovery identity when the same checkpoint is physically removed to achieve that stale-append block.

## Fresh source proof

### 1. Full Journal clear physically clears external-operation checkpoints

The full clear transaction opens:

- Journal entries store;
- generic pending appends;
- `pendingDownloads`;
- `pendingRemoteSaves`;
- Journal meta/revision state.

For all-Journal clear (`!urlKey && !siteKey`) current code performs:

- `store.clear()`;
- `pendingStore.clear()`;
- `pendingDownloadStore.clear()`;
- `pendingRemoteStore.clear()`.

The Journal revision is touched in the same transaction, which correctly invalidates old Journal state.

But `pendingDownloads` and `pendingRemoteSaves` are not merely speculative Journal metadata. They can be the only durable receipt for Chrome Downloads / signed Yandex side effects already admitted before clear.

### 2. Domain/site clear also prunes matching external checkpoints

For scoped clear, the same transaction calls `prunePending(...)` over:

- pending Journal checkpoints;
- pending local-download checkpoints;
- pending Yandex checkpoints.

Thus a site/domain clear can remove recovery identity for an operation associated with the cleared URL/site while its external side effect remains physically in progress or has unknown settlement.

### 3. Import-replace unconditionally clears all pending external checkpoints

`commitStagedJournalImport()` performs the atomic replacement transaction and explicitly executes:

- `JOURNAL_PENDING_STORE.clear()`;
- `JOURNAL_PENDING_DOWNLOAD_STORE.clear()`;
- `JOURNAL_PENDING_REMOTE_STORE.clear()`;
- `touchJournalDbRevision(tx, 'import-replace')`;
- clear old Journal + copy staged entries.

The exact atomic replace of Journal entries is desirable.

However every pre-import local-download/Yandex-save checkpoint disappears regardless of whether its external operation:

- has not started;
- is in-flight;
- timed out locally with unknown settlement;
- physically settled but terminal event/response has not yet been processed;
- needs post-restart reconciliation.

### 4. Clear/import can race with operations because the bulk guard does not own save side effects

The existing bulk destructive guard serializes clear/import against each other, but ordinary PDF save/download/upload flows are separate long operations.

A legal schedule therefore exists:

1. save A writes durable local-download or remote-save checkpoint;
2. irreversible Chrome download / signed Yandex PUT is admitted;
3. before physical outcome is processed, user confirms Journal clear or import-replace;
4. bulk transaction removes A's pending checkpoint and advances/replaces Journal generation;
5. external side effect A completes later.

At step 4, WebClip has correctly decided that A must not append into the new Journal generation. It has **not** proved that A's physical side effect did not happen or no longer needs reconciliation.

### 5. Local download late completion becomes intentionally non-finalizable — but also non-recoverable

If the known DownloadItem later reaches `complete`, the append helper observes that the required checkpoint no longer exists and refuses to append old metadata. This prevents stale Journal resurrection.

But because clear/import deleted the same receipt, WebClip has also lost the durable mapping among:

- intended old Journal entry/generation;
- exact `downloadId` / unresolved start receipt;
- requested/resolved filename evidence;
- expected PDF generation/content receipt;
- operation identity and diagnostic state.

The physical file can therefore exist after clear/import without any retained authoritative receipt explaining that it was an old-generation operation intentionally detached from the Journal.

This is not fixed by saying "the user cleared the Journal": clearing metadata authority is not authoritative proof that a browser download did not physically happen.

### 6. Yandex upload has the stronger unknown-settlement consequence

For signed Yandex upload, current architecture deliberately creates `pendingRemoteSaves` before irreversible transfer because local timeout/worker restart is not remote cancellation.

Import/full clear can remove that checkpoint while the remote object is still in-flight or unknown.

A later physical upload may therefore leave an object on Yandex with no retained exact recovery generation by which WebClip can:

- prove whether it settled;
- prove exact object/content identity;
- distinguish it from a same-path/equal-size other object;
- record it as an intentionally detached old-Journal-generation side effect;
- safely clean/reconcile according to product policy.

The previously audited `remoteSaveGenerationId` problem makes this even more important, but the defect exists even after generation-aware remote rows are implemented if bulk replacement simply deletes every old generation.

### 7. "Checkpoint missing" currently conflates cancellation with evidence loss

`appendJournalEntryFromDurableCheckpoint()` treats missing required checkpoint as the reason not to finalize. That is appropriate for current-Journal authority.

But one missing bit now represents several materially different states:

- operation never admitted / intentionally cancelled before side effect;
- clear/import invalidated its Journal generation;
- checkpoint was lost/evicted/corrupted;
- maintenance erroneously removed unknown-outcome evidence;
- another concurrent generation deleted/replaced the row.

P1-194 already shows that recovery durability needs richer states than a boolean. This checkpoint adds a related lifecycle requirement: **generation invalidation must be represented explicitly, not by destroying the physical-operation receipt.**

## Required architecture

### Separate Journal commit capability from physical side-effect receipt

Every irreversible save/move operation should have an immutable physical receipt/generation that can outlive the Journal generation that originally requested it.

That physical receipt binds the exact external operation and content/object/download identity.

Separately, a Journal-finalization capability references:

- expected Journal database generation;
- expected entry id/revision where relevant;
- physical side-effect receipt.

Clear/import revokes or makes stale the Journal-finalization capability. It does not erase the physical receipt while the external outcome remains unresolved.

### Bulk replace transition

When clear/import commits a new Journal generation, old active/unknown external receipts should transition atomically to a bounded state such as:

- `detached-stale-journal-generation`;
- `external-outcome-pending` / `external-verified-detached`;
- dead-letter/manual-resolution as appropriate.

They become forbidden sources for automatic append into the replacement Journal, but remain available for exact reconciliation/diagnostics.

A compact generation tombstone/pointer is acceptable if it retains all identity needed to prove the external outcome; copying large payload metadata indefinitely is not required.

### Local download behavior

After clear/import invalidates old Journal authority:

- known DownloadItem completion may be reconciled to the detached receipt;
- no old Journal entry is recreated automatically;
- the system can truthfully record "old-generation download completed after Journal replacement";
- exact physical filename/content/operation evidence remains bounded until terminal outcome is known;
- unresolved history/search cases remain governed by P0-039/P0-048 rather than being silently erased.

### Yandex behavior

After Journal replacement:

- in-flight/unknown remote save generation remains namespace/content/attempt-bound;
- late remote settlement is reconciled exactly under P0-073/P0-074/P1-184;
- it cannot append into replacement Journal state without an explicit new product action/rebind contract;
- remote cleanup must not be guessed/blindly destructive solely because its originating Journal generation was cleared.

### Destructive move behavior

The same principle applies to durable delete/mark-read move receipts once P1-183/P1-090 are fully implemented: replacing Journal state may invalidate the local mutation target, but cannot erase the exact source/target remote-move receipt before outcome reconciliation.

### Bounded retention

This is not a request for an unbounded archive of old operations.

Use explicit global/per-class caps, phase-aware TTL/dead-letter policy and pressure handling. But retention expiry/eviction must preserve sufficient outcome identity or make loss explicit; it must not falsely convert unknown external settlement into "nothing happened".

## Clear semantics / user intent

The product may reasonably define Journal clear/import as "do not allow older operations to repopulate the replacement Journal." This checkpoint preserves that behavior.

It is a separate product decision whether an already-started external file/upload should be shown to the user as detached, offered for cleanup, or merely retained as diagnostic reconciliation evidence.

What is not safe is using deletion of the Journal checkpoint as if it also proved cancellation of an already admitted non-cancellable external side effect.

## Deterministic regression matrix

1. Local save checkpoint committed -> `downloads.download()` admitted -> full Journal clear -> DownloadItem completes: no old Journal append, but exact detached download receipt remains until terminal reconciliation.
2. Same with site/domain clear targeting that save's URL/site.
3. Local download start has unknown/late `downloadId` settlement -> import-replace occurs -> late start receipt cannot append into new Journal but remains diagnosable/reconcilable.
4. Yandex prepared remote checkpoint -> signed PUT admitted -> import-replace -> transfer settles late: old remote generation remains exact and cannot append into imported Journal.
5. Yandex PUT response lost -> clear all -> worker restart -> exact old remote object can still be reconciled as detached rather than becoming an orphan with no receipt.
6. Remote upload is proven not to have started: only then may its physical receipt be retired according to policy; clear itself is not that proof.
7. Clear/import happens before irreversible side-effect admission: generation fence prevents that old operation from starting the external side effect after its Journal authority was revoked.
8. Clear/import happens after side-effect admission but before completion: physical operation may settle, but final Journal capability is stale.
9. Imported backup contains the same entry id as old operation: late old completion never mutates/replaces that imported entry.
10. Two remote-save generations exist for one Journal id: bulk replace marks both old Journal capabilities stale without collapsing/deleting unresolved physical generations.
11. Storage pressure exercises detached-receipt cap: oldest safely terminal receipts may be pruned; genuinely unknown/in-flight receipt is not silently represented as no side effect.
12. OperationLog clear does not affect physical receipt authority; logs remain diagnostic only.
13. Browser restart between bulk replace and late external settlement preserves detached recovery evidence within the defined durability class.
14. Normal clear/import with no active/unknown external operations behaves as today and does not retain unnecessary large payloads.

## Duplicate check / numbering

No new number is created.

- **P0-076** remains the primary Journal-generation/finalization owner.
- **P0-039/P0-048** own local-download unknown-outcome identity and safe binding.
- **P1-184** owns exact remote object/content proof.
- **P1-183/P1-090** own durable exact destructive-move outcome receipts.
- **P0-079/P1-198** provide immutable physical operation/content ownership.

Existing remote-save-generation audit already requires clear/import to leave old external outcomes diagnosable while preventing stale append. This checkpoint extends that invariant explicitly across **all bulk clear/import checkpoint deletion paths, including local downloads**, and identifies the current physical `clear/prune` mechanism that violates it.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.

## Retired source: `AUDIT_DELTA_JOURNAL_REPLACE_VERIFIED_PUBLIC_OBJECT_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `3c7e549f27e29f386502547ff9f85d2aea2cd0a6dcd989176c6e64648d93deec`

# Audit delta — Journal replace/clear vs verified published remote receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `13f7adf998ae90dadc06e2db35085ff9d1471834`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh proof strengthens the existing Journal-replacement recovery-evidence contract owned by **P0-076**, with **P1-184** remote object proof and **P0-069/P1-164** publication-management lifecycle.

Earlier audit already proves clear/import physically clears `pendingRemoteSaves` even when an external upload is in-flight/unknown. This pass isolates the stronger privacy case: the removed row can already be **`remote-verified` and published**, while the corresponding Journal append has not yet committed.

No new root cause is needed.

## Current full clear removes every remote checkpoint phase

Full Journal clear opens `pendingRemoteSaves` in the same bulk transaction and executes:

`pendingRemoteStore.clear()`.

Import-replace likewise clears the pending remote store as part of replacing Journal contents.

There is no phase distinction at this bulk invalidation boundary. Rows are removed whether they are:

- PREPARED/in-flight/unknown;
- stale-unverified;
- or `remote-verified` awaiting local Journal finalization/cleanup.

## `remote-verified` contains stronger physical truth than a speculative append

A remote-save row reaches `remote-verified` only after the workflow has obtained/checked remote metadata and persisted object fields such as:

- exact remote path;
- expected/observed byte evidence;
- `resourceId` when returned;
- `publicUrl` / observed publication state when present;
- account/root metadata in the current incomplete generation model.

Even though P1-184 still requires stronger exact content/attempt proof, this row is materially stronger than “upload may happen.” It is intended to survive the crash window between remote success and local Journal commit.

Deleting it during clear/import discards known external state, not merely cancellation intent.

## Deterministic verified-public orphan schedule

1. Save A uploads PDF to Yandex.
2. `createPublicLinks=true`; publication completes and remote metadata exposes public URL P / resource identity R.
3. WebClip durably marks A `remote-verified` with the remote object/publication receipt.
4. Before A's Journal entry is atomically appended and checkpoint cleaned, user confirms full Journal clear or import-replace.
5. Bulk transaction intentionally advances/replaces Journal generation and executes `pendingRemoteStore.clear()`.
6. A's Journal finalization correctly loses authority under P0-076 and must not repopulate the replacement Journal.
7. But the verified remote/public object already exists and may remain publicly accessible.
8. The only purpose-built durable receipt relating that object/public URL to A has now been deleted.

The result can be a real published WebClip object with no current Journal entry and no retained exact management/reconciliation receipt.

## Why this is a privacy-management issue

P0-069 already requires an explicit publication outcome before a managed Journal reference disappears during destructive deletion.

Bulk clear/import has a related but distinct lifecycle shape:

- the object may not yet have obtained a Journal entry at all;
- nevertheless WebClip has already created/published it and has a verified pending receipt;
- replacing Journal data should revoke append authority, but it should not silently forget the published object's management identity.

A user action to clear/replace Journal is not automatically an explicit acknowledgement that every already-started, not-yet-journaled public link should remain unmanaged forever.

## Required detached verified-receipt transition

When clear/import invalidates a `remote-verified` generation, transition the physical receipt to a bounded detached state instead of deleting it.

Conceptually include:

- exact remote-save generation;
- originating old Journal generation/id;
- account/root/auth/config operation context;
- exact remote object/content receipt;
- observed `publicUrl` / publication state;
- publication-policy generation/attempt receipt;
- reason for detachment (`journal-clear`, `import-replace`, scoped clear);
- timestamp and management/reconciliation status.

The detached receipt has **no authority to append into the new Journal generation**. It exists to preserve external truth and enable safe diagnostics/explicit management policy.

## Published vs private remote-verified objects

A verified private object still needs detached exact-object evidence for truthful reconciliation.

A verified published object additionally needs explicit privacy handling. Product policy may choose among bounded options such as:

- surface a detached-public-object warning/management list;
- require explicit keep-public acknowledgement before an operation that would erase the last management reference;
- offer a later exact unpublish/manage action under P0-069/P1-164;
- retain compact local evidence even if no automatic cleanup is attempted.

Do not automatically unpublish/delete remotely as part of Journal import/clear unless the product explicitly defines and confirms that destructive policy; bulk local data replacement and remote destruction are separate authorities.

## Scoped clear

Site/domain clear has the same rule for matching remote checkpoints.

If a matching remote generation is already verified/published, scoped clear may invalidate its old Journal append capability but must not erase the external/public identity solely because the site's local records were removed.

## Late physical completion

If clear/import occurs while phase is still PREPARED/unknown and the upload/publish settles later, the receipt transitions from detached-unknown to detached-verified/public once exact reconciliation succeeds.

The system must not require the old Journal entry to exist in order to learn the physical truth.

## Required regressions

1. Remote-verified private A -> full clear before Journal append -> no stale append; detached exact remote receipt survives.
2. Remote-verified published A/P -> full clear -> public/object receipt survives as detached management evidence; P is not silently forgotten.
3. Same sequence with import-replace containing an entry with the same textual id -> old A cannot attach to imported entry; detached receipt remains generation-exact.
4. Scoped site clear removes originating Journal authority but preserves matching verified public receipt separately.
5. PREPARED unknown -> clear -> later remote verify discovers public URL -> detached receipt can record it without repopulating Journal.
6. Published object -> explicit later unpublish management -> exact object/publication receipt is used; successful unpublish clears publication state but preserves object identity per P1-164 correction.
7. User explicitly chooses a future “forget detached object” action -> wording distinguishes forgetting local evidence from proving remote deletion/unpublish.
8. Detached receipt capacity is bounded; pressure does not turn a dropped receipt into a false claim that no public object exists.
9. OperationLog clear has no effect on detached physical/public receipt authority.
10. Normal remote save whose Journal append completes before clear cleans its active checkpoint normally; ordinary existing Journal deletion then follows P0-069 policy.
11. Clear before external side-effect admission prevents old generation from starting upload/publish after its local authority was revoked.
12. Clear after publish admission but before outcome proof retains exact publication-attempt reconciliation state.

## Duplicate check

- **P0-076** primary: clear/import revokes old Journal finalization authority.
- **P1-184** owns exact remote physical object/content receipt.
- **P0-069/P1-164** own publication management/unpublish lifecycle before losing the last useful management reference.
- **P0-078** owns whether a new publish side effect was authorized; it does not authorize forgetting an already observed public state.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `AUDIT_DELTA_PUBLICATION_OBSERVATION_POLICY_SEPARATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `51a8519691ebf36bff591e1fe410385be243f5dceff0e744749805e4db657565`

# Audit delta — publication observation vs policy authority — 2026-08-28

Source-of-truth `main` immediately before this write: `17fa22461643ea4d145622990a2bc18754e96a04`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of existing:

- **P0-078** — publication-policy generation / revocation of not-yet-started publish authority;
- **P0-069 / P1-164** — explicit unpublish/privacy outcome before deleting the local management reference;
- **P1-184** — exact remote object/content proof and unknown external-settlement reconciliation;
- **P0-074** — immutable Yandex config/account/root operation generation.

The key distinction is that **publication policy, observed publication state, and unpublish outcome are three different facts**. Future fixes must not collapse them into one `createPublicLinks` boolean.

## Fresh positive control — `createPublicLinks=false` does not erase observed public state

`uploadCachedRecordToYandex()` currently behaves correctly in one important respect:

1. when the operation's captured `config.createPublicLinks` is false, it skips `ensureYandexPublicUrl()` and therefore does not intentionally start a new `/resources/publish` mutation;
2. final verification still reads Yandex metadata including `public_url` and `resource_id`;
3. if a public URL is already present, `publicUrl` is filled from `metadata.public_url`;
4. `markPendingRemoteSaveVerified()` stores that observed URL into the durable checkpoint/Journal data;
5. the successful content-page result returns `publicUrl`, and the UI exposes an `Открыть файл на Яндекс Диске` action when one exists.

The recovery path has the same useful property. `recoverPendingRemoteSaves()` first derives `publicUrl` from current remote metadata regardless of `current.createPublicLinks`; it only calls `ensureYandexPublicUrl()` when the checkpoint says publication was requested and no public URL is already observed.

Therefore a file that was already public before the current save/retry is not falsely rewritten as private merely because the current setting says not to create new permanent links.

This behavior must be preserved.

## Why `false` is not proof of privacy

The Options wording already describes the setting as:

`Создавать постоянную ссылку Яндекс Диска для каждого успешно загруженного PDF`

and warns that a published file remains accessible to anyone holding the link until publication is disabled on Yandex Disk.

Thus `createPublicLinks=false` is an **authorization policy for future publish mutations**, not an assertion that every matching remote object is private.

A reused path can already contain a public object; a prior unknown publish attempt can settle late; recovery can rediscover a public URL after the global setting was disabled. In every such case WebClip should retain and surface the observed public state rather than hide it.

## Existing P0-078 defect remains unchanged

The positive observation behavior does not fix stale publication authority.

A remote-save checkpoint stores only `createPublicLinks: Boolean(createPublicLinks)` from operation admission. `recoverPendingRemoteSaves()` can later execute `ensureYandexPublicUrl()` solely because this stale checkpoint boolean is true.

Therefore:

1. operation/checkpoint A is admitted while publishing is enabled;
2. user disables publication globally before A starts `/resources/publish`;
3. A is later recovered;
4. `current.createPublicLinks === true` from the old checkpoint;
5. recovery can start a new publish mutation after the user's revocation.

The existing P0-078 generation rule remains mandatory. A current boolean check alone is also insufficient for `true -> false -> true`: an old checkpoint must not regain authority automatically when a later unrelated generation happens to be enabled again.

## Required state separation

The remote-save/publication lifecycle should represent at least the following independent dimensions.

### 1. Policy authority

Durable fields/receipt describing whether this operation generation is authorized to start a **new** publish mutation:

- publication-policy generation captured at admission;
- current policy generation/revocation state;
- optional explicit re-authorization receipt if product supports resuming an old operation after a later user decision.

A revoked generation cannot start publish.

### 2. Observed remote publication state

Facts obtained from current remote metadata, independent of whether WebClip caused them:

- public URL observed;
- publication known present;
- publication known absent only when the provider response is sufficiently authoritative for that conclusion;
- publication state unknown when the read itself is unavailable/ambiguous.

Observed public state must not be cleared merely because policy is disabled.

### 3. Publish-operation settlement

If WebClip itself starts `/resources/publish`, preserve a phase/receipt such as:

- not started;
- authorized but not started;
- request started / settlement unknown;
- verified published;
- verified failed/absent under a future authoritative provider contract.

A local timeout or policy change after the PUT was sent is not cancellation.

### 4. Unpublish outcome

Unpublish is a separate destructive/privacy lifecycle owned by P0-069/P1-164:

- user requested revoke or intentionally retain public access;
- unpublish not started / started unknown / verified absent;
- stable `resourceId` remains the file identity after confirmed unpublish unless the provider actually proves otherwise.

Global `createPublicLinks=false` must never be implemented as silent automatic unpublish, and confirmed unpublish must not be represented merely by changing the future-publish setting.

## Reuse/recovery consequences

### Existing public object + policy disabled

If retry/recovery proves the exact intended object under P1-184 and metadata already exposes a public URL:

- do not call `publish`;
- retain the observed `publicUrl` and stable `resourceId`;
- surface that the object is already public even though future link creation is disabled;
- do not silently claim privacy.

### Existing non-public object + stale old `publish=true` checkpoint

If the current publication-policy generation revoked A before publish started:

- recovery may still verify/reconcile the remote file itself;
- A must not publish it;
- the file can finalize as non-public if all other object/Journal gates are satisfied;
- re-enabling publication later does not resurrect A's old authority without a fresh user-authorized generation.

### Publish request already started + later disable

If A already sent the mutating publish request:

- current policy prevents future new publish attempts but cannot retroactively cancel A;
- metadata reconciliation must determine whether the object became public;
- if public, preserve/surface the public URL even though current policy is false;
- do not blind-retry publish solely because the first response was lost.

## P1-184 composition

An observed `public_url` is evidence about publication state, not proof that the **object itself belongs to this operation**.

Before a public URL/object is adopted into the Journal, P1-184 still requires exact object/content/attempt provenance. In particular, the current `allowExisting` path still accepts an existing file primarily from path + exact byte size; publication-state truthfulness does not weaken the already documented requirement for stronger object identity/content proof.

A foreign same-size public file must never become the operation's Journal result merely because its `public_url` is valid.

## Required deterministic regressions

1. `createPublicLinks=false`, exact intended object already public before retry: no new publish call; observed `publicUrl` remains stored/surfaced.
2. Same case with exact intended object non-public: no publish call and no fabricated public URL.
3. Checkpoint A captured publish enabled; user disables before publish starts; recovery A cannot call `/resources/publish`.
4. `true -> false -> true`: old A remains revoked unless explicitly re-authorized by a new generation contract.
5. Publish request A starts, response is lost, then policy becomes false; reconciliation may record a discovered public URL without issuing blind publish retry.
6. Disabling future link creation does not clear an already observed `publicUrl` or stable `resourceId` from a verified entry.
7. Confirmed unpublish clears publication state/URL while preserving stable object identity where supported.
8. Unknown unpublish settlement retains local management/privacy evidence and blocks destructive local-entry removal under P0-069.
9. Same-size unrelated public object at the expected path is rejected by P1-184 object/content proof even though its `public_url` is valid.
10. UI distinguishes `future link creation disabled` from `this exact object is already public` and never presents the former as proof of the latter's privacy.

## Duplicate check

No new item is created.

- **P0-078** owns authority to start a new publish mutation under a current privacy-policy generation.
- **P0-069/P1-164** own explicit unpublish/privacy outcome and preservation of management identity.
- **P1-184** owns exact remote object/content proof and unknown external settlement.
- **P0-074** supplies immutable config/account/root generation but does not replace the stronger privacy revocation semantics.

This checkpoint chiefly prevents an incorrect future implementation: fixing stale publish authorization by dropping `publicUrl` whenever `createPublicLinks=false` would hide real public exposure rather than protect privacy.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_PUBLICATION_POLICY_2026-08-27.md`

SHA-256 of UTF-8 source text: `ce65e4c7d43632382eb1572cd2718f87eb471c1a174ad6d3992e5175bd67c5ec`

# Audit delta — Yandex publication privacy policy generation

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `80ac35c09a31f5cc97124cd5caf864df92741c0c`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P0-078 OPEN** and confirms its composition with **P1-184 OPEN** and **P0-069 OPEN**.

## Current publish call sites

Fresh runtime audit finds the object-publication mutation in `ensureYandexPublicUrl()` via `PUT /resources/publish`.

The two live callers that can reach it are:

1. `uploadCachedRecordToYandex()` after upload/reuse checkpoint creation;
2. `recoverPendingRemoteSaves()` while reconciling a prepared remote-save checkpoint.

Both callers currently authorize publication from stale operation/checkpoint state, not from an immutable/fresh publication-policy generation.

## Live save stale-policy proof

`uploadCachedRecordToYandex()` reads `config` near operation admission and later does:

- ensure/create remote recovery checkpoint;
- if `config.createPublicLinks` is true, call `ensureYandexPublicUrl(remotePath, operationId)`;
- otherwise skip creation.

A concurrent Options/user-settings change `true -> false` after the initial config snapshot but before the publish call does not revoke that old authority. The helper itself does not fresh-read the privacy setting immediately before its mutating PUT.

The race is even narrower than a whole upload: `ensureYandexPublicUrl()` performs a metadata GET first and only then, if no existing `public_url`, sends `PUT /resources/publish`. A global disable that occurs during that GET window still cannot stop the not-yet-started publish.

## Recovery checkpoint stale-policy proof

`checkpointPendingRemoteSaveIntent()` stores only `createPublicLinks: Boolean(createPublicLinks)` as operation data.

`recoverPendingRemoteSaves()` later reads remote metadata and, when `current.createPublicLinks && !publicUrl`, calls `ensureYandexPublicUrl()` without reading current global publication policy/generation.

Thus an old checkpoint created when publication was enabled can create a **new** public link after the user has explicitly disabled future link creation.

A plain current boolean check would still be insufficient for disable -> re-enable: an old generation must not regain publication authority merely because the latest setting happens to be true again. The checkpoint needs policy-generation semantics or an explicit re-authorization receipt.

## P1-184 composition: no publish before exact object/content proof

Current recovery authorizes publication after path + exact-size validation, while live retry can also publish a reused same-size object before final stronger metadata/object binding.

Therefore P0-078 and P1-184 are conjunctive gates:

- P0-078: is this operation generation currently allowed to publish at all?
- P1-184: has WebClip proved that the exact remote object/content belongs to this operation?

Both conditions must be true before `PUT /resources/publish`. A valid privacy-policy generation must never compensate for weak object proof, and exact object proof must never override a global publication revocation.

## Unknown already-started publication

Once the mutating publish request has actually been sent, a local timeout/settings disable is not cancellation. The correct state is unknown settlement until reconciled by metadata/public-url observation. Do not blind-retry and do not declare `createPublicLinks=false` as proof that the remote object was never published.

Checkpoint state therefore needs to distinguish at least:

- publish not authorized/not started;
- publish authorized for policy generation N but not started;
- publish request started, settlement unknown;
- publication verified with resulting public URL;
- publication known absent/explicitly revoked.

## P0-069 composition

No production `/resources/unpublish` path was found in this fresh pass. Therefore global `createPublicLinks=false` is currently only a policy about **creating future links**, not automatic revocation of already verified published entries.

That is correct separation of concerns, but it makes P0-069 mandatory: deleting a Journal entry that still refers to a published object must explicitly address whether public access is preserved or revoked and reconcile that outcome before destroying the management reference.

## Required P0-078 acceptance refinement

1. Store a monotonic publication-policy generation in Yandex config or equivalent durable privacy state.
2. Increment it on every authority-changing config write path, including Options toggle and user-settings import.
3. Capture the generation at save admission/checkpoint creation.
4. Immediately before a not-yet-started `resources/publish`, fresh-read/prove:
   - current policy is enabled;
   - captured generation is still authorized, or the operation received a newer explicit re-authorization;
   - P1-184 exact object/content proof is satisfied.
5. `true -> false` revokes all old generations that have not actually started publish.
6. `false -> true` does not resurrect old checkpoints automatically.
7. If settings change after the PUT is sent, preserve publication reconciliation state; do not claim cancellation.
8. Existing already verified public links are not automatically unpublished by this setting; P0-069/P1-164 own that lifecycle.
9. Regression must cover:
   - disable while live upload is between checkpoint and publish;
   - disable during the metadata GET inside `ensureYandexPublicUrl()` before PUT;
   - old recovery checkpoint true + current false;
   - true -> false -> true with old checkpoint;
   - already-started publish + disable + lost response;
   - same-size unrelated object never reaches publish even when policy is enabled (P1-184).

## Duplicate check

- Not P0-069: that item owns deletion/unpublish lifecycle after a link exists.
- Not P1-184: that item owns exact remote object/content proof.
- Not P0-074: general auth/config operation generation is necessary but publication revocation has stronger privacy semantics: a stale operation must not publish simply because its original config snapshot was once valid.
- No P0-079/P1-197 assigned.

## Retired source: `AUDIT_DELTA_READLATER_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `905e03210e2ff3f3cc1ef3b89dc665adeab0c4b984c25dbf72560b8b0030a0c5`

# Audit delta — ReadLater -> Upload move must retain one Yandex account/config generation — 2026-08-28

Source-of-truth `main` immediately before this write: `91e03a6947d7dc1dae95f3ba266a5d982905e9e1`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/account/config context**.

Adjacent:

- **P1-090** — ReadLater->Upload move identity/recovery correctness;
- **P0-076** — exact Journal entry/mutation generation;
- **P0-073/P1-184** — remote object provenance/identity;
- existing post-move identity-continuity delta.

## Existing positive control

`findYandexFileForJournalEntry(entry, operationId)` does useful preflight checks:

- current root is compared with stored `entry.rootPath` when present;
- current account UID is read and compared with stored `entry.accountUid` when present;
- candidate paths are constrained to managed branches;
- stable `resourceId/publicUrl` is used when available.

This correctly fails closed when the operation **begins** while the wrong account/root is already current.

## Fresh gap — preflight is not a long-operation context receipt

`moveReadLaterEntryToRead()` continues for multiple remote/local stages after that check:

1. locate current remote file;
2. separately read current Yandex config;
3. call `ensureYandexServiceFolders({includeUpload:true})`;
4. choose/restore target path;
5. persist `readMovePendingAt/readMoveSourcePath/readMoveTargetPath/readMoveOperationId`;
6. `POST /resources/move`;
7. poll target metadata with repeated GETs;
8. update Journal row to `readingMode:'read'` and clear pending fields.

`yandexApi()` obtains a valid access token for each request rather than consuming one immutable account/auth receipt accepted at Mark Read admission.

Therefore account/config can change **after** the initial identity check.

## Deterministic cross-account schedule

1. Entry E belongs to account A/root R and has valid accountUid/resource identity.
2. Mark Read starts under A; `findYandexFileForJournalEntry()` proves A and returns source S.
3. Before service-folder preparation or move, user replaces auth with account B. Assume B uses the same textual root R and contains coincidentally matching managed paths.
4. Later `getYandexConfig()`/`getValidYandexAccessToken()` calls observe B.
5. `ensureYandexServiceFolders()` and later Yandex API calls now operate under B.
6. The operation can select/create target T in B or attempt/move B's object at the same textual S/T paths.
7. Verify GETs likewise use whichever auth is current at each call.
8. Local Journal finalization can then describe one logical Mark Read operation even though its remote observations/mutations crossed accounts.

Root containment does not solve this: the same managed textual namespace can exist independently in multiple accounts.

## Durable checkpoint issue

Before the destructive move WebClip writes `readMoveSourcePath/readMoveTargetPath`, which is a good crash-recovery principle. But those paths are not self-describing physical receipts: their meaning depends on the account/root/auth generation under which they were admitted.

The checkpoint should therefore carry or reference an immutable move-generation receipt containing at least:

- accepted account UID/auth generation;
- accepted root/config generation;
- source object identity (`resourceId`/verified provenance);
- source path observation;
- target path generation;
- operation/move generation.

A later recovery attempt must reconcile that exact context. A different current account must quarantine/defer the old saga rather than reinterpret its paths there.

## Required contract

After initial admission, every remote stage of one physical move saga must either:

- consume one immutable `YandexOperationContext`; or
- fresh-check that the exact accepted account/root/config generation is still current before each side-effect/verification stage and fail `superseded` on mismatch.

A stale operation must not silently rebind to a newer auth/config generation merely because a helper performs a fresh read.

Post-move verification must also preserve the existing P1-090 requirement that target object identity is the same exact source object, not merely `type:'file'` at T.

## Required regressions

1. Mark Read entirely under account A succeeds normally.
2. A preflight -> auth switches B before folder preparation -> operation stops before B mutation.
3. A preflight -> auth switches B after checkpoint but before move -> checkpoint remains historical/unresolved for A; it is not executed in B.
4. A move request settles under A -> auth switches B before verify -> B metadata cannot be accepted as A move proof.
5. Root R1->R2 mid-operation yields superseded/conflict rather than mixed source/target.
6. Reauth to the same account with a compatible auth generation may continue only according to explicit operation-context semantics; account equality alone must not conceal a conflicting config generation.
7. Restart with pending A move while B is current -> safe defer/quarantine until A context can be reconciled; no B path mutation.

## Duplicate check

The existing Yandex operation-context delta proves mixed-generation behavior for uploads, and the move post-state delta proves exact source/target identity continuity. Repository search found no dedicated ReadLater move checkpoint for **account/config change after the initial provenance check but before move/verify**. This is a new manifestation of P0-074/P1-090, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `AUDIT_DELTA_READ_MOVE_CHECKPOINT_COLOCATED_WITH_JOURNAL_ENTRY_2026-08-28.md`

SHA-256 of UTF-8 source text: `b170aab010581500ccb993f3bd8e78fb560d22dc4714614b6a354ae187d192e0`

# Audit delta — ReadLater move checkpoint is co-located with replaceable Journal entry — 2026-08-28

Source-of-truth `main` before this checkpoint: `4781cbfc534236ebf9f0c59e0c537558eec540fa`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-090/P0-076** and the existing Journal-replace/external-recovery separation contract. It composes with **P0-074**, **P1-184**, physical-attempt lineage and imported-provenance requirements.

The concrete current runtime already has a durable pre-move checkpoint for ReadLater→Upload. Unlike future abstract move receipts, however, that checkpoint is stored inside the Journal entry itself. Bulk clear/import therefore destroys both the stale Journal capability and the only exact target/source evidence for a possibly admitted remote move.

## Positive control — ReadLater writes a checkpoint before `resources/move`

Current `moveReadLaterEntryToRead()` deliberately persists fields before the destructive remote action:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- clears prior error.

The source comment correctly explains the intent: if MV3 worker stops after the remote move, the next run can inspect the same target and finish the local part.

This is the correct ordering principle and is stronger than current Delete→Trash, which still lacks its own equivalent durable target receipt.

## The receipt lives only inside `JOURNAL_STORE` row E

`updateJournalEntryRecord(id, patch)` reads entry E, spreads the patch into E and writes the row back in `JOURNAL_STORE`, touching Journal revision.

There is no separate immutable move-attempt record/store whose lifetime can outlive the entry's membership in the current Journal generation.

Therefore the physical side-effect receipt and the mutable user-visible Journal row share one deletion lifecycle.

## Full clear deletes the receipt by deleting the row

The existing bulk-clear implementation clears `JOURNAL_STORE` for full Journal clear.

If E currently contains a genuine `readMovePending*` checkpoint, full clear removes it because it removes E.

That is correct for local Journal membership: old E must not reappear after clear.

It is not proof that a previously transmitted Yandex move did not or will not settle.

## Import-replace has the same effect

Atomic staged import replacement clears/replaces current Journal entries and advances Journal revision.

A pre-import E carrying a live ReadLater move checkpoint disappears unless that physical evidence has first been transferred into a detached generation.

Imported replacement data may even contain another entry with the same textual id E. The old move must never attach to that replacement row.

## Deterministic clear-during-move schedule

1. Entry E is `readingMode='later'`; exact source object S is located.
2. WebClip chooses exact Upload target T.
3. `updateJournalEntryRecord(E, readMovePending...S/T)` commits the local checkpoint.
4. `POST /resources/move S -> T` is transmitted.
5. Before its physical outcome is locally classified, user performs full Journal clear.
6. Clear transaction removes E and therefore removes S/T checkpoint.
7. Yandex may already have committed or later settle the move.
8. The old Journal generation correctly remains cleared, but WebClip has lost the exact physical move receipt required to explain/reconcile S→T.

The same schedule exists with import-replace instead of clear.

## Missing row must not mean cancelled remote side effect

After clear/import, a later worker cannot infer:

- whether the move was transmitted;
- whether S still exists;
- whether exact object arrived at T;
- which account/root/auth generation owned S/T;
- whether local finalization was intentionally invalidated versus physical checkpoint lost.

The absence of E means only `old Journal row no longer belongs to current generation`.

It must not be overloaded as `remote move did not happen`.

## Required separation

Before external move admission, create a physical move generation M independent of Journal row lifetime.

M should bind at minimum:

- random move generation id;
- worker-issued operation receipt;
- expected Journal entry/database generation at admission;
- exact source object identity/path;
- exact target path;
- Yandex account/root/auth/config operation context;
- publication/privacy state where relevant;
- phase/outcome evidence and timestamps.

The Journal row may carry a small pointer/display projection to M, but must not be M's only durable storage.

## Clear/import transition

When Journal generation changes destructively:

- old E mutation/finalization capability becomes stale;
- M remains if remote settlement is active/unknown/needs reconciliation;
- M transitions to `detached-stale-journal-generation` or equivalent;
- late M result cannot recreate E automatically;
- M can still prove/diagnose exact remote outcome and support explicit future cleanup/manual resolution if product policy allows.

This matches the prior local-download/remote-save detached receipt architecture and applies now to an already implemented ReadMove checkpoint.

## Successful move after detach

If M is later proven successful after E was cleared/replaced:

- record exact detached remote result;
- do not create a new `readingMode='read'` entry in the replacement Journal without a new explicit capability/product action;
- do not move the object back automatically just because local row disappeared;
- retain bounded management/object evidence according to policy.

The user chose clear/import of local Journal state, not rollback of an already admitted remote move.

## Failed/non-started move after detach

If provider semantics authoritatively prove the move never happened, M may transition to terminal no-side-effect and become eligible for compact retention/cleanup.

Clear/import itself is not that proof.

## Current row checkpoint remains useful as a UI projection

After implementing M, entry fields like `readMovePendingAt` can still be retained as a convenient view/state projection while E exists.

But their updates should reference exact M and expected Journal generation. Rebuilding UI from E alone must not recreate physical authority if M is absent/untrusted/imported.

This also solves the imported fake-checkpoint finding from the previous block: imported `readMove*` fields cannot manufacture M.

## Required deterministic regressions

1. Genuine checkpoint M/E committed -> move transmitted -> full clear -> remote success: no old Journal resurrection; M remains detached and exact.
2. Same with import-replace containing new entry with same id E: old M cannot mutate new E.
3. Move authoritatively rejected before side effect -> clear can retire local E and M later becomes terminal no-side-effect normally.
4. Worker restart after clear but before remote reconciliation -> detached M survives and retains S/T/context.
5. Account/root changes after detach -> M is reconciled only in historical context; no current namespace substitution.
6. Imported row with fake `readMove*` values has no locally issued M and cannot resume physical recovery.
7. Normal successful move with unchanged Journal generation finalizes E and retires M exactly once.
8. Local finalization fails after remote success due Journal CAS conflict -> M becomes verified/detached rather than losing outcome evidence.
9. Storage pressure may compact M after rich resources are unnecessary but never reinterpret eviction/clear as proof of no move.
10. OperationLog clear does not remove M.

## Duplicate check / numbering

No new item is created.

- **P1-090** remains exact destructive move settlement/identity owner.
- **P0-076** owns Journal generation/finalization authority.
- Existing Journal-replace recovery-evidence audit already establishes the general separation; this checkpoint proves the current ReadMove implementation is concretely affected today.
- **P0-074/P1-184** remain remote context/object receipt dependencies.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_READ_MOVE_PROVEN_COLLISION_TARGET_RESELECTION_2026-08-28.md`

SHA-256 of UTF-8 source text: `e9c5a55b67f6ab6aaf72ce4ef2ed0e25dc46d49351c03816a206c47f8a39602b`

# Audit delta — ReadLater move proven-collision target reselection — 2026-08-28

Source-of-truth `main` immediately before this write: `059fc525110295085c55d941bf1903b8b82de502` plus later docs-only audit commits in this session; production runtime remains unchanged.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-090 — exact Yandex source/target move reconciliation**.

This is distinct from P1-183 Delete→Trash: ReadLater→Upload already has the stronger positive control of persisting exact `readMoveSourcePath/readMoveTargetPath` before the destructive move. The remaining issue is what happens when that chosen target is later **proven unusable without any successful move**.

## Positive control — target is durably selected before destructive move

`moveReadLaterEntryToRead()`:

1. locates current source object;
2. builds/ensures Upload target folder;
3. chooses a free target via `chooseAvailableTargetPath(...)` unless an existing checkpoint target is being resumed;
4. persists `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId` on the Journal entry;
5. only then issues `POST /resources/move` with `overwrite=false`.

This is exactly the crash-consistent ordering missing from Delete→Trash P1-183 and must be preserved.

## Fresh liveness defect — a stale occupied checkpoint target is reused forever

On every later invocation, if `entry.readMoveTargetPath` is non-empty and lies inside the current target Upload folder, the code directly reuses it:

`targetPath = checkpointTargetPath`

without re-running `chooseAvailableTargetPath()`.

The catch path also rewrites the same `checkpointTargetPath` back into the entry after an error.

### Deterministic collision schedule

1. Source S is in ReadmeLater.
2. WebClip checks Upload target T and observes 404/free.
3. WebClip durably checkpoints source S + target T.
4. Before WebClip's move request is accepted, another actor creates unrelated object Q at T.
5. `POST /resources/move(from=S,path=T,overwrite=false)` returns an authoritative collision/conflict in a way that proves this attempt did not move S to T.
6. Catch retains checkpoint target T.
7. User retries Mark Read later.
8. Exact source locate still finds S; target T still contains Q and does not match S's exact identity.
9. Because checkpoint T belongs to Upload, WebClip reuses T instead of selecting a new free target T2.
10. Move fails with the same collision again.
11. Every subsequent retry repeats T until external Q is removed manually.

The durable target that is necessary under unknown settlement becomes a permanent liveness pin after **proven non-move** settlement.

## Unknown settlement and proven collision require different policies

Do not fix this by always picking a new target after any move error.

If the POST outcome is unknown, T must remain frozen:

- S may already have moved to T;
- choosing T2 could create a second move attempt before the first is reconciled;
- exact P1-090 source/target identity verification must classify the old attempt first.

But when WebClip has authoritative evidence that the old move did **not** happen and T is occupied by a different object, old T is no longer a required recovery target. It is a failed attempt receipt.

P1-090 therefore needs explicit attempt classes:

- `target-selected / move-not-started`;
- `move-may-have-started / outcome-unknown`;
- `target-conflict-proven / no-move`;
- `move-verified`;
- `inconclusive`.

Only a proven-no-move collision may retire T and select a fresh target generation.

## Required target-generation contract

A target path is not merely a string on the Journal row; it belongs to one move attempt generation.

When T is retired after proven non-move:

1. keep the old attempt outcome for diagnostics/reconciliation as needed;
2. advance a move-attempt/target generation;
3. re-run bounded free-name selection to choose T2;
4. persist S + T2 + expected source object identity before issuing the new POST;
5. a late result from old attempt T cannot satisfy/update T2 generation.

If the API error does not prove no move occurred, do not reselect automatically.

## Exact object identity remains mandatory

A target collision Q at T must be distinguished using the source object receipt required by P1-090:

- if source exact `resource_id=R`, Q with id Q != R proves T is not the intended post-state;
- existence of a generic file at T is never success;
- filename/size equality is not enough;
- if source/target state remains ambiguous, retain old T and report unresolved rather than blindly moving to T2.

## Local Journal generation remains separate

Even after a later T2 move succeeds, final `readingMode='read'` commit still needs P0-076 expected Journal entry generation/CAS. Import/replace of the same textual entry id cannot be mutated by the old move saga.

## Required regressions

1. T free -> checkpoint T -> exact move succeeds -> verify exact source identity at T -> normal completion.
2. T free -> checkpoint T -> external Q occupies T -> POST returns authoritative no-overwrite conflict with S still at source -> T is retired and later attempt may choose T2.
3. Same conflict but POST outcome is transport-timeout/unknown -> T remains frozen; no T2 move is issued before reconciliation.
4. T contains Q equal filename/size but different resource id -> never treat Q as successful move.
5. Retry after proven collision chooses a fresh bounded target generation rather than looping forever on T.
6. Late old-T response/result cannot update the newer T2 generation.
7. Continuous collisions hit bounded target-selection/retry policy and surface a controlled error, not unbounded remote requests.
8. Worker dies after T2 checkpoint but before POST -> T2 remains the recovery target.
9. Existing already-in-Upload exact source object remains idempotently recognized without unnecessary rename.
10. Import/replacement of the Journal entry during the saga blocks stale local finalization under P0-076.

## Duplicate check / numbering

No new P-number is created.

- **P1-090** remains the primary owner for exact source→target move attempt/reconciliation and now explicitly distinguishes unknown settlement from proven-no-move collision target retirement.
- **P1-183** remains Delete→Trash's missing durable target checkpoint; it is not duplicated here.
- **P0-076** remains local finalization generation/CAS.
- **P0-073/P0-074** remain Yandex namespace/context fencing.

P1-211 remains assigned to deleted Journal comment tombstone lifecycle.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_TRASH_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `54a32cb21dd350f8a03a25426fcbf9c15f134bd5895e52e519bd7fab18ece9f5`

# Audit delta — Delete->Trash move must remain in one Yandex account/config generation — 2026-08-28

Source-of-truth `main` immediately before this write: `6897ffacc21ce91b5921add8b16cd7a786d7d247`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/account/config context**.

Adjacent:

- **P0-022/P0-073/P1-184** — destructive remote identity/provenance;
- **P0-076** — destructive Journal mutation generation;
- **P1-090/P1-183** — exact move target/post-state and Trash saga recovery;
- existing move post-state identity-continuity delta.

## Existing positive controls

Before destructive move, `moveJournalYandexFileToTrash()`:

- reads current Yandex config;
- calls `findYandexFileForJournalEntry()` which can compare stored root/account/resource identity;
- constrains source path to managed Upload/ReadmeLater/Trash branches;
- creates a dated Trash subtree;
- chooses a collision-safe target;
- verifies a target file after move before local deletion proceeds.

These checks are valuable, but they are not one immutable operation context.

## Fresh gap — remote stages can rebind after preflight

After the initial source/account proof, the operation continues through multiple API calls:

1. ensure/create Trash root and month folder;
2. inspect/choose collision target;
3. `POST /resources/move`;
4. repeated `GET /resources` verification at target;
5. return remote move result to `deleteJournalEntry()`;
6. delete the local Journal entry.

`ensureYandexFolderTree()` and `yandexApi()` obtain current auth during each request. No exact account/config generation accepted at source-locate time is passed through these stages.

Thus a later auth/root change can make one logical delete operation span two remote namespaces.

## Deterministic account-switch schedule

1. Entry E belongs to Yandex account A/root R and points to exact source SA.
2. User chooses Delete + move file to Trash.
3. Preflight under A successfully locates SA and validates managed containment.
4. Before Trash folder creation/move, auth changes to account B. B may use the same textual root R and may have a file at the same managed path.
5. Later folder PUTs, collision checks and move use B's current token.
6. WebClip can create Trash hierarchy in B and potentially move B's path-matching object.
7. Target verification also reads B.
8. Operation returns success and local Journal row E (historically A) is deleted.

The result is worse than a simple remote failure: a stale A delete decision can become a B remote mutation followed by loss of A's local management record.

## Root/config switch variant

Even without account change, root R1->R2 after preflight can mix:

- source observation under R1;
- Trash target/hierarchy under R2;
- current scheduler/config state unrelated to the original destructive decision.

Textual path containment against a fresh config does not prove the original operation's authority survived the switch.

## Required contract

Delete-to-Trash must carry one immutable destructive remote receipt from admission through finalization, including at least:

- expected Journal entry generation;
- accepted account UID/auth generation;
- accepted root/config generation;
- source resource identity + verified source path;
- immutable Trash target generation;
- remote move operation generation;
- post-state identity proof.

Every remote call either consumes that context or fresh-checks exact equality before proceeding. A newer current auth/config must yield `superseded/conflict`, never implicit rebind.

Local Journal deletion must occur only after post-state proof for the **same accepted remote object/account generation**.

If remote outcome is unknown, the Journal row or a detached management receipt must remain available for reconciliation; do not destroy the only provenance record merely because a target path currently contains a file.

## Required regressions

1. Delete E under stable account/root A succeeds and local row is removed only after exact post-state proof.
2. A source locate -> account B before Trash folder creation -> no B folder/move mutation.
3. A source locate -> B after target selection -> old A target generation cannot execute in B.
4. A move request settles -> auth changes before verify -> B target object cannot prove A move success.
5. Root changes mid-delete -> operation stops/supersedes without mixing source and target roots.
6. Unknown move outcome preserves enough A receipt to reconcile later without deleting the Journal management identity prematurely.
7. Same textual source/target paths existing in A and B do not allow cross-account confused-deputy behavior.

## Duplicate check

Existing post-state move audit owns target identity continuity; P0-074 owns operation context. Repository search found no dedicated Delete->Trash checkpoint for account/config change **after** source provenance validation. This is therefore a new concrete P0-074/P0-076 manifestation, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_DESTRUCTIVE_MOVE_AUTH_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `9bb5ff274b564a46a8691a5334c8ba90d0d5cbddf7be204458cad4b9e6cc63f4`

# Audit delta — destructive Yandex Journal move must remain in one auth/account generation — 2026-08-28

Source-of-truth `main` immediately before this write: `2e505a785b5c75742b1aaca7470699c7500302cd`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owner: **P0-074** — immutable Yandex account/auth/config operation context.

Required composition:

- **P0-073** — account/root fence for Journal remote identity;
- **P1-090** — exact source/target object continuity around destructive move;
- **P1-183** — durable Trash move checkpoint;
- **P0-076** — exact Journal entry generation/CAS for destructive local finalization;
- **P1-210** — unknown external/outer settlement reconciliation.

## Existing positive control

`findYandexFileForJournalEntry(entry, operationId)` already performs useful pre-operation checks:

- compares stored `rootPath` with the currently configured root;
- when `entry.accountUid` exists, fresh-reads current account UID and fails `YANDEX_ACCOUNT_MISMATCH` when it differs;
- locates/validates the candidate remote object before destructive action.

This prevents an entry explicitly bound to account A from being *initially* located in account B.

## Fresh TOCTOU generation gap

That account check is a point-in-time read, not an immutable operation context.

After source lookup, Trash and Mark Read perform more remote work:

- choose/create target folders/path;
- possibly create/check service folders;
- issue `POST /resources/move`;
- repeatedly `GET` target/source metadata for verification.

Every call goes through `yandexApi()`, which obtains the currently valid access token again for that request.

The destructive move functions do not pass the already-proven account UID/auth generation as an immutable requirement to later API calls.

Therefore auth can switch after the pre-check but before the actual move or verification.

## Deterministic Trash schedule

1. Journal entry E is locally bound to account A/root R and object O at source S.
2. `findYandexFileForJournalEntry(E)` proves current account=A and locates exact O/S.
3. Trash operation selects target T under A/R.
4. Before `POST /resources/move`, another Options page disconnects/re-authenticates to account B.
5. The move call fresh-reads current token B.
6. Textual `from:S/path:T` is now interpreted in B.
7. Depending on B contents, the call may fail, move a B object with the same paths, or create an unknown remote outcome unrelated to O.
8. Subsequent verification calls also run under whichever auth is current then.

The earlier `accountUid === A` check did not protect the irreversible side-effect boundary.

## Deterministic Mark Read schedule

The same gap exists for `ReadmeLater -> Upload`:

1. source object O is proven in A;
2. durable target-path checkpoint is established for A semantics;
3. auth changes to B;
4. `resources/move` or post-move verification runs with B token;
5. the stored checkpoint/path is now being interpreted in a namespace different from the one in which it was authorized.

This composes with P1-090 exact target `resource_id` continuity: object identity proof is only meaningful inside the correct account generation.

## Required P0-074 refinement

### Capture destructive remote context once

After initial account/root/object proof, create an immutable move context containing at least:

- exact account UID/auth generation;
- root/config generation;
- source object identity (`resource_id` and accepted fallback evidence);
- normalized source path;
- exact target generation/path;
- operation/physical move receipt id.

Every later Yandex request in that saga must verify/consume that context.

### Fresh token is not fresh authority

Token refresh/re-read can still be used as an implementation mechanism, but a newly read token is usable for the saga only if it proves the **same expected account/auth generation**.

A token for B must cause the old A operation to stop/supersede, never reinterpret A's paths under B.

### Unknown settlement remains attached to A

If `resources/move` was already admitted under A and its result is unknown when auth changes:

- preserve the A move checkpoint;
- do not inspect B target and call that reconciliation;
- do not blindly re-POST under B;
- when A becomes available again, reconcile A source/target/object identity, or retain explicit unresolved historical state.

### Local Journal finalization

Delete/Mark Read may update/remove the local Journal entry only after remote outcome is proved for the same A move context **and** P0-076 confirms the expected local entry generation.

## Required regressions

1. Entry A + current A, no auth change -> Trash/Mark Read normal success.
2. A pre-check succeeds -> auth switches B before move -> no move request is issued under B for the old operation.
3. A move admitted -> auth switches B before response -> A checkpoint remains unresolved; B is not used for verification.
4. A verification GET -> auth switches B mid-loop -> loop fails generation check rather than accepting B object/path.
5. Stored A target path happens to exist in B -> never accepted as A outcome.
6. Auth switches A -> B -> A; old operation resumes only by exact A receipt/reconciliation, not by textual path equality.
7. Root changes within same account after source proof -> old operation obeys captured root generation or becomes superseded.
8. Imported/unverified remote identity remains subject to P0-022 before this account-generation fence can authorize any move.
9. Exact target `resource_id` mismatch still fails under P1-090 even when account generation matches.
10. Local same-id replacement during remote wait still fails P0-076 CAS before final local mutation.

## Duplicate check

P0-073 already requires account/root binding for Journal remote identity, and current source implements a useful **pre-check**. P0-074 is the existing generic owner for one-operation Yandex generation coherence. P1-090 owns source/target object identity after move.

Repository history contained no dedicated checkpoint proving the gap between the successful account pre-check and the later destructive `resources/move`/verification calls. This is therefore a new manifestation of existing owners, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_GLOBAL_LOCATE_PAGINATION_COHERENCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `9b354cb1f2f376af02560928d002990f131f2c63d60ae4c3bafedc0cdb26d5b0`

# Audit delta — Yandex global locate pagination coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `1132703be3e1232824f697d7f83312e24a65178d`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-090** exact Yandex source-object locate/move reconciliation and composes with **P1-133** pagination coherence.

The shared directory paginator audited earlier is not the only offset-based remote traversal. `findYandexFileForJournalEntry()` has a separate global `/resources/files` scan used specifically when known paths no longer locate the object.

## Current fallback locate algorithm

After safer known-path checks fail, the worker can search globally by the strongest available identity:

- expected `resourceId`; or
- legacy public URL.

It uses:

- `limit = 200`;
- `offset = 0, 200, 400...`;
- up to 250 pages;
- a shared 45-second locate deadline;
- `/resources/files` requests projecting name/path/type/public_url/resource_id/total/limit/offset.

Each page is a separate current remote-list observation. There is no stable snapshot/revision/continuation receipt binding all pages.

## Mutable global list can skip the exact target

Offset pagination over a changing global file set has the same fundamental shift problem as directory pagination.

Deterministic schedule:

1. exact target object R is currently at logical position 201 in the server's ordered `/resources/files` result;
2. page 1 returns positions 1–200; R is not present yet;
3. another client deletes/moves one object ahead of R before page 2;
4. R shifts from position 201 to 200;
5. WebClip requests `offset=200` against the new collection;
6. R lies immediately before that new offset and is skipped;
7. later pages do not contain R;
8. WebClip eventually reports that the file was not found by resourceId/public URL even though exact R still exists.

Insertion before the offset can symmetrically duplicate records and consume bounded scan time without proving complete coverage.

## Safety boundary is currently fail-closed

This audit does **not** prove that the pagination gap directly moves the wrong object.

The current locate code searches each returned page for exact resource identity/public URL and, if no match is found, throws with the Journal entry left unchanged.

That is an important positive control: absence from an incoherent traversal is currently used as “cannot safely locate”, not as permission to guess another file by name.

Therefore classification remains P1 reliability/management availability inside P1-090 rather than a new destructive P0.

## Why the problem still matters

For a legitimately moved/renamed WebClip file whose stored path is stale, global exact-identity search is the recovery path that makes Delete→Trash / Mark Read management possible.

A false negative caused by traversal churn can:

- make a real saved file appear unmanageable from Journal;
- leave ReadLater→Upload or Trash action failing repeatedly on a busy shared Disk;
- produce misleading “not found / possibly another account” diagnostics;
- consume most/all of the 45-second locate budget and retries while the object actually exists.

Exact post-move identity verification cannot help if the correct source object is never found before the move.

## Required P1-090 refinement

### Treat global scan completeness as a proof obligation

A full negative result “R not found” may be authoritative only when the traversal used a remote consistency mechanism that proves complete coverage for one relevant remote generation.

If real Yandex API offers a documented stable continuation/snapshot primitive for `/resources/files`, validate it in real-service E2E and use it.

Do not infer snapshot semantics from `total` + offset alone.

### If coherence cannot be proved, distinguish `not found` from `scan changed/inconclusive`

After bounded retries/revalidation:

- exact strong positive match R can still be accepted when identity matches;
- a negative result from a traversal known/suspected to cross revisions should remain `locate inconclusive / retry later` rather than authoritative object absence;
- no destructive side effect begins from an inconclusive scan.

### Strong identity remains mandatory

Pagination repair must not weaken the locate policy into filename/size guessing.

`resource_id` equality remains the strongest normal proof. Legacy public URL stays an explicitly weaker migration path under existing provenance rules.

### Boundedness remains mandatory

Do not solve churn by infinite scan restarts. Preserve an overall operation deadline/retry cap and surface a controlled “Disk changed during search; repeat later” result after exhaustion.

## Composition with P1-133

The same abstract pagination primitive may eventually serve directory and global-file listing, but endpoint semantics can differ.

P1-133 owns coherent bounded pagination generally; P1-090 must still state how an **inconclusive negative locate** affects destructive management admission.

A duplicate-free UI list and an authoritative exact-object negative proof are not identical requirements.

## Required regressions / real Yandex checks

1. Stable multi-page global file set -> exact R after page 1 is found.
2. Delete before current offset moves R backward across boundary -> traversal does not return authoritative “R absent”.
3. Insert before current offset -> duplicate page records do not falsely prove complete coverage.
4. Same reported total but changed membership/order -> total equality alone is insufficient.
5. Exact R appears on any coherent page -> positive resourceId match is accepted once.
6. No exact identity match -> no filename-only destructive fallback is introduced.
7. Continuous remote churn -> bounded inconclusive result, Journal remains unchanged.
8. Known-path exact R still works without expensive global scan.
9. Account/root/auth generation changes mid-locate -> P0-074 invalidates the scan rather than combining namespaces.
10. Real Yandex E2E records whether `/resources/files` order/snapshot behavior offers a usable stronger primitive.

## Duplicate check / numbering

No new P-number is created.

- **P1-090** remains exact source locate and source→target move reconciliation owner.
- **P1-133** supplies shared pagination-coherence requirements.
- **P0-073/P0-074** remain account/root/auth namespace fences.
- **P1-184** remains exact remote object/content proof in save/restore contexts.

P1-211 remains the Journal deleted-comment lifecycle item.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_LEGACY_ACCOUNT_IDENTITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `570047b96207bedfa575eb51f57d0515fe9fb48da87f74e3a03ffb4d69f7a8af`

# Audit delta — Yandex legacy account identity — 2026-08-27

Baseline HEAD before this audit block: `4421c39f358766a3b456cdc312684a4e6a0dcf9d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh account-identity audit around existing `P0-073`, focused on destructive Journal operations for legacy/local entries that have remote identity fields (`resourceId` / `publicUrl`) but no stored `accountUid`.

## Result

`P0-073` needs an explicit **missing-account-identity** rule. Current code correctly fails closed when the current Yandex account UID cannot be obtained, but it only performs that current-account check when the Journal entry already contains a non-empty `accountUid`. A legacy/local entry without that field can therefore enter destructive locate/move logic under whatever OAuth account is currently active.

No new P-number is created. `P1-199` remains free.

## Exact runtime proof

### 1. Current-account UID acquisition itself is fail-closed

`getCurrentYandexAccountUid(operationId)`:

1. returns a cached auth `account.uid` when present;
2. otherwise performs `GET /v1/disk`;
3. extracts `info.user.uid`;
4. if UID is missing, throws `YANDEX_ACCOUNT_UID_UNAVAILABLE` with an explicit no-change error.

This is a valuable positive control. The defect is not "Yandex may omit UID and WebClip proceeds" for a newly checked account.

### 2. Journal locator skips account verification when the entry has no accountUid

`findYandexFileForJournalEntry(entry, operationId)` reads:

- `expectedResourceId`;
- `expectedPublicUrl`;
- `expectedAccountUid`;
- `expectedRootPath`;
- path/filename locator data.

It compares the current root whenever an expected root is present.

But current account UID is resolved and compared only inside:

`if (expectedAccountUid) { ... }`

If the entry has an empty/missing accountUid, destructive file discovery continues without proving which Yandex account originally owned the stored remote identity.

### 3. A known resourceId can then be accepted without account binding

`matchesKnownIdentity(item)` treats a returned Yandex file as a match when a stored `expectedResourceId` equals the API `resource_id` (with the existing publicUrl secondary checks).

That object-identity comparison is important and must remain, but it is not a documented substitute for account ownership.

The current Disk API documentation exposes account/user identity and resource identifiers, but this audit did not find an official guarantee that a private `resource_id` is a globally unique, cross-account authorization receipt that makes account binding unnecessary. Do not assume such semantics without an explicit supported contract/E2E proof.

Therefore a legacy entry with:

- `destination='yandex'`;
- non-empty `resourceId` and/or `publicUrl`;
- no `accountUid`;

can perform lookup in the **currently active** account. If a matching/accepted identity is found there, later Trash or ReadLater→Upload logic can mutate that current-account object even though the Journal record never proved it belonged to this account generation.

### 4. New live saves are materially safer

The current live Yandex save path calls `getCurrentYandexAccountUid()` before creating the remote checkpoint and stores `accountUid` in the durable remote-save identity.

Thus the missing-account case is primarily a migration/provenance problem for older local Journal records (and imported records, which are independently constrained by `P0-022`). It should not be solved by weakening current UID requirements.

## Relation to existing items

### P0-073 — primary owner

`P0-073` already owns immutable `accountUid + rootPath` fencing for remote save completion/recovery. Extend it so **absence** of accountUid on a destructive Journal reference is not interpreted as "no account restriction".

### P0-022 — imported provenance remains separate

Imported remote identity is untrusted even when it contains an accountUid/resourceId. Import must remain `imported-unverified` until safe re-bind/proof.

This checkpoint focuses on legacy/local records whose provenance may be local but whose historical schema predates account binding.

### P0-074 — operation generation remains required

Even after a legacy record is safely rebound to account A, long operations must still use immutable auth/config generation and cannot switch A→B between requests.

### P1-184 / P1-090 — object/content proof remains required

Account match proves namespace ownership, not exact remote content or move outcome. Strong object/content receipts and post-move exact identity remain separate gates.

## Required P0-073 refinement

For any destructive or identity-sensitive remote operation (`Trash`, ReadLater move, retry/adoption, publication lifecycle where applicable):

- a trusted local remote binding must include a proven account UID (and root generation/namespace);
- missing accountUid is an **unknown account binding**, not a wildcard;
- do not search/mutate the current account merely because an old record has a resourceId/publicUrl/path;
- imported records remain unverified per P0-022 regardless of populated fields.

### Legacy migration/re-bind options

For legacy local entries without accountUid, acceptable safe behavior includes:

1. **explicit safe re-bind** while the user is on the intended account: perform non-destructive metadata lookup, require stable object identity evidence, current managed-root containment and any available historical path/public identity consistency, then persist a new versioned local binding receipt with current accountUid/root/provenance; or
2. fail closed and require user/manual recovery when exact identity cannot be proven.

Do not silently populate accountUid solely from whichever account happens to be connected at the time of the first destructive click.

If the API/documented semantics cannot prove that an old resourceId/publicUrl refers to the current-account object intended by the old Journal entry, preserve the record and refuse remote mutation.

## Required deterministic / real-Yandex regressions

1. Current `/v1/disk` returns no UID: destructive operation fails closed as today.
2. Legacy local entry has resourceId but no accountUid; current account contains same/path-compatible candidate: no destructive mutation occurs until safe re-bind.
3. Legacy entry has publicUrl but no accountUid: public URL alone cannot waive account binding.
4. Safe re-bind under proven account A persists accountUid/root/provenance and subsequent operation succeeds only in A.
5. Reauth A→B after re-bind: operation fails before B mutation.
6. Imported entry with a forged/populated accountUid still follows P0-022 `imported-unverified` rules; populated field is not a signature.
7. Current new live save continues to fail closed if account UID cannot be established before checkpoint/remote operation.
8. Real Yandex E2E should characterize `resource_id` behavior across move/account contexts before any code treats it as stronger than documented.

## External documentation note

Current official Yandex Disk REST documentation confirms that the API operates on the authorized user's personal Disk and exposes user/account metadata. This audit did not find an official statement establishing private `resource_id` as a globally unique cross-account authorization identity. The safe implementation must therefore keep account UID as an independent required namespace fence rather than infer global uniqueness.

## Classification

- Extend existing `P0-073`; no new P0/P1 item.
- Preserve `P0-022`, `P0-074`, `P1-184`, `P1-090` as separate layers.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `AUDIT_DELTA_YANDEX_MIXED_ROOT_PUBLICATION_CONTEXT_2026-08-28.md`

SHA-256 of UTF-8 source text: `046a6ebe3b77bca0398d711b74dacafe334845e166dc8df3828e59d44dabd0a1`

# Audit delta — mixed-root publication authorization inside one Yandex operation — 2026-08-28

Source-of-truth `main` immediately before this write: `d4ccfb01f0515511b09d149bed79cb07b3fce322`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof composes existing **P0-074** immutable Yandex operation context with **P0-078** publication-policy generation, plus **P0-073/P1-184** namespace/object proof and **P1-158** bounded prerequisite reads.

Previous single-operation-context audit proves current upload can mix root A metadata with path C. This pass adds a stronger privacy consequence: **publication authorization from old config generation A can be applied to a remote object created under newer root/config generation B where publication is currently disabled.**

No new root cause is needed; P0-078 cannot be implemented as an independent boolean fence detached from P0-074's full config/namespace context.

## Current upload captures publication policy early

`uploadCachedRecordToYandex()` obtains an initial:

`const config = await getYandexConfig()`.

Later it stores publication policy in the remote checkpoint using:

`createPublicLinks: config.createPublicLinks`.

After upload/reuse checkpointing it decides whether to publish with:

`if (config.createPublicLinks) ensureYandexPublicUrl(remotePath, ...)`.

Thus publication authorization is taken from the original local `config` object retained by the operation.

## Service-folder/root work can use a different config generation

The same operation later calls helpers such as `ensureYandexServiceFolders()` that independently read current Yandex config/root/auth.

The prior single-operation-context delta already proves this can make `remotePath` come from a newer root C while the checkpoint's `rootPath` comes from older config A.

Publication now reveals why mixed config fields are more than recovery inconvenience.

## Deterministic stale-policy/new-root publication schedule

Assume configuration generation A is:

- `rootPath = R1`;
- `createPublicLinks = true`.

Then user/import commits generation B:

- `rootPath = R2`;
- `createPublicLinks = false`.

Valid schedule:

1. Upload U begins under A and captures local `config=A`.
2. Before service-folder preparation, settings B commits atomically/currently.
3. `ensureYandexServiceFolders()` fresh-reads B and returns Upload/ReadmeLater paths under R2.
4. U constructs `targetFolder` / `remotePath` under **R2**.
5. U can checkpoint/upload/reuse an object at R2 path while other current requests use current auth/config state.
6. Publication branch later checks **old** `config.createPublicLinks === true` from A.
7. U calls `ensureYandexPublicUrl(remotePath)` for the **R2** object.
8. Current policy B explicitly says public links are disabled, but stale authorization from A is applied to an object in B's namespace generation.

The resulting operation state never existed as one user configuration: `{root=R2, publish=true}` is synthesized by mixing A and B.

## Why this is stronger than ordinary P0-078 stale checkpoint recovery

P0-078 already proves an old checkpoint captured with `createPublicLinks=true` can later publish during recovery after the user disables the global setting.

This pass adds a within-one-live-operation composition:

- stale publication authorization A;
- newly selected root/path B;
- potentially newer auth/account generation;
- one remote object receiving the combined side effect.

So fixing only recovery to recheck publication policy is insufficient. The live operation itself must never assemble policy and target namespace from different config generations.

## Why rechecking only the boolean before publish is also insufficient

A naive patch could fresh-read current `createPublicLinks` immediately before `ensureYandexPublicUrl()`.

That prevents the exact stale-true/now-false publish, but it still lets an old operation silently switch semantic generations mid-flight:

- initial authorization/context A;
- target path B;
- final publication policy C.

If current boolean happens to be true again after disable/re-enable, A→B→C can pass value equality while representing different user decisions/generations.

The invariant is **same immutable operation context**, not last-value-wins boolean freshness.

## Required `YandexOperationContext`

At operation admission create one immutable context generation binding at least:

- config generation/revision;
- normalized rootPath;
- `createPublicLinks` publication policy + policy generation;
- auth session/token generation (secret represented by fingerprint/nonce, not logged);
- proven account UID;
- client/config fields required by this operation;
- worker operation receipt;
- source/PDF generation as appropriate.

Every helper receives that context or an expected generation. Helpers may fresh-read current state only to prove the context is still allowed/current; they may not substitute individual new fields into the old operation.

## Two acceptable policy models

### Frozen-context model

Once save U is explicitly admitted under context A, it executes entirely under A so long as A's auth/context remains valid according to product policy.

A settings change to B does not silently retarget U to R2. U continues R1/A or is canceled/staled before another side effect.

For privacy-sensitive publication, product may choose a stricter rule that disabling publication immediately revokes any not-yet-started publish even for an otherwise frozen upload. In that case the revocation is an explicit generation check, not adoption of arbitrary new config fields.

### Current-generation-required model

Any config generation change invalidates not-yet-settled U. U fails stale before further external side effects and user explicitly starts a new B operation.

This is simpler and safest where preserving old auth/root context is impractical.

Both models prohibit mixing R2 with A's publication authorization.

## P0-078 publication revocation precedence

For privacy, disabling public links should revoke authority for a publish side effect that has **not yet been admitted**.

Therefore even under a frozen-context upload model:

- transfer already admitted may need to settle/reconcile under its exact old receipt;
- a later publish step requires a current permission/policy fence;
- if policy generation was revoked before publish admission, do not publish;
- if publish was already admitted and outcome becomes unknown, retain exact publication attempt receipt and reconcile rather than falsely claiming private.

This separates upload physical settlement from publication authorization.

## Checkpoint coherence

Remote checkpoint must not contain impossible combinations such as:

- `rootPath=R1` but `remotePath=R2/...`;
- account UID from auth B but token-side effects from A;
- publication policy generation A attached to object generation B;
- PDF/content receipt from another retry generation.

Checkpoint admission should assert internal context coherence before any irreversible signed PUT/publish proceeds.

## P1-158 bounded-read consequence

`getYandexConfig()` is currently a direct unbounded `chrome.storage.local.get` helper in several worker paths.

Making that read bounded is required, but not sufficient. A correct context acquisition needs:

1. bounded read of one versioned config snapshot;
2. exact config revision/generation included in the returned context;
3. bounded/proven account/auth snapshot belonging to the same admission generation;
4. no later helper silently replacing pieces with fresher unrelated snapshots.

Bounded independent reads can still produce a logically mixed context if they are not generation-related.

## Required regressions

1. Start under `{R1,publish=true}` -> change to `{R2,publish=false}` before folder ensure -> operation never publishes an R2 object using old true.
2. Same schedule -> checkpoint never stores `root=R1` with `remotePath=R2/...`.
3. Start A -> settings disable publication before publish step while upload already settled -> no new publish is admitted; upload reconciliation remains valid.
4. Publish already admitted under A -> user disables -> outcome unknown -> exact publish attempt is reconciled; UI does not claim private solely from new setting.
5. A publish=true -> B false -> C true with same textual root -> delayed A cannot become current merely because boolean equals C again; generations distinguish them.
6. Root changes without publication toggle -> operation remains one coherent root generation or fails stale; no path/config mixing.
7. Auth/account changes while root/policy values remain equal -> operation generation still detects replacement and does not mix tokens/account receipts.
8. Recovery uses the immutable checkpoint context and does not reconstruct publication authorization from whichever current config value happens to exist.
9. A remote object is observed as already public while policy=false -> observed publication truth remains recorded (publication-observation delta); false policy means no **new publish authorization**, not denial of existing remote state.
10. Explicit unpublish/delete privacy lifecycle remains P0-069/P1-164 and is not inferred from createPublicLinks toggle.
11. Bounded config/auth read timeout fails before external admission and a late read result cannot silently resume old operation under a new generation.
12. Stable one-generation save retains normal current behavior.

## Duplicate check

- **P0-074** primary immutable Yandex operation/config/auth context.
- **P0-078** publication-policy generation/revocation before publish admission.
- **P0-073** account/root namespace receipt.
- **P1-184** exact physical remote object/content proof.
- **P1-158** bounded prerequisite reads feeding, not replacing, context generation.
- **P0-069/P1-164** remain explicit unpublish/destructive publication lifecycle.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_MOVE_POSTSTATE_IDENTITY_CONTINUITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `3e407bd237b7de3386561e06634c0b1464cb8b69ad56985d116d396f035c5677`

# Audit delta — Yandex move post-state identity continuity — 2026-08-28

Source-of-truth `main` immediately before this write: `9de1926b367bd0f2cedcab257b77623a22a1a6f9`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh proof refines existing **P1-090** (exact source→target reconciliation for Yandex move) and **P1-183** (durable Delete→Trash target/checkpoint). It also applies the same identity-continuity requirement to **ReadmeLater→Upload**. P0-073/P0-074 remain namespace prerequisites; P0-076 remains local Journal-generation fencing.

The existing audits already record that post-move target verification accepts a file at the target path without requiring exact `resource_id`. This pass isolates the stronger acceptance rule: **the exact object identity proved immediately before the move must be carried as the expected identity into every post-state verification and local commit.**

## Positive control — pre-move locate can prove a strong current object

`findYandexFileForJournalEntry()` has materially stronger matching logic than the later move verifier:

- when `entry.resourceId` is available and the API returns `resource_id`, it requires equality;
- it can use the stored `publicUrl` as secondary legacy evidence when resource id is unavailable;
- after known-path checks it can perform a bounded search by stable identity;
- if neither `resourceId` nor `publicUrl` exists and the stored path disappeared, it fails closed rather than globally guessing by filename.

Therefore the move workflow often has a concrete current source object in hand before issuing `POST /resources/move`.

That proven identity should become the immutable source receipt for the rest of the saga.

## Current post-move verifier is path-oriented

Both destructive move families poll `GET /resources` at the chosen `targetPath` after a successful `resources/move` response:

- Journal Delete→Trash;
- ReadmeLater→Upload.

The requested fields include `name,path,type,size,public_url,resource_id`, which is a useful data source. However current success logic does not enforce that the target `resource_id` equals the exact pre-move source object identity before treating the target as the moved object.

The local Mark Read commit then uses target metadata when available:

- `remotePath` from moved path/target;
- `filename` from moved name;
- `publicUrl` from moved public URL, otherwise old entry value;
- `resourceId` from moved resource id, otherwise old entry value.

Delete→Trash similarly returns the target path and chooses target/current/entry resourceId for diagnostics/result.

This means the code has enough metadata to prove continuity in the strong case but currently treats it mostly as descriptive state.

## Fresh identity-continuity consequence

A move saga has two distinct identities:

1. **pre-move source object receipt** — the exact object the user authorized WebClip to move;
2. **post-move target observation** — whatever object currently occupies the chosen target path.

The second must prove it is the first.

A target-path observation cannot create object authority merely because:

- the path was generated by WebClip;
- `overwrite=false` was requested;
- the response is `type=file`;
- name/size resembles the expected file.

External clients, old unresolved attempts, collision handling, eventual observation, and unknown-settlement races make path occupancy an observation, not a transfer receipt.

## Stronger legacy case — expected identity should use the fresh source, not only the old Journal fields

A particularly important implementation detail is the legacy case.

Suppose the Journal entry lacks a stored `resourceId` but has sufficient legacy evidence (for example a public URL) for `findYandexFileForJournalEntry()` to safely locate source S. The fresh source metadata may now expose `current.resource_id = R`.

Once R is observed and accepted for S, the move saga should **upgrade its in-flight expected identity to R before the destructive POST**. It must not continue post-state verification as if the entry still had no resourceId.

Otherwise the strongest evidence learned immediately before mutation is discarded and the target verification remains unnecessarily path-only.

This does not mean silently rebinding arbitrary imported/legacy entries for future authority; P0-022/P0-073 still govern durable migration/rebind provenance. It means the current operation must retain the exact source identity it actually proved.

## Required P1-090 contract

Before move admission, produce an immutable `sourceObjectReceipt` containing at least:

- historical/local binding provenance class;
- current account UID and root/config operation generation;
- exact source path;
- exact fresh `resource_id` when returned;
- secondary public identity if used;
- operation/move generation;
- expected Journal entry generation.

After move or unknown settlement, target verification must compare the target observation to that source receipt.

### Strong case

If source `resource_id=R` was proved and target returns `resource_id`:

`target.resource_id === R`

is mandatory before success/local finalization.

A different target id is conflict, even when path/type/name/size match.

### API-omits-id case

If Yandex omits `resource_id` on the target response, do not silently downgrade a previously strong receipt to path-only authority. Use only an explicitly designed secondary proof/retry policy supported by real API semantics, or keep the outcome unresolved.

### Legacy weak source

If the source itself cannot be upgraded to a strong object receipt, retain the explicitly weaker provenance class and apply the stricter legacy/rebind rules. Do not claim exact move proof from target path alone.

## Local commit must consume the verified post-state receipt

For Mark Read, the Journal update to `readingMode:'read'`, target `remotePath`, `resourceId`, `publicUrl`, and moved timestamp must be derived from the exact verified target receipt.

Do not fall back to an unrelated/old value in a way that makes a conflicting target appear verified.

For Delete→Trash, the durable delete saga should record the exact verified target object receipt before local Journal removal. Even when the user no longer needs the entry, recovery/diagnostics must know which exact object moved.

## Unknown POST settlement

A local timeout before the ordinary verify loop remains P1-090/P1-183 unknown settlement. Recovery must use the same frozen `sourceObjectReceipt` and exact chosen target path. It must not reconstruct expected identity later from whichever record currently occupies the Journal id/path.

## Required regressions

1. Source exact id R -> move to target -> target id R: operation succeeds and local state records the verified receipt.
2. Source id R -> target path contains different id Q after response/race: fail closed; Q is not adopted.
3. Same different-id case with equal filename and byte size: still reject.
4. Legacy entry lacks stored resourceId, fresh pre-move source metadata exposes R -> target verification requires R.
5. Fresh source exposes R but target GET omits resource_id -> do not downgrade silently to path-only success.
6. Mark Read target conflict -> local entry remains `later`/pending recovery; it is not rewritten to the conflicting Upload object.
7. Delete→Trash target conflict -> local Journal management reference/checkpoint is retained.
8. POST timeout after physical move -> recovery finds target with exact R and finalizes once without second move.
9. POST timeout -> source still has R and target has Q -> do not infer success or issue blind second move until first generation is classified.
10. Account/root changes during reconciliation -> P0-074 context fence prevents querying/adopting a different namespace.
11. Imported-unverified record that happens to contain a forged resourceId remains constrained by P0-022; this move receipt cannot bless imported metadata by syntax alone.
12. Normal already-in-target-folder recovery still proves exact object identity before treating the operation as complete.

## Duplicate check

- **P1-090** is the primary owner: exact source→target move outcome/object proof.
- **P1-183** owns Delete→Trash durable target checkpoint.
- **P0-073/P0-074** own account/root/auth/config namespace generation.
- **P0-022** owns imported/legacy destructive provenance.
- **P0-076** owns local Journal entry-generation finalization.

No new P1-211 is required.

## Test / release state

Documentation only. Product tests were not rerun; historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_OFFSET_PAGINATION_SNAPSHOT_COHERENCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `893998903e92f4316eaaf5c059909e3294e5cdc21d0b659e1db734dc89166b23`

# Audit delta — Yandex offset-pagination snapshot coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `7ba2e546fc977f5fa156b5d5fb876d93cd7a2e8c`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-133** (bounded Yandex directory/backup pagination) and, for restore selection, composes with **P0-013/P1-184** exact selected-object identity.

P1-133 currently proves memory/result caps. This pass adds a logically separate acceptance condition inside the same pagination owner: offset-based pages fetched from a mutable remote directory are not automatically one coherent listing snapshot.

## Current pagination algorithm

`listYandexDirectoryItems(path, ...)`:

- uses `pageSize = 200`;
- starts `offset = 0`;
- GETs `/resources` with `{path, limit:200, offset}`;
- appends/collects the returned page;
- advances `offset += page.length`;
- repeats until reported total/current page length says the scan is complete.

The implementation has useful hard caps and a total deadline, and filters/projections are applied during traversal rather than retaining all 50k metadata records. Preserve those P1-133 controls.

However each page is a separate network request. No remote snapshot id/version/ETag/generation is captured and compared across pages, and no stable server-side continuation token is used.

## Deterministic mutable-directory schedules

### Deletion before the current offset can skip an item

1. Page 1 returns remote sequence `[A1..A200]`.
2. WebClip sets `offset=200`.
3. Another client deletes A1 before page 2.
4. The server's current sequence shifts left by one.
5. WebClip requests current `offset=200`; the object that was originally at position 201 may now be at position 200.
6. That object can be skipped entirely.

### Insertion before the current offset can duplicate an item

1. Page 1 returns `[A1..A200]`.
2. Another client inserts a newly sorted/ordered object before that range.
3. Existing items shift right.
4. Page 2 from offset 200 can contain an item already returned at the end of page 1.
5. The assembled list contains duplicates and may displace another later item before termination.

The exact server ordering semantics may vary, but offset pagination over a mutable collection cannot be treated as one atomic snapshot without a server consistency primitive or client reconciliation proof.

## Why refreshing `_embedded.total` is insufficient

Current code replaces `total` whenever a later page reports a finite total.

That protects hard-cap accounting but does not identify which records moved across offsets. The same count can describe a different membership/order, and a count change does not reveal exactly which item was skipped or duplicated.

Therefore `total` is size observation, not listing-generation identity.

## Restore picker consequence

`listJournalBackupsOnYandex()` uses this paginator and returns the collected matching backup JSON files to Journal for explicit selection.

The exact-object repair already required by P0-013/P1-184 remains the safety boundary after selection: fetch must prove the exact object the user selected rather than trust path alone.

But pagination coherence still matters before selection:

- a legitimate backup can be omitted from the picker;
- an item can be shown twice;
- the user may believe a month has no/only certain backups when the assembled list crossed remote revisions;
- later exact-object binding cannot repair an object that was never shown.

This is primarily P1 reliability/view integrity, not a new destructive P0.

## Folder-picker consequence

The same helper backs other Yandex directory/folder listing surfaces. A mutable remote directory can produce incomplete/duplicate choices there as well.

Do not fix only the Journal backup mapper while leaving the shared paginator semantically unchanged.

## Required P1-133 refinement

### Prefer a stable server continuation/snapshot primitive if available and E2E-proven

If the real Yandex API exposes a documented stable continuation token, revision/ETag semantics, or another snapshot-consistent listing mechanism for this endpoint, use and validate it in real Yandex E2E before relying on it.

Do not invent snapshot guarantees from offset/total fields.

### Otherwise detect/reconcile remote churn

A client-side design may use a bounded consistency receipt such as:

- directory metadata/version before and after traversal when documented as authoritative;
- stable unique object identity per result plus a bounded second verification pass;
- restart-on-change policy with a strict retry budget;
- explicit `directory changed, refresh required` outcome when coherence cannot be proved.

The exact implementation depends on Yandex API semantics and must be verified against the real service.

### Never silently deduplicate by path alone as a correctness proof

A `Set(path)` could hide visible duplicates but would not recover skipped objects and could merge replacement objects that reused the same path.

Where object identity exists, use the strongest stable remote identity. Path remains location, not immutable identity under P1-184.

### Boundedness remains mandatory

Any consistency retry/reverification must preserve:

- current 45s-ish bounded traversal budget or an explicitly bounded replacement;
- max scanned items;
- max collected relevant results;
- projected fields only;
- no unbounded restart loop under a directory receiving continuous writes.

After retry budget exhaustion, expose a truthful refresh/degraded result rather than silently publishing a list as complete.

## Required regressions / real-service checks

1. Stable directory over multiple pages -> every object appears once, current bounds preserved.
2. Delete an item before current offset between page 1/page 2 -> scan detects/restarts/fails refresh-required; it does not silently claim a complete list with a skipped object.
3. Insert before current offset -> no silently duplicated/complete-claim result.
4. Same total but changed membership/order between pages -> count equality alone is not accepted as snapshot proof.
5. Backup picker with remote churn never binds selection to a path-only replacement; P0-013/P1-184 exact object receipt remains mandatory.
6. Continuous churn -> bounded retries then explicit refresh-required, no infinite scan.
7. Directory > hard limit still fails at P1-133 cap even if consistency mechanism is active.
8. Result projection remains bounded; consistency repair does not restore old 50k metadata retention.
9. Folder picker and backup picker share the same coherent-list primitive.
10. Real Yandex E2E documents whether the API offers any usable revision/continuation guarantee before implementation assumes one.

## Duplicate check / numbering

No new P-number is created.

- **P1-133** remains the shared Yandex directory pagination owner, expanded from memory/result boundedness to coherent traversal semantics.
- **P0-013/P1-184** remain exact selected backup/object identity after the user chooses an item.
- **P0-074** remains account/root/config namespace generation.

**P1-211 is already assigned to deleted Journal comment tombstone lifecycle and is not reused.**

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_YANDEX_SIGNED_TRANSFER_PHASE_2026-08-27.md`

SHA-256 of UTF-8 source text: `55c71ddad776ff26a709511c83caaa4b89698cc93c9d38d6f32676b1bb68da92`

# Audit delta — Yandex signed-transfer durable phase / backup content receipt — 2026-08-27

Source-of-truth `main` immediately before this write: `c4fefcac36adb1ced1bf43750d415fb9bfd5082e`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof strengthens existing:

- `P1-184` — exact remote object/content proof and unknown-settlement reconciliation;
- `P1-052` — Journal backup prepared-checkpoint unknown settlement (already reopened by later audit deltas; 15 min + 3x404 is not authoritative negative proof);
- `P1-179` — Journal backup pending/state namespace identity;
- `P0-073` / `P0-074` — immutable account/root/auth/config operation context;
- `P0-079` — immutable local PDF byte generation for PDF upload;
- `P1-194` — truthful recovery durability class.

The concrete missing layer proven here is a **durable side-effect phase/admission receipt**: current checkpoints distinguish `prepared` from `remote-verified`, but do not durably distinguish “signed PUT was never admitted/sent” from “signed PUT may already have started and its settlement is unknown”.

For Journal backup, a second gap compounds this: the exact staged backup body is deleted before remote object/content verification, leaving the prepared checkpoint with only path/size-level evidence.

## Positive control — irreversible transfer is pre-checkpointed

Both major Yandex upload flows correctly create durable recovery state **before** sending the signed upload body:

### PDF save

`uploadCachedRecordToYandex()` obtains the signed upload URL, then calls `ensureRemoteCheckpoint()` before `runOffscreenSignedTransfer({ mode:'pdf-cache-upload', ... })`.

The checkpoint is therefore present before the irreversible signed PUT can begin.

### Journal backup

`exportJournalBackupToYandex()` writes `JOURNAL_BACKUP_PENDING_KEY` with `phase:'prepared'` before invoking `runOffscreenSignedTransfer({ mode:'text-chunks-upload', ... })`.

This ordering is valuable and must be preserved. The finding is **not** “there is no checkpoint before upload”.

The defect is that the checkpoint is not advanced to an exact attempt/admission phase before handing the transfer to an execution context that can outlive/lossily communicate with the service worker.

## Fresh source proof — common signed transfer layer

### 1. Every offscreen transfer gets a random transferId, but it is not a durable recovery key

`runOffscreenSignedTransfer()` creates:

`transferId = signed-<random UUID>`

and includes it in:

- OperationLog request/response events;
- the `WEBCLIP_SIGNED_TRANSFER` offscreen message;
- offscreen heartbeats.

Fresh service-worker search finds no persistence of this transferId into `pendingRemoteSaves` or the Journal backup pending checkpoint.

Thus transferId is diagnostic/runtime correlation only. It cannot answer after restart which exact signed-transfer attempt may have crossed the external side-effect boundary.

### 2. Offscreen admission follows actual promise settlement, not caller timeout

Offscreen reserves transfer count/bytes synchronously on `WEBCLIP_SIGNED_TRANSFER` admission and releases that reservation only in `.finally()` of the actual `handleSignedTransfer()` promise.

This is the correct P0-063 resource-lifetime shape: a caller-side timeout/lost response does not falsely free offscreen capacity while the actual fetch/IDB work is still running.

But the durable checkpoint does not receive an equivalent side-effect-admission receipt.

Resource ownership is therefore stronger than recovery ownership: offscreen knows that an actual transfer is/was running, while restart recovery sees only `phase:'prepared'`.

### 3. Worker deliberately disables transport retry for signed transfer

`runOffscreenSignedTransfer()` calls `sendMessageToOffscreen(..., { retryTransportErrors:false })`.

That is correct: a lost runtime response must not automatically cause a second PUT when the first may have started.

However after the call fails/times out, the durable checkpoint still has no explicit `transfer-admitted/started/unknown` state and no transfer-attempt id.

Suppressing immediate retry prevents one duplicate mechanism; it does not by itself preserve exact durable knowledge of whether the irreversible boundary was crossed.

## PDF remote-save phase proof

`checkpointPendingRemoteSaveIntent()` writes:

- `phase:'prepared'`;
- journalEntryId / operationId;
- expectedPdfBytes;
- account/root/path metadata;
- publication preference snapshot.

After the checkpoint is written, the signed PUT is invoked.

There is no durable update such as:

- `phase:'transfer-admitted'`;
- `transferAttemptId`;
- `transferStartedAt`;
- immutable signed-transfer/body generation receipt.

If the offscreen transfer throws/times out, the caller throws and leaves the checkpoint in `prepared` state. Background recovery later cannot tell from that phase whether:

1. offscreen admission failed before fetch could start;
2. body materialization failed before network send;
3. PUT started and was client-aborted/timed out;
4. PUT physically committed but the response was lost;
5. service-worker/offscreen communication failed after the side effect had already started.

All of those collapse into the same durable state.

This is especially important once P0-079/P1-184 add exact local content receipts: the transfer attempt that used those exact bytes must itself be represented durably, not inferred only from later path observation.

## Journal backup phase + local-content proof

### 1. Backup pending checkpoint is also only `prepared`

Before signed PUT, backup stores a pending object containing:

- `phase:'prepared'`;
- operationId;
- remotePath / filename / monthFolder;
- expectedBytes;
- entryCount / exportedAt;
- timestamps/attempt fields.

It does not contain a transferAttemptId, transfer-admission phase or immutable content digest.

P1-179 separately requires accountUid/rootPath/config generation; those fields are also absent today.

### 2. Exact staged backup payload is deleted in `finally` immediately after signed-transfer call

The backup upload does:

1. stage the full export into chunked transfer storage;
2. create the `prepared` backup checkpoint;
3. call `runOffscreenSignedTransfer({ mode:'text-chunks-upload', payloadKey: staged.stagingKey, ... })`;
4. in `finally`, call `deleteTransferPayloadGroup(staged.stagingKey)`;
5. only **after that**, process transfer response and perform remote metadata verification.

Therefore the exact local body is released before remote object/content verification has succeeded.

This happens on both success-response and error/timeout paths because cleanup is in `finally`.

### 3. After unknown settlement, checkpoint retains only weak content evidence

Once staging is deleted, the backup checkpoint retains `expectedBytes` but no strong digest/fingerprint of the exact JSON bytes that were handed to signed PUT.

Recovery then reads the remote path and currently verifies mainly `type=file + exact size`, exactly the weak proof already tracked by P1-184.

Thus stronger P1-184 acceptance cannot be implemented only in the later GET logic: backup must create and retain a **local content receipt before releasing the staged body**.

If a real Yandex API supplies a trustworthy checksum/immutable creation identity in the relevant metadata, that local receipt can be compared to it after E2E validation. If the API cannot prove content equality, WebClip must not label path+size as exact proof.

### 4. Successful PUT response does not make path identity sufficient

Even when offscreen returns HTTP success, WebClip subsequently performs metadata verification because the product needs exact remote state before final backup-state publication.

Deleting local staging before that verification means a failure in the verify window leaves only the prepared path/size checkpoint.

Therefore this is not limited to caller timeout: ordinary “PUT returned success, verification then failed” also loses the exact staged body before remote proof is durable.

## Relation to P1-052

P1-052 was originally implemented as a grace policy for prepared backup 404s. Later audit already proved that 15 minutes + three 404s are not authoritative proof that an unknown signed PUT never committed.

The new phase evidence explains why `prepared` is semantically overloaded:

- a checkpoint written but definitely never admitted to offscreen is materially different from;
- a checkpoint whose PUT may have started and now requires unknown-settlement reconciliation.

A future cleanup/retry policy can be more precise only if that boundary is durable.

However even a `transfer-started` flag is not sufficient negative/positive proof by itself. It tells recovery which class of reconciliation is required; it does not prove the server committed or did not commit.

## Relation to P1-184

P1-184 needs three separate identities:

1. **local content receipt** — which exact PDF/backup bytes were intended;
2. **transfer attempt receipt** — which irreversible signed PUT attempt may have carried them;
3. **remote object/content receipt** — which exact Yandex object/content ultimately resulted.

Current code has partial pieces:

- PDF has local cached bytes but mutable tab ownership (P0-079) and no strong content digest;
- backup has exact staged bytes temporarily, then deletes them before remote proof;
- runtime transferId exists but is not durable;
- remote verification has path/size and later resourceId, but path/size cannot prove same content/object under unknown settlement.

Fixing only one layer cannot close P1-184.

## Required durable transfer-phase contract

### Attempt identity before irreversible admission

Before calling offscreen for a signed PUT, create a random locally issued `transferAttemptId` bound to the exact operation/checkpoint generation.

Persist a transition equivalent to:

`prepared -> transfer-admitted/may-have-started`

**before** handing the request to offscreen.

This state should conservatively mean: from this point onward, recovery must assume the external PUT may occur, even if the service worker loses the response immediately.

If the worker dies after persisting this state but before actual offscreen send, recovery may conservatively classify the attempt as unknown even though no PUT occurred. That false-positive uncertainty is safer than a false “not started” that authorizes blind retry.

### Offscreen receipt

Pass the same durable transferAttemptId to offscreen.

Heartbeat/result can carry that id, but the offscreen message must not invent a separate unrelated runtime-only identity if exact recovery correlation is required.

If a response returns, transition the exact attempt according to actual transport result; a stale response cannot update another attempt generation.

### Unknown settlement

Local timeout, worker termination, lost runtime response, abort after request transmission, or unclassified transport error after admission must transition/remain in an `outcome-unknown` class.

Do not convert it to `prepared/not-started` merely because the caller received an exception.

No automatic second non-idempotent/overwrite-sensitive attempt until exact operation-specific reconciliation permits it.

### Never-started admission failures

Failures that are proven to occur **before** offscreen transfer admission/network side effect (for example a synchronous/bounded resource-admission rejection before `handleSignedTransfer()` is accepted) may be classified separately as `not-started` if the proof itself is trustworthy and bound to the attempt.

Do not infer this class from absence of a later remote file alone.

## Required backup content-receipt contract

Before deleting staged chunks, persist a bounded strong local receipt for the exact exported byte stream, at least:

- content byte length;
- cryptographic digest/fingerprint suitable for integrity comparison if the remote API can expose a trustworthy counterpart;
- export schema/version;
- entryCount/exportedAt as diagnostics, not substitutes for digest;
- transferAttemptId;
- immutable account/root/config namespace from P1-179/P0-074.

Whether the full staged body must remain after PUT depends on the verified remote reconciliation mechanism:

- if strong remote content proof can be performed from the digest, the large chunks may be released once their digest/attempt receipt is durably committed;
- if exact same bytes are required for safe retry/manual recovery and cannot be reconstructed identically, keep or migrate the body under a bounded recovery owner until terminal settlement;
- if hard storage pressure prevents retaining the body, downgrade recovery truthfully to unresolved/manual rather than pretending path+size is proof.

The product must choose an explicit bounded policy; current unconditional `finally` deletion before remote proof is not sufficient evidence for the stronger recovery promise.

## Required regressions

### PDF

1. Checkpoint PREPARED commits; offscreen admission is rejected before fetch: attempt is classified as proven-not-started only when exact admission evidence supports it.
2. Durable transfer-attempt state commits; worker dies before/while offscreen receives message: recovery treats outcome conservatively as unknown, never as automatic safe retry.
3. PUT physically commits but runtime response is lost: exact transferAttemptId/local content receipt survives and reconciliation binds the resulting remote object to that attempt.
4. Local timeout/Abort after request transmission: checkpoint remains unknown; no blind second PUT.
5. Manual retry after unknown A creates a distinct attempt generation B and cannot overwrite A's attempt receipt (compose with remote checkpoint generation audit).
6. Equal-sized different PDF cannot satisfy A solely by size.

### Journal backup

7. Exact staged bytes get a durable content receipt before chunks are deleted.
8. PUT returns success, metadata verification fails: checkpoint still retains exact content/attempt receipt; recovery does not fall back to size as if it were identity.
9. PUT timeout/unknown: chunk cleanup policy preserves enough exact recovery evidence according to the chosen bounded design.
10. Staging-admission failure before transfer can be distinguished from may-have-started transfer; both do not share an ambiguous plain `prepared` semantic.
11. Worker termination after transfer-attempt admission preserves attempt identity across restart.
12. Three 404s/15 minutes do not erase a may-have-started attempt without authoritative negative proof (P1-052 refinement).
13. Account/root change cannot cause recovery of the old attempt under a new namespace (P1-179/P0-074).
14. Same-size unrelated backup object never becomes remote-verified without stronger object/content proof (P1-184).

## Classification / registry consequence

No new P-number assigned.

Extend/refine:

- `P1-184`: durable content + transfer-attempt + remote-object receipt must form one exact proof chain;
- `P1-052`: prepared backup state must distinguish never-admitted vs may-have-started unknown outcome; 404 grace remains policy, not negative proof;
- `P1-179`: backup transfer attempt/content receipt must be scoped to immutable account/root/config namespace;
- `P0-073/P0-074`: PDF transfer attempt and reconciliation remain bound to exact Yandex identity/context;
- `P0-079`: PDF transfer attempt consumes one exact immutable local cache generation;
- `P1-194`: UI/OperationLog must not describe recovery as guaranteed beyond the durability/proof actually available.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.

