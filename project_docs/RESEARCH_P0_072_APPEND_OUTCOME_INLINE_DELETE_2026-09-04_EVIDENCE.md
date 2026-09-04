# P0-072 — append outcome classification / inline pending-delete fencing — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 738c5c1c47a4eb7edffaed3a3d456c0a425ad747`  
Deterministic model commit: `8406fdcf1e2c8eb578ad828f04d5483cdf550415`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the authoritative Journal append transaction and identifies inline delete paths that must be fenced in addition to named cleanup helpers. Runtime remains unchanged.

## 1. Fresh source facts

Current `appendJournalEntry()` has only three direct call surfaces in current worker logic:

1. `recoverPendingJournalAppends()` with `requirePendingCheckpoint:true`;
2. `appendJournalEntryFromDurableCheckpoint()` for local-download/remote-save durable rows;
3. dormant/generic `safeAppendJournalEntry()` which checkpoints and then calls ordinary append.

Current low-level return contract is only:

```text
Journal entry object | null
```

Callers currently interpret `null` as cancellation caused by concurrent clear/import.

That is no longer truthful after P0-072.

## 2. Durable checkpoint currently has only exists/missing semantics

Inside the same Journal write transaction, current code reads the required local/remote durable checkpoint.

If it is absent, it does:

```text
durableCheckpointMissing = true;
pendingStore.delete(id);
return;
```

The comment assumes a concurrent clear/import intentionally removed the source checkpoint.

After P0-072 that assumption is invalid:

- reset preserves/quarantines admitted authority instead of deleting it;
- a genuinely missing durable row can reflect historical loss/corruption/other cleanup, not proven cancellation;
- missing and reset-detached are materially different states.

The inline `pendingStore.delete(id)` is therefore also unsafe as a response to missing durable authority.

## 3. Fresh inline delete — `checkEntry()` deletes pending by id

Current `appendJournalEntry()` has another inline cleanup inside the authoritative append transaction:

```text
pendingStore.delete(id)
```

when it checks/creates the Journal entry.

This delete is not routed through `removePendingJournalAppend()` and therefore would survive a refactor that only fences named cleanup helpers.

After P0-072, a same-id `pendingAppends` row may itself carry reset authority. It cannot be deleted merely because another append caller reached the Journal transaction.

Therefore the complete delete audit must include inline object-store deletes, not only exported/named helpers.

## 4. Required transaction-local checkpoint classification

For every checkpoint whose existence authorizes Journal finalization, use:

```text
missing | active | reset-detached
```

Rules:

### `active`

May continue to the next authority check / Journal write, subject to existing identity and adjacent P0-076 rules.

### `reset-detached`

- never append/create/update the Journal entry;
- preserve the checkpoint and its reset disposition;
- return a structured `suppressed-reset-detached` result;
- late factual settlement may update only the detached receipt under its dedicated transition rules.

### `missing`

- do not append stale in-memory metadata;
- do not fabricate cancellation;
- do not opportunistically delete another recovery row;
- return `suppressed-missing` so caller can surface truthful warning/manual/data-loss semantics.

## 5. Structured append outcome

The minimal machine-readable result set is:

```text
appended
existing
suppressed-missing
suppressed-reset-detached
```

`existing` remains distinct from `appended` because current code already treats an existing same-id Journal row as idempotent/no-new-insert.

This checkpoint does not claim that same-id `existing` is always sufficient generation proof; general replacement-generation semantics remain P0-076.

The important P0-072 ordering is:

> checkpoint/reset authority is classified before an existing Journal row can be accepted as success for a reset-detached old operation.

## 6. Compatibility-friendly API shape

Changing every legacy caller of `appendJournalEntry()` to a new object return type would be unnecessarily broad.

Preferred implementation seam:

- internal transaction produces a structured outcome;
- `appendJournalEntry()` may preserve its old entry/null wrapper for callers that genuinely do not need structured recovery semantics;
- `recoverPendingJournalAppends()` and `appendJournalEntryFromDurableCheckpoint()` opt into/consume the structured outcome;
- no caller with recovery authority may infer reset/missing meaning from truthiness alone.

A separate `appendJournalEntryWithOutcome()` helper or an explicit option is acceptable; the exact naming is implementation detail.

## 7. `appendJournalEntryFromDurableCheckpoint()` result must stop saying “deleted = cancelled”

Current warning text says the durable checkpoint “was deleted by concurrent clear/replace”.

Target behavior should expose at least:

```text
journalOutcome: appended | existing | suppressed-missing | suppressed-reset-detached
```

Suggested semantic mapping:

### appended/existing

Normal current-generation Journal finalization path.

### suppressed-reset-detached

- physical/recovery receipt still exists;
- Journal mutation intentionally suppressed by reset barrier;
- caller may record factual terminal outcome on the receipt;
- this is **not** a data-loss warning and not cancellation of the external effect.

### suppressed-missing

- Journal mutation suppressed because required durable authority is absent;
- no claim that external effect did or did not happen;
- retain/surface truthful warning/manual diagnostic according to the caller's owner.

## 8. Pending replay must not count detached as “cancelled”

