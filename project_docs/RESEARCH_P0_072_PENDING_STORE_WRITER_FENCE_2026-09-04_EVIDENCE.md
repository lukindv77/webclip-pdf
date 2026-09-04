# P0-072 — pending-store writer / replay / cleanup fencing addendum — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch before this block: `research/p0-072-recovery-quarantine-2026-09-04 @ dfa930391433b0ff4f988e7d45e7487cd20132fb`  
Deterministic writer-fence model commit: `316d1a2b3e67f6b80368bafafe21b8e9e399f495`  
Owner: **P0-072 ACTIVE**.

This addendum closes a design gap in the earlier P0-072 quarantine checkpoint: preserving a reset disposition at reset time is insufficient unless every later writer, replay reader and cleanup/delete path is also fenced against that disposition.

Runtime is unchanged by this checkpoint.

## 1. Fresh finding — required durable checkpoint currently means only “row exists”

Current `appendJournalEntry()` receives `requiredDurableCheckpoint` for local-download and remote-save finalization.

Inside the authoritative Journal write transaction it:

1. reads the required durable row by key;
2. if the row is missing, sets `durableCheckpointMissing=true`, suppresses append and treats the situation as concurrent clear/import;
3. if the row exists, continues normal Journal append.

There is no third state for a row that exists but has been reset-quarantined.

Therefore a naive P0-072 implementation that changes reset from `delete()` to “keep row + `journalResetDisposition`” would accidentally make old completion **more dangerous**: the row exists, so the current append guard would authorize stale Journal resurrection.

Required transaction-local classification is:

```text
missing | active | reset-quarantined
```

Only `active` may authorize Journal finalization.

`missing` and `reset-quarantined` are not semantically identical and must not share one fabricated “cancelled because checkpoint was deleted” explanation.

## 2. `appendJournalEntryFromDurableCheckpoint()` needs truthful result semantics

Current helper returns `cancelled:true` when `appendJournalEntry()` returns null, with text saying the durable checkpoint was deleted by concurrent clear/import.

After P0-072 there are at least three materially different outcomes:

- checkpoint really missing;
- checkpoint present but reset-detached/quarantined;
- active checkpoint but Journal append failed for another reason.

The helper should expose a structured state such as `disposition` / `journalSuppressedReason`, not force all no-append cases into `cancelled:true`.

A reset-detached row remains durable physical evidence; reporting it as deleted/cancelled is the original root cause in another form.

## 3. Fresh finding — late cleanup can delete a row after reset quarantines it

Current local/remote finalization removes durable rows in a **separate transaction after** Journal append returns.

That creates this schedule:

1. old operation A has active durable row R;
2. A's Journal append transaction commits old entry E;
3. before A calls `removePending*`, user clear/import transaction runs;
4. reset deletes E and quarantines R;
5. A resumes after its earlier append and calls unconditional `removePending*`;
6. R is deleted even though it now carries the only reset-detached external-effect evidence.

Reset-time writer fencing alone does not prevent this.

Every physical row deletion after P0-072 must be compare-and-delete against current row state.

Minimum delete preconditions:

- expected row key;
- expected operation/generation identity;
- current row is not reset-quarantined, unless a dedicated terminal-retention cleanup explicitly proves it is allowed to remove that terminal evidence.

## 4. Concrete unconditional delete paths revalidated

### `removePendingLocalDownload()`

Current helper deletes by key only.

It is called from multiple late paths, including:

- automatic-download start admission failure/busy cleanup;
- Chrome `downloads.download()` rejection;
- invalid returned download id;
- late start rejection;
- successful Journal finalization cleanup;
- terminal `interrupted` handling.

Any of these can run after a reset has already quarantined the same row.

For reset-detached rows, factual late failure/interruption should advance the disposition outcome, not blindly delete the receipt.

### `removePendingRemoteSave()`

Current helper also deletes by key only.

It is called after normal remote Journal finalization and from background recovery.

A late post-append cleanup can therefore erase a row that a reset quarantined between append and cleanup.

### Pending Journal append removal

`removePendingJournalAppend()` currently deletes by id only. Even if current live call coverage is narrow, the helper contract should not remain an unfenced primitive once rows can carry reset authority.

## 5. Fresh finding — remote recovery same-id shortcut is incompatible with quarantine

