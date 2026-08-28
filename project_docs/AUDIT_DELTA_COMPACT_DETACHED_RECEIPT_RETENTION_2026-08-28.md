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
