# P0-076 — Journal generation / per-entry CAS acceptance matrix — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this consolidation: `research/p0-076-journal-generation-cas-2026-09-06 @ 714fd4cc57483647bf7daa49689e4807ee0afa9a`  
Owner: **P0-076 ACTIVE**.

This document consolidates the current P0-076 research contract into one implementation/acceptance matrix. It does not claim runtime implementation. Earlier dated P0-076 checkpoints remain evidence and race proofs; this file is the current summary where wording differs.

## 1. Current root cause

Current Journal single-entry commands target textual `entry.id` but do not prove the exact local Journal generation / entry incarnation / entry revision observed by the caller.

Current risky shapes include:

- `updateJournalEntryRecord(id, patch)` -> current-row read + blind merge + put;
- comment handlers that build mutation state from an earlier separate read;
- `deleteJournalEntryRecordOnly(id)` -> separate read followed by later key-only delete;
- Mark Read checkpoint/finalization writes that repeatedly identify by id across asynchronous remote work;
- UI mutation messages carrying id/comment/diskAction/operationId but no exact rendered mutation authority;
- direct Journal view transactions reading `entries` without `meta` authority.

A same textual id after clear/import/delete-recreate is not proof of the same local entry generation.

## 2. Global Journal mutation-generation control

Stable exact meta key:

```text
journalMutationGeneration
```

V1 body:

```text
{
  version: 1,
  generation: '<worker-issued UUID-v4>',
  destructiveBoundarySeen: <boolean>
}
```

Rules:

- key name is stable across body versions;
- body version, not key suffix, owns schema evolution;
- missing key is legacy bootstrap state;
- malformed/future body is fail-closed, never interpreted as missing;
- generation uses `crypto.randomUUID()` with no `Math.random()` fallback;
- point mutation does not rotate global generation;
- destructive clear/import rotates generation atomically;
- `destructiveBoundarySeen` becomes true at the first destructive boundary and never returns to false in v1.

Research: **COVERED**. Runtime: **RED**.

## 3. Local per-entry authority

Modern Journal rows persist local-only:

```text
journalLocalRevision = {
  version: 1,
  generation: '<worker-issued UUID-v4>',
  revision: <positive safe integer>
}
```

Semantics:

- generation = local incarnation of textual entry id;
- revision = exact committed state within that incarnation;
- fresh local entry -> fresh generation + revision 1;
- point mutation -> same generation, revision +1;
- same-id delete/recreate/import replacement -> new generation;
- revision never wraps silently;
- missing field = legitimate legacy row;
- present malformed/future field = indeterminate/fail-closed, not legacy.

Research: **COVERED**. Runtime: **RED**.

## 4. Modern rendered mutation authority

Ephemeral mutation-capable UI projection:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'modern',
  journalGeneration,
  entryGeneration,
  entryRevision
}
```

The authority is view/IPC state only. It is not a second persisted copy and is not portable.

Maximum compact JSON envelope:

```text
MAX_JOURNAL_MUTATION_AUTHORITY_JSON_CHARS = 512
```

Research: **COVERED**. Runtime: **RED**.

## 5. Legacy rendered mutation authority

Existing rows without `journalLocalRevision` use a temporary conservative bridge:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'legacy',
  journalGeneration: '<current UUID or empty if control absent>',
  legacyDbRevision: '<exact bounded IDB meta revision or empty if absent>'
}
```

Requirements:

- entry, generation control and DB revision are observed in the same readonly `[entries, meta]` transaction;
- `MAX_LEGACY_DB_REVISION_CHARS = 128`;
- present malformed DB revision is not equivalent to absence;
- first successful legacy mutation validates generation + exact DB revision in one readwrite transaction, performs the mutation, installs fresh modern `journalLocalRevision`, then returns modern authority;
- unrelated Journal mutation may invalidate a legacy authority; this is conservative rollout behavior only.

Research: **COVERED**. Runtime: **RED**.

## 6. Same-snapshot requirement

Invalid pattern:

```text
T1: read old entry
writer: commit new entry + new meta revision
T2: read new meta revision
caller receives old entry + current revision
```

Therefore mutation-capable direct view reads must include `entries + meta` in one readonly transaction.

Current Journal page already publishes main direct view results on `tx.oncomplete`; this is a positive control for the applicable P1-086 boundary.

Aggregate counts/domain metadata that return no mutation-capable entry object do not need `meta` solely for P0-076.

Research: **COVERED**. Runtime: **RED** for authority snapshot.

## 7. Direct/fallback view parity

