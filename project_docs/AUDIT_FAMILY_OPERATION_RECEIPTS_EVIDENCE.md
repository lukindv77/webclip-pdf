# Audit family evidence — Operation receipt / OperationLog / user reconciliation

Family from `AUDIT_DELTA_INDEX.md` section 8.

This document is a **lossless consolidation** of the detailed audit deltas listed below. Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P1-145, P1-197, P1-198, P1-205, P1-210 and durability/maintenance owners.

Retired source count: **15**.

## P-code coverage

P0-030, P0-039, P0-043, P0-044, P0-063, P0-065, P0-069, P0-070, P0-073, P0-074, P0-076, P0-078, P0-079, P1-035, P1-039, P1-040, P1-043, P1-048, P1-052, P1-055, P1-064, P1-066, P1-067, P1-075, P1-090, P1-118, P1-121, P1-124, P1-129, P1-131, P1-146, P1-147, P1-148, P1-156, P1-157, P1-158, P1-161, P1-164, P1-169, P1-171, P1-173, P1-175, P1-178, P1-179, P1-183, P1-184, P1-190, P1-191, P1-192, P1-194, P1-195, P1-196, P1-197, P1-198, P1-201, P1-204, P1-205, P1-206, P1-207, P1-208, P1-210, P1-211, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `AUDIT_DELTA_COMPACT_DETACHED_RECEIPT_RETENTION_2026-08-28.md` | `dc0557f24a409de88b2fb3ccbf2c923a7a8e9d05222322eae4ee6b9380c0e30e` | P0-039, P0-069, P0-076, P0-079, P1-035, P1-043, P1-052, P1-067, P1-156, P1-164, P1-169, P1-184, P1-194, P1-207, P1-211 | Audit delta — compact detached physical receipt retention — 2026-08-28 |
| `AUDIT_DELTA_DURABILITY_CLASS_2026-08-27.md` | `a8674ecacf6ff338b40b4faa340f91f9812605b1e6f0d1e95a1a700e716ca3f5` | P0-039, P1-052, P1-179, P1-192, P1-194, P1-197 | Audit delta — recovery durability class / `recoveryGuaranteed` |
| `AUDIT_DELTA_HISTORICAL_OPERATION_ID_CAPABILITY_BOUNDARY_2026-08-28.md` | `512eb29d8ec675697f69f8491ff069b5a7cdb9c9501e5a0e43fc53f76b68e44c` | P1-148, P1-190, P1-197, P1-198 | Audit delta — historical/imported operationId capability boundary — 2026-08-28 |
| `AUDIT_DELTA_LIVE_OPERATION_ID_PROVENANCE_2026-08-27.md` | `f3a24d60344f70b482980a83e8bdece71f399ca234d4c5d2d61c4a96ef08b87a` | P0-030, P0-079, P1-148, P1-190, P1-195, P1-196, P1-197, P1-198, P2-020 | Audit delta — live operationId provenance / collision — 2026-08-27 |
| `AUDIT_DELTA_MAINTENANCE_PASS_VS_RECOVERY_SETTLEMENT_STATUS_2026-08-28.md` | `0cac34b52198ebaefa30f6e7f8127eb95ad1995d8bc0be575f5fe235485f809e` | P0-039, P1-039, P1-184, P1-192, P1-208, P1-211 | Audit delta — maintenance pass success vs unresolved recovery settlement — 2026-08-28 |
| `AUDIT_DELTA_MAINTENANCE_PHASE_FAIRNESS_2026-08-28.md` | `ab8fa60b527a7d2da25e5bba39dc030a49789551df84c159db11b3e0d0d54b86` | P0-063, P0-065, P1-035, P1-043, P1-064, P1-118, P1-173, P1-192, P1-194, P1-201, P1-208, P1-210, P1-211 | Audit delta — background maintenance cross-phase fairness across MV3 restarts — 2026-08-28 |
| `AUDIT_DELTA_OPERATION_LOG_CLEAR_GENERATION_2026-08-27.md` | `5a1d2ced81f7764b82cdcfe84b01210da98ce21e50c893a6781ece163140baa3` | P0-079, P1-055, P1-148, P1-156, P1-173, P1-190, P1-195, P1-196, P1-197, P2-020 | Audit delta — OperationLog clear/retention generation integrity — 2026-08-27 |
| `AUDIT_DELTA_OPERATION_LOG_CLEAR_POST_SNAPSHOT_WRITER_2026-08-28.md` | `e282632e2baff701db803cc54dd4fe98d5ed5ca41e83ea48c6449f3a1007ec1e` | P1-173, P1-197, P1-198, P1-205, P1-210 | Audit delta — OperationLog clear post-snapshot writer / registry loss — 2026-08-28 |
| `AUDIT_DELTA_OPERATION_LOG_RETENTION_WRITE_LINEARIZATION_2026-08-27.md` | `2cfc62a220ded255ff2be2a917888ed11f7aebb7c43cb5873a7944c544c5ad5e` | P1-039, P1-040, P1-075, P1-121, P1-173, P1-204, P1-205 | Audit delta — OperationLog retention cleanup vs queued writes — 2026-08-27 |
| `AUDIT_DELTA_OPERATION_RECEIPT_DIAGNOSTIC_SEPARATION_2026-08-28.md` | `60b64e3d00637d657e6997847cde3828ba6ad3865ff8c2acc855a1cc79494c06` | P0-039, P1-052, P1-090, P1-148, P1-156, P1-184, P1-190, P1-197, P1-198, P1-205, P1-211 | Audit delta — live operation receipt vs OperationLog diagnostic lifetime — 2026-08-28 |
| `AUDIT_DELTA_OPERATION_RECEIPT_PHYSICAL_ATTEMPT_LINEAGE_2026-08-28.md` | `3af799fd261c55368f45e78180078263ac4dfe8defba4f5481c06c7246e711e1` | P0-073, P0-074, P0-076, P0-078, P0-079, P1-184, P1-197, P1-198, P1-210, P1-211 | Audit delta — operation receipt / cached-content / physical-attempt lineage — 2026-08-28 |
| `AUDIT_DELTA_OPERATION_RECEIPT_TERMINAL_AUTHORITY_2026-08-27.md` | `d12686cb0cac3c4382b2a3c26b4ef1417fc32ac3189a4b4a41ee6f068c9b38a4` | P0-069, P0-070, P0-073, P0-074, P0-078, P1-066, P1-090, P1-129, P1-131, P1-148, P1-156, P1-164, P1-171, P1-183, P1-184, P1-190, P1-195, P1-196, P1-197, P1-198 | Audit delta — OperationLog terminal authority / operation receipt composition — 2026-08-27 |
| `AUDIT_DELTA_PROGRESS_DIAGNOSTIC_RECEIPT_GENERATION_2026-08-28.md` | `e8aca4efe15d2e27d39d7e2a7d857d9e9b537e09c0eb6e7765457e610193c248` | P0-039, P0-070, P0-079, P1-147, P1-157, P1-158, P1-171, P1-175, P1-184, P1-197, P1-198, P1-210, P1-211 | Audit delta — progress / diagnostic receipt and document generation — 2026-08-28 |
| `AUDIT_DELTA_USER_OPERATION_RECONCILIATION_SURFACE_2026-08-28.md` | `6683b6991e9efdf0e8c43c5fae5da2184b8251432934f150e06a60087723b83e` | P0-069, P0-073, P0-074, P0-076, P0-078, P1-090, P1-156, P1-169, P1-183, P1-198, P1-201, P1-206, P1-210 | Audit delta — P1-210 reconciliation surface: Save As prepare + destructive Journal flows — 2026-08-28 |
| `AUDIT_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md` | `9ac2346eedddd62663cb42a64e3a0aab828c2cacab681c6543a73d20934a9e9a` | P0-039, P0-043, P0-044, P0-070, P0-073, P0-074, P0-076, P0-079, P1-048, P1-124, P1-146, P1-161, P1-178, P1-184, P1-191, P1-198, P1-210 | Audit delta — user-operation outer transport loss / durable-state reconciliation — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.
## Retired source: `AUDIT_DELTA_COMPACT_DETACHED_RECEIPT_RETENTION_2026-08-28.md`

SHA-256 of UTF-8 source text: `dc0557f24a409de88b2fb3ccbf2c923a7a8e9d05222322eae4ee6b9380c0e30e`

# Audit delta — compact detached physical receipt retention — 2026-08-28

Source-of-truth `main` immediately before this write: `82a2525134a4695032b8fd6844bde60f8f8237e7`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This final session block consolidates the storage/lifecycle consequence of existing **P0-039** local-download unknown-outcome evidence, **P1-184** remote unknown/object evidence, **P1-052** backup upload evidence, **P1-156** Save As session recovery, **P0-076** detached old-Journal generations, **P1-194** durability class, and **P1-043/P0-079** bounded storage/body ownership.

Fresh source revalidation confirms current cleanup still physically deletes unresolved local-download checkpoints after 24 hours and stale remote-save rows after a 30-day / max-100 archival policy. Earlier audits already classify those deletions as insufficient negative proof. The new implementation-level requirement is to separate **expensive active resources** from **compact unresolved identity tombstones** so that preserving truth does not imply unbounded retention of PDF bodies, selection snapshots, staging chunks or full metadata.

No new root cause is needed.

## Current cleanup proves why a two-tier model is necessary

### Local download

`PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h`.

When an unbound intent exceeds that age, current recovery removes the pending checkpoint and revokes its Blob URL. When a bound `downloadId` no longer resolves and the checkpoint is older than 24 hours, it also removes the checkpoint.

P0-039 already establishes that missing Chrome history + wall clock is not proof that the physical file was never created.

The expensive Blob resource, however, also cannot be pinned forever.

### Remote save

Remote active rows can transition to `stale-unverified`, and `cleanupStalePendingRemoteSaves()` physically removes stale rows after 30 days or when more than 100 are retained.

P1-184 already establishes that `stale-unverified` is unresolved external evidence, not proof of remote absence.

Keeping every stale row in its current full shape indefinitely would conflict with bounded storage goals and future per-attempt generation multiplicity.

### New detached receipts increase the need for explicit compaction

This session added/strengthened requirements for detached receipts when:

- Journal clear/import invalidates old local finalization authority;
- a remote object is already verified/published before Journal replacement;
- multiple backup/remote generations coexist;
- a page disappears while a physical attempt remains unresolved.

Those receipts must survive as truth, but not necessarily in the same rich/expensive representation used during active execution.

## Required two-tier lifecycle

### Tier 1 — active operational receipt

While a physical operation can still progress automatically or needs rich metadata/body ownership, retain the exact active generation with fields needed for safe continuation:

- operation/generation ids;
- exact account/root/document/PDF/download/object identity;
- Journal finalization capability where still current;
- selected metadata/selection snapshot where genuinely required;
- resource/body/staging ownership pointer;
- current phase/attempt counters/deadlines.

Tier 1 participates in hard active caps and resource reservations.

### Tier 2 — compact detached/unresolved tombstone

Once automatic continuation/body retention is no longer justified but external outcome remains unknown or historically relevant, atomically compact to a small immutable evidence record.

Retain only the minimum needed to avoid false claims and to correlate/manual-reconcile later, for example:

- physical generation id / operation receipt reference;
- subsystem/type;
- external stable id (`downloadId`, remote resource id) where known;
- redacted/normalized remote path or requested filename only when necessary;
- account/root namespace receipt where needed;
- strong content digest/byte count when needed to distinguish objects;
- publication observed/unknown flag and public management receipt where applicable;
- original/last observation timestamps;
- terminality class: `unknown`, `verified-detached`, `evidence-evicted`, etc.;
- reason Journal authority was detached/abandoned;
- no large body/blob/chunks.

Selection snapshot/comments/full source URL should not be copied into a tombstone unless they are strictly required for manual reconciliation; privacy/minimization should prefer a stable local receipt pointer/digest.

## Resource release is not evidence deletion

The key invariant is:

`release expensive resource != prove external side effect absent`.

Examples:

- revoke a Blob URL because resumable/source-resource lease ended, but retain compact DownloadItem/intent outcome evidence;
- delete immutable PDF body after no active transfer/retry owner remains, but retain remote transfer/object generation identity when settlement is still unresolved;
- delete import/export staging chunks after owner loss, but retain any separately required external attempt receipt;
- clear old Journal metadata authority while retaining detached remote/public object receipt.

This allows strict storage/memory bounds without lying about physical history.

## Archive pressure must have explicit semantics

Even compact tombstones need a hard bound.

When a retention/count policy must finally evict compact evidence, the product cannot afterwards represent the operation as `did not happen`.

Safe approaches include:

- retain an even smaller aggregate/hashed eviction marker for a bounded horizon;
- record `evidence unavailable/evicted` at the logical owner level when the user next encounters the operation family;
- require explicit user abandonment before discarding the last exact identity for privacy/destructive cases;
- for already terminal/proven outcomes, ordinary retention deletion is allowed because uncertainty no longer exists.

Do not use an expired timestamp as a fabricated negative settlement receipt.

## Different classes need different retention strength

### Local download unknown

Compact identity can usually be much smaller than the original metadata: exact numeric downloadId if known, own-extension/start generation, requested/resolved basename evidence, content digest/size, outcome state and old Journal-generation reference.

### Remote upload/publication unknown

Needs stronger namespace/object/content/publication generation because a later exact Yandex observation may reconcile it. A known public object deserves stronger management retention than a speculative pre-admission intent.

### Backup attempt

Historical unresolved backup can keep generation/account/root/path/content digest/source Journal revision without retaining staged JSON chunks.

### Native Save As

Once browser DownloadItem/session state is authoritatively terminal, PREPARED/STARTED operational keys can be removed after RELEASED/tombstone protection. Unknown STARTED state may need compact session/download identity but not the full export body forever.

### Destructive move/unpublish

Unknown mutation receipts should retain exact source/target/object/publication generation. These are higher-value management evidence than generic diagnostics and must not be pruned by OperationLog retention.

## Durability class remains separate

P1-194 still applies. A compact tombstone committed to ordinary IndexedDB is not magically eviction-proof when persistent storage is unavailable.

Status wording should distinguish:

- durable commit under current storage class;
- best-effort recovery evidence;
- browser persistence granted/not granted;
- evidence intentionally compacted/evicted.

Storage quota reservation P1-043 and durability P1-194 are independent dimensions.

## Clear/import semantics

Bulk Journal clear/import should atomically revoke old Journal commit capabilities and transition relevant physical receipts into detached form where appropriate.

It should not copy huge old metadata into a permanent archive merely to preserve truth. The compact generation record is the preferred boundary.

If no external side effect was ever admitted and this is authoritatively proven, no tombstone is required solely because an old Journal draft existed.

## Required regressions

1. Local unknown download crosses 24h -> expensive Blob may be released by policy, but compact unknown receipt survives; state is not converted to proven failure.
2. Chrome history is cleared after physical download -> compact receipt still records unresolved/known identity without retaining full PDF body.
3. Remote stale-unverified crosses 30d/full archive -> compaction/eviction policy never logs `upload did not happen` solely from age.
4. Remote verified-public object detached by Journal import -> compact object/publication receipt survives after rich selection/PDF metadata is reclaimed.
5. Backup unresolved generation releases staged JSON chunks while keeping account/root/path/digest/source-revision identity.
6. Save As STARTED unknown after page/worker loss retains compact S/D generation identity after export body resource lease ends.
7. Unknown destructive move retains exact source/target/resource identity even if OperationLog history is cleared.
8. Compact tombstones count toward explicit small archive caps, but not active transfer/download admission slots unless policy intentionally reserves capacity.
9. Terminal proven failure/no-side-effect may be pruned normally after retention because negative settlement is authoritative.
10. Terminal proven success with Journal finalization complete may be pruned according to ordinary product retention, except publication management references still required by P0-069/P1-164.
11. Evidence eviction under hard cap is represented as `evidence unavailable/evicted`, never as `operation absent`.
12. No tombstone contains access tokens, signed URLs, full filesystem paths or unnecessary comments/selection text.
13. `navigator.storage.persisted() === false` keeps recovery guarantee wording best-effort despite successful compact-record commit.
14. Low-quota cleanup can reclaim disposable bodies/staging first without deleting active/compact irreversible-side-effect evidence merely to admit a new optional operation.
15. Multiple generations for one logical save compact independently and cannot overwrite each other's identity.
16. Normal healthy operations settle and clean up without accumulating unnecessary tombstones forever.

