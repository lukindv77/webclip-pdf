# P0-072 — scope correction: reset quarantine must cover detached external effects — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch before this checkpoint: `research/p0-072-recovery-quarantine-2026-09-04 @ 98a843a37e0d05081016bcfdbe1d8c465efbd043`  
Current owner: **P0-072 ACTIVE** — bulk clear/replace cannot treat deletion of checkpoints as cancellation of already admitted non-cancellable external side effects.

This document is a **correction/addendum** to `RESEARCH_P0_072_RECOVERY_QUARANTINE_2026-09-04_EVIDENCE.md`. It does not retract the three-store quarantine work; it retracts only the claim that in-place quarantine of `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves` is sufficient to close the whole P0-072 owner.

No runtime, manifest, registry status or release state is changed by this checkpoint.

## 1. Why the earlier Option A is only a partial solution

Fresh current-source and consolidated-family reconciliation found an admitted remote side-effect checkpoint that does **not** live in any of the three pending stores considered by the earlier design.

`moveReadLaterEntryToRead()` persists these fields on the Journal entry before `POST /resources/move`:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

The source explicitly documents this as the recovery checkpoint written before the destructive remote move so a later worker can reconcile the exact target path after interruption.

However, clear/import authority owns the Journal entry itself. A clear of that URL/site/all or replace-import can therefore delete the `readMove*` checkpoint while the Yandex move is already admitted or in flight. Quarantining only the three pending stores cannot preserve this authority.

This is not a hypothetical extension of P0-072. The consolidated `RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` already records the historical root-cause family: clear/import can overlap external entry mutations, and ReadLater move checkpoint co-location with a replaceable Journal row is an explicit durability problem. Current Registry remains the status authority.

## 2. Current concurrency fence is still narrower than the external-effect surface

Fresh current dispatch confirms `runExclusiveJournalDestructiveMutation()` wraps:

- `WEBCLIP_JOURNAL_CLEAR`;
- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`.

It does **not** wrap:

- `WEBCLIP_JOURNAL_MARK_READ`;
- `WEBCLIP_JOURNAL_DELETE`.

Therefore a bulk reset can still overlap a ReadLater move or Delete→Trash operation. A page-local UI busy flag cannot provide cross-page/worker durability and is not a substitute for a durable operation receipt.

A global in-memory mutex would also be insufficient because MV3 service workers are intentionally short-lived and all recovery authority must survive worker termination.

## 3. Delete→Trash exposes a dependency, not a new P0-072 sub-number

Current `deleteJournalEntry(..., diskAction:'trash')` calls `moveJournalYandexFileToTrash()` and only after the remote move returns does it call `deleteJournalEntryRecordOnly(id)`.

Unlike ReadLater→Upload, the current Trash path does not yet have a durable exact source/target/object checkpoint before `POST /resources/move`.

This is already owned by **P1-183 ACTIVE** in `RESEARCH_REGISTRY.md`: Delete→Trash needs a durable exact source/target/object checkpoint before destructive move so crash/collision target is recoverable without blind second move.

Therefore:

- do **not** create another P-code;
- P0-072 must define how an already admitted Trash receipt survives/detaches from a later clear/import;
- P1-183 remains responsible for creating that pre-move receipt in the first place;
- P0-072 cannot truthfully be declared DONE while an overlapping admitted side-effect class has no reset-independent durable receipt to preserve.

## 4. Revised architecture — hybrid attached + detached receipt model

The earlier in-place quarantine remains the lowest-risk mechanism for existing checkpoint stores whose late-settlement code already reads/writes those rows in place:

- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

For these stores, retain the proposed versioned `journalResetDisposition` and writer fencing. Do not migrate them merely for architectural uniformity.

But entry-co-located or future non-save external effects need **reset-independent durable authority**. The target architecture therefore becomes hybrid:

### Layer A — in-place quarantine for existing pending stores

Matching active rows remain in their current object store and transition atomically to a reset-detached disposition. Late factual settlement can update the row, but the old Journal generation can never be recreated.

### Layer B — detached external-effect receipt authority

External effects whose only current receipt is inside the Journal row, or which need a new pre-effect receipt, use a dedicated durable authority independent of `entries`.

The exact store name/schema is implementation detail, but its contract must support at least:

- stable operation/effect generation id;
- effect kind (`read-move`, future `trash-move`, publication/revocation classes only when their owners require it);
- Journal entry id plus expected Journal generation/revision reference where available;
- exact remote source/target/object/account/root identity fields only as authorized by P0-073/P0-074/P1-090/P1-183;
- phase/outcome (`prepared`, `effect-admitted`, `verified`, `interrupted/failed`, `unknown/manual-resolution`, terminal states as appropriate);
- reset detachment metadata (`resetId`, kind/scope/scopeKey, detachedAt);
- timestamps/attempt counters with bounded size;
- no OAuth token or signed transfer capability.

The Journal entry may keep `readMove*` fields as a UI projection, but physical recovery authority must not depend on that replaceable row after the external effect is admitted.

## 5. Atomic reset rule expands beyond the three pending stores

For clear-all, URL/site clear and import replace, the authoritative IndexedDB transaction must perform all applicable local state transitions atomically:

1. verify reset/import generation/revision preconditions already required by existing owners;
2. identify matching Journal entries and matching pending rows;
3. quarantine matching `pendingAppends`/`pendingDownloads`/`pendingRemoteSaves` in place;
4. detach/retain any matching external-effect receipt independent of the Journal row;
5. only then clear/delete/replace Journal entries;
6. update reset/revision metadata;
7. commit as one transaction.

Any request error, quota/capacity failure or explicit abort must restore the old Journal rows **and** the old receipt/disposition state together. IndexedDB transaction abort is therefore a required proof case, not merely an implementation convenience.

A post-commit copy of `readMove*` fields is invalid because an MV3 worker can terminate after Journal deletion but before the copy.

## 6. Admission ordering invariant

Fresh source gives a useful positive control for existing save/download paths:

- local download intent is durably written before `chrome.downloads.download()`;
- remote save checkpoint is durably written before the actual PDF transfer and before later publication/final Journal append;
- ReadLater move writes `readMove*` before `POST /resources/move`.

This ordering allows a strong rule:

> if a non-cancellable external effect is allowed to start, its durable operation authority must already exist in reset-independent or reset-detachable storage.

Consequently a reset that commits **before** admission may legitimately leave no old receipt, because the old effect must not be allowed to start without writing a new-generation receipt afterwards. A reset that sees an already admitted receipt must preserve/detach it atomically.

This rule should be tested directly. It is stronger and clearer than trying to infer effect timing from worker memory or response timing.

## 7. Capacity and maintenance correction

Quarantine changes queue classification, not merely record decoration.

Current local admission has two classes: active and `unknown`; every non-unknown row consumes active capacity. Current remote admission excludes only `stale-unverified` from active count, so `remote-verified` still consumes active capacity until removed.

After P0-072, at least three logical classes are required across relevant receipt stores:

1. **active/reconciling** — automatic work may still progress;
2. **detached unresolved/manual** — physical truth is unknown or needs explicit/manual reconciliation; must not be silently evicted;
3. **terminal retained** — factual terminal evidence exists and may use a separate bounded retention/compaction policy.

Terminal or manual reset-detached receipts must not masquerade as ordinary active work forever; otherwise a successful safety fix can starve new work by permanently exhausting active capacity.

Conversely, `cleanupStalePendingRemoteSaves()` must not apply its ordinary 30-day/max-100 deletion policy to unresolved reset-detached authority. Release of an expensive Blob/PDF/staging resource is allowed, but deletion of the last uncertainty receipt is a different operation and requires its own bounded evidence policy.

This matches the existing family-level two-tier finding: expensive active resource ownership and compact detached physical truth are distinct lifecycles.

## 8. Recovery scheduling implications

Reset-detached rows must also stop participating in the wrong normal queues:

- detached `pendingAppends` must never replay into the replacement Journal;
- detached local download intents/numeric items may continue exact Chrome settlement while `resolution='reconciling'`, but terminal/manual rows are excluded from ordinary active batches;
- detached remote saves may perform only factual reconciliation allowed by their exact operation identity; they cannot append into the replacement Journal;
- detached ReadLater/Trash move receipts reconcile physical remote state but cannot apply stale patches/deletes to a replacement Journal entry without the separate P0-076 CAS/generation authority.

This preserves owner separation: P0-072 preserves external-effect truth across bulk reset; P0-076 prevents stale old-generation writes from corrupting replacement rows.

## 9. Owner/dependency reconciliation

No new P-code is allocated by this correction.

- **P0-072** — bulk clear/replace detaches/preserves already admitted external-effect authority and never treats receipt deletion as cancellation.
- **P0-076** — old operation completion cannot mutate/delete a replacement Journal generation by id alone.
- **P1-183** — Delete→Trash must create a durable exact source/target/object checkpoint before the remote move.
- **P1-090** — destructive Yandex reconciliation proves the same exact remote object after unknown settlement.
- **P0-073/P0-074** — remote account/root/object and immutable auth/config/operation context remain separate authorities.
- **P1-208/P1-064** — recovery fairness remains separate from P0-072 receipt preservation.
- publication/public-link ownership remains under the existing publication/privacy owners; this correction does not claim their closure.

## 10. External architecture evidence applied

Primary/official inputs checked fresh on 2026-09-04:

- Chrome extension service-worker lifecycle: workers are normally terminated after inactivity and developers are explicitly told to persist state rather than rely on globals. This supports receipt-first, restart-safe operation state.
  - https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome Downloads API: `DownloadItem.id` is persistent across browser sessions and states distinguish `in_progress`, `interrupted`, `complete`. This supports retaining exact numeric DownloadItem settlement after Journal detachment.
  - https://developer.chrome.com/docs/extensions/reference/api/downloads
- IndexedDB 3.0: transaction commit is atomic; abort rolls back all changes. This supports co-locating Journal reset and receipt-detachment transitions in one transaction.
  - https://www.w3.org/TR/IndexedDB/
- Workbox Background Sync: failed work is persisted in IndexedDB and replayed on later service-worker execution; this is useful as a browser-side durability pattern, but WebClip must not copy generic HTTP retry/retention semantics onto non-idempotent file/object history.
  - https://developer.chrome.com/docs/workbox/modules/workbox-background-sync
- Workbox issue #2640 documents queue-order races when replay and new enqueue overlap; it reinforces that durable persistence alone is not enough — queue generation/classification and concurrent writers must also be fenced.
  - https://github.com/GoogleChrome/workbox/issues/2640

Community reports about MV3 losing in-memory state after worker sleep are treated only as anecdotal user/developer experience. They reinforce the practical failure mode but are not architecture authority.

## 11. Revised implementation acceptance

The original 14 acceptance cases remain necessary for the three existing pending stores, with these additions:

15. ReadLater move receipt is durable outside replaceable Journal authority before `resources/move` or is atomically detached before matching Journal deletion.
16. clear-all, scoped clear and import-replace overlapping `readMove` after admission preserve exact effect identity and never recreate/update a replacement Journal row.
17. a reset that commits before effect admission forces the later operation to create authority for the new generation before the side effect can start.
18. P1-183 prerequisite is explicit: Delete→Trash cannot satisfy P0-072 overlap acceptance until its durable pre-move exact receipt exists.
19. once the Trash receipt exists, clear/import detaches it rather than treating entry removal as remote cancellation.
20. active / detached-unresolved / terminal-retained capacity classes are separate and deterministic.
21. generic stale cleanup skips unresolved reset-detached receipts.
22. terminal/manual receipts do not starve active queue capacity.
23. second reset does not rewrite the first unresolved detachment identity.
24. forced IndexedDB abort restores both Journal rows and every in-place/detached receipt transition.
25. P0-076 negative control: late detached move settlement cannot patch/delete an imported replacement row with the same entry id.

Real Yandex account/object semantics remain external evidence and are not proved by synthetic tests in this P0-072 research tranche.

## 12. Decision/status correction

The earlier statement “Option A is sufficient to close the current root cause” is **superseded by this addendum**.

Current architecture direction:

- **retain Option A in-place versioned quarantine for existing pending stores**;
- **add reset-independent/detached durable effect authority for entry-co-located or future external mutations**;
- do not claim P0-072 DONE until all currently admitted external-effect classes can survive/reset-detach under their existing owners and required dependencies.

`P0-072` remains **ACTIVE**. `manifest.json` remains `0.9.8`. `main` remains unchanged. No build/tag/GitHub Release or release-readiness transition is claimed.