Mutation authority must be present in both:

- direct Journal-page IndexedDB entry projections;
- service-worker fallback entry projections.

Relevant entry-returning paths include:

- ordinary paged entries;
- URL-group child entries;
- exact-id / `GET_MANY` projections used to render entries.

A fallback must never downgrade to id-only mutation semantics.

Group headers/counts/domain aggregates themselves do not require mutation authority.

Research: **COVERED**. Runtime: **RED**.

## 8. Outbound raw-authority boundary

Persisted `journalLocalRevision` is worker/IDB-local authority metadata.

It must not be copied raw into:

- full Journal backup/export;
- imported portable data;
- `WEBCLIP_JOURNAL_GET_MANY` runtime results;
- mutation response entries;
- other extension/content projections that do not explicitly require persisted local metadata.

Outbound entry representations are one of:

```text
portable entry        -> explicit portable serializer, no local authority
mutation-capable view -> bounded display projection + journalMutationAuthority
internal worker row   -> raw local authority allowed
```

Research: **COVERED**. Runtime: **RED**.

## 9. Portable export boundary

Current raw spread export is unsafe after adding local authority.

Required explicit serializer:

```text
makePortableJournalEntry(entry)
```

It normalizes portable fields/comments and strips `journalLocalRevision` plus future local-only mutation authority fields before serialization.

Raw `{...entry}` export is not accepted.

Research: **COVERED**. Runtime: **RED**.

## 10. Import boundary

Current `normalizeImportedJournalEntry()` is a positive control because it reconstructs bounded known fields rather than spreading raw input.

Acceptance:

- backup-supplied `journalLocalRevision`, `entryGeneration`, `entryRevision`, `journalMutationAuthority` or similarly named local authority cannot install authority;
- imported rows are new local incarnations;
- worker supplies fresh local generation/revision;
- import-replace rotates global Journal generation in the authoritative replacement transaction;
- imported same-id logical content does not retain an old local incarnation token.

Research: **COVERED**. Runtime: **RED** for new local generation assignment/rotation; import whitelist positive control exists.

## 11. Generation bootstrap / legacy pending adoption

Ordinary first bootstrap when control key is absent:

```text
{version:1, generation:uuid, destructiveBoundarySeen:false}
```

A pre-P0-076 durable pending row lacking `expectedJournalGeneration` may adopt current generation only while `destructiveBoundarySeen === false`, subject to its owner-specific fences.

After any destructive boundary:

```text
missing expected generation -> indeterminate/manual/fail-closed
```

unless a stronger receipt/fence proves safe relationship.

If the first P0-076-aware operation itself is a reset, the reset transaction creates the generation with `destructiveBoundarySeen=true` and explicitly assigns the new generation only to definite nonmatches.

Research: **COVERED**. Runtime: **RED**.

## 12. Scoped clear generation rebase

One global generation remains viable for URL/site clear because reset transaction also processes durable continuation authority.

For old G1 -> new G2:

```text
match         -> detach/quarantine; no rebase
indeterminate -> detach/manual; no rebase
definite nonmatch -> transaction-owned expectedJournalGeneration G1 -> G2
```

Only the authoritative reset transaction may rebase a surviving row.

A stale whole-record writer with captured G1 cannot overwrite current G2.

A pre-reset in-memory operation with no durable checkpoint cannot self-rebase and must fail before later checkpoint/external-effect admission/Journal creation.

Research: **COVERED**. Runtime: **RED**, cross-owner P0-072 integration required.

## 13. Full clear/import generation behavior

Full clear/import matches every old authority:

- rotate global generation;
- detach all relevant old pending/external authority;
- rebase none of the old rows;
- replacement/imported/new entries receive current generation only through new local authority.

Research: **COVERED**. Runtime: **RED**.

## 14. New Journal entry creation

Fresh `appendJournalEntry()` insertion:

- assign fresh `journalLocalRevision` generation + revision 1;
- existing textual id remains exact-existing result; do not overwrite/incarnation-reset it silently;
- if append is continuation of an earlier operation/checkpoint, compare `expectedJournalGeneration` before creating the row.

Critical schedule:

```text
operation admitted under G1, no Journal row yet
-> reset rotates G2
-> late operation tries to create Journal row
-> G1 != G2 -> suppress/reject logical creation
```

This is the P0-076 protection for operations that P0-072 could not quarantine because no durable row existed at reset time.

Research: **COVERED**. Runtime: **RED**.

## 15. Durable pending/recovery generation linkage

