# P0-076 — architecture closure sweep before runtime implementation — 2026-09-06

Date: 2026-09-06  
Canonical `main`: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch fresh head entering this checkpoint: `05edc56b5e953bbf059ba0c01bb0dcd5312d5019`  
Branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Owner: **P0-076 ACTIVE**.

This checkpoint is a closure sweep of P0-076 research. It does not claim implementation. The goal is to distinguish remaining architecture uncertainty from ordinary runtime engineering work.

## 1. Fresh branch state

Immediately before the latest source-gate refinement, fresh compare against canonical main was:

```text
status: ahead
ahead: 35
behind: 0
```

The subsequent source-gate refinement adds one research-only commit, so the branch is expected to be 36 commits ahead unless another writer moves either ref.

The compare contained only:

- `project_docs/RESEARCH_P0_076_*` evidence;
- `project_tools/test_p0_076_*` deterministic/source-bound tests.

No production runtime, manifest, HTML/CSS or release artifact was changed.

## 2. Current live Journal writer inventory

Fresh source sweep of current `service-worker.js` identifies three live-entry write classes:

### 2.1 New entry append

`appendJournalEntry()` performs the actual new-row `entries.put(...)`.

`appendJournalEntryFromDurableCheckpoint()` ultimately routes through the same append function, so recovery does not create a second hidden live-entry writer class.

P0-076 requirement:

- fresh row gets worker-issued `journalLocalRevision` generation + revision 1;
- continuation append must validate `expectedJournalGeneration` before creating a row;
- existing textual id is not silently overwritten/reincarnated.

### 2.2 Point update

`updateJournalEntryRecord(id, patch)` currently does:

```text
get(id)
-> {...current, ...patch}
-> put(updated)
```

This remains the central blind point-write defect.

P0-076 replacement:

- transaction-current target-bound CAS;
- operation-specific mutation function executes only after authority validation;
- revision increments exactly once on committed point mutation;
- no blind generic patch API remains available to user-action callers.

### 2.3 Import replacement copy

`commitStagedJournalImport()` copies normalized staging rows into the live `entries` store after clear.

P0-076 requirement:

- backup cannot supply local authority;
- replacement rows receive fresh worker-issued local incarnations/revision 1;
- import rotation of global Journal generation and P0-072 detach semantics occur atomically with replacement;
- known 117-byte logical local-authority surcharge is accounted for before the storage path that persists it.

No fourth live `entries.put()` writer class was found in the closure sweep.

## 3. Current live Journal delete inventory

Ordinary point delete is currently centralized in `deleteJournalEntryRecordOnly()`:

```text
separate getJournalEntryById(id)
-> later entries.delete(id)
```

This is the known stale key-only delete defect.

Other IndexedDB `.delete()` calls are:

- bulk URL/site/all clear;
- pending/recovery cleanup;
- normalized import staging cleanup;
- import/backup lease cleanup;
- transfer/cache/log cleanup;
- unrelated stores.

No hidden second ordinary entry-delete API was found.

## 4. Non-worker writer sweep

`journal.js` performs direct Journal reads, but its only `readwrite` transaction is for the temporary transfer DB used to stage import chunks.

It does not directly mutate live `WebClipJournal.entries`.

Therefore live Journal entry mutation can be centralized in the service worker without a schema migration or a second page-owned CAS implementation.

This is a positive architectural finding.

## 5. No DB schema bump required

P0-076 uses:

- existing `entries` rows for `journalLocalRevision` and `journalExternalEffectLock`;
- existing `meta` store for stable-key `journalMutationGeneration`;
- existing `meta['revision']` for legacy bridge and exact clear/import target revision.

No new object store/index is required.

This avoids unnecessarily expanding P2-019 shared schema/migration ownership.

## 6. Final global generation contract

Stable exact meta key:

```text
journalMutationGeneration
```

V1 body:

```text
{
  version: 1,
  generation: '<crypto.randomUUID()>',
  destructiveBoundarySeen: boolean
}
```

Rules:

- missing = legacy bootstrap only;
- present malformed/future = fail closed;
- key remains stable across body versions;
- point mutation does not rotate generation;
- authorized clear/import rotates generation;
- first destructive boundary makes `destructiveBoundarySeen=true` permanently in v1;
- generation creation/rotation uses cryptographically strong UUID; no `Math.random()` authority fallback.

## 7. Final per-entry local revision contract