## Duplicate check

No new item is created.

- **P0-039** owns local unknown-outcome evidence.
- **P1-184** owns remote attempt/object/content evidence and stale-unverified truth.
- **P1-052/P1-207** own backup attempt settlement/source revision.
- **P1-156/P1-169** own Save As state/tombstone lifecycle.
- **P0-076** owns Journal-generation detachment.
- **P1-194** owns truthful durability class.
- **P1-043/P0-079/P1-035/P1-067** own quota/body/staging/resource bounds.
- **P0-069/P1-164** require stronger retention of published-object management truth.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No runtime/manifest/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_DURABILITY_CLASS_2026-08-27.md`

SHA-256 of UTF-8 source text: `a8674ecacf6ff338b40b4faa340f91f9812605b1e6f0d1e95a1a700e716ca3f5`

# Audit delta — recovery durability class / `recoveryGuaranteed`

Date: 2026-08-27
Source `main` HEAD audited before this write: `015ab086da90202cbb05970eb1ab85c57afa5bed`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P1-194 OPEN** and makes its acceptance criteria system-wide rather than local to one checkpoint helper.

P1-194 root cause: an ordinary successful IndexedDB commit is currently treated as if it proves the recovery class required by the product semantics. WebClip can therefore report `recoveryGuaranteed: true` although the browser has not proven persisted/non-evictable storage for that checkpoint.

## Fresh proof

### 1. Storage health knows `navigator.storage.persisted()`, save admission does not use it

`getStorageHealth()` queries `navigator.storage.persisted()` and exposes `persisted` / `persistenceStatusSupported`, but that information is health/status telemetry only.

`ensureStorageBudget()` gates large writes using `navigator.storage.estimate()` and a free-space reserve. It does not establish that the IndexedDB origin belongs to a durability/eviction class sufficient for the later `recoveryGuaranteed` promise.

Therefore: quota availability != persistence guarantee.

### 2. Durable-checkpoint append helper returns `recoveryGuaranteed:true` from ordinary IDB state

`appendJournalEntryFromDurableCheckpoint()`:

- returns `recoveryGuaranteed: false` when the required checkpoint was intentionally removed by concurrent clear/import;
- returns `recoveryGuaranteed: true` after a successful journal append;
- and, critically, also returns `recoveryGuaranteed: true` after append failure merely because the existing IndexedDB checkpoint remains for automatic retry.

No persistence-class proof is performed before that stronger promise is emitted.

This affects both local-download and Yandex-save recovery because both use `pendingDownloads` / `pendingRemoteSaves` as the durable source checkpoint before irreversible external side effects.

### 3. Generic pending append has the same semantic overclaim

The generic metadata append path uses a `checkpointed` boolean after writing an IndexedDB pending record and maps `checkpointed => recoveryGuaranteed` even if the final journal append fails.

So the problem is not a single UI string or one Yandex helper; it is a shared recovery contract.

## Why this matters

The product correctly separates irreversible external side effects from local finalization by creating recovery evidence first. But the value of that evidence depends on its durability class. If Chrome later evicts ordinary origin storage under pressure, a physically successful download/upload can remain without journal metadata even though the user/OperationLog was previously told recovery was guaranteed.

The current term `recoveryGuaranteed` is therefore stronger than the evidence supports.

## Required acceptance criteria for P1-194

1. Define explicit recovery durability states instead of a boolean that conflates them. At minimum distinguish something equivalent to:
   - `checkpoint-present-best-effort`;
   - `checkpoint-persisted/guaranteed` only when the required browser persistence property is actually proven;
   - `checkpoint-missing/cancelled`.
2. Do not emit `recoveryGuaranteed:true` solely because an IndexedDB transaction committed.
3. Irreversible side-effect admission must explicitly decide what to do when persistent storage is unsupported, denied, unknown, or not granted. The decision must be product-defined and truthfully surfaced; quota-free-space alone is insufficient.
4. If the product intentionally allows best-effort recovery on ordinary IDB, UI/OperationLog must say exactly that and must not call it guaranteed.
5. Local download, Yandex upload/publish, generic pending append, pending remote save and any future checkpoint-bearing irreversible flow must use the same durability vocabulary.
6. Tests must cover:
   - `persisted() === true`;
   - `persisted() === false`;
   - API unavailable/throws/times out;
   - successful IDB checkpoint + failed final journal append;
   - physically successful external side effect followed by simulated checkpoint eviction;
   - clear/import cancellation remains distinguishable from storage-loss/eviction.
7. P0-039 remains independent: even a best-effort checkpoint must not be deliberately TTL-dropped merely because negative settlement cannot be proven.

## Duplicate check

- Not P0-039: that item is about destroying the only unknown-outcome recovery evidence after 24h / inadequate negative proof.
- Not P1-052: that item is backup prepared-checkpoint settlement/404 handling.
- Not P1-179/P1-192: those concern backup namespace/scheduler/MV3 lifetime.
- Not P1-194 duplicate: this is direct fresh proof of the existing P1-194 root cause and therefore expands that item rather than creating P1-197.

## Registry consequence

P1-194 stays **OPEN** and should be interpreted as a shared recovery-durability contract. No P1-197 assigned.

## Retired source: `AUDIT_DELTA_HISTORICAL_OPERATION_ID_CAPABILITY_BOUNDARY_2026-08-28.md`

SHA-256 of UTF-8 source text: `512eb29d8ec675697f69f8491ff069b5a7cdb9c9501e5a0e43fc53f76b68e44c`

# Audit delta — historical/imported operationId capability boundary — 2026-08-28

Source-of-truth `main` immediately before this write: `1ae37cb240776e9d6fbd0fd1952df39045bd1e04`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh audit clarifies the boundary between **P1-190** (imported/historical OperationLog provenance) and **P1-198** (worker-issued live operation/terminal receipt), with **P1-197** history epoch and **P1-148** Journal-to-log linkage as dependencies.

The important result is two-sided:

1. current imported `operationId` is still trusted enough to resolve a **live current-installation diagnostic record by text**, so P1-190 remains open;
2. no fresh source path was found where an imported Journal entry's operationId is directly fed into `WEBCLIP_OPERATION_LOG_FINISH` / destructive remote control solely by opening that entry, so the current evidence does **not** justify reclassifying P1-190 as a P0 destructive authority issue.

## Fresh source proof

### 1. Import preserves syntactically valid textual operationId

`normalizeImportedJournalEntry()` still accepts `raw.operationId` when it fits length and `[A-Za-z0-9._:-]+` syntax, then stores that text on the imported Journal entry.

No installation namespace, history epoch, locally-issued operation nonce or `imported-unverified` receipt accompanies the text.

### 2. Journal uses that exact text for current OperationLog lookup

The Journal operation-log affordance obtains the entry's `exactOperationId` and sends:

`{ type:'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId }`.

The worker handler simply calls:

`getOperationLog(String(message.operationId || ''))`.

Therefore a backup/import can contain textual X that happens to equal a current installation's real operation X. Clicking “Показать лог” can display that unrelated current record as though it were provenance for the imported entry.

This is exactly P1-190/P1-148 forensic linkage corruption.

### 3. Read access is not the same as live operation ownership

Fresh Journal flow inspection did not find a path where merely rendering/selecting an imported entry sends its stored `operationId` to `WEBCLIP_OPERATION_LOG_FINISH` or uses it as a remote/download mutation receipt.

The visible cancellation paths that do call `WEBCLIP_OPERATION_LOG_FINISH` are staged **current operations** such as:

- local Journal import preview cancellation;
- Yandex backup restore preview cancellation.

Those functions use the operationId created/carried for that current operation flow, not `entry.operationId` from an imported Journal row.

This is a useful current boundary and should be preserved.

### 4. Terminal API itself remains text-addressed

`WEBCLIP_OPERATION_LOG_FINISH` currently accepts textual `message.operationId`, status and summary, then calls `finishOperationLog()` by that text alone.

Thus P1-198 remains independently open even though imported entry IDs do not currently reach it automatically. A stale/reloaded extension page or two live operations with colliding textual ids can still terminate/misclassify the wrong diagnostic generation.

The fix must be receipt-based at the terminal API rather than relying on every current caller voluntarily choosing the right text.

### 5. Progress correlation has the same live-vs-history distinction

Current progress/UI correlation also uses operationId text, but imported Journal history does not automatically register itself as an active page progress owner.

The progress-generation audit already requires P1-198 worker receipt + exact document generation for live operations. An imported historical id must never be allowed to satisfy that live receipt merely because the display string matches.

## Required provenance model

### Historical operation reference

Imported/exported Journal records may retain a human-visible historical operation label for diagnostics/roundtrip, for example:

- `sourceOperationId`;
- source installation/schema metadata if available;
- provenance class `imported-history` / `legacy-history`.

That reference is **not** a current OperationLog key or live capability.

### Local live operation receipt

A current entry may activate “Показать лог” as exact provenance only when it stores a locally issued receipt that binds:

- current/local installation namespace;
- P1-197 OperationLog history epoch;
- P1-198 operation nonce/generation;
- operation kind;
- source owner/document generation where applicable.

The display operationId may remain copied/exported separately.

### Imported UI behavior

For imported-unverified historical ids:

- do not automatically query current live OperationLog by textual id;
- display the historical id as inert metadata if useful;
- optionally offer “current log with same text exists” only as explicitly **unverified coincidence**, not as source provenance;
- never expose finish/cancel/retry/control affordances from a historical reference.

### Terminal/control APIs require receipts regardless of UI source

P1-198 must make `WEBCLIP_OPERATION_LOG_FINISH` and any future status/cancel/reconcile control require an exact live receipt/generation. Fixing the imported UI alone is insufficient because stale live extension pages can also carry obsolete textual ids.

### History clear composes with local receipts

P1-197 clear/retention epoch must invalidate old diagnostic writers/links without deleting the independent physical-operation recovery receipt. A Journal entry may truthfully say its historical log was cleared while its local/remote physical save remains valid.

## Deterministic regressions

1. Import entry E with operationId X while current installation already has unrelated live/completed log X -> E does not present X as proven source log.
2. Imported X remains visible as historical metadata if product keeps it, but no current log content is automatically attached as provenance.
3. Imported X cannot activate `WEBCLIP_OPERATION_LOG_FINISH`, progress ownership, retry or physical recovery control.
4. Current locally created entry with exact local operation receipt still opens its correct log.
5. Current log is cleared; entry retains physical save truth but diagnostic link reports history unavailable rather than attaching a later reused textual X.
6. New operation after clear reuses display X under new epoch/receipt -> imported/old entry cannot attach to it.
7. Two current live operations deliberately use same proposed display X -> P1-198 gives distinct receipts or rejects collision; Journal links remain distinct.
8. Delayed current-page cancel with stale receipt cannot finish a newer operation that reused display X.
9. Imported backup from same machine but older history epoch is still historical unless an explicit trusted export receipt proves otherwise.
10. OperationLog export/import text does not recreate terminal/control authority.
11. Progress messages require current live operation/document receipt; imported textual X cannot pass current correlation.
12. Physical Yandex/download checkpoint recovery never depends on imported OperationLog linkage as correctness authority.

## Negative finding / risk boundary

This audit found **no fresh evidence** that imported `operationId` alone currently drives a destructive Yandex mutation, local file deletion/download, or automatic terminal log mutation when the imported entry is merely viewed.

Do not overstate P1-190 as a remote-data authority defect without a separate admissible source path. Its confirmed impact remains provenance/forensic UI integrity, while P1-198 independently owns live terminal/control identity.

## Numbering result

No new item. **P1-190** remains imported/history provenance, **P1-198** remains live operation/terminal receipt, **P1-197** history epoch and **P1-148** exact Journal linkage compose.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_LIVE_OPERATION_ID_PROVENANCE_2026-08-27.md`

SHA-256 of UTF-8 source text: `f3a24d60344f70b482980a83e8bdece71f399ca234d4c5d2d61c4a96ef08b87a`

# Audit delta — live operationId provenance / collision — 2026-08-27

Baseline HEAD before this audit block: `73cccba395cfe2760162016c225bbd110f2118a0`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-198 — live content caller chooses OperationLog identity

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

This root cause is distinct from:

- `P0-030`: content payload schema/size/tab-URL validation;
- `P1-148`: storing an operationId on a live Journal entry and opening the exact textual log id;
- `P1-190`: imported/foreign operationId provenance;
- `P1-197`: OperationLog history epoch around administrative clear/retention.

The missing invariant is **live operation identity issuance/ownership**: a content caller currently chooses the textual key used as the authoritative identity of a new OperationLog operation.

## Exact runtime proof

### 1. Content message handlers accept caller-provided operationId

Content-allowed save/retry handlers pass `message.operationId` through `normalizeOperationIdInput()` into worker operations:

- `WEBCLIP_GENERATE_PDF`;
- `WEBCLIP_SEND_PDF_TO_YANDEX`;
- `WEBCLIP_RETRY_PDF_TO_YANDEX`;
- `WEBCLIP_DOWNLOAD_CACHED_PDF`.

`normalizeOperationIdInput()` validates only:

- non-empty optional string;
- maximum length;
- `[A-Za-z0-9._:-]+` syntax.

It does not prove the id was issued by this service worker, is unused, belongs to this sender tab/document, or belongs to this operation kind/generation.

Current normal `content.js` generates a random UUID, so ordinary collision probability is negligible. But the project trust model already treats content-side payloads as untrusted at the worker boundary (`P0-030`); correctness/security therefore cannot depend on a caller voluntarily choosing a fresh random key.

### 2. Existing log key is silently reused rather than rejected

`startOperationLog(operationId, type, title, meta)` queues by the supplied textual id and mutates whichever record already has that key.

On an existing record it:

- sets/replaces `type`;
- sets/replaces `title`/description;
- sets `status = 'running'`;
- merges new meta into existing meta;
- preserves/continues the existing event history.

There is no `operation already exists` fail-closed check and no immutable operation-generation owner stored with the log.

Therefore a second live operation using textual id X does not create a separate operation — it joins/rewrites X.

### 3. Terminal status can belong to the wrong physical operation

After two physical operations share X, whichever calls `finishOperationLog(X, ...)` can mark the shared log success/error while the other operation is still running or later append more events.

The resulting timeline/status is not a truthful history of either operation. Per-id Promise serialization prevents transaction races but does not provide ownership isolation.

### 4. P1-148 exact Journal linkage becomes semantically false

Live Journal entries store the supplied operationId as their exact source operation link.

If two live operations collide on X, both entries/checkpoints can legitimately persist X. `Показать лог` then resolves both to the same merged/mutated record even though the physical save operations were different.

Thus syntactic exactness of `operationId` is not sufficient provenance.

### 5. P1-197 history epoch is necessary but not sufficient

A durable OperationLog history epoch prevents **old-generation writers after clear** from resurrecting history. It does not distinguish two live operations admitted in the same history epoch that intentionally reuse the same textual id.

P1-198 therefore needs a per-operation locally issued receipt/nonce orthogonal to the global history epoch.

### 6. Progress identity is also textual

Multiple progress/timeline paths carry only operationId as the correlation token. A collision can cause consumers that accept a matching id to associate stages with the wrong physical operation.

This pass did not find operationId itself used as the primary key of destructive Yandex/local checkpoints, so the confirmed classification remains P1 forensic/progress/provenance integrity rather than P0 remote-data authority.

## Required P1-198 contract

### Worker-issued operation receipt

For privileged/live operations originating from content, the service worker must own identity issuance.

Acceptable shapes include:

- caller requests `begin operation` and receives a cryptographically random worker-issued receipt bound to sender tab/document + operation kind + generation; or
- first privileged message carries a caller correlation label but worker creates a distinct authoritative operation key/nonce and returns it.

Do not use an untrusted content string directly as the authoritative OperationLog/checkpoint provenance key.

### Immutable ownership

A live receipt must bind at least:

- local installation/history namespace as required by P1-197;
- unique operation nonce/generation;
- admitted operation type/kind;
- source tab and exact document/navigation generation where applicable;
- optional caller correlation/display id separately from authoritative identity.

Starting another physical operation with an already-owned receipt must fail closed or explicitly resume the exact same idempotent operation state; it must never silently rewrite the existing log header/type/meta.

### Journal linkage

P1-148 should link a new Journal entry to the exact worker-issued live operation receipt. The human-readable operationId may remain visible/exportable, but the trusted linkage must include the local provenance/namespace needed to distinguish collisions and imports.

Imported historical ids remain P1-190 `imported-unverified` and cannot become live receipts.

### OperationLog writer key

Combine the P1-197 history epoch with the P1-198 operation nonce/generation. A robust conceptual identity is:

`(historyEpoch, operationNonce)`

with a separate display/correlation id if desired.

Do not key authorization solely by a textual id supplied across the content trust boundary.

## Required deterministic regressions

1. Content caller proposes operationId X that already belongs to completed operation A: B cannot reopen/rewrite A as `running`.
2. A and B deliberately propose the same textual X: they receive distinct authoritative receipts/logs or B is explicitly rejected.
3. A remains running while B finishes: B cannot mark A's log terminal.
4. Two Journal entries from A/B cannot both link to one merged log merely because caller strings collide.
5. A stale/imported `operationId` equal to a current local display id cannot acquire the current live receipt/namespace.
6. Administrative clear advances P1-197 history epoch; late old receipt remains invalid even if its display id is reused by a new operation.
7. Exact document navigation invalidates a content operation receipt where the operation requires current-document authority.
8. Normal current content flow still gets a stable operation id/receipt usable by progress UI, recovery diagnostics and Journal `Показать лог`.

## Classification / numbering

- New evidence-reserved `P1-198` assigned by this audit block.
- `P0-079` remains evidence-reserved and separate (PDF byte-cache operation ownership).
- Existing evidence-reserved `P1-195`, `P1-196`, `P1-197` remain separate.
- `P2-020` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `AUDIT_DELTA_MAINTENANCE_PASS_VS_RECOVERY_SETTLEMENT_STATUS_2026-08-28.md`

SHA-256 of UTF-8 source text: `0cac34b52198ebaefa30f6e7f8127eb95ad1995d8bc0be575f5fe235485f809e`

# Audit delta — maintenance pass success vs unresolved recovery settlement — 2026-08-28

Source-of-truth `main` immediately before this write: `2e2cf32ff1bd5ffad52c611c8dc7a5104b7eef71`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-039** unified logged background maintenance and composes with **P1-208** remote-recovery fairness/status, **P1-192** durable background progress, and physical recovery owners such as P0-039/P1-184.

The current maintenance log correctly records detailed nested recovery counters, but its top-level terminal `success/partial` classification does not distinguish **“this maintenance pass executed without an internal error”** from **“all recovery work is settled.”** A pass can be marked success while durable physical work remains pending/deferred/auth-blocked.

No new root cause is needed; this is diagnostics/status truthfulness for the unified maintenance operation.

## Current top-level classification

After cleanup and recovery stages, `runLoggedOperationLogCleanup()` computes:

`maintenancePartial = Boolean(maintenanceErrors.length || journalRecovery.failed || remoteSaves?.failed || remoteSaves?.error || localDownloads?.failed || localDownloads?.error || statsRepair?.error)`.

It then records terminal stage:

- `partial` when `maintenancePartial` is true;
- otherwise `success`.

The result data does include the full nested objects `journalRecovery`, `remoteSaves`, `localDownloads`, `statsRepair`, so detailed evidence is not lost.

## Remote recovery has legitimate non-error unresolved outcomes

`recoverPendingRemoteSaves()` returns fields including:

- `pending`;
- `stalePending`;
- `recovered`;
- `verified`;
- `deferred`;
- `failed`;
- `stale`;
- `cancelled`;
- `authRequired`.

Several of these can truthfully describe unfinished physical work without being an internal function error.

For example:

- no usable auth -> items remain deferred/pending and `authRequired=true`;
- batch/deadline/fairness limit -> work remains pending/deferred for another wake;
- stale-unverified evidence remains intentionally unresolved;
- a verified remote generation may still require local finalization in a later fair slice.

Current `maintenancePartial` ignores `remoteSaves.pending`, `stalePending`, `deferred`, and `authRequired` unless some separate `failed/error` flag is also set.

## Local recovery likewise may remain pending without an error

`reconcilePendingLocalDownloads()` can successfully execute a bounded pass while DownloadItems remain in progress/paused/unknown. Its result includes `pending`.

That is not a failed maintenance invocation. But it also is not proof that the local recovery subsystem is settled.

Therefore one boolean `success` should not be interpreted as both meanings.

## Deterministic misleading-status schedule

1. There is one unresolved remote-save generation requiring Yandex auth.
2. User is currently disconnected; recovery correctly refuses remote mutation and leaves the generation durable/deferred.
3. Hourly maintenance runs every stage successfully: no IndexedDB/API/internal error occurs.
4. `remoteSaves.failed=0`, no `remoteSaves.error`, while `pending>0`, `deferred>0`, `authRequired=true`.
5. `maintenancePartial` remains false if other stages also have no errors.
6. OperationLog terminal status becomes `success`.
7. A reader of only operation header/status can reasonably infer “background recovery succeeded/completed,” even though a physical operation remains unresolved and requires auth/future reconciliation.

The nested data can explain the truth, but the top-level status vocabulary does not.

## This is not an argument to mark every pending item as `error`

Pending/deferred work is often expected and correctly preserved:

- active Chrome download may still be progressing;
- auth may legitimately be unavailable;
- fair batch/deadline intentionally stops after bounded work;
- stale-unverified evidence is deliberately non-terminal.

Treating these as errors would create noisy false failures.

The correct model separates **pass execution outcome** from **recovery convergence state**.

## Required status model

At minimum expose distinct fields/concepts such as:

### Maintenance pass execution

- `success` — all scheduled stages executed within their contract, no internal stage error;
- `partial/error` — one or more stages failed to execute/inspect/update correctly.

### Recovery convergence

- `settled` — no known active/unresolved work in the relevant classes after this pass;
- `pending` — work remains but is expected/in progress;
- `deferred` — work remains due to budget/fairness/auth/current policy;
- `needs-auth` / `manual` where useful;
- `stale-unverified` — unresolved evidence archived, not failure or absence.

OperationLog UI/export can retain top-level execution status while clearly exposing a secondary recovery-state badge/summary. Alternatively `partial` may be used for unresolved recovery only if product semantics explicitly define it that way, but do not conflate expected pending work with stage errors.

## Terminal message wording

Current message says `Фоновое обслуживание завершено` and lists recovered/deleted counts. This is accurate for the **pass**.

When unresolved work remains, append an explicit bounded summary such as:

- pending local downloads count;
- active/deferred remote saves count;
- stale-unverified count;
- auth required indicator;
- pending Journal recovery count.

Do not say or imply that physical reconciliation itself is complete merely because this invocation reached its final line.

## Scheduler/fairness composition

P1-192/P1-208 determine when pending work receives another opportunity.

Status truthfulness should consume those results:

- a fair slice ending with remaining work is successful pass + pending recovery;
- worker death before durable progress is not a successful pass;
- auth-blocked queue remains pending/needs-auth and must not reset retry/evidence state;
- a future successful pass can transition convergence state independently from prior log history.

## User-facing health/recovery surfaces

The reconciliation-discovery delta requires fresh pages to discover unresolved physical work. Maintenance status can feed an aggregate health indicator, but **aggregate success cannot substitute for exact physical receipts**.

A count `pending=2` explains health; exact retry/reconcile authority still comes from the two durable generations.

## Required regressions

1. Remote auth unavailable, one pending item -> maintenance stage execution succeeds; result explicitly says recovery pending/needs-auth, not settled.
2. Remote batch budget processes some rows and leaves others -> pass succeeds + remaining count/deferred state is visible.
3. One local DownloadItem still in progress -> pass succeeds + local pending count remains explicit.
4. No unresolved work and no errors -> pass success + recovery settled.
5. Stage throws -> pass partial/error regardless of whether other queues happen to be empty.
6. Stale-unverified remote evidence exists -> status does not call it settled/absent merely because active count is zero.
7. Pending Journal append remains after bounded pass -> convergence state reflects pending.
8. OperationLog list/header summary cannot show only an unqualified green success if detailed record says auth-required unresolved work, unless UI clearly labels success as “pass executed” and separately shows recovery state.
9. Repeated maintenance with pending work updates current health without rewriting historical physical receipts.
10. OperationLog clear removes diagnostic history but durable recovery discovery remains available independently.
11. Fair-scheduler cursor P1-192 may advance after a successful slice even though convergence state remains pending.
12. Normal no-work hourly maintenance remains concise and successful; no noisy false-error status is introduced.

## Duplicate check

- **P1-039** primary: unified logged maintenance operation and truthful stage/result presentation.
- **P1-208** remote queue fairness/status semantics.
- **P1-192** cross-wake durable progress/fair scheduling.
- **P0-039/P1-184** retain physical unresolved-outcome truth; diagnostics never replace them.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No runtime/manifest/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_MAINTENANCE_PHASE_FAIRNESS_2026-08-28.md`

SHA-256 of UTF-8 source text: `ab8fa60b527a7d2da25e5bba39dc030a49789551df84c159db11b3e0d0d54b86`

# Audit delta — background maintenance cross-phase fairness across MV3 restarts — 2026-08-28

Source-of-truth `main` immediately before this write: `6c22aa32f4a651c2b64b2a0b7d182a7c63013551`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-192 — MV3 background lifecycle / durable progress**. It composes with queue-local fairness items but is not a duplicate of them:

- **P1-064** — fairness inside local-download recovery;
- **P1-208** — phase/status fairness inside `pendingRemoteSaves` recovery;
- **P1-173** — admission bounds for serialized actual-settlement queues;
- **P1-035/P1-043** — active staging cleanup and storage-budget/reservation lifecycle;
- **P1-194** — truthful durability class of recovery evidence.

The newly explicit manifestation is **fairness between maintenance phases when MV3 repeatedly terminates the worker before the fixed-order pipeline reaches later phases**.

No P1-211 is allocated.

## Fresh runtime proof — maintenance phases have a fixed restart-from-the-front order

`runLoggedOperationLogCleanup(trigger)` executes the main recovery phases in a fixed sequence after cleanup work:

1. `recoverPendingJournalAppends(trigger)`;
2. `recoverPendingRemoteSaves(trigger)`;
3. `reconcilePendingLocalDownloads(trigger)`;
4. `ensureJournalStatsHealthy(...)`.

`runStage()` catches an ordinary stage exception and allows the next phase to continue, which is a useful positive control. But a **service-worker process termination** is not an ordinary caught exception. The current worker disappears and the whole function is lost.

On the next hourly maintenance wake, the new worker starts the same pipeline again from phase 1. No durable maintenance phase cursor/generation records that phases 1/2 were already given their opportunity while phases 3/4 were skipped by worker death.

## Remote recovery can legitimately consume the MV3 lifetime before local recovery is reached

`recoverPendingRemoteSaves()` itself is bounded, but its bounded deadline is large relative to an MV3 worker lifetime:

- queue batch is capped at 6;
- function deadline is `Date.now() + 120_000`;
- individual exact Yandex reads/reconciliation waits may consume multiple bounded network attempts within that window.

This is correct from a network-hang perspective: one remote pass is not infinite. It is not sufficient for **cross-phase progress** under MV3 termination.

A legal schedule is:

1. hourly maintenance wake starts;
2. journal recovery finishes;
3. remote recovery begins and performs real bounded work for >30 s;
4. MV3 terminates the worker before local-download recovery begins;
5. next hourly alarm wakes a new worker;
6. pipeline again starts at journal recovery, then remote recovery;
7. a persistent remote backlog again consumes the available worker lifetime;
8. later local-download and stats-repair phases are repeatedly never entered.

No individual function is unbounded, yet the composed scheduler can starve later durable queues indefinitely.

This is the concrete cross-phase case already anticipated by P1-192's requirement that repeated maintenance either finish under lifecycle ownership or make durable resumable progress across wakes.

## Why P1-064 and P1-208 do not solve this

P1-064 ensures that, **when local-download recovery runs**, paused/slow old DownloadItems do not permanently hide later complete/interrupted items.

P1-208 ensures that, **when remote recovery runs**, an auth-blocked/old prefix does not permanently hide later `remote-verified` rows that need cheap local finalization.

Neither guarantees that the scheduler ever enters the local phase or stats phase after repeated worker restarts.

Therefore implementing queue-local rotation without P1-192 phase progress can still leave an entire later queue starved.

## Required P1-192 refinement — durable phase progress or bounded fair slices

A maintenance wake needs a contract that guarantees bounded progress across subsystems, not only boundedness inside each subsystem.

Acceptable implementation families include:

### Durable phase cursor/generation

Persist a small extension-owned maintenance receipt containing the current maintenance generation and next phase. Before/after each phase commit enough state that a crash causes the next wake to resume from an appropriate later phase rather than always restarting from phase 1.

The cursor must be generation-safe: a stale old worker cannot move a newer maintenance generation backward or mark a phase complete after newer work superseded it.

### Round-robin slices per wake

Instead of one long fixed pipeline, give each durable queue a deliberately small time/API slice in a round-robin order and persist the next starting phase. A phase with more work remains pending for a later wake but cannot monopolize every wake.

### Explicit lifecycle owner + watchdog

If an execution context can legitimately keep the full maintenance operation alive, P1-192 may run the composed pass under that owner, while retaining the durable watchdog required for crash recovery. The owner must not hide hangs; existing phase deadlines remain mandatory.

The implementation may combine these approaches.

## Required invariants

1. Every active maintenance subsystem receives a reconciliation opportunity within a bounded number of durable wakes, even if an earlier subsystem has a permanent backlog.
2. Worker termination during phase N does not erase the fact that later phases still need service.
3. Phase-progress metadata is tiny, bounded and durable across worker restart; do not persist large queue snapshots.
4. A stale worker/late storage mutation cannot rewind the current maintenance generation or clear a newer wake schedule.
5. P1-064/P1-208 queue-local fairness remains intact inside each selected phase.
6. A failed/auth-blocked remote phase cannot make local-download terminal checkpoints or Journal stats repair wait indefinitely.
7. A large local-download queue cannot permanently suppress stats repair once the scheduler order is made fair.
8. No fairness mechanism deletes recovery evidence or converts `unknown` into failure merely to advance the cursor.
9. Network/IDB/API budgets remain bounded and maintenance cannot spin continuously after pressure.
10. Alarm scheduling remains crash-safe under P1-118/P1-192; a cursor without a durable future wake is not recovery.

## Deterministic regressions

1. Remote recovery is forced to consume/await >30 s on every invocation; simulate worker termination before local phase. Across successive wakes, local-download recovery still runs within a bounded number of wakes.
2. Same setup with pending Journal stats repair: stats repair is eventually entered despite persistent remote backlog.
3. Crash after durable phase advance but before next phase begins: next wake resumes without permanently skipping the unstarted phase.
4. Crash after phase side effects settle but before cursor update: replay/reconciliation is idempotent and does not duplicate non-idempotent external side effects.
5. Old worker cursor write settles after a new worker advanced generation: stale write is rejected/ignored.
6. P1-208 case: six auth-blocked PREPARED remote rows plus a later `remote-verified` row still receive internal remote fairness when the remote phase runs.
7. P1-064 case: 12 old in-progress local downloads plus a later complete row still receive local queue fairness when local phase runs.
8. Repeated failures in one phase are logged/retained as partial state but do not reset phase rotation to the front indefinitely.
9. No pending work: maintenance converges to idle and does not create unnecessary high-frequency wake loops.
10. Browser/profile restart preserves enough maintenance scheduling state to resume safely without treating a lost worker as successful completion.

## Capacity / reservation observations from the same block

No new resource-admission item was found.

Fresh revalidation preserves existing owners:

- offscreen signed transfers already reserve global count/bytes **before** materialization and hold reservation until actual transfer settlement — positive P0-063 control;
- Blob URL creation still needs pre-materialization reservation under **P0-065**;
- `ensureStorageBudget()` still relies on a point-in-time storage estimate rather than a concurrent-writer reservation, already captured by **P1-043** refinement in the 2026-08-28 multi-block delta;
- quota-pressure cleanup must respect live staging/recovery owner/lease generations under **P1-035/P1-043**;
- Promise-turn growth behind hung serialized barriers remains **P1-173**.

A generic new "global capacity" P-item would duplicate those contracts rather than identify an independent root cause.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

Primary owner: **P1-192**.

Composed dependencies: **P1-064, P1-208, P1-173, P1-035, P1-043, P1-118, P1-194**.

P1-201…P1-210 remain occupied and **P1-211 remains unassigned by this block**.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_OPERATION_LOG_CLEAR_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `5a1d2ced81f7764b82cdcfe84b01210da98ce21e50c893a6781ece163140baa3`

# Audit delta — OperationLog clear/retention generation integrity — 2026-08-27

Baseline HEAD before this audit block: `a276db4b8a68400b03ea97c25074f9e19b50f735`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## New confirmed item: P1-197 — OperationLog administrative deletion lacks a generation barrier

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit. This delta assigns `P1-197` because the root cause is independent from existing `P1-055` (size/retention bounds), `P1-148` (entry→OperationLog linkage/provenance) and `P1-173` (unbounded actual-settlement queue turns). Canonical large audit tables are not safely rewritten by this checkpoint, so canonical synchronization remains pending.

### Root cause

OperationLog writes are serialized only per `operationId` in the in-memory `operationLogWriteChains` map. Administrative deletion (`clearOperationLogs`) and retention/pressure deletion have no durable/global log-generation epoch that invalidates writers admitted under an older log history.

As a result, deletion of logs is not linearizable against already queued/late writers.

## Exact runtime proof

### 1. Administrative clear snapshots current writers but has no generation barrier

`clearOperationLogs()` currently:

1. snapshots `const pending = [...operationLogWriteChains.values()]`;
2. performs unbounded `await Promise.allSettled(pending)`;
3. clears the in-memory map;
4. executes one bounded IDB transaction that clears both `operations` and `events` stores.

There is no clear epoch written to IndexedDB/meta state and no writer receipt containing the epoch under which it was admitted.

A writer created after the snapshot or an old operation that schedules another event/status after the clear transaction can therefore write into the newly empty database.

### 2. Late event write demonstrably recreates a deleted header

`appendOperationLogEventOnce()` performs `operations.get(id)` and explicitly falls back to a new generic operation record when no header exists. It then:

- writes the new event to the `events` store;
- updates event counts/sequence/status on that synthesized record;
- calls `operations.put(output)`.

Therefore this is not only a theoretical race: after `clearOperationLogs()` removes the old header/events, an old-generation late event can recreate the same `operationId` as a new generic/incomplete log.

The recreated record loses the original authoritative title/type/meta/start context while making old activity appear to have happened after the user's explicit clear.

### 3. Late header/status mutation also recreates missing operations

`mutateOperationLog()` likewise uses a default record when `store.get(id)` returns no current header. Any late `recordOperationStage`/status mutation from an operation admitted before clear can therefore recreate the deleted header independently of the event path.

### 4. Clear can hang forever before reaching its bounded IDB transaction

The `Promise.allSettled(pending)` wait has no deadline and no admission cap. If one `operationLogWriteChains` promise never settles, the user's administrative clear can remain pending forever before the actual IDB clear starts.

This unbounded waiting aspect belongs to existing `P1-173`: the per-operation promise chain needs bounded admission/coalescing and administrative clear must not rely on waiting forever for every JS promise.

P1-197 is different: even if every promise eventually settles, an old operation can enqueue/write after the snapshot unless there is a persistent generation/epoch authority.

### 5. Retention cleanup can delete a still-running operation

`cleanupExpiredOperationLogs()` deletes by `updatedAt` cutoff using the `updatedAt` index and does not exempt `status === running` records.

Retention is configurable down to 1 hour. This matters because WebClip explicitly supports user-owned native Save As with **no artificial timeout**. A legitimate running operation can therefore be quiet longer than the minimum retention interval. Cleanup may delete its header/events while it is still active; its later completion event then recreates a generic/incomplete record via the behavior above.

The same generation/ownership problem applies to size-pressure deletion: removing a currently owned operation without marking its writer generation obsolete permits later resurrection.

## Required P1-197 contract

Introduce a durable OperationLog history epoch/generation, stored in the same IndexedDB trust boundary as log records (for example a dedicated meta store/versioned meta record).

### Writer admission

Every live operation/writer captures the current log epoch at operation start/admission. Every later header/event mutation carries that epoch.

Inside the same IDB transaction that would mutate `operations/events`, compare writer epoch with the current durable epoch. Mismatch = stale writer: do not create/update header or event.

Do not silently assign a stale writer the newest epoch merely because its old header was deleted.

### Administrative clear

A user clear must atomically:

1. advance the durable log epoch;
2. clear `operations` and `events` belonging to the previous epoch/history;
3. return success once that transaction commits.

It must not need to wait forever for old in-memory writers. Those writers become harmless because their captured epoch no longer matches.

Operations intentionally started **after** clear capture the new epoch and log normally.

### Retention / pressure cleanup

Retention is different from explicit clear:

- do not delete a currently owned/running operation merely because `updatedAt` is old while its lifecycle owner/receipt is still active;
- if eviction of an active/unresolved record is absolutely required under storage pressure, mark that exact writer generation tombstoned/evicted so its later events cannot synthesize a misleading new generic history;
- cleanup and normal writers must use the same epoch/operation-generation rules.

### Operation identity

Epoch must be orthogonal to `operationId`. Reusing the same textual ID in a different history epoch must never make a stale event attach to a new operation.

A robust key can be `(historyEpoch, operationId)` or an equivalent versioned receipt; UI/export may still display the current operationId string.

## Relation to existing items

- **P1-173:** owns unbounded/hung `operationLogWriteChains` queue/wait behavior. Extend it so administrative clear never performs an unbounded wait over arbitrary writer promises and queue admission remains capped/coalesced.
- **P1-055:** retains byte/event/total retention bounds; its cleanup implementation must respect P1-197 active-generation semantics.
- **P1-148:** live Journal entry→OperationLog linkage must point to an exact locally issued operation receipt, not only a textual id; P1-197 epoch can strengthen that receipt.
- **P1-190:** imported operation ids remain historical/unverified and must not gain current live-log authority. A history epoch/installation receipt helps enforce this.
- **P1-156:** native Save As can legitimately remain active longer than a 1-hour retention setting, so active log ownership must not depend only on timestamp freshness.

## Required deterministic regressions

1. Start operation A, pause an event writer, clear logs, release old writer: old header/event is not recreated.
2. Start A, clear, then start new B: B logs normally in new epoch while late A is rejected.
3. Start A with operationId X, clear, start a new operation also using textual X under new epoch: late A event cannot attach to new X.
4. Hung per-operation log promise does not make administrative clear wait forever; clear advances epoch and commits while stale writer remains harmless.
5. Retention cutoff passes while a legitimate long native Save As is still active: active operation history is not deleted solely by timestamp.
6. If active record is explicitly evicted under hard storage pressure, later events do not synthesize a misleading generic replacement.
7. Imported `operationId` cannot bypass epoch/local-provenance checks to link to/recreate a current local operation.
8. OperationLog export/detail after clear contains only new-epoch operations.

## Registry state note

This checkpoint evidence-reserves `P1-197`. It does not claim that the large canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` tables have been safely synchronized. Existing evidence-reserved P1-195/P1-196 remain separate confirmed Yandex auth items.

No `P0-079` or `P2-020` is created here.

Previous product test gate was not re-run by this docs-only audit checkpoint.

## Retired source: `AUDIT_DELTA_OPERATION_LOG_CLEAR_POST_SNAPSHOT_WRITER_2026-08-28.md`

SHA-256 of UTF-8 source text: `e282632e2baff701db803cc54dd4fe98d5ed5ca41e83ea48c6449f3a1007ec1e`

# Audit delta — OperationLog clear post-snapshot writer / registry loss — 2026-08-28

Source-of-truth `main` immediately before this write: `532ad3dc2590bd0b53519b30c9da0e2140e07e9f`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P1-197** — durable OperationLog history epoch / stale-writer rejection across administrative clear;
- **P1-205** — cleanup/write linearization;
- **P1-173** — bounded/coalesced writer queue admission and registry lifecycle;
- **P1-210** — outer response loss after destructive Clear must not authorize a blind second Clear;
- **P1-198** — worker-issued operation receipt must compose with history epoch.

The new concrete race is that `clearOperationLogs()` can erase the **in-memory serialization registry for a writer admitted after its snapshot**, while that writer is still unresolved. This can break per-operation ordering even before considering resurrection after the IDB clear.

## Current clear sequence

`clearOperationLogs()` currently performs:

1. `const pending = [...operationLogWriteChains.values()]`;
2. if non-empty, `await Promise.allSettled(pending)`;
3. `operationLogWriteChains.clear()`;
4. clear `operations` and `events` stores in one bounded IndexedDB transaction.

The existing P1-197 checkpoint correctly notes that step 1 is only a snapshot: writers admitted later are not part of `pending`.

Fresh audit shows step 3 makes that gap stronger.

## Deterministic post-snapshot registry-loss schedule

1. Operation writer A exists in `operationLogWriteChains`.
2. User Clear C snapshots `[A]` and begins waiting for A.
3. While C waits, a new writer B is admitted for operation X. `queueOperationLogWrite()` stores B's Promise in `operationLogWriteChains`.
4. A settles.
5. C resumes and executes `operationLogWriteChains.clear()`.
6. B may still be queued/running/unresolved, but its registry entry has now been forgotten.
7. A later writer D for the same operation X calls `queueOperationLogWrite()` and sees no `previous` Promise because C erased B from the Map.
8. D can now begin independently rather than being serialized after B.
9. C's IDB clear transaction can interleave before/after those writers according to actual IDB admission.

Thus administrative clear can destroy the queue's knowledge of a still-live writer that was not in the original snapshot.

## Consequences

This is not only the previously known "late writer recreates a cleared header" outcome.

For one textual operation id, B and D can now:

- execute IDB mutations without the intended JS per-operation ordering;
- assign event sequence/status based on stale independent reads;
- race with the clear transaction;
- recreate/overwrite a header after clear in different orders;
- make cleanup statistics/history chronology depend on scheduling rather than one explicit history epoch.

A registry that intentionally tracks actual writer settlement must never be globally cleared merely because an earlier snapshot was drained.

## Correct positive-control contrast

Individual `queueOperationLogWrite()` cleanup is ownership-aware: after settlement it removes a Map entry only when the stored Promise is still the same `next` Promise.

That compare-by-current-owner property is useful.

`clearOperationLogs()` bypasses it with unconditional `operationLogWriteChains.clear()`, so it can erase entries that were not owned by the snapshot it waited for.

A future repair should preserve compare-and-release semantics rather than replacing them with a new global blind Map reset.

## Durable history epoch remains the primary correctness fence

Trying to repeatedly snapshot/wait until the Map happens to become empty is not sufficient:

- new operations can continuously arrive;
- a hung writer can block forever;
- MV3 restart loses the Map;
- old writers can enqueue later stages after the clear transaction.

P1-197's durable epoch is still the authoritative solution:

1. Clear advances history epoch atomically with destructive store cleanup;
2. writers admitted before that commit carry old epoch and become harmless;
3. writers intentionally admitted after the epoch transition use the new epoch;
4. in-memory queues remain resource/ordering helpers, not the source of deletion authority.

The Map should retain every actual writer until that writer's own settlement even when its epoch becomes stale, so P1-173 admission/accounting remains truthful.

## Outer transport-loss composition

Options Clear uses:

`await chrome.runtime.sendMessage({ type:'WEBCLIP_OPERATION_LOG_CLEAR' })`

inside `runBusy()`. On rejection, `runBusy()` shows an error and re-enables the button.

As already established in the Options/P1-210 checkpoint:

1. Clear C may have committed successfully;
2. its outer response can be lost;
3. new logs can be created in the new history epoch;
4. user sees an error and can confirm Clear again;
5. second clear C2 can legitimately delete those newly created logs.

Therefore a destructive clear needs its own worker-issued clear/history receipt and result-reconciliation surface. `runtime.sendMessage` rejection is not proof that the epoch did not advance.

P1-197 and P1-210 should share one result model: `clear not admitted`, `clear committed at epoch E`, or `clear result unknown -> reconcile current history epoch`.

## Retention/size cleanup composition

P1-205 already establishes that TTL/size cleanup can be overtaken by queued writers because it does not participate in the same delete/write ordering.

The new Map-reset proof reinforces an implementation constraint: do not "fix" retention by calling the current manual-clear drain/reset helper. A cleanup mechanism must never erase unrelated/new writer registry entries, and a global unbounded drain would regress P1-173.

Per-operation generation/tombstone fencing or bounded selective drain/revalidation is required.

## Required deterministic regressions

1. Clear snapshots A; B is admitted after snapshot; A settles; clear proceeds -> B remains tracked until B actual settlement even though B may be stale by history epoch.
2. D for same operation id arrives while B is unresolved -> D cannot bypass B solely because Clear ran.
3. Clear epoch commits while B is old-generation -> B/D old-generation writes cannot recreate cleared history.
4. New operation N deliberately admitted after committed clear epoch logs normally under new epoch while old B remains tracked only for settlement/accounting.
5. Hung B does not prevent epoch clear from committing forever; B remains bounded/accounted and stale rather than being forgotten.
6. MV3 restart after clear reconstructs current history epoch from durable state; correctness does not depend on old Map contents.
7. Outer response loss after committed clear -> Options does not offer an unqualified destructive retry; reconciliation proves current epoch/result first.
8. New logs created after C survive unless the user explicitly authorizes a genuinely new C2 after being told C already committed.
9. Retention/size cleanup cannot use a blind `operationLogWriteChains.clear()` as synchronization.
10. Per-operation Promise cleanup still uses exact-owner comparison so settlement of an old Promise cannot delete a newer Map owner.
11. OperationId reuse in a new history epoch cannot receive events from B/D old epoch.
12. Clear/detail/export views expose only records in the accepted history epoch after reconciliation.

## Duplicate check

No new item is created.

- P1-197 owns administrative clear epoch/stale-writer authority.
- P1-205 owns retention/size delete-vs-write linearization.
- P1-173 owns bounded writer queue admission/lifecycle.
- P1-210 owns user-facing result classification after lost outer response.

This checkpoint adds a concrete queue-lifecycle acceptance condition: **a destructive operation may not globally forget actual writer promises that were admitted after the destructive operation's wait snapshot.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_OPERATION_LOG_RETENTION_WRITE_LINEARIZATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `2cfc62a220ded255ff2be2a917888ed11f7aebb7c43cb5873a7944c544c5ad5e`

# Audit delta — OperationLog retention cleanup vs queued writes — 2026-08-27

Source-of-truth `main` immediately before this write: `27f95d06673ae9414931d2c405eea2070cd65f22`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-205 — retention cleanup can be overtaken by an already queued OperationLog write and resurrect an expired operation

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide duplicate-check found adjacent OperationLog items, but no existing owner for this delete-vs-write linearization bug:

- **P1-039** — unified logged background maintenance and bounded cleanup stages;
- **P1-040** — flush OperationLog write tail before returning selected user-operation responses;
- **P1-075** — bounded/abortable maintenance IndexedDB transactions;
- **P1-121** — retention-setting Chrome Storage ordering;
- **P1-173** — admission pressure for serialized actual-settlement queues.

P1-205 concerns a different invariant: destructive retention/size cleanup and per-operation queued writers must agree on one ordering/generation. A queued write that was already logically part of an old operation must not recreate that operation after cleanup has authoritatively expired/deleted it.

## Fresh source proof

### 1. Per-operation writes are serialized only through module-memory chains

`service-worker.js` declares:

`const operationLogWriteChains = new Map();`

`queueOperationLogWrite(operationId, task)` obtains the previous Promise for that operation, chains the new task behind it, publishes the new Promise into the map and removes it after settlement.

This correctly orders multiple writes for the **same operation id** while those tasks are all admitted through the queue.

`appendOperationLogEvent()`, `startOperationLog()` and terminal/status mutations use this queue.

### 2. `clearOperationLogs()` explicitly treats queued writes as a destructive-operation barrier

The manual/full clear path does:

1. collect `const pending = [...operationLogWriteChains.values()]`;
2. `await Promise.allSettled(pending)`;
3. clear the in-memory chains;
4. only then clear OperationLog stores in one bounded IndexedDB transaction.

This is a strong positive control: the implementation already recognizes that clearing storage while queued writers can still execute would be unsafe.

### 3. Retention cleanup does not use the same barrier

`cleanupExpiredOperationLogs(retentionOverride)` calculates the cutoff, opens `WebClipOperationLogs` and directly starts its bounded readwrite cleanup transaction over:

- `OPERATION_LOG_STORE`;
- `OPERATION_LOG_EVENT_STORE`.

It walks the `updatedAt` index below the cutoff and deletes both the operation and its events.

The function does **not** first wait for `operationLogWriteChains`, does not mark the deleted operation generation/epoch, and does not block a queued JS task from starting after the cleanup transaction commits.

IndexedDB transaction serialization alone does not solve this case because the later writer may not have opened its IDB transaction yet — it can still be waiting as a Promise turn in `operationLogWriteChains` while cleanup runs.

### 4. A later write recreates a missing operation instead of rejecting it as expired

Operation-log mutations are intentionally resilient to missing headers.

`mutateOperationLogOnce()` reads the operation record and, when it is missing, creates a default record with fields including:

- `operationId`;
- `type: 'operation'`;
- title `Операция WebClip`;
- `createdAt: now`;
- `updatedAt: now`.

The event-write path has the same missing-record recovery behavior: a missing operation header is recreated so the event can still be persisted.

That resilience is useful for normal write ordering/recovery, but after **authoritative retention deletion** it changes semantics: the old operation is no longer treated as expired; it is reborn with a fresh timestamp.

### 5. Deterministic resurrection schedule

1. Operation O is old enough that its durable `updatedAt < cutoff`.
2. A new diagnostic task W for O has already been queued in `operationLogWriteChains`, but W has not started its IDB transaction yet because it waits behind another Promise/task.
3. Background maintenance calls `cleanupExpiredOperationLogs()`.
4. Cleanup sees the old durable record O, deletes O and all its events, and commits successfully.
5. W is released afterward.
6. W opens a new IDB transaction, reads O and finds no record.
7. Missing-record fallback creates a default O with `createdAt/updatedAt = now` and persists W's mutation/event.
8. O is now retained for another full retention interval even though maintenance had just expired it.

The cleanup result can therefore report O deleted while storage immediately contains O again.

### 6. Size-based cleanup has the same conceptual requirement

OperationLog maintenance also enforces aggregate log-size/event budgets. Any destructive pruning path that selects a record/event as disposable must be ordered against queued writers for that same operation.

Otherwise a post-prune queued write can recreate/expand state after the cleanup's accounting snapshot, making `deleted/sizeDeleted/retainedApproxChars` immediately stale and undermining the intended bounded-storage convergence.

P1-205 should therefore be fixed as an OperationLog delete/write policy, not as a one-line wait added only to one TTL cursor.

### 6a. Follow-up source confirmation — the 64 MiB size-cap is a second destructive pass in the same function

Fresh re-audit at source-of-truth `main` `8ce179d638b31fec9972056814bc8f434b2a77d6` confirmed the size-cap path concretely rather than only conceptually.

After the TTL pass, the same `cleanupExpiredOperationLogs()` performs a second readonly/readwrite accounting-and-prune flow for `MAX_OPERATION_LOG_TOTAL_JSON_CHARS`:

- it enumerates operation headers through the `updatedAt` index newest-first (`openCursor(null, 'prev')`);
- for each operation it incorporates header/event approximate JSON size into the retained-size decision;
- newest records are preferentially retained until the configured global budget is reached;
- older operations selected beyond that budget have their operation header and associated event rows deleted;
- `deleted`, `sizeDeleted` and `retainedApproxChars` are updated from that cleanup decision.

The newest-first policy itself is a useful positive control: the defect is **not** the choice of which diagnostics to retain. The defect is that this second destructive pass is subject to the same write-ordering gap as TTL cleanup.

It does not drain/recheck `operationLogWriteChains` before deciding/deleting. A writer already admitted in the JS queue but not yet in an IndexedDB transaction can therefore run after the size-prune commit, recreate/expand the just-pruned operation and invalidate both the 64 MiB convergence and the cleanup accounting snapshot.

Required acceptance is therefore explicit: **TTL expiry and global size pruning must share the same delete-generation/write-linearization mechanism.** A fix applied only to the cutoff cursor leaves P1-205 open.

## Why worker restart does not eliminate this bug

The strongest deterministic repro is within one worker generation; no restart is required.

Worker restart can drop JS-only queued turns, so it is not the source of resurrection. The root cause is more basic: retention cleanup is outside the same logical operation-ordering contract as queued writers.

This distinction matters because a fix should not rely on MV3 termination accidentally discarding pending diagnostics. Diagnostic loss is not an acceptable synchronization mechanism.

## Why P1 rather than P0

OperationLog is diagnostics/observability data, not the Journal source of truth or a remote destructive authority.

The defect can:

- violate configured retention;
- retain diagnostics longer than promised;
- consume storage beyond cleanup expectations;
- produce misleading cleanup statistics/history chronology.

But current source proof does not show Journal corruption or unauthorized Yandex mutation, so P1 is appropriate.

If log metadata itself contains privacy-sensitive retained fields whose deletion has a stronger explicit privacy contract, that data-classification issue should compose with P1-205 rather than changing the basic ordering root cause.

## Required P1-205 contract

### Cleanup and writes need one linearization policy

Before retention/size cleanup authoritatively deletes an operation, queued/in-flight writes for that operation must be accounted for.

Safe policies include either:

1. **drain-before-delete** — cleanup waits for admitted writes, recomputes `updatedAt`/size, then deletes only records still eligible; or
2. **generation/tombstone fencing** — cleanup commits an expiry/deletion generation and any queued writer carrying an older operation generation is dropped/fail-closed rather than recreating the record.

A global wait for every log write may be unnecessarily expensive; per-operation/bounded batching is acceptable if correctness is preserved.

### Fresh eligibility after waiting

If cleanup waits for a pending write, it must re-evaluate the operation's current `updatedAt` and retention/size eligibility after that write settles.

Do not delete based on a stale pre-wait cursor snapshot if the operation just received a legitimate current event.

### Missing-record fallback must distinguish recovery from authoritative deletion

The current “missing header => create default header” behavior needs provenance.

A writer may recreate a record only when missing state means recoverable partial logging, not when a newer retention/clear generation intentionally deleted that operation.

A bounded tombstone/deletion epoch, cleanup generation, or another explicit receipt can make that distinction.

### Manual clear semantics remain stronger

`clearOperationLogs()` already drains the current write chains before destructive clear. Preserve that property.

If a generation-fenced design replaces the global drain, manual clear must still guarantee that old queued diagnostics cannot repopulate logs after the user explicitly cleared them.

### Maintenance remains bounded

Do not fix P1-205 by allowing one hung diagnostic write to block maintenance forever.

Composition with existing deadline/admission work is required:

- bounded waiting/admission;
- per-operation busy/defer policy where needed;
- cleanup may skip an operation whose write outcome is unknown and retry next maintenance cycle;
- never declare that skipped operation deleted.

## Required deterministic regressions

1. Old operation O + queued writer W not yet started -> retention cleanup commits delete -> W starts: O is **not** recreated from the obsolete generation.
2. Old O + queued W completes before cleanup eligibility is finalized and updates O to current time -> cleanup rechecks and retains O.
3. Old O + hung W -> maintenance remains bounded, reports O as deferred/not deleted, and a later cycle converges after W settles.
4. Cleanup deletes O and all event rows atomically; no orphan event rows remain.
5. Size-based pruning has the same stale-writer fence as TTL pruning.
6. `clearOperationLogs()` followed by a previously admitted old write cannot repopulate user-cleared logs.
7. Missing-record recovery still works for a genuinely partial/new operation that has no newer deletion generation.
8. Cleanup statistics (`deleted`, `sizeDeleted`, retained estimate) reflect committed final decisions and do not count deferred operations as deleted.
9. Worker restart after a cleanup commit reconstructs deletion/generation truth from durable state rather than depending on lost in-memory chains.
10. Repeated maintenance remains idempotent and eventually converges under normal write traffic.

## Duplicate check / numbering

- New evidence-reserved **P1-205** assigned.
- **P1-039** remains unified background maintenance ownership.
- **P1-040** remains response-boundary flushing of operation log tails.
- **P1-075** remains bounded cleanup transaction lifetime.
- **P1-121** remains retention-setting storage mutation ordering.
- **P1-173** remains waiting-turn admission pressure.
- **P1-204** remains context-menu browser-state worker-generation ordering.

No new P0 or P2 number is created.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created by this audit write.

## Retired source: `AUDIT_DELTA_OPERATION_RECEIPT_DIAGNOSTIC_SEPARATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `60b64e3d00637d657e6997847cde3828ba6ad3865ff8c2acc855a1cc79494c06`

# Audit delta — live operation receipt vs OperationLog diagnostic lifetime — 2026-08-28

Source-of-truth `main` immediately before this write: `c39928adea6fe46d410779e617da9a3fdf6b333a`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block refines the composition of **P1-198** (worker-issued live operation receipt), **P1-197** (OperationLog clear/history epoch), and **P1-205** (retention/size cleanup vs queued writers).

Fresh architectural result: **the authoritative live operation receipt cannot be stored solely as, or inferred solely from, an OperationLog record**, because OperationLog is intentionally user-clearable/retention-bounded diagnostics while physical operation/recovery authority can legitimately outlive that history.

No new root cause is needed.

## Positive control — ordinary event/finish logging is already best-effort

`appendOperationLogEvent(operationId, event)` queues the durable diagnostic write but catches write failure and logs a console warning instead of propagating the diagnostic failure into the physical operation.

`finishOperationLog()` is built on that event path.

This is a valuable separation: failure to append a diagnostic event should not automatically turn a physically successful download/upload/Journal mutation into product failure.

Preserve this property when operation receipts are introduced.

## OperationLog has intentional destructive lifecycle

Existing P1-197/P1-205 audits establish that OperationLog records may be:

- explicitly cleared by the user;
- removed by retention;
- removed by aggregate size-pressure cleanup;
- eventually generation-fenced so old writers cannot recreate deleted history.

Those are legitimate diagnostic-history lifecycle transitions.

Physical side-effect receipts have different rules:

- local DownloadItem checkpoint may remain unresolved after log history is gone;
- remote-save checkpoint may remain unresolved/verified awaiting Journal finalization;
- native Save As STARTED session may remain active while diagnostics are cleared;
- backup attempt may remain pending/reconcilable;
- a Yandex move/delete saga may need exact source/target evidence after its visible log was cleared.

Therefore `(OperationLog row exists)` cannot become a prerequisite for physical reconciliation.

## Future P1-198 implementation risk

A tempting implementation of worker-issued operation identity would be:

1. create an OperationLog record containing random receipt nonce/history epoch;
2. later validate operation authority by reading that log record;
3. use absence/mismatch to reject progress/finalization/recovery.

That would couple correctness authority to a user-clearable diagnostic store.

After `Clear OperationLog` or legitimate retention, a still-running physical operation would lose its only receipt and could become unrecoverable or falsely unauthorized.

The opposite workaround — preventing clear/retention while any physical operation exists — would make diagnostics retention policy control core product liveness and could indefinitely retain logs for long unresolved external operations.

Both designs are wrong.

## Required two-layer identity model

### Core operation receipt

P1-198's authoritative receipt belongs to the lifecycle owner of the physical/logical operation, not to OperationLog history.

Depending on operation type, durable authority may live in:

- pending local download generation;
- remote-save generation;
- backup attempt generation;
- prepared Save As session;
- destructive move/delete saga checkpoint;
- import/export operation session where a durable owner is actually required.

The receipt binds operation kind, nonce/generation, source owner/document where applicable, and subsystem-specific physical generation.

### Diagnostic reference

OperationLog stores a **reference/copy of the receipt identity** sufficient to correlate diagnostics while history exists, together with its own P1-197 history epoch.

Deleting diagnostics removes observability, not physical authority.

Conceptually:

`physicalOperationReceipt -> optional OperationLog(historyEpoch, operationRef)`

not:

`OperationLog row -> physicalOperationReceipt`.

## Clear semantics

When the user clears OperationLog while operation A is still active:

- P1-197 advances diagnostic history epoch and deletes old diagnostics;
- A's physical checkpoint/operation receipt remains valid;
- late old A diagnostic writes carrying old history epoch are dropped and do not recreate cleared history;
- A can still physically settle/reconcile/finalize through its subsystem receipt;
- if product wants to show A again after clear, it must do so as a newly generated **current status/recovery view**, not by resurrecting deleted historical events under the old epoch.

This preserves both user intent to clear history and core correctness.

## Retention semantics

Retention/size cleanup may delete diagnostic history even for an unresolved physical operation once product policy permits it, provided:

- active-log UX promises are respected (P1-197 currently says timestamp-only deletion of active operations is unsafe);
- deletion is generation-linearized under P1-205;
- physical recovery state is independent and retained according to its stronger subsystem rules.

If diagnostics for an unresolved physical receipt are intentionally evicted, later recovery should report `diagnostic history unavailable/cleared`, not synthesize a generic old timeline.

## Operation terminality

A physical operation becoming terminal should not require OperationLog terminal write to succeed.

Order should conceptually be:

1. commit/verify authoritative subsystem result;
2. update/retire physical operation receipt according to its exact state machine;
3. best-effort append diagnostic terminal event under the current valid history epoch where appropriate.

If step 3 fails or history was cleared, steps 1–2 remain authoritative.

Conversely a diagnostic `success` event must never substitute for the physical terminal receipt.

## P1-148 / imported history composition

Journal `Показать лог` may use a local diagnostic reference when one exists, but imported historical `operationId` remains P1-190 unverified data and cannot reconstruct a live physical receipt.

A current Journal entry may retain a bounded local operation reference for diagnostics while physical recovery uses its exact download/remote generation independently.

## Required regressions

1. Start remote upload A -> clear OperationLog -> A completes -> remote checkpoint/Journal reconciliation succeeds; old A log is not resurrected.
2. Start local download A -> retention deletes diagnostics according to final policy -> DownloadItem completes -> Journal finalization still uses exact pending-download receipt.
3. STARTED native Save As -> clear logs -> page/worker restart -> Save As reconciliation still finds exact session/download receipt.
4. Pending backup upload -> log clear -> later exact remote recovery succeeds without requiring historical OperationLog row.
5. Yandex move outcome unknown -> logs cleared -> durable source/target receipt remains reconcilable.
6. Old diagnostic event after clear is rejected by old history epoch even though physical A is still valid.
7. New diagnostic view/event intentionally created after clear cannot reuse old event history implicitly; current status is distinguished from resurrected history.
8. OperationLog storage failure during terminal physical success does not convert the physical result into failure/retry.
9. A forged/imported textual operationId with a current diagnostic collision cannot acquire the physical receipt.
10. Clearing/retaining diagnostics never deletes PDF body/download/remote/backup/Save-As recovery evidence as a side effect.
11. Physical receipt cleanup after authoritative settlement does not require keeping diagnostic history forever.
12. UI explicitly reports unavailable/cleared diagnostic history rather than treating missing log as missing physical operation.

## Duplicate check

- **P1-198** owns authoritative worker-issued live operation identity.
- **P1-197** owns diagnostic history epoch and administrative clear.
- **P1-205** owns retention/size delete-vs-write linearization.
- **P1-190/P1-148** own imported/current Journal-to-log provenance.
- Physical subsystem owners (P0-039, P1-184, P1-156, P1-052, P1-090, etc.) remain authoritative for their external results.

No P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical product gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `AUDIT_DELTA_OPERATION_RECEIPT_PHYSICAL_ATTEMPT_LINEAGE_2026-08-28.md`

SHA-256 of UTF-8 source text: `3af799fd261c55368f45e78180078263ac4dfe8defba4f5481c06c7246e711e1`

# Audit delta — operation receipt / cached-content / physical-attempt lineage — 2026-08-28

Source-of-truth `main` before this checkpoint: `01cc3e24ce0dc79fe4943cb81ab6fbb16d903493`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-198** and its composition with **P0-079**, **P1-184**, **P0-073/P0-074**, **P0-076** and **P1-210**.

Existing audit already establishes that a worker-issued live operation receipt must replace caller-chosen textual `operationId`, and that physical PDF cache / remote save attempts need their own immutable generations. This checkpoint defines a missing relationship between those receipts: **they are not one-to-one identities and must form an explicit lineage graph.**

## Current retry flow demonstrates the non-one-to-one relation

Manual cached Yandex retry enters the worker through `WEBCLIP_RETRY_PDF_TO_YANDEX` and `retryCachedPdfUploadToYandex(tabId, operationId)`.

Each manual retry is intentionally a new visible user operation and starts a fresh OperationLog lifecycle:

- operation kind `yandex-pdf-retry`;
- current textual `operationId`;
- `retry: true` metadata.

At the same time it calls `getValidCachedPdfForTab(tabId)` and intentionally reuses the already generated PDF body/metadata.

Therefore one cached PDF content generation may legitimately feed multiple user retry attempts over time.

## Remote Journal intent identity is currently reused across retries

Inside `uploadCachedRecordToYandex()` current code derives:

`remoteJournalEntryId = cached.journalEntryId || remote-<cached.createdAt>-<tabId>`.

That value is stable for the cached PDF and is passed to `checkpointPendingRemoteSaveIntent()`.

Thus three concepts currently collapse around stable/reused values:

1. intended final Journal entry identity;
2. cached PDF content generation;
3. physical remote upload/reuse/publication attempt.

But the first two may stay the same while the third happens more than once, and each user retry operation should also have a distinct live operation receipt.

## A worker-issued operation receipt cannot replace a physical remote-attempt id

Suppose P1-198 is implemented by issuing receipt R for every visible user operation.

If one cached retry attempt A receives RA, times out after a possible signed PUT, and the user later explicitly starts retry B receiving RB, there can now be:

- one immutable cached content generation C;
- one intended Journal entry J;
- user attempts RA and RB;
- physical remote attempts UA and UB, depending on reconciliation result.

Using RA/RB as the only remote-save key loses the ability to represent a user operation that first performs reconciliation and then conditionally starts one or zero physical transfers.

Using stable J as the only key merges UA/UB, already proven unsafe by the remote-checkpoint generation audits.

Using content generation C as the only key is also wrong: the same bytes can be intentionally attempted in a later namespace/path generation after the first result is authoritatively classified or explicitly abandoned.

## Required lineage model

Conceptually preserve distinct receipts:

### Content receipt C

Owned by P0-079. Binds exact immutable generated PDF bytes/digest/source document and retry-cache generation.

One C may be consumed by more than one authorized later attempt, subject to retry/reconciliation policy and retention.

### User/live operation receipt R

Owned by P1-198. Binds the user/background operation invocation, owner/document/page generation, operation kind and OperationLog history epoch.

A manual retry click B creates RB even when it consumes the same content C as original attempt A.

### Physical side-effect attempt U

Owned by P1-184/P0-073/P0-074 and remote checkpoint generation rules. Binds exactly one external upload/reuse/publish/move attempt/context and its unknown/verified settlement evidence.

One R can legitimately perform zero physical U attempts if reconciliation finds prior success. One R may need a carefully modeled series only when provider protocol makes multiple distinct side effects intentional and each is separately receipted.

### Journal finalization capability JG

Owned by P0-076. Binds expected Journal generation/entry intent and the exact physical/content result allowed to finalize.

It is not the external-attempt id.

## Parent/child edges are correctness data

Required durable lineage should be equivalent to:

`operationReceipt R -> contentReceipt C -> physicalAttempt U -> Journal finalization receipt JG`

with optional explicit relation to a prior attempt being reconciled:

`RB reconciles/precedes UA from RA`.

The exact schema may differ, but every transition must be able to answer:

- which exact bytes did this user operation intend to reuse?;
- which previous physical attempt is this retry first reconciling?;
- did this retry actually start a new external side effect?;
- which physical result authorized the Journal record?;
- which diagnostics/progress operation should display that result?;
- which generation may be cleaned without deleting another generation's evidence?

## Retry must not relabel old physical evidence

Existing remote checkpoint code can preserve an old `remote-verified` row while updating its textual operationId to the new retry's id. Previous audit already identified that as contradictory provenance.

The lineage model gives the correct replacement:

- old physical attempt UA keeps immutable owner RA/C/context;
- retry RB can reference UA as `reconciledPreviousAttempt`;
- if UA is proven successful, RB may report `recovered previous result` without claiming RB physically uploaded the file;
- if a new UB is safely admitted, UB is a child of RB/C with its own generation.

OperationLog can then truthfully say whether the retry uploaded, reused, reconciled, or merely finalized an older result.

## Publication is another child state, not a boolean annotation

P0-078 and publication-observation audits require policy generation separate from observed public state.

If upload U is followed by publish side effect P, the receipt graph should make that transition explicit. A later retry that only reconciles an already-public object must not be represented as having executed a new publish merely because its parent operation desired public links.

The same model supports explicit future unpublish receipts.

## Local download composition

The same receipt separation is useful locally:

- generated PDF content C;
- user operation R;
- non-cancellable Chrome download-start attempt D;
- exact DownloadItem id/result once bound;
- Journal finalization JG.

A new visible operation that reconciles an old D does not become the physical creator of D.

No separate new local-download P-item is required; this is P1-198 schema composition with existing physical owners.

## OperationLog remains a projection

OperationLog may display the lineage but must not be the only durable source of it.

P1-197 clear/retention can delete diagnostics while C/U/D detached recovery receipts remain authoritative.

A stable display operationId may be shown to the user, but correctness edges use immutable locally issued receipts.

## Required deterministic regressions

1. Original user operation RA creates content C and remote attempt UA; UA outcome unknown. Manual retry RB starts -> RB first references/reconciles UA; it cannot overwrite/relabel UA as RB.
2. UA proves success during RB -> RB completes as reconciliation/finalization with zero new physical upload; OperationLog truthfully attributes physical upload to UA.
3. UA proves non-occurrence -> RB admits distinct UB bound to same C and current Yandex context; UA evidence remains historical.
4. RA/RB use same intended Journal id J -> U generations remain distinct and cleanup of UA cannot delete UB.
5. RA/RB use same exact cached bytes -> content receipt C may be shared intentionally without treating the operations as the same receipt.
6. New PDF generation C2 replaces latest retry pointer while old C/UA are unresolved -> old lineage remains exact; RB for C2 cannot inherit UA.
7. Publication side effect from UA is not attributed to RB merely because RB reconciles the file.
8. OperationLog clear between UA and RB does not destroy physical lineage needed for RB reconciliation.
9. Journal clear/import invalidates JG but retains unresolved U/D receipt lineage detached from current Journal generation.
10. Worker/page loss followed by recovery can reconstruct enough lineage to surface which physical generation is pending without old DOM state.
11. Imported historical operation ids cannot manufacture live R/C/U lineage.
12. Normal one-shot save still has a simple chain and does not require extra user interaction.

## Duplicate check / numbering

No new item is created.

- **P1-198** owns worker-issued live operation receipt and this parent/child composition.
- **P0-079** owns immutable PDF content generation.
- **P1-184/P0-073/P0-074** own external physical attempt/object/Yandex context.
- **P0-076** owns expected Journal-generation finalization.
- **P1-210** owns page-level unknown-result reconciliation before a fresh retry operation is admitted.

This checkpoint does not replace any physical subsystem receipt with a generic operation id. It records how those receipts must be linked without being collapsed.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `AUDIT_DELTA_OPERATION_RECEIPT_TERMINAL_AUTHORITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `d12686cb0cac3c4382b2a3c26b4ef1417fc32ac3189a4b4a41ee6f068c9b38a4`

# Audit delta — OperationLog terminal authority / operation receipt composition — 2026-08-27

Source-of-truth `main` immediately before this write: `1bfe9c9149144db31f9a8e87d37122f358f50fe3`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof strengthens existing:

- `P1-198` — worker-issued live operation identity/receipt rather than caller-owned textual `operationId`;
- `P1-197` — OperationLog history epoch / stale-writer rejection across clear and retention;
- `P1-148` — exact Journal entry -> OperationLog provenance;
- `P1-156` / `P1-129` — visible-page native Save As ownership and durable Save As session lifecycle.

The concrete refinement is that **terminal authority is still textual even where physical resource ownership already has a stronger receipt**. A worker-issued operation receipt must therefore govern not only operation start/event writes, but also page-originated cancel/finish/Save-As-settled transitions.

## Fresh source proof

### 1. Content-owned live operation identity remains caller-selected

The content-allowed runtime handlers for:

- `WEBCLIP_GENERATE_PDF`;
- `WEBCLIP_SEND_PDF_TO_YANDEX`;
- `WEBCLIP_RETRY_PDF_TO_YANDEX`;
- `WEBCLIP_DOWNLOAD_CACHED_PDF`

still pass `message.operationId` through syntax/length normalization and use the resulting textual value as the authoritative OperationLog key.

This is the original `P1-198` root cause: the worker does not issue/prove a unique live receipt bound to sender document + operation kind before the log/checkpoint/progress lifecycle begins.

### 2. `startOperationLog()` silently reopens an existing textual key

`startOperationLog(operationId, type, title, meta)` queues by the supplied id and mutates the existing record when one is already present.

It sets/replaces operation type/title/description/status/meta rather than rejecting a second physical operation that happens to use the same textual id.

Per-id Promise serialization prevents raw IndexedDB races, but it does not establish immutable ownership of that id by one physical operation.

### 3. Extension pages are trusted callers, but terminal log authority is still only `operationId`

`assertRuntimeMessageSender()` accepts messages from extension pages as trusted extension senders. That is the correct ACL boundary and this audit does not propose treating WebClip's own pages as hostile host DOM.

However `WEBCLIP_OPERATION_LOG_FINISH` accepts only:

- textual `message.operationId`;
- requested status;
- summary.

The handler calls `finishOperationLog(operationId, status, summary)` without an operation receipt/generation proving which live physical operation the page is allowed to terminate.

Trusting the extension page is not the same as proving that a delayed message belongs to the currently authoritative generation of operation X.

### 4. `finishOperationLog()` is an ordinary operationId-addressed writer

`finishOperationLog()` emits an `operation-finish` event through the same operationId-addressed OperationLog path.

Therefore terminal status has the same collision/stale-generation weakness as ordinary events:

- if two physical operations share textual X, either one can terminally classify the merged X record;
- if old X was cleared and a later writer is not epoch-fenced, terminal/event machinery can participate in resurrection under P1-197;
- if X is deliberately reused for a new operation after clear/new epoch, an old terminal message must not attach to the new X merely because the display string matches.

### 5. Real UI cancellation already uses this textual terminal API

`journal.js` uses `WEBCLIP_OPERATION_LOG_FINISH` when a user cancels a staged local Journal import after preview and when a user cancels a staged Yandex-backup restore after preview.

Those are legitimate visible-page lifecycle events. The issue is not that the page is allowed to cancel its operation; the issue is that the worker receives only textual operationId and therefore cannot distinguish a delayed cancellation from a different/new physical operation that reused the same text key.

A worker-issued receipt should let the page retain this UX while making the cancel transition generation-exact.

## Native Save As provides a useful positive control

### 6. Physical Save As resource lifecycle already has a separate random session receipt

Prepared native Save As uses a random `saveAsSessionId` and a durable checkpoint containing at least:

- session id;
- Blob URL;
- filename;
- owner page (`journal.html` or `options.html`);
- operationId.

`WEBCLIP_PREPARED_SAVE_AS_STARTED` and `WEBCLIP_PREPARED_SAVE_AS_RELEASE` require the session id + Blob URL and re-check the exact allowed owner page before mutating/releasing that prepared resource lifecycle.

This is structurally stronger than OperationLog terminal ownership and should be preserved. Native `saveAs:true` remains owned by the visible extension page and must not gain an artificial timeout.

### 7. Save As log finalization still addresses the log by textual operationId

The Journal export Save As settlement path ultimately calls `finishOperationLog(operationId, ...)` using the operationId supplied/carried by the page-facing flow.

Thus two identities coexist:

- **physical Save As receipt:** random `saveAsSessionId`, durable and owner-page checked;
- **diagnostic operation identity:** textual `operationId`, not yet a worker-issued immutable operation generation.

A stale/mis-correlated terminal message can therefore damage forensic/log truth even when the Blob/download lifecycle itself remains safely owned by its Save As session.

This is important for implementation planning: closing P1-198 does **not** require weakening or replacing the existing Save As resource receipt. The operation receipt should compose with it.

## Required unified P1-198 terminal contract

### Worker-issued live operation receipt

At operation admission, issue an immutable receipt independent of any caller display/correlation string. Conceptually it should bind:

- OperationLog history epoch from `P1-197`;
- random operation nonce/generation;
- operation kind/type;
- source owner class (content document / journal page / options page / background scheduler);
- source tab + exact document generation where applicable (`P0-070`, `P1-171` dependencies);
- optional display `operationId` only as non-authoritative correlation text.

### Terminal transitions require the exact receipt

Every cancel/finish/terminal status transition must carry or be derivable from the exact live receipt.

Inside the authoritative OperationLog transaction, prove:

1. current history epoch matches the receipt;
2. current operation generation/nonce matches;
3. the terminal transition is valid for that operation lifecycle;
4. a stale terminal writer cannot mutate a newer operation that reused the same textual display id.

Terminal state should be monotonic unless an explicitly modeled recovery state permits a later reconciliation transition. A second unrelated operation must never reopen or overwrite the first by reusing its textual id.

### Page-owned cancellation

Visible extension pages may continue to own user decisions such as canceling import after preview. The worker should return an operation receipt when the operation is prepared/admitted, and the page must return that receipt for cancellation.

If the page is stale/reloaded and no longer owns the exact receipt, cancellation should fail closed or reconcile the exact retained operation state rather than targeting a display string.

### Native Save As composition

For page-owned Save As, bind:

`operationReceipt <-> saveAsSessionId <-> ownerPage <-> Blob/download lifecycle`.

The existing random Save As session remains the physical resource owner. OperationLog terminal status should be derived from/check against the checkpoint's bound operation receipt rather than trusting an independently supplied textual operationId.

`saveAs:true` must remain without an artificial timeout. Receipt validation is ownership/provenance, not a deadline.

### Background/recovery composition

Background and recovery operations that currently create their own `makeOperationLogId(...)` values should also receive a locally issued generation/receipt so that:

- restart/recovery can distinguish a resumed durable operation from a new diagnostic operation;
- P1-197 clear epoch invalidates stale writers;
- Yandex remote-save `transferAttemptId` / checkpoint generations can reference a proven operation receipt (`P0-073/P0-074/P1-184` composition) rather than a mutable text label.

## Required deterministic regressions

1. Physical operation A owns receipt RA/display id X. A second operation B proposes/reuses display X: B cannot rewrite A; it receives RB or is explicitly rejected.
2. A delayed `WEBCLIP_OPERATION_LOG_FINISH` carrying RA after B has begun with display X cannot finish B.
3. A page cancel for staged import A cannot cancel a later staged import B merely because the same display id is reused.
4. Clear OperationLog advances P1-197 epoch; late finish/event from RA is rejected and cannot recreate the cleared record.
5. New operation B after clear may reuse display X under a new receipt/epoch; late A terminal message remains stale.
6. Journal entry -> log linkage stores/resolves the exact operation receipt/provenance, not only display X.
7. Prepared Save As session SA is bound to operation receipt RA; STARTED/RELEASE/settled log outcome for SA cannot finish another operation RB.
8. Reload/duplicate extension page cannot finish/cancel an operation unless it holds the exact live/durable receipt required by that lifecycle.
9. Normal user cancellation after import preview still works and records exactly one terminal canceled event for the intended operation.
10. Native Save As remains page-owned and unbounded by artificial timeout while terminal OperationLog provenance becomes generation-safe.
11. Background operation restart cannot attach a new physical operation to an old receipt simply because `makeOperationLogId`/display text matches.
12. Imported historical operationId remains `imported-unverified` under P1-190 and cannot be presented as a live terminal-capable receipt.

## Adjacent audit blocks completed in the same pass

### Destructive/publication lifecycle

Fresh source evidence was duplicate-checked against existing `AUDIT_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`, `AUDIT_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md`, and `AUDIT_DELTA_PUBLICATION_POLICY_2026-08-27.md`.

No new P-number is needed:

- generic `yandexApi()` timeout text incorrectly claiming `без изменения данных` for mutating PUT/POST is already an explicit mutation-recovery refinement;
- missing `/resources/unpublish` and deletion of published Journal references remain `P0-069/P1-164`;
- stale publication policy remains `P0-078`;
- publish before exact object/content proof remains `P1-184`;
- move timeout/target identity remain `P1-090/P1-183`.

### OAuth readiness/lifetime

Fresh current-source check still confirms the already reserved `P1-195/P1-196` evidence:

- status reports connected from token presence;
- status exposes requested scopes rather than enforced granted capabilities;
- locally known expiry is rejected only at operation-time token getter rather than represented as authoritative status state;
- manual token persists unknown lifetime/scope as `expiresAt:0` / empty scope;
- no exact-current-generation 401 demotion exists.

No new OAuth number is created; existing `AUDIT_DELTA_YANDEX_OAUTH_2026-08-26.md` remains the owner.

### PDF debugger/document ownership

Current debugger attach/detach actual-settlement serialization remains a positive control (`P1-066/P1-131`). Fresh save-path inspection still passes only `tabId` into PDF generation while the content sender's `documentId` is not carried to `generatePdfBlob(tabId)`. This remains existing `P0-070`, not a new item.

## Registry consequence

No new P-number is assigned by this checkpoint.

Refine `P1-198` so worker-issued live identity covers **terminal/cancel/settlement writers**, not only start/event collision. Compose with `P1-197` history epoch and existing page-owned Save As receipt `P1-129/P1-156`.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` lossless synchronization remains pending as a separate large registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_PROGRESS_DIAGNOSTIC_RECEIPT_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `e8aca4efe15d2e27d39d7e2a7d857d9e9b537e09c0eb6e7765457e610193c248`

# Audit delta — progress / diagnostic receipt and document generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a768e672ea4a6307efc0703d516c4510aeb71c53`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh audit of user-visible progress, post-print diagnostics and operation correlation refines existing:

- **P1-198** — worker-issued live operation identity/receipt;
- **P0-070** — exact source-document provenance across PDF generation;
- **P1-147** — truthful print diagnostics;
- **P1-210** — outer result loss and durable result reconciliation;
- **P1-175/P1-171** — exact page/frame document command targeting;
- **P0-079/P1-184/P0-039** — physical PDF/remote/download receipts after admission.

No separate P1-211 is required. Progress and diagnostics are not independent authorities; they must consume the same immutable operation/document receipts as the physical operation they describe.

## Positive control — current page progress has an operationId gate

`content.js` stores:

- `state.pageUploadActive`;
- `state.pageUploadOperationId`.

When `WEBCLIP_PAGE_UPLOAD_PROGRESS` arrives, it updates the visible modal only when:

`state.pageUploadActive && message.operationId === state.pageUploadOperationId`.

`updatePageUploadProgress()` repeats the same check.

This is materially better than accepting every progress notification for the tab. Within one living content document, two ordinary WebClip operations with different generated UUIDs do not normally repaint each other's progress UI.

This positive control should remain.

## Current operationId is still caller-issued, not authoritative

`content.js::makeOperationId()` generates UUID/random text in the renderer and `sendPdfToYandex()` / `retryCachedPdfToYandex()` store that text as `pageUploadOperationId` before sending it to the worker.

P1-198 already proves worker handlers accept caller-supplied textual operationId as authoritative for OperationLog and physical local-save keying.

Progress uses the same untrusted correlation string.

Therefore the current progress guard is collision-resistant for ordinary cooperative UI, but not an authority boundary.

A malicious/stale caller that deliberately reuses textual X can create two physical/logical operations that both satisfy the page's `operationId === X` correlation test.

P1-198's worker-issued receipt must therefore replace the progress correlation token too; fixing only OperationLog/checkpoint keys would leave page progress semantically weaker than the operation it represents.

## Worker progress delivery is tabId-only

`emitPageUploadProgress(tabId, operationId, ...)`:

1. records an OperationLog stage using operationId;
2. calls `chrome.tabs.sendMessage(tabId, {type:'WEBCLIP_PAGE_UPLOAD_PROGRESS', operationId, ...})`;
3. does not target exact `documentId`.

The physical Yandex operation may outlive/navigation-separate from the content document that initiated it.

A valid sequence is:

1. document A starts operation A/X;
2. worker continues upload after PDF cache admission;
3. tab navigates/reloads to document B;
4. worker emits later progress using the same tabId;
5. Chrome delivers the message to whatever matching content script is current in tab B.

A fresh B normally has `pageUploadActive=false`, so it ignores the message. This is a useful accidental safety property, but it is not exact provenance.

If B starts another operation using the same textual X — deliberate collision/reuse under P1-198 — old progress from A can satisfy B's current filter and mutate B's UI.

Even without collision, delivering old operation messages to replacement documents is unnecessary cross-generation traffic and complicates diagnostics/security reasoning.

## Required progress identity

Every page progress notification should bind to the same immutable receipt chain as the operation:

- worker-issued operation generation/nonce from P1-198;
- exact source top document receipt from P0-070/P1-175;
- physical PDF/transfer generation where the stage is about that object;
- operation type/kind.

Worker should target the exact source `documentId` where a content progress UI is still expected. If that document no longer exists, progress delivery can be dropped while durable OperationLog/reconciliation continues.

A replacement document must not become the new progress owner simply because it inherited the same tabId.

## Progress UI is optional; durable operation truth must survive page loss

Navigation/page close can legitimately destroy the source content UI while a remote transfer already admitted continues.

Therefore the progress channel cannot be the correctness owner.

Required separation:

- content progress is ephemeral best-effort visualization for the exact source document generation;
- OperationLog is diagnostics only and must use P1-197/P1-198 exact log identity;
- durable remote/local checkpoint is external side-effect reconciliation authority;
- P1-210 reconciliation surface lets the user later recover final status after the source UI disappeared/lost response.

No implementation should keep an old content document artificially alive merely to preserve progress.

## Outer result loss currently ends the page progress owner before the physical result is known

On Yandex send/retry error, content eventually calls `endPageUploadProgress()` and presents an error/retry surface.

If the error is an outer runtime response loss, P1-210 proves the worker/remote side effect may still settle.

After `endPageUploadProgress()`:

- `pageUploadActive=false`;
- the operation id is cleared;
- later progress messages are ignored.

This is correct insofar as ambiguous progress must not silently repaint a terminal error UI. But it leaves no automatic transition from `unknown` to the durable final result.

P1-210 must therefore provide a distinct reconciliation owner rather than trying to keep accepting late progress as proof of success.

A late stage notification is not an authoritative terminal receipt: it can itself be lost/reordered/stale.

## New retry generation should not inherit old progress

When the user explicitly retries cached Yandex upload, `retryCachedPdfToYandex()` creates a new textual operationId and starts a new page progress generation.

Ordinary distinct IDs already isolate A/B visually.

Final design should strengthen this to:

- new worker-issued operation receipt B;
- B may reference the same immutable PDF generation from P0-079 only when retry admission is valid;
- old A progress/result cannot equal/target B;
- P1-184 retains both physical transfer attempt receipts until A is classified before unsafe duplicate retry;
- the UI can show that B is a deliberate follow-up to A rather than pretending they are one operation solely because they share cached bytes.

## Post-print diagnostics has a bounded timeout but wrong document target

`collectPrintDiagnosticsForTab(tabId)` wraps its `tabs.sendMessage` in a 5-second `withOperationTimeout`, which is a positive P1-158/P1-157 lifetime control.

However the message is tabId-only:

`WEBCLIP_COLLECT_PRINT_DIAGNOSTICS`.

P0-070's prior provenance audit already proves:

1. PDF bytes A can already exist;
2. tab navigates to B;
3. diagnostics RPC goes to B;
4. B returns its current page diagnostics;
5. those diagnostics are logged against PDF A.

This is not fixed by the timeout. It is P1-147 truthful diagnostics + P0-070 exact document provenance.

Required: diagnostics target the exact admitted/printed documentId/generation or are explicitly recorded as unavailable/stale-document.

## Beforeprint/afterprint diagnostics also need generation association

Content keeps:

- `lastBeforePrintDiagnostics`;
- `lastAfterPrintDiagnostics`.

These are ordinary mutable fields in one content script instance and `WEBCLIP_COLLECT_PRINT_DIAGNOSTICS` returns them plus a fresh current snapshot.

Without an explicit print/PDF generation id, a later print attempt in the same document can replace these fields before an older worker request reads them.

Current debugger PDF generation is globally serialized, which reduces overlapping physical print, but content/UI preparation and delayed diagnostics retrieval still need explicit generation ownership if old/new operation lifecycles can overlap or a retry begins after ambiguous result.

This belongs to P1-147/P0-070/P1-198 rather than a new diagnostics item.

A robust diagnostics record should bind:

- source document receipt;
- print/PDF generation id;
- operation receipt;
- phase (`beforeprint`, `afterprint`, post-print query);
- capture timestamp/order.

Worker asks for the exact generation. Content never returns “latest diagnostics” as though they necessarily belong to the requested PDF.

## OperationLog stage correlation shares P1-198

`emitPageUploadProgress` records the stage through `recordOperationStage(operationId, ...)` before attempting page delivery.

Thus one textual collision affects both:

- visible progress filtering;
- OperationLog timeline/status provenance.

P1-198 already requires worker-issued operation identity and P1-197 adds history epoch. Progress should carry that exact same receipt; do not invent a second page-only UUID namespace that can drift from log/physical receipts.

## Progress delivery failure must not alter physical operation outcome

Current worker fire-and-forget page progress delivery is conceptually correct: a closed/navigated page must not cancel or fail an already admitted remote transfer merely because `tabs.sendMessage` rejects.

Preserve that separation.

The fix is exact targeting and truthful UI/reconciliation, not making the remote save depend on a live progress subscriber.

## Recommended unified receipt chain

Conceptually:

`sourceDocumentReceipt -> workerOperationReceipt -> pdfGeneration -> transferAttempt -> remoteObjectReceipt`

Progress/diagnostics refer to links in this chain:

- preparation progress: sourceDocument + operation;
- PDF/print diagnostics: sourceDocument + operation + pdfGeneration;
- network upload progress: operation + pdfGeneration + transferAttempt;
- terminal remote result: remoteSave/transfer attempt + exact remote object proof;
- Journal finalization: all relevant receipts + Journal generation CAS.

The page does not get to replace this chain with `{tabId, textualOperationId}`.

## Required deterministic regressions

1. A upload in document A navigates to B: late A progress is not delivered to B as current progress; durable A operation continues independently.
2. B starts ordinary new operation with different receipt: late A progress never updates B.
3. Deliberately force caller textual operationId collision X for A/B: worker-issued receipts remain distinct and old A progress cannot pass B filter.
4. Same collision cannot merge OperationLog timelines/status.
5. Outer response loss ends page progress A -> A later completes remotely: late progress is not treated as terminal authority; P1-210 reconciliation shows final result from durable receipt.
6. Unknown A then explicit retry B: B gets a new operation/transfer receipt; A and B progress/results remain distinct even when the same PDF generation is deliberately reused.
7. Navigate after PDF A but before diagnostics request: replacement B diagnostics are never attached to A.
8. Same-URL reload A->B also fails exact document diagnostics/progress targeting.
9. Two sequential print attempts in one document: diagnostics stored/returned for generation GA cannot be overwritten/adopted as GB and vice versa.
10. Source document closes during upload: remote operation remains recoverable; absence of progress subscriber does not fail transfer.
11. `tabs.sendMessage` progress rejection never deletes physical checkpoint/remote receipt.
12. OperationLog clear/history epoch does not invalidate physical operation receipt; post-clear UI can still reconcile through the subsystem receipt even if diagnostics history is gone.
13. Imported/caller-forged operationId cannot become a live progress receipt.
14. Progress details remain sanitized/bounded and never include signed transfer URLs/tokens.
15. Real unpacked Chrome navigation/reload during active upload confirms exact `documentId` targeting/drop behavior.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-198** owns authoritative operation receipt/collision isolation.
- **P0-070** owns exact source document/PDF provenance.
- **P1-147** owns truthful generation-bound print diagnostics.
- **P1-210** owns user-visible unknown-result reconciliation after channel loss.
- **P1-175/P1-171** provide exact page/frame targeting.
- **P0-079/P1-184/P0-039** remain physical body/remote/download recovery owners.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_USER_OPERATION_RECONCILIATION_SURFACE_2026-08-28.md`

SHA-256 of UTF-8 source text: `6683b6991e9efdf0e8c43c5fae5da2184b8251432934f150e06a60087723b83e`

# Audit delta — P1-210 reconciliation surface: Save As prepare + destructive Journal flows — 2026-08-28

Source-of-truth `main` immediately before this write: `b9807477ce3252c0e894a88eb1ecc16dd7ef9533`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof expands existing **P1-210 — outer runtime transport loss / durable operation-state reconciliation** into two additional user-operation surfaces:

1. prepared native Save As response loss before the page receives its durable Save As session receipt;
2. destructive Journal/Yandex operations where a lost outer response is rendered as ordinary failure and can lead to a fresh operation generation.

This checkpoint does not replace subsystem owners:

- **P1-156/P1-169** own the physical prepared Save As session/Blob/checkpoint lifecycle;
- **P1-183/P1-090** own Delete→Trash durable target/outcome and exact move reconciliation;
- **P0-069/P0-078** own destructive/publication privacy policy and publication generation;
- **P0-076** owns exact Journal generation/CAS for delayed local finalization;
- **P0-074/P0-073** own Yandex auth/account/root namespace generation;
- **P1-198** remains the worker-issued operation receipt prerequisite.

P1-210 owns the page-side question that remains after those stores exist: **what may the UI claim and which next action may it admit when the outer response itself was lost?**

## Surface A — prepared Journal/OperationLog Save As response loss

### Journal export PREPARE can physically prepare durable state before the page receives the response

`journal.js::exportJournalToFile()` creates a caller operationId and directly awaits:

`chrome.runtime.sendMessage({ type:'WEBCLIP_JOURNAL_EXPORT_PREPARE', operationId })`.

The worker-side preparation builds/stages the export, creates an offscreen Blob URL and writes a durable PREPARED Save As checkpoint before returning `{ blobUrl, saveAsSessionId, ... }` to the page.

The page cannot call `WebClipPreparedSaveAs.start(prepared)` until that response arrives.

### Outer response loss turns a durable PREPARED generation into an invisible failure

Journal wraps the operation in `runBusy()`. On any thrown/rejected error it shows ordinary error text, and `finally` restores the button's previous enabled state.

Deterministic schedule:

1. page starts export A;
2. worker creates Blob A and PREPARED session SA;
3. worker's response channel is lost before the page receives SA;
4. page reports ordinary failure and re-enables Export;
5. SA remains in `webclipPreparedSaveAsIndex` but no page closure owns its `blobUrl/saveAsSessionId` receipt;
6. user clicks Export again;
7. worker creates independent Blob/session B/SB;
8. A is now an orphaned PREPARED resource/checkpoint and repeated transport loss can consume the active cap of 64.

No physical native download necessarily started for A, so this is not the same side-effect severity as the Yandex/local download P1-210 manifestations. It is still the same **outer response lost after durable admission** classification defect.

The correct UI state is `prepare result unknown/reconcile`, not proof that preparation never happened.

### OperationLog export has the same response boundary

`options.js` directly awaits `WEBCLIP_OPERATION_LOG_EXPORT_PREPARE`, then calls the same `WebClipPreparedSaveAs.start(prepared)` helper.

If PREPARE committed but its outer response is lost, Options also lacks a returned session receipt and a fresh click can create another prepared Blob/session.

Required composition:

- P1-156 must allow recovery/GC of ownerless PREPARED sessions;
- P1-210 should let a page reconcile the exact worker-issued prepare operation/receipt instead of blindly creating a fresh generation;
- P1-198 should bind the returned operation receipt to `saveAsSessionId` so the page can recover exact admitted state without guessing by filename/blob URL.

## Surface B — Delete→Trash outer response loss

### Every retry is a fresh operation generation

`journal.js::runDeleteOperation(diskAction)` sets:

`activeDeleteOperationId = crypto.randomUUID(...)`

on every invocation.

The Retry button is wired to:

`runDeleteOperation(deleteRetryAction)`.

Thus a retry after an error is not reconciliation of the old operation identity; it starts a new textual operationId/generation.

### Generic outer rejection is rendered as terminal error and exposes Retry

The destructive call directly awaits:

`chrome.runtime.sendMessage({ type:'WEBCLIP_JOURNAL_DELETE', id, diskAction, operationId })`.

Its catch path enters the error UI and exposes `Повторить`; for Trash it also exposes the already-audited local-only fallback.

There is no page-side distinction between:

- structured worker rejection proving no remote side effect was admitted;
- structured `unknown settlement` returned by an operation-specific state machine;
- browser/runtime response-channel loss after the worker had already moved/published/unpublished/finalized state;
- worker restart after durable checkpoint but before response delivery.

### Deterministic outer-loss schedule

1. user starts Trash operation A;
2. worker admits or transmits the exact remote move A; it may also create/need the P1-183 durable target receipt;
3. remote move settles or becomes outcome-unknown;
4. the page↔worker result channel is lost before Journal receives authoritative state;
5. Journal catch presents ordinary error + Retry;
6. user clicks Retry;
7. `runDeleteOperation()` creates operationId B and calls a new delete flow;
8. A may still need exact reconciliation while B starts from current/partially changed remote and Journal state.

The older `AUDIT_DELTA_DELETE_FALLBACK_UNKNOWN_MOVE_2026-08-27.md` already proves the analogous problem when the **worker itself returns an error/timeout after move admission**. P1-210 adds the stronger boundary where no worker result is available at all.

Required behavior after outer loss:

- do not generate B merely because the channel rejected;
- show `результат удаления/перемещения уточняется`;
- query bounded exact status by worker-issued receipt A;
- use P1-183/P1-090 durable source/target/object evidence to classify A;
- only permit a fresh move/delete generation after A is authoritatively proven pre-side-effect/terminal-safe, or after an explicit manual-abandon policy preserves detached unknown-outcome evidence.

The existing local-only fallback remains governed by P1-183/P1-090/P0-069 and must not erase unresolved A evidence.

## Surface C — ReadmeLater→Upload / Mark Read truthfulness

`journal.js` starts the remote move with a fresh `activeMoveReadOperationId` and directly awaits:

`WEBCLIP_JOURNAL_MARK_READ`.

On any rejection, including outer runtime/channel failure, the UI states:

`Перенос не завершён`

and explicitly says:

`Запись журнала оставлена в режиме «Прочитать позже».`

That statement is not authoritative after outer transport loss.

The worker flow can already have moved the exact Yandex file or committed checkpoint fields before the response was lost. Existing worker-side durability does not make the page's negative statement true.

This UI currently does not expose an immediate Retry button in the same progress dialog, which is a positive control compared with Delete→Trash. However after closing/reloading, if local finalization did not settle, the Journal entry may still appear as `later` and the user can initiate another move operation.

Required P1-210 refinement:

- outer loss must render `result unknown / checking operation`, not `entry definitely left unchanged`;
- reload/reopen should be able to discover the exact pending move generation from durable state;
- any later fresh Mark Read operation must first reconcile/retire the previous generation under P1-090/P0-076/P0-074 rather than infer non-occurrence from the UI error.

## Surface D — local-only Journal delete is lower side-effect severity but still needs revision receipt

For a non-Yandex entry, the page also directly sends `WEBCLIP_JOURNAL_DELETE` and on rejection reports generic error. A worker may have deleted the Journal row before the outer response was lost.

A second delete normally encounters `entry already absent`, so this path is naturally more convergent and does not warrant a new P1-210 severity class.

Still, the visible response should reconcile current Journal revision/entry generation rather than treat channel rejection as proof that deletion failed. This composes with P0-076/P1-206 rather than creating another item.

## Required P1-210 common contract refinement

### Worker result delivery and operation settlement are separate facts

For extension-page mutations, rejection of `runtime.sendMessage()` means only that the page did not receive an authoritative response. It does not classify worker admission or external/browser settlement.

The page should use three-state semantics consistently:

1. authoritative application result received;
2. exact pre-admission failure proven;
3. result unknown -> reconcile.

### Exact status lookup must not depend on caller textual operationId

P1-198 remains required. The worker should issue an immutable operation receipt/generation at or before admission and bind it to subsystem receipts:

- `saveAsSessionId` for prepared Save As;
- Delete→Trash source/target/object checkpoint;
- Mark Read move checkpoint;
- PDF/download/remote-save receipts from the original P1-210 audit.

A page-generated display operationId can remain useful for UX/log correlation but must not authorize status mutation/retry.

### UI must not unlock fresh non-idempotent action solely from transport failure

After outer loss:

- disable or replace ordinary Retry with `Проверить результат` / reconciliation;
- a fresh generation is allowed only after authoritative status proves it safe;
- reconciliation timeout remains `unknown`, not failure;
- page close/reload does not delete durable recovery evidence.

### Boundedness

Status reconciliation must remain bounded/coalesced. Do not hold a page forever or create a polling storm. Unknown state can persist durably/manual-reconciliation state while expensive resources obey their own bounded owner/lease policies.

## Deterministic regressions

1. Journal export PREPARE commits SA, outer response rejects -> page does not create SB on ordinary Retry until SA is reconciled or proven safely orphan-reclaimable.
2. Same PREPARE loss + page reload -> active SA is discoverable by worker-issued receipt/owner recovery or is reclaimed by P1-156 proof-based GC; repeated loss cannot exhaust cap 64 silently.
3. OperationLog export PREPARE has the same semantics.
4. Delete→Trash move A physically succeeds, outer response rejects -> UI shows unknown/reconcile; clicking normal action cannot start B before A reconciliation.
5. Delete→Trash A is authoritatively rejected before remote side effect -> fresh B may be admitted.
6. Delete→Trash A outcome unknown + user explicitly abandons automatic reconciliation -> detached exact source/target/publication receipt remains; Journal-management authority can be revoked separately.
7. Mark Read remote move A succeeds but response is lost before local UI success -> page never states as fact that the entry/file remained unchanged.
8. Mark Read after page reopen first reconciles A before issuing a new move generation.
9. Local-only delete commits but response is lost -> refresh/revision check converges to missing entry instead of repeatedly claiming deletion failed.
10. Reconciliation itself loses its response -> state remains unknown and no blind side effect retry occurs.
11. P1-198 collision test: a caller-supplied/reused textual operationId cannot reconcile or control another operation's receipt.
12. Clear/import revokes stale local finalization authority without erasing external-operation evidence required by P1-183/P1-090.
13. Publication state remains explicit across delete transport loss; P0-069/P0-078 are not bypassed by an error fallback.
14. All reconciliation reads and UI outstanding requests remain globally bounded.

## Duplicate check / numbering

No new P-number is allocated.

- **P1-210** is expanded to Save As PREPARE response loss and destructive Journal outer-response loss.
- **P1-156/P1-169** retain the physical Save As session/Blob/cleanup ownership.
- **P1-183/P1-090/P0-069/P0-076/P0-074** retain destructive remote correctness ownership.
- **P1-198** remains the required worker-issued operation identity layer.

The previously assigned P1-201…P1-210 numbers remain occupied and unchanged.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Manifest/runtime version remains `0.9.8`. Real unpacked Chrome QA and real Yandex E2E remain release blockers. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `9ac2346eedddd62663cb42a64e3a0aab828c2cacab681c6543a73d20934a9e9a`

# Audit delta — user-operation outer transport loss / durable-state reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `78d199c37b270c944a73ffb69517a9bbe62ab697`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## New confirmed item: P1-210

**P1-210 — User-facing retry admission after an outer `runtime.sendMessage` / response-channel failure is not reconciled with durable operation state. A page can be told an operation failed/not cached and offer a fresh non-idempotent retry even though the service worker already created a PDF cache/checkpoint and the physical download/upload may be in progress or have unknown settlement.**

This is a transport/result-classification defect rather than failure of the existing recovery stores themselves.

## Why this is independent

Adjacent owners remain necessary but do not own this user-visible state transition:

- **P1-048** — a signed offscreen upload/download is not automatically retried after unknown transport settlement;
- **P0-039/P0-043/P0-044** — durable recovery evidence for local/Yandex physical side effects;
- **P0-079** — PDF retry cache must be immutable operation-owned rather than tab-owned;
- **P1-198** — worker-issued operation identity instead of caller-chosen textual operationId;
- **P1-161** — auth-recovery return UX;
- **P1-124** — exact reconciliation for non-idempotent `tabs.create()`;
- **P1-191/P1-178** — auth replacement/completion state machines.

P1-210 asks a different question: **after the outer page↔worker RPC result is lost, what may the UI truthfully claim and which retry actions may it admit before current durable state is reconciled?**

## Fresh source proof — Yandex first-send path

### 1. Worker correctly knows when a reusable PDF cache exists

`generatePdfAndUploadToYandex()` creates/caches the generated PDF before the remote operation. When an application-level error occurs after that point, its catch returns a structured result containing:

- `ok: false`;
- `cached: true`;
- the cached filename;
- normalized error;
- operationId.

When this structured response reaches the content page, the UI can safely distinguish "PDF already exists" from "PDF was never prepared".

### 2. Outer runtime rejection has no `pdfCached` evidence

`content.js::sendPdfToYandex()` uses:

`const result = await chrome.runtime.sendMessage(...)`

and on a rejected outer message Promise executes:

`showYandexSendError(error?.message || String(error), Boolean(error?.pdfCached), operationId)`.

A runtime/channel error is not the worker's structured `{ cached:true }` result. It normally has no `pdfCached` property, therefore `Boolean(error?.pdfCached)` is false.

### 3. False branch offers a fresh generation

`showYandexSendError(..., pdfCached=false, ...)` presents:

`Сформировать и отправить заново`

and calls `sendPdfToYandex(...)` again.

That is a new PDF generation / new logical save attempt, not reconciliation of the prior operation.

### 4. The old operation may already be durable or physically active

A deterministic schedule is:

1. content generates caller operationId A and sends `WEBCLIP_SEND_PDF_TO_YANDEX`;
2. worker creates PDF A and stores retry cache A;
3. worker may already create `pendingRemoteSaves` before signed PUT/publication;
4. signed transfer may start and its physical outcome may become unknown to the page;
5. the content↔worker response channel is lost or the worker is terminated before the structured result reaches the page;
6. page catch classifies this as `pdfCached=false`;
7. user is offered "generate/send again" and starts operation B;
8. A can still settle/recover while B creates another PDF/cache/remote object/Journal attempt.

P0-079 makes the current tab-owned cache especially dangerous: B may replace the retry pointer/bytes while A still owns a remote recovery checkpoint. But even after P0-079, blindly creating B can create a second legitimate physical file while A later reconciles successfully.

The correct outer-transport result is **unknown operation state**, not "PDF was not cached".

## Fresh source proof — local automatic download

The same root exists for local PDF download.

### 5. Worker checkpoints before irreversible Chrome download

`generatePdfAndDownload()` creates the PDF/blob and calls `checkpointPendingLocalDownloadIntent(...)` **before** `chrome.downloads.download()`.

The intent contains operation/metadata/blob/expected-byte evidence so background reconciliation can decide whether the Chrome download actually started/completed.

### 6. Content page still offers a blind full retry on outer rejection

`content.js::downloadPdf()` catch always renders:

- title `Не удалось сформировать PDF`;
- button `Повторить`;
- retry calls `downloadPdf(...)` again.

There is no distinction between:

- failure before PDF/checkpoint/download admission;
- application error with a known safe terminal state;
- lost runtime response after durable intent and possibly after `downloads.download()` started.

Thus user retry can start a second physical Chrome download while the first pending intent/download is still unknown and recoverable.

This is not solved by the 15-second `downloadStartPending` structured response: P0-043/P1-146 handle that state only if the response reaches the content page. P1-210 covers loss of the **outer** response itself.

## Manual Journal backup is another manifestation

`journal.js::exportJournalToYandex()` creates an operationId, shows blocking progress and sends the manual backup RPC. If the message Promise rejects, `finishBackupProgressError()` declares `Резервная копия не создана`, ends the active UI state and the export button is re-enabled in `finally`.

Backend backup lease/pending checkpoint can prevent some immediate duplicate physical work, so this manifestation is less direct than content PDF save. Nevertheless the UI's terminal claim is still not proven by outer transport loss. A late/unknown old backup may settle or require recovery.

P1-210 should therefore define a common UI/runtime reconciliation contract, with operation-specific durable sources underneath it.

## Required P1-210 contract

### Outer transport failure is a third state

UI handlers must distinguish at least:

1. **application result received** — worker authoritatively returned success/failure/pending state;
2. **pre-admission failure proven** — exact operation receipt proves no irreversible side effect/cache/checkpoint started;
3. **outer transport/result unknown** — response channel failed or page/worker lifecycle interrupted before an authoritative terminal result was delivered.

State 3 must never be rendered as ordinary terminal failure solely because `runtime.sendMessage()` rejected.

### Reconcile exact durable operation before allowing a new non-idempotent generation

After state 3, use a bounded read-only reconciliation path keyed by an immutable **worker-issued operation receipt** (P1-198), exact document/operation generation, and relevant subsystem receipt.

A useful status model can include:

- `not-admitted` / safe to retry from scratch;
- `pdf-prepared` with immutable cache/content receipt;
- `download-start-unknown`;
- `download-in-progress`;
- `remote-transfer-unknown`;
- `remote-object-verified`;
- `publication-unknown` / verified;
- `journal-finalization-pending`;
- `complete`;
- terminal `failed-before-side-effect`;
- unresolved/manual-reconciliation required.

Exact names are implementation choice; false binary `success/error` is not.

### Recovery source is durable state, not OperationLog alone

A restarted worker reconstructs status from authoritative durable receipts:

- immutable PDF cache generation/content receipt (P0-079);
- `pendingDownloads` / exact DownloadItem reconciliation;
- `pendingRemoteSaves` generation/object/publication state;
- backup pending upload/source revision/lease where applicable;
- Journal finalization generation.

OperationLog can explain the state but must not be the only correctness proof.

### UI retry policy

While old operation state is unknown:

- do not show a button that silently creates a new PDF/upload/download generation;
- show an explicit "результат операции уточняется / не запускайте повтор" state;
- allow safe read-only refresh/reconcile;
- allow exact cached-PDF download only when that immutable cache/content receipt is proven to belong to this operation;
- if the product eventually allows a deliberate duplicate attempt, require explicit warning that a prior physical result may still exist and retain recovery authority for both generations.

For a proven `not-admitted` or terminal pre-side-effect failure, ordinary fresh retry is allowed.

### Transport-loss reconciliation must be bounded

Do not turn channel-loss handling into infinite polling/wake cycles.

- one page may keep at most a bounded/coalesced status read outstanding;
- worker restart can be retried according to a bounded UI backoff or explicit refresh;
- unknown durable state persists rather than being converted to failure by wall-clock timeout;
- no blind remote/download retry is triggered automatically.

## Composition with existing items

P1-210 requires rather than replaces:

- P1-198 worker-issued receipt so the status request cannot collide with another operation;
- P0-079 immutable PDF ownership so `pdf-prepared` points to exact bytes;
- P0-074/P0-073/P1-184 exact remote generation/object proof;
- P0-039/P0-043/P0-044 durable physical-side-effect checkpoints;
- P1-048 no blind signed-transfer retry;
- P0-076 Journal generation/CAS for eventual finalization;
- P0-070 exact document generation for a live save.

## Required deterministic regressions

1. Yandex save fails before PDF/cache admission and worker returns authoritative failure -> fresh retry remains available.
2. Yandex PDF cached, then outer runtime channel rejects before structured result -> UI does **not** claim cache absent and does not offer fresh generation until reconciliation.
3. Same with `pendingRemoteSaves` PREPARED and signed PUT not yet started -> status reports durable prepared state.
4. Signed PUT started/response lost -> UI reports unknown transfer; clicking ordinary UI cannot start a second PUT/new PDF.
5. A later remote recovery verifies operation A -> original UI/reopened page can resolve to complete/pending-Journal without creating B.
6. Local download intent committed, `chrome.downloads.download()` starts, outer response lost -> UI does not offer blind second download; status reconciles exact intent/download.
7. Local pre-checkpoint failure -> fresh retry remains allowed.
8. Worker restart between side-effect start and page response -> status reconstructs from durable stores; in-memory state is not required.
9. P0-079: another tab/save generation cannot be mistaken for the old operation's cached PDF.
10. P1-198: hostile/colliding caller operationId cannot read/control another operation's recovery status.
11. Manual backup response channel lost after pending upload/lease exists -> UI does not claim "backup not created" as authoritative; refresh/reconcile current backup operation.
12. Reconciliation itself times out -> remains `unknown`, not `failed`, and does not auto-retry side effect.
13. Explicit user close/navigation does not delete durable recovery evidence for an unknown operation.
14. OperationLog may be missing/pruned while durable reconciliation still works.

## Number allocation

Fresh repo-wide search found no prior `P1-210` assignment. This checkpoint assigns **P1-210** to the outer-transport-loss / durable-operation-state reconciliation root cause.

No P0/P2 number is created.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