Once P0-076 is integrated, any durable row capable of later creating/finalizing Journal state carries exact `expectedJournalGeneration` or equivalent.

Relevant P0-072 families:

- pending Journal append;
- pending local download;
- pending remote save;
- later external-effect receipts.

Do not derive generation from id/URL/path/timestamps/operationId/imported `readMove*` data.

Research: **COVERED**. Runtime: **RED**, cross-owner integration.

## 16. Fresh point-mutation admission

User/UI point mutation requires exact rendered authority.

Current command families:

- Update Comment;
- Add Comment;
- Edit Comment;
- Delete Comment;
- Delete Journal Entry;
- Mark Read.

No mutation command may fall back to textual id when authority is missing/invalid.

Research: **COVERED**. Runtime: **RED**.

## 17. Machine outcomes

Stable mutation outcomes:

```text
committed
missing
invalid-authority
stale-journal-generation
stale-entry-generation
stale-entry-revision
stale-legacy-revision
```

Stale/missing/invalid means no logical mutation committed.

UI reloads/reconciles and asks the user to repeat the action; it does not implicitly retry the mutation or external side effect.

Research: **COVERED**. Runtime: **RED**.

## 18. Successful UI authority propagation

After `committed`, worker returns current bounded entry projection plus **next** `journalMutationAuthority`.

The open card replaces its old authority immediately.

Without this, a first successful comment mutation would make the second edit from the same card stale by construction.

Current generic `requireOk()` loses machine failure details by throwing a plain Error; P0-076 integration must preserve `mutationOutcome`/code or use a mutation-specific response helper.

Research: **COVERED**. Runtime: **RED**.

## 19. Comment mutation atomicity

Comment commands must derive mutation state from the transaction-current row **after** exact authority validation.

Do not:

```text
read comments outside tx
-> build full replacement array
-> later CAS only the final put
```

The compatibility `WEBCLIP_JOURNAL_UPDATE_COMMENT` path must also decide edit-vs-add inside the same CAS transaction.

Comment-specific tombstone/generation semantics remain with the comments owners; P0-076 supplies exact entry-state admission.

Research: **COVERED**. Runtime: **RED**.

## 20. Local-only delete (`diskAction=keep`)

For download entries and Yandex `keep` deletion:

- validate exact rendered authority inside one `[entries,meta]` readwrite transaction;
- delete only the exact current incarnation/revision;
- touch DB revision;
- publish committed only on transaction completion.

A stale card never key-only deletes a same-id replacement.

The explicit UI fallback «Удалить только запись журнала» after a failed Trash attempt is a new local-delete attempt and still requires current exact authority. It does not retry Trash.

Research: **COVERED**. Runtime: **RED**.

## 21. Mark Read initial admission

Mark Read is an external-effect operation, not a simple point patch.

Initial user admission requires exact rendered authority.

Target sequence:

1. validate exact current Journal authority;
2. atomically create/prepare worker-issued move receipt and local operation checkpoint;
3. checkpoint mutation advances entry revision;
4. receipt `prepared -> effect-admitted` CAS is the only transition that permits `/resources/move` once.

P0-072 later receipt architecture supplies reset detachment.

Research: **COVERED**. Runtime: **RED**, later P0-072 receipt integration.

## 22. Admitted external-effect settlement authority

After a durable external effect is admitted, do not reuse the stale original UI revision to decide whether to repeat the effect.

Receipt continuation requires:

- worker-issued trusted receipt;
- expected admitted/factual phase;
- no reset barrier;
- same current Journal generation;
- same entry generation/incarnation;
- same operation-specific lineage.

Settlement re-reads the current entry and merges only receipt-owned fields, preserving unrelated newer fields such as comments, then increments current entry revision.

Already admitted receipt never returns `permitMutation=true` again.

Research: **COVERED**. Runtime: **RED**.

## 23. Delete→Trash boundary

P0-076 provides exact rendered admission and same-incarnation local settlement/deletion semantics.

Still required from other owners:

- **P1-183**: durable exact pre-move Trash receipt;
- **P1-090**: exact same remote-object reconciliation after unknown move;
- **P0-073/P0-074**: immutable account/root/auth/config context.

A stale local CAS must never trigger another Trash move.

Research: **P0-076 COVERED**, external receipt/object implementation **DEPENDENCY ACTIVE**.

## 24. Same-id reincarnation negative control

Same textual id is never sufficient.

If A is deleted/recreated/imported with the same id:

```text
old entryGeneration != new entryGeneration
```

Old UI authority and old external-effect receipts cannot patch/delete the new row.