Current `recoverPendingRemoteSaves()` does this early:

1. read pending row id;
2. `getJournalEntryById(id)`;
3. if any Journal entry with that id exists, call `removePendingRemoteSave(id)` and count recovery complete.

After import-replace, the same id may belong to replacement generation B while the pending row is detached evidence for old generation A.

Therefore:

- reset-quarantined rows must not enter this normal shortcut at all;
- normal nonquarantined cleanup still needs exact generation semantics under P0-076 rather than id equality alone.

P0-072 should not solve all P0-076 cases, but it must ensure its detached rows cannot be deleted by this shortcut.

## 6. Whole-record writers requiring hard fencing

Fresh source revalidation confirms:

### `checkpointPendingJournalAppend()`

- scans capacity;
- then performs whole-record `pending.put(item)`.

A same-id stale/new writer can overwrite a quarantined record unless the existing row is re-read and quarantine is preserved/rejected.

### `checkpointPendingLocalDownloadIntent()`

- counts current local rows;
- then performs whole-record `pending.put(item)`.

Its deterministic intent key derives from operation id. Existing quarantined intent state must not be replaced merely because the key is reused.

### `checkpointPendingRemoteSaveIntent()`

Its existing-row branches are especially important:

- `remote-verified` uses spread of current row;
- `stale-unverified` rebuilds from the new `item`;
- ordinary prepared/current branch also rebuilds from the new `item` while retaining selected timestamps.

The latter two paths can erase `journalResetDisposition` unless they explicitly reject/quarantine-preserve the current row.

Required rule:

> an ordinary checkpoint/admission writer may never turn a reset-quarantined row back into ordinary current-generation work.

## 7. Spread writers are structurally safer but still need semantic transition rules

Current spread-style writers include:

- local `unknown/manual-resolution` transition;
- remote failure updates;
- remote `stale-unverified` transition;
- remote `remote-verified` transition.

Because they spread current row, they naturally retain an added top-level reset disposition.

That is necessary but not sufficient.

For a quarantined row they must also update the disposition's factual outcome/resolution consistently. Examples:

- exact late local outcome becomes `complete`, `interrupted` or `unknown` without Journal append authority;
- remote verification becomes `remote-verified/terminal` while preserving reset id;
- a quarantined unresolved remote row must not be converted into generic stale state that later generic cleanup can delete.

Use a dedicated transition helper with expected reset/operation identity rather than allowing arbitrary semantic field combinations.

## 8. Replay readers must exclude wrong-generation authority

### `recoverPendingJournalAppends()`

Current `listPendingJournalAppends()` reads the normal queue by `updatedAt`, and recovery attempts each returned item.

Reset-detached `pendingAppends` must not be returned to normal replay. They cannot append into replacement Journal generation.

### `recoverPendingRemoteSaves()`

Current normal list takes up to six non-`stale-unverified` rows by `updatedAt` and recovery may create public links / verify / append Journal.

Reset-detached rows must not participate in that same ordinary Journal-finalizing queue without a separate factual-only reconciliation contract.

### `reconcilePendingLocalDownloads()`

Local reset-detached rows may still be factually observable through exact Chrome DownloadItem identity, but their Journal-finalization path must remain disabled.

The safe architecture is to separate “observe/settle physical state” from “normal current-generation Journal replay”.

## 9. Capacity classification needs more than active vs unknown

Current source has these simplified classifications:

### `pendingAppends`

- one count cap: 20 rows;
- one aggregate serialized cap: 4 MiB;
- every row participates in the same capacity calculation.

### `pendingDownloads`

- `kind==='unknown'` counted separately;
- every other row counted as active;
- both groups currently use the same numerical ceiling.

### `pendingRemoteSaves`

- only `phase==='stale-unverified'` is excluded from active count;
- `remote-verified` and every other phase consume active admission capacity until removed.

After reset quarantine, at least these logical classes are distinct:

1. **current-active** — ordinary current-Journal work and current-operation admission;
2. **detached-reconciling** — old-generation physical outcome may still settle, but it has no Journal append authority;
3. **detached-manual** — unresolved evidence requiring explicit/manual reconciliation;
4. **terminal-retained** — factual terminal evidence awaiting bounded retention/compaction.

