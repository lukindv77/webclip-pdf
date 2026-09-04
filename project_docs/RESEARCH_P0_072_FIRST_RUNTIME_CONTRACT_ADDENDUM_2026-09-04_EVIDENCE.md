# P0-072 — first runtime implementation contract addendum — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this addendum: `research/p0-072-recovery-quarantine-2026-09-04 @ 1a396999ab10843f1a2e16114aacc768c3acf0ef`  
Owner: **P0-072 ACTIVE**.

This addendum is mandatory when implementing `RESEARCH_P0_072_FIRST_RUNTIME_IMPLEMENTATION_CONTRACT_2026-09-04_EVIDENCE.md`. It incorporates later call-site and transaction refinements discovered after that consolidated contract was written. Runtime/manifest are unchanged.

## 1. Remote stale cleanup must remove the snapshot/delete race

`cleanupStalePendingRemoteSaves()` currently selects rows in one readonly transaction and key-deletes them later in another transaction.

Target implementation:

- prefer one `pendingRemoteSaves` readwrite transaction for scan/classification/count trimming/delete;
- generic stale cleanup only sees current non-detached `phase:'stale-unverified'` rows;
- no `journalResetDisposition` row is deleted by generic stale cleanup, even if terminal;
- detached terminal retention remains a dedicated path.

Evidence: `RESEARCH_P0_072_REMOTE_STALE_CLEANUP_ATOMIC_2026-09-04_EVIDENCE.md`.

## 2. Local intent→numeric bind is factual reconciliation with a stage gate

`bindPendingLocalDownloadIntent()` may still bind a detached receipt when exact Chrome DownloadItem identity later appears, but only for an already-admitted or legacy admission-unknown start.

Required rules:

- explicit `downloadStart=admitted` -> factual bind allowed;
- legacy missing stage -> compatibility bind allowed;
- `prepared`, `cancelled-before-start`, `not-applicable` -> bind rejected/fail-closed;
- same-operation existing numeric target cannot delete the intent until reset/stage authority is merged/validated;
- source reset barrier propagates to an active same-operation numeric survivor;
- conflicting reset ids are not collapsed automatically.

Evidence: `RESEARCH_P0_072_LOCAL_BIND_RESET_AUTHORITY_2026-09-04_EVIDENCE.md`.

## 3. Remote checkpoint creation is monotonic, not whole-record reactivation

`checkpointPendingRemoteSaveIntent()` must not keep its current caller-item replacement semantics for existing rows.

Required rules:

- absent row -> may create fresh v1 `prepared` stages;
- reset-detached existing row -> reject/no replacement;
- `stale-unverified` existing row -> do not reactivate to prepared;
- same-operation active/verified row -> idempotently preserve current durable stage/context;
- admitted stage cannot downgrade to prepared;
- legacy missing-stage existing row cannot be fabricated into new prepared certainty;
- different-operation same-key collision fails closed while P0-074/P0-076 remain the broader owners.

Evidence: `RESEARCH_P0_072_REMOTE_CHECKPOINT_WRITER_MONOTONICITY_2026-09-04_EVIDENCE.md`.

## 4. Remote recovery cannot use standalone same-id Journal precheck as cleanup authority

`recoverPendingRemoteSaves()` currently has a shortcut:

```text
getJournalEntryById(id)
 -> if exists, removePendingRemoteSave(id)
```

This can see a replacement/imported same-id Journal row after reset and delete the old detached remote receipt.

Target:

- remove this standalone shortcut;
- transaction-local durable authority classification happens before any same-id Journal `existing` result can be accepted;
- reset-detached old operation returns structured suppression and preserves its receipt;
- general same-id Journal-generation CAS remains P0-076.

Evidence: `RESEARCH_P0_072_REMOTE_EXISTING_PRECHECK_RACE_2026-09-04_EVIDENCE.md`.

## 5. Local token salt belongs to the authoritative transaction

Do not create/write `journalLocalTokenSalt:v1` in a separate pre-reset transaction merely to compute tokens.

Phase A outside reset:

- bounded Chrome Storage legacy read;
- deterministic bounded source projection;
- ephemeral source prehash;
- requested normalized URL/site scope.

Phase B inside the authoritative `meta + pending + entries` transaction:

- read/validate salt;
- if absent and token work is required, prove bounded dependent namespaces are empty before first creation;
- generate first salt synchronously with `crypto.getRandomValues()` when allowed;
- compute final salted tokens synchronously;
- materialize/fence/detach/capacity-check and mutate Journal in the same commit boundary.