```text
journalLocalRevision = {
  version: 1,
  generation: '<crypto.randomUUID()>',
  revision: <positive safe integer>
}
```

Rules:

- new local incarnation starts at revision 1;
- point mutation preserves generation and increments revision;
- same-id delete/recreate/import gets a new generation;
- missing whole field = legacy row;
- malformed/future present field = fail closed, not legacy;
- `Number.MAX_SAFE_INTEGER` does not wrap or auto-reincarnate;
- exhaustion returns `entry-revision-exhausted` and commits no mutation.

## 8. Final rendered mutation authority contract

Modern:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'modern',
  entryId,
  journalGeneration,
  entryGeneration,
  entryRevision
}
```

Legacy:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'legacy',
  entryId,
  journalGeneration,
  legacyDbRevision
}
```

Critical correction from closure sweep:

`entryId` is mandatory in both forms. Legacy rows in one snapshot share Journal generation + DB revision, so target id must be explicitly bound.

Worst bounded compact JSON remains below the selected 512-char envelope.

## 9. Authority snapshot publication

Mutation-capable entry projections require one readonly transaction containing:

```text
entries + meta
```

The exact row plus applicable Journal generation / DB revision are observed from that same transaction.

Direct page and service-worker fallback projections must be semantically identical.

Relevant paths:

- normal paged entries;
- URL-group children;
- exact-id/GET_MANY paths used to render actionable entries.

Aggregate counts/domain headers without actionable entries do not need meta solely for P0-076.

Existing page/worker transaction helpers already resolve applicable read results on `tx.oncomplete`, a positive local control for the P1-086 boundary.

## 10. Local-only projection boundary

Neither of these may become portable/outbound raw row fields:

```text
journalLocalRevision
journalExternalEffectLock
```

Required outbound classes:

```text
portable backup entry
  -> explicit makePortableJournalEntry()
  -> no local revision/lock/authority

mutation-capable UI entry
  -> bounded display projection
  -> ephemeral journalMutationAuthority
  -> may expose a bounded busy/status enum if useful
  -> does not expose raw effectId/local lock record

internal worker/IDB row
  -> local authority/lock allowed
```

Current raw export spread must disappear.

## 11. Import portability and storage

Current import normalizer is already whitelist-style, a positive control against backup-installed local authority.

Selected local authority has exact incremental compact UTF-8 JSON delta:

```text
117 bytes per non-empty Journal row
```

At 100000 current maximum entries:

```text
11,700,000 bytes ~= 11.16 MiB
```

Current maximum normalization preflight is effectively:

```text
50 MiB staged input + 16 MiB headroom
= 69,206,016 bytes
```

P0-076-known minimum logical term becomes:

```text
69,206,016 + 11,700,000
= 80,906,016 bytes ~= 77.16 MiB
```

This is not physical reservation proof. Shared-origin concurrency and physical peak amplification remain P1-043.

## 12. Legacy rollout

Legacy actionable entry authority uses exact DB revision observed in the same transaction.

First successful legacy point mutation:

1. validates exact `entryId` target;
2. validates expected absence/current generation state;
3. validates exact `meta['revision']`;
4. re-reads the row and confirms it is still legacy;
5. applies the mutation;
6. installs fresh modern local generation/revision;
7. advances DB revision;
8. returns modern authority only after commit.

Unrelated Journal mutation may invalidate all still-open legacy authorities. This is intentionally conservative transitional behavior.

## 13. Old pending-row bootstrap

When global generation control is first created with:

```text
destructiveBoundarySeen=false
```

legacy pending rows with no expected generation may be adopted subject to their owner-specific identity checks.

After any destructive boundary:

```text
missing expectedJournalGeneration
-> indeterminate/manual/fail closed
```

unless a stronger existing receipt proves the relationship.

This prevents downgrade-created generationless rows from being silently attached to a post-reset Journal.

## 14. Scoped reset generation rotation/rebase

Every authorized scoped reset rotates global generation, including a zero-current-match reset. This is required to fence an old in-memory operation that has not yet produced a durable checkpoint.

For durable authority under old G1:

```text
match
  -> quarantine/detach
  -> no rebase

indeterminate
  -> quarantine/manual
  -> no rebase

definite nonmatch
  -> only reset transaction may rebase G1 -> G2
```

Full clear/import rebases no old row.

A purely in-memory old operation cannot self-rebase; it must stop before later checkpoint/external-effect admission/Journal creation unless a new authorized operation is created.

