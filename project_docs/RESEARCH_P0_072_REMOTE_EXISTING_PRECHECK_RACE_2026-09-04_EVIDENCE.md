# P0-072 — remote recovery existing-Journal pre-check race — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 98a35a402ed87e1d444486bd54ba9874c64a195a`  
Deterministic model commit: `b9a566f5233cddfbfd1d605e1187f0e4ff125d81`  
Owner: **P0-072 ACTIVE**.

This checkpoint records a fresh source-level bypass found after the first-runtime contract consolidation. Runtime/manifest are unchanged.

## 1. Fresh source finding

Current `recoverPendingRemoteSaves()` obtains a queue snapshot and then, for each row, does:

```text
const existingEntry = await getJournalEntryById(id);
if (existingEntry) {
  await removePendingRemoteSave(id);
  recovered += 1;
  continue;
}
```

This happens **before** the later `appendJournalEntryFromDurableCheckpoint()` transaction can classify the current durable remote checkpoint.

`removePendingRemoteSave(id)` is currently a key-only delete.

## 2. Reset/import race

Valid schedule:

1. remote recovery lists active row R;
2. import/clear transaction runs after that queue snapshot;
3. R becomes reset-detached and must be preserved;
4. import installs a replacement Journal entry using the same textual id;
5. old recovery resumes;
6. `getJournalEntryById(id)` observes the replacement row;
7. old pre-check calls key-only `removePendingRemoteSave(id)`;
8. reset-detached recovery evidence is destroyed;
9. the later structured durable-checkpoint append suppression is never reached.

Therefore filtering detached rows at list time is necessary but not sufficient. A snapshot may become stale immediately after selection.

## 3. Same-id Journal existence is not reset authority

A Journal row with the same textual id can mean:

- the same current operation was already appended idempotently;
- a replacement/import generation happens to contain the same id;
- another adjacent generation/identity case owned by P0-076.

It cannot by itself prove that the current pending remote receipt is disposable.

P0-072 therefore requires durable checkpoint authority classification before using Journal existence as cleanup success.

## 4. Preferred repair

Remove the standalone recovery pre-check and let the authoritative Journal append/checkpoint transaction return:

```text
appended
existing
suppressed-missing
suppressed-reset-detached
```

Then cleanup decision happens separately through compare-delete.

This produces the correct ordering:

```text
current durable row classification
 -> if reset-detached: suppress immediately, preserve receipt
 -> if active: inspect/append existing Journal semantics
 -> only after active existing/appended result may compare-delete current receipt
```

An alternative combined transaction helper is acceptable if it enforces the same ordering. A separate `getJournalEntryById()` followed by key-only delete is not.

## 5. `existing` still does not close P0-076

For an active current checkpoint, the structured helper may still return `existing` under current idempotency semantics.

P0-072 only requires that reset-detached authority wins before this result can be accepted.

General same-id current/replacement generation proof remains P0-076 ACTIVE.

## 6. Recovery queue filter remains required

Ordinary `listPendingRemoteSaves()` should still exclude reset-detached rows from the Journal-finalizing recovery queue.

The transaction-local re-check is a second barrier for the race:

```text
listed active -> reset happens -> current row detached
```

Both selection filtering and authority re-check are required.

## 7. Compare-delete after `existing`

Even for an active row where `journalOutcome === existing`, cleanup must use:

- exact key;
- expected operation identity;
- current row still active/not reset-detached.

A reset between structured append result and cleanup must cause compare-delete to leave the receipt intact.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_remote_existing_precheck_race_model.js`

Local Node result before durable write:

```text
P0-072 remote existing-entry precheck race model: PASS
```

Covered controls:

1. old pre-check deletes a reset-detached receipt when replacement Journal reuses the id;
2. structured current-authority classification returns `suppressed-reset-detached` and preserves the receipt;
3. active same-generation existing row can still produce `existing`, with cleanup remaining a separate guarded decision.

The model is architecture evidence, not runtime PASS.

## 9. Direct acceptance additions

- `recoverPendingRemoteSaves()` has no standalone `getJournalEntryById(id) -> removePendingRemoteSave(id)` shortcut;
- current durable remote checkpoint is classified inside the authoritative Journal transaction before `existing` is accepted;
- reset-detached + replacement same-id Journal row yields `suppressed-reset-detached`;
- compare-delete after `existing/appended` rechecks reset barrier and operation identity;
- list-time detached filtering remains present as a scheduler optimization/barrier;
- P0-076 remains ACTIVE for general generation identity.

## 10. Status

This finding is an additional concrete call-site requirement under the consolidated first-runtime contract; it does not change the selected architecture.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
