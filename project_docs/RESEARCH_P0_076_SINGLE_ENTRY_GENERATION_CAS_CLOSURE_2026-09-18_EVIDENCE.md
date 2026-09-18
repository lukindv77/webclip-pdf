# P0-076 — single-entry revision + Journal-generation CAS closure evidence

Date: 2026-09-18

Canonical implementation baseline reviewed: `a439c2b5c782c9c0fe9e7960375d39842c17fd3b`.

Post-implementation Repository Integrity: run `35332827103` on that exact canonical main, **SUCCESS**.

Owner: `P0-076` — Journal single-entry mutations require per-entry revision + Journal-generation CAS against clear/replace/import; late stale writes cannot mutate replacement records.

Closure classification: **SOURCE-CLOSED + DETERMINISTIC-COVERED / OWNER DONE CANDIDATE**.

This tranche changes no production runtime, package bytes, manifest, permissions, release gate, build, tag, deploy, Chrome state or Yandex state. It closes the local Journal authority owner only after fresh exact-source review of every production row mutation/finalizer class and the full 12-point acceptance contract recorded in the 2026-09-12 revalidation evidence.

## Canonical implementation chain

The implementation landed in four durable tranches before this closure review:

- PR #279 / main `7fcecd9b464bbef7b780506a1c9200c61759ef35` — dedicated reset generation, per-entry revision, atomic authority capture, CAS patch/delete primitive;
- PR #280 / main `36efd9d8b8c8d9606fd367a60d49eee8d83c4666` — local/keep Journal delete migrated to exact CAS;
- PR #281 / main `0ff48dece2a4fc298fdf7e7dd76ab5e22d1e2616` — comment add/edit/delete migrated to exact CAS conflict semantics;
- PR #282 / main `617a4abc290bf81a7626ad744d7f23d35135dd88` — new ReadLater/Trash destructive receipts bound to a separate durable local CAS cursor;
- PR #283 / main `a439c2b5c782c9c0fe9e7960375d39842c17fd3b` — persisted verified destructive receipts without that cursor fail closed into manual resolution instead of mutating Journal state.

Each implementation merge was followed by a separate successful Repository Integrity push run before the next tranche started.

## Fresh mutation-surface review

Fresh source enumeration on `a439c2b5...` found these Journal row mutation classes:

1. new-row append: `appendJournalEntry()`;
2. generic exact-token point patch: `updateJournalEntryRecordCas()`;
3. generic exact-token point delete: `deleteJournalEntryRecordOnlyCas()`;
4. historical blind helper definitions `updateJournalEntryRecord()` / `deleteJournalEntryRecordOnly()`;
5. detached ReadLater checkpoint: `updateReadMoveJournalCheckpointFromReceipt()`;
6. detached ReadLater terminal patch: `finalizeReadMoveJournalFromReceipt()`;
7. detached Trash terminal delete: `finalizeTrashDeleteFromReceipt()`;
8. scoped/full bulk clear: `clearJournalEntries()`;
9. staged import replacement: `commitStagedJournalImport()`.

The historical blind helper names each occur exactly once in `service-worker.js`: their own definitions. They have zero production callers.

`appendJournalEntry()` is not a point mutation of an existing row. It first reads the exact id; if a row already occupies that id it returns that row without `put`. Restart append recovery additionally rechecks the pending checkpoint in the same transaction, and remote/local durable finalization additionally rechecks its durable checkpoint. Clear/import remove or supersede the corresponding pending authority in the same reset transition. A stale append therefore cannot overwrite a same-id import replacement.

## Authority primitive

`readJournalEntryWithAuthority()` reads the exact row and `JOURNAL_RESET_GENERATION_KEY` in one IndexedDB transaction and returns the immutable token:

```text
entryId
resetGeneration
entryRevision
```

`updateJournalEntryRecordCas()` and `deleteJournalEntryRecordOnlyCas()` compare that token against the current row and reset generation inside the same readwrite transaction as the final write/delete. A mismatch returns stale instead of rebinding authority to whichever row currently occupies the textual id.

Successful point patch increments the exact row's `entryRevision`. Unrelated point writes do not advance the dedicated reset generation.

## Reset-generation boundary

The dedicated reset generation is advanced only by the two authority-replacing bulk transitions:

- `clearJournalEntries()` — exactly one `advanceJournalResetGeneration(...)` call inside the same clear transaction;
- `commitStagedJournalImport()` — exactly one generation advance inside the same import-replace transaction.

Import normalization never trusts serialized `raw.entryRevision`; normalized and committed imported rows start at `JOURNAL_INITIAL_ENTRY_REVISION`.

Export strips local-only `entryRevision`, so backup/restore cannot carry old local CAS authority into a new Journal generation.

## Caller/finalizer coverage

Comments:

- add/edit/delete atomically capture row + token;
- compute their full comments-array projection from that snapshot;
- attempt exactly one `updateJournalEntryRecordCas()`;
- stale writer receives explicit `JOURNAL_ENTRY_STALE` conflict;
- there is no automatic stale rebind/retry.

Local/keep delete:

- `deleteJournalEntry()` captures the row + token atomically;
- final local delete uses `deleteJournalEntryRecordOnlyCas()`;
- stale/reset/replacement state produces superseded/no-retargeting behavior.

ReadLater / Trash:

- the detached P0-072 receipt remains the worker-issued external-effect identity;
- new receipts additionally persist `sourceJournalResetGeneration` + `sourceJournalEntryRevision`;
- receipt creation validates that local cursor atomically against the current Journal row;
- pre-POST admission rechecks the local cursor;
- ReadLater's own pre-move checkpoint increments the row revision and atomically advances the receipt cursor;
- terminal ReadLater patch and Trash delete require both the P0-072 source matcher and the exact P0-076 cursor;
- a verified legacy no-cursor receipt cannot mutate current Journal state and is retained as manual-resolution evidence unless reset already made it history-only.

P0-072, P1-090 and P1-198 remain separate owners of external-effect durability, exact remote-object identity and physical worker-issued operation identity respectively.

## Original 12-point acceptance contract — closure mapping

1. **Delete A + import B same id:** import advances reset generation; Trash local delete requires the old receipt cursor and therefore cannot delete B.
2. **Mark Read A + import B same id:** terminal patch requires the old cursor and cannot write A's read/path/resource/publication fields onto B.
3. **Two Mark Read operations from one revision:** both may begin discovery, but the first successful receipt checkpoint advances `entryRevision`; the loser fails its checkpoint and removes the prepared receipt before remote admission. Admission also rechecks authority.
4. **Concurrent comments:** complete-array stale writer is rejected explicitly through CAS conflict semantics.
5. **Generic delayed point patch:** production callers use the CAS primitive; the old blind helper has zero callers.
6. **Clear without replacement:** CAS/finalizer sees no authorized row and does not recreate it; pending append recovery is removed/fenced by clear.
7. **Identical same-id import replacement:** reset generation changes independently of visible row fields, so the old token fails.
8. **Unrelated point edit C:** C advances only its own entry revision; dedicated reset generation remains stable.
9. **Scoped/full reset policy:** clear and import-replace advance the documented reset generation atomically with the authority transition.
10. **External physical outcome after local authority loss:** P0-072/P1-090 receipt/evidence remains separate from Journal CAS; stale local authority never implies external cancellation or grants authority over replacement state. Unknown admitted outcomes remain reconciliable under the adjacent owners.
11. **Atomic compare + commit:** CAS comparison and final patch/delete occur in one IndexedDB readwrite transaction over Journal + meta authority.
12. **Worker restart:** every destructive operation that can resume local finalization persists reset generation + row revision in the detached receipt; legacy persisted receipts without those fields fail closed to manual resolution.

## Deterministic closure witness

New closure source-spec:

`project_tools/test_p0_076_single_entry_generation_cas_closure.js`

It binds the closure claim directly to the current production source and checks:

- atomic row+generation capture;
- atomic CAS patch/delete;
- exactly two reset-generation transition call sites;
- import fresh revision / no serialized revision trust;
- comment CAS conflict callers;
- local/keep delete CAS;
- Mark Read checkpoint-before-admission ordering;
- destructive receipt cursor persistence/advance/finalization;
- legacy no-cursor fail-closed restart policy;
- zero callers of blind compatibility helpers;
- append same-id non-overwrite and pending/durable checkpoint revalidation;
- reset reconciliation of pending append/local/remote/destructive state;
- export stripping of local CAS authority;
- adjacent P0-072/P1-090/P1-198 ownership boundaries;
- Registry/TEST_STATUS closure state while release remains NOT READY.

The existing broader model `project_tools/test_p0_076_single_entry_generation_cas_model.js` remains the race/state-machine acceptance model, while the focused production witnesses remain positive regressions for primitive, delete, comments, destructive composition and legacy fail-closed behavior.

## Closure decision

`P0-076`: **DONE candidate on this branch; canonical only after expected-head PR merge and post-merge Repository Integrity SUCCESS.**

The registered root cause is closed: no production delayed single-entry mutation can acquire authority over a newer same-id row merely because the textual id is reused. Reset/import replacement, same-entry revision drift and restart-resumed destructive finalization are all fenced by exact local authority.

This closure does **not** close or weaken:

- P0-072 external-effect durability across reset;
- P1-090 exact remote-object settlement;
- P1-198 physical operation identity;
- unrelated Journal stats, publication, backup, release or Yandex owners.

`RELEASE_READINESS.md` remains **NOT READY** and manifest remains `0.9.8`.