## 15. Exact clear confirmation authority

Do not use UI `lastJournalRevisionToken` from `chrome.storage.local` as destructive CAS authority.

Worker-owned preview receipt binds:

```text
journalClearAuthority = {
  version: 1,
  expectedJournalRevision,
  scope,
  scopeKey
}
```

Final worker compare occurs inside the destructive readwrite transaction, before first clear/quarantine/rebase mutation.

Any point mutation after preview changes DB revision and causes:

```text
stale-journal-revision
```

Two concurrent clear receipts for the same revision serialize so only the first can commit.

Current staged import in-transaction revision comparison is the positive implementation pattern.

## 16. Point mutation machine outcomes

Final known outcome vocabulary now includes:

```text
committed
missing
invalid-authority
authority-target-mismatch
stale-journal-generation
stale-entry-generation
stale-entry-revision
stale-legacy-revision
entry-revision-exhausted
entry-busy
```

Bulk clear additionally uses:

```text
scope-mismatch
stale-journal-revision
```

A non-committed outcome never falls back to textual id mutation.

## 17. UI propagation

After successful point mutation:

- worker returns bounded current entry projection;
- worker returns the **next** `journalMutationAuthority`;
- page replaces the old authority immediately.

Stale/invalid/busy outcomes:

- preserve machine code/outcome through UI error handling;
- reload/reconcile;
- ask user to repeat if appropriate;
- never implicitly retry a destructive or external side effect.

Current generic `requireOk()` loses machine details, so point-mutation integration needs a mutation-aware response/error path.

## 18. Comment mutation CAS

All comment forms, including compatibility `WEBCLIP_JOURNAL_UPDATE_COMMENT`, derive current comment state only after exact authority validation within the same readwrite transaction.

No outside read may decide edit-vs-add and later hand a full replacement array to a generic blind writer.

Comment-specific tombstone semantics remain with their existing owner; P0-076 owns exact row admission and revision transition.

## 19. Local-only delete

`diskAction=keep`:

- exact target-bound authority validation;
- same transaction current-row check + delete;
- DB revision update;
- commit-only success.

A stale card never deletes a same-id replacement.

The explicit post-Trash-error UI choice to delete only the Journal row is a new local delete attempt and requires current authority; it does not authorize another remote Trash move.

## 20. External-effect entry lock

Local row coordination marker:

```text
journalExternalEffectLock = {
  version: 1,
  kind: 'mark-read' | 'delete-trash',
  effectId
}
```

The lock is local/nonportable and not itself remote-effect authority.

`mark-read` lock:

- comments may still mutate the same incarnation;
- competing Mark Read/Delete are blocked;
- receipt settlement merges only owned fields and preserves newer comments.

`delete-trash` lock:

- ordinary point mutations are blocked as `entry-busy` after destructive admission;
- final receipt-owned delete requires same Journal generation, same entry generation and matching effect lock;
- this avoids accepting new local data that final delete would silently destroy.

Bulk reset does not obey entry-busy: P0-072 atomically detaches/quarantines receipt/lock authority instead.

## 21. Trusted receipt boundary

Initial user admission uses rendered mutation authority.

Once a non-cancellable external effect is durably admitted, the stale UI revision is no longer the continuation authority.

Continuation uses worker-issued trusted receipt plus:

- exact receipt phase;
- current Journal generation;
- exact entry generation;
- matching local effect lock;
- no reset barrier.

Already admitted receipt can never re-authorize the primary remote side effect.

This composes with P0-072 receipt architecture.

## 22. Dependencies that P0-076 does not close

Still separate/current owners:

- **P0-072** — reset quarantine/detachment of admitted recovery/external effects;
- **P0-073/P0-074** — immutable Yandex account/root/auth/config context;
- **P1-043** — global shared-origin byte reservation and physical peak-space admission;
- **P1-086** — generic readonly-IDB commit publication outside the positive paths already checked;
- **P1-090** — exact remote object reconciliation after unknown destructive move;
- **P1-183** — durable exact pre-move Trash receipt;
- **P1-198/P1-210** — worker-issued operation identity / post-commit lost-result reconciliation;
- **P2-019** — shared IndexedDB schema/migration ownership; no P0-076 schema bump is currently needed.

## 23. Current deterministic evidence

P0-076 branch contains models for:

