# P0-072 — namespaced meta receipt / admission-reset linearization — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ efe850b69f3bce9ca0114c40924e84933c53c034`  
Deterministic model checkpoint: `20a5975c58ee7cde9365673572ad6d4b11cd7b51`  
Current owner: **P0-072 ACTIVE**.

This is a research/architecture checkpoint. Runtime, manifest, registry status, release readiness and external Yandex state are unchanged.

It refines the earlier P0-072 scope correction and does not retract the already selected in-place quarantine for `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`.

## 1. Fresh bootstrap / unfinished-work reconciliation

Fresh GitHub state at the beginning of this continuation:

- canonical `main` remained exactly `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- the P0-072 research branch remained exactly on the previous durable checkpoint `efe850b69f3bce9ca0114c40924e84933c53c034`;
- open PR list was empty;
- open Issue list was empty;
- `CONTEXT_MANIFEST.json` still names `RESEARCH_REGISTRY.md` as the sole P-code status authority.

Therefore there was no concurrent durable work to reconcile and no rebase/TOCTOU conflict before continuing this tranche.

## 2. Fresh source facts that constrain receipt storage

### `WebClipJournal.meta` already exists in DB v7

Current worker constants:

- `JOURNAL_DB_NAME = 'WebClipJournal'`;
- `JOURNAL_DB_VERSION = 7`;
- `JOURNAL_META_STORE = 'meta'`;
- key path is `key`.

The worker currently stores exact-key metadata/leases there, including Journal revision, import lease and backup lease.

### `journal.js` is a second schema owner

`journal.js` independently opens the same `WebClipJournal` database at version 7 and has its own `onupgradeneeded` implementation that creates/repairs:

- `entries`;
- `urlStats`;
- `meta`;
- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`;
- `importStaging`.

Both worker and Journal page close their DB connection on `versionchange`, which is a useful positive control, but adding a new object store still requires a coordinated version bump in both schema owners.

This is exactly the architectural pressure already represented by **P2-019 BACKLOG**: one authoritative shared IndexedDB schema/migration owner across worker/offscreen/page openers.

P0-072 should not unnecessarily widen that migration problem.

### Current `meta` consumers are exact-key, not generic cleanup

Fresh current-source search found:

- no `meta.clear()`;
- no generic `meta.openCursor()` cleanup;
- deletion is performed only for known import/backup lease keys after exact key reads/ownership checks;
- Journal page does not interpret arbitrary `meta` records; its live Journal revision fallback uses `chrome.storage.local.webclipJournalRevision`, not a scan of IndexedDB `meta` values.

Therefore a reserved key namespace inside `meta` is not currently exposed to generic clear/TTL behavior.

### Clear and replace-import already include `meta` in their authoritative transaction

`clearJournalEntries()` opens a single readwrite transaction over:

- `entries`;
- `meta`;
- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

Full clear currently performs `clear()` on the Journal and all three pending stores inside that transaction.

`commitStagedJournalImport()` opens one readwrite transaction over the same stores plus `importStaging`; its `beginReplace()` currently clears all three pending stores and the old Journal in that same transaction.

This means reset-detachment of namespaced `meta` receipts can share the exact existing atomic commit/abort boundary without introducing a new object store.

## 3. Storage decision — use namespaced per-effect rows in existing `meta`

For the current P0-072 implementation direction, choose **per-effect namespaced records in existing `WebClipJournal.meta`**, not a new DB v8 object store.

Illustrative key contract:

```text
externalEffect:v1:<worker-random-effect-id>
```

The exact prefix constant is an implementation detail, but it must be unique and versioned.

### Why one row per effect, not one aggregate array

Do not store all receipts in one `meta` array value.

One aggregate value would create:

- large whole-record rewrites;
- avoidable lost-update/CAS pressure between independent operations;
- harder bounded cleanup/compaction;
- one oversized corruption/failure domain.

Per-effect rows preserve independent transaction/CAS identity and allow bounded prefix cursor scans.

### Why not DB v8 now

A dedicated `externalEffects` store could eventually provide indexes by phase/time/scope, but today it would require synchronized migration changes in both worker and `journal.js`, increasing P2-019 surface without a demonstrated scale need.

The current receipt population must remain deliberately small and bounded. Under that constraint, a prefix cursor over the existing key-value store is sufficient and lower-risk.

This is not a permanent prohibition on a dedicated store. A future P2-019/shared-schema implementation may migrate the namespace to its own store if measured scale or query needs justify it.

## 4. Prefix scans are technically appropriate for the bounded model