Research: **COVERED**. Runtime: **RED**.

## 25. Shared pure helper boundary

Recommended first implementation module:

```text
journal-mutation-authority.js
-> globalThis.WebClipJournalMutationAuthority
```

Pure responsibilities:

- parse global control;
- parse local entry revision;
- parse/bound legacy DB revision;
- build/validate modern/legacy ephemeral authority;
- compare authority and classify stale reason;
- enforce serialized bounds.

No Chrome/IDB/network/time/random side effects.

Loadable by both worker (`importScripts`) and `journal.html` before `journal.js`.

Research: **COVERED**. Runtime: **NOT IMPLEMENTED**.

## 26. P1-086 boundary

P0-076 requires transaction-consistent authority inputs and publication after transaction completion.

Current main Journal-page entry reads already resolve on `tx.oncomplete`, and worker `runIndexedDbTransactionBounded()` resolves its result on `tx.oncomplete`; these are positive controls.

This does not close generic **P1-086 ACTIVE** elsewhere.

## 27. Current source-bound gate

`project_tools/test_p0_076_source_contract.js` is intentionally RED against current runtime.

It checks:

- generation/local-revision markers;
- explicit portable serializer;
- no raw export spread;
- direct and fallback `journalMutationAuthority` presence;
- `[entries,meta]` direct authority snapshot;
- authority propagation in all current user mutation messages;
- returned next authority;
- removal of current blind merge/key-only delete shapes;
- machine stale outcomes.

Research gate: **PRESENT / RED BY DESIGN**.

## 28. Implementation decomposition

### Commit A — shared pure helper + direct unit tests

Small standalone `journal-mutation-authority.js`, no runtime behavior yet.

### Commit B — generation/local-revision persistence + portable/outbound projections

- stable generation control parser/bootstrap;
- fresh local revision on new/imported entries;
- explicit portable serializer;
- no raw local-authority IPC.

### Commit C — direct/fallback view authority

- `[entries,meta]` mutation-capable view snapshots;
- direct/fallback parity;
- UI stores ephemeral authority.

### Commit D — synchronous point CAS

- comment/update compatibility paths;
- local/keep delete;
- machine stale outcomes;
- returned next authority / no auto retry.

### Commit E — P0-072 generation integration

- expected generation on pending rows;
- scoped reset nonmatch rebase;
- matching/indeterminate detach;
- old no-checkpoint operation fails before later admission.

### Commit F — external-effect entry operations

- Mark Read namespaced receipt integration;
- Delete→Trash only after P1-183/P1-090 compatible receipt/object contract.

No DB version bump is required by this design.

## 29. Required deterministic acceptance

At minimum prove:

1. unrelated modern entry mutation does not invalidate another modern entry;
2. stale same-entry revision rejects;
3. same-id reincarnation rejects old authority;
4. bulk generation rotation rejects old UI authority;
5. legacy mixed-snapshot construction is impossible;
6. first legacy mutation installs modern authority;
7. malformed/future authority is fail-closed;
8. export strips local authority;
9. import ignores forged local authority;
10. direct/fallback projections carry identical bounded authority;
11. second sequential comment uses returned next authority;
12. concurrent stale comment/delete cannot overwrite/delete newer row;
13. scoped clear rebases definite nonmatching pending authority only;
14. reset matching/indeterminate authority is not rebased;
15. stale writer cannot overwrite reset-owned rebase;
16. no-checkpoint pre-reset operation cannot self-rebase;
17. admitted receipt never permits duplicate external mutation;
18. unrelated comment may coexist with receipt settlement on same incarnation;
19. reset/same-id replacement blocks receipt settlement;
20. raw local authority does not appear in portable/runtime projections where prohibited.

## 30. Required direct/browser/external acceptance

Deterministic/source proof is necessary but does not close all dependent surfaces.

Applicable future verification:

- real Journal UI two-window stale mutation behavior;
- MV3 worker restart around external-effect receipt settlement;
- real Mark Read/Yandex move proof under P0-072/P1-090/P0-073/P0-074 owners;
- Delete→Trash only after P1-183 receipt implementation;
- release regression under normal repository/release gate.

## 31. Status

**P0-076 remains ACTIVE.**

Research architecture for the core Journal generation/per-entry CAS is now substantially defined, but production runtime is unchanged and source-bound gate remains RED.

P0-072 remains ACTIVE; its first reset/quarantine mechanism research is saturated, but generation integration consumes sections 11–15 above.

Manifest remains `0.9.8`. Release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this matrix.
