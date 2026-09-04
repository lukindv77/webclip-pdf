# P0-072 — runtime decomposition / minimal implementation seams — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 1e195a4dc15667a7cd2d1eceda09093d0b399da1`  
Owner: **P0-072 ACTIVE**.

This checkpoint translates the accumulated architecture evidence into a bounded source-level implementation map. It intentionally changes no runtime and claims no test/release closure.

## 1. Goal of the decomposition

P0-072 now spans two storage shapes:

1. existing recovery rows in `pendingAppends`, `pendingDownloads`, `pendingRemoteSaves` — remain in place and gain reset disposition;
2. external mutations currently co-located with replaceable Journal entries — use worker-issued namespaced `meta` receipts, beginning with ReadLater→Upload.

The implementation should not be one large rewrite of `service-worker.js`. It should be split into helpers whose contracts can be source-bound and behavior-tested independently.

## 2. Constants / pure normalizers first

Add one coherent constant group near current Journal store constants:

- `JOURNAL_RESET_DISPOSITION_VERSION = 1`;
- `JOURNAL_EXTERNAL_EFFECT_RECEIPT_VERSION = 1`;
- `JOURNAL_EXTERNAL_EFFECT_META_PREFIX = 'externalEffect:v1:'`;
- finite count/record/scan caps, selected only after measuring representative bounded rows;
- explicit outcome/resolution enums or validation sets.

Pure helpers should include:

- `normalizeJournalResetDisposition(value)` — strict current-version shape, bounded strings/timestamps, no permissive import semantics;
- `isJournalCheckpointResetDetached(row)`;
- `classifyJournalCheckpointAuthority(row)` -> `missing | active | reset-detached`;
- `makeJournalResetDisposition({resetId, kind, scope, scopeKey, operationId, now, outcome, resolution})`;
- `classifyExternalEffectReceipt(receipt)` -> active/reconciling, manual, terminal;
- `externalEffectMetaKey(effectId)`;
- `isExternalEffectMetaKey(key)`.

These helpers must never accept portable Journal `readMove*` as proof of live receipt provenance.

## 3. One reset transition helper for all pending stores

Avoid duplicating clear-all/scoped/import quarantine semantics in three ad hoc cursor handlers.

Create a transaction-local helper conceptually equivalent to:

```text
quarantinePendingCheckpointInTransaction(cursorOrStore, currentRow, resetContext)
```

Contract:

- current row re-read is transaction-owned;
- if already reset-detached, preserve the first reset identity;
- otherwise add exact reset disposition without dropping unknown fields;
- derive factual starting `outcome/resolution` from current store state;
- `cursor.update({...current, journalResetDisposition})` rather than destructive replacement;
- no async work outside IndexedDB callbacks that can deactivate the transaction.

The helper should remain storage-shape aware only for initial outcome classification; all immutable reset metadata is shared.

## 4. Replace reset deletion at the three authoritative sites

### `clearJournalEntries()` clear-all

Current behavior clears the three pending stores.

Required change:

- retain the existing transaction scope;
- cursor/quarantine every old pending row instead of calling `clear()`;
- detach matching external-effect `meta` receipts in the same transaction;
- only then perform/complete Journal deletion/revision work;
- publish success only from transaction completion.

### `clearJournalEntries()` URL/site scoped clear

Current behavior cursor-deletes matching pending rows using normalized `data.meta` scope.

Required change:

- preserve exact existing scope predicate for pending rows;
- transition matching rows in place;
- leave nonmatching rows byte-for-byte unchanged;
- separately prefix-scan trusted external-effect receipts and match immutable receipt-owned `urlKey/siteKey`.

### `commitStagedJournalImport()` / final replace transaction

Current replacement clears the three pending stores before installing staged entries.

Required change:

- quarantine all old pending rows;
- detach all old trusted external-effect receipts;
- preserve import lease/preview/revision checks already owned by P1-215/P0-013;
- replacement entries never inherit old live physical authority merely because imported `readMove*` fields exist.

## 5. Durable checkpoint append helper must become tri-state

Current `appendJournalEntry()` logic treats a missing required durable checkpoint as intentional clear/import and suppresses stale resurrection. After in-place quarantine, mere existence is no longer enough.

Required read result:

```text
missing        -> no append; existing missing-checkpoint result semantics
active         -> eligible for ordinary append subject to existing authority checks
reset-detached -> no append; structured reset-detached result
```