IndexedDB provides `IDBKeyRange` to restrict a cursor to a continuous key interval, and it is available in Web Workers.

A worker can therefore enumerate only receipt keys with a bounded string range instead of scanning all metadata records.

The implementation must still enforce a hard receipt count/byte envelope. Prefix range support is not permission for an unbounded scan.

External references checked fresh:

- MDN `IDBKeyRange`: https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
- MDN `Using IndexedDB`: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- IndexedDB terminology/transactions: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

## 5. Required trusted receipt provenance

Portable Journal fields are not physical-operation authority.

Current import normalization preserves:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

Current Mark Read then treats a nonempty `readMoveTargetPath` under the current Upload folder as a resumable chosen target.

Therefore an imported backup can currently carry a plausible-looking move projection even though no physical move was ever admitted by this installation.

Historical consolidated family evidence already classifies this correctly: after an independent move receipt M exists, `readMove*` may remain a UI projection, but imported/untrusted fields cannot manufacture M.

The authoritative receipt must therefore contain explicit local provenance such as:

```text
provenance = worker-issued-live
```

and be stored only in the local nonportable receipt namespace.

Import/export must not recreate these receipt rows from Journal JSON.

## 6. Effect id is not `operationId`

The physical receipt primary identity must be a worker-issued random effect/move generation id.

`operationId` remains correlation/progress identity, but it is not sufficient as the storage primary key because:

- operation correlation and physical attempt lineage are separate concerns in existing research;
- retries/reconciliation may need more than one physical attempt generation;
- imported/historical textual ids are not capabilities;
- a physical receipt must never be retargeted merely because the same textual operation id appears again.

Required fields include both `effectId` and `operationId`.

## 7. Receipt content reuses existing Yandex identity requirements

This tranche does not invent a weaker ReadLater identity contract.

Historical Yandex family evidence already requires a move receipt M to bind at least:

- random move/effect generation;
- worker-issued operation receipt;
- expected Journal generation at admission;
- exact source object identity/path;
- exact target path/generation;
- Yandex account/root/auth/config operation context;
- publication/privacy state when relevant;
- phase/outcome evidence and timestamps.

Fresh source confirms `findYandexFileForJournalEntry()` already checks important parts before current Mark Read:

- persisted root mismatch fails closed;
- persisted account UID mismatch fails closed;
- when a stable `resourceId` is known, path alone is explicitly not accepted as identity proof;
- remote candidate `resource_id` must match the expected id; exact public URL can act only as the documented secondary identity path.

The new receipt can preserve this proved source identity, but it does **not** close P0-073/P0-074/P1-090. Later Yandex stages still need their own immutable operation-context and exact post-state verification work under those owners.

## 8. New linearization refinement — `prepared` vs `effect-admitted`

A single generic “checkpoint exists” phase is too coarse for reset semantics.

Use at least two pre-settlement phases:

1. `prepared` — trusted worker receipt and target plan are durable, but the non-cancellable external request has not been admitted;
2. `effect-admitted` — a transaction-local CAS has committed immediately before transmission of the external move.

The CAS is performed against the exact `effectId` and current receipt value.

### Why this split matters

It gives a provable reset ordering without a global mutex.

#### Reset wins first

1. Mark Read writes local trusted receipt `phase=prepared`.
2. Clear/import transaction obtains the overlapping `meta` write scope first.
3. Reset marks the receipt detached and `cancelled-before-start` / terminal.
4. Later admission CAS sees the reset state and fails.
5. `resources/move` is not started.

This is stronger than retaining an ambiguous receipt for an operation that was provably still cancellable locally.

#### Effect admission wins first

1. Trusted receipt exists as `prepared`.
2. Admission CAS commits `phase=effect-admitted`.
3. Clear/import commits afterwards and detaches the admitted receipt.
4. The external request may already have started, may start immediately after the CAS, or the worker may terminate between CAS and transmission.
5. Reset therefore preserves the receipt and never fabricates cancellation.

The tiny post-CAS/pre-transmission crash window may conservatively retain an admitted receipt even if no network side effect ultimately occurred. This is safe uncertainty and can be reconciled later; it is preferable to losing evidence for an operation that did transmit.

## 9. Why IndexedDB provides the required ordering

The reset transaction and effect-admission transaction both include `meta` in readwrite scope.

IndexedDB write transactions with overlapping scopes are serialized; they do not concurrently modify the same scoped store. Transaction abort rolls back the complete transaction.