- Journal generation/per-entry CAS;
- same-snapshot rendered authority;
- entry authority portability;
- receipt settlement authority;
- generation bootstrap/rollback;
- scoped reset generation rebase;
- shared authority helper;
- clear confirmation revision;
- external-effect entry lock;
- import authority storage amplification;
- exact clear authority;
- exact authority target binding;
- revision exhaustion.

The newly added storage, clear authority, target-binding and exhaustion models were syntax-checked and executed locally before durable writes and reported PASS.

Older P0-076 models retain their prior local PASS evidence from their dated checkpoints. This closure sweep does not falsely claim one fresh full-repository test run because no safe local checkout is available in this environment.

## 24. Current committed-source gate

`project_tools/test_p0_076_source_contract.js` remains intentionally **RED** against current production runtime.

It now binds implementation to:

- stable global generation marker;
- local per-entry revision;
- external-effect lock;
- append/import creation authority;
- exact 117-byte logical import surcharge contract;
- explicit portable serializer/no raw export spread;
- direct/fallback mutation authority;
- `[entries,meta]` same-snapshot direct read;
- all current mutation-message families carrying authority;
- next-authority UI propagation;
- clear target authority + stale revision;
- removal of blind merge/key-only delete;
- stale generation/revision outcomes;
- exact entry target mismatch;
- revision exhaustion;
- entry-busy lifecycle result.

It must not be turned GREEN by test-only markers; runtime source has to implement the contracts.

## 25. Minimal runtime implementation order

### A. Shared pure helper, no behavior change

Add `journal-mutation-authority.js` and load it in worker + `journal.html` before `journal.js`.

Pure responsibilities:

- parse/validate global generation control;
- parse/validate local revision/lock;
- build/validate modern/legacy ephemeral authority including `entryId`;
- compare authority and classify stale/mismatch/exhaustion;
- enforce 512-char authority envelope and bounded revisions.

Direct deterministic tests first.

### B. Generation/bootstrap + creation paths + portability

Worker helpers for strong UUID generation and initial local revision.

Update:

- `appendJournalEntry()`;
- normalized import/final copy;
- explicit `makePortableJournalEntry()`;
- import storage preflight known 117-byte-per-entry term.

No user point mutation semantics changed yet.

### C. Mutation-capable read projections

Direct `journal.js` and service-worker fallback paths return bounded entries + exact `journalMutationAuthority`.

Legacy same-snapshot uses `entries + meta`.

No raw local revision/lock in outbound projections.

### D. Local point CAS

Replace blind generic point mutation and key-only local delete for:

- Update/Add/Edit/Delete Comment;
- local/Yandex-keep Delete.

Add next-authority UI update and typed stale handling.

### E. Clear authority + bulk generation

Add worker-owned clear preview receipt using authoritative IDB revision/scope.

Final clear transaction:

- validate revision/scope inside tx;
- rotate global generation;
- perform P0-072 matching/nonmatching quarantine/rebase protocol;
- clear/replace entries;
- advance DB revision;
- commit-only success.

Import replacement receives the same generation/P0-072 integration while retaining its existing preview/lease revision positive control.

### F. Durable pending generation linkage

All pending/recovery rows capable of future Journal creation/finalization receive/validate `expectedJournalGeneration`.

Apply legacy bootstrap adoption rule and scoped reset rebase fencing.

### G. External-effect locks + receipts

Integrate Mark Read with P0-072 trusted receipt and mark-read lock.

Delete→Trash P0-076 admission/lock can be prepared, but full remote destructive correctness remains blocked by P1-183/P1-090/P0-073/P0-074.

No stale receipt may replay the remote mutation.

### H. Acceptance/gates

Turn committed-source P0-076 gate GREEN only after actual runtime changes.

Then run:

- all deterministic P0-076 models;
- applicable P0-072 reset tests;
- P0-039/P0-048 local-download identity/unknown regressions;
- import preview/lease/revision regressions;
- source syntax checks;
- true browser/multi-tab regression only when runtime is sufficiently integrated.

## 26. Research saturation conclusion

After the latest storage, exact-clear, target-binding and revision-exhaustion refinements, no unresolved **architectural** question has been found inside the P0-076 core contract.

The next work for P0-076 is implementation engineering and committed-source/runtime verification, not another speculative redesign.

This does **not** change canonical Registry status:

```text
P0-076 ACTIVE
```

because current production source still implements none of the new CAS authority contract.

Runtime version remains `0.9.8`. Release remains `NOT READY`. No build, tag, GitHub Release or Actions run was created by this research branch.