Do not map `reset-detached` back to the old generic `cancelled` meaning internally. User-facing wording can remain compact, but runtime/tests need a distinct machine-readable reason.

`appendJournalEntryFromDurableCheckpoint()` must propagate this distinction so downstream cleanup knows it must preserve detached evidence.

## 6. Whole-record checkpoint writers: compare-before-put fence

Three existing whole-record writers are high-risk because a stale task can erase newly added reset metadata:

- `checkpointPendingJournalAppend()`;
- `checkpointPendingLocalDownloadIntent()`;
- `checkpointPendingRemoteSaveIntent()` prepared/stale replacement branches.

Required pattern:

1. transaction get current key;
2. if current is reset-detached, reject stale whole replacement with a stable internal code;
3. if current operation identity/generation conflicts under an existing owner, preserve that owner's stronger fail-closed rule;
4. otherwise put the new row.

Do not “preserve disposition” by blindly copying an earlier caller snapshot. The authoritative disposition is the current transaction row.

## 7. Spread writers still need semantic transition fencing

Writers that currently use `{...current, ...patch}` structurally retain reset metadata, but that alone is insufficient.

Examples include:

- local intent -> numeric DownloadItem bind;
- local transition to `unknown/manual-resolution`;
- remote verified/failure/stale updates.

Required pattern:

- re-read current row in the transaction;
- preserve immutable reset id/source operation id;
- if detached, update factual `outcome/resolution` only;
- never restore ordinary Journal append/replay authority;
- compare expected operation identity before updating or deleting.

## 8. Replace unconditional pending-row deletion with compare-and-delete

Old separate cleanup can resume after a reset and delete a row that reset just preserved.

`removePendingJournalAppend`, `removePendingLocalDownload`, `removePendingRemoteSave` therefore need a guarded contract:

```text
remove only if:
- current key exists;
- expected operation/effect identity matches;
- current row is not reset-detached;
- or caller is the dedicated terminal-retention path with exact terminal proof/reset identity.
```

Ordinary post-append cleanup must never pass the terminal-retention override.

## 9. Replay/recovery queue filters

### Pending appends

Ordinary replay selects only `active` rows. Detached rows never append into a replacement Journal.

### Local downloads

Detached `reconciling` rows may continue exact DownloadItem observation/binding under P0-039/P0-048 identity rules. When factual settlement becomes complete/interrupted/unknown, update detached outcome only and do not append Journal.

Manual/terminal detached rows do not consume ordinary active batch capacity.

### Remote saves

Ordinary remote recovery excludes reset-detached rows from Journal-finalizing/publication replay. If factual-only remote reconciliation is retained, it must be a separate branch that cannot regain Journal authority.

`cleanupStalePendingRemoteSaves()` skips reset-detached unresolved/manual rows before age/count candidate selection.

## 10. Namespaced `meta` receipt API

Do not expose arbitrary `meta` CRUD to operation code. Add a narrow receipt API.

Recommended internal seams:

- `createPreparedExternalEffectReceipt(...)`;
- `admitExternalEffectReceipt(effectId, expectedOperationId)`;
- `transitionExternalEffectReceipt(effectId, expectedPhase, patch)`;
- `getExternalEffectReceipt(effectId)`;
- `detachExternalEffectReceiptsForResetInTransaction(metaStore, resetContext)`;
- `cleanupTerminalExternalEffectReceipts(...)`;
- `countExternalEffectReceiptClassesInTransaction(metaStore, limits)`.

Every mutating API re-reads exact current row and validates version/provenance/effect id/operation id. Operation code never `put()`s a receipt object captured before an await.

## 11. ReadLater→Upload integration sequence

Current positive ordering writes `readMove*` projection before `resources/move`, but the projection is portable and replaceable.

Target sequence:

1. fresh-read Journal entry and current remote identity/context under existing Yandex owners;
2. determine exact source/target under existing move rules;
3. create random `effectId`;
4. in one `entries + meta` transaction:
   - re-read current entry;
   - write trusted `prepared` receipt with immutable scope/source/target/context;
   - optionally update `readMove*` projection for UI;
5. wait for transaction complete;
6. immediately before primary `/resources/move`, CAS exact receipt `prepared -> effect-admitted` in `meta`;
7. wait for admission transaction complete;
8. transmit move;
9. verify factual remote outcome under P1-090/P0-073/P0-074 limits;
10. transition exact receipt factual phase;
11. if receipt is reset-detached, stop before Journal mutation;
12. if not detached, ordinary Journal finalization still requires P0-076 CAS authority — do not manufacture it inside P0-072;
13. terminal cleanup uses only dedicated retention path.