They must not all consume the ordinary new-operation capacity.

Likewise they must not all disappear under one TTL/cap cleanup.

Fair scheduling between current and detached reconciling work remains related to P1-064/P1-208 and should not be falsely declared closed by P0-072.

## 10. Fresh cleanup ordering makes remote skip mandatory

Background maintenance currently runs `cleanupStalePendingRemoteSaves()` before `recoverPendingRemoteSaves()`.

Current stale cleanup:

- collects every `phase==='stale-unverified'` row;
- deletes rows older than the 30-day cutoff;
- additionally trims retained stale rows above `MAX_PENDING_REMOTE_STALE_SAVES = 100`.

There is no current reset-provenance exclusion.

Therefore any quarantined unresolved remote row that reaches/retains `stale-unverified` could be physically deleted before the recovery phase even sees it.

Required P0-072 rule:

> generic remote stale cleanup excludes every reset-detached unresolved/manual receipt. Terminal reset receipts use a separately defined terminal-retention policy, not the generic stale-unverified policy.

## 11. Post-reset local Blob/resource release remains separate

Local download paths also revoke Blob URLs after terminal/unknown transitions.

That resource release can remain desirable after reset: retaining a compact physical receipt does not imply retaining the PDF Blob forever.

The invariant from consolidated durability evidence remains:

```text
release expensive resource != delete external outcome evidence
```

So conditional row retention must not accidentally pin Blob URLs indefinitely.

## 12. Deterministic writer/delete fence model

New file:

`project_tools/test_p0_072_pending_store_writer_fence_model.js`

Local Node execution before GitHub write:

```text
P0-072 pending-store writer/delete fencing model: PASS
```

Durable commit:

`316d1a2b3e67f6b80368bafafe21b8e9e399f495`

Model controls:

1. durable checkpoint classification distinguishes missing / active / quarantined;
2. stale whole-record put cannot erase a reset disposition;
3. post-reset late cleanup cannot delete quarantined evidence;
4. compare-and-delete also rejects mismatched operation identity;
5. ordinary replay excludes quarantined rows;
6. generic remote stale cleanup excludes reset-detached rows;
7. current-active, current-unknown, detached-reconciling, detached-manual and terminal-retained counts are independent;
8. exact race `append success -> reset quarantine -> old separate cleanup` retains evidence.

The model is architecture evidence, not a current runtime PASS.

## 13. Revised implementation acceptance additions

In addition to prior P0-072 cases, runtime deterministic tests must prove:

26. required durable checkpoint present + quarantined does not authorize Journal append;
27. missing vs quarantined produce distinct structured outcomes;
28. `checkpointPendingJournalAppend()` cannot overwrite a quarantined same-id row;
29. `checkpointPendingLocalDownloadIntent()` cannot overwrite a quarantined same-key intent;
30. `checkpointPendingRemoteSaveIntent()` cannot erase disposition in prepared/stale branches;
31. reset between Journal append and local `removePendingLocalDownload()` prevents stale delete;
32. reset between Journal append and `removePendingRemoteSave()` prevents stale delete;
33. local late start rejection/interruption after reset advances terminal factual outcome without deleting reset evidence;
34. remote recovery same-id replacement entry does not delete detached old receipt;
35. ordinary pendingAppend/remote replay skips reset-detached rows;
36. local exact physical reconciliation may settle a detached DownloadItem but cannot append Journal;
37. stale remote cleanup skips every detached unresolved/manual row;
38. current-operation admission caps do not count terminal/manual detached rows as ordinary active work;
39. detached reconciliation scheduling does not silently claim P1-064/P1-208 fairness closure;
40. expensive Blob release remains possible while compact detached receipt survives.

## 14. Current status

This audit does not change P-code ownership:

- **P0-072** owns reset quarantine, durable disposition preservation and old-generation Journal suppression;
- **P0-076** owns exact per-entry/replacement CAS beyond the reset receipt boundary;
- **P1-064/P1-208** retain fairness owners;
- **P1-183/P1-090/P0-073/P0-074** retain destructive Yandex receipt/object/context requirements.

No new P-number is assigned.

**P0-072 remains ACTIVE.** Runtime remains unchanged. `manifest.json` remains `0.9.8`. No Actions/build/tag/Release is claimed by this checkpoint.