Current `recoverPendingJournalAppends()` increments `cancelled` when `appendJournalEntry(...requirePendingCheckpoint)` returns null.

After P0-072:

- normal replay list should exclude reset-detached rows before the loop;
- a transaction-level re-check is still required for race safety;
- if the row became reset-detached after list snapshot, result is `suppressed-reset-detached`, not cancelled;
- the row remains manual authority and never returns to ordinary replay.

Metrics/log wording should not collapse detached/manual evidence into cancellation.

## 9. Inline generic pending cleanup becomes compare-delete

When a Journal append legitimately succeeds/existing-id is accepted and an incidental `pendingAppends` row with the same id is present, physical delete is allowed only if the current row still satisfies all required preconditions.

Minimum P0-072 preconditions:

- same key;
- current row is **not** reset-detached;
- expected operation identity matches when the caller has one.

If a same-id pending row belongs to another operation or carries reset disposition, leave it untouched.

This is an inline equivalent of the compare-and-delete rule already selected for `removePending*` helpers.

## 10. Missing durable row must not delete generic pending evidence

The current durable-missing branch performs `pendingStore.delete(id)`.

That delete should be removed/replaced.

A missing local/remote durable receipt may coexist with a generic pending Journal metadata row. Destroying that second row merely because the stronger receipt is missing compounds evidence loss.

P0-072 only needs to suppress the stale Journal append and report the missing state. Whether a surviving generic pending row can be useful for manual diagnostics is separate from automatic replay; it must not be silently destroyed by this path.

## 11. Dormant `safeAppendJournalEntry()` contract

Fresh source search shows `safeAppendJournalEntry()` itself but no current live call site in `service-worker.js`.

It currently:

1. creates a generic pending checkpoint;
2. then calls ordinary `appendJournalEntry(prepared)` without `requirePendingCheckpoint:true`.

If this function becomes live again, reset could quarantine the checkpoint between steps and the subsequent append would not require it.

Therefore before P0-072 closure either:

- harden it to require the exact current pending checkpoint, or
- remove/retire the dormant unsafe helper if canonical architecture no longer uses it.

Do not leave a privileged stale-replay helper available for future reuse with a misleading “safe” name.

This is source hygiene under P0-072, not a new owner.

## 12. Existing Journal row after reset does not override detached suppression

Import-replace may create a same textual Journal id in a new generation.

For a reset-detached old durable checkpoint, the append transaction must stop at `suppressed-reset-detached` before treating that `get(id)` result as operation success.

The replacement row remains untouched.

This does not solve general non-reset same-id generation conflicts; P0-076 remains ACTIVE.

## 13. Stats mutation interaction

Current `appendJournalEntry()` begins a Journal stats mutation marker before the IDB write transaction and completes it when append is suppressed/missing.

P0-072 can preserve that repair behavior.

Structured suppression should still complete/repair the stats marker because no Journal entry mutation was committed.

No new stats-generation claim is made; P0-050 remains separate.

## 14. Deterministic model

Added:

`project_tools/test_p0_072_append_outcome_inline_delete_model.js`

Local Node result before durable write:

```text
P0-072 append outcome/inline delete model: PASS
```

Durable model commit:

`8406fdcf1e2c8eb578ad828f04d5483cdf550415`

Covered controls:

1. missing required durable checkpoint suppresses append without deleting fallback pending evidence;
2. reset-detached durable checkpoint suppresses append and preserves the receipt;
3. reset-detached required pending row cannot replay;
4. active same-operation pending row may be compare-deleted after legitimate append;
5. other-operation/reset-detached same-id pending row is never incidental delete target;
6. existing replacement Journal row does not override reset-detached suppression;
7. four machine outcomes remain distinct.

This is architecture/model evidence, not runtime PASS.

## 15. Direct source/runtime acceptance additions

- transaction-local durable classification distinguishes missing/active/reset-detached;
- transaction-local required pending classification distinguishes the same three states;
- durable missing branch contains no unconditional `pendingStore.delete(id)`;
- `checkEntry()` contains no key-only pending delete;
- successful incidental pending cleanup is compare-delete against current row/reset/operation identity;
- detached source reaches no Journal `put()` and no replacement row mutation;
- `appendJournalEntryFromDurableCheckpoint()` exposes structured `journalOutcome`;
- warning text no longer equates missing with reset cancellation;
- `recoverPendingJournalAppends()` does not increment a generic cancelled counter for detached/manual rows;
- normal pending replay excludes reset-detached rows and still transactionally re-checks them;
- dormant `safeAppendJournalEntry()` is hardened or removed before closure.

## 16. Owner boundaries

This remains P0-072 reset/recovery truthfulness.

It does not close:

- P0-076 general Journal generation/revision CAS;
- P1-146 full local-download late settlement;
- P0-073/P0-074/P1-090 remote identity/context.

No new P-code is allocated.

## 17. Status

The P0-072 delete/writer audit now includes **inline transaction deletes**, not only named cleanup helpers.

The authoritative append rule is:

> **classify required recovery authority inside the Journal write transaction; reset-detached and missing both suppress Journal mutation, but they remain distinct outcomes and neither authorizes unconditional cleanup.**

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