A worker crash with persisted `prepared` proves primary move admission did not commit. A crash with `effect-admitted` is uncertainty and remains reconcilable.

## 12. Legacy/imported `readMove*` behavior

Once trusted receipt authority exists:

- `readMovePendingAt/readMoveTargetPath` without a local trusted receipt do not auto-resume a physical move;
- they may remain UI/diagnostic projection for compatibility;
- import validation must not create a receipt;
- reset/import code must not copy them into `meta` as a migration shortcut;
- a future cleanup/export decision may remove obsolete projection fields, but that is separate product/data-model work.

This avoids converting portable backup content into live remote authority.

## 13. Capacity implementation seam

The receipt API owns local logical capacity only.

Admission transaction:

- bounded prefix cursor;
- classify active/manual/terminal;
- optionally compact only proven terminal rows according to policy;
- reject when active/manual envelope remains exhausted;
- validate per-field/record envelope;
- write prepared receipt;
- rely on actual transaction completion for durable success.

Do not depend on `navigator.storage.estimate()` as a reservation. P1-043 remains separate.

For reset, do not pre-delete unresolved rows to make room. Any write/quota error aborts the whole destructive transaction.

## 14. Test decomposition

The current branch already contains architecture models. Runtime implementation should add source-bound/deterministic tests in layers rather than one monolithic fixture.

### Layer 1 — pure helpers

- disposition validation/version;
- authority classification;
- outcome transition table;
- exact scope matching;
- record/field bounds.

### Layer 2 — transaction-state model

- clear-all/scoped/import quarantine;
- reset vs admission ordering;
- forced transaction abort;
- count-cap boundary concurrency;
- compare-before-put / compare-and-delete.

### Layer 3 — committed-source binding

Existing RED `test_p0_072_checkpoint_quarantine.js` should become GREEN and assert the actual runtime no longer clears/deletes matching recovery authority.

Add source bindings proving:

- tri-state checkpoint classification is used before Journal append;
- whole-record writers call the fence;
- stale cleanup checks reset state;
- `moveReadLaterEntryToRead()` creates trusted receipt and admission CAS before `/resources/move`;
- imported projection is not used as resume authority.

### Layer 4 — regression neighbors

Re-run deterministic P0-039/P0-048 local download identity/unknown tests and applicable C44 import lease/revision tests. P0-072 must not regress their invariants.

No real Yandex network is needed for these deterministic claims.

## 15. Suggested implementation commit order

To remain interruption-safe:

1. **helpers + tests only** — constants, pure disposition/classification helpers; no call-site behavior change;
2. **pending-store quarantine/writer/delete fencing** — clear/import + append/local/remote state machines; keep ReadLater separate;
3. **trusted meta receipt API + capacity** — still no remote move integration until tests prove admission/reset ordering;
4. **ReadLater integration** — receipt before move + factual-only detached settlement;
5. **docs/evidence/status interpretation** — only after all deterministic tests are green;
6. **PR/repository gate** — exact-head Repository Integrity, TOCTOU, merge, post-merge.

This ordering leaves a durable checkpoint after every semantic layer and avoids a single 570-KB service-worker rewrite with multiple unproven failure modes.

## 16. Explicit non-goals of this implementation tranche

Do not fold these into P0-072 merely because they are adjacent:

- P0-076 general per-entry/Journal-generation CAS;
- P1-183 creation of Trash pre-move exact receipt;
- P1-090 complete exact-object move reconciliation;
- P0-073/P0-074 complete immutable Yandex context generation;
- P1-043 global byte reservation across all storage writers;
- P1-064/P1-208 full recovery fairness;
- P1-210 complete user-facing operation reconciliation;
- public-link revoke lifecycle.

The implementation can be composable with these owners without falsely closing them.

## 17. Current conclusion / exact resume point

P0-072 research is now sufficiently decomposed to begin bounded runtime implementation without another architecture-wide redesign.

The first runtime commit should be **helpers + deterministic source/model tests only**, followed by pending-store quarantine. It should not yet integrate a live Yandex move until the receipt/admission helpers are proven locally.

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged on this research branch at this checkpoint. Manifest stays `0.9.8`; release stays `NOT READY`; no build/tag/GitHub Release is authorized.