Evidence: `RESEARCH_P0_072_LOCAL_SALT_AUTHORITATIVE_TX_2026-09-04_EVIDENCE.md`.

## 6. Legacy source hashing is split for bounded transaction CPU

Do not hash the complete multi-megabyte legacy projection under the active IndexedDB transaction.

Phase A computes an ephemeral unsalted:

```text
sourcePrehash = SHA256(stable bounded source projection)
```

Phase B computes only the final constant-size salted/domain-separated token:

```text
SHA256(domain || salt || sourcePrehash)
```

Only the final salted token persists. The prehash is never logged/exported/stored.

Evidence: `RESEARCH_P0_072_LEGACY_PREHASH_TOKEN_SPLIT_2026-09-04_EVIDENCE.md`.

## 7. Liability reservation compatibility remains mandatory

Do not replace P0-039's accepted independent `100 active + 100 unknown` legacy capacity with a universal shared cap that rejects already-valid upgrade state.

For new explicit-stage local rows, reserve future unknown liability at admission while grandfathering legacy rows. Factual settlement is never rejected merely because a class cap was reached after admission; cap pressure blocks new irreversible admissions instead.

Evidence: `RESEARCH_P0_072_ROLLOUT_LIABILITY_RESERVATION_2026-09-04_EVIDENCE.md` and `RESEARCH_P0_039_LOCAL_DOWNLOAD_UNKNOWN_RECOVERY_CLOSURE_2026-09-01_EVIDENCE.md`.

## 8. Source-bound RED gates that must become GREEN

In addition to older P0-072 models, first pending/legacy runtime implementation must satisfy:

- `test_p0_072_first_runtime_source_contract.js`;
- `test_p0_072_destructive_legacy_source_contract.js`;
- `test_p0_072_append_source_contract.js`;
- `test_p0_072_remote_existing_precheck_source_contract.js`;
- `test_p0_072_remaining_callsite_source_contract.js`;
- `test_p0_072_checkpoint_quarantine.js`.

These tests are intentionally RED against the current runtime and are not current implementation PASS evidence.

## 9. Revised runtime commit order

### Commit A — pure helpers / schemas / classifiers

No call-site behavior change yet:

- reset disposition v1;
- external stage v1 validators/classifiers;
- reset/authority/stage transition pure helpers;
- stable legacy projection/prehash helpers;
- token-domain/key helpers;
- structured append outcome constants.

### Commit B — pending/legacy atomic reset + writer/delete fencing

- destructive bounded legacy snapshot;
- authoritative salt/token/fence work;
- clear-all/scoped/import quarantine;
- ordinary legacy migration fence awareness;
- pendingAppend writer/delete/inline-delete fencing;
- local/remote whole-writer current-row fencing;
- remote stale cleanup atomicity;
- local bind reset/stage merge;
- remote same-id precheck removal;
- replay filters / structured append suppression.

### Commit C — existing local/remote stage admission call-sites

- local `downloadStart` one-shot CAS immediately before `chrome.downloads.download()`;
- remote upload CAS immediately before signed PUT transfer;
- publish CAS at exact `/resources/publish` PUT boundary;
- already-admitted recovery uses factual/read-only reconciliation only;
- detached factual settlement updates outcome without Journal authority.

### Later tranche — namespaced ReadLater receipt

Do not mix it into Commit A/B merely because `meta` is already touched. Keep the worker-issued ReadLater receipt integration independently reviewable.

## 10. Closure boundary remains unchanged

This addendum does not close:

- P0-076 general Journal generation/per-entry CAS;
- P1-146 complete automatic-download actual-settlement/restart deduplication;
- P1-183 Trash pre-move receipt creation;
- P0-073/P0-074/P1-090 full Yandex identity/context/object continuity;
- P1-043 shared physical storage reservation;
- P1-064/P1-208 recovery fairness;
- P1-210 full user-facing reconciliation.

No new P-code is allocated.

## 11. Exact implementation resume point

The first production change should begin with **Commit A only**: add bounded pure constants/helpers/classifiers to `service-worker.js` without changing current external side-effect or clear/import call-site behavior, then run syntax/source/model gates available locally. Do not start ReadLater/Yandex move integration in that commit.

P0-072 remains **ACTIVE**. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