Therefore the durable `prepared -> effect-admitted` CAS and reset detachment have one database ordering even across separate async worker tasks.

No in-memory `journalDestructiveMutationInFlight` extension is required for this property, and such a global alone would be insufficient across MV3 worker termination.

Chrome also explicitly documents that extension service workers may be terminated after idle periods and that global variables are lost; persistent state should be used instead:

https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

## 10. Page/UI mutex remains only a convenience

Fresh Journal-page source confirms three independent busy domains:

- `journalDestructiveOperationInFlight` for import/clear/recovery-import;
- `moveReadBusy` for Mark Read;
- `journalDeleteBusy` for entry delete.

`beginJournalDestructiveOperation()` is not called by Mark Read or Delete.

Therefore even one Journal page can overlap clear/import with card-level remote mutation, and two Journal pages are always independent.

The receipt transaction is authoritative; UI disabled state remains only usability control.

## 11. Reset algorithm for namespaced external receipts

Within the existing clear/import readwrite transaction:

1. generate one reset id;
2. preserve/quarantine matching existing pending-store rows under the earlier P0-072 contract;
3. open a cursor restricted to the external-effect key prefix;
4. match receipt scope using immutable receipt-owned `urlKey`/`siteKey`, not a possibly deleted/replaced Journal row;
5. if a matching receipt has no prior reset disposition:
   - `prepared` -> detach + terminal `cancelled-before-start`;
   - `effect-admitted`/unknown/in-flight -> detach + keep reconciling/manual truth;
   - verified but not safely finalized -> detach terminal evidence;
6. retain the first reset id for an already detached unresolved receipt; a second reset may not rewrite the original detachment generation;
7. clear/delete/replace Journal entries;
8. complete existing revision/import work;
9. publish success only on transaction `oncomplete`.

A forced abort must restore the Journal, pending stores, receipt phases and reset dispositions together.

## 12. Scoped clear must use receipt-owned immutable scope

External receipt records need normalized immutable scope copied at live admission:

- `urlKey`;
- `siteKey`.

URL/site clear must compare against those receipt fields.

Do not infer receipt scope by looking up the current Journal entry during reset because:

- the entry may already be missing;
- import may have created the same id with different content;
- physical authority must remain self-describing after detachment.

## 13. Settlement after reset

Late factual settlement must update the receipt first/atomically and then decide whether any Journal finalization is still authorized.

Required rule:

- if `resetDisposition` is present, settlement may enrich factual receipt outcome but **must not mutate or recreate a Journal entry**;
- if no reset disposition exists, any normal Journal finalization must re-read the exact receipt inside the same transaction as the entry mutation and check the expected source generation/authority required by P0-076.

This avoids a read-before-reset / write-after-import stale window.

It also means old error handling may not blindly call `updateJournalEntryRecord(id, stalePatch)` after a reset.

## 14. Imported `readMove*` fields become projection only

After trusted receipt implementation:

- an entry with `readMove*` but no matching live local receipt does not authorize resume;
- imported `readMoveTargetPath` cannot choose a physical target by itself;
- UI may display legacy/projection diagnostic information if product policy keeps it, but worker mutation authority comes from the local receipt namespace only;
- future export minimization may choose to omit obsolete live-operation projection fields, but that is not required to prove the P0-072 storage boundary.

## 15. Current publication/revocation scope classification

Fresh source audit prevents over-expanding this repair.

### Publication during save

Current remote save calls `ensureRemoteCheckpoint()` before public-link creation. Recovery can later call `ensureYandexPublicUrl()` and update the same `pendingRemoteSaves` row to `remote-verified`.

Therefore publication already belongs to the existing remote-save receipt lineage. P0-072 needs in-place pendingRemote quarantine/writer fencing there, not a duplicate external-effect receipt.

### Unpublish/revoke

Current `service-worker.js` contains no `/resources/unpublish` call.

P0-069/P1-164 remain the owners for future explicit revoke lifecycle. P0-072 must be composable with a future durable revoke receipt, but this tranche does not pretend such runtime authority already exists.

### Delete -> Trash

Current Delete→Trash still lacks a durable exact pre-move receipt. This remains **P1-183 ACTIVE**.

P0-072 can define how a future Trash receipt is reset-detached, but cannot prove that overlap safe until P1-183 creates the receipt before the external move.

## 16. Capacity/retention contract for `meta` namespace

The absence of a dedicated store/index is acceptable only with a strict bounded model.

Required classes remain separate:

1. **active/reconciling** — prepared/admitted work that may still progress;
2. **detached unresolved/manual** — physical truth unknown, must not be silently evicted;
3. **terminal retained** — factual terminal evidence, eligible for a separate bounded retention/compaction policy.

Implementation must define:

- hard per-class count caps;
- bounded field lengths and serialized-record size;
- a maximum prefix-scan envelope;
- fail-closed admission/reset when preserving unresolved truth would exceed its safe capacity;
- terminal cleanup that cannot reinterpret age as proof of no external side effect.

Large PDF/blob/staging resources may be released independently; compact receipt identity remains a separate lifecycle.

## 17. Deterministic model added

New file:

`project_tools/test_p0_072_meta_receipt_linearization_model.js`

Local Node execution before GitHub write:

```text
P0-072 meta receipt linearization model: PASS
```

Durable test commit:

`20a5975c58ee7cde9365673572ad6d4b11cd7b51`

The model proves the architecture contract, not current runtime implementation.

Covered controls:

1. imported `readMove*` projection creates no receipt authority;
2. reset before effect admission produces `cancelled-before-start` and prevents later admission;
3. effect admission before reset yields detached authority that can settle without touching a same-id replacement Journal row;
4. URL-scoped reset matches immutable receipt scope only;
5. two receipts can share a textual operation id while retaining separate effect ids;
6. prefix reset leaves `revision`, import lease and backup lease control records unchanged;
7. second reset preserves the first detachment id;
8. forced reset abort restores Journal and receipt state;
9. active/manual/terminal capacity classes remain distinct.

## 18. Existing model interpretation correction

`test_p0_072_external_effect_scope_model.js` remains useful as the earlier broad scope/provenance model, but its illustrative construction `effectId = read-move:<operationId>` is **not** the final primary-key contract.

The later meta-linearization model is authoritative for physical receipt identity: `effectId` is a separate worker-random generation and `operationId` is correlation metadata.

Runtime implementation/tests must follow the later rule.

## 19. Runtime implementation plan after this research checkpoint

Do not add DB v8 for this tranche.

Minimal runtime sequence should be:

1. add versioned namespaced external-effect constants/normalizers and bounded prefix-cursor helpers over `meta`;
2. add `journalResetDisposition` helpers/fencing for the three existing pending stores;
3. replace clear/import pending deletion with atomic quarantine and namespaced receipt detachment;
4. add trusted ReadLater move receipt creation in one `entries + meta` transaction before remote move;
5. add `prepared -> effect-admitted` CAS immediately before `resources/move`;
6. make Mark Read success/error finalization re-read the exact receipt in the same transaction as any Journal projection mutation;
7. ignore imported `readMove*` as physical resume authority when no matching local receipt exists;
8. implement bounded receipt admission/classification and generic cleanup exemption for unresolved detached rows;
9. leave Delete→Trash receipt creation to P1-183, but add P0-072-compatible effect-kind contract so it can use the same namespace later;
10. turn existing RED source-bound P0-072 regression green and add direct runtime-model tests for abort/cap/writer fencing.

Because this will be a runtime + canonical research change, normal PR contract will require `research-impact: owner`, explicit P0-072 rationale and deterministic committed-source tests.

## 20. What is not proved here

This checkpoint does **not** prove:

- real Yandex move unknown-settlement semantics;
- immutable auth/config generation across the whole move saga (P0-074);
- exact target object continuity after move (P1-090);
- Delete→Trash pre-move durability (P1-183);
- full P0-076 per-entry CAS for all Journal mutations;
- P1-210 user-facing receipt reconciliation;
- final bounded retention duration;
- release readiness.

No GitHub Actions run is claimed. Local repository checkout is unavailable in the current execution container due external DNS/network restriction, so only the standalone deterministic model was locally executed. No full source gate is falsely reported.

## 21. Current decision/status

Current P0-072 architecture is now:

- existing save/download pending stores: **in-place versioned quarantine**;
- entry-co-located destructive external effects: **worker-issued per-effect receipt rows in the existing `WebClipJournal.meta` namespace**;
- move admission: **two-phase `prepared -> effect-admitted` CAS**;
- reset before admission: **proven `cancelled-before-start`, no late external start**;
- reset after admission: **detach and preserve factual/unknown settlement authority**;
- imported Journal projections: **never physical authority**;
- no DB v8/schema migration for this tranche.

**P0-072 remains ACTIVE.** `manifest.json` remains `0.9.8`. `main` remains unchanged. Release remains `NOT READY`. No build, tag or GitHub Release is authorized by this research checkpoint.